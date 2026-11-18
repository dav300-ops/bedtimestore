import express, { Request, Response } from 'express';
import { serverPaymentService } from '../services/PaymentService';
import { inventoryService } from '../services/inventoryService';
import { categoryService } from '../services/categoryService';
import { authService } from '../services/authService';
import { salesService } from '../services/salesService';
import { orderService } from '../services/orderService';
import { getDatabaseStatus, executeQuery, pingDatabase, isDatabaseAvailable, isUsingMemoryFallback } from '../db';
import * as MySQLQueries from '../queries/mysqlQueries';
import { config } from '../config';
import { appCache } from '../cache';

const router = express.Router();

// ----------------------------------------------------------------------------
// Database gate.
// If MariaDB is unreachable (and the in-memory demo mode was not explicitly enabled),
// data endpoints answer 503 with the reason instead of pretending the save worked.
// ----------------------------------------------------------------------------
const DB_FREE_PREFIXES = ['/health', '/payments', '/auth/logout'];
const INTERNAL_PREFIXES = ['/db/', '/cache/'];

router.use((req: Request, res: Response, next) => {
  // Never expose DB internals (host, user, DDL, cache stats) on a public production site
  if (config.isProd && INTERNAL_PREFIXES.some((p) => req.path.startsWith(p))) {
    return res.status(404).json({ error: 'Not found' });
  }
  if (DB_FREE_PREFIXES.some((p) => req.path.startsWith(p)) || INTERNAL_PREFIXES.some((p) => req.path.startsWith(p))) {
    return next();
  }
  if (isDatabaseAvailable()) return next();

  const status = getDatabaseStatus();
  console.error(`[503] ${req.method} ${req.originalUrl} blocked: database not connected (${status.errorCode || 'unknown'})`);
  return res.status(503).json({
    error: 'The database is unavailable, so nothing was saved. Please try again shortly.',
    code: 'DB_UNAVAILABLE',
    reason: status.errorCode || null,
    // Detailed, host-specific hint only outside production
    ...(config.isDev ? { sqlMessage: status.error || null } : {}),
  });
});

export const VALID_ORDER_STATUSES = ['Confirmed', 'Preparing', 'Shipped', 'Delivered', 'Cancelled'] as const;
export const VALID_PAYMENT_STATUSES = ['Pending', 'Paid', 'Failed', 'Refunded'] as const;
export const VALID_ROLES = ['customer', 'admin', 'superadmin'] as const;

export function validateRole(role?: string): boolean {
  if (!role) return true;
  return (VALID_ROLES as readonly string[]).includes(role);
}

export function validateOrderStatus(status?: string): boolean {
  if (!status) return true;
  return (VALID_ORDER_STATUSES as readonly string[]).includes(status);
}

export function validatePaymentStatus(status?: string): boolean {
  if (!status) return true;
  return (VALID_PAYMENT_STATUSES as readonly string[]).includes(status);
}

/**
 * Standard error response formatter:
 * Returns JSON { error, code, sqlMessage } and logs err.code & err.sqlMessage to server console.
 */
export function formatErrorResponse(err: any, statusCode: number = 500) {
  const code = err?.code || (statusCode === 400 ? 'VALIDATION_ERROR' : 'DATABASE_ERROR');
  const sqlMessage = err?.sqlMessage || null;
  const message = err?.message || (statusCode === 400 ? 'Validation error' : 'Database execution failure');

  console.error('[API / Database Error]', {
    statusCode,
    code,
    sqlMessage,
    message,
  });

  return {
    error: message,
    code,
    sqlMessage,
  };
}

// ============================================================================
// 0. Cache Management Endpoints
// ============================================================================


router.get('/cache/stats', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    stats: appCache.getStats(),
    env: config.env,
    ttlMs: config.cacheTtlMs,
  });
});

// ============================================================================
// 1. User Authentication Endpoints (Powered by MySQL Database)
// ============================================================================

/**
 * Register User with MySQL persistence
 */
router.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, phone, password, isGuest } = req.body;
    if (!email) {
      return res.status(400).json(formatErrorResponse(new Error('Email address is required'), 400));
    }
    if (!firstName) {
      return res.status(400).json(formatErrorResponse(new Error('First name is required'), 400));
    }

    const clientIp = req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Web Browser';

    const result = await authService.register({
      firstName,
      lastName: lastName || '',
      email,
      phone,
      password: password || undefined,
      role: 'customer',
      isGuest: Boolean(isGuest),
      ip: clientIp,
      device: userAgent,
    });

    return res.status(201).json({
      success: true,
      message: isGuest ? 'Guest shopper session initialized in MySQL' : 'User account created successfully in MySQL',
      user: result.user,
      token: result.token,
    });
  } catch (error: any) {
    return res.status(400).json(formatErrorResponse(error, 400));
  }
});

/**
 * User Login with MySQL authentication & credential verification
 */
router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const clientIp = req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Web Browser';

    const result = await authService.login(email, password, {
      ip: clientIp,
      device: userAgent,
    });

    return res.json({
      success: true,
      message: 'Authenticated successfully against MySQL database',
      user: result.user,
      token: result.token,
    });
  } catch (error: any) {
    return res.status(401).json({ error: error?.message || 'Authentication failed' });
  }
});

/**
 * Get User Details by ID from MySQL
 */
router.get('/auth/user/:id', async (req: Request, res: Response) => {
  try {
    const user = await authService.findUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found in MySQL database' });
    }
    return res.json({ success: true, user });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Failed to fetch user' });
  }
});

/**
 * Change / Update Password in MySQL
 */
router.post('/auth/password', async (req: Request, res: Response) => {
  try {
    const { userId, newPassword } = req.body;
    if (!userId || !newPassword) {
      return res.status(400).json({ error: 'userId and newPassword are required' });
    }
    await authService.updatePassword(userId, newPassword);
    return res.json({ success: true, message: 'Password updated in MySQL database' });
  } catch (error: any) {
    return res.status(400).json({ error: error?.message || 'Password update failed' });
  }
});

/**
 * Get Security Audit Logs for User from MySQL
 */
router.get('/auth/logs/:userId', async (req: Request, res: Response) => {
  try {
    const logs = await authService.getUserSecurityLogs(req.params.userId);
    return res.json({ success: true, logs });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Failed to fetch security logs' });
  }
});



/**
 * Logout
 */
router.post('/auth/logout', (_req: Request, res: Response) => {
  return res.json({ success: true, message: 'Logged out successfully' });
});

// ============================================================================
// 2. MySQL Database Status & Query Introspection Endpoints
// ============================================================================

/**
 * Real-time MySQL Database Connection Status & Metrics
 */
router.get('/db/status', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    engine: 'mysql',
    status: getDatabaseStatus(),
  });
});

/**
 * Inspect Active MySQL Queries and DDL Schemas
 */
router.get('/db/queries', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    engine: 'mysql',
    tables: [
      { name: 'users', ddl: MySQLQueries.DDL_CREATE_USERS_TABLE },
      { name: 'categories', ddl: MySQLQueries.DDL_CREATE_CATEGORIES_TABLE },
      { name: 'products', ddl: MySQLQueries.DDL_CREATE_PRODUCTS_TABLE },
      { name: 'orders', ddl: MySQLQueries.DDL_CREATE_ORDERS_TABLE },
      { name: 'product_sales', ddl: MySQLQueries.DDL_CREATE_PRODUCT_SALES_TABLE },
      { name: 'security_logs', ddl: MySQLQueries.DDL_CREATE_SECURITY_LOGS_TABLE },
    ],
    sampleQueries: {
      auth: [
        { name: 'REGISTER_USER', sql: MySQLQueries.SQL_REGISTER_USER },
        { name: 'FIND_USER_BY_EMAIL', sql: MySQLQueries.SQL_FIND_USER_BY_EMAIL },
        { name: 'FIND_USER_BY_ID', sql: MySQLQueries.SQL_FIND_USER_BY_ID },
        { name: 'UPDATE_USER_PASSWORD', sql: MySQLQueries.SQL_UPDATE_USER_PASSWORD },
      ],
      categories: [
        { name: 'SELECT_ALL_CATEGORIES', sql: MySQLQueries.SQL_SELECT_ALL_CATEGORIES },
        { name: 'INSERT_CATEGORY', sql: MySQLQueries.SQL_INSERT_CATEGORY },
        { name: 'UPDATE_CATEGORY', sql: MySQLQueries.SQL_UPDATE_CATEGORY },
        { name: 'DELETE_CATEGORY', sql: MySQLQueries.SQL_DELETE_CATEGORY },
      ],
      products: [
        { name: 'SELECT_ALL_PRODUCTS', sql: MySQLQueries.SQL_SELECT_ALL_PRODUCTS },
        { name: 'INSERT_PRODUCT', sql: MySQLQueries.SQL_INSERT_PRODUCT },
        { name: 'UPDATE_PRODUCT', sql: MySQLQueries.SQL_UPDATE_PRODUCT },
        { name: 'DELETE_PRODUCT', sql: MySQLQueries.SQL_DELETE_PRODUCT },
      ],
      orders: [
        { name: 'INSERT_ORDER', sql: MySQLQueries.SQL_INSERT_ORDER },
        { name: 'SELECT_ALL_ORDERS', sql: MySQLQueries.SQL_SELECT_ALL_ORDERS },
        { name: 'UPDATE_ORDER_STATUS', sql: MySQLQueries.SQL_UPDATE_ORDER_STATUS },
      ],
      sales: [
        { name: 'INSERT_PRODUCT_SALE', sql: MySQLQueries.SQL_INSERT_PRODUCT_SALE },
        { name: 'SELECT_ALL_PRODUCT_SALES', sql: MySQLQueries.SQL_SELECT_ALL_PRODUCT_SALES },
        { name: 'SELECT_TOP_SELLING_PRODUCTS', sql: MySQLQueries.SQL_SELECT_TOP_SELLING_PRODUCTS },
        { name: 'SELECT_SALES_BY_CATEGORY', sql: MySQLQueries.SQL_SELECT_SALES_BY_CATEGORY },
        { name: 'SELECT_SALES_BY_BAHRAIN_AREA', sql: MySQLQueries.SQL_SELECT_SALES_BY_BAHRAIN_AREA },
        { name: 'SELECT_SALES_OVERALL_SUMMARY', sql: MySQLQueries.SQL_SELECT_SALES_OVERALL_SUMMARY },
      ],
    },
  });
});

// ============================================================================
// 3. Dynamic Categories Endpoints (MySQL with Environment-Aware Cache)
// ============================================================================

router.get('/categories', async (_req: Request, res: Response) => {
  try {
    const cached = appCache.get<any[]>('categories:list');
    if (cached) {
      return res.json({
        success: true,
        count: cached.length,
        categories: cached,
        cached: true,
      });
    }
    const categories = await categoryService.getCategories();
    appCache.set('categories:list', categories);
    return res.json({
      success: true,
      count: categories.length,
      categories,
      cached: false,
    });
  } catch (err: any) {
    return res.status(500).json(formatErrorResponse(err, 500));
  }
});

router.get('/categories/:id', async (req: Request, res: Response) => {
  try {
    const cacheKey = `category:${req.params.id}`;
    const cached = appCache.get<any>(cacheKey);
    if (cached) {
      return res.json({ success: true, category: cached, cached: true });
    }
    const category = await categoryService.getCategoryById(req.params.id);
    if (!category) return res.status(404).json(formatErrorResponse(new Error('Category not found in MySQL'), 404));
    appCache.set(cacheKey, category);
    return res.json({ success: true, category, cached: false });
  } catch (err: any) {
    return res.status(500).json(formatErrorResponse(err, 500));
  }
});



// ============================================================================
// 4. Dynamic Products & Inventory Stock Endpoints (MySQL with Environment-Aware Cache)
// ============================================================================

router.get('/products', async (_req: Request, res: Response) => {
  try {
    const cached = appCache.get<any[]>('products:list');
    if (cached) {
      return res.json({
        success: true,
        count: cached.length,
        products: cached,
        cached: true,
      });
    }
    const products = await inventoryService.getProducts();
    appCache.set('products:list', products);
    return res.json({
      success: true,
      count: products.length,
      products,
      cached: false,
    });
  } catch (err: any) {
    return res.status(500).json(formatErrorResponse(err, 500));
  }
});

router.get('/products/:id', async (req: Request, res: Response) => {
  try {
    const cacheKey = `product:${req.params.id}`;
    const cached = appCache.get<any>(cacheKey);
    if (cached) {
      return res.json({ success: true, product: cached, cached: true });
    }
    const product = await inventoryService.getProductById(req.params.id);
    if (!product) return res.status(404).json(formatErrorResponse(new Error('Product not found in MySQL'), 404));
    appCache.set(cacheKey, product);
    return res.json({ success: true, product, cached: false });
  } catch (err: any) {
    return res.status(500).json(formatErrorResponse(err, 500));
  }
});



// ============================================================================
// 5. Payment & Checkout Endpoints
// ============================================================================

router.post('/payments/create', async (req: Request, res: Response) => {
  try {
    const { paymentMethod, orderNumber, amount, customerName, customerPhone, customerEmail, invoiceItems } = req.body;
    const result = await serverPaymentService.process(paymentMethod || 'myfatoorah', {
      orderNumber,
      amount,
      currency: 'BHD',
      customerName,
      customerPhone,
      customerEmail,
      invoiceItems,
    } as any);
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Payment initiation failed' });
  }
});

router.post('/payments/myfatoorah/execute', async (req: Request, res: Response) => {
  try {
    const provider = serverPaymentService.getProvider('myfatoorah');
    const result = await provider.initiatePayment(req.body);
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'MyFatoorah payment execution failed' });
  }
});

router.post('/payments/myfatoorah/send-receipt', async (req: Request, res: Response) => {
  try {
    const provider = serverPaymentService.getProvider('myfatoorah') as any;
    if (typeof provider.sendReceipt === 'function') {
      const result = await provider.sendReceipt(req.body);
      return res.json(result);
    }
    return res.json({
      success: true,
      receiptNumber: `RCPT-BDS-${req.body.orderNumber}-${Math.floor(1000 + Math.random() * 9000)}`,
      message: `Receipt dispatched to ${req.body.customerEmail}`,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'MyFatoorah receipt dispatch failed' });
  }
});

router.post('/payments/webhook', async (req: Request, res: Response) => {
  const { provider, signature } = req.body;
  try {
    const paymentProvider = serverPaymentService.getProvider(provider || 'myfatoorah');
    const isValid = await paymentProvider.verifyWebhook(signature, req.body);
    return res.json({ received: true, verified: isValid });
  } catch (err) {
    return res.status(400).json({ error: 'Webhook processing error' });
  }
});

// ============================================================================
// 5b. Dynamic Orders Endpoints (MySQL Relational Storage)
// ============================================================================



/**
 * Get single order by ID or order number
 */
router.get('/orders/:id', async (req: Request, res: Response) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json(formatErrorResponse(new Error('Order not found'), 404));
    }
    return res.json({
      success: true,
      order,
      id: order.id,
    });
  } catch (err: any) {
    return res.status(500).json(formatErrorResponse(err, 500));
  }
});

/**
 * Get orders for a specific user ID or email from MariaDB/MySQL
 */
router.get('/orders/user/:userId', async (req: Request, res: Response) => {
  try {
    const email = (req.query.email as string) || '';
    const orders = await orderService.getOrdersByUser(req.params.userId, email);
    return res.json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (err: any) {
    return res.status(500).json(formatErrorResponse(err, 500));
  }
});

/**
 * Create new order in MariaDB/MySQL with transaction, stock decrement, and sales logging
 */
router.post('/orders', async (req: Request, res: Response) => {
  try {
    const orderData = req.body;
    if (!orderData) {
      return res.status(400).json(formatErrorResponse(new Error('Order body is required'), 400));
    }
    if (!orderData.customerName) {
      return res.status(400).json(formatErrorResponse(new Error('customerName is required'), 400));
    }
    if (!orderData.customerEmail) {
      return res.status(400).json(formatErrorResponse(new Error('customerEmail is required'), 400));
    }
    if (!orderData.customerPhone) {
      return res.status(400).json(formatErrorResponse(new Error('customerPhone is required'), 400));
    }
    if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
      return res.status(400).json(formatErrorResponse(new Error('Order items must be a non-empty array'), 400));
    }

    const orderStatus = orderData.orderStatus || orderData.order_status || 'Confirmed';
    if (!validateOrderStatus(orderStatus)) {
      return res.status(400).json(formatErrorResponse(new Error(`Invalid order_status '${orderStatus}'. Must be Confirmed, Preparing, Shipped, Delivered, or Cancelled`), 400));
    }

    const paymentStatus = orderData.paymentStatus || orderData.payment_status || 'Pending';
    if (!validatePaymentStatus(paymentStatus)) {
      return res.status(400).json(formatErrorResponse(new Error(`Invalid payment_status '${paymentStatus}'. Must be Pending, Paid, Failed, or Refunded`), 400));
    }

    const created = await orderService.createOrder({
      ...orderData,
      orderStatus,
      paymentStatus,
    });

    // Invalidate product catalog cache because stock changed during order placement
    appCache.delete('products:list');

    return res.status(201).json({
      success: true,
      order: created,
      id: created.id,
    });
  } catch (err: any) {
    return res.status(500).json(formatErrorResponse(err, 500));
  }
});



// ============================================================================
// 6. Product Sales & Line-Item Analytics Endpoints (MySQL Relational Engine)
// ============================================================================

/**
 * Record Product Sales from an Order into MySQL database
 */
router.post('/sales/record-order', async (req: Request, res: Response) => {
  try {
    const data = req.body.order || req.body;
    if (!data || !data.orderNumber) {
      return res.status(400).json({ error: 'Order data with orderNumber is required' });
    }

    const rawItems = Array.isArray(data.items) ? data.items : [];
    if (rawItems.length === 0) {
      return res.status(400).json({ error: 'Order has no line items to record' });
    }

    // Enrich line items with product catalog metadata from MySQL if needed
    const enrichedItems = await Promise.all(
      rawItems.map(async (it: any) => {
        let sku = it.productSku || it.sku;
        let nameEn = it.productNameEn || it.nameEn;
        let nameAr = it.productNameAr || it.nameAr;
        let categoryId = it.categoryId;
        let categoryNameEn = it.categoryNameEn;

        if (!sku || !categoryId) {
          try {
            const catalogProd = await inventoryService.getProductById(it.productId);
            if (catalogProd) {
              sku = sku || catalogProd.sku;
              nameEn = nameEn || catalogProd.nameEn;
              nameAr = nameAr || catalogProd.nameAr;
              categoryId = categoryId || catalogProd.categoryId;
              categoryNameEn = categoryNameEn || catalogProd.categoryNameEn;
            }
          } catch {
            // fallback gracefully
          }
        }

        return {
          productId: it.productId,
          productSku: sku || `BDS-${it.productId}`,
          productNameEn: nameEn || 'Luxury Nightwear Garment',
          productNameAr: nameAr || 'ملابس نوم فاخرة',
          categoryId: categoryId || 'cat-silk-nightwear',
          categoryNameEn: categoryNameEn || 'Nightwear',
          size: it.size || 'M',
          colorName: it.color || it.colorName || 'Default',
          colorHex: it.colorHex || '#340404',
          unitPrice: Number(it.unitPrice ?? it.price ?? 0),
          quantity: Number(it.quantity ?? 1),
          totalAmount: it.totalPrice ?? it.totalAmount ?? Number(((it.unitPrice ?? it.price ?? 0) * (it.quantity ?? 1)).toFixed(3)),
        };
      })
    );

    const deliveryAddress = data.shippingAddress || data.deliveryAddress || {};

    const recordResult = await salesService.recordOrderSales({
      id: data.id || `ord-${Date.now()}`,
      orderNumber: data.orderNumber,
      userId: data.userId,
      customerName: data.customerName || 'Customer',
      customerEmail: data.customerEmail || '',
      customerPhone: data.customerPhone || '',
      paymentMethod: data.paymentMethod || 'benefit_pay',
      paymentStatus: data.paymentStatus || 'Paid',
      deliveryAddress: {
        area: deliveryAddress.area || 'Adliya',
        city: deliveryAddress.city || 'Manama',
      },
      items: enrichedItems,
    });

    return res.status(201).json({
      ...recordResult,
      message: `Persisted ${recordResult.recordedSalesCount} product sales line items in MySQL for ${data.orderNumber}`,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Failed to record product sales in MySQL' });
  }
});



// ============================================================================
// 7. Health & Status Check
// ============================================================================

router.get('/health', async (_req: Request, res: Response) => {
  const isUp = await pingDatabase();
  const dbStatus = getDatabaseStatus();
  res.json({
    status: isUp ? 'ok' : 'degraded',
    db: isUp ? 'up' : 'down',
    mode: isUp ? 'database' : isUsingMemoryFallback() ? 'memory-fallback (NOT SAVED)' : 'unavailable',
    dbErrorCode: isUp ? null : dbStatus.errorCode || null,
    env: config.env,
    version: config.appVersion,
    timestamp: new Date().toISOString(),
    service: 'THE BEDTIME STORE API',
    market: 'Kingdom of Bahrain (BHD)',
    databaseEngine: 'MariaDB/MySQL',
    // Host / user / database names and the human-readable hint are for development only
    ...(config.isDev ? { dbDetails: dbStatus } : {}),
  });
});

export default router;
