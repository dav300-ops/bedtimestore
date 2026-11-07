import mysql, { Pool, PoolOptions, PoolConnection } from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { config, sanitizeData } from './config';
import {
  DDL_CREATE_USERS_TABLE,
  DDL_CREATE_CATEGORIES_TABLE,
  DDL_CREATE_PRODUCTS_TABLE,
  DDL_CREATE_ORDERS_TABLE,
  DDL_CREATE_SECURITY_LOGS_TABLE,
  DDL_CREATE_PRODUCT_SALES_TABLE,
} from './queries/mysqlQueries';

export interface MySQLDatabaseStatus {
  engine: 'mysql' | 'mariadb';
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

let pool: Pool | null = null;
let queriesCount = 0;

export function getPool(): Pool | null {
  return pool;
}

/**
 * Parameter sanitizer: converts any undefined bind parameter to null (value ?? null)
 * as required by mysql2 / MariaDB prepared statements.
 */
export function sanitizeParams(params: any[] = []): any[] {
  return params.map((v) => (v === undefined ? null : v));
}

/**
 * Wrap JSON columns in JSON.stringify when writing
 */
export function stringifyJson(val: any, fallback: any = []): string {
  if (val === undefined || val === null) return JSON.stringify(fallback);
  if (typeof val === 'string') {
    try {
      JSON.parse(val);
      return val;
    } catch {
      return JSON.stringify(val);
    }
  }
  return JSON.stringify(val);
}

/**
 * Parse JSON columns when reading if the driver returns a string
 */
export function parseJson<T = any>(val: any, fallback: T): T {
  if (val === undefined || val === null) return fallback;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  }
  return val as T;
}

let dbStatus: MySQLDatabaseStatus = {
  engine: 'mariadb',
  connected: false,
  state: 'disconnected',
  host: process.env.DB_HOST || config.db.host,
  port: Number(process.env.DB_PORT || config.db.port),
  database: process.env.DB_NAME || config.db.database,
  user: process.env.DB_USER || config.db.user,
  queriesExecuted: 0,
};

// Resilient in-memory tables used when live MariaDB/MySQL server is not yet provisioned
const memoryStore = {
  users: new Map<string, any>(),
  categories: new Map<string, any>(),
  products: new Map<string, any>(),
  orders: new Map<string, any>(),
  security_logs: new Map<string, any>(),
  product_sales: new Map<string, any>(),
};

const PERSISTENCE_DIR = path.join(process.cwd(), 'server', 'data');
const PERSISTENCE_FILE = path.join(PERSISTENCE_DIR, 'persisted_db.json');

function loadPersistedData() {
  try {
    if (fs.existsSync(PERSISTENCE_FILE)) {
      const raw = fs.readFileSync(PERSISTENCE_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (data.products && Array.isArray(data.products)) {
        for (const p of data.products) memoryStore.products.set(p.id, p);
      }
      if (data.categories && Array.isArray(data.categories)) {
        for (const c of data.categories) memoryStore.categories.set(c.id, c);
      }
      if (data.orders && Array.isArray(data.orders)) {
        for (const o of data.orders) memoryStore.orders.set(o.id, o);
      }
      if (data.users && Array.isArray(data.users)) {
        for (const u of data.users) memoryStore.users.set(u.id, u);
      }
      console.log(`[DB] Restored ${memoryStore.products.size} products from local persistence store.`);
    }
  } catch (err: any) {
    console.warn('[DB] Persistence load notice:', err?.message);
  }
}

function savePersistedData() {
  try {
    if (!fs.existsSync(PERSISTENCE_DIR)) {
      fs.mkdirSync(PERSISTENCE_DIR, { recursive: true });
    }
    const data = {
      products: Array.from(memoryStore.products.values()),
      categories: Array.from(memoryStore.categories.values()),
      orders: Array.from(memoryStore.orders.values()),
      users: Array.from(memoryStore.users.values()),
    };
    fs.writeFileSync(PERSISTENCE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err: any) {
    // Non-blocking
  }
}

// Load existing persisted data on startup
loadPersistedData();

export function getDatabaseStatus(): MySQLDatabaseStatus {
  return {
    ...dbStatus,
    queriesExecuted: queriesCount,
  };
}

/**
 * Initialize MariaDB/MySQL Connection Pool and Bootstrap DDL Schemas
 */
export async function connectToDatabase(): Promise<boolean> {
  dbStatus.state = 'connecting';
  queriesCount = 0;

  const dbHost = process.env.DB_HOST || config.db.host;
  const dbPort = Number(process.env.DB_PORT || config.db.port);
  const dbUser = process.env.DB_USER || config.db.user;
  const dbPassword = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : config.db.password;
  const dbName = process.env.DB_NAME || config.db.database;

  const poolOptions: PoolOptions = {
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 5000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    ssl: config.db.ssl ? { rejectUnauthorized: false } : undefined,
  };

  try {
    pool = mysql.createPool(poolOptions);

    // Test connectivity by checking connection
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();

    dbStatus.connected = true;
    dbStatus.state = 'connected';
    dbStatus.lastConnectedAt = new Date().toISOString();
    dbStatus.host = dbHost;
    dbStatus.port = dbPort;
    dbStatus.user = dbUser;
    dbStatus.database = dbName;
    dbStatus.pool = {
      connectionLimit: poolOptions.connectionLimit || 10,
      queueLimit: poolOptions.queueLimit || 0,
    };

    console.log(`[MariaDB/MySQL] Connected successfully to database "${dbName}" on ${dbHost}:${dbPort}`);

    // Bootstrap DDL Schemas
    await initializeSchemas();

    return true;
  } catch (err: any) {
    dbStatus.connected = false;
    dbStatus.state = 'fallback_memory';
    dbStatus.error = err?.message || 'MariaDB/MySQL server unreachable, active resilient in-memory SQL driver';
    console.warn(`[MariaDB/MySQL] Notice: ${dbStatus.error}. Operating with resilient SQL engine.`);
    return false;
  }
}

/**
 * Ping database with SELECT 1
 */
export async function pingDatabase(): Promise<boolean> {
  if (pool && dbStatus.connected) {
    try {
      await pool.execute('SELECT 1');
      return true;
    } catch (err: any) {
      console.error('[MariaDB Ping Failed]', { code: err?.code, sqlMessage: err?.sqlMessage });
      return false;
    }
  }
  return false;
}

/**
 * Execute a unit of work inside a managed transaction
 */
export async function withTransaction<T>(
  callback: (connection: PoolConnection) => Promise<T>
): Promise<T> {
  if (pool && dbStatus.connected) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (err: any) {
      await connection.rollback();
      console.error('[MariaDB/MySQL Transaction Rolled Back]', {
        code: err?.code,
        sqlMessage: err?.sqlMessage,
        message: err?.message,
      });
      throw err;
    } finally {
      connection.release();
    }
  }

  // Resilient memory fallback transaction
  return callback(null as any);
}

/**
 * Gracefully close the database pool
 */
export async function closePool(): Promise<void> {
  if (pool) {
    try {
      console.log('[MariaDB/MySQL] Closing database connection pool gracefully...');
      await pool.end();
      pool = null;
      dbStatus.connected = false;
      dbStatus.state = 'disconnected';
      console.log('[MariaDB/MySQL] Connection pool successfully closed.');
    } catch (err: any) {
      console.error('[MariaDB/MySQL] Error closing connection pool:', err?.message);
    }
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
    console.log('[MariaDB/MySQL] All relational tables verified: users, categories, products, orders, security_logs, product_sales');
    dbStatus.tables = ['users', 'categories', 'products', 'orders', 'security_logs', 'product_sales'];
  } catch (err: any) {
    console.warn('[MariaDB/MySQL] Schema initialization warning:', err?.message);
  }
}

function isDroppedConnectionError(err: any): boolean {
  if (!err) return false;
  const code = err.code || '';
  return (
    code === 'PROTOCOL_CONNECTION_LOST' ||
    code === 'ECONNRESET' ||
    code === 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR' ||
    code === 'ETIMEDOUT' ||
    code === 'EPIPE'
  );
}

/**
 * Universal Query Executor with MariaDB/MySQL Pool (pool.execute) + 1 Retry on Dropped Connections
 */
export async function executeQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  queriesCount++;
  const cleanParams = sanitizeParams(params);

  // 1. If live pool is connected, execute directly on MariaDB/MySQL using pool.execute
  if (pool && dbStatus.connected) {
    try {
      const [rows] = await pool.execute(sql, cleanParams);
      // Synchronize in-memory copy
      try {
        executeInMemoryQuery(sql, cleanParams);
      } catch {}
      return rows as T[];
    } catch (err: any) {
      if (isDroppedConnectionError(err)) {
        console.warn(`[MariaDB/MySQL] Connection dropped (${err.code}). Retrying query once...`);
        try {
          const [retryRows] = await pool.execute(sql, cleanParams);
          try {
            executeInMemoryQuery(sql, cleanParams);
          } catch {}
          return retryRows as T[];
        } catch (retryErr: any) {
          console.error('[MariaDB/MySQL Retry Failed]', { code: retryErr?.code, sqlMessage: retryErr?.sqlMessage });
          throw retryErr;
        }
      } else {
        console.error('[MariaDB/MySQL Query Failed]', {
          code: err?.code,
          sqlMessage: err?.sqlMessage,
          message: err?.message,
          sql: sql.trim().split('\n')[0],
        });
        throw err;
      }
    }
  }

  // 2. Resilient In-Memory SQL Simulation Engine
  return executeInMemoryQuery<T>(sql, cleanParams);
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
      savePersistedData();
      return [{ insertId: id, affectedRows: 1 }] as any;
    }

    if (lower.startsWith('update products')) {
      if (lower.includes('set variants = ?')) {
        const [variants, id] = params;
        const prod = memoryStore.products.get(id);
        if (prod) {
          prod.variants = safeParse(variants);
          prod.updatedAt = new Date().toISOString();
          savePersistedData();
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
        savePersistedData();
      }
      return [{ affectedRows: prod ? 1 : 0 }] as any;
    }

    if (lower.startsWith('delete from products')) {
      const [id] = params;
      const deleted = memoryStore.products.delete(id);
      savePersistedData();
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
