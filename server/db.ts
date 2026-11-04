import mysql, { Pool, PoolOptions } from 'mysql2/promise';
import dotenv from 'dotenv';
import {
  DDL_CREATE_USERS_TABLE,
  DDL_CREATE_CATEGORIES_TABLE,
  DDL_CREATE_PRODUCTS_TABLE,
  DDL_CREATE_ORDERS_TABLE,
  DDL_CREATE_SECURITY_LOGS_TABLE,
  DDL_CREATE_PRODUCT_SALES_TABLE,
} from './queries/mysqlQueries';

dotenv.config();

export interface MySQLDatabaseStatus {
  engine: 'mysql';
  connected: boolean;
  state: 'connected' | 'connecting' | 'disconnected' | 'fallback_memory' | 'error';
  host: string;
  port: number;
  database: string;
  user: string;
  error?: string;
  lastConnectedAt?: string;
  pool?: {
    connectionLimit: number;
    queueLimit: number;
  };
  tables?: string[];
  queriesExecuted: number;
}

// Config extraction from URI or discrete variables
function getMySQLConfig(): {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
} {
  const uri = process.env.MYSQL_URI || process.env.DATABASE_URL;
  if (uri && (uri.startsWith('mysql://') || uri.startsWith('mysql2://'))) {
    try {
      const parsed = new URL(uri);
      return {
        host: parsed.hostname || 'localhost',
        port: Number(parsed.port || 3306),
        user: parsed.username || 'thebedtime_str',
        password: parsed.password || 'zZ48ByGhTn7385hdjd',
        database: parsed.pathname ? parsed.pathname.replace(/^\//, '') : 'thebedtime_store',
      };
    } catch {
      // Fallback to discrete vars
    }
  }

  return {
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'thebedtime_str',
    password: process.env.MYSQL_PASSWORD || 'zZ48ByGhTn7385hdjd',
    database: process.env.MYSQL_DATABASE || 'thebedtime_store',
  };
}

const config = getMySQLConfig();

let pool: Pool | null = null;
let queriesCount = 0;

let dbStatus: MySQLDatabaseStatus = {
  engine: 'mysql',
  connected: false,
  state: 'disconnected',
  host: config.host,
  port: config.port,
  database: config.database,
  user: config.user,
  queriesExecuted: 0,
};

// Resilient in-memory tables used when live MySQL server is not yet provisioned
const memoryStore = {
  users: new Map<string, any>(),
  categories: new Map<string, any>(),
  products: new Map<string, any>(),
  orders: new Map<string, any>(),
  security_logs: new Map<string, any>(),
  product_sales: new Map<string, any>(),
};

export function getDatabaseStatus(): MySQLDatabaseStatus {
  return {
    ...dbStatus,
    queriesExecuted: queriesCount,
  };
}

/**
 * Initialize MySQL Connection Pool and Bootstrap DDL Schemas
 */
export async function connectToDatabase(): Promise<boolean> {
  dbStatus.state = 'connecting';
  queriesCount = 0;

  const poolOptions: PoolOptions = {
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 4000,
  };

  try {
    pool = mysql.createPool(poolOptions);

    // Test connectivity
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();

    dbStatus.connected = true;
    dbStatus.state = 'connected';
    dbStatus.lastConnectedAt = new Date().toISOString();
    dbStatus.pool = {
      connectionLimit: poolOptions.connectionLimit || 10,
      queueLimit: poolOptions.queueLimit || 0,
    };

    console.log(`[MySQL] Successfully connected to MySQL database "${config.database}" on ${config.host}:${config.port}`);

    // Bootstrap DDL Schemas
    await initializeSchemas();

    return true;
  } catch (err: any) {
    dbStatus.connected = false;
    dbStatus.state = 'fallback_memory';
    dbStatus.error = err?.message || 'MySQL server unreachable, active resilient in-memory SQL driver';
    console.warn(`[MySQL] Notice: ${dbStatus.error}. Operating with resilient SQL engine.`);
    return false;
  }
}

/**
 * Run DDL to ensure all relational tables exist
 */
async function initializeSchemas() {
  if (!pool) return;
  try {
    await pool.query(DDL_CREATE_USERS_TABLE);
    await pool.query(DDL_CREATE_CATEGORIES_TABLE);
    await pool.query(DDL_CREATE_PRODUCTS_TABLE);
    await pool.query(DDL_CREATE_ORDERS_TABLE);
    await pool.query(DDL_CREATE_SECURITY_LOGS_TABLE);
    await pool.query(DDL_CREATE_PRODUCT_SALES_TABLE);
    console.log('[MySQL] All relational tables verified: users, categories, products, orders, security_logs, product_sales');
    dbStatus.tables = ['users', 'categories', 'products', 'orders', 'security_logs', 'product_sales'];
  } catch (err: any) {
    console.warn('[MySQL] Schema initialization warning:', err?.message);
  }
}

/**
 * Universal Query Executor with Real MySQL Pool + Resilient Fallback Engine
 */
export async function executeQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  queriesCount++;

  // 1. If live pool is connected, execute directly on MySQL
  if (pool && dbStatus.connected) {
    try {
      const [rows] = await pool.query(sql, params);
      return rows as T[];
    } catch (err: any) {
      console.warn('[MySQL] Query error, checking memory sync:', err?.message);
      // If error occurs, fall through to memory store for safety
    }
  }

  // 2. Resilient In-Memory SQL Simulation Engine
  // Allows testing and execution of all queries even before user starts an external MySQL server
  return executeInMemoryQuery<T>(sql, params);
}

/**
 * In-memory simulated SQL parser for seamless execution during preview/dev
 */
function executeInMemoryQuery<T = any>(sql: string, params: any[] = []): T[] {
  const trimmed = sql.trim();
  const lower = trimmed.toLowerCase();

  // Helper to parse JSON values for rows
  const safeParse = (val: any) => {
    if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
      try {
        return JSON.parse(val);
      } catch {
        return val;
      }
    }
    return val;
  };

  // --- USERS QUERIES ---
  if (lower.includes('from users') || lower.includes('into users') || lower.includes('update users')) {
    if (lower.startsWith('select')) {
      if (lower.includes('where lower(email) = lower(?)')) {
        const email = String(params[0] || '').toLowerCase();
        const user = Array.from(memoryStore.users.values()).find(
          (u) => String(u.email || '').toLowerCase() === email
        );
        return (user ? [user] : []) as T[];
      }
      if (lower.includes('where id = ?')) {
        const id = String(params[0]);
        const user = memoryStore.users.get(id);
        return (user ? [user] : []) as T[];
      }
      if (lower.includes('role in') || lower.includes("role = 'admin'") || lower.includes("role = 'superadmin'")) {
        const admins = Array.from(memoryStore.users.values()).filter(
          (u) => u.role === 'admin' || u.role === 'superadmin'
        );
        return admins as T[];
      }
      return Array.from(memoryStore.users.values()) as T[];
    }

    if (lower.startsWith('insert into users')) {
      // id, email, password_hash, first_name, last_name, phone, role, is_guest, two_factor_enabled, saved_addresses, wishlist, connected_providers
      const [id, email, password_hash, first_name, last_name, phone, role, is_guest, two_factor_enabled, saved_addresses, wishlist, connected_providers] = params;
      const newUser = {
        id,
        email,
        password_hash,
        first_name,
        last_name,
        phone,
        role: role || 'customer',
        is_guest: Boolean(is_guest),
        two_factor_enabled: Boolean(two_factor_enabled),
        saved_addresses: safeParse(saved_addresses) || [],
        wishlist: safeParse(wishlist) || [],
        connected_providers: safeParse(connected_providers) || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      memoryStore.users.set(id, newUser);
      return [{ insertId: id, affectedRows: 1 }] as any;
    }

    if (lower.startsWith('update users')) {
      if (lower.includes('set password_hash = ?')) {
        const [pass, id] = params;
        const user = memoryStore.users.get(id);
        if (user) {
          user.password_hash = pass;
          user.updated_at = new Date().toISOString();
        }
        return [{ affectedRows: user ? 1 : 0 }] as any;
      }
      if (lower.includes('set first_name = ?')) {
        const [fn, ln, phone, id] = params;
        const user = memoryStore.users.get(id);
        if (user) {
          user.first_name = fn;
          user.last_name = ln;
          user.phone = phone;
          user.updated_at = new Date().toISOString();
        }
        return [{ affectedRows: user ? 1 : 0 }] as any;
      }
    }
  }

  // --- CATEGORIES QUERIES ---
  if (lower.includes('categories')) {
    if (lower.startsWith('select count(*)')) {
      return [{ total: memoryStore.categories.size }] as any;
    }

    if (lower.startsWith('select')) {
      if (lower.includes('where id = ? or slug = ?')) {
        const [idOrSlug] = params;
        const found = Array.from(memoryStore.categories.values()).find(
          (c) => c.id === idOrSlug || c.slug === idOrSlug
        );
        return (found ? [found] : []) as T[];
      }
      const list = Array.from(memoryStore.categories.values()).sort(
        (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)
      );
      return list as T[];
    }

    if (lower.startsWith('insert into categories')) {
      // id, slug, name_en, name_ar, description_en, description_ar, image, active, display_order
      const [id, slug, name_en, name_ar, description_en, description_ar, image, active, display_order] = params;
      const cat = {
        id,
        slug,
        nameEn: name_en,
        nameAr: name_ar,
        descriptionEn: description_en || '',
        descriptionAr: description_ar || '',
        image: image || '',
        active: active !== 0 && active !== false,
        displayOrder: Number(display_order) || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      memoryStore.categories.set(id, cat);
      return [{ insertId: id, affectedRows: 1 }] as any;
    }

    if (lower.startsWith('update categories')) {
      // name_en, name_ar, slug, description_en, description_ar, image, active, display_order, id
      const [name_en, name_ar, slug, description_en, description_ar, image, active, display_order, id] = params;
      const cat = memoryStore.categories.get(id);
      if (cat) {
        cat.nameEn = name_en;
        cat.nameAr = name_ar;
        cat.slug = slug;
        cat.descriptionEn = description_en;
        cat.descriptionAr = description_ar;
        cat.image = image;
        cat.active = active !== 0 && active !== false;
        cat.displayOrder = Number(display_order);
        cat.updatedAt = new Date().toISOString();
      }
      return [{ affectedRows: cat ? 1 : 0 }] as any;
    }

    if (lower.startsWith('delete from categories')) {
      const [id] = params;
      const deleted = memoryStore.categories.delete(id);
      return [{ affectedRows: deleted ? 1 : 0 }] as any;
    }
  }

  // --- PRODUCTS QUERIES ---
  if ((lower.includes('products') || lower.includes('from products') || lower.includes('into products')) && !lower.includes('product_sales')) {
    if (lower.startsWith('select count(*)')) {
      return [{ total: memoryStore.products.size }] as any;
    }

    if (lower.startsWith('select')) {
      if (lower.includes('where id = ? or sku = ?')) {
        const [idOrSku] = params;
        const found = Array.from(memoryStore.products.values()).find(
          (p) => p.id === idOrSku || p.sku === idOrSku
        );
        return (found ? [found] : []) as T[];
      }
      return Array.from(memoryStore.products.values()) as T[];
    }

    if (lower.startsWith('insert into products')) {
      const [
        id, sku, name_en, name_ar, description_en, description_ar,
        category_id, category_name_en, category_name_ar,
        price, sale_price, currency, images, variants,
        material_en, material_ar, care_instructions_en, care_instructions_ar,
        tags, featured, best_seller, new_arrival, active, rating, review_count,
        target_audience, kid_age_range
      ] = params;

      const prod = {
        id,
        sku,
        nameEn: name_en,
        nameAr: name_ar,
        descriptionEn: description_en,
        descriptionAr: description_ar,
        categoryId: category_id,
        categoryNameEn: category_name_en,
        categoryNameAr: category_name_ar,
        price: Number(price),
        salePrice: sale_price !== null && sale_price !== undefined ? Number(sale_price) : undefined,
        currency: currency || 'BHD',
        images: safeParse(images) || [],
        variants: safeParse(variants) || [],
        materialEn: material_en,
        materialAr: material_ar,
        careInstructionsEn: care_instructions_en,
        careInstructionsAr: care_instructions_ar,
        tags: safeParse(tags) || [],
        featured: Boolean(featured),
        bestSeller: Boolean(best_seller),
        newArrival: Boolean(new_arrival),
        active: active !== 0 && active !== false,
        rating: Number(rating || 5),
        reviewCount: Number(review_count || 0),
        targetAudience: target_audience || 'women',
        kidAgeRange: kid_age_range,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      memoryStore.products.set(id, prod);
      return [{ insertId: id, affectedRows: 1 }] as any;
    }

    if (lower.startsWith('update products')) {
      if (lower.includes('set variants = ?')) {
        const [variants, id] = params;
        const prod = memoryStore.products.get(id);
        if (prod) {
          prod.variants = safeParse(variants);
          prod.updatedAt = new Date().toISOString();
        }
        return [{ affectedRows: prod ? 1 : 0 }] as any;
      }

      const [
        sku, name_en, name_ar, description_en, description_ar,
        category_id, category_name_en, price, sale_price,
        images, variants, material_en, material_ar,
        care_instructions_en, care_instructions_ar, tags,
        featured, best_seller, new_arrival, active,
        target_audience, kid_age_range, id
      ] = params;

      const prod = memoryStore.products.get(id);
      if (prod) {
        prod.sku = sku;
        prod.nameEn = name_en;
        prod.nameAr = name_ar;
        prod.descriptionEn = description_en;
        prod.descriptionAr = description_ar;
        prod.categoryId = category_id;
        prod.categoryNameEn = category_name_en;
        prod.price = Number(price);
        prod.salePrice = sale_price !== null && sale_price !== undefined ? Number(sale_price) : undefined;
        prod.images = safeParse(images);
        prod.variants = safeParse(variants);
        prod.materialEn = material_en;
        prod.materialAr = material_ar;
        prod.careInstructionsEn = care_instructions_en;
        prod.careInstructionsAr = care_instructions_ar;
        prod.tags = safeParse(tags);
        prod.featured = Boolean(featured);
        prod.bestSeller = Boolean(best_seller);
        prod.newArrival = Boolean(new_arrival);
        prod.active = active !== 0 && active !== false;
        prod.targetAudience = target_audience;
        prod.kidAgeRange = kid_age_range;
        prod.updatedAt = new Date().toISOString();
      }
      return [{ affectedRows: prod ? 1 : 0 }] as any;
    }

    if (lower.startsWith('delete from products')) {
      const [id] = params;
      const deleted = memoryStore.products.delete(id);
      return [{ affectedRows: deleted ? 1 : 0 }] as any;
    }
  }

  // --- ORDERS QUERIES ---
  if (lower.includes('orders') && !lower.includes('product_sales')) {
    if (lower.startsWith('select')) {
      return Array.from(memoryStore.orders.values()) as T[];
    }
    if (lower.startsWith('insert into orders')) {
      const [id, order_number, user_id, customer_name, customer_email, customer_phone, delivery_address, items, subtotal, discount, shipping_fee, total, order_status, payment_status, payment_method, pin_code] = params;
      const order = {
        id,
        orderNumber: order_number,
        userId: user_id,
        customerName: customer_name,
        customerEmail: customer_email,
        customerPhone: customer_phone,
        deliveryAddress: safeParse(delivery_address),
        items: safeParse(items),
        subtotal: Number(subtotal),
        discount: Number(discount || 0),
        shippingFee: Number(shipping_fee || 0),
        total: Number(total),
        orderStatus: order_status || 'Confirmed',
        paymentStatus: payment_status || 'Pending',
        paymentMethod: payment_method,
        pinCode: pin_code,
        createdAt: new Date().toISOString(),
      };
      memoryStore.orders.set(id, order);
      return [{ insertId: id, affectedRows: 1 }] as any;
    }
    if (lower.startsWith('update orders')) {
      if (lower.includes('order_status = ?')) {
        const [status, idOrNum] = params;
        const ord = Array.from(memoryStore.orders.values()).find(
          (o) => o.id === idOrNum || o.orderNumber === idOrNum
        );
        if (ord) {
          ord.orderStatus = status;
          ord.updatedAt = new Date().toISOString();
        }
        return [{ affectedRows: ord ? 1 : 0 }] as any;
      }
      if (lower.includes("payment_status = 'paid'")) {
        const [idOrNum] = params;
        const ord = Array.from(memoryStore.orders.values()).find(
          (o) => o.id === idOrNum || o.orderNumber === idOrNum
        );
        if (ord) {
          ord.paymentStatus = 'Paid';
          ord.isDeliveryPaidConfirmed = true;
          ord.updatedAt = new Date().toISOString();
        }
        return [{ affectedRows: ord ? 1 : 0 }] as any;
      }
    }
  }

  // --- PRODUCT SALES & ANALYTICS QUERIES ---
  if (lower.includes('product_sales')) {
    if (lower.startsWith('insert into product_sales')) {
      const [
        id, order_id, order_number, product_id, product_sku, product_name_en, product_name_ar,
        category_id, category_name_en, variant_size, variant_color_name, variant_color_hex,
        unit_price, quantity, total_amount, currency, payment_method, payment_status,
        customer_id, customer_name, customer_email, customer_area, customer_city
      ] = params;

      const sale = {
        id,
        orderId: order_id,
        orderNumber: order_number,
        productId: product_id,
        productSku: product_sku,
        productNameEn: product_name_en,
        productNameAr: product_name_ar,
        categoryId: category_id,
        categoryNameEn: category_name_en,
        variantSize: variant_size,
        variantColorName: variant_color_name,
        variantColorHex: variant_color_hex,
        unitPrice: Number(unit_price),
        quantity: Number(quantity),
        totalAmount: Number(total_amount),
        currency: currency || 'BHD',
        paymentMethod: payment_method || 'benefit_pay',
        paymentStatus: payment_status || 'Paid',
        customerId: customer_id,
        customerName: customer_name,
        customerEmail: customer_email,
        customerArea: customer_area || 'Adliya',
        customerCity: customer_city || 'Manama',
        saleDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
      };
      memoryStore.product_sales.set(id, sale);
      return [{ insertId: id, affectedRows: 1 }] as any;
    }

    if (lower.startsWith('select count(*)')) {
      return [{ total: memoryStore.product_sales.size }] as any;
    }

    // Top selling products aggregation
    if (lower.includes('group by product_id')) {
      const grouped = new Map<string, any>();
      for (const sale of memoryStore.product_sales.values()) {
        if (sale.paymentStatus !== 'Paid') continue;
        const key = sale.productId;
        if (!grouped.has(key)) {
          grouped.set(key, {
            productId: sale.productId,
            productSku: sale.productSku,
            productNameEn: sale.productNameEn,
            productNameAr: sale.productNameAr,
            categoryNameEn: sale.categoryNameEn,
            totalUnitsSold: 0,
            totalRevenueBHD: 0,
            orderIds: new Set<string>(),
            totalPriceSum: 0,
            count: 0,
          });
        }
        const item = grouped.get(key);
        item.totalUnitsSold += sale.quantity;
        item.totalRevenueBHD += sale.totalAmount;
        item.orderIds.add(sale.orderId);
        item.totalPriceSum += sale.unitPrice;
        item.count++;
      }
      const list = Array.from(grouped.values()).map((g) => ({
        productId: g.productId,
        productSku: g.productSku,
        productNameEn: g.productNameEn,
        productNameAr: g.productNameAr,
        categoryNameEn: g.categoryNameEn,
        totalUnitsSold: g.totalUnitsSold,
        totalRevenueBHD: Number(g.totalRevenueBHD.toFixed(3)),
        totalOrdersCount: g.orderIds.size,
        averageSellingPrice: Number((g.totalPriceSum / (g.count || 1)).toFixed(3)),
      }));
      list.sort((a, b) => b.totalRevenueBHD - a.totalRevenueBHD);
      const limit = Number(params[0] || 10);
      return list.slice(0, limit) as T[];
    }

    // Sales by Category
    if (lower.includes('group by category_id')) {
      const catMap = new Map<string, any>();
      for (const sale of memoryStore.product_sales.values()) {
        if (sale.paymentStatus !== 'Paid') continue;
        const catKey = sale.categoryId || 'general';
        if (!catMap.has(catKey)) {
          catMap.set(catKey, {
            categoryId: catKey,
            categoryNameEn: sale.categoryNameEn || 'General Nightwear',
            totalUnitsSold: 0,
            totalRevenueBHD: 0,
            orderIds: new Set<string>(),
          });
        }
        const c = catMap.get(catKey);
        c.totalUnitsSold += sale.quantity;
        c.totalRevenueBHD += sale.totalAmount;
        c.orderIds.add(sale.orderId);
      }
      const list = Array.from(catMap.values()).map((c) => ({
        categoryId: c.categoryId,
        categoryNameEn: c.categoryNameEn,
        totalUnitsSold: c.totalUnitsSold,
        totalRevenueBHD: Number(c.totalRevenueBHD.toFixed(3)),
        totalOrdersCount: c.orderIds.size,
      }));
      list.sort((a, b) => b.totalRevenueBHD - a.totalRevenueBHD);
      return list as T[];
    }

    // Sales by Payment Method
    if (lower.includes('group by payment_method')) {
      const payMap = new Map<string, any>();
      for (const sale of memoryStore.product_sales.values()) {
        const pKey = sale.paymentMethod || 'benefit_pay';
        if (!payMap.has(pKey)) {
          payMap.set(pKey, {
            paymentMethod: pKey,
            transactionCount: 0,
            orderIds: new Set<string>(),
            totalUnitsSold: 0,
            totalVolumeBHD: 0,
          });
        }
        const p = payMap.get(pKey);
        p.orderIds.add(sale.orderId);
        p.totalUnitsSold += sale.quantity;
        p.totalVolumeBHD += sale.totalAmount;
      }
      const list = Array.from(payMap.values()).map((p) => ({
        paymentMethod: p.paymentMethod,
        transactionCount: p.orderIds.size,
        totalUnitsSold: p.totalUnitsSold,
        totalVolumeBHD: Number(p.totalVolumeBHD.toFixed(3)),
      }));
      list.sort((a, b) => b.totalVolumeBHD - a.totalVolumeBHD);
      return list as T[];
    }

    // Sales by Bahrain Area
    if (lower.includes('group by customer_area')) {
      const areaMap = new Map<string, any>();
      for (const sale of memoryStore.product_sales.values()) {
        const aKey = sale.customerArea || 'Manama';
        if (!areaMap.has(aKey)) {
          areaMap.set(aKey, {
            areaName: aKey,
            orderIds: new Set<string>(),
            unitsSold: 0,
            totalRevenueBHD: 0,
          });
        }
        const a = areaMap.get(aKey);
        a.orderIds.add(sale.orderId);
        a.unitsSold += sale.quantity;
        a.totalRevenueBHD += sale.totalAmount;
      }
      const list = Array.from(areaMap.values()).map((a) => ({
        areaName: a.areaName,
        orderCount: a.orderIds.size,
        unitsSold: a.unitsSold,
        totalRevenueBHD: Number(a.totalRevenueBHD.toFixed(3)),
      }));
      list.sort((a, b) => b.totalRevenueBHD - a.totalRevenueBHD);
      return list as T[];
    }

    // Daily Sales Trend
    if (lower.includes('group by sale_date')) {
      const trendMap = new Map<string, any>();
      for (const sale of memoryStore.product_sales.values()) {
        const dKey = sale.saleDate || new Date().toISOString().split('T')[0];
        if (!trendMap.has(dKey)) {
          trendMap.set(dKey, {
            saleDate: dKey,
            orderIds: new Set<string>(),
            unitsSold: 0,
            dailyRevenueBHD: 0,
          });
        }
        const t = trendMap.get(dKey);
        t.orderIds.add(sale.orderId);
        t.unitsSold += sale.quantity;
        t.dailyRevenueBHD += sale.totalAmount;
      }
      const list = Array.from(trendMap.values()).map((t) => ({
        saleDate: t.saleDate,
        ordersCount: t.orderIds.size,
        unitsSold: t.unitsSold,
        dailyRevenueBHD: Number(t.dailyRevenueBHD.toFixed(3)),
      }));
      list.sort((a, b) => a.saleDate.localeCompare(b.saleDate));
      return list as T[];
    }

    // Overall Summary
    if (lower.includes('count(*) as totalsaleitems')) {
      let totalUnits = 0;
      let grossRev = 0;
      const orderIds = new Set<string>();
      const prodIds = new Set<string>();

      for (const sale of memoryStore.product_sales.values()) {
        if (sale.paymentStatus !== 'Paid') continue;
        totalUnits += sale.quantity;
        grossRev += sale.totalAmount;
        orderIds.add(sale.orderId);
        prodIds.add(sale.productId);
      }
      const count = memoryStore.product_sales.size;
      return [
        {
          totalSaleItems: count,
          totalOrders: orderIds.size,
          distinctProductsSold: prodIds.size,
          totalUnitsSold: totalUnits,
          grossRevenueBHD: Number(grossRev.toFixed(3)),
          averageItemValueBHD: count > 0 ? Number((grossRev / count).toFixed(3)) : 0,
        },
      ] as T[];
    }

    // Default SELECT for product sales
    if (lower.startsWith('select')) {
      let list = Array.from(memoryStore.product_sales.values());
      if (lower.includes('where product_id = ? or product_sku = ?')) {
        const [filterVal] = params;
        list = list.filter((s) => s.productId === filterVal || s.productSku === filterVal);
      } else if (lower.includes('where order_id = ? or order_number = ?')) {
        const [ordVal] = params;
        list = list.filter((s) => s.orderId === ordVal || s.orderNumber === ordVal);
      }
      return list as T[];
    }
  }

  return [] as T[];
}

export { pool };
