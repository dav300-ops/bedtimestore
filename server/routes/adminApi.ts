import express, { Request, Response } from 'express';
import { authService } from '../services/authService';
import { inventoryService } from '../services/inventoryService';
import { categoryService } from '../services/categoryService';
import { salesService } from '../services/salesService';
import { orderService } from '../services/orderService';
import { getDatabaseStatus, isDatabaseAvailable } from '../db';
import { config } from '../config';
import { appCache } from '../cache';
import { requireAdminAuth } from '../utils/adminToken';
import {
  formatErrorResponse,
  validateOrderStatus,
  validatePaymentStatus,
} from './api';

const adminRouter = express.Router();

const ensureDbForAdmin = (req: Request, res: Response, next: express.NextFunction) => {
  if (isDatabaseAvailable()) return next();

  const status = getDatabaseStatus();
  console.error(`[503] ${req.method} ${req.originalUrl} blocked: database not connected (${status.errorCode || 'unknown'})`);
  return res.status(503).json({
    error: 'The database is unavailable, so nothing was saved. Please try again shortly.',
    code: 'DB_UNAVAILABLE',
    reason: status.errorCode || null,
    ...(config.isDev ? { sqlMessage: status.error || null } : {}),
  });
};

// ============================================================================
// 1. Admin Authentication Endpoints (Public entry point for Admins only)
// ============================================================================

adminRouter.post('/logout', (_req: Request, res: Response) => {
  return res.json({ success: true, message: 'Administrator logged out successfully' });
});

/**
 * Dedicated Administrator Login
 * Verifies role ('admin' | 'superadmin') and salted scrypt password hash.
 */
adminRouter.post('/login', ensureDbForAdmin, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Administrator email and password are required.' });
    }

    const clientIp = req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Admin Portal';

    const result = await authService.loginAdmin(email, password, {
      ip: clientIp,
      device: userAgent,
    });

    return res.json({
      success: true,
      message: 'Administrator authenticated successfully.',
      admin: result.user,
      token: result.token,
    });
  } catch (error: any) {
    const msg = error?.message || 'Administrator authentication failed';
    const status = msg.startsWith('Access denied') ? 403 : 401;
    return res.status(status).json({ error: msg });
  }
});

// ============================================================================
// All routes below require a valid signed Administrator Bearer token first
// ============================================================================
adminRouter.use(requireAdminAuth);
adminRouter.use(ensureDbForAdmin);

/**
 * Validate active admin session and return current admin profile
 */
adminRouter.get('/session', async (req: Request, res: Response) => {
  try {
    const adminPayload = (req as any).adminUser;
    const admin = await authService.findUserById(adminPayload.id);
    if (!admin || (admin.role !== 'admin' && admin.role !== 'superadmin')) {
      return res.status(403).json({ error: 'Administrator privileges revoked or unavailable.' });
    }
    return res.json({ success: true, admin });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Failed to verify administrator session' });
  }
});

// ============================================================================
// 2. Administrator Staff Management
// ============================================================================

/**
 * Create New Administrator Account (Hashes password before storing in MySQL)
 */
adminRouter.post('/create-admin', async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body;
    if (!email || !firstName || !password) {
      return res.status(400).json({ error: 'First name, official email, and password are required.' });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ error: 'Administrator password must be at least 8 characters.' });
    }

    const adminPayload = (req as any).adminUser;
    const clientIp = req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Boutique Admin Portal';

    const newAdmin = await authService.createAdmin({
      firstName,
      lastName: lastName || '',
      email,
      phone,
      password,
      createdByAdminId: adminPayload?.id,
      ip: clientIp,
      device: userAgent,
    });

    return res.status(201).json({
      success: true,
      message: 'New boutique administrator created.',
      admin: newAdmin,
    });
  } catch (error: any) {
    return res.status(400).json({ error: error?.message || 'Failed to create administrator' });
  }
});

/**
 * List all administrators
 */
adminRouter.get('/administrators', async (_req: Request, res: Response) => {
  try {
    const admins = await authService.getAllAdmins();
    return res.json({ success: true, admins });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Failed to retrieve administrators' });
  }
});

// ============================================================================
// 3. Admin Category Management
// ============================================================================

adminRouter.post('/categories', async (req: Request, res: Response) => {
  try {
    const { nameEn, nameAr, slug, descriptionEn, descriptionAr, image, active, displayOrder } = req.body;
    if (!nameEn) {
      return res.status(400).json(formatErrorResponse(new Error('Category English name is required'), 400));
    }
    const category = await categoryService.addCategory({
      nameEn,
      nameAr: nameAr || nameEn,
      slug,
      descriptionEn,
      descriptionAr,
      image,
      active,
      displayOrder,
    });
    appCache.delete('categories:list');
    return res.status(201).json({ success: true, category });
  } catch (err: any) {
    return res.status(400).json(formatErrorResponse(err, 400));
  }
});

adminRouter.put('/categories/:id', async (req: Request, res: Response) => {
  try {
    const category = await categoryService.updateCategory(req.params.id, req.body);
    if (!category) return res.status(404).json(formatErrorResponse(new Error('Category not found in MySQL'), 404));
    appCache.delete('categories:list');
    appCache.delete(`category:${req.params.id}`);
    return res.json({ success: true, category });
  } catch (err: any) {
    return res.status(400).json(formatErrorResponse(err, 400));
  }
});

adminRouter.delete('/categories/:id', async (req: Request, res: Response) => {
  try {
    await categoryService.deleteCategory(req.params.id);
    appCache.delete('categories:list');
    appCache.delete(`category:${req.params.id}`);
    return res.json({ success: true, message: 'Category deleted from MySQL database' });
  } catch (err: any) {
    return res.status(500).json(formatErrorResponse(err, 500));
  }
});

// ============================================================================
// 4. Admin Product & Inventory Management
// ============================================================================

adminRouter.post('/products', async (req: Request, res: Response) => {
  try {
    const product = await inventoryService.addProduct(req.body);
    appCache.delete('products:list');
    return res.status(201).json({ success: true, product });
  } catch (err: any) {
    return res.status(400).json(formatErrorResponse(err, 400));
  }
});

adminRouter.put('/products/:id', async (req: Request, res: Response) => {
  try {
    const product = await inventoryService.updateProduct(req.params.id, req.body);
    if (!product) return res.status(404).json(formatErrorResponse(new Error('Product not found in MySQL'), 404));
    appCache.delete('products:list');
    appCache.delete(`product:${req.params.id}`);
    return res.json({ success: true, product });
  } catch (err: any) {
    return res.status(400).json(formatErrorResponse(err, 400));
  }
});

adminRouter.delete('/products/:id', async (req: Request, res: Response) => {
  try {
    await inventoryService.deleteProduct(req.params.id);
    appCache.delete('products:list');
    appCache.delete(`product:${req.params.id}`);
    return res.json({ success: true, message: 'Product deleted from MySQL database' });
  } catch (err: any) {
    return res.status(500).json(formatErrorResponse(err, 500));
  }
});

adminRouter.post('/products/:id/stock', async (req: Request, res: Response) => {
  try {
    const { skuOrSize, colorHex, delta, absoluteNewStock } = req.body;
    const updated = await inventoryService.adjustStock(
      req.params.id,
      skuOrSize,
      colorHex,
      Number(delta || 0),
      typeof absoluteNewStock === 'number' ? absoluteNewStock : undefined
    );
    appCache.delete('products:list');
    appCache.delete(`product:${req.params.id}`);
    return res.json({ success: true, product: updated });
  } catch (err: any) {
    return res.status(400).json({ error: err?.message || 'Failed to adjust stock in MySQL' });
  }
});

adminRouter.get('/inventory/balances', async (_req: Request, res: Response) => {
  try {
    const balances = await inventoryService.getInventoryBalances();
    return res.json({
      success: true,
      ...balances,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to calculate inventory balances from MySQL' });
  }
});

adminRouter.post('/inventory/deduct', async (req: Request, res: Response) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'items array is required' });
    }
    const result = await inventoryService.deductStock(items);
    appCache.delete('products:list');
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to deduct stock in MySQL' });
  }
});

// ============================================================================
// 5. Admin Orders Management
// ============================================================================

adminRouter.get('/orders', async (_req: Request, res: Response) => {
  try {
    const orders = await orderService.getOrders();
    return res.json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (err: any) {
    return res.status(500).json(formatErrorResponse(err, 500));
  }
});

adminRouter.get('/orders/:id', async (req: Request, res: Response) => {
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

adminRouter.put('/orders/:id', async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    const orderStatus = updates.orderStatus || updates.order_status;
    if (orderStatus && !validateOrderStatus(orderStatus)) {
      return res.status(400).json(formatErrorResponse(new Error(`Invalid order_status '${orderStatus}'. Must be Confirmed, Preparing, Shipped, Delivered, or Cancelled`), 400));
    }

    const paymentStatus = updates.paymentStatus || updates.payment_status;
    if (paymentStatus && !validatePaymentStatus(paymentStatus)) {
      return res.status(400).json(formatErrorResponse(new Error(`Invalid payment_status '${paymentStatus}'. Must be Pending, Paid, Failed, or Refunded`), 400));
    }

    const updated = await orderService.updateOrder(req.params.id, updates);
    if (!updated) {
      return res.status(404).json(formatErrorResponse(new Error('Order not found'), 404));
    }
    return res.json({
      success: true,
      order: updated,
      id: updated.id,
    });
  } catch (err: any) {
    return res.status(500).json(formatErrorResponse(err, 500));
  }
});

adminRouter.delete('/orders/:id', async (req: Request, res: Response) => {
  try {
    await orderService.deleteOrder(req.params.id);
    return res.json({
      success: true,
      id: req.params.id,
      message: 'Order deleted successfully from database',
    });
  } catch (err: any) {
    return res.status(500).json(formatErrorResponse(err, 500));
  }
});

adminRouter.put('/orders/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json(formatErrorResponse(new Error('status is required'), 400));
    }
    if (!validateOrderStatus(status)) {
      return res.status(400).json(formatErrorResponse(new Error(`Invalid order_status '${status}'. Must be Confirmed, Preparing, Shipped, Delivered, or Cancelled`), 400));
    }
    const updated = await orderService.updateOrderStatus(req.params.id, status);
    return res.json({ success: updated, id: req.params.id, orderStatus: status });
  } catch (err: any) {
    return res.status(500).json(formatErrorResponse(err, 500));
  }
});

adminRouter.post('/orders/:id/confirm-payment', async (req: Request, res: Response) => {
  try {
    const success = await orderService.confirmDeliveryPayment(req.params.id);
    return res.json({ success, id: req.params.id, message: 'Payment confirmed in database' });
  } catch (err: any) {
    return res.status(500).json(formatErrorResponse(err, 500));
  }
});

// ============================================================================
// 6. Admin Sales & Customer Analytics
// ============================================================================

adminRouter.get('/sales', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit || 50), 200);
    const offset = Math.max(Number(req.query.offset || 0), 0);
    const sales = await salesService.getAllSales(limit, offset);
    return res.json({
      success: true,
      count: sales.length,
      limit,
      offset,
      sales,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Failed to fetch sales records from MySQL' });
  }
});

adminRouter.get('/sales/analytics', async (req: Request, res: Response) => {
  try {
    const topLimit = Math.min(Number(req.query.topLimit || 8), 50);
    const analytics = await salesService.getSalesAnalytics(topLimit);
    return res.json({
      success: true,
      engine: 'mysql',
      ...analytics,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Failed to calculate sales analytics in MySQL' });
  }
});

adminRouter.get('/sales/top-products', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit || 8), 50);
    const analytics = await salesService.getSalesAnalytics(limit);
    return res.json({
      success: true,
      topProducts: analytics.topProducts,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Failed to fetch top selling products from MySQL' });
  }
});

adminRouter.get('/sales/order/:orderId', async (req: Request, res: Response) => {
  try {
    const sales = await salesService.getSalesByOrder(req.params.orderId);
    return res.json({
      success: true,
      count: sales.length,
      sales,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Failed to fetch sales for order from MySQL' });
  }
});

adminRouter.get('/sales/product/:productId', async (req: Request, res: Response) => {
  try {
    const sales = await salesService.getSalesByProduct(req.params.productId);
    return res.json({
      success: true,
      count: sales.length,
      sales,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Failed to fetch product sales from MySQL' });
  }
});

adminRouter.get('/customer-purchases', async (_req: Request, res: Response) => {
  try {
    const customers = await salesService.getCustomerPurchasesSummary();
    return res.json({
      success: true,
      count: customers.length,
      customers,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Failed to fetch customer purchases from MySQL' });
  }
});

adminRouter.get('/customer-purchases/:customerIdOrEmail', async (req: Request, res: Response) => {
  try {
    const purchases = await salesService.getCustomerPurchasesDetail(req.params.customerIdOrEmail);
    return res.json({
      success: true,
      count: purchases.length,
      purchases,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Failed to fetch customer purchase history' });
  }
});

adminRouter.get('/product-buyers/:productId', async (req: Request, res: Response) => {
  try {
    const buyers = await salesService.getProductBuyers(req.params.productId);
    return res.json({
      success: true,
      count: buyers.length,
      buyers,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Failed to fetch product buyers' });
  }
});

export default adminRouter;
