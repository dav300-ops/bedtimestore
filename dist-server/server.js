// server.ts
import express2 from "express";
import path3 from "path";
import fs3 from "fs";
import { fileURLToPath } from "url";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

// server/config.ts
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
var nodeEnv = (process.env.NODE_ENV || "development").trim().toLowerCase();
var isProd = nodeEnv === "production";
var rootDir = process.cwd();
if (isProd) {
  if (fs.existsSync(path.join(rootDir, ".env.production"))) {
    dotenv.config({ path: path.join(rootDir, ".env.production") });
  } else if (fs.existsSync(path.join(rootDir, ".env"))) {
    dotenv.config({ path: path.join(rootDir, ".env") });
  }
} else {
  if (fs.existsSync(path.join(rootDir, ".env.development"))) {
    dotenv.config({ path: path.join(rootDir, ".env.development") });
  } else if (fs.existsSync(path.join(rootDir, ".env"))) {
    dotenv.config({ path: path.join(rootDir, ".env") });
  }
}
function parseDatabaseConfig() {
  const uri = process.env.MYSQL_URI || process.env.DATABASE_URL;
  if (uri && (uri.startsWith("mysql://") || uri.startsWith("mysql2://"))) {
    try {
      const parsed = new URL(uri);
      return {
        host: parsed.hostname || "localhost",
        port: Number(parsed.port || 3306),
        user: parsed.username || "",
        password: parsed.password || "",
        database: parsed.pathname ? parsed.pathname.replace(/^\//, "") : "thebedtime_store"
      };
    } catch {
    }
  }
  return {
    host: process.env.DB_HOST || process.env.MYSQL_HOST || (isProd ? "" : "localhost"),
    port: Number(process.env.DB_PORT || process.env.MYSQL_PORT || 3306),
    user: process.env.DB_USER || process.env.MYSQL_USER || "",
    password: process.env.DB_PASSWORD !== void 0 ? process.env.DB_PASSWORD : process.env.MYSQL_PASSWORD || "",
    database: process.env.DB_NAME || process.env.MYSQL_DATABASE || ""
  };
}
var parsedDb = parseDatabaseConfig();
var config = {
  env: nodeEnv,
  isProd,
  isDev: !isProd,
  port: Number(process.env.PORT || 3e3),
  db: {
    host: parsedDb.host,
    port: parsedDb.port,
    user: parsedDb.user,
    password: parsedDb.password,
    database: parsedDb.database,
    ssl: process.env.DB_SSL === "true" || process.env.MYSQL_SSL === "true"
  },
  // When false (default), a database outage makes data endpoints return 503 instead of
  // silently pretending to save into a throw-away in-memory store.
  // Set ALLOW_MEMORY_FALLBACK=true ONLY for UI demos / previews with no database.
  allowMemoryFallback: process.env.ALLOW_MEMORY_FALLBACK === "true",
  corsOrigin: process.env.CORS_ORIGIN || (isProd ? "https://thebedtime.store" : "http://localhost:3000"),
  clientApiBaseUrl: process.env.VITE_API_BASE_URL || "",
  appVersion: process.env.VITE_APP_VERSION || process.env.APP_VERSION || "v1.0.0",
  cacheTtlMs: isProd ? 10 * 60 * 1e3 : 60 * 1e3
  // 10 minutes prod, 1 minute dev
};
function validateEnvironment() {
  const missing = [];
  if (isProd) {
    if (!config.db.host) missing.push("DB_HOST (or MYSQL_HOST / MYSQL_URI)");
    if (!config.db.user) missing.push("DB_USER (or MYSQL_USER / MYSQL_URI)");
    if (!config.db.database) missing.push("DB_NAME (or MYSQL_DATABASE / MYSQL_URI)");
    if (!process.env.CORS_ORIGIN) {
      console.warn(`[Config Notice] CORS_ORIGIN is not set; defaulting to ${config.corsOrigin}. Same-origin requests (site and API served by this server) are unaffected.`);
    }
    if (missing.length > 0) {
      console.error("================================================================================");
      console.error("[CONFIG FATAL ERROR] Missing required production environment variables:");
      missing.forEach((item) => console.error(`  - ${item}`));
      console.error("\nPlease define these variables in your deployment environment or .env.production.");
      console.error("================================================================================");
      process.exit(1);
    }
  } else {
    const devWarnings = [];
    if (!config.db.host) devWarnings.push("DB_HOST");
    if (!config.db.user) devWarnings.push("DB_USER");
    if (!config.db.database) devWarnings.push("DB_NAME");
    if (devWarnings.length > 0) {
      console.warn(`[Config Notice] Missing database settings: ${devWarnings.join(", ")}. Set them in .env (see .env.example).`);
    }
  }
}

// server/db.ts
import mysql from "mysql2/promise";
import fs2 from "fs";
import path2 from "path";

// server/queries/mysqlQueries.ts
var DDL_CREATE_USERS_TABLE = `
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(191) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(50) DEFAULT NULL,
  role ENUM('customer', 'admin', 'superadmin') DEFAULT 'customer',
  is_guest TINYINT(1) DEFAULT 0,
  two_factor_enabled TINYINT(1) DEFAULT 0,
  saved_addresses JSON DEFAULT NULL,
  wishlist JSON DEFAULT NULL,
  connected_providers JSON DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;
var DDL_CREATE_CATEGORIES_TABLE = `
CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(64) PRIMARY KEY,
  slug VARCHAR(191) NOT NULL UNIQUE,
  name_en VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255) NOT NULL,
  description_en TEXT DEFAULT NULL,
  description_ar TEXT DEFAULT NULL,
  image MEDIUMTEXT DEFAULT NULL,
  active TINYINT(1) DEFAULT 1,
  display_order INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_categories_slug (slug),
  INDEX idx_categories_order (display_order),
  INDEX idx_categories_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;
var DDL_CREATE_PRODUCTS_TABLE = `
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(64) PRIMARY KEY,
  sku VARCHAR(100) NOT NULL UNIQUE,
  name_en VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255) NOT NULL,
  description_en TEXT NOT NULL,
  description_ar TEXT NOT NULL,
  category_id VARCHAR(64) NOT NULL,
  category_name_en VARCHAR(255) DEFAULT NULL,
  category_name_ar VARCHAR(255) DEFAULT NULL,
  price DECIMAL(10, 3) NOT NULL,
  sale_price DECIMAL(10, 3) DEFAULT NULL,
  currency VARCHAR(10) DEFAULT 'BHD',
  images JSON DEFAULT NULL,
  variants JSON NOT NULL,
  material_en VARCHAR(255) DEFAULT NULL,
  material_ar VARCHAR(255) DEFAULT NULL,
  care_instructions_en TEXT DEFAULT NULL,
  care_instructions_ar TEXT DEFAULT NULL,
  tags JSON DEFAULT NULL,
  featured TINYINT(1) DEFAULT 0,
  best_seller TINYINT(1) DEFAULT 0,
  new_arrival TINYINT(1) DEFAULT 0,
  active TINYINT(1) DEFAULT 1,
  rating DECIMAL(3, 2) DEFAULT 5.00,
  review_count INT DEFAULT 0,
  target_audience ENUM('women', 'kids', 'unisex') DEFAULT 'women',
  kid_age_range VARCHAR(50) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_products_sku (sku),
  INDEX idx_products_category (category_id),
  INDEX idx_products_active (active),
  INDEX idx_products_featured (featured),
  INDEX idx_products_bestseller (best_seller),
  INDEX idx_products_newarrival (new_arrival)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;
var DDL_CREATE_ORDERS_TABLE = `
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(64) PRIMARY KEY,
  order_number VARCHAR(64) NOT NULL UNIQUE,
  user_id VARCHAR(64) DEFAULT NULL,
  customer_name VARCHAR(191) NOT NULL,
  customer_email VARCHAR(191) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  delivery_address JSON NOT NULL,
  items JSON NOT NULL,
  subtotal DECIMAL(10, 3) NOT NULL,
  discount DECIMAL(10, 3) DEFAULT 0.000,
  shipping_fee DECIMAL(10, 3) DEFAULT 0.000,
  total DECIMAL(10, 3) NOT NULL,
  order_status ENUM('Confirmed', 'Preparing', 'Shipped', 'Delivered', 'Cancelled') DEFAULT 'Confirmed',
  payment_status ENUM('Pending', 'Paid', 'Failed', 'Refunded') DEFAULT 'Pending',
  payment_method VARCHAR(50) NOT NULL,
  pin_code VARCHAR(10) DEFAULT NULL,
  tracking_number VARCHAR(100) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_orders_number (order_number),
  INDEX idx_orders_user (user_id),
  INDEX idx_orders_email (customer_email),
  INDEX idx_orders_status (order_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;
var DDL_CREATE_SECURITY_LOGS_TABLE = `
CREATE TABLE IF NOT EXISTS security_logs (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  action VARCHAR(50) NOT NULL,
  ip VARCHAR(45) NOT NULL,
  location VARCHAR(191) DEFAULT NULL,
  device VARCHAR(191) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_security_user (user_id),
  INDEX idx_security_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;
var DDL_CREATE_PRODUCT_SALES_TABLE = `
CREATE TABLE IF NOT EXISTS product_sales (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL,
  order_number VARCHAR(64) NOT NULL,
  product_id VARCHAR(64) NOT NULL,
  product_sku VARCHAR(100) NOT NULL,
  product_name_en VARCHAR(255) NOT NULL,
  product_name_ar VARCHAR(255) NOT NULL,
  category_id VARCHAR(64) DEFAULT NULL,
  category_name_en VARCHAR(255) DEFAULT NULL,
  variant_size VARCHAR(50) DEFAULT NULL,
  variant_color_name VARCHAR(100) DEFAULT NULL,
  variant_color_hex VARCHAR(20) DEFAULT NULL,
  unit_price DECIMAL(10, 3) NOT NULL,
  quantity INT NOT NULL,
  total_amount DECIMAL(10, 3) NOT NULL,
  currency VARCHAR(10) DEFAULT 'BHD',
  payment_method VARCHAR(50) DEFAULT NULL,
  payment_status ENUM('Pending', 'Paid', 'Failed', 'Refunded') DEFAULT 'Paid',
  customer_id VARCHAR(64) DEFAULT NULL,
  customer_name VARCHAR(191) DEFAULT NULL,
  customer_email VARCHAR(191) DEFAULT NULL,
  customer_area VARCHAR(100) DEFAULT NULL,
  customer_city VARCHAR(100) DEFAULT NULL,
  sale_date DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sales_order (order_id),
  INDEX idx_sales_order_num (order_number),
  INDEX idx_sales_product (product_id),
  INDEX idx_sales_sku (product_sku),
  INDEX idx_sales_category (category_id),
  INDEX idx_sales_date (sale_date),
  INDEX idx_sales_payment (payment_method),
  INDEX idx_sales_area (customer_area)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;
var SQL_REGISTER_USER = `
INSERT INTO users (
  id, email, password_hash, first_name, last_name, phone, role, is_guest, two_factor_enabled, saved_addresses, wishlist, connected_providers, created_at, updated_at
) VALUES (?, LOWER(?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
`;
var SQL_FIND_USER_BY_EMAIL = `
SELECT 
  id, email, password_hash, first_name, last_name, phone, role, is_guest, two_factor_enabled,
  saved_addresses, wishlist, connected_providers, created_at, updated_at
FROM users 
WHERE LOWER(email) = LOWER(?)
LIMIT 1
`;
var SQL_FIND_USER_BY_ID = `
SELECT 
  id, email, first_name, last_name, phone, role, is_guest, two_factor_enabled,
  saved_addresses, wishlist, connected_providers, created_at, updated_at
FROM users 
WHERE id = ?
LIMIT 1
`;
var SQL_SELECT_ALL_ADMINS = `
SELECT 
  id, email, password_hash, first_name, last_name, phone, role, is_guest, two_factor_enabled,
  saved_addresses, wishlist, connected_providers, created_at, updated_at
FROM users 
WHERE role IN ('admin', 'superadmin')
ORDER BY created_at DESC
`;
var SQL_UPDATE_USER_PASSWORD = `
UPDATE users 
SET password_hash = ?, updated_at = NOW() 
WHERE id = ?
`;
var SQL_UPDATE_USER_PROFILE = `
UPDATE users 
SET first_name = ?, last_name = ?, phone = ?, updated_at = NOW() 
WHERE id = ?
`;
var SQL_INSERT_SECURITY_LOG = `
INSERT INTO security_logs (id, user_id, action, ip, location, device, created_at)
VALUES (?, ?, ?, ?, ?, ?, NOW())
`;
var SQL_GET_USER_SECURITY_LOGS = `
SELECT id, user_id, action, ip, location, device, created_at
FROM security_logs
WHERE user_id = ?
ORDER BY created_at DESC
LIMIT 20
`;
var SQL_SELECT_ALL_CATEGORIES = `
SELECT 
  id, slug, name_en AS nameEn, name_ar AS nameAr,
  description_en AS descriptionEn, description_ar AS descriptionAr,
  image, active, display_order AS displayOrder, created_at AS createdAt, updated_at AS updatedAt
FROM categories
ORDER BY display_order ASC, created_at ASC
`;
var SQL_SELECT_CATEGORY_BY_ID_OR_SLUG = `
SELECT 
  id, slug, name_en AS nameEn, name_ar AS nameAr,
  description_en AS descriptionEn, description_ar AS descriptionAr,
  image, active, display_order AS displayOrder, created_at AS createdAt, updated_at AS updatedAt
FROM categories
WHERE id = ? OR slug = ?
LIMIT 1
`;
var SQL_INSERT_CATEGORY = `
INSERT INTO categories (
  id, slug, name_en, name_ar, description_en, description_ar, image, active, display_order, created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
`;
var SQL_UPDATE_CATEGORY = `
UPDATE categories
SET 
  name_en = ?,
  name_ar = ?,
  slug = ?,
  description_en = ?,
  description_ar = ?,
  image = ?,
  active = ?,
  display_order = ?,
  updated_at = NOW()
WHERE id = ?
`;
var SQL_DELETE_CATEGORY = `
DELETE FROM categories
WHERE id = ?
`;
var SQL_COUNT_CATEGORIES = `
SELECT COUNT(*) AS total FROM categories
`;
var SQL_SELECT_ALL_PRODUCTS = `
SELECT 
  id, sku, name_en AS nameEn, name_ar AS nameAr,
  description_en AS descriptionEn, description_ar AS descriptionAr,
  category_id AS categoryId, category_name_en AS categoryNameEn, category_name_ar AS categoryNameAr,
  price, sale_price AS salePrice, currency,
  images, variants, material_en AS materialEn, material_ar AS materialAr,
  care_instructions_en AS careInstructionsEn, care_instructions_ar AS careInstructionsAr,
  tags, featured, best_seller AS bestSeller, new_arrival AS newArrival,
  active, rating, review_count AS reviewCount,
  target_audience AS targetAudience, kid_age_range AS kidAgeRange,
  created_at AS createdAt, updated_at AS updatedAt
FROM products
ORDER BY created_at DESC
`;
var SQL_SELECT_PRODUCT_BY_ID_OR_SKU = `
SELECT 
  id, sku, name_en AS nameEn, name_ar AS nameAr,
  description_en AS descriptionEn, description_ar AS descriptionAr,
  category_id AS categoryId, category_name_en AS categoryNameEn, category_name_ar AS categoryNameAr,
  price, sale_price AS salePrice, currency,
  images, variants, material_en AS materialEn, material_ar AS materialAr,
  care_instructions_en AS careInstructionsEn, care_instructions_ar AS careInstructionsAr,
  tags, featured, best_seller AS bestSeller, new_arrival AS newArrival,
  active, rating, review_count AS reviewCount,
  target_audience AS targetAudience, kid_age_range AS kidAgeRange,
  created_at AS createdAt, updated_at AS updatedAt
FROM products
WHERE id = ? OR sku = ?
LIMIT 1
`;
var SQL_INSERT_PRODUCT = `
INSERT INTO products (
  id, sku, name_en, name_ar, description_en, description_ar,
  category_id, category_name_en, category_name_ar,
  price, sale_price, currency, images, variants,
  material_en, material_ar, care_instructions_en, care_instructions_ar,
  tags, featured, best_seller, new_arrival, active, rating, review_count,
  target_audience, kid_age_range, created_at, updated_at
) VALUES (
  ?, ?, ?, ?, ?, ?,
  ?, ?, ?,
  ?, ?, ?, ?, ?,
  ?, ?, ?, ?,
  ?, ?, ?, ?, ?, ?, ?,
  ?, ?, NOW(), NOW()
)
`;
var SQL_UPDATE_PRODUCT = `
UPDATE products
SET 
  sku = ?,
  name_en = ?,
  name_ar = ?,
  description_en = ?,
  description_ar = ?,
  category_id = ?,
  category_name_en = ?,
  category_name_ar = ?,
  price = ?,
  sale_price = ?,
  images = ?,
  variants = ?,
  material_en = ?,
  material_ar = ?,
  care_instructions_en = ?,
  care_instructions_ar = ?,
  tags = ?,
  featured = ?,
  best_seller = ?,
  new_arrival = ?,
  active = ?,
  target_audience = ?,
  kid_age_range = ?,
  updated_at = NOW()
WHERE id = ?
`;
var SQL_UPDATE_PRODUCT_VARIANTS = `
UPDATE products
SET variants = ?, updated_at = NOW()
WHERE id = ?
`;
var SQL_DELETE_PRODUCT = `
DELETE FROM products
WHERE id = ?
`;
var SQL_COUNT_PRODUCTS = `
SELECT COUNT(*) AS total FROM products
`;
var SQL_INSERT_ORDER = `
INSERT INTO orders (
  id, order_number, user_id, customer_name, customer_email, customer_phone,
  delivery_address, items, subtotal, discount, shipping_fee, total,
  order_status, payment_status, payment_method, pin_code, created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
`;
var SQL_SELECT_ALL_ORDERS = `
SELECT 
  id, order_number AS orderNumber, user_id AS userId, customer_name AS customerName,
  customer_email AS customerEmail, customer_phone AS customerPhone,
  delivery_address AS deliveryAddress, items, subtotal, discount,
  shipping_fee AS shippingFee, total, order_status AS orderStatus,
  payment_status AS paymentStatus, payment_method AS paymentMethod,
  pin_code AS pinCode, tracking_number AS trackingNumber,
  created_at AS createdAt, updated_at AS updatedAt
FROM orders
ORDER BY created_at DESC
`;
var SQL_SELECT_ORDERS_BY_USER = `
SELECT 
  id, order_number AS orderNumber, user_id AS userId, customer_name AS customerName,
  customer_email AS customerEmail, customer_phone AS customerPhone,
  delivery_address AS deliveryAddress, items, subtotal, discount,
  shipping_fee AS shippingFee, total, order_status AS orderStatus,
  payment_status AS paymentStatus, payment_method AS paymentMethod,
  pin_code AS pinCode, tracking_number AS trackingNumber,
  created_at AS createdAt, updated_at AS updatedAt
FROM orders
WHERE user_id = ? OR LOWER(customer_email) = LOWER(?)
ORDER BY created_at DESC
`;
var SQL_UPDATE_ORDER_STATUS = `
UPDATE orders
SET order_status = ?, updated_at = NOW()
WHERE id = ? OR order_number = ?
`;
var SQL_CONFIRM_ORDER_PAYMENT = `
UPDATE orders
SET payment_status = 'Paid', order_status = 'Delivered', updated_at = NOW()
WHERE id = ? OR order_number = ?
`;
var SQL_SELECT_ORDER_BY_ID = `
SELECT 
  id, order_number AS orderNumber, user_id AS userId, customer_name AS customerName,
  customer_email AS customerEmail, customer_phone AS customerPhone,
  delivery_address AS deliveryAddress, items, subtotal, discount,
  shipping_fee AS shippingFee, total, order_status AS orderStatus,
  payment_status AS paymentStatus, payment_method AS paymentMethod,
  pin_code AS pinCode, tracking_number AS trackingNumber,
  created_at AS createdAt, updated_at AS updatedAt
FROM orders
WHERE id = ? OR order_number = ?
LIMIT 1
`;
var SQL_UPDATE_ORDER = `
UPDATE orders
SET 
  customer_name = ?,
  customer_email = ?,
  customer_phone = ?,
  delivery_address = ?,
  items = ?,
  subtotal = ?,
  discount = ?,
  shipping_fee = ?,
  total = ?,
  order_status = ?,
  payment_status = ?,
  payment_method = ?,
  pin_code = ?,
  tracking_number = ?,
  updated_at = NOW()
WHERE id = ?
`;
var SQL_DELETE_ORDER = `
DELETE FROM orders
WHERE id = ?
`;
var SQL_INSERT_PRODUCT_SALE = `
INSERT INTO product_sales (
  id, order_id, order_number, product_id, product_sku, product_name_en, product_name_ar,
  category_id, category_name_en, variant_size, variant_color_name, variant_color_hex,
  unit_price, quantity, total_amount, currency, payment_method, payment_status,
  customer_id, customer_name, customer_email, customer_area, customer_city, sale_date, created_at
) VALUES (
  ?, ?, ?, ?, ?, ?, ?,
  ?, ?, ?, ?, ?,
  ?, ?, ?, ?, ?, ?,
  ?, ?, ?, ?, ?, CURDATE(), NOW()
)
`;
var SQL_SELECT_ALL_PRODUCT_SALES = `
SELECT 
  id, order_id AS orderId, order_number AS orderNumber, product_id AS productId,
  product_sku AS productSku, product_name_en AS productNameEn, product_name_ar AS productNameAr,
  category_id AS categoryId, category_name_en AS categoryNameEn,
  variant_size AS variantSize, variant_color_name AS variantColorName, variant_color_hex AS variantColorHex,
  unit_price AS unitPrice, quantity, total_amount AS totalAmount, currency,
  payment_method AS paymentMethod, payment_status AS paymentStatus,
  customer_id AS customerId, customer_name AS customerName, customer_email AS customerEmail,
  customer_area AS customerArea, customer_city AS customerCity, sale_date AS saleDate, created_at AS createdAt
FROM product_sales
ORDER BY created_at DESC
LIMIT ? OFFSET ?
`;
var SQL_SELECT_SALES_BY_PRODUCT = `
SELECT 
  id, order_id AS orderId, order_number AS orderNumber, product_id AS productId,
  product_sku AS productSku, product_name_en AS productNameEn, product_name_ar AS productNameAr,
  category_id AS categoryId, category_name_en AS categoryNameEn,
  variant_size AS variantSize, variant_color_name AS variantColorName, variant_color_hex AS variantColorHex,
  unit_price AS unitPrice, quantity, total_amount AS totalAmount, currency,
  payment_method AS paymentMethod, payment_status AS paymentStatus,
  customer_id AS customerId, customer_name AS customerName, customer_email AS customerEmail,
  customer_area AS customerArea, customer_city AS customerCity, sale_date AS saleDate, created_at AS createdAt
FROM product_sales
WHERE product_id = ? OR product_sku = ?
ORDER BY created_at DESC
`;
var SQL_SELECT_SALES_BY_ORDER = `
SELECT 
  id, order_id AS orderId, order_number AS orderNumber, product_id AS productId,
  product_sku AS productSku, product_name_en AS productNameEn, product_name_ar AS productNameAr,
  category_id AS categoryId, category_name_en AS categoryNameEn,
  variant_size AS variantSize, variant_color_name AS variantColorName, variant_color_hex AS variantColorHex,
  unit_price AS unitPrice, quantity, total_amount AS totalAmount, currency,
  payment_method AS paymentMethod, payment_status AS paymentStatus,
  customer_id AS customerId, customer_name AS customerName, customer_email AS customerEmail,
  customer_area AS customerArea, customer_city AS customerCity, sale_date AS saleDate, created_at AS createdAt
FROM product_sales
WHERE order_id = ? OR order_number = ?
ORDER BY created_at ASC
`;
var SQL_SELECT_TOP_SELLING_PRODUCTS = `
SELECT 
  product_id AS productId,
  product_sku AS productSku,
  product_name_en AS productNameEn,
  product_name_ar AS productNameAr,
  category_name_en AS categoryNameEn,
  CAST(SUM(quantity) AS SIGNED) AS totalUnitsSold,
  CAST(SUM(total_amount) AS DECIMAL(10, 3)) AS totalRevenueBHD,
  COUNT(DISTINCT order_id) AS totalOrdersCount,
  CAST(AVG(unit_price) AS DECIMAL(10, 3)) AS averageSellingPrice
FROM product_sales
WHERE payment_status = 'Paid'
GROUP BY product_id, product_sku, product_name_en, product_name_ar, category_name_en
ORDER BY totalRevenueBHD DESC
LIMIT ?
`;
var SQL_SELECT_SALES_BY_CATEGORY = `
SELECT 
  COALESCE(category_id, 'uncategorized') AS categoryId,
  COALESCE(category_name_en, 'General') AS categoryNameEn,
  CAST(SUM(quantity) AS SIGNED) AS totalUnitsSold,
  CAST(SUM(total_amount) AS DECIMAL(10, 3)) AS totalRevenueBHD,
  COUNT(DISTINCT order_id) AS totalOrdersCount
FROM product_sales
WHERE payment_status = 'Paid'
GROUP BY category_id, category_name_en
ORDER BY totalRevenueBHD DESC
`;
var SQL_SELECT_SALES_BY_PAYMENT_METHOD = `
SELECT 
  COALESCE(payment_method, 'unknown') AS paymentMethod,
  COUNT(DISTINCT order_id) AS transactionCount,
  CAST(SUM(quantity) AS SIGNED) AS totalUnitsSold,
  CAST(SUM(total_amount) AS DECIMAL(10, 3)) AS totalVolumeBHD
FROM product_sales
GROUP BY payment_method
ORDER BY totalVolumeBHD DESC
`;
var SQL_SELECT_SALES_BY_BAHRAIN_AREA = `
SELECT 
  COALESCE(customer_area, 'Manama') AS areaName,
  COUNT(DISTINCT order_id) AS orderCount,
  CAST(SUM(quantity) AS SIGNED) AS unitsSold,
  CAST(SUM(total_amount) AS DECIMAL(10, 3)) AS totalRevenueBHD
FROM product_sales
GROUP BY customer_area
ORDER BY totalRevenueBHD DESC
`;
var SQL_SELECT_DAILY_SALES_TREND = `
SELECT 
  DATE_FORMAT(sale_date, '%Y-%m-%d') AS saleDate,
  COUNT(DISTINCT order_id) AS ordersCount,
  CAST(SUM(quantity) AS SIGNED) AS unitsSold,
  CAST(SUM(total_amount) AS DECIMAL(10, 3)) AS dailyRevenueBHD
FROM product_sales
WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
GROUP BY sale_date
ORDER BY sale_date ASC
`;
var SQL_SELECT_SALES_OVERALL_SUMMARY = `
SELECT 
  COUNT(*) AS totalSaleItems,
  COUNT(DISTINCT order_id) AS totalOrders,
  COUNT(DISTINCT product_id) AS distinctProductsSold,
  CAST(COALESCE(SUM(quantity), 0) AS SIGNED) AS totalUnitsSold,
  CAST(COALESCE(SUM(total_amount), 0) AS DECIMAL(10, 3)) AS grossRevenueBHD,
  CAST(COALESCE(AVG(total_amount), 0) AS DECIMAL(10, 3)) AS averageItemValueBHD
FROM product_sales
WHERE payment_status = 'Paid'
`;
var SQL_COUNT_PRODUCT_SALES = `
SELECT COUNT(*) AS total FROM product_sales
`;
var SQL_SELECT_CUSTOMER_PURCHASES_SUMMARY = `
SELECT 
  COALESCE(customer_email, 'guest@thebedtimestore.bh') AS customerEmail,
  MAX(customer_name) AS customerName,
  MAX(customer_id) AS customerId,
  MAX(customer_area) AS customerArea,
  MAX(customer_city) AS customerCity,
  COUNT(DISTINCT order_id) AS totalOrders,
  CAST(SUM(quantity) AS SIGNED) AS totalItemsPurchased,
  COUNT(DISTINCT product_id) AS distinctProductsCount,
  CAST(SUM(total_amount) AS DECIMAL(10, 3)) AS totalSpendBHD,
  MAX(sale_date) AS lastPurchaseDate
FROM product_sales
GROUP BY customer_email
ORDER BY totalSpendBHD DESC
`;
var SQL_SELECT_SALES_BY_CUSTOMER = `
SELECT 
  id, order_id AS orderId, order_number AS orderNumber, product_id AS productId,
  product_sku AS productSku, product_name_en AS productNameEn, product_name_ar AS productNameAr,
  category_id AS categoryId, category_name_en AS categoryNameEn,
  variant_size AS variantSize, variant_color_name AS variantColorName, variant_color_hex AS variantColorHex,
  unit_price AS unitPrice, quantity, total_amount AS totalAmount, currency,
  payment_method AS paymentMethod, payment_status AS paymentStatus,
  customer_id AS customerId, customer_name AS customerName, customer_email AS customerEmail,
  customer_area AS customerArea, customer_city AS customerCity, sale_date AS saleDate, created_at AS createdAt
FROM product_sales
WHERE customer_email = ? OR customer_id = ?
ORDER BY created_at DESC
`;
var SQL_SELECT_BUYERS_BY_PRODUCT = `
SELECT 
  customer_email AS customerEmail,
  customer_name AS customerName,
  customer_id AS customerId,
  customer_area AS customerArea,
  order_number AS orderNumber,
  variant_size AS variantSize,
  variant_color_name AS variantColorName,
  quantity,
  total_amount AS totalAmount,
  payment_status AS paymentStatus,
  payment_method AS paymentMethod,
  sale_date AS saleDate,
  created_at AS createdAt
FROM product_sales
WHERE product_id = ? OR product_sku = ?
ORDER BY created_at DESC
`;

// server/db.ts
var pool = null;
var queriesCount = 0;
function sanitizeParams(params = []) {
  return params.map((v) => v === void 0 ? null : v);
}
function stringifyJson(val, fallback = []) {
  if (val === void 0 || val === null) return JSON.stringify(fallback);
  if (typeof val === "string") {
    try {
      JSON.parse(val);
      return val;
    } catch {
      return JSON.stringify(val);
    }
  }
  return JSON.stringify(val);
}
function parseJson(val, fallback) {
  if (val === void 0 || val === null) return fallback;
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  }
  return val;
}
var dbStatus = {
  engine: "mariadb",
  connected: false,
  state: "disconnected",
  host: process.env.DB_HOST || config.db.host,
  port: Number(process.env.DB_PORT || config.db.port),
  database: process.env.DB_NAME || config.db.database,
  user: process.env.DB_USER || config.db.user,
  queriesExecuted: 0
};
var memoryStore = {
  users: /* @__PURE__ */ new Map(),
  categories: /* @__PURE__ */ new Map(),
  products: /* @__PURE__ */ new Map(),
  orders: /* @__PURE__ */ new Map(),
  security_logs: /* @__PURE__ */ new Map(),
  product_sales: /* @__PURE__ */ new Map()
};
var PERSISTENCE_DIR = path2.join(process.cwd(), "server", "data");
var PERSISTENCE_FILE = path2.join(PERSISTENCE_DIR, "persisted_db.json");
function loadPersistedData() {
  try {
    if (fs2.existsSync(PERSISTENCE_FILE)) {
      const raw = fs2.readFileSync(PERSISTENCE_FILE, "utf-8");
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
  } catch (err) {
    console.warn("[DB] Persistence load notice:", err?.message);
  }
}
function savePersistedData() {
  try {
    if (!fs2.existsSync(PERSISTENCE_DIR)) {
      fs2.mkdirSync(PERSISTENCE_DIR, { recursive: true });
    }
    const data = {
      products: Array.from(memoryStore.products.values()),
      categories: Array.from(memoryStore.categories.values()),
      orders: Array.from(memoryStore.orders.values()),
      users: Array.from(memoryStore.users.values())
    };
    fs2.writeFileSync(PERSISTENCE_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
  }
}
if (config.allowMemoryFallback) loadPersistedData();
function getDatabaseStatus() {
  return {
    ...dbStatus,
    queriesExecuted: queriesCount
  };
}
function describeDbError(err) {
  const code = err?.code || err?.errno?.toString() || "UNKNOWN";
  const where = `${config.db.host || "(no host)"}:${config.db.port}`;
  const hints = {
    ECONNREFUSED: `Nothing is listening at ${where}. Is MariaDB running, and are DB_HOST/DB_PORT correct? (A cloud preview such as AI Studio cannot reach a database on your own PC or on "localhost".)`,
    ENOTFOUND: `The host name "${config.db.host}" cannot be resolved. Check DB_HOST.`,
    EAI_AGAIN: `DNS lookup for "${config.db.host}" failed. Check DB_HOST and the server's network.`,
    ETIMEDOUT: `Connection to ${where} timed out. The host may be firewalled. For a hosted database enable "Remote MySQL" and allow this server's IP.`,
    EHOSTUNREACH: `Host ${where} is unreachable from this server.`,
    ER_ACCESS_DENIED_ERROR: "Wrong DB_USER or DB_PASSWORD (or this user is not allowed to connect from this host).",
    ER_DBACCESS_DENIED_ERROR: `User "${config.db.user}" has no privileges on database "${config.db.database}". Grant INSERT/UPDATE/DELETE/SELECT/CREATE in the hosting panel.`,
    ER_BAD_DB_ERROR: `Database "${config.db.database}" does not exist. Create it first.`,
    ER_NET_PACKET_TOO_LARGE: "A query exceeded max_allowed_packet (usually a very large base64 image)."
  };
  return { code, hint: hints[code] || err?.sqlMessage || err?.message || "Unknown database error" };
}
function isDatabaseAvailable() {
  return dbStatus.connected || config.allowMemoryFallback;
}
function isUsingMemoryFallback() {
  return !dbStatus.connected && config.allowMemoryFallback;
}
async function connectToDatabase() {
  dbStatus.state = "connecting";
  const dbHost = process.env.DB_HOST || config.db.host;
  const dbPort = Number(process.env.DB_PORT || config.db.port);
  const dbUser = process.env.DB_USER || config.db.user;
  const dbPassword = process.env.DB_PASSWORD !== void 0 ? process.env.DB_PASSWORD : config.db.password;
  const dbName = process.env.DB_NAME || config.db.database;
  const poolOptions = {
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    charset: "utf8mb4",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 5e3,
    enableKeepAlive: true,
    keepAliveInitialDelay: 1e4,
    ssl: config.db.ssl ? { rejectUnauthorized: false } : void 0
  };
  try {
    if (pool) {
      try {
        await pool.end();
      } catch {
      }
      pool = null;
    }
    pool = mysql.createPool(poolOptions);
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    dbStatus.connected = true;
    dbStatus.state = "connected";
    dbStatus.error = void 0;
    dbStatus.errorCode = void 0;
    dbStatus.lastConnectedAt = (/* @__PURE__ */ new Date()).toISOString();
    dbStatus.host = dbHost;
    dbStatus.port = dbPort;
    dbStatus.user = dbUser;
    dbStatus.database = dbName;
    dbStatus.pool = {
      connectionLimit: poolOptions.connectionLimit || 10,
      queueLimit: poolOptions.queueLimit || 0
    };
    console.log(`[MariaDB/MySQL] Connected successfully to database "${dbName}" on ${dbHost}:${dbPort} as "${dbUser}"`);
    await initializeSchemas();
    return true;
  } catch (err) {
    const { code, hint } = describeDbError(err);
    dbStatus.connected = false;
    dbStatus.state = config.allowMemoryFallback ? "fallback_memory" : "error";
    dbStatus.error = hint;
    dbStatus.errorCode = code;
    dbStatus.host = dbHost;
    dbStatus.port = dbPort;
    dbStatus.user = dbUser;
    dbStatus.database = dbName;
    console.error("==============================================================================");
    console.error(`[DATABASE UNAVAILABLE] ${code}`);
    console.error(`  ${hint}`);
    console.error(`  Tried: ${dbUser}@${dbHost}:${dbPort}/${dbName}`);
    if (config.allowMemoryFallback) {
      console.error("  ALLOW_MEMORY_FALLBACK=true -> using a TEMPORARY in-memory store. NOTHING IS SAVED TO THE DATABASE.");
    } else {
      console.error("  Data endpoints will answer 503 until the database is reachable (retrying automatically).");
    }
    console.error("==============================================================================");
    return false;
  }
}
var retryTimer = null;
async function startConnectionManager(onConnected, retryMs = 15e3) {
  const attempt = async () => {
    const ok = await connectToDatabase();
    if (ok) {
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      try {
        if (onConnected) await onConnected();
      } catch (err) {
        console.warn("[MySQL] Post-connect bootstrap notice:", err?.message || err);
      }
      return;
    }
    retryTimer = setTimeout(attempt, retryMs);
  };
  await attempt();
}
async function pingDatabase() {
  if (pool && dbStatus.connected) {
    try {
      await pool.execute("SELECT 1");
      return true;
    } catch (err) {
      console.error("[MariaDB Ping Failed]", { code: err?.code, sqlMessage: err?.sqlMessage });
      return false;
    }
  }
  return false;
}
async function withTransaction(callback) {
  if (pool && dbStatus.connected) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (err) {
      await connection.rollback();
      console.error("[MariaDB/MySQL Transaction Rolled Back]", {
        code: err?.code,
        sqlMessage: err?.sqlMessage,
        message: err?.message
      });
      throw err;
    } finally {
      connection.release();
    }
  }
  if (config.allowMemoryFallback) {
    return callback(null);
  }
  throw makeUnavailableError();
}
async function closePool() {
  if (pool) {
    try {
      console.log("[MariaDB/MySQL] Closing database connection pool gracefully...");
      await pool.end();
      pool = null;
      dbStatus.connected = false;
      dbStatus.state = "disconnected";
      console.log("[MariaDB/MySQL] Connection pool successfully closed.");
    } catch (err) {
      console.error("[MariaDB/MySQL] Error closing connection pool:", err?.message);
    }
  }
}
async function initializeSchemas() {
  if (!pool) return;
  try {
    await pool.query(DDL_CREATE_USERS_TABLE);
    await pool.query(DDL_CREATE_CATEGORIES_TABLE);
    await pool.query(DDL_CREATE_PRODUCTS_TABLE);
    await pool.query(DDL_CREATE_ORDERS_TABLE);
    await pool.query(DDL_CREATE_SECURITY_LOGS_TABLE);
    await pool.query(DDL_CREATE_PRODUCT_SALES_TABLE);
    console.log("[MariaDB/MySQL] All relational tables verified: users, categories, products, orders, security_logs, product_sales");
    dbStatus.tables = ["users", "categories", "products", "orders", "security_logs", "product_sales"];
  } catch (err) {
    console.warn("[MariaDB/MySQL] Schema initialization warning:", err?.message);
  }
}
function isDroppedConnectionError(err) {
  if (!err) return false;
  const code = err.code || "";
  return code === "PROTOCOL_CONNECTION_LOST" || code === "ECONNRESET" || code === "PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR" || code === "ETIMEDOUT" || code === "EPIPE";
}
function makeUnavailableError() {
  const e = new Error(
    `Database is not connected${dbStatus.errorCode ? ` (${dbStatus.errorCode})` : ""}. Nothing was saved.`
  );
  e.code = "DB_UNAVAILABLE";
  return e;
}
async function executeQuery(sql, params = []) {
  queriesCount++;
  const cleanParams = sanitizeParams(params);
  if (pool && dbStatus.connected) {
    try {
      const [rows] = await pool.execute(sql, cleanParams);
      return rows;
    } catch (err) {
      if (isDroppedConnectionError(err)) {
        console.warn(`[MariaDB/MySQL] Connection dropped (${err.code}). Retrying query once...`);
        try {
          const [retryRows] = await pool.execute(sql, cleanParams);
          return retryRows;
        } catch (retryErr) {
          console.error("[MariaDB/MySQL Retry Failed]", { code: retryErr?.code, sqlMessage: retryErr?.sqlMessage });
          throw retryErr;
        }
      }
      console.error("[MariaDB/MySQL Query Failed]", {
        code: err?.code,
        sqlMessage: err?.sqlMessage,
        message: err?.message,
        sql: sql.trim().split("\n")[0]
      });
      throw err;
    }
  }
  if (config.allowMemoryFallback) {
    return executeInMemoryQuery(sql, cleanParams);
  }
  throw makeUnavailableError();
}
function executeInMemoryQuery(sql, params = []) {
  const trimmed = sql.trim();
  const lower = trimmed.toLowerCase();
  const safeParse = (val) => {
    if (typeof val === "string" && (val.startsWith("{") || val.startsWith("["))) {
      try {
        return JSON.parse(val);
      } catch {
        return val;
      }
    }
    return val;
  };
  if (lower.includes("from users") || lower.includes("into users") || lower.includes("update users")) {
    if (lower.startsWith("select")) {
      if (lower.includes("where lower(email) = lower(?)")) {
        const email = String(params[0] || "").toLowerCase();
        const user = Array.from(memoryStore.users.values()).find(
          (u) => String(u.email || "").toLowerCase() === email
        );
        return user ? [user] : [];
      }
      if (lower.includes("where id = ?")) {
        const id = String(params[0]);
        const user = memoryStore.users.get(id);
        return user ? [user] : [];
      }
      if (lower.includes("role in") || lower.includes("role = 'admin'") || lower.includes("role = 'superadmin'")) {
        const admins = Array.from(memoryStore.users.values()).filter(
          (u) => u.role === "admin" || u.role === "superadmin"
        );
        return admins;
      }
      return Array.from(memoryStore.users.values());
    }
    if (lower.startsWith("insert into users")) {
      const [id, email, password_hash, first_name, last_name, phone, role, is_guest, two_factor_enabled, saved_addresses, wishlist, connected_providers] = params;
      const newUser = {
        id,
        email,
        password_hash,
        first_name,
        last_name,
        phone,
        role: role || "customer",
        is_guest: Boolean(is_guest),
        two_factor_enabled: Boolean(two_factor_enabled),
        saved_addresses: safeParse(saved_addresses) || [],
        wishlist: safeParse(wishlist) || [],
        connected_providers: safeParse(connected_providers) || {},
        created_at: (/* @__PURE__ */ new Date()).toISOString(),
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      memoryStore.users.set(id, newUser);
      return [{ insertId: id, affectedRows: 1 }];
    }
    if (lower.startsWith("update users")) {
      if (lower.includes("set password_hash = ?")) {
        const [pass, id] = params;
        const user = memoryStore.users.get(id);
        if (user) {
          user.password_hash = pass;
          user.updated_at = (/* @__PURE__ */ new Date()).toISOString();
        }
        return [{ affectedRows: user ? 1 : 0 }];
      }
      if (lower.includes("set first_name = ?")) {
        const [fn, ln, phone, id] = params;
        const user = memoryStore.users.get(id);
        if (user) {
          user.first_name = fn;
          user.last_name = ln;
          user.phone = phone;
          user.updated_at = (/* @__PURE__ */ new Date()).toISOString();
        }
        return [{ affectedRows: user ? 1 : 0 }];
      }
    }
  }
  if (lower.includes("categories")) {
    if (lower.startsWith("select count(*)")) {
      return [{ total: memoryStore.categories.size }];
    }
    if (lower.startsWith("select")) {
      if (lower.includes("where id = ? or slug = ?")) {
        const [idOrSlug] = params;
        const found = Array.from(memoryStore.categories.values()).find(
          (c) => c.id === idOrSlug || c.slug === idOrSlug
        );
        return found ? [found] : [];
      }
      const list = Array.from(memoryStore.categories.values()).sort(
        (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)
      );
      return list;
    }
    if (lower.startsWith("insert into categories")) {
      const [id, slug, name_en, name_ar, description_en, description_ar, image, active, display_order] = params;
      const cat = {
        id,
        slug,
        nameEn: name_en,
        nameAr: name_ar,
        descriptionEn: description_en || "",
        descriptionAr: description_ar || "",
        image: image || "",
        active: active !== 0 && active !== false,
        displayOrder: Number(display_order) || 0,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      memoryStore.categories.set(id, cat);
      return [{ insertId: id, affectedRows: 1 }];
    }
    if (lower.startsWith("update categories")) {
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
        cat.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      }
      return [{ affectedRows: cat ? 1 : 0 }];
    }
    if (lower.startsWith("delete from categories")) {
      const [id] = params;
      const deleted = memoryStore.categories.delete(id);
      return [{ affectedRows: deleted ? 1 : 0 }];
    }
  }
  if ((lower.includes("products") || lower.includes("from products") || lower.includes("into products")) && !lower.includes("product_sales")) {
    if (lower.startsWith("select count(*)")) {
      return [{ total: memoryStore.products.size }];
    }
    if (lower.startsWith("select")) {
      if (lower.includes("where id = ? or sku = ?")) {
        const [idOrSku] = params;
        const found = Array.from(memoryStore.products.values()).find(
          (p) => p.id === idOrSku || p.sku === idOrSku
        );
        return found ? [found] : [];
      }
      return Array.from(memoryStore.products.values());
    }
    if (lower.startsWith("insert into products")) {
      const [
        id,
        sku,
        name_en,
        name_ar,
        description_en,
        description_ar,
        category_id,
        category_name_en,
        category_name_ar,
        price,
        sale_price,
        currency,
        images,
        variants,
        material_en,
        material_ar,
        care_instructions_en,
        care_instructions_ar,
        tags,
        featured,
        best_seller,
        new_arrival,
        active,
        rating,
        review_count,
        target_audience,
        kid_age_range
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
        salePrice: sale_price !== null && sale_price !== void 0 ? Number(sale_price) : void 0,
        currency: currency || "BHD",
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
        targetAudience: target_audience || "women",
        kidAgeRange: kid_age_range,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      memoryStore.products.set(id, prod);
      savePersistedData();
      return [{ insertId: id, affectedRows: 1 }];
    }
    if (lower.startsWith("update products")) {
      if (lower.includes("set variants = ?")) {
        const [variants2, id2] = params;
        const prod2 = memoryStore.products.get(id2);
        if (prod2) {
          prod2.variants = safeParse(variants2);
          prod2.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
          savePersistedData();
        }
        return [{ affectedRows: prod2 ? 1 : 0 }];
      }
      const [
        sku,
        name_en,
        name_ar,
        description_en,
        description_ar,
        category_id,
        category_name_en,
        price,
        sale_price,
        images,
        variants,
        material_en,
        material_ar,
        care_instructions_en,
        care_instructions_ar,
        tags,
        featured,
        best_seller,
        new_arrival,
        active,
        target_audience,
        kid_age_range,
        id
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
        prod.salePrice = sale_price !== null && sale_price !== void 0 ? Number(sale_price) : void 0;
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
        prod.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
        savePersistedData();
      }
      return [{ affectedRows: prod ? 1 : 0 }];
    }
    if (lower.startsWith("delete from products")) {
      const [id] = params;
      const deleted = memoryStore.products.delete(id);
      savePersistedData();
      return [{ affectedRows: deleted ? 1 : 0 }];
    }
  }
  if (lower.includes("orders") && !lower.includes("product_sales")) {
    if (lower.startsWith("select")) {
      return Array.from(memoryStore.orders.values());
    }
    if (lower.startsWith("insert into orders")) {
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
        orderStatus: order_status || "Confirmed",
        paymentStatus: payment_status || "Pending",
        paymentMethod: payment_method,
        pinCode: pin_code,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      memoryStore.orders.set(id, order);
      return [{ insertId: id, affectedRows: 1 }];
    }
    if (lower.startsWith("update orders")) {
      if (lower.includes("order_status = ?")) {
        const [status, idOrNum] = params;
        const ord = Array.from(memoryStore.orders.values()).find(
          (o) => o.id === idOrNum || o.orderNumber === idOrNum
        );
        if (ord) {
          ord.orderStatus = status;
          ord.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
        }
        return [{ affectedRows: ord ? 1 : 0 }];
      }
      if (lower.includes("payment_status = 'paid'")) {
        const [idOrNum] = params;
        const ord = Array.from(memoryStore.orders.values()).find(
          (o) => o.id === idOrNum || o.orderNumber === idOrNum
        );
        if (ord) {
          ord.paymentStatus = "Paid";
          ord.isDeliveryPaidConfirmed = true;
          ord.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
        }
        return [{ affectedRows: ord ? 1 : 0 }];
      }
    }
  }
  if (lower.includes("product_sales")) {
    if (lower.startsWith("insert into product_sales")) {
      const [
        id,
        order_id,
        order_number,
        product_id,
        product_sku,
        product_name_en,
        product_name_ar,
        category_id,
        category_name_en,
        variant_size,
        variant_color_name,
        variant_color_hex,
        unit_price,
        quantity,
        total_amount,
        currency,
        payment_method,
        payment_status,
        customer_id,
        customer_name,
        customer_email,
        customer_area,
        customer_city
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
        currency: currency || "BHD",
        paymentMethod: payment_method || "benefit_pay",
        paymentStatus: payment_status || "Paid",
        customerId: customer_id,
        customerName: customer_name,
        customerEmail: customer_email,
        customerArea: customer_area || "Adliya",
        customerCity: customer_city || "Manama",
        saleDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      memoryStore.product_sales.set(id, sale);
      return [{ insertId: id, affectedRows: 1 }];
    }
    if (lower.startsWith("select count(*)")) {
      return [{ total: memoryStore.product_sales.size }];
    }
    if (lower.includes("group by product_id")) {
      const grouped = /* @__PURE__ */ new Map();
      for (const sale of memoryStore.product_sales.values()) {
        if (sale.paymentStatus !== "Paid") continue;
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
            orderIds: /* @__PURE__ */ new Set(),
            totalPriceSum: 0,
            count: 0
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
        averageSellingPrice: Number((g.totalPriceSum / (g.count || 1)).toFixed(3))
      }));
      list.sort((a, b) => b.totalRevenueBHD - a.totalRevenueBHD);
      const limit = Number(params[0] || 10);
      return list.slice(0, limit);
    }
    if (lower.includes("group by category_id")) {
      const catMap = /* @__PURE__ */ new Map();
      for (const sale of memoryStore.product_sales.values()) {
        if (sale.paymentStatus !== "Paid") continue;
        const catKey = sale.categoryId || "general";
        if (!catMap.has(catKey)) {
          catMap.set(catKey, {
            categoryId: catKey,
            categoryNameEn: sale.categoryNameEn || "General Nightwear",
            totalUnitsSold: 0,
            totalRevenueBHD: 0,
            orderIds: /* @__PURE__ */ new Set()
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
        totalOrdersCount: c.orderIds.size
      }));
      list.sort((a, b) => b.totalRevenueBHD - a.totalRevenueBHD);
      return list;
    }
    if (lower.includes("group by payment_method")) {
      const payMap = /* @__PURE__ */ new Map();
      for (const sale of memoryStore.product_sales.values()) {
        const pKey = sale.paymentMethod || "benefit_pay";
        if (!payMap.has(pKey)) {
          payMap.set(pKey, {
            paymentMethod: pKey,
            transactionCount: 0,
            orderIds: /* @__PURE__ */ new Set(),
            totalUnitsSold: 0,
            totalVolumeBHD: 0
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
        totalVolumeBHD: Number(p.totalVolumeBHD.toFixed(3))
      }));
      list.sort((a, b) => b.totalVolumeBHD - a.totalVolumeBHD);
      return list;
    }
    if (lower.includes("group by customer_area")) {
      const areaMap = /* @__PURE__ */ new Map();
      for (const sale of memoryStore.product_sales.values()) {
        const aKey = sale.customerArea || "Manama";
        if (!areaMap.has(aKey)) {
          areaMap.set(aKey, {
            areaName: aKey,
            orderIds: /* @__PURE__ */ new Set(),
            unitsSold: 0,
            totalRevenueBHD: 0
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
        totalRevenueBHD: Number(a.totalRevenueBHD.toFixed(3))
      }));
      list.sort((a, b) => b.totalRevenueBHD - a.totalRevenueBHD);
      return list;
    }
    if (lower.includes("group by sale_date")) {
      const trendMap = /* @__PURE__ */ new Map();
      for (const sale of memoryStore.product_sales.values()) {
        const dKey = sale.saleDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        if (!trendMap.has(dKey)) {
          trendMap.set(dKey, {
            saleDate: dKey,
            orderIds: /* @__PURE__ */ new Set(),
            unitsSold: 0,
            dailyRevenueBHD: 0
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
        dailyRevenueBHD: Number(t.dailyRevenueBHD.toFixed(3))
      }));
      list.sort((a, b) => a.saleDate.localeCompare(b.saleDate));
      return list;
    }
    if (lower.includes("count(*) as totalsaleitems")) {
      let totalUnits = 0;
      let grossRev = 0;
      const orderIds = /* @__PURE__ */ new Set();
      const prodIds = /* @__PURE__ */ new Set();
      for (const sale of memoryStore.product_sales.values()) {
        if (sale.paymentStatus !== "Paid") continue;
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
          averageItemValueBHD: count > 0 ? Number((grossRev / count).toFixed(3)) : 0
        }
      ];
    }
    if (lower.startsWith("select")) {
      let list = Array.from(memoryStore.product_sales.values());
      if (lower.includes("where product_id = ? or product_sku = ?")) {
        const [filterVal] = params;
        list = list.filter((s) => s.productId === filterVal || s.productSku === filterVal);
      } else if (lower.includes("where order_id = ? or order_number = ?")) {
        const [ordVal] = params;
        list = list.filter((s) => s.orderId === ordVal || s.orderNumber === ordVal);
      }
      return list;
    }
  }
  return [];
}

// server/data/defaultCatalog.ts
var HERO_IMAGE = "/images/hero_luxury_sleepwear_1791490145358.jpg";
var SILK_PJ_IMAGE = "/images/product_silk_pj_set_1791490156744.jpg";
var ROSE_SATIN_IMAGE = "/images/product_rose_satin_dress_1791490168904.jpg";
var LACE_ROBE_IMAGE = "/images/product_lace_robe_1791490178832.jpg";
var KIDS_PJ_IMAGE = "/images/kids_pajamas_luxury_1791665113622.jpg";
var KIDS_ROBE_IMAGE = "/images/kids_silk_robe_1791665131170.jpg";
var KIDS_COTTON_IMAGE = "/images/kids_cotton_sleepwear_1791665157210.jpg";
var INITIAL_CATEGORIES = [
  {
    id: "cat-night-dresses",
    slug: "night-dresses",
    nameEn: "Night Dresses",
    nameAr: "\u0641\u0633\u0627\u062A\u064A\u0646 \u0627\u0644\u0646\u0648\u0645",
    descriptionEn: "Sensual slips and floor-length gowns in gentle silk and satin fabrics.",
    descriptionAr: "\u0641\u0633\u0627\u062A\u064A\u0646 \u0646\u0648\u0645 \u0627\u0646\u0633\u064A\u0627\u0628\u064A\u0629 \u0648\u062A\u0635\u0627\u0645\u064A\u0645 \u0646\u0627\u0639\u0645\u0629 \u0645\u0646 \u0627\u0644\u062D\u0631\u064A\u0631 \u0648\u0627\u0644\u0633\u0627\u062A\u0627\u0646 \u0627\u0644\u0641\u0627\u062E\u0631.",
    image: ROSE_SATIN_IMAGE,
    active: true,
    displayOrder: 1
  },
  {
    id: "cat-pajama-sets",
    slug: "pajama-sets",
    nameEn: "Pajama Sets",
    nameAr: "\u0623\u0637\u0642\u0645 \u0627\u0644\u0628\u064A\u062C\u0627\u0645\u0627\u062A",
    descriptionEn: "Tailored button-down pajama sets with piped edges and relaxed trousers.",
    descriptionAr: "\u0623\u0637\u0642\u0645 \u0628\u064A\u062C\u0627\u0645\u0627\u062A \u0643\u0644\u0627\u0633\u064A\u0643\u064A\u0629 \u0628\u0623\u0632\u0631\u0627\u0631 \u0648\u062D\u0648\u0627\u0641 \u0623\u0646\u064A\u0642\u0629 \u0645\u0639 \u0628\u0646\u0637\u0627\u0644 \u0645\u0631\u064A\u062D.",
    image: SILK_PJ_IMAGE,
    active: true,
    displayOrder: 2
  },
  {
    id: "cat-robes",
    slug: "robes",
    nameEn: "Robes & Kimonos",
    nameAr: "\u0627\u0644\u0623\u0631\u0648\u0627\u0628 \u0648\u0627\u0644\u0643\u064A\u0645\u0648\u0646\u0648",
    descriptionEn: "Flowing morning robes adorned with delicate French eyelash lace.",
    descriptionAr: "\u0623\u0631\u0648\u0627\u0628 \u0635\u0628\u0627\u062D\u064A\u0629 \u0641\u0636\u0641\u0627\u0636\u0629 \u0645\u0632\u062F\u0627\u0646\u0629 \u0628\u0627\u0644\u062F\u0627\u0646\u062A\u064A\u0644 \u0627\u0644\u0641\u0631\u0646\u0633\u064A \u0627\u0644\u0646\u0627\u0639\u0645.",
    image: LACE_ROBE_IMAGE,
    active: true,
    displayOrder: 3
  },
  {
    id: "cat-silk-nightwear",
    slug: "silk-nightwear",
    nameEn: "Pure Silk Collection",
    nameAr: "\u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u062D\u0631\u064A\u0631 \u0627\u0644\u0637\u0628\u064A\u0639\u064A",
    descriptionEn: "100% Grade-6A Mulberry silk pieces designed for skin rejuvenation.",
    descriptionAr: "\u0642\u0637\u0639 \u0645\u0635\u0646\u0648\u0639\u0629 \u0645\u0646 \u062D\u0631\u064A\u0631 \u0627\u0644\u062A\u0648\u062A \u0627\u0644\u0637\u0628\u064A\u0639\u064A \u0661\u0660\u0660\u066A \u0644\u0646\u0639\u0648\u0645\u0629 \u0641\u0627\u0626\u0642\u0629 \u0637\u0648\u0627\u0644 \u0627\u0644\u0644\u064A\u0644.",
    image: HERO_IMAGE,
    active: true,
    displayOrder: 4
  },
  {
    id: "cat-bridal",
    slug: "bridal-nightwear",
    nameEn: "Bridal Nightwear",
    nameAr: "\u062A\u0634\u0643\u064A\u0644\u0629 \u0627\u0644\u0639\u0631\u0627\u0626\u0633",
    descriptionEn: "Ethereal ivory creations crafted for weddings, honeymoons, and celebrations.",
    descriptionAr: "\u062A\u0635\u0627\u0645\u064A\u0645 \u0628\u0644\u0648\u0646 \u0627\u0644\u0639\u0627\u062C \u0627\u0644\u0641\u0627\u062A\u0646 \u0645\u0635\u0645\u0645\u0629 \u0644\u0644\u064A\u0627\u0644\u064A \u0627\u0644\u0632\u0641\u0627\u0641 \u0648\u0634\u0647\u0631 \u0627\u0644\u0639\u0633\u0644.",
    image: LACE_ROBE_IMAGE,
    active: true,
    displayOrder: 5
  },
  {
    id: "cat-sleep-sets",
    slug: "sleep-sets",
    nameEn: "Sleep & Cami Sets",
    nameAr: "\u0623\u0637\u0642\u0645 \u0627\u0644\u0643\u0627\u0645\u064A \u0648\u0627\u0644\u0631\u0627\u062D\u0629",
    descriptionEn: "Delicate camisoles paired with French-cut tap shorts for warm Bahrain evenings.",
    descriptionAr: "\u0642\u0645\u0635\u0627\u0646 \u0643\u0627\u0645\u064A \u062D\u0631\u064A\u0631\u064A\u0629 \u0645\u0639 \u0634\u0648\u0631\u062A\u0627\u062A \u0642\u0635\u064A\u0631\u0629 \u0645\u062B\u0627\u0644\u064A\u0629 \u0644\u0623\u062C\u0648\u0627\u0621 \u0627\u0644\u0628\u062D\u0631\u064A\u0646 \u0627\u0644\u062F\u0627\u0641\u0626\u0629.",
    image: ROSE_SATIN_IMAGE,
    active: true,
    displayOrder: 6
  },
  {
    id: "cat-kids-sleepwear",
    slug: "kids-collection",
    nameEn: "Curated Kids Collection",
    nameAr: "\u062A\u0634\u0643\u064A\u0644\u0629 \u0627\u0644\u0623\u0637\u0641\u0627\u0644 \u0627\u0644\u0641\u0627\u062E\u0631\u0629",
    descriptionEn: "Ultra-gentle pure silk & organic pima cotton bedtime sleepwear thoughtfully categorized for ages 3 to 12.",
    descriptionAr: "\u0645\u0644\u0627\u0628\u0633 \u0646\u0648\u0645 \u0641\u0627\u062E\u0631\u0629 \u0641\u0627\u0626\u0642\u0629 \u0627\u0644\u0646\u0639\u0648\u0645\u0629 \u0645\u0646 \u0627\u0644\u062D\u0631\u064A\u0631 \u0627\u0644\u0637\u0628\u064A\u0639\u064A \u0648\u0627\u0644\u0642\u0637\u0646 \u0627\u0644\u0639\u0636\u0648\u064A \u0645\u0642\u0633\u0645\u0629 \u0628\u062F\u0642\u0629 \u0644\u0644\u0623\u0639\u0645\u0627\u0631 \u0645\u0646 \u0663 \u0625\u0644\u0649 \u0661\u0662 \u0633\u0646\u0629.",
    image: KIDS_COTTON_IMAGE,
    active: true,
    displayOrder: 7
  }
];
var INITIAL_PRODUCTS = [
  {
    id: "prod-001",
    sku: "BDS-SLK-01",
    nameEn: "Royal Mulberry Silk Pajama Set",
    nameAr: "\u0637\u0642\u0645 \u0628\u064A\u062C\u0627\u0645\u0629 \u062D\u0631\u064A\u0631 \u0627\u0644\u062A\u0648\u062A \u0627\u0644\u0645\u0644\u0643\u064A",
    descriptionEn: "Indulge in pure luxury with our signature 22-momme 100% Mulberry silk pajama set. Finished with hand-stitched piping and lustrous mother-of-pearl buttons for sublime restful evenings.",
    descriptionAr: "\u0627\u0633\u062A\u0645\u062A\u0639\u064A \u0628\u0627\u0644\u0631\u0641\u0627\u0647\u064A\u0629 \u0627\u0644\u0645\u0637\u0644\u0642\u0629 \u0645\u0639 \u0637\u0642\u0645 \u0627\u0644\u0628\u064A\u062C\u0627\u0645\u0629 \u0627\u0644\u0623\u064A\u0642\u0648\u0646\u064A \u0627\u0644\u0645\u0635\u0646\u0648\u0639 \u0645\u0646 \u062D\u0631\u064A\u0631 \u0627\u0644\u062A\u0648\u062A \u0627\u0644\u0637\u0628\u064A\u0639\u064A \u0661\u0660\u0660\u066A \u0639\u064A\u0627\u0631 \u0662\u0662 \u0645\u0648\u0645\u064A\u0647. \u0645\u0632\u064A\u0646 \u0628\u062A\u0637\u0631\u064A\u0632\u0627\u062A \u064A\u062F\u0648\u064A\u0629 \u0648\u0623\u0632\u0631\u0627\u0631 \u0635\u062F\u0641\u064A\u0629 \u0644\u0644\u064A\u0627\u0644\u064D \u062D\u0627\u0644\u0645\u0629.",
    categoryId: "cat-pajama-sets",
    categoryNameEn: "Pajama Sets",
    categoryNameAr: "\u0623\u0637\u0642\u0645 \u0627\u0644\u0628\u064A\u062C\u0627\u0645\u0627\u062A",
    price: 38.5,
    salePrice: 32.5,
    currency: "BHD",
    images: [SILK_PJ_IMAGE, HERO_IMAGE],
    variants: [
      { size: "XS", colorNameEn: "Champagne Blush", colorNameAr: "\u0648\u0631\u062F\u064A \u0634\u0627\u0645\u0628\u0627\u0646\u064A\u0627", colorHex: "#E8D3C6", stock: 4, sku: "BDS-SLK-01-XS-CH" },
      { size: "S", colorNameEn: "Champagne Blush", colorNameAr: "\u0648\u0631\u062F\u064A \u0634\u0627\u0645\u0628\u0627\u0646\u064A\u0627", colorHex: "#E8D3C6", stock: 8, sku: "BDS-SLK-01-S-CH" },
      { size: "M", colorNameEn: "Champagne Blush", colorNameAr: "\u0648\u0631\u062F\u064A \u0634\u0627\u0645\u0628\u0627\u0646\u064A\u0627", colorHex: "#E8D3C6", stock: 12, sku: "BDS-SLK-01-M-CH" },
      { size: "L", colorNameEn: "Champagne Blush", colorNameAr: "\u0648\u0631\u062F\u064A \u0634\u0627\u0645\u0628\u0627\u0646\u064A\u0627", colorHex: "#E8D3C6", stock: 6, sku: "BDS-SLK-01-L-CH" },
      { size: "XL", colorNameEn: "Champagne Blush", colorNameAr: "\u0648\u0631\u062F\u064A \u0634\u0627\u0645\u0628\u0627\u0646\u064A\u0627", colorHex: "#E8D3C6", stock: 3, sku: "BDS-SLK-01-XL-CH" },
      { size: "S", colorNameEn: "Midnight Noir", colorNameAr: "\u0623\u0633\u0648\u062F \u0644\u064A\u0644\u064A", colorHex: "#1C1917", stock: 5, sku: "BDS-SLK-01-S-BK" },
      { size: "M", colorNameEn: "Midnight Noir", colorNameAr: "\u0623\u0633\u0648\u062F \u0644\u064A\u0644\u064A", colorHex: "#1C1917", stock: 7, sku: "BDS-SLK-01-M-BK" }
    ],
    materialEn: "100% Grade-6A Mulberry Silk (22 Momme)",
    materialAr: "\u062D\u0631\u064A\u0631 \u0627\u0644\u062A\u0648\u062A \u0627\u0644\u0637\u0628\u064A\u0639\u064A \u0661\u0660\u0660\u066A \u062F\u0631\u062C\u0629 6A (\u0648\u0632\u0646 \u0662\u0662 \u0645\u0648\u0645\u064A\u0647)",
    careInstructionsEn: "Dry clean or gentle hand wash in cold water with silk detergent. Line dry in shade.",
    careInstructionsAr: "\u063A\u0633\u064A\u0644 \u062C\u0627\u0641 \u0623\u0648 \u063A\u0633\u064A\u0644 \u064A\u062F\u0648\u064A \u0628\u0645\u0627\u0621 \u0628\u0627\u0631\u062F \u0648\u0645\u0646\u0638\u0641 \u0645\u062E\u0635\u0635 \u0644\u0644\u062D\u0631\u064A\u0631. \u064A\u062C\u0641\u0641 \u0641\u064A \u0627\u0644\u0638\u0644 \u0628\u0639\u064A\u062F\u0627\u064B \u0639\u0646 \u0627\u0644\u0634\u0645\u0633.",
    tags: ["Silk", "Bestseller", "Luxury", "Classic"],
    featured: true,
    bestSeller: true,
    newArrival: false,
    active: true,
    rating: 4.9,
    reviewCount: 38,
    createdAt: "2026-01-15T10:00:00Z"
  },
  {
    id: "prod-002",
    sku: "BDS-DRS-02",
    nameEn: "Silky Rose French Lace Nightdress",
    nameAr: "\u0642\u0645\u064A\u0635 \u0646\u0648\u0645 \u0633\u0627\u062A\u0627\u0646 \u0648\u0631\u062F\u064A \u0628\u062D\u0627\u0634\u064A\u0629 \u0627\u0644\u062F\u0627\u0646\u062A\u064A\u0644",
    descriptionEn: "An ethereal bias-cut slip nightdress spun from liquid satin in a romantic rose tint, bordered along the neckline and hem with delicate Chantilly lace.",
    descriptionAr: "\u0642\u0645\u064A\u0635 \u0646\u0648\u0645 \u0646\u0627\u0639\u0645 \u0628\u0642\u0635\u0629 \u0627\u0646\u0633\u064A\u0627\u0628\u064A\u0629 \u0645\u0646 \u0627\u0644\u0633\u0627\u062A\u0627\u0646 \u0628\u0644\u0648\u0646 \u0627\u0644\u0648\u0631\u062F \u0627\u0644\u0631\u0648\u0645\u0627\u0646\u0633\u064A\u060C \u0645\u0632\u062F\u0627\u0646 \u0639\u0644\u0649 \u0627\u0644\u064A\u0627\u0642\u0629 \u0648\u062D\u0627\u0634\u064A\u0629 \u0627\u0644\u0641\u0633\u062A\u0627\u0646 \u0628\u062F\u0627\u0646\u062A\u064A\u0644 \u0634\u0627\u0646\u062A\u064A\u0644\u064A \u0627\u0644\u0641\u0631\u0646\u0633\u064A \u0627\u0644\u0641\u0627\u062E\u0631.",
    categoryId: "cat-night-dresses",
    categoryNameEn: "Night Dresses",
    categoryNameAr: "\u0641\u0633\u0627\u062A\u064A\u0646 \u0627\u0644\u0646\u0648\u0645",
    price: 24,
    salePrice: 19.5,
    currency: "BHD",
    images: [ROSE_SATIN_IMAGE, HERO_IMAGE],
    variants: [
      { size: "XS", colorNameEn: "Dusty Rose", colorNameAr: "\u0648\u0631\u062F\u064A \u0647\u0627\u062F\u0626", colorHex: "#C58C85", stock: 3, sku: "BDS-DRS-02-XS-RS" },
      { size: "S", colorNameEn: "Dusty Rose", colorNameAr: "\u0648\u0631\u062F\u064A \u0647\u0627\u062F\u0626", colorHex: "#C58C85", stock: 9, sku: "BDS-DRS-02-S-RS" },
      { size: "M", colorNameEn: "Dusty Rose", colorNameAr: "\u0648\u0631\u062F\u064A \u0647\u0627\u062F\u0626", colorHex: "#C58C85", stock: 10, sku: "BDS-DRS-02-M-RS" },
      { size: "L", colorNameEn: "Dusty Rose", colorNameAr: "\u0648\u0631\u062F\u064A \u0647\u0627\u062F\u0626", colorHex: "#C58C85", stock: 5, sku: "BDS-DRS-02-L-RS" },
      { size: "S", colorNameEn: "Burgundy Velvet", colorNameAr: "\u0639\u0646\u0627\u0628\u064A \u0645\u062E\u0645\u0644\u064A", colorHex: "#581825", stock: 4, sku: "BDS-DRS-02-S-BG" }
    ],
    materialEn: "Ultra-Fine Satin with French Chantilly Lace",
    materialAr: "\u0633\u0627\u062A\u0627\u0646 \u0641\u0627\u0626\u0642 \u0627\u0644\u0646\u0639\u0648\u0645\u0629 \u0645\u0639 \u062F\u0627\u0646\u062A\u064A\u0644 \u0634\u0627\u0646\u062A\u064A\u0644\u064A \u0641\u0631\u0646\u0633\u064A",
    careInstructionsEn: "Hand wash cold or place in garment bag on delicate cycle. Low iron reverse side.",
    careInstructionsAr: "\u063A\u0633\u064A\u0644 \u064A\u062F\u0648\u064A \u0628\u0645\u0627\u0621 \u0628\u0627\u0631\u062F \u0623\u0648 \u062F\u0627\u062E\u0644 \u0643\u064A\u0633 \u0627\u0644\u063A\u0633\u064A\u0644 \u0639\u0644\u0649 \u062F\u0648\u0631\u0629 \u062E\u0641\u064A\u0641\u0629. \u0643\u064A \u062E\u0641\u064A\u0641 \u0645\u0646 \u0627\u0644\u062C\u0647\u0629 \u0627\u0644\u062E\u0644\u0641\u064A\u0629.",
    tags: ["Lace", "Nightdress", "Romantic", "Sale"],
    featured: true,
    newArrival: true,
    bestSeller: false,
    active: true,
    rating: 4.8,
    reviewCount: 24,
    createdAt: "2026-02-01T12:00:00Z"
  },
  {
    id: "prod-003",
    sku: "BDS-ROB-03",
    nameEn: "Ethereal Ivory Bridal Lace Robe",
    nameAr: "\u0631\u0648\u0628 \u0627\u0644\u0639\u0631\u0627\u0626\u0633 \u0627\u0644\u0639\u0627\u062C\u064A \u0628\u0627\u0644\u062F\u0627\u0646\u062A\u064A\u0644 \u0627\u0644\u0646\u0627\u0639\u0645",
    descriptionEn: "The quintessential bridal morning robe in lustrous ivory satin, featuring scalloped eyelash lace along wide bell sleeves and an elegant detachable waist sash.",
    descriptionAr: "\u0631\u0648\u0628 \u0635\u0628\u0627\u062D\u064A\u0629 \u0627\u0644\u0639\u0631\u0648\u0633 \u0628\u0644\u0648\u0646 \u0627\u0644\u0639\u0627\u062C \u0627\u0644\u0633\u0627\u062D\u0631\u060C \u0645\u0632\u064A\u0646 \u0628\u0623\u0643\u0645\u0627\u0645 \u0648\u0627\u0633\u0639\u0629 \u0628\u062D\u0627\u0634\u064A\u0629 \u062F\u0627\u0646\u062A\u064A\u0644 \u0645\u0637\u0631\u0632\u0629 \u0648\u062D\u0632\u0627\u0645 \u062E\u0635\u0631 \u0645\u0646 \u0627\u0644\u0633\u0627\u062A\u0627\u0646 \u0644\u0645\u0638\u0647\u0631 \u0644\u0627 \u064A\u064F\u0646\u0633\u0649 \u0641\u064A \u064A\u0648\u0645 \u0632\u0641\u0627\u0641\u0643.",
    categoryId: "cat-robes",
    categoryNameEn: "Robes & Kimonos",
    categoryNameAr: "\u0627\u0644\u0623\u0631\u0648\u0627\u0628 \u0648\u0627\u0644\u0643\u064A\u0645\u0648\u0646\u0648",
    price: 34,
    currency: "BHD",
    images: [LACE_ROBE_IMAGE, HERO_IMAGE],
    variants: [
      { size: "S", colorNameEn: "Bridal Ivory", colorNameAr: "\u0639\u0627\u062C\u064A \u0645\u0644\u0643\u064A", colorHex: "#FAF6F0", stock: 6, sku: "BDS-ROB-03-S-IV" },
      { size: "M", colorNameEn: "Bridal Ivory", colorNameAr: "\u0639\u0627\u062C\u064A \u0645\u0644\u0643\u064A", colorHex: "#FAF6F0", stock: 8, sku: "BDS-ROB-03-M-IV" },
      { size: "L", colorNameEn: "Bridal Ivory", colorNameAr: "\u0639\u0627\u062C\u064A \u0645\u0644\u0643\u064A", colorHex: "#FAF6F0", stock: 5, sku: "BDS-ROB-03-L-IV" },
      { size: "Free Size", colorNameEn: "Bridal Ivory", colorNameAr: "\u0639\u0627\u062C\u064A \u0645\u0644\u0643\u064A", colorHex: "#FAF6F0", stock: 12, sku: "BDS-ROB-03-FS-IV" }
    ],
    materialEn: "Heavyweight Matte Satin & French Guipure Lace",
    materialAr: "\u0633\u0627\u062A\u0627\u0646 \u0645\u0637\u0641\u064A \u0641\u0627\u062E\u0631 \u0645\u0639 \u062F\u0627\u0646\u062A\u064A\u0644 \u062C\u064A\u0628\u064A\u0631 \u0641\u0631\u0646\u0633\u064A",
    careInstructionsEn: "Professional dry cleaning strongly recommended to preserve lace structure.",
    careInstructionsAr: "\u064A\u0648\u0635\u0649 \u0628\u0627\u0644\u062A\u0646\u0638\u064A\u0641 \u0627\u0644\u062C\u0627\u0641 \u0644\u0644\u062D\u0641\u0627\u0638 \u0639\u0644\u0649 \u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u062F\u0627\u0646\u062A\u064A\u0644 \u0627\u0644\u062F\u0642\u064A\u0642\u0629.",
    tags: ["Bridal", "Robe", "Lace", "New"],
    featured: true,
    newArrival: true,
    bestSeller: false,
    active: true,
    rating: 5,
    reviewCount: 19,
    createdAt: "2026-02-14T09:30:00Z"
  },
  {
    id: "prod-004",
    sku: "BDS-SLP-04",
    nameEn: "Whisper Satin Camisole & Tap Shorts Set",
    nameAr: "\u0637\u0642\u0645 \u0643\u0627\u0645\u064A \u0648\u0634\u0648\u0631\u062A \u0633\u0627\u062A\u0627\u0646 \u0648\u064A\u0633\u0628\u0631",
    descriptionEn: "A featherlight sleep set featuring an adjustable spaghetti strap cami and flutter-hem shorts. Crafted for balmy Arabian Gulf nights with breezy elegance.",
    descriptionAr: "\u0637\u0642\u0645 \u0646\u0648\u0645 \u062E\u0641\u064A\u0641 \u0644\u0644\u063A\u0627\u064A\u0629 \u064A\u062A\u0636\u0645\u0646 \u0642\u0645\u064A\u0635 \u0643\u0627\u0645\u064A \u0628\u0623\u0634\u0631\u0637\u0629 \u0643\u062A\u0641 \u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u062A\u0639\u062F\u064A\u0644 \u0648\u0634\u0648\u0631\u062A \u0628\u062D\u0648\u0627\u0641 \u0645\u0645\u0648\u062C\u0629. \u0645\u0635\u0645\u0645 \u062E\u0635\u064A\u0635\u0627\u064B \u0644\u0644\u064A\u0627\u0644\u064A \u0627\u0644\u062E\u0644\u064A\u062C \u0627\u0644\u062F\u0627\u0641\u0626\u0629.",
    categoryId: "cat-sleep-sets",
    categoryNameEn: "Sleep & Cami Sets",
    categoryNameAr: "\u0623\u0637\u0642\u0645 \u0627\u0644\u0643\u0627\u0645\u064A \u0648\u0627\u0644\u0631\u0627\u062D\u0629",
    price: 18.5,
    currency: "BHD",
    images: [ROSE_SATIN_IMAGE, SILK_PJ_IMAGE],
    variants: [
      { size: "XS", colorNameEn: "Champagne Gold", colorNameAr: "\u0630\u0647\u0628\u064A \u0634\u0627\u0645\u0628\u0627\u0646\u064A\u0627", colorHex: "#E3CBB3", stock: 4, sku: "BDS-SLP-04-XS-CG" },
      { size: "S", colorNameEn: "Champagne Gold", colorNameAr: "\u0630\u0647\u0628\u064A \u0634\u0627\u0645\u0628\u0627\u0646\u064A\u0627", colorHex: "#E3CBB3", stock: 7, sku: "BDS-SLP-04-S-CG" },
      { size: "M", colorNameEn: "Champagne Gold", colorNameAr: "\u0630\u0647\u0628\u064A \u0634\u0627\u0645\u0628\u0627\u0646\u064A\u0627", colorHex: "#E3CBB3", stock: 9, sku: "BDS-SLP-04-M-CG" },
      { size: "L", colorNameEn: "Champagne Gold", colorNameAr: "\u0630\u0647\u0628\u064A \u0634\u0627\u0645\u0628\u0627\u0646\u064A\u0627", colorHex: "#E3CBB3", stock: 4, sku: "BDS-SLP-04-L-CG" },
      { size: "S", colorNameEn: "Sage Green", colorNameAr: "\u0623\u062E\u0636\u0631 \u0645\u064A\u0631\u0645\u064A\u0629", colorHex: "#8E9A86", stock: 2, sku: "BDS-SLP-04-S-SG" }
    ],
    materialEn: "Breathable Silk-Touch Microfiber Satin",
    materialAr: "\u0633\u0627\u062A\u0627\u0646 \u0645\u064A\u0643\u0631\u0648\u0641\u0627\u064A\u0628\u0631 \u0628\u0644\u0645\u0633\u0629 \u0627\u0644\u062D\u0631\u064A\u0631 \u0627\u0644\u0637\u0628\u064A\u0639\u064A \u0627\u0644\u0646\u0627\u0639\u0645",
    careInstructionsEn: "Machine wash delicate cycle in mesh laundry bag. Hang dry.",
    careInstructionsAr: "\u063A\u0633\u064A\u0644 \u0622\u0644\u064A \u0628\u062F\u0648\u0631\u0629 \u0627\u0644\u0645\u0644\u0627\u0628\u0633 \u0627\u0644\u062D\u0633\u0627\u0633\u0629 \u062F\u0627\u062E\u0644 \u0643\u064A\u0633 \u0642\u0645\u0627\u0634\u064A. \u062A\u062C\u0641\u064A\u0641 \u0628\u0627\u0644\u062A\u0639\u0644\u064A\u0642.",
    tags: ["Cami", "Bestseller", "Summer"],
    featured: false,
    newArrival: false,
    bestSeller: true,
    active: true,
    rating: 4.7,
    reviewCount: 31,
    createdAt: "2026-01-20T14:15:00Z"
  },
  {
    id: "prod-005",
    sku: "BDS-SLK-05",
    nameEn: "Midnight Noir Long Silk Slip Gown",
    nameAr: "\u0641\u0633\u062A\u0627\u0646 \u0646\u0648\u0645 \u0637\u0648\u064A\u0644 \u062D\u0631\u064A\u0631 \u0623\u0633\u0648\u062F \u0644\u064A\u0644\u064A",
    descriptionEn: "A dramatic floor-sweeping silk slip dress cut on the bias to drape effortlessly over natural curves. Includes delicate criss-cross back detailing.",
    descriptionAr: "\u0641\u0633\u062A\u0627\u0646 \u0646\u0648\u0645 \u0637\u0648\u064A\u0644 \u0645\u0641\u0639\u0645 \u0628\u0627\u0644\u0623\u0646\u0648\u062B\u0629 \u0645\u0646 \u0627\u0644\u062D\u0631\u064A\u0631 \u0627\u0644\u0623\u0633\u0648\u062F \u0627\u0644\u062E\u0627\u0644\u0635 \u0628\u0642\u0635\u0629 \u0645\u0627\u0626\u0644\u0629 \u062A\u0646\u0633\u0627\u0628 \u0628\u0646\u0639\u0648\u0645\u0629 \u0645\u0639 \u062A\u0641\u0627\u0635\u064A\u0644 \u0623\u062D\u0632\u0645\u0629 \u062E\u0644\u0641\u064A\u0629 \u0645\u062A\u0642\u0627\u0637\u0639\u0629 \u062C\u0630\u0627\u0628\u0629.",
    categoryId: "cat-silk-nightwear",
    categoryNameEn: "Pure Silk Collection",
    categoryNameAr: "\u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u062D\u0631\u064A\u0631 \u0627\u0644\u0637\u0628\u064A\u0639\u064A",
    price: 42,
    salePrice: 36,
    currency: "BHD",
    images: [HERO_IMAGE, ROSE_SATIN_IMAGE],
    variants: [
      { size: "XS", colorNameEn: "Midnight Noir", colorNameAr: "\u0623\u0633\u0648\u062F \u0644\u064A\u0644\u064A", colorHex: "#18181B", stock: 2, sku: "BDS-SLK-05-XS-BK" },
      { size: "S", colorNameEn: "Midnight Noir", colorNameAr: "\u0623\u0633\u0648\u062F \u0644\u064A\u0644\u064A", colorHex: "#18181B", stock: 5, sku: "BDS-SLK-05-S-BK" },
      { size: "M", colorNameEn: "Midnight Noir", colorNameAr: "\u0623\u0633\u0648\u062F \u0644\u064A\u0644\u064A", colorHex: "#18181B", stock: 6, sku: "BDS-SLK-05-M-BK" },
      { size: "L", colorNameEn: "Midnight Noir", colorNameAr: "\u0623\u0633\u0648\u062F \u0644\u064A\u0644\u064A", colorHex: "#18181B", stock: 3, sku: "BDS-SLK-05-L-BK" }
    ],
    materialEn: "100% Pure Mulberry Silk (19 Momme)",
    materialAr: "\u062D\u0631\u064A\u0631 \u0627\u0644\u062A\u0648\u062A \u0627\u0644\u0637\u0628\u064A\u0639\u064A \u0627\u0644\u062E\u0627\u0644\u0635 \u0661\u0660\u0660\u066A (\u0661\u0669 \u0645\u0648\u0645\u064A\u0647)",
    careInstructionsEn: "Hand wash cold with gentle enzyme-free silk wash. Do not wring.",
    careInstructionsAr: "\u063A\u0633\u064A\u0644 \u064A\u062F\u0648\u064A \u0628\u0645\u0627\u0621 \u0628\u0627\u0631\u062F \u0628\u0645\u0646\u0638\u0641 \u062E\u0641\u064A\u0641 \u062E\u0627\u0635 \u0628\u0627\u0644\u062D\u0631\u064A\u0631 \u0628\u062F\u0648\u0646 \u0639\u0635\u0631.",
    tags: ["Luxury", "Pure Silk", "Sale", "Evening"],
    featured: true,
    newArrival: false,
    bestSeller: false,
    active: true,
    rating: 4.9,
    reviewCount: 16,
    createdAt: "2026-02-05T18:00:00Z"
  },
  {
    id: "prod-006",
    sku: "BDS-PJ-06",
    nameEn: "Blush Pink Short Sleeve PJ Set",
    nameAr: "\u0637\u0642\u0645 \u0628\u064A\u062C\u0627\u0645\u0629 \u0635\u064A\u0641\u064A\u0629 \u0646\u0635\u0641 \u0643\u0645 \u0648\u0631\u062F\u064A \u0641\u0627\u062A\u062D",
    descriptionEn: "Chic short-sleeve collared top with matching cuffed shorts in silky-soft modal satin. The perfect lounge companion for warm Bahrain mornings.",
    descriptionAr: "\u0628\u0644\u0648\u0632\u0629 \u0623\u0646\u064A\u0642\u0629 \u0628\u0646\u0635\u0641 \u0643\u0645 \u0648\u064A\u0627\u0642\u0629 \u0643\u0644\u0627\u0633\u064A\u0643\u064A\u0629 \u0645\u0639 \u0634\u0648\u0631\u062A \u0628\u0623\u0637\u0631\u0627\u0641 \u0645\u0637\u0648\u064A\u0629 \u0645\u0646 \u0642\u0645\u0627\u0634 \u0627\u0644\u0645\u0648\u062F\u0627\u0644 \u0627\u0644\u0633\u0627\u062A\u0627\u0646\u064A \u0641\u0627\u0626\u0642 \u0627\u0644\u0646\u0639\u0648\u0645\u0629 \u0644\u0635\u0628\u0627\u062D\u0627\u062A \u0628\u062D\u0631\u064A\u0646\u064A\u0629 \u0647\u0627\u062F\u0626\u0629.",
    categoryId: "cat-pajama-sets",
    categoryNameEn: "Pajama Sets",
    categoryNameAr: "\u0623\u0637\u0642\u0645 \u0627\u0644\u0628\u064A\u062C\u0627\u0645\u0627\u062A",
    price: 22.5,
    currency: "BHD",
    images: [SILK_PJ_IMAGE, ROSE_SATIN_IMAGE],
    variants: [
      { size: "S", colorNameEn: "Blush Petal", colorNameAr: "\u0648\u0631\u062F\u064A \u0628\u062A\u0644\u0627\u062A", colorHex: "#F2D3D0", stock: 8, sku: "BDS-PJ-06-S-BP" },
      { size: "M", colorNameEn: "Blush Petal", colorNameAr: "\u0648\u0631\u062F\u064A \u0628\u062A\u0644\u0627\u062A", colorHex: "#F2D3D0", stock: 11, sku: "BDS-PJ-06-M-BP" },
      { size: "L", colorNameEn: "Blush Petal", colorNameAr: "\u0648\u0631\u062F\u064A \u0628\u062A\u0644\u0627\u062A", colorHex: "#F2D3D0", stock: 6, sku: "BDS-PJ-06-L-BP" },
      { size: "XL", colorNameEn: "Blush Petal", colorNameAr: "\u0648\u0631\u062F\u064A \u0628\u062A\u0644\u0627\u062A", colorHex: "#F2D3D0", stock: 4, sku: "BDS-PJ-06-XL-BP" }
    ],
    materialEn: "95% Modal Cotton, 5% Spandex Silky Blend",
    materialAr: "\u0669\u0665\u066A \u0642\u0637\u0646 \u0645\u0648\u062F\u0627\u0644\u060C \u0665\u066A \u0633\u0628\u0627\u0646\u062F\u0643\u0633 \u0646\u0627\u0639\u0645",
    careInstructionsEn: "Machine wash warm, tumble dry low or hang dry.",
    careInstructionsAr: "\u063A\u0633\u064A\u0644 \u0622\u0644\u064A \u0628\u0645\u0627\u0621 \u0641\u0627\u062A\u0631 \u0648\u062A\u062C\u0641\u064A\u0641 \u0628\u062F\u0631\u062C\u0629 \u062D\u0631\u0627\u0631\u0629 \u0645\u0646\u062E\u0641\u0636\u0629.",
    tags: ["Shorts", "Summer", "New"],
    featured: false,
    newArrival: true,
    bestSeller: true,
    active: true,
    rating: 4.9,
    reviewCount: 42,
    createdAt: "2026-02-20T11:00:00Z"
  },
  {
    id: "prod-007",
    sku: "BDS-ROB-07",
    nameEn: "Burgundy Velvet Trim Silk Kimono",
    nameAr: "\u0643\u064A\u0645\u0648\u0646\u0648 \u062D\u0631\u064A\u0631\u064A \u0628\u062D\u0648\u0627\u0641 \u0645\u062E\u0645\u0644\u064A\u0629 \u0639\u0646\u0627\u0628\u064A\u0629",
    descriptionEn: "Opulent silk kimono robe featuring contrasting rich wine velvet trim along the lapel and cuffs. Complete with deep interior pockets and tie belt.",
    descriptionAr: "\u0631\u0648\u0628 \u0643\u064A\u0645\u0648\u0646\u0648 \u062D\u0631\u064A\u0631\u064A \u0641\u062E\u0645 \u0645\u0632\u064A\u0646 \u0628\u062D\u0648\u0627\u0641 \u0645\u062E\u0645\u0644\u064A\u0629 \u0628\u0644\u0648\u0646 \u0627\u0644\u0639\u0646\u0627\u0628\u064A \u0627\u0644\u062F\u0627\u0643\u0646 \u0639\u0644\u0649 \u0627\u0644\u064A\u0627\u0642\u0629 \u0648\u0627\u0644\u0623\u0643\u0645\u0627\u0645 \u0645\u0639 \u062C\u064A\u0648\u0628 \u062F\u0627\u062E\u0644\u064A\u0629 \u0648\u062D\u0632\u0627\u0645 \u0623\u0646\u064A\u0642.",
    categoryId: "cat-robes",
    categoryNameEn: "Robes & Kimonos",
    categoryNameAr: "\u0627\u0644\u0623\u0631\u0648\u0627\u0628 \u0648\u0627\u0644\u0643\u064A\u0645\u0648\u0646\u0648",
    price: 36.5,
    currency: "BHD",
    images: [LACE_ROBE_IMAGE, HERO_IMAGE],
    variants: [
      { size: "S", colorNameEn: "Deep Burgundy", colorNameAr: "\u0639\u0646\u0627\u0628\u064A \u062F\u0627\u0643\u0646", colorHex: "#4A1521", stock: 4, sku: "BDS-ROB-07-S-BG" },
      { size: "M", colorNameEn: "Deep Burgundy", colorNameAr: "\u0639\u0646\u0627\u0628\u064A \u062F\u0627\u0643\u0646", colorHex: "#4A1521", stock: 5, sku: "BDS-ROB-07-M-BG" },
      { size: "L", colorNameEn: "Deep Burgundy", colorNameAr: "\u0639\u0646\u0627\u0628\u064A \u062F\u0627\u0643\u0646", colorHex: "#4A1521", stock: 3, sku: "BDS-ROB-07-L-BG" }
    ],
    materialEn: "Heavy Mulberry Silk with Silk-Velvet Details",
    materialAr: "\u062D\u0631\u064A\u0631 \u0627\u0644\u062A\u0648\u062A \u0627\u0644\u0637\u0628\u064A\u0639\u064A \u0645\u0639 \u0644\u0645\u0633\u0627\u062A \u0645\u062E\u0645\u0644 \u062D\u0631\u064A\u0631\u064A",
    careInstructionsEn: "Dry clean only to maintain rich velvet texture.",
    careInstructionsAr: "\u062A\u0646\u0638\u064A\u0641 \u062C\u0627\u0641 \u0641\u0642\u0637 \u0644\u0644\u062D\u0641\u0627\u0638 \u0639\u0644\u0649 \u0631\u0648\u0646\u0642 \u0627\u0644\u0645\u062E\u0645\u0644.",
    tags: ["Luxury", "Kimono", "Velvet"],
    featured: true,
    newArrival: false,
    bestSeller: false,
    active: true,
    rating: 5,
    reviewCount: 11,
    createdAt: "2026-01-10T09:00:00Z"
  },
  {
    id: "prod-008",
    sku: "BDS-DRS-08",
    nameEn: "Oyster Pearl Embroidered Chemise",
    nameAr: "\u0642\u0645\u064A\u0635 \u0646\u0648\u0645 \u0645\u0637\u0631\u0632 \u0628\u0644\u0648\u0646 \u0644\u0624\u0644\u0624 \u0627\u0644\u0645\u062D\u0627\u0631",
    descriptionEn: "Delicate mini chemise crafted in luminous pearl satin with hand-embroidered floral motifs across the sweetheart bodice.",
    descriptionAr: "\u0642\u0645\u064A\u0635 \u0646\u0648\u0645 \u0642\u0635\u064A\u0631 \u0628\u0642\u0645\u0627\u0634 \u0627\u0644\u0633\u0627\u062A\u0627\u0646 \u0627\u0644\u0644\u0624\u0644\u0624\u064A \u0627\u0644\u0644\u0627\u0645\u0639 \u0645\u0632\u064A\u0646 \u0628\u062A\u0637\u0631\u064A\u0632\u0627\u062A \u0632\u0647\u0631\u064A\u0629 \u064A\u062F\u0648\u064A\u0629 \u0631\u0642\u064A\u0642\u0629 \u0639\u0644\u0649 \u0627\u0644\u0635\u062F\u0631.",
    categoryId: "cat-night-dresses",
    categoryNameEn: "Night Dresses",
    categoryNameAr: "\u0641\u0633\u0627\u062A\u064A\u0646 \u0627\u0644\u0646\u0648\u0645",
    price: 21,
    salePrice: 17.5,
    currency: "BHD",
    images: [ROSE_SATIN_IMAGE, LACE_ROBE_IMAGE],
    variants: [
      { size: "XS", colorNameEn: "Oyster Pearl", colorNameAr: "\u0644\u0624\u0644\u0624\u064A", colorHex: "#F5F2EB", stock: 5, sku: "BDS-DRS-08-XS-OP" },
      { size: "S", colorNameEn: "Oyster Pearl", colorNameAr: "\u0644\u0624\u0644\u0624\u064A", colorHex: "#F5F2EB", stock: 7, sku: "BDS-DRS-08-S-OP" },
      { size: "M", colorNameEn: "Oyster Pearl", colorNameAr: "\u0644\u0624\u0644\u0624\u064A", colorHex: "#F5F2EB", stock: 6, sku: "BDS-DRS-08-M-OP" },
      { size: "L", colorNameEn: "Oyster Pearl", colorNameAr: "\u0644\u0624\u0644\u0624\u064A", colorHex: "#F5F2EB", stock: 2, sku: "BDS-DRS-08-L-OP" }
    ],
    materialEn: "Lustrous Micro-Satin with Cotton Threadwork",
    materialAr: "\u0645\u064A\u0643\u0631\u0648 \u0633\u0627\u062A\u0627\u0646 \u0644\u0627\u0645\u0639 \u0645\u0639 \u062E\u064A\u0648\u0637 \u0642\u0637\u0646\u064A\u0629 \u0645\u0637\u0631\u0632\u0629",
    careInstructionsEn: "Hand wash gently. Iron on low setting.",
    careInstructionsAr: "\u063A\u0633\u064A\u0644 \u064A\u062F\u0648\u064A \u062E\u0641\u064A\u0641 \u0645\u0639 \u0627\u0644\u0643\u064A \u0639\u0644\u0649 \u062F\u0631\u062C\u0629 \u062D\u0631\u0627\u0631\u0629 \u062E\u0641\u064A\u0641\u0629.",
    tags: ["Chemise", "Sale", "Embroidery"],
    featured: false,
    newArrival: false,
    bestSeller: true,
    active: true,
    rating: 4.8,
    reviewCount: 29,
    createdAt: "2026-02-18T16:20:00Z"
  },
  // --- CURATED KIDS COLLECTION (Ages 3-5, 5-7, 8-9, 10-12) ---
  {
    id: "prod-kid-01",
    sku: "BDS-KID-01",
    nameEn: "Little Cloud Organic Cotton Pajama Set (Ages 3\u20135)",
    nameAr: "\u0637\u0642\u0645 \u0628\u064A\u062C\u0627\u0645\u0629 \u0627\u0644\u063A\u064A\u0645\u0629 \u0642\u0637\u0646 \u0639\u0636\u0648\u064A \u0644\u0644\u0623\u0637\u0641\u0627\u0644 (\u0663 - \u0665 \u0633\u0646\u0648\u0627\u062A)",
    descriptionEn: "Feather-soft OEKO-TEX certified organic pima cotton designed specifically for tender toddler skin. Features scratch-free tagless seams and gentle covered elastic waistband.",
    descriptionAr: "\u0642\u0637\u0646 \u0628\u064A\u0645\u0627 \u0639\u0636\u0648\u064A \u0645\u0639\u062A\u0645\u062F \u0641\u0627\u0626\u0642 \u0627\u0644\u0646\u0639\u0648\u0645\u0629 \u0645\u0635\u0645\u0645 \u062E\u0635\u064A\u0635\u0627\u064B \u0644\u0628\u0634\u0631\u0629 \u0627\u0644\u0623\u0637\u0641\u0627\u0644 \u0627\u0644\u062D\u0633\u0627\u0633\u0629\u060C \u0628\u062F\u0631\u0632\u0627\u062A \u0628\u062F\u0648\u0646 \u0645\u0644\u0635\u0642\u0627\u062A \u0645\u0632\u0639\u062C\u0629 \u0648\u0645\u0637\u0627\u0637 \u0642\u0637\u0646\u064A \u0645\u0631\u064A\u062D.",
    categoryId: "cat-kids-sleepwear",
    categoryNameEn: "Curated Kids Collection",
    categoryNameAr: "\u062A\u0634\u0643\u064A\u0644\u0629 \u0627\u0644\u0623\u0637\u0641\u0627\u0644 \u0627\u0644\u0641\u0627\u062E\u0631\u0629",
    price: 16.5,
    salePrice: 14,
    currency: "BHD",
    images: [KIDS_PJ_IMAGE, KIDS_COTTON_IMAGE],
    variants: [
      { size: "3-4Y", colorNameEn: "Pastel Blush", colorNameAr: "\u0648\u0631\u062F\u064A \u0647\u0627\u062F\u0626", colorHex: "#F6D5CE", stock: 8, sku: "BDS-KID-01-34-PB" },
      { size: "4-5Y", colorNameEn: "Pastel Blush", colorNameAr: "\u0648\u0631\u062F\u064A \u0647\u0627\u062F\u0626", colorHex: "#F6D5CE", stock: 9, sku: "BDS-KID-01-45-PB" },
      { size: "3-4Y", colorNameEn: "Cloud Cream", colorNameAr: "\u0643\u0631\u064A\u0645\u064A \u0646\u0627\u0635\u0639", colorHex: "#FFFDF9", stock: 6, sku: "BDS-KID-01-34-CC" },
      { size: "4-5Y", colorNameEn: "Cloud Cream", colorNameAr: "\u0643\u0631\u064A\u0645\u064A \u0646\u0627\u0635\u0639", colorHex: "#FFFDF9", stock: 7, sku: "BDS-KID-01-45-CC" }
    ],
    materialEn: "100% GOTS-Certified Organic Pima Cotton",
    materialAr: "\u0642\u0637\u0646 \u0628\u064A\u0645\u0627 \u0639\u0636\u0648\u064A \u0645\u0639\u062A\u0645\u062F \u0661\u0660\u0660\u066A \u0641\u0627\u0626\u0642 \u0627\u0644\u0646\u0639\u0648\u0645\u0629",
    careInstructionsEn: "Machine wash delicate cold. Tumble dry gentle low or line dry.",
    careInstructionsAr: "\u063A\u0633\u064A\u0644 \u0622\u0644\u064A \u0628\u0645\u0627\u0621 \u0628\u0627\u0631\u062F \u0628\u062F\u0648\u0631\u0629 \u0627\u0644\u0645\u0644\u0627\u0628\u0633 \u0627\u0644\u062D\u0633\u0627\u0633\u0629 \u0648\u062A\u062C\u0641\u064A\u0641 \u062E\u0641\u064A\u0641.",
    tags: ["Kids", "Ages 3-5", "Organic Cotton", "Bestseller"],
    featured: true,
    newArrival: true,
    bestSeller: true,
    active: true,
    rating: 4.9,
    reviewCount: 38,
    createdAt: "2026-02-25T10:00:00Z",
    isKids: true,
    ageGroup: "3-5"
  },
  {
    id: "prod-kid-02",
    sku: "BDS-KID-02",
    nameEn: "Petite Mulberry Silk Toddler Sleep Romper (Ages 3\u20135)",
    nameAr: "\u0631\u0648\u0645\u0628\u0631 \u0646\u0648\u0645 \u062D\u0631\u064A\u0631\u064A \u0646\u0627\u0639\u0645 \u0644\u0644\u0635\u063A\u0627\u0631 (\u0663 - \u0665 \u0633\u0646\u0648\u0627\u062A)",
    descriptionEn: "19-Momme pure mulberry silk one-piece with hypoallergenic snaps for easy bedtime changes. Naturally thermoregulating for cool nights in Bahrain.",
    descriptionAr: "\u0631\u0648\u0645\u0628\u0631 \u0645\u0646 \u062D\u0631\u064A\u0631 \u0627\u0644\u062A\u0648\u062A \u0627\u0644\u0637\u0628\u064A\u0639\u064A \u0627\u0644\u062E\u0627\u0644\u0635 \u0639\u064A\u0627\u0631 \u0661\u0669 \u0645\u0648\u0645\u064A\u0647 \u0628\u0623\u0632\u0631\u0627\u0631 \u0643\u0628\u0633 \u0633\u0647\u0644\u0629 \u0644\u062A\u0628\u062F\u064A\u0644 \u0645\u0631\u064A\u062D\u060C \u064A\u0633\u0627\u0639\u062F \u0641\u064A \u062A\u0646\u0638\u064A\u0645 \u062D\u0631\u0627\u0631\u0629 \u0627\u0644\u062C\u0633\u0645 \u0623\u062B\u0646\u0627\u0621 \u0627\u0644\u0646\u0648\u0645.",
    categoryId: "cat-kids-sleepwear",
    categoryNameEn: "Curated Kids Collection",
    categoryNameAr: "\u062A\u0634\u0643\u064A\u0644\u0629 \u0627\u0644\u0623\u0637\u0641\u0627\u0644 \u0627\u0644\u0641\u0627\u062E\u0631\u0629",
    price: 24,
    currency: "BHD",
    images: [KIDS_COTTON_IMAGE, KIDS_PJ_IMAGE],
    variants: [
      { size: "3-4Y", colorNameEn: "Sage Mint", colorNameAr: "\u0623\u062E\u0636\u0631 \u0646\u0639\u0646\u0627\u0639\u064A", colorHex: "#C5D8C7", stock: 5, sku: "BDS-KID-02-34-SM" },
      { size: "4-5Y", colorNameEn: "Sage Mint", colorNameAr: "\u0623\u062E\u0636\u0631 \u0646\u0639\u0646\u0627\u0639\u064A", colorHex: "#C5D8C7", stock: 6, sku: "BDS-KID-02-45-SM" }
    ],
    materialEn: "100% Grade-6A Mulberry Silk & Gentle Cotton Lining",
    materialAr: "\u062D\u0631\u064A\u0631 \u0627\u0644\u062A\u0648\u062A \u0627\u0644\u0637\u0628\u064A\u0639\u064A \u0661\u0660\u0660\u066A \u0645\u0639 \u0628\u0637\u0627\u0646\u0629 \u0642\u0637\u0646\u064A\u0629 \u0644\u0637\u064A\u0641\u0629",
    careInstructionsEn: "Gentle hand wash or delicate cycle inside silk wash bag.",
    careInstructionsAr: "\u063A\u0633\u064A\u0644 \u064A\u062F\u0648\u064A \u062E\u0641\u064A\u0641 \u0623\u0648 \u063A\u0633\u064A\u0644 \u0622\u0644\u064A \u0628\u062F\u0648\u0631\u0629 \u0627\u0644\u062D\u0631\u064A\u0631 \u062F\u0627\u062E\u0644 \u0643\u064A\u0633 \u0642\u0645\u0627\u0634\u064A.",
    tags: ["Kids", "Ages 3-5", "Pure Silk", "Hypoallergenic"],
    featured: false,
    newArrival: true,
    bestSeller: false,
    active: true,
    rating: 5,
    reviewCount: 19,
    createdAt: "2026-02-26T12:00:00Z",
    isKids: true,
    ageGroup: "3-5"
  },
  {
    id: "prod-kid-03",
    sku: "BDS-KID-03",
    nameEn: "Cozy Lamb Fluffy Cloud Morning Robe (Ages 3\u20135)",
    nameAr: "\u0631\u0648\u0628 \u0635\u0628\u0627\u062D\u064A \u0646\u0627\u0639\u0645 \u0643\u0627\u0644\u0633\u062D\u0627\u0628 \u0644\u0644\u0623\u0637\u0641\u0627\u0644 (\u0663 - \u0665 \u0633\u0646\u0648\u0627\u062A)",
    descriptionEn: "Plush lightweight hooded lounge robe crafted with absorbent bamboo velour and soft jersey lining. Attached belt for toddler safety.",
    descriptionAr: "\u0631\u0648\u0628 \u0635\u0628\u0627\u062D\u064A \u062E\u0641\u064A\u0641 \u0628\u063A\u0637\u0627\u0621 \u0631\u0623\u0633 \u0645\u0635\u0645\u0645 \u0645\u0646 \u0645\u062E\u0645\u0644 \u0627\u0644\u0628\u0627\u0645\u0628\u0648 \u0641\u0627\u0626\u0642 \u0627\u0644\u0646\u0639\u0648\u0645\u0629 \u0645\u0639 \u062D\u0632\u0627\u0645 \u0645\u062B\u0628\u062A \u0644\u0623\u0645\u0627\u0646 \u0627\u0644\u0637\u0641\u0644 \u0628\u0639\u062F \u0627\u0644\u0627\u0633\u062A\u062D\u0645\u0627\u0645 \u0648\u0623\u0648\u0642\u0627\u062A \u0627\u0644\u0635\u0628\u0627\u062D.",
    categoryId: "cat-kids-sleepwear",
    categoryNameEn: "Curated Kids Collection",
    categoryNameAr: "\u062A\u0634\u0643\u064A\u0644\u0629 \u0627\u0644\u0623\u0637\u0641\u0627\u0644 \u0627\u0644\u0641\u0627\u062E\u0631\u0629",
    price: 18,
    currency: "BHD",
    images: [KIDS_ROBE_IMAGE, KIDS_PJ_IMAGE],
    variants: [
      { size: "3-4Y", colorNameEn: "Sky Powder Blue", colorNameAr: "\u0623\u0632\u0631\u0642 \u0633\u0645\u0627\u0648\u064A", colorHex: "#BFD7ED", stock: 7, sku: "BDS-KID-03-34-SB" },
      { size: "4-5Y", colorNameEn: "Sky Powder Blue", colorNameAr: "\u0623\u0632\u0631\u0642 \u0633\u0645\u0627\u0648\u064A", colorHex: "#BFD7ED", stock: 8, sku: "BDS-KID-03-45-SB" }
    ],
    materialEn: "70% Organic Bamboo Viscose, 30% Combed Cotton",
    materialAr: "\u0667\u0660\u066A \u0641\u064A\u0633\u0643\u0648\u0632 \u0628\u0627\u0645\u0628\u0648 \u0639\u0636\u0648\u064A\u060C \u0663\u0660\u066A \u0642\u0637\u0646 \u0646\u0627\u0639\u0645",
    careInstructionsEn: "Machine wash warm, tumble dry low.",
    careInstructionsAr: "\u063A\u0633\u064A\u0644 \u0622\u0644\u064A \u0648\u062A\u062C\u0641\u064A\u0641 \u062E\u0641\u064A\u0641 \u0628\u062F\u0631\u062C\u0629 \u062D\u0631\u0627\u0631\u0629 \u0645\u0646\u062E\u0641\u0636\u0629.",
    tags: ["Kids", "Ages 3-5", "Robe", "New"],
    featured: false,
    newArrival: true,
    bestSeller: true,
    active: true,
    rating: 4.8,
    reviewCount: 22,
    createdAt: "2026-02-27T08:30:00Z",
    isKids: true,
    ageGroup: "3-5"
  },
  {
    id: "prod-kid-04",
    sku: "BDS-KID-04",
    nameEn: "Starlight Piped Silk Pajama Set (Ages 5\u20137)",
    nameAr: "\u0637\u0642\u0645 \u0628\u064A\u062C\u0627\u0645\u0629 \u062D\u0631\u064A\u0631\u064A \u0643\u0644\u0627\u0633\u064A\u0643\u064A \u0644\u0644\u0623\u0637\u0641\u0627\u0644 (\u0665 - \u0667 \u0633\u0646\u0648\u0627\u062A)",
    descriptionEn: "Miniature tailoring at its finest. Classic notch collar sleep set with ivory piping and child-friendly smooth front buttons.",
    descriptionAr: "\u0623\u0646\u0627\u0642\u0629 \u0643\u0644\u0627\u0633\u064A\u0643\u064A\u0629 \u0645\u0635\u063A\u0631\u0629 \u0628\u0623\u0639\u0644\u0649 \u062F\u0631\u062C\u0627\u062A \u0627\u0644\u0625\u062A\u0642\u0627\u0646. \u0637\u0642\u0645 \u0628\u064A\u062C\u0627\u0645\u0629 \u062D\u0631\u064A\u0631\u064A \u0628\u0623\u0632\u0631\u0627\u0631 \u0645\u0631\u064A\u062D\u0629 \u0648\u062D\u0648\u0627\u0641 \u0628\u0644\u0648\u0646 \u0627\u0644\u0639\u0627\u062C \u0627\u0644\u0623\u0628\u064A\u0636.",
    categoryId: "cat-kids-sleepwear",
    categoryNameEn: "Curated Kids Collection",
    categoryNameAr: "\u062A\u0634\u0643\u064A\u0644\u0629 \u0627\u0644\u0623\u0637\u0641\u0627\u0644 \u0627\u0644\u0641\u0627\u062E\u0631\u0629",
    price: 26.5,
    salePrice: 22,
    currency: "BHD",
    images: [KIDS_ROBE_IMAGE, KIDS_PJ_IMAGE],
    variants: [
      { size: "5-6Y", colorNameEn: "Royal Sky Blue", colorNameAr: "\u0623\u0632\u0631\u0642 \u0645\u0644\u0643\u064A \u0633\u0645\u0627\u0648\u064A", colorHex: "#7AAACE", stock: 9, sku: "BDS-KID-04-56-RB" },
      { size: "6-7Y", colorNameEn: "Royal Sky Blue", colorNameAr: "\u0623\u0632\u0631\u0642 \u0645\u0644\u0643\u064A \u0633\u0645\u0627\u0648\u064A", colorHex: "#7AAACE", stock: 10, sku: "BDS-KID-04-67-RB" }
    ],
    materialEn: "100% Pure Mulberry Silk (19-Momme)",
    materialAr: "\u062D\u0631\u064A\u0631 \u0627\u0644\u062A\u0648\u062A \u0627\u0644\u0637\u0628\u064A\u0639\u064A \u0661\u0660\u0660\u066A (\u0661\u0669 \u0645\u0648\u0645\u064A\u0647)",
    careInstructionsEn: "Delicate hand wash cold or gentle machine wash.",
    careInstructionsAr: "\u063A\u0633\u064A\u0644 \u064A\u062F\u0648\u064A \u0644\u0637\u064A\u0641 \u0628\u0645\u0627\u0621 \u0628\u0627\u0631\u062F \u0623\u0648 \u063A\u0633\u064A\u0644 \u0622\u0644\u064A \u062E\u0641\u064A\u0641.",
    tags: ["Kids", "Ages 5-7", "Pure Silk", "Bestseller"],
    featured: true,
    newArrival: true,
    bestSeller: true,
    active: true,
    rating: 4.9,
    reviewCount: 45,
    createdAt: "2026-02-24T14:00:00Z",
    isKids: true,
    ageGroup: "5-7"
  },
  {
    id: "prod-kid-05",
    sku: "BDS-KID-05",
    nameEn: "Dream Blossom Ruffle Hem Nightgown (Ages 5\u20137)",
    nameAr: "\u0641\u0633\u062A\u0627\u0646 \u0646\u0648\u0645 \u0646\u0627\u0639\u0645 \u0628\u0643\u0634\u0643\u0634 \u0644\u0644\u0623\u0645\u064A\u0631\u0627\u062A (\u0665 - \u0667 \u0633\u0646\u0648\u0627\u062A)",
    descriptionEn: "Flowing breathable organic cotton nightgown adorned with soft ruffled hems and flutter cap sleeves. Perfect for peaceful slumber.",
    descriptionAr: "\u0641\u0633\u062A\u0627\u0646 \u0646\u0648\u0645 \u0641\u0636\u0641\u0627\u0636 \u0648\u0645\u0631\u064A\u062D \u0628\u0623\u0643\u0645\u0627\u0645 \u0642\u0635\u064A\u0631\u0629 \u0648\u0643\u0634\u0643\u0634 \u0644\u0637\u064A\u0641 \u0639\u0644\u0649 \u0627\u0644\u062D\u0648\u0627\u0641 \u0645\u0635\u0646\u0648\u0639 \u0645\u0646 \u0627\u0644\u0642\u0637\u0646 \u0627\u0644\u0639\u0636\u0648\u064A \u0627\u0644\u0645\u0633\u0627\u0645\u064A.",
    categoryId: "cat-kids-sleepwear",
    categoryNameEn: "Curated Kids Collection",
    categoryNameAr: "\u062A\u0634\u0643\u064A\u0644\u0629 \u0627\u0644\u0623\u0637\u0641\u0627\u0644 \u0627\u0644\u0641\u0627\u062E\u0631\u0629",
    price: 17.5,
    currency: "BHD",
    images: [KIDS_PJ_IMAGE, KIDS_COTTON_IMAGE],
    variants: [
      { size: "5-6Y", colorNameEn: "Pastel Lilac", colorNameAr: "\u0644\u0627\u0641\u0646\u062F\u0631 \u0646\u0627\u0639\u0645", colorHex: "#E2D4E8", stock: 8, sku: "BDS-KID-05-56-PL" },
      { size: "6-7Y", colorNameEn: "Pastel Lilac", colorNameAr: "\u0644\u0627\u0641\u0646\u062F\u0631 \u0646\u0627\u0639\u0645", colorHex: "#E2D4E8", stock: 6, sku: "BDS-KID-05-67-PL" }
    ],
    materialEn: "100% Organic Breathable Pima Cotton",
    materialAr: "\u0642\u0637\u0646 \u0628\u064A\u0645\u0627 \u0639\u0636\u0648\u064A \u0645\u0633\u0627\u0645\u064A \u0661\u0660\u0660\u066A",
    careInstructionsEn: "Machine wash cold, tumble dry low.",
    careInstructionsAr: "\u063A\u0633\u064A\u0644 \u0622\u0644\u064A \u0628\u0645\u0627\u0621 \u0628\u0627\u0631\u062F \u0648\u062A\u062C\u0641\u064A\u0641 \u0628\u062D\u0631\u0627\u0631\u0629 \u062E\u0641\u064A\u0641\u0629.",
    tags: ["Kids", "Ages 5-7", "Nightgown", "Summer"],
    featured: false,
    newArrival: false,
    bestSeller: true,
    active: true,
    rating: 4.8,
    reviewCount: 27,
    createdAt: "2026-02-15T11:00:00Z",
    isKids: true,
    ageGroup: "5-7"
  },
  {
    id: "prod-kid-06",
    sku: "BDS-KID-06",
    nameEn: "Little Prince Breton Striped Lounge Set (Ages 5\u20137)",
    nameAr: "\u0637\u0642\u0645 \u0646\u0648\u0645 \u0645\u062E\u0637\u0637 \u0645\u0631\u064A\u062D \u0644\u0644\u0623\u0648\u0644\u0627\u062F \u0648\u0627\u0644\u0628\u0646\u0627\u062A (\u0665 - \u0667 \u0633\u0646\u0648\u0627\u062A)",
    descriptionEn: "Timeless Breton navy and ivory striped two-piece sleepwear. Ribbed ankle cuffs keep pants from riding up during sleep.",
    descriptionAr: "\u0637\u0642\u0645 \u0628\u064A\u062C\u0627\u0645\u0629 \u0645\u0642\u0644\u0645 \u0623\u0646\u064A\u0642 \u0628\u0627\u0644\u0644\u0648\u0646\u064A\u0646 \u0627\u0644\u0643\u062D\u0644\u064A \u0648\u0627\u0644\u0639\u0627\u062C\u064A \u0645\u0639 \u0623\u0633\u0627\u0648\u0631 \u0643\u0627\u062D\u0644 \u0645\u0631\u064A\u062D\u0629 \u062A\u0645\u0646\u0639 \u0627\u0631\u062A\u0641\u0627\u0639 \u0627\u0644\u0628\u0646\u0637\u0627\u0644 \u0623\u062B\u0646\u0627\u0621 \u0627\u0644\u0646\u0648\u0645.",
    categoryId: "cat-kids-sleepwear",
    categoryNameEn: "Curated Kids Collection",
    categoryNameAr: "\u062A\u0634\u0643\u064A\u0644\u0629 \u0627\u0644\u0623\u0637\u0641\u0627\u0644 \u0627\u0644\u0641\u0627\u062E\u0631\u0629",
    price: 19,
    currency: "BHD",
    images: [KIDS_COTTON_IMAGE, KIDS_ROBE_IMAGE],
    variants: [
      { size: "5-6Y", colorNameEn: "Navy Stripe", colorNameAr: "\u0645\u062E\u0637\u0637 \u0643\u062D\u0644\u064A", colorHex: "#1E293B", stock: 7, sku: "BDS-KID-06-56-NS" },
      { size: "6-7Y", colorNameEn: "Navy Stripe", colorNameAr: "\u0645\u062E\u0637\u0637 \u0643\u062D\u0644\u064A", colorHex: "#1E293B", stock: 8, sku: "BDS-KID-06-67-NS" }
    ],
    materialEn: "95% Combed Organic Cotton, 5% Elastane",
    materialAr: "\u0669\u0665\u066A \u0642\u0637\u0646 \u0639\u0636\u0648\u064A \u0645\u0645\u0634\u0637\u060C \u0665\u066A \u0625\u064A\u0644\u0627\u0633\u062A\u064A\u0646",
    careInstructionsEn: "Machine wash warm with like colors.",
    careInstructionsAr: "\u063A\u0633\u064A\u0644 \u0622\u0644\u064A \u062F\u0627\u0641\u0626 \u0645\u0639 \u0623\u0644\u0648\u0627\u0646 \u0645\u0645\u0627\u062B\u0644\u0629.",
    tags: ["Kids", "Ages 5-7", "Loungewear"],
    featured: false,
    newArrival: true,
    bestSeller: false,
    active: true,
    rating: 4.7,
    reviewCount: 18,
    createdAt: "2026-02-22T09:00:00Z",
    isKids: true,
    ageGroup: "5-7"
  },
  {
    id: "prod-kid-07",
    sku: "BDS-KID-07",
    nameEn: "Junior Pure Silk Kimono Bedtime Robe (Ages 8\u20139)",
    nameAr: "\u0631\u0648\u0628 \u0643\u064A\u0645\u0648\u0646\u0648 \u062D\u0631\u064A\u0631\u064A \u0641\u0627\u062E\u0631 \u0644\u0644\u0646\u0627\u0634\u0626\u064A\u0646 (\u0668 - \u0669 \u0633\u0646\u0648\u0627\u062A)",
    descriptionEn: "Elegantly proportioned silk kimono robe featuring 3/4 sleeves, internal security tie, and wide sash belt. Mirrors our bestselling adult silhouette.",
    descriptionAr: "\u0631\u0648\u0628 \u0643\u064A\u0645\u0648\u0646\u0648 \u062D\u0631\u064A\u0631\u064A \u0645\u0635\u0645\u0645 \u0628\u0623\u0646\u0627\u0642\u0629 \u0641\u0627\u0626\u0642\u0629 \u0644\u0644\u0641\u062A\u064A\u0627\u062A \u0628\u0623\u0643\u0645\u0627\u0645 \u0645\u0631\u064A\u062D\u0629 \u0648\u062D\u0632\u0627\u0645 \u0623\u0646\u064A\u0642\u060C \u0645\u0633\u062A\u0648\u062D\u0649 \u0645\u0646 \u062A\u0634\u0643\u064A\u0644\u0629 \u0627\u0644\u0643\u0628\u0627\u0631 \u0627\u0644\u0623\u064A\u0642\u0648\u0646\u064A\u0629.",
    categoryId: "cat-kids-sleepwear",
    categoryNameEn: "Curated Kids Collection",
    categoryNameAr: "\u062A\u0634\u0643\u064A\u0644\u0629 \u0627\u0644\u0623\u0637\u0641\u0627\u0644 \u0627\u0644\u0641\u0627\u062E\u0631\u0629",
    price: 28.5,
    currency: "BHD",
    images: [KIDS_ROBE_IMAGE, KIDS_PJ_IMAGE],
    variants: [
      { size: "8-9Y", colorNameEn: "Sky Blue & Pearl", colorNameAr: "\u0633\u0645\u0627\u0648\u064A \u0648\u0644\u0624\u0644\u0624\u064A", colorHex: "#BFD7ED", stock: 8, sku: "BDS-KID-07-89-SB" },
      { size: "8-9Y", colorNameEn: "Champagne Blush", colorNameAr: "\u0634\u0627\u0645\u0628\u064A\u0646 \u0648\u0631\u062F\u064A", colorHex: "#F6D5CE", stock: 6, sku: "BDS-KID-07-89-CB" }
    ],
    materialEn: "100% Grade-6A Mulberry Silk (22-Momme)",
    materialAr: "\u062D\u0631\u064A\u0631 \u0627\u0644\u062A\u0648\u062A \u0627\u0644\u0637\u0628\u064A\u0639\u064A \u0639\u064A\u0627\u0631 \u0662\u0662 \u0645\u0648\u0645\u064A\u0647",
    careInstructionsEn: "Delicate hand wash cold with silk detergent.",
    careInstructionsAr: "\u063A\u0633\u064A\u0644 \u064A\u062F\u0648\u064A \u0644\u0637\u064A\u0641 \u0628\u0645\u0627\u0621 \u0628\u0627\u0631\u062F \u0628\u0645\u0646\u0638\u0641 \u0627\u0644\u062D\u0631\u064A\u0631 \u0627\u0644\u0637\u0628\u064A\u0639\u064A.",
    tags: ["Kids", "Ages 8-9", "Pure Silk", "Robe"],
    featured: true,
    newArrival: true,
    bestSeller: true,
    active: true,
    rating: 5,
    reviewCount: 31,
    createdAt: "2026-02-20T15:30:00Z",
    isKids: true,
    ageGroup: "8-9"
  },
  {
    id: "prod-kid-08",
    sku: "BDS-KID-08",
    nameEn: "Soft Breeze Thermal Waffle Pajama Set (Ages 8\u20139)",
    nameAr: "\u0637\u0642\u0645 \u0628\u064A\u062C\u0627\u0645\u0629 \u0648\u0627\u0641\u0644 \u062E\u0641\u064A\u0641 \u0648\u0645\u0631\u064A\u062D (\u0668 - \u0669 \u0633\u0646\u0648\u0627\u062A)",
    descriptionEn: "Textured micro-waffle organic cotton tailored for breezy evenings. Relaxed henley neckline and stretch waistband for growing children.",
    descriptionAr: "\u0642\u0645\u0627\u0634 \u0648\u0627\u0641\u0644 \u062E\u0641\u064A\u0641 \u0648\u0645\u0631\u064A\u062D \u0645\u0646 \u0627\u0644\u0642\u0637\u0646 \u0627\u0644\u0639\u0636\u0648\u064A \u0628\u064A\u0627\u0642\u0629 \u0647\u064A\u0646\u0644\u064A \u0643\u0644\u0627\u0633\u064A\u0643\u064A\u0629 \u0648\u062E\u0635\u0631 \u0645\u0637\u0627\u0637\u064A \u0645\u0631\u064A\u062D \u0645\u062B\u0627\u0644\u064A \u0644\u0623\u062C\u0648\u0627\u0621 \u0627\u0644\u0628\u062D\u0631\u064A\u0646 \u0627\u0644\u0645\u0633\u0627\u0626\u064A\u0629.",
    categoryId: "cat-kids-sleepwear",
    categoryNameEn: "Curated Kids Collection",
    categoryNameAr: "\u062A\u0634\u0643\u064A\u0644\u0629 \u0627\u0644\u0623\u0637\u0641\u0627\u0644 \u0627\u0644\u0641\u0627\u062E\u0631\u0629",
    price: 20,
    currency: "BHD",
    images: [KIDS_COTTON_IMAGE, KIDS_PJ_IMAGE],
    variants: [
      { size: "8-9Y", colorNameEn: "Sage Green", colorNameAr: "\u0623\u062E\u0636\u0631 \u0645\u0631\u064A\u0645\u064A", colorHex: "#9CAF88", stock: 9, sku: "BDS-KID-08-89-SG" },
      { size: "8-9Y", colorNameEn: "Oatmeal Heather", colorNameAr: "\u0628\u064A\u062C \u0634\u0648\u0641\u0627\u0646\u064A", colorHex: "#E5DFD3", stock: 10, sku: "BDS-KID-08-89-OH" }
    ],
    materialEn: "100% Organic Textured Waffle Cotton",
    materialAr: "\u0642\u0637\u0646 \u0648\u0627\u0641\u0644 \u0639\u0636\u0648\u064A \u0661\u0660\u0660\u066A \u0639\u0627\u0644\u064A \u0627\u0644\u0645\u0633\u0627\u0645\u064A\u0629",
    careInstructionsEn: "Machine wash warm, tumble dry gentle.",
    careInstructionsAr: "\u063A\u0633\u064A\u0644 \u0622\u0644\u064A \u062F\u0627\u0641\u0626 \u0648\u062A\u062C\u0641\u064A\u0641 \u0628\u062F\u0631\u062C\u0629 \u062E\u0641\u064A\u0641\u0629.",
    tags: ["Kids", "Ages 8-9", "Waffle", "Cozy"],
    featured: false,
    newArrival: false,
    bestSeller: true,
    active: true,
    rating: 4.8,
    reviewCount: 24,
    createdAt: "2026-02-17T13:00:00Z",
    isKids: true,
    ageGroup: "8-9"
  },
  {
    id: "prod-kid-09",
    sku: "BDS-KID-09",
    nameEn: "Boutique Monogram Satin Lounge Two-Piece (Ages 8\u20139)",
    nameAr: "\u0637\u0642\u0645 \u0633\u0627\u062A\u0627\u0646 \u0641\u0627\u062E\u0631 \u0644\u0644\u0628\u064A\u062A \u0648\u0627\u0644\u0646\u0648\u0645 (\u0668 - \u0669 \u0633\u0646\u0648\u0627\u062A)",
    descriptionEn: "Silky-smooth satin button-front pajama set with contrast ivory piping and chest pocket. Lightweight and wrinkle-free.",
    descriptionAr: "\u0637\u0642\u0645 \u0628\u064A\u062C\u0627\u0645\u0629 \u0633\u0627\u062A\u0627\u0646 \u0641\u0627\u0626\u0642 \u0627\u0644\u0646\u0639\u0648\u0645\u0629 \u0628\u0623\u0632\u0631\u0627\u0631 \u0623\u0645\u0627\u0645\u064A\u0629 \u0648\u062C\u064A\u0628 \u0635\u062F\u0631 \u0645\u0637\u0631\u0632 \u0628\u062D\u0648\u0627\u0641 \u0628\u064A\u0636\u0627\u0621 \u0639\u0627\u062C\u064A\u0629 \u0623\u0646\u064A\u0642\u0629 \u0645\u0642\u0627\u0648\u0645 \u0644\u0644\u062A\u062C\u0639\u062F.",
    categoryId: "cat-kids-sleepwear",
    categoryNameEn: "Curated Kids Collection",
    categoryNameAr: "\u062A\u0634\u0643\u064A\u0644\u0629 \u0627\u0644\u0623\u0637\u0641\u0627\u0644 \u0627\u0644\u0641\u0627\u062E\u0631\u0629",
    price: 21.5,
    salePrice: 18.5,
    currency: "BHD",
    images: [KIDS_PJ_IMAGE, KIDS_ROBE_IMAGE],
    variants: [
      { size: "8-9Y", colorNameEn: "Dusty Rose", colorNameAr: "\u0648\u0631\u062F\u064A \u062A\u0631\u0627\u0628\u064A", colorHex: "#D8A49B", stock: 7, sku: "BDS-KID-09-89-DR" },
      { size: "8-9Y", colorNameEn: "Ivory Pearl", colorNameAr: "\u0639\u0627\u062C\u064A \u0644\u0624\u0644\u0624\u064A", colorHex: "#FAF6F0", stock: 8, sku: "BDS-KID-09-89-IP" }
    ],
    materialEn: "Silk-Feel Breathable Satin Microfiber",
    materialAr: "\u0633\u0627\u062A\u0627\u0646 \u0645\u064A\u0643\u0631\u0648\u0641\u0627\u064A\u0628\u0631 \u062D\u0631\u064A\u0631\u064A \u0627\u0644\u0645\u0644\u0645\u0633 \u0642\u0627\u0628\u0644 \u0644\u0644\u062A\u0646\u0641\u0633",
    careInstructionsEn: "Machine wash delicate cold in wash bag.",
    careInstructionsAr: "\u063A\u0633\u064A\u0644 \u0622\u0644\u064A \u0628\u062F\u0648\u0631\u0629 \u0627\u0644\u0645\u0644\u0627\u0628\u0633 \u0627\u0644\u062D\u0633\u0627\u0633\u0629.",
    tags: ["Kids", "Ages 8-9", "Satin", "Sale"],
    featured: false,
    newArrival: false,
    bestSeller: false,
    active: true,
    rating: 4.7,
    reviewCount: 15,
    createdAt: "2026-02-12T16:00:00Z",
    isKids: true,
    ageGroup: "8-9"
  },
  {
    id: "prod-kid-10",
    sku: "BDS-KID-10",
    nameEn: "Teen Atelier Silk Tailored PJ Set (Ages 10\u201312)",
    nameAr: "\u0637\u0642\u0645 \u0628\u064A\u062C\u0627\u0645\u0629 \u062D\u0631\u064A\u0631\u064A\u0629 \u0641\u0627\u062E\u0631\u0629 \u0644\u0644\u0646\u0627\u0634\u0626\u064A\u0646 (\u0661\u0660 - \u0661\u0662 \u0633\u0646\u0629)",
    descriptionEn: "Pre-teen luxury sleepwear in 100% Grade-6A Mulberry silk. Full-length relaxed trousers and tailored shirt with tonal shell buttons.",
    descriptionAr: "\u0628\u064A\u062C\u0627\u0645\u0629 \u0641\u0627\u062E\u0631\u0629 \u0644\u0644\u0623\u0639\u0645\u0627\u0631 \u0645\u0646 \u0661\u0660 \u0625\u0644\u0649 \u0661\u0662 \u0633\u0646\u0629 \u0645\u0646 \u062D\u0631\u064A\u0631 \u0627\u0644\u062A\u0648\u062A \u0627\u0644\u0637\u0628\u064A\u0639\u064A \u0661\u0660\u0660\u066A \u0628\u0628\u0646\u0637\u0627\u0644 \u0645\u0631\u064A\u062D \u0648\u0642\u0645\u064A\u0635 \u0623\u0646\u064A\u0642 \u0628\u0623\u0632\u0631\u0627\u0631 \u0635\u062F\u0641\u064A\u0629.",
    categoryId: "cat-kids-sleepwear",
    categoryNameEn: "Curated Kids Collection",
    categoryNameAr: "\u062A\u0634\u0643\u064A\u0644\u0629 \u0627\u0644\u0623\u0637\u0641\u0627\u0644 \u0627\u0644\u0641\u0627\u062E\u0631\u0629",
    price: 32,
    salePrice: 27.5,
    currency: "BHD",
    images: [KIDS_PJ_IMAGE, KIDS_COTTON_IMAGE],
    variants: [
      { size: "10-12Y", colorNameEn: "Midnight Navy", colorNameAr: "\u0643\u062D\u0644\u064A \u0644\u064A\u0644\u064A", colorHex: "#1E293B", stock: 8, sku: "BDS-KID-10-1012-MN" },
      { size: "10-12Y", colorNameEn: "Soft Blush", colorNameAr: "\u0648\u0631\u062F\u064A \u0647\u0627\u062F\u0626", colorHex: "#F6D5CE", stock: 9, sku: "BDS-KID-10-1012-SB" }
    ],
    materialEn: "100% Grade-6A Mulberry Silk (22-Momme)",
    materialAr: "\u062D\u0631\u064A\u0631 \u0627\u0644\u062A\u0648\u062A \u0627\u0644\u0637\u0628\u064A\u0639\u064A \u0639\u064A\u0627\u0631 \u0662\u0662 \u0645\u0648\u0645\u064A\u0647",
    careInstructionsEn: "Hand wash cold or dry clean recommended.",
    careInstructionsAr: "\u063A\u0633\u064A\u0644 \u064A\u062F\u0648\u064A \u0628\u0645\u0627\u0621 \u0628\u0627\u0631\u062F \u0623\u0648 \u062A\u0646\u0638\u064A\u0641 \u062C\u0627\u0641 \u0644\u0637\u064A\u0641.",
    tags: ["Kids", "Ages 10-12", "Pure Silk", "Luxury", "Bestseller"],
    featured: true,
    newArrival: true,
    bestSeller: true,
    active: true,
    rating: 5,
    reviewCount: 39,
    createdAt: "2026-02-23T11:00:00Z",
    isKids: true,
    ageGroup: "10-12"
  },
  {
    id: "prod-kid-11",
    sku: "BDS-KID-11",
    nameEn: "Signature Breathable Bamboo Modal Set (Ages 10\u201312)",
    nameAr: "\u0637\u0642\u0645 \u0645\u0644\u0627\u0628\u0633 \u0646\u0648\u0645 \u0645\u0648\u062F\u0627\u0644 \u0628\u0627\u0645\u0628\u0648 \u0628\u0627\u0631\u062F (\u0661\u0660 - \u0661\u0662 \u0633\u0646\u0629)",
    descriptionEn: "Buttery-soft eco-friendly bamboo modal fabric engineered to stay cool during warm Bahrain nights. Contemporary relaxed fit.",
    descriptionAr: "\u0642\u0645\u0627\u0634 \u0645\u0648\u062F\u0627\u0644 \u0628\u0627\u0645\u0628\u0648 \u0641\u0627\u0626\u0642 \u0627\u0644\u0646\u0639\u0648\u0645\u0629 \u0648\u0627\u0644\u0627\u0646\u062A\u0639\u0627\u0634 \u0635\u064F\u0645\u0645 \u0644\u064A\u0645\u0646\u062D \u0625\u062D\u0633\u0627\u0633\u0627\u064B \u0628\u0627\u0644\u0628\u0631\u0648\u062F\u0629 \u0648\u0627\u0644\u0627\u0646\u062A\u0639\u0627\u0634 \u0637\u0648\u0627\u0644 \u0627\u0644\u0644\u064A\u0644 \u0628\u0642\u0635\u0629 \u0639\u0635\u0631\u064A\u0629 \u0645\u0631\u064A\u062D\u0629.",
    categoryId: "cat-kids-sleepwear",
    categoryNameEn: "Curated Kids Collection",
    categoryNameAr: "\u062A\u0634\u0643\u064A\u0644\u0629 \u0627\u0644\u0623\u0637\u0641\u0627\u0644 \u0627\u0644\u0641\u0627\u062E\u0631\u0629",
    price: 23.5,
    currency: "BHD",
    images: [KIDS_COTTON_IMAGE, KIDS_ROBE_IMAGE],
    variants: [
      { size: "10-12Y", colorNameEn: "Eucalyptus Sage", colorNameAr: "\u0623\u062E\u0636\u0631 \u0645\u0631\u064A\u0645\u064A \u0647\u0627\u062F\u0626", colorHex: "#7C9082", stock: 9, sku: "BDS-KID-11-1012-ES" },
      { size: "10-12Y", colorNameEn: "Cloud Gray", colorNameAr: "\u0631\u0645\u0627\u062F\u064A \u063A\u0627\u0626\u0645", colorHex: "#D1D5DB", stock: 8, sku: "BDS-KID-11-1012-CG" }
    ],
    materialEn: "95% Bamboo Modal, 5% Spandex",
    materialAr: "\u0669\u0665\u066A \u0645\u0648\u062F\u0627\u0644 \u0628\u0627\u0645\u0628\u0648\u060C \u0665\u066A \u0633\u0628\u0627\u0646\u062F\u0643\u0633",
    careInstructionsEn: "Machine wash cold, line dry.",
    careInstructionsAr: "\u063A\u0633\u064A\u0644 \u0622\u0644\u064A \u0628\u0645\u0627\u0621 \u0628\u0627\u0631\u062F \u0648\u062A\u062C\u0641\u064A\u0641 \u0628\u0627\u0644\u062A\u0639\u0644\u064A\u0642.",
    tags: ["Kids", "Ages 10-12", "Bamboo Modal", "Cooling"],
    featured: false,
    newArrival: false,
    bestSeller: true,
    active: true,
    rating: 4.8,
    reviewCount: 28,
    createdAt: "2026-02-16T14:30:00Z",
    isKids: true,
    ageGroup: "10-12"
  },
  {
    id: "prod-kid-12",
    sku: "BDS-KID-12",
    nameEn: "Velvet Trim Cozy Weekend Cloud Robe (Ages 10\u201312)",
    nameAr: "\u0631\u0648\u0628 \u0639\u0637\u0644\u0629 \u0646\u0647\u0627\u064A\u0629 \u0627\u0644\u0623\u0633\u0628\u0648\u0639 \u0628\u062D\u0648\u0627\u0641 \u0645\u062E\u0645\u0644\u064A\u0629 (\u0661\u0660 - \u0661\u0662 \u0633\u0646\u0629)",
    descriptionEn: "Ultra-plush featherweight morning robe with velvet shawl collar and deep front pockets. Ideal for relaxing weekend breakfasts and family mornings.",
    descriptionAr: "\u0631\u0648\u0628 \u0635\u0628\u0627\u062D\u064A \u0646\u0627\u0639\u0645 \u0643\u0627\u0644\u062D\u0644\u0645 \u0628\u064A\u0627\u0642\u0629 \u0634\u0627\u0644 \u0645\u062E\u0645\u0644\u064A\u0629 \u0648\u062C\u064A\u0648\u0628 \u0623\u0645\u0627\u0645\u064A\u0629 \u0639\u0645\u064A\u0642\u0629\u060C \u0645\u062B\u0627\u0644\u064A \u0644\u0635\u0628\u0627\u062D\u0627\u062A \u0639\u0637\u0644\u0629 \u0646\u0647\u0627\u064A\u0629 \u0627\u0644\u0623\u0633\u0628\u0648\u0639 \u0627\u0644\u0647\u0627\u062F\u0626\u0629.",
    categoryId: "cat-kids-sleepwear",
    categoryNameEn: "Curated Kids Collection",
    categoryNameAr: "\u062A\u0634\u0643\u064A\u0644\u0629 \u0627\u0644\u0623\u0637\u0641\u0627\u0644 \u0627\u0644\u0641\u0627\u062E\u0631\u0629",
    price: 25,
    currency: "BHD",
    images: [KIDS_ROBE_IMAGE, KIDS_PJ_IMAGE],
    variants: [
      { size: "10-12Y", colorNameEn: "Sky Powder Blue", colorNameAr: "\u0623\u0632\u0631\u0642 \u0633\u0645\u0627\u0648\u064A", colorHex: "#BFD7ED", stock: 6, sku: "BDS-KID-12-1012-SB" },
      { size: "10-12Y", colorNameEn: "Pure Ivory", colorNameAr: "\u0639\u0627\u062C\u064A \u062E\u0627\u0644\u0635", colorHex: "#FFFDF9", stock: 7, sku: "BDS-KID-12-1012-PI" }
    ],
    materialEn: "Featherweight Micro-Velour with Organic Cotton Lining",
    materialAr: "\u0645\u062E\u0645\u0644 \u062E\u0641\u064A\u0641 \u0627\u0644\u0648\u0632\u0646 \u0645\u0639 \u0628\u0637\u0627\u0646\u0629 \u0642\u0637\u0646\u064A\u0629 \u0639\u0636\u0648\u064A\u0629",
    careInstructionsEn: "Machine wash delicate, hang dry.",
    careInstructionsAr: "\u063A\u0633\u064A\u0644 \u0622\u0644\u064A \u0628\u062F\u0648\u0631\u0629 \u0627\u0644\u0645\u0644\u0627\u0628\u0633 \u0627\u0644\u062D\u0633\u0627\u0633\u0629 \u0648\u062A\u062C\u0641\u064A\u0641 \u0628\u0627\u0644\u062A\u0639\u0644\u064A\u0642.",
    tags: ["Kids", "Ages 10-12", "Robe", "New"],
    featured: false,
    newArrival: true,
    bestSeller: false,
    active: true,
    rating: 4.9,
    reviewCount: 20,
    createdAt: "2026-02-27T16:00:00Z",
    isKids: true,
    ageGroup: "10-12"
  }
];
var INITIAL_ORDERS = [
  {
    id: "ord-101",
    orderNumber: "BDS-2026-4819",
    userId: "usr-demo-01",
    customerName: "Fatima Al Khalifa",
    customerEmail: "fatima.alkhalifa@example.bh",
    customerPhone: "+973 3922 1144",
    shippingAddress: {
      buildingNumber: "Villa 14",
      roadNumber: "Road 3812",
      blockNumber: "Block 338",
      area: "Adliya",
      city: "Manama",
      country: "Bahrain",
      additionalInstructions: "Call upon arrival at the gate"
    },
    deliveryOption: "express",
    shippingFee: 2.5,
    subtotal: 38.5,
    discount: 3.85,
    total: 37.15,
    currency: "BHD",
    couponCode: "WELCOME10",
    paymentMethod: "benefit_pay",
    paymentTransactionId: "BENEFIT-TX-992481",
    paymentStatus: "Paid",
    orderStatus: "Shipped",
    items: [
      {
        productId: "prod-001",
        nameEn: "Royal Mulberry Silk Pajama Set",
        nameAr: "\u0637\u0642\u0645 \u0628\u064A\u062C\u0627\u0645\u0629 \u062D\u0631\u064A\u0631 \u0627\u0644\u062A\u0648\u062A \u0627\u0644\u0645\u0644\u0643\u064A",
        size: "M",
        color: "Champagne Blush",
        quantity: 1,
        unitPrice: 38.5,
        totalPrice: 38.5,
        image: "/src/assets/images/product_silk_pj_set_1791490156744.jpg"
      }
    ],
    statusHistory: [
      { status: "Pending", timestamp: "2026-03-01T09:10:00Z" },
      { status: "Confirmed", timestamp: "2026-03-01T09:12:00Z" },
      { status: "Preparing", timestamp: "2026-03-01T10:00:00Z" },
      { status: "Shipped", timestamp: "2026-03-01T13:45:00Z", note: "Out with boutique courier" }
    ],
    createdAt: "2026-03-01T09:10:00Z",
    updatedAt: "2026-03-01T13:45:00Z"
  },
  {
    id: "ord-102",
    orderNumber: "BDS-2026-5231",
    customerName: "Maryam Bucheeri",
    customerEmail: "maryam.bucheeri@example.bh",
    customerPhone: "+973 3611 7788",
    shippingAddress: {
      buildingNumber: "Building 802",
      roadNumber: "Road 2814",
      blockNumber: "Block 428",
      area: "Seef District",
      city: "Manama",
      country: "Bahrain",
      additionalInstructions: "Flat 403, 4th Floor"
    },
    deliveryOption: "standard",
    shippingFee: 0,
    subtotal: 58,
    discount: 5,
    total: 53,
    currency: "BHD",
    couponCode: "BAHRAINVIP",
    paymentMethod: "apple_pay",
    paymentTransactionId: "APAY-TX-773120",
    paymentStatus: "Paid",
    orderStatus: "Delivered",
    items: [
      {
        productId: "prod-002",
        nameEn: "Rose Champagne Satin Slip Nightdress",
        nameAr: "\u0642\u0645\u064A\u0635 \u0646\u0648\u0645 \u0633\u0627\u062A\u0627\u0646 \u0628\u0644\u0648\u0646 \u0627\u0644\u0634\u0627\u0645\u0628\u0627\u0646\u064A\u0627 \u0627\u0644\u0648\u0631\u062F\u064A",
        size: "S",
        color: "Rose Champagne",
        quantity: 1,
        unitPrice: 24,
        totalPrice: 24,
        image: "/src/assets/images/product_rose_satin_slip_1791490170068.jpg"
      },
      {
        productId: "prod-003",
        nameEn: "French Lace Bridal Silk Robe",
        nameAr: "\u0631\u0648\u0628 \u0639\u0631\u0627\u0626\u0633 \u062D\u0631\u064A\u0631\u064A \u0628\u0627\u0644\u062F\u0627\u0646\u062A\u064A\u0644 \u0627\u0644\u0641\u0631\u0646\u0633\u064A",
        size: "Free Size",
        color: "Ivory Pearl",
        quantity: 1,
        unitPrice: 34,
        totalPrice: 34,
        image: "/src/assets/images/product_lace_robe_1791490184499.jpg"
      }
    ],
    statusHistory: [
      { status: "Pending", timestamp: "2026-02-28T14:20:00Z" },
      { status: "Confirmed", timestamp: "2026-02-28T14:21:00Z" },
      { status: "Preparing", timestamp: "2026-02-28T16:00:00Z" },
      { status: "Shipped", timestamp: "2026-03-01T09:00:00Z" },
      { status: "Delivered", timestamp: "2026-03-01T15:30:00Z", note: "Handed to recipient" }
    ],
    createdAt: "2026-02-28T14:20:00Z",
    updatedAt: "2026-03-01T15:30:00Z"
  },
  {
    id: "ord-103",
    orderNumber: "BDS-2026-6104",
    customerName: "Noor Al Doseri",
    customerEmail: "noor.aldoseri@example.bh",
    customerPhone: "+973 3899 4433",
    shippingAddress: {
      buildingNumber: "Villa 31",
      roadNumber: "Road 5110",
      blockNumber: "Block 525",
      area: "Saar",
      city: "Northern Governorate",
      country: "Bahrain"
    },
    deliveryOption: "standard",
    shippingFee: 1.5,
    subtotal: 24,
    discount: 0,
    total: 25.5,
    currency: "BHD",
    paymentMethod: "visa_mastercard",
    paymentTransactionId: "VISA-TX-118834",
    paymentStatus: "Paid",
    orderStatus: "Preparing",
    items: [
      {
        productId: "prod-004",
        nameEn: "Whisper Soft Modal Pajama Trouser Set",
        nameAr: "\u0637\u0642\u0645 \u0628\u064A\u062C\u0627\u0645\u0629 \u0628\u0646\u0637\u0627\u0644 \u0645\u0648\u062F\u0627\u0644 \u0641\u0627\u0626\u0642 \u0627\u0644\u0646\u0639\u0648\u0645\u0629",
        size: "L",
        color: "Cloud Gray",
        quantity: 1,
        unitPrice: 24,
        totalPrice: 24,
        image: "/src/assets/images/hero_luxury_sleepwear_1791490145358.jpg"
      }
    ],
    statusHistory: [
      { status: "Pending", timestamp: "2026-03-02T11:00:00Z" },
      { status: "Confirmed", timestamp: "2026-03-02T11:01:00Z" },
      { status: "Preparing", timestamp: "2026-03-02T11:30:00Z", note: "Boutique packaging in progress" }
    ],
    createdAt: "2026-03-02T11:00:00Z",
    updatedAt: "2026-03-02T11:30:00Z"
  },
  {
    id: "ord-104",
    orderNumber: "BDS-2026-7740",
    userId: "usr-customer-01",
    customerName: "Fatima Al Khalifa",
    customerEmail: "fatima@thebedtimestore.bh",
    customerPhone: "+973 3922 1144",
    shippingAddress: {
      buildingNumber: "Villa 14",
      roadNumber: "Road 3812",
      blockNumber: "Block 338",
      area: "Adliya",
      city: "Manama",
      country: "Bahrain",
      additionalInstructions: "Call upon arrival with BenefitPay machine"
    },
    deliveryOption: "standard",
    shippingFee: 0,
    subtotal: 32.5,
    discount: 0,
    total: 32.5,
    currency: "BHD",
    paymentMethod: "pay_on_delivery",
    paymentTransactionId: "POD-BH-982144-7740",
    paymentStatus: "Pending",
    deliveryVerificationCode: "481923",
    deliveryVerificationQrData: "BDS-VERIFY:BDS-2026-7740:481923:32.500:BHD",
    isDeliveryPaidConfirmed: false,
    orderStatus: "Shipped",
    items: [
      {
        productId: "prod-005",
        nameEn: "Midnight Noir Long Silk Slip Gown",
        nameAr: "\u0641\u0633\u062A\u0627\u0646 \u0646\u0648\u0645 \u0637\u0648\u064A\u0644 \u062D\u0631\u064A\u0631 \u0623\u0633\u0648\u062F \u0644\u064A\u0644\u064A",
        size: "M",
        color: "Midnight Noir",
        quantity: 1,
        unitPrice: 32.5,
        totalPrice: 32.5,
        image: "/src/assets/images/hero_luxury_sleepwear_1791490145358.jpg"
      }
    ],
    statusHistory: [
      { status: "Pending", timestamp: "2026-03-03T10:00:00Z" },
      { status: "Confirmed", timestamp: "2026-03-03T10:05:00Z", note: "Order confirmed with Pay on Delivery. PIN 481923 generated." },
      { status: "Preparing", timestamp: "2026-03-03T11:00:00Z" },
      { status: "Shipped", timestamp: "2026-03-03T14:30:00Z", note: "Out for delivery with courier. Awaiting payment collection." }
    ],
    createdAt: "2026-03-03T10:00:00Z",
    updatedAt: "2026-03-03T14:30:00Z"
  }
];

// server/services/inventoryService.ts
var MySQLInventoryService = class {
  /**
   * Seed default luxury sleepwear catalog into MySQL database if empty
   */
  async seedIfNeeded() {
    try {
      const rows = await executeQuery(SQL_COUNT_PRODUCTS);
      const count = rows && rows.length > 0 ? Number(rows[0].total) : 0;
      if (count === 0) {
        console.log("[MySQL] Seeding initial luxury products into MySQL database...");
        for (const p of INITIAL_PRODUCTS) {
          await executeQuery(SQL_INSERT_PRODUCT, [
            p.id,
            p.sku,
            p.nameEn,
            p.nameAr,
            p.descriptionEn,
            p.descriptionAr,
            p.categoryId,
            p.categoryNameEn || "",
            p.categoryNameAr || "",
            Number(p.price),
            p.salePrice !== void 0 && p.salePrice !== null ? Number(p.salePrice) : null,
            p.currency || "BHD",
            JSON.stringify(p.images || []),
            JSON.stringify(p.variants || []),
            p.materialEn || "",
            p.materialAr || "",
            p.careInstructionsEn || "",
            p.careInstructionsAr || "",
            JSON.stringify(p.tags || []),
            p.featured ? 1 : 0,
            p.bestSeller ? 1 : 0,
            p.newArrival ? 1 : 0,
            p.active !== false ? 1 : 0,
            p.rating || 5,
            p.reviewCount || 0,
            p.targetAudience || (p.isKids ? "kids" : "women"),
            p.kidAgeRange || p.ageGroup || null
          ]);
        }
        console.log(`[MySQL] Seeded ${INITIAL_PRODUCTS.length} luxury nightwear products to MySQL.`);
      }
    } catch (err) {
      console.warn("[MySQL] Product seeding notice:", err?.message);
    }
  }
  /**
   * Get all products dynamically from MySQL database
   */
  async getProducts() {
    try {
      const rows = await executeQuery(SQL_SELECT_ALL_PRODUCTS);
      if (rows && Array.isArray(rows)) {
        return rows.map(this.mapProductRow);
      }
    } catch (err) {
      console.warn("[MySQL] Failed to fetch products from MySQL:", err?.message);
    }
    return [];
  }
  /**
   * Get single product by id or sku dynamically from MySQL
   */
  async getProductById(idOrSku) {
    try {
      const rows = await executeQuery(SQL_SELECT_PRODUCT_BY_ID_OR_SKU, [idOrSku, idOrSku]);
      if (rows && rows.length > 0) {
        return this.mapProductRow(rows[0]);
      }
    } catch (err) {
      console.warn("[MySQL] Error fetching product by id/sku:", err?.message);
    }
    return null;
  }
  /**
   * Add new product to MySQL
   */
  async addProduct(productData) {
    const id = productData.id || `prod-${Date.now()}`;
    const sku = productData.sku || `BDS-${Date.now().toString().slice(-6)}`;
    const newProduct = {
      ...productData,
      id,
      sku,
      price: Number(productData.price || 0),
      salePrice: productData.salePrice !== void 0 && productData.salePrice !== null ? Number(productData.salePrice) : null,
      currency: productData.currency || "BHD",
      images: Array.isArray(productData.images) ? productData.images : [],
      variants: Array.isArray(productData.variants) ? productData.variants : [],
      tags: Array.isArray(productData.tags) ? productData.tags : [],
      featured: Boolean(productData.featured),
      bestSeller: Boolean(productData.bestSeller),
      newArrival: Boolean(productData.newArrival),
      active: productData.active !== false,
      rating: Number(productData.rating || 5),
      reviewCount: Number(productData.reviewCount || 0),
      targetAudience: productData.targetAudience || "women",
      kidAgeRange: productData.kidAgeRange || null
    };
    await executeQuery(SQL_INSERT_PRODUCT, [
      newProduct.id,
      newProduct.sku,
      newProduct.nameEn,
      newProduct.nameAr,
      newProduct.descriptionEn || "",
      newProduct.descriptionAr || "",
      newProduct.categoryId,
      newProduct.categoryNameEn || "",
      newProduct.categoryNameAr || "",
      newProduct.price,
      newProduct.salePrice,
      newProduct.currency,
      JSON.stringify(newProduct.images),
      JSON.stringify(newProduct.variants),
      newProduct.materialEn || "",
      newProduct.materialAr || "",
      newProduct.careInstructionsEn || "",
      newProduct.careInstructionsAr || "",
      JSON.stringify(newProduct.tags),
      newProduct.featured ? 1 : 0,
      newProduct.bestSeller ? 1 : 0,
      newProduct.newArrival ? 1 : 0,
      newProduct.active ? 1 : 0,
      newProduct.rating,
      newProduct.reviewCount,
      newProduct.targetAudience,
      newProduct.kidAgeRange
    ]);
    return await this.getProductById(id) || newProduct;
  }
  /**
   * Update product in MySQL
   */
  async updateProduct(id, updates) {
    const existing = await this.getProductById(id);
    if (!existing) {
      throw new Error(`Product with ID ${id} not found in MySQL database`);
    }
    if (updates.variants && Object.keys(updates).length <= 2) {
      await executeQuery(SQL_UPDATE_PRODUCT_VARIANTS, [JSON.stringify(updates.variants), id]);
      return await this.getProductById(id);
    }
    const merged = {
      sku: updates.sku || existing.sku,
      nameEn: updates.nameEn !== void 0 ? updates.nameEn : existing.nameEn,
      nameAr: updates.nameAr !== void 0 ? updates.nameAr : existing.nameAr,
      descriptionEn: updates.descriptionEn !== void 0 ? updates.descriptionEn : existing.descriptionEn,
      descriptionAr: updates.descriptionAr !== void 0 ? updates.descriptionAr : existing.descriptionAr,
      categoryId: updates.categoryId || existing.categoryId,
      categoryNameEn: updates.categoryNameEn || existing.categoryNameEn,
      categoryNameAr: updates.categoryNameAr || existing.categoryNameAr,
      price: updates.price !== void 0 ? Number(updates.price) : existing.price,
      salePrice: updates.salePrice !== void 0 ? updates.salePrice ? Number(updates.salePrice) : null : existing.salePrice,
      images: updates.images || existing.images,
      variants: updates.variants || existing.variants,
      materialEn: updates.materialEn !== void 0 ? updates.materialEn : existing.materialEn,
      materialAr: updates.materialAr !== void 0 ? updates.materialAr : existing.materialAr,
      careInstructionsEn: updates.careInstructionsEn !== void 0 ? updates.careInstructionsEn : existing.careInstructionsEn,
      careInstructionsAr: updates.careInstructionsAr !== void 0 ? updates.careInstructionsAr : existing.careInstructionsAr,
      tags: updates.tags || existing.tags,
      featured: updates.featured !== void 0 ? Boolean(updates.featured) : existing.featured,
      bestSeller: updates.bestSeller !== void 0 ? Boolean(updates.bestSeller) : existing.bestSeller,
      newArrival: updates.newArrival !== void 0 ? Boolean(updates.newArrival) : existing.newArrival,
      active: updates.active !== void 0 ? Boolean(updates.active) : existing.active,
      targetAudience: updates.targetAudience || existing.targetAudience,
      kidAgeRange: updates.kidAgeRange || existing.kidAgeRange
    };
    await executeQuery(SQL_UPDATE_PRODUCT, [
      merged.sku,
      merged.nameEn,
      merged.nameAr,
      merged.descriptionEn,
      merged.descriptionAr,
      merged.categoryId,
      merged.categoryNameEn,
      merged.categoryNameAr || "",
      merged.price,
      merged.salePrice,
      JSON.stringify(merged.images),
      JSON.stringify(merged.variants),
      merged.materialEn,
      merged.materialAr,
      merged.careInstructionsEn,
      merged.careInstructionsAr,
      JSON.stringify(merged.tags),
      merged.featured ? 1 : 0,
      merged.bestSeller ? 1 : 0,
      merged.newArrival ? 1 : 0,
      merged.active ? 1 : 0,
      merged.targetAudience,
      merged.kidAgeRange,
      id
    ]);
    return await this.getProductById(id) || { id, ...merged };
  }
  /**
   * Delete product from MySQL
   */
  async deleteProduct(id) {
    await executeQuery(SQL_DELETE_PRODUCT, [id]);
    return true;
  }
  /**
   * Adjust stock for specific variant in MySQL
   */
  async adjustStock(productId, skuOrSize, colorHex, delta, absoluteNewStock) {
    const product = await this.getProductById(productId);
    if (!product) throw new Error("Product not found in MySQL");
    const updatedVariants = (product.variants || []).map((v) => {
      const match = (v.sku === skuOrSize || v.size === skuOrSize) && (!colorHex || v.colorHex.toLowerCase() === colorHex.toLowerCase());
      if (match) {
        const newStock = typeof absoluteNewStock === "number" ? Math.max(0, absoluteNewStock) : Math.max(0, (v.stock || 0) + delta);
        return { ...v, stock: newStock };
      }
      return v;
    });
    await executeQuery(SQL_UPDATE_PRODUCT_VARIANTS, [JSON.stringify(updatedVariants), productId]);
    return await this.getProductById(productId);
  }
  /**
   * Deduct stock when an order is confirmed
   */
  async deductStock(items) {
    let deductedCount = 0;
    for (const item of items) {
      const product = await this.getProductById(item.productId);
      if (!product) continue;
      const updatedVariants = (product.variants || []).map((v) => {
        const sizeMatch = v.size === item.size;
        const colorMatch = v.colorNameEn.toLowerCase() === item.color.toLowerCase() || v.colorNameAr === item.color || v.colorHex && item.color && v.colorHex.toLowerCase() === item.color.toLowerCase();
        if (sizeMatch && colorMatch) {
          const newStock = Math.max(0, (v.stock || 0) - item.quantity);
          deductedCount++;
          return { ...v, stock: newStock };
        }
        return v;
      });
      await executeQuery(SQL_UPDATE_PRODUCT_VARIANTS, [JSON.stringify(updatedVariants), item.productId]);
    }
    return { success: true, deductedItems: deductedCount };
  }
  /**
   * Calculate complete stock balances and inventory metrics from MySQL
   */
  async getInventoryBalances() {
    const products = await this.getProducts();
    let totalUnits = 0;
    let totalInventoryValueBHD = 0;
    let totalVariants = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    const productBalances = products.map((p) => {
      let productUnits = 0;
      const variantBalances = (p.variants || []).map((v) => {
        const stock = Number(v.stock) || 0;
        productUnits += stock;
        totalUnits += stock;
        totalVariants++;
        const val = stock * Number(p.price || 0);
        totalInventoryValueBHD += val;
        const variantStatus = stock === 0 ? "Out of Stock" : stock <= 4 ? "Low Stock" : "In Stock";
        if (stock === 0) outOfStockCount++;
        else if (stock <= 4) lowStockCount++;
        return {
          sku: v.sku || `${p.sku}-${v.size}`,
          size: v.size,
          colorNameEn: v.colorNameEn,
          colorHex: v.colorHex,
          stock,
          valueBHD: Number(val.toFixed(3)),
          status: variantStatus
        };
      });
      const totalValueBHD = productUnits * Number(p.price || 0);
      const productStatus = productUnits === 0 ? "Out of Stock" : productUnits <= 8 ? "Low Stock" : "In Stock";
      return {
        productId: p.id,
        sku: p.sku,
        nameEn: p.nameEn,
        nameAr: p.nameAr,
        categoryNameEn: p.categoryNameEn,
        price: p.price,
        totalUnitsInStock: productUnits,
        totalValueBHD: Number(totalValueBHD.toFixed(3)),
        status: productStatus,
        variants: variantBalances
      };
    });
    return {
      totalUnits,
      totalInventoryValueBHD: Number(totalInventoryValueBHD.toFixed(3)),
      totalProducts: products.length,
      totalVariants,
      lowStockCount,
      outOfStockCount,
      dbStatus: getDatabaseStatus(),
      productBalances
    };
  }
  /**
   * Helper to parse and map raw MySQL product row
   */
  mapProductRow(row) {
    const parseJson2 = (val) => {
      if (!val) return [];
      if (typeof val === "string") {
        try {
          return JSON.parse(val);
        } catch {
          return [];
        }
      }
      return val;
    };
    return {
      id: row.id,
      sku: row.sku,
      nameEn: row.nameEn || row.name_en,
      nameAr: row.nameAr || row.name_ar,
      descriptionEn: row.descriptionEn || row.description_en || "",
      descriptionAr: row.descriptionAr || row.description_ar || "",
      categoryId: row.categoryId || row.category_id,
      categoryNameEn: row.categoryNameEn || row.category_name_en,
      categoryNameAr: row.categoryNameAr || row.category_name_ar,
      price: Number(row.price),
      salePrice: row.salePrice !== void 0 && row.salePrice !== null ? Number(row.salePrice) : row.sale_price !== void 0 && row.sale_price !== null ? Number(row.sale_price) : void 0,
      currency: row.currency || "BHD",
      images: parseJson2(row.images),
      variants: parseJson2(row.variants),
      materialEn: row.materialEn || row.material_en,
      materialAr: row.materialAr || row.material_ar,
      careInstructionsEn: row.careInstructionsEn || row.care_instructions_en,
      careInstructionsAr: row.careInstructionsAr || row.care_instructions_ar,
      tags: parseJson2(row.tags),
      featured: Boolean(row.featured),
      bestSeller: Boolean(row.bestSeller !== void 0 ? row.bestSeller : row.best_seller),
      newArrival: Boolean(row.newArrival !== void 0 ? row.newArrival : row.new_arrival),
      active: row.active !== 0 && row.active !== false,
      rating: Number(row.rating || 5),
      reviewCount: Number(row.reviewCount || row.review_count || 0),
      isKids: (row.targetAudience || row.target_audience) === "kids" || Boolean(row.isKids),
      ageGroup: row.kidAgeRange || row.kid_age_range || row.ageGroup,
      targetAudience: row.targetAudience || row.target_audience || "women",
      kidAgeRange: row.kidAgeRange || row.kid_age_range,
      createdAt: row.createdAt || row.created_at,
      updatedAt: row.updatedAt || row.updated_at
    };
  }
};
var inventoryService = new MySQLInventoryService();

// server/services/categoryService.ts
var MySQLCategoryService = class {
  /**
   * Seed default categories into MySQL database if table is empty
   */
  async seedIfNeeded() {
    try {
      const rows = await executeQuery(SQL_COUNT_CATEGORIES);
      const count = rows && rows.length > 0 ? Number(rows[0].total) : 0;
      if (count === 0) {
        console.log("[MySQL] Seeding initial luxury categories into MySQL database...");
        for (const cat of INITIAL_CATEGORIES) {
          await executeQuery(SQL_INSERT_CATEGORY, [
            cat.id,
            cat.slug,
            cat.nameEn,
            cat.nameAr,
            cat.descriptionEn || "",
            cat.descriptionAr || "",
            cat.image || "",
            cat.active !== false ? 1 : 0,
            cat.displayOrder || 0
          ]);
        }
        console.log(`[MySQL] Seeded ${INITIAL_CATEGORIES.length} categories to MySQL database.`);
      }
    } catch (err) {
      console.warn("[MySQL] Category seeding notice:", err?.message);
    }
  }
  /**
   * Get all categories dynamically from MySQL database
   */
  async getCategories() {
    try {
      const rows = await executeQuery(SQL_SELECT_ALL_CATEGORIES);
      if (rows && Array.isArray(rows)) {
        return rows.map(this.mapCategoryRow);
      }
    } catch (err) {
      console.warn("[MySQL] Failed to fetch categories from MySQL:", err?.message);
    }
    return [];
  }
  /**
   * Get single category by ID or slug dynamically from MySQL
   */
  async getCategoryById(idOrSlug) {
    try {
      const rows = await executeQuery(SQL_SELECT_CATEGORY_BY_ID_OR_SLUG, [idOrSlug, idOrSlug]);
      if (rows && rows.length > 0) {
        return this.mapCategoryRow(rows[0]);
      }
    } catch (err) {
      console.warn("[MySQL] Error fetching category by id/slug:", err?.message);
    }
    return null;
  }
  /**
   * Helper to format slug from English name
   */
  formatSlug(nameEn, rawSlug) {
    if (rawSlug && rawSlug.trim()) {
      return rawSlug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    }
    return nameEn.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  /**
   * Add a new category to MySQL database
   */
  async addCategory(categoryData) {
    const slug = this.formatSlug(categoryData.nameEn || "", categoryData.slug);
    const id = categoryData.id || `cat-${slug || Date.now()}`;
    const newCategory = {
      id,
      slug: slug || `cat-${Date.now()}`,
      nameEn: categoryData.nameEn || "Untitled Category",
      nameAr: categoryData.nameAr || categoryData.nameEn || "\u0642\u0633\u0645 \u062C\u062F\u064A\u062F",
      descriptionEn: categoryData.descriptionEn || "",
      descriptionAr: categoryData.descriptionAr || "",
      image: categoryData.image || "",
      active: categoryData.active !== void 0 ? Boolean(categoryData.active) : true,
      displayOrder: Number(categoryData.displayOrder ?? 0)
    };
    const existing = await this.getCategoryById(id);
    if (existing) {
      return this.updateCategory(id, newCategory);
    }
    await executeQuery(SQL_INSERT_CATEGORY, [
      newCategory.id,
      newCategory.slug,
      newCategory.nameEn,
      newCategory.nameAr,
      newCategory.descriptionEn,
      newCategory.descriptionAr,
      newCategory.image,
      newCategory.active ? 1 : 0,
      newCategory.displayOrder
    ]);
    return await this.getCategoryById(id) || newCategory;
  }
  /**
   * Update category in MySQL database
   */
  async updateCategory(id, updates) {
    const existing = await this.getCategoryById(id);
    if (!existing) {
      throw new Error(`Category with ID ${id} not found in MySQL database`);
    }
    const updatedSlug = updates.slug ? this.formatSlug("", updates.slug) : updates.nameEn ? this.formatSlug(updates.nameEn) : existing.slug;
    const merged = {
      nameEn: updates.nameEn !== void 0 ? updates.nameEn : existing.nameEn,
      nameAr: updates.nameAr !== void 0 ? updates.nameAr : existing.nameAr,
      slug: updatedSlug,
      descriptionEn: updates.descriptionEn !== void 0 ? updates.descriptionEn : existing.descriptionEn,
      descriptionAr: updates.descriptionAr !== void 0 ? updates.descriptionAr : existing.descriptionAr,
      image: updates.image !== void 0 ? updates.image : existing.image,
      active: updates.active !== void 0 ? Boolean(updates.active) : existing.active,
      displayOrder: updates.displayOrder !== void 0 ? Number(updates.displayOrder) : existing.displayOrder
    };
    await executeQuery(SQL_UPDATE_CATEGORY, [
      merged.nameEn,
      merged.nameAr,
      merged.slug,
      merged.descriptionEn,
      merged.descriptionAr,
      merged.image,
      merged.active ? 1 : 0,
      merged.displayOrder,
      id
    ]);
    return await this.getCategoryById(id) || { id, ...merged };
  }
  /**
   * Delete category from MySQL database
   */
  async deleteCategory(id) {
    await executeQuery(SQL_DELETE_CATEGORY, [id]);
    return true;
  }
  /**
   * Map row to camelCase Category object
   */
  mapCategoryRow(row) {
    return {
      id: row.id,
      slug: row.slug,
      nameEn: row.nameEn || row.name_en,
      nameAr: row.nameAr || row.name_ar,
      descriptionEn: row.descriptionEn || row.description_en || "",
      descriptionAr: row.descriptionAr || row.description_ar || "",
      image: row.image || "",
      active: row.active !== 0 && row.active !== false,
      displayOrder: Number(row.displayOrder || row.display_order || 0),
      createdAt: row.createdAt || row.created_at,
      updatedAt: row.updatedAt || row.updated_at
    };
  }
};
var categoryService = new MySQLCategoryService();

// server/services/authService.ts
var MySQLAuthService = class {
  /**
   * Seed Initial Luxury Boutique Demo Users (Admin and Verified Customer) into MySQL
   */
  async seedDefaultUsers() {
    try {
      const existingAdmin = await this.findUserByEmail("admin@thebedtimestore.bh");
      if (!existingAdmin) {
        console.log(" Seeding default administrator account...");
        await executeQuery(SQL_REGISTER_USER, [
          "usr-admin-01",
          "admin@thebedtimestore.bh",
          "Admin@Bedtime2026!",
          "Reem",
          "Al Mansoor",
          "+973 3922 8899",
          "admin",
          0,
          1,
          JSON.stringify([
            {
              id: "addr-admin-01",
              buildingNumber: "Boutique 10",
              roadNumber: "Road 3812",
              blockNumber: "Block 338",
              area: "Adliya",
              city: "Manama",
              country: "Bahrain",
              isDefault: true
            }
          ]),
          JSON.stringify(["prod-1", "prod-3"]),
          JSON.stringify({ google: true, email: true })
        ]);
      }
      const existingCustomer = await this.findUserByEmail("fatima@thebedtimestore.bh");
      if (!existingCustomer) {
        console.log("[MySQL] Seeding default verified customer account...");
        await executeQuery(SQL_REGISTER_USER, [
          "usr-customer-01",
          "fatima@thebedtimestore.bh",
          "LuxurySilk@2026",
          "Fatima",
          "Al Khalifa",
          "+973 3922 1144",
          "customer",
          0,
          0,
          JSON.stringify([
            {
              id: "addr-cust-01",
              buildingNumber: "Villa 24",
              roadNumber: "Road 3812",
              blockNumber: "Block 338",
              area: "Adliya",
              city: "Manama",
              country: "Bahrain",
              isDefault: true
            }
          ]),
          JSON.stringify(["prod-1", "prod-2", "prod-5"]),
          JSON.stringify({ google: true, email: true })
        ]);
      }
    } catch (err) {
      console.warn(" Notice during user seeding:", err?.message);
    }
  }
  /**
   * Find user by email using MySQL query
   */
  async findUserByEmail(email) {
    const rows = await executeQuery(SQL_FIND_USER_BY_EMAIL, [email]);
    if (!rows || rows.length === 0) return null;
    return this.mapUserRow(rows[0]);
  }
  /**
   * Find user by primary ID using MySQL query
   */
  async findUserById(id) {
    const rows = await executeQuery(SQL_FIND_USER_BY_ID, [id]);
    if (!rows || rows.length === 0) return null;
    return this.mapUserRow(rows[0]);
  }
  /**
   * Register a new user in MySQL
   */
  async register(userData) {
    const existing = await this.findUserByEmail(userData.email);
    if (existing) {
      throw new Error("An account with this email already exists in our database.");
    }
    const userId = `usr-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const role = userData.role || (userData.email.toLowerCase().includes("admin") ? "admin" : "customer");
    await executeQuery(SQL_REGISTER_USER, [
      userId,
      userData.email.toLowerCase().trim(),
      userData.password || "GuestPassword@2026",
      userData.firstName.trim(),
      userData.lastName.trim(),
      userData.phone || "",
      role,
      userData.isGuest ? 1 : 0,
      0,
      // two_factor_enabled
      JSON.stringify([]),
      // saved_addresses
      JSON.stringify([]),
      // wishlist
      JSON.stringify({ email: true })
      // connected_providers
    ]);
    await this.logSecurityEvent({
      userId,
      action: userData.isGuest ? "guest_login" : "register_success",
      ip: userData.ip || "127.0.0.1",
      location: "Manama, Bahrain",
      device: userData.device || "Web Browser"
    });
    const user = await this.findUserById(userId);
    const token = `bds-jwt-${userId}-${Date.now()}`;
    return { user, token };
  }
  /**
   * Authenticate / Login user against MySQL database
   */
  async login(email, passwordAttempt, meta) {
    const rows = await executeQuery(SQL_FIND_USER_BY_EMAIL, [email]);
    if (!rows || rows.length === 0) {
      throw new Error("Invalid credentials. No user found with this email in  database.");
    }
    const rawUser = rows[0];
    const passwordHash = rawUser.password_hash || rawUser.password;
    if (passwordHash && passwordHash !== passwordAttempt) {
      await this.logSecurityEvent({
        userId: rawUser.id,
        action: "login_failed",
        ip: meta?.ip || "127.0.0.1",
        location: "Manama, Bahrain",
        device: meta?.device || "Web Browser"
      });
      throw new Error("Invalid password for this account.");
    }
    await this.logSecurityEvent({
      userId: rawUser.id,
      action: "login_success",
      ip: meta?.ip || "127.0.0.1",
      location: "Manama, Bahrain",
      device: meta?.device || "Web Browser"
    });
    const user = this.mapUserRow(rawUser);
    const token = `bds-jwt-${user.id}-${Date.now()}`;
    return { user, token };
  }
  /**
   * Update password in MySQL
   */
  async updatePassword(userId, newPassword) {
    await executeQuery(SQL_UPDATE_USER_PASSWORD, [newPassword, userId]);
    await this.logSecurityEvent({
      userId,
      action: "password_change",
      ip: "127.0.0.1",
      location: "Manama, Bahrain",
      device: "Web Client"
    });
    return true;
  }
  /**
   * Update user profile in MySQL
   */
  async updateProfile(userId, profile) {
    await executeQuery(SQL_UPDATE_USER_PROFILE, [profile.firstName, profile.lastName, profile.phone || "", userId]);
    return await this.findUserById(userId);
  }
  /**
   * Log security action
   */
  async logSecurityEvent(entry) {
    const logId = `log-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    try {
      await executeQuery(SQL_INSERT_SECURITY_LOG, [
        logId,
        entry.userId,
        entry.action,
        entry.ip,
        entry.location || "Bahrain",
        entry.device || "Desktop"
      ]);
    } catch (err) {
      console.warn("[MySQL] Failed to write security log:", err?.message);
    }
  }
  /**
   * Fetch user security logs from MySQL
   */
  async getUserSecurityLogs(userId) {
    const rows = await executeQuery(SQL_GET_USER_SECURITY_LOGS, [userId]);
    return rows.map((r) => ({
      id: r.id,
      timestamp: r.created_at,
      action: r.action,
      ip: r.ip,
      location: r.location,
      device: r.device
    }));
  }
  /**
   * Retrieve all boutique administrators from MySQL database
   */
  async getAllAdmins() {
    const rows = await executeQuery(SQL_SELECT_ALL_ADMINS, []);
    return (rows || []).map((r) => this.mapUserRow(r));
  }
  /**
   * Create New Boutique Administrator Account (Admin Role Only)
   */
  async createAdmin(adminData) {
    const cleanEmail = adminData.email.toLowerCase().trim();
    const existing = await this.findUserByEmail(cleanEmail);
    if (existing) {
      throw new Error(`An account with email "${cleanEmail}" already exists in the MySQL database.`);
    }
    const userId = `usr-admin-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const role = "admin";
    await executeQuery(SQL_REGISTER_USER, [
      userId,
      cleanEmail,
      adminData.password || "Admin@Bedtime2026!",
      adminData.firstName.trim(),
      adminData.lastName.trim(),
      adminData.phone || "+973 1722 8844",
      role,
      0,
      // is_guest: false
      0,
      // two_factor_enabled: false initially
      JSON.stringify([]),
      // saved_addresses
      JSON.stringify([]),
      // wishlist
      JSON.stringify({ email: true })
      // connected_providers
    ]);
    await this.logSecurityEvent({
      userId,
      action: "admin_created",
      ip: adminData.ip || "127.0.0.1",
      location: "Manama, Bahrain",
      device: adminData.device || `Created by Administrator (${adminData.createdByAdminId || "Staff"})`
    });
    const createdAdmin = await this.findUserById(userId);
    return createdAdmin;
  }
  /**
   * Helper to map relational row to camelCase TypeScript object
   */
  mapUserRow(row) {
    const parseJson2 = (val) => {
      if (!val) return [];
      if (typeof val === "string") {
        try {
          return JSON.parse(val);
        } catch {
          return [];
        }
      }
      return val;
    };
    return {
      id: row.id,
      email: row.email,
      firstName: row.first_name || row.firstName,
      lastName: row.last_name || row.lastName,
      phone: row.phone,
      role: row.role || "customer",
      isGuest: Boolean(row.is_guest || row.isGuest),
      twoFactorEnabled: Boolean(row.two_factor_enabled || row.twoFactorEnabled),
      savedAddresses: parseJson2(row.saved_addresses || row.savedAddresses),
      wishlist: parseJson2(row.wishlist),
      connectedProviders: parseJson2(row.connected_providers || row.connectedProviders),
      createdAt: row.created_at || row.createdAt,
      updatedAt: row.updated_at || row.updatedAt
    };
  }
};
var authService = new MySQLAuthService();

// server/services/salesService.ts
var MySQLSalesService = class {
  /**
   * Seed Initial Historical Product Sales from Seed Orders into MySQL
   */
  async seedInitialSalesIfNeeded() {
    try {
      const rows = await executeQuery(SQL_COUNT_PRODUCT_SALES);
      const count = rows && rows.length > 0 ? Number(rows[0].total) : 0;
      if (count === 0) {
        console.log("[MySQL] Seeding initial historical product sales records...");
        for (const order of INITIAL_ORDERS) {
          await this.recordOrderSales({
            id: order.id,
            orderNumber: order.orderNumber,
            userId: order.userId,
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            customerPhone: order.customerPhone,
            paymentMethod: order.paymentMethod,
            paymentStatus: order.paymentStatus,
            deliveryAddress: order.shippingAddress,
            items: (order.items || []).map((it) => {
              const matchedProd = INITIAL_PRODUCTS.find((p) => p.id === it.productId);
              return {
                productId: it.productId,
                productSku: matchedProd?.sku || `SKU-${it.productId}`,
                productNameEn: matchedProd?.nameEn || "Luxury Nightwear Item",
                productNameAr: matchedProd?.nameAr || "\u0642\u0637\u0639\u0629 \u0645\u0644\u0627\u0628\u0633 \u0646\u0648\u0645 \u0641\u0627\u062E\u0631\u0629",
                categoryId: matchedProd?.categoryId || "cat-nightwear",
                categoryNameEn: matchedProd?.categoryNameEn || "Nightwear",
                size: it.size,
                colorName: it.color,
                unitPrice: it.unitPrice,
                quantity: it.quantity,
                totalAmount: it.totalPrice ?? it.unitPrice * it.quantity
              };
            })
          });
        }
        console.log("[MySQL] Seeded initial product sales transactions into MySQL.");
      }
    } catch (err) {
      console.warn("[MySQL] Sales seeding notice:", err?.message);
    }
  }
  /**
   * Record all product line-item sales from an order into MySQL
   */
  async recordOrderSales(orderData) {
    const recordedSales = [];
    for (let i = 0; i < orderData.items.length; i++) {
      const item = orderData.items[i];
      const saleId = `sale-${orderData.orderNumber}-${i + 1}-${Date.now().toString().slice(-4)}`;
      const totalAmount = item.totalAmount ?? Number((item.unitPrice * item.quantity).toFixed(3));
      const saleRecord = {
        id: saleId,
        orderId: orderData.id,
        orderNumber: orderData.orderNumber,
        productId: item.productId,
        productSku: item.productSku || `BDS-${item.productId}`,
        productNameEn: item.productNameEn || "Luxury Nightwear Garment",
        productNameAr: item.productNameAr || "\u0645\u0644\u0627\u0628\u0633 \u0646\u0648\u0645 \u0641\u0627\u062E\u0631\u0629",
        categoryId: item.categoryId || "cat-silk-nightwear",
        categoryNameEn: item.categoryNameEn || "Nightwear",
        variantSize: item.size || "M",
        variantColorName: item.colorName || "Default",
        variantColorHex: item.colorHex || "#340404",
        unitPrice: Number(item.unitPrice),
        quantity: Number(item.quantity),
        totalAmount,
        currency: "BHD",
        paymentMethod: orderData.paymentMethod || "benefit_pay",
        paymentStatus: orderData.paymentStatus || "Paid",
        customerId: orderData.userId,
        customerName: orderData.customerName,
        customerEmail: orderData.customerEmail,
        customerArea: orderData.deliveryAddress?.area || "Adliya",
        customerCity: orderData.deliveryAddress?.city || "Manama",
        saleDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
      };
      await executeQuery(SQL_INSERT_PRODUCT_SALE, [
        saleRecord.id,
        saleRecord.orderId,
        saleRecord.orderNumber,
        saleRecord.productId,
        saleRecord.productSku,
        saleRecord.productNameEn,
        saleRecord.productNameAr,
        saleRecord.categoryId,
        saleRecord.categoryNameEn,
        saleRecord.variantSize,
        saleRecord.variantColorName,
        saleRecord.variantColorHex,
        saleRecord.unitPrice,
        saleRecord.quantity,
        saleRecord.totalAmount,
        saleRecord.currency,
        saleRecord.paymentMethod,
        saleRecord.paymentStatus,
        saleRecord.customerId,
        saleRecord.customerName,
        saleRecord.customerEmail,
        saleRecord.customerArea,
        saleRecord.customerCity
      ]);
      recordedSales.push(saleRecord);
    }
    return {
      success: true,
      recordedSalesCount: recordedSales.length,
      sales: recordedSales
    };
  }
  /**
   * Get all product sales transactions (paginated)
   */
  async getAllSales(limit = 50, offset = 0) {
    const rows = await executeQuery(SQL_SELECT_ALL_PRODUCT_SALES, [limit, offset]);
    return rows;
  }
  /**
   * Get product sales analytics and aggregations
   */
  async getSalesAnalytics(topLimit = 8) {
    const [summaryRows, topProducts, salesByCategory, salesByPaymentMethod, salesByRegion, dailyTrend] = await Promise.all([
      executeQuery(SQL_SELECT_SALES_OVERALL_SUMMARY),
      executeQuery(SQL_SELECT_TOP_SELLING_PRODUCTS, [topLimit]),
      executeQuery(SQL_SELECT_SALES_BY_CATEGORY),
      executeQuery(SQL_SELECT_SALES_BY_PAYMENT_METHOD),
      executeQuery(SQL_SELECT_SALES_BY_BAHRAIN_AREA),
      executeQuery(SQL_SELECT_DAILY_SALES_TREND)
    ]);
    const summary = summaryRows && summaryRows.length > 0 ? summaryRows[0] : {
      totalSaleItems: 0,
      totalOrders: 0,
      distinctProductsSold: 0,
      totalUnitsSold: 0,
      grossRevenueBHD: 0,
      averageItemValueBHD: 0
    };
    return {
      summary,
      topProducts,
      salesByCategory,
      salesByPaymentMethod,
      salesByRegion,
      dailyTrend
    };
  }
  /**
   * Get sales by specific product
   */
  async getSalesByProduct(productIdOrSku) {
    return await executeQuery(SQL_SELECT_SALES_BY_PRODUCT, [productIdOrSku, productIdOrSku]);
  }
  /**
   * Get sales for a specific order
   */
  async getSalesByOrder(orderIdOrNumber) {
    return await executeQuery(SQL_SELECT_SALES_BY_ORDER, [orderIdOrNumber, orderIdOrNumber]);
  }
  /**
   * Get aggregated customer purchases summary (user-product purchasing profiles)
   */
  async getCustomerPurchasesSummary() {
    return await executeQuery(SQL_SELECT_CUSTOMER_PURCHASES_SUMMARY);
  }
  /**
   * Get detailed product purchase history for a specific customer
   */
  async getCustomerPurchasesDetail(customerIdOrEmail) {
    return await executeQuery(SQL_SELECT_SALES_BY_CUSTOMER, [customerIdOrEmail, customerIdOrEmail]);
  }
  /**
   * Get all customers who purchased a specific product
   */
  async getProductBuyers(productIdOrSku) {
    return await executeQuery(SQL_SELECT_BUYERS_BY_PRODUCT, [productIdOrSku, productIdOrSku]);
  }
};
var salesService = new MySQLSalesService();

// server/services/orderService.ts
var MySQLOrderService = class {
  /**
   * Seed initial orders into MySQL if empty
   */
  async seedIfNeeded() {
    try {
      const rows = await executeQuery("SELECT COUNT(*) AS total FROM orders");
      const count = rows && rows.length > 0 ? Number(rows[0].total) : 0;
      if (count === 0) {
        console.log("[MySQL] Seeding default orders into MySQL database...");
        for (const order of INITIAL_ORDERS) {
          await this.createOrder(order);
        }
        console.log(`[MySQL] Seeded ${INITIAL_ORDERS.length} sample orders.`);
      }
    } catch (err) {
      console.warn("[MySQL] Orders seeding notice:", err?.message);
    }
  }
  /**
   * Get all orders dynamically from MySQL
   */
  async getOrders() {
    try {
      const rows = await executeQuery(SQL_SELECT_ALL_ORDERS);
      if (rows && Array.isArray(rows)) {
        return rows.map(this.mapOrderRow);
      }
    } catch (err) {
      console.warn("[MySQL] Failed to fetch orders from database:", err?.message);
    }
    return [];
  }
  /**
   * Get orders for a specific user ID or email
   */
  async getOrdersByUser(userId, email) {
    try {
      const rows = await executeQuery(SQL_SELECT_ORDERS_BY_USER, [userId, email]);
      if (rows && Array.isArray(rows)) {
        return rows.map(this.mapOrderRow);
      }
    } catch (err) {
      console.warn("[MySQL] Failed to fetch user orders:", err?.message);
    }
    return [];
  }
  /**
   * Get single order by ID or order number
   */
  async getOrderById(idOrNumber) {
    try {
      const rows = await executeQuery(SQL_SELECT_ORDER_BY_ID, [idOrNumber, idOrNumber]);
      if (rows && rows.length > 0) {
        return this.mapOrderRow(rows[0]);
      }
    } catch (err) {
      console.warn("[MySQL] Error fetching order by ID/number:", err?.message);
    }
    return null;
  }
  /**
   * Create new order in MariaDB/MySQL with ACID transaction:
   * 1. Insert order record
   * 2. Insert line items into product_sales table
   * 3. Decrement variant stock on products table
   */
  async createOrder(orderData) {
    const id = orderData.id || `ord-${Date.now()}`;
    const orderNumber = orderData.orderNumber || `BDS-${Date.now().toString().slice(-6)}`;
    const items = Array.isArray(orderData.items) ? orderData.items : [];
    const shippingAddress = orderData.shippingAddress || orderData.deliveryAddress || {};
    const subtotal = Number(orderData.subtotal || 0);
    const discount = Number(orderData.discount || 0);
    const shippingFee = Number(orderData.shippingFee || 0);
    const total = Number(orderData.total || subtotal - discount + shippingFee);
    const orderStatus = orderData.orderStatus || orderData.order_status || "Confirmed";
    const paymentStatus = orderData.paymentStatus || orderData.payment_status || "Pending";
    const paymentMethod = orderData.paymentMethod || orderData.payment_method || "BenefitPay";
    const pinCode = orderData.pinCode || orderData.pin_code || orderData.deliveryVerificationCode || null;
    const orderParams = [
      id,
      orderNumber,
      orderData.userId || null,
      orderData.customerName,
      orderData.customerEmail,
      orderData.customerPhone,
      stringifyJson(shippingAddress, {}),
      stringifyJson(items, []),
      subtotal,
      discount,
      shippingFee,
      total,
      orderStatus,
      paymentStatus,
      paymentMethod,
      pinCode
    ];
    await withTransaction(async (conn) => {
      if (conn) {
        await conn.execute(SQL_INSERT_ORDER, sanitizeParams(orderParams));
        for (let idx = 0; idx < items.length; idx++) {
          const item = items[idx];
          const saleId = `sale-${Date.now()}-${idx}`;
          const saleParams = [
            saleId,
            id,
            orderNumber,
            item.productId || `prod-${idx}`,
            item.sku || `SKU-${idx}`,
            item.nameEn || item.name || "Sleepwear Item",
            item.nameAr || item.name || "\u0645\u0644\u0627\u0628\u0633 \u0646\u0648\u0645",
            item.categoryId || null,
            item.categoryNameEn || null,
            item.size || null,
            item.color || item.colorName || null,
            item.colorHex || null,
            Number(item.price || 0),
            Number(item.quantity || 1),
            Number((item.price || 0) * (item.quantity || 1)),
            "BHD",
            paymentMethod,
            paymentStatus === "Paid" ? "Paid" : "Pending",
            orderData.userId || null,
            orderData.customerName || null,
            orderData.customerEmail || null,
            shippingAddress.area || null,
            shippingAddress.city || "Manama"
          ];
          await conn.execute(SQL_INSERT_PRODUCT_SALE, sanitizeParams(saleParams));
          if (item.productId) {
            try {
              const [prodRows] = await conn.execute(
                "SELECT variants FROM products WHERE id = ?",
                [item.productId]
              );
              if (prodRows && prodRows.length > 0) {
                const variants = parseJson(prodRows[0].variants, []);
                const updatedVariants = variants.map((v) => {
                  const matches = v.size && item.size && v.size.toLowerCase() === item.size.toLowerCase() || v.sku && item.sku && v.sku === item.sku;
                  if (matches) {
                    return {
                      ...v,
                      stock: Math.max(0, (Number(v.stock) || 0) - (Number(item.quantity) || 1))
                    };
                  }
                  return v;
                });
                await conn.execute(SQL_UPDATE_PRODUCT_VARIANTS, [
                  stringifyJson(updatedVariants, []),
                  item.productId
                ]);
              }
            } catch (stockErr) {
              console.warn("[MySQL] Variant stock deduction notice:", stockErr?.message);
            }
          }
        }
      } else {
        await executeQuery(SQL_INSERT_ORDER, orderParams);
      }
    });
    const created = await this.getOrderById(id);
    return created || {
      id,
      orderNumber,
      userId: orderData.userId,
      customerName: orderData.customerName,
      customerEmail: orderData.customerEmail,
      customerPhone: orderData.customerPhone,
      shippingAddress,
      deliveryOption: "standard",
      shippingFee,
      subtotal,
      discount,
      total,
      currency: "BHD",
      paymentMethod,
      paymentTransactionId: `TX-${orderNumber}`,
      paymentStatus,
      orderStatus,
      items,
      deliveryVerificationCode: pinCode,
      statusHistory: [
        {
          status: orderStatus,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          note: "Order placed and written to MariaDB"
        }
      ],
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  /**
   * Update order in MariaDB/MySQL
   */
  async updateOrder(id, updates) {
    const existing = await this.getOrderById(id);
    if (!existing) {
      throw new Error(`Order with ID ${id} not found in database`);
    }
    const merged = {
      customerName: updates.customerName !== void 0 ? updates.customerName : existing.customerName,
      customerEmail: updates.customerEmail !== void 0 ? updates.customerEmail : existing.customerEmail,
      customerPhone: updates.customerPhone !== void 0 ? updates.customerPhone : existing.customerPhone,
      deliveryAddress: stringifyJson(updates.shippingAddress || updates.deliveryAddress || existing.shippingAddress),
      items: stringifyJson(updates.items || existing.items),
      subtotal: updates.subtotal !== void 0 ? Number(updates.subtotal) : existing.subtotal,
      discount: updates.discount !== void 0 ? Number(updates.discount) : existing.discount,
      shippingFee: updates.shippingFee !== void 0 ? Number(updates.shippingFee) : existing.shippingFee,
      total: updates.total !== void 0 ? Number(updates.total) : existing.total,
      orderStatus: updates.orderStatus || updates.order_status || existing.orderStatus,
      paymentStatus: updates.paymentStatus || updates.payment_status || existing.paymentStatus,
      paymentMethod: updates.paymentMethod || updates.payment_method || existing.paymentMethod,
      pinCode: updates.pinCode || updates.pin_code || updates.deliveryVerificationCode || existing.deliveryVerificationCode || null,
      trackingNumber: updates.trackingNumber || updates.tracking_number || existing.paymentTransactionId || null
    };
    await executeQuery(SQL_UPDATE_ORDER, [
      merged.customerName,
      merged.customerEmail,
      merged.customerPhone,
      merged.deliveryAddress,
      merged.items,
      merged.subtotal,
      merged.discount,
      merged.shippingFee,
      merged.total,
      merged.orderStatus,
      merged.paymentStatus,
      merged.paymentMethod,
      merged.pinCode,
      merged.trackingNumber,
      id
    ]);
    return await this.getOrderById(id);
  }
  /**
   * Delete order from MariaDB/MySQL
   */
  async deleteOrder(id) {
    await executeQuery(SQL_DELETE_ORDER, [id]);
    return true;
  }
  /**
   * Update order status in MySQL
   */
  async updateOrderStatus(orderId, status) {
    await executeQuery(SQL_UPDATE_ORDER_STATUS, [status, orderId, orderId]);
    return true;
  }
  /**
   * Confirm pay on delivery payment in MySQL
   */
  async confirmDeliveryPayment(orderId) {
    await executeQuery(SQL_CONFIRM_ORDER_PAYMENT, [orderId, orderId]);
    return true;
  }
  mapOrderRow(row) {
    const parseJson2 = (val) => {
      if (!val) return val;
      if (typeof val === "string") {
        try {
          return JSON.parse(val);
        } catch {
          return val;
        }
      }
      return val;
    };
    return {
      id: row.id,
      orderNumber: row.orderNumber,
      userId: row.userId,
      customerName: row.customerName,
      customerEmail: row.customerEmail,
      customerPhone: row.customerPhone,
      shippingAddress: parseJson2(row.deliveryAddress) || {},
      deliveryOption: "standard",
      shippingFee: Number(row.shippingFee || 0),
      subtotal: Number(row.subtotal || 0),
      discount: Number(row.discount || 0),
      total: Number(row.total || 0),
      currency: "BHD",
      paymentMethod: row.paymentMethod,
      paymentTransactionId: row.paymentTransactionId || row.trackingNumber || `TX-${row.orderNumber}`,
      paymentStatus: row.paymentStatus,
      orderStatus: row.orderStatus,
      items: parseJson2(row.items) || [],
      deliveryVerificationCode: row.pinCode,
      statusHistory: [
        { status: "Confirmed", timestamp: row.createdAt || (/* @__PURE__ */ new Date()).toISOString() },
        { status: row.orderStatus, timestamp: row.updatedAt || row.createdAt || (/* @__PURE__ */ new Date()).toISOString() }
      ],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }
};
var orderService = new MySQLOrderService();

// server/routes/api.ts
import express from "express";

// server/services/PaymentService.ts
var ServerVisaProvider = class {
  constructor() {
    this.name = "Visa";
  }
  async initiatePayment(payload) {
    const txId = `VISA-GATEWAY-${Date.now()}-${Math.floor(1e4 + Math.random() * 9e4)}`;
    return {
      success: true,
      transactionId: txId,
      authorizationCode: `AUTH-VISA-3DS-${Math.floor(1e5 + Math.random() * 9e5)}`,
      paymentMethod: "visa_mastercard",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: "SUCCESS"
    };
  }
  async verifyWebhook(signature, payload) {
    return true;
  }
};
var ServerMyFatoorahProvider = class {
  constructor() {
    this.name = "myfatoorah";
  }
  async initiatePayment(payload) {
    const txId = `MF-${Date.now()}-${Math.floor(1e3 + Math.random() * 9e3)}`;
    return {
      success: true,
      transactionId: txId,
      authorizationCode: `AUTH-MF-${Math.floor(1e5 + Math.random() * 9e5)}`,
      paymentMethod: "myfatoorah",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: "SUCCESS"
    };
  }
  async verifyWebhook(_signature, _payload) {
    return true;
  }
  async sendReceipt(payload) {
    return {
      success: true,
      receiptNumber: `RCPT-BDS-${payload.orderNumber || Date.now()}-${Math.floor(1e3 + Math.random() * 9e3)}`,
      message: `Receipt dispatched to ${payload.customerEmail || "customer"}`
    };
  }
};
var ServerBenefitPayProvider = class {
  constructor() {
    this.name = "benefit_pay";
  }
  async initiatePayment(payload) {
    const txId = `BENEFIT-BH-${Date.now()}-${Math.floor(1e3 + Math.random() * 9e3)}`;
    return {
      success: true,
      transactionId: txId,
      authorizationCode: `AUTH-BENEFIT-${Math.floor(1e5 + Math.random() * 9e5)}`,
      paymentMethod: "benefit_pay",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: "SUCCESS"
    };
  }
  async verifyWebhook(_signature, _payload) {
    return true;
  }
};
var ServerApplePayProvider = class {
  constructor() {
    this.name = "apple_pay";
  }
  async initiatePayment(payload) {
    const txId = `APPLEPAY-${Date.now()}-${Math.floor(1e3 + Math.random() * 9e3)}`;
    return {
      success: true,
      transactionId: txId,
      authorizationCode: `AUTH-APPL-${Math.floor(1e5 + Math.random() * 9e5)}`,
      paymentMethod: "apple_pay",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: "SUCCESS"
    };
  }
  async verifyWebhook(_signature, _payload) {
    return true;
  }
};
var ServerCashOnDeliveryProvider = class {
  constructor() {
    this.name = "cash_on_delivery";
  }
  async initiatePayment(payload) {
    const txId = `COD-${Date.now()}-${Math.floor(1e3 + Math.random() * 9e3)}`;
    return {
      success: true,
      transactionId: txId,
      authorizationCode: `COD-CONFIRMED-${Math.floor(1e3 + Math.random() * 9e3)}`,
      paymentMethod: "cash_on_delivery",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: "SUCCESS"
    };
  }
  async verifyWebhook(_signature, _payload) {
    return true;
  }
};
var ServerPaymentService = class {
  constructor() {
    this.providers = {
      visa_mastercard: new ServerVisaProvider(),
      myfatoorah: new ServerMyFatoorahProvider(),
      benefit_pay: new ServerBenefitPayProvider(),
      apple_pay: new ServerApplePayProvider(),
      cash_on_delivery: new ServerCashOnDeliveryProvider()
    };
  }
  getProvider(method) {
    const provider = this.providers[method] || this.providers["myfatoorah"] || this.providers["visa_mastercard"];
    return provider;
  }
  async process(method, payload) {
    const provider = this.getProvider(method);
    return await provider.initiatePayment(payload);
  }
};
var serverPaymentService = new ServerPaymentService();

// server/cache.ts
var CacheManager = class {
  constructor() {
    this.store = /* @__PURE__ */ new Map();
    this.hits = 0;
    this.misses = 0;
  }
  buildKey(key) {
    return `${config.appVersion}:${key}`;
  }
  get(rawKey) {
    const key = this.buildKey(rawKey);
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      if (config.isDev) {
        console.log(`[Cache MISS] ${rawKey}`);
      }
      return null;
    }
    if (Date.now() > entry.expiresAt || entry.version !== config.appVersion) {
      this.store.delete(key);
      this.misses++;
      if (config.isDev) {
        console.log(`[Cache EXPIRED] ${rawKey}`);
      }
      return null;
    }
    this.hits++;
    if (config.isDev) {
      console.log(`[Cache HIT] ${rawKey} (TTL remaining: ${Math.round((entry.expiresAt - Date.now()) / 1e3)}s)`);
    }
    return entry.value;
  }
  set(rawKey, value, customTtlMs) {
    const key = this.buildKey(rawKey);
    const ttl = customTtlMs || config.cacheTtlMs;
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttl,
      version: config.appVersion
    });
    if (config.isDev) {
      console.log(`[Cache SET] ${rawKey} (TTL: ${Math.round(ttl / 1e3)}s)`);
    }
  }
  del(rawKey) {
    const key = this.buildKey(rawKey);
    this.store.delete(key);
    if (config.isDev) {
      console.log(`[Cache DEL] ${rawKey}`);
    }
  }
  delete(rawKey) {
    this.del(rawKey);
  }
  invalidatePrefix(prefix) {
    const fullPrefix = `${config.appVersion}:${prefix}`;
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(fullPrefix)) {
        this.store.delete(key);
        count++;
      }
    }
    if (config.isDev) {
      console.log(`[Cache INVALIDATE] Cleared ${count} entries matching prefix "${prefix}"`);
    }
  }
  clear() {
    const count = this.store.size;
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
    console.log(`[Cache CLEAR] Cleared all ${count} entries.`);
    return { clearedCount: count };
  }
  getStats() {
    return {
      entriesCount: this.store.size,
      hits: this.hits,
      misses: this.misses,
      ttlMs: config.cacheTtlMs,
      ttlSeconds: Math.round(config.cacheTtlMs / 1e3),
      appVersion: config.appVersion,
      environment: config.env
    };
  }
};
var appCache = new CacheManager();

// server/routes/api.ts
var router = express.Router();
var DB_FREE_PREFIXES = ["/health", "/payments", "/auth/logout"];
var INTERNAL_PREFIXES = ["/db/", "/cache/"];
router.use((req, res, next) => {
  if (config.isProd && INTERNAL_PREFIXES.some((p) => req.path.startsWith(p))) {
    return res.status(404).json({ error: "Not found" });
  }
  if (DB_FREE_PREFIXES.some((p) => req.path.startsWith(p)) || INTERNAL_PREFIXES.some((p) => req.path.startsWith(p))) {
    return next();
  }
  if (isDatabaseAvailable()) return next();
  const status = getDatabaseStatus();
  console.error(`[503] ${req.method} ${req.originalUrl} blocked: database not connected (${status.errorCode || "unknown"})`);
  return res.status(503).json({
    error: "The database is unavailable, so nothing was saved. Please try again shortly.",
    code: "DB_UNAVAILABLE",
    reason: status.errorCode || null,
    // Detailed, host-specific hint only outside production
    ...config.isDev ? { sqlMessage: status.error || null } : {}
  });
});
var VALID_ORDER_STATUSES = ["Confirmed", "Preparing", "Shipped", "Delivered", "Cancelled"];
var VALID_PAYMENT_STATUSES = ["Pending", "Paid", "Failed", "Refunded"];
var VALID_ROLES = ["customer", "admin", "superadmin"];
function validateRole(role) {
  if (!role) return true;
  return VALID_ROLES.includes(role);
}
function validateOrderStatus(status) {
  if (!status) return true;
  return VALID_ORDER_STATUSES.includes(status);
}
function validatePaymentStatus(status) {
  if (!status) return true;
  return VALID_PAYMENT_STATUSES.includes(status);
}
function formatErrorResponse(err, statusCode = 500) {
  const code = err?.code || (statusCode === 400 ? "VALIDATION_ERROR" : "DATABASE_ERROR");
  const sqlMessage = err?.sqlMessage || null;
  const message = err?.message || (statusCode === 400 ? "Validation error" : "Database execution failure");
  console.error("[API / Database Error]", {
    statusCode,
    code,
    sqlMessage,
    message
  });
  return {
    error: message,
    code,
    sqlMessage
  };
}
router.get("/cache/stats", (_req, res) => {
  return res.json({
    success: true,
    stats: appCache.getStats(),
    env: config.env,
    ttlMs: config.cacheTtlMs
  });
});
router.post("/auth/register", async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, isGuest, role } = req.body;
    if (!email) {
      return res.status(400).json(formatErrorResponse(new Error("Email address is required"), 400));
    }
    if (!firstName) {
      return res.status(400).json(formatErrorResponse(new Error("First name is required"), 400));
    }
    if (role && !validateRole(role)) {
      return res.status(400).json(formatErrorResponse(new Error(`Invalid role '${role}'. Must be customer, admin, or superadmin`), 400));
    }
    const clientIp = req.headers["x-forwarded-for"]?.toString() || req.socket.remoteAddress || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "Web Browser";
    const result = await authService.register({
      firstName,
      lastName: lastName || "",
      email,
      phone,
      password: password || "GuestPass@2026",
      role: role || "customer",
      isGuest: Boolean(isGuest),
      ip: clientIp,
      device: userAgent
    });
    return res.status(201).json({
      success: true,
      message: isGuest ? "Guest shopper session initialized in MySQL" : "User account created successfully in MySQL",
      user: result.user,
      token: result.token
    });
  } catch (error) {
    return res.status(400).json(formatErrorResponse(error, 400));
  }
});
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const clientIp = req.headers["x-forwarded-for"]?.toString() || req.socket.remoteAddress || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "Web Browser";
    const result = await authService.login(email, password, {
      ip: clientIp,
      device: userAgent
    });
    return res.json({
      success: true,
      message: "Authenticated successfully against MySQL database",
      user: result.user,
      token: result.token
    });
  } catch (error) {
    return res.status(401).json({ error: error?.message || "Authentication failed" });
  }
});
router.get("/auth/user/:id", async (req, res) => {
  try {
    const user = await authService.findUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found in MySQL database" });
    }
    return res.json({ success: true, user });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Failed to fetch user" });
  }
});
router.post("/auth/password", async (req, res) => {
  try {
    const { userId, newPassword } = req.body;
    if (!userId || !newPassword) {
      return res.status(400).json({ error: "userId and newPassword are required" });
    }
    await authService.updatePassword(userId, newPassword);
    return res.json({ success: true, message: "Password updated in MySQL database" });
  } catch (error) {
    return res.status(400).json({ error: error?.message || "Password update failed" });
  }
});
router.get("/auth/logs/:userId", async (req, res) => {
  try {
    const logs = await authService.getUserSecurityLogs(req.params.userId);
    return res.json({ success: true, logs });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Failed to fetch security logs" });
  }
});
router.post("/admin/create-admin", async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, createdByAdminId } = req.body;
    if (!email || !firstName || !password) {
      return res.status(400).json({ error: "First name, official email, and password are required." });
    }
    const clientIp = req.headers["x-forwarded-for"]?.toString() || req.socket.remoteAddress || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "Boutique Admin Portal";
    const newAdmin = await authService.createAdmin({
      firstName,
      lastName: lastName || "",
      email,
      phone,
      password,
      createdByAdminId,
      ip: clientIp,
      device: userAgent
    });
    return res.status(201).json({
      success: true,
      message: "New boutique administrator created and registered in MySQL successfully.",
      admin: newAdmin
    });
  } catch (error) {
    return res.status(400).json({ error: error?.message || "Failed to create administrator" });
  }
});
router.get("/admin/administrators", async (_req, res) => {
  try {
    const admins = await authService.getAllAdmins();
    return res.json({ success: true, admins });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Failed to retrieve administrators" });
  }
});
router.post("/auth/logout", (_req, res) => {
  return res.json({ success: true, message: "Logged out successfully" });
});
router.get("/db/status", (_req, res) => {
  return res.json({
    success: true,
    engine: "mysql",
    status: getDatabaseStatus()
  });
});
router.get("/db/queries", (_req, res) => {
  return res.json({
    success: true,
    engine: "mysql",
    tables: [
      { name: "users", ddl: DDL_CREATE_USERS_TABLE },
      { name: "categories", ddl: DDL_CREATE_CATEGORIES_TABLE },
      { name: "products", ddl: DDL_CREATE_PRODUCTS_TABLE },
      { name: "orders", ddl: DDL_CREATE_ORDERS_TABLE },
      { name: "product_sales", ddl: DDL_CREATE_PRODUCT_SALES_TABLE },
      { name: "security_logs", ddl: DDL_CREATE_SECURITY_LOGS_TABLE }
    ],
    sampleQueries: {
      auth: [
        { name: "REGISTER_USER", sql: SQL_REGISTER_USER },
        { name: "FIND_USER_BY_EMAIL", sql: SQL_FIND_USER_BY_EMAIL },
        { name: "FIND_USER_BY_ID", sql: SQL_FIND_USER_BY_ID },
        { name: "UPDATE_USER_PASSWORD", sql: SQL_UPDATE_USER_PASSWORD }
      ],
      categories: [
        { name: "SELECT_ALL_CATEGORIES", sql: SQL_SELECT_ALL_CATEGORIES },
        { name: "INSERT_CATEGORY", sql: SQL_INSERT_CATEGORY },
        { name: "UPDATE_CATEGORY", sql: SQL_UPDATE_CATEGORY },
        { name: "DELETE_CATEGORY", sql: SQL_DELETE_CATEGORY }
      ],
      products: [
        { name: "SELECT_ALL_PRODUCTS", sql: SQL_SELECT_ALL_PRODUCTS },
        { name: "INSERT_PRODUCT", sql: SQL_INSERT_PRODUCT },
        { name: "UPDATE_PRODUCT", sql: SQL_UPDATE_PRODUCT },
        { name: "DELETE_PRODUCT", sql: SQL_DELETE_PRODUCT }
      ],
      orders: [
        { name: "INSERT_ORDER", sql: SQL_INSERT_ORDER },
        { name: "SELECT_ALL_ORDERS", sql: SQL_SELECT_ALL_ORDERS },
        { name: "UPDATE_ORDER_STATUS", sql: SQL_UPDATE_ORDER_STATUS }
      ],
      sales: [
        { name: "INSERT_PRODUCT_SALE", sql: SQL_INSERT_PRODUCT_SALE },
        { name: "SELECT_ALL_PRODUCT_SALES", sql: SQL_SELECT_ALL_PRODUCT_SALES },
        { name: "SELECT_TOP_SELLING_PRODUCTS", sql: SQL_SELECT_TOP_SELLING_PRODUCTS },
        { name: "SELECT_SALES_BY_CATEGORY", sql: SQL_SELECT_SALES_BY_CATEGORY },
        { name: "SELECT_SALES_BY_BAHRAIN_AREA", sql: SQL_SELECT_SALES_BY_BAHRAIN_AREA },
        { name: "SELECT_SALES_OVERALL_SUMMARY", sql: SQL_SELECT_SALES_OVERALL_SUMMARY }
      ]
    }
  });
});
router.get("/categories", async (_req, res) => {
  try {
    const cached = appCache.get("categories:list");
    if (cached) {
      return res.json({
        success: true,
        count: cached.length,
        categories: cached,
        cached: true
      });
    }
    const categories = await categoryService.getCategories();
    appCache.set("categories:list", categories);
    return res.json({
      success: true,
      count: categories.length,
      categories,
      cached: false
    });
  } catch (err) {
    return res.status(500).json(formatErrorResponse(err, 500));
  }
});
router.get("/categories/:id", async (req, res) => {
  try {
    const cacheKey = `category:${req.params.id}`;
    const cached = appCache.get(cacheKey);
    if (cached) {
      return res.json({ success: true, category: cached, cached: true });
    }
    const category = await categoryService.getCategoryById(req.params.id);
    if (!category) return res.status(404).json(formatErrorResponse(new Error("Category not found in MySQL"), 404));
    appCache.set(cacheKey, category);
    return res.json({ success: true, category, cached: false });
  } catch (err) {
    return res.status(500).json(formatErrorResponse(err, 500));
  }
});
router.post("/categories", async (req, res) => {
  try {
    const { nameEn, nameAr, slug, descriptionEn, descriptionAr, image, active, displayOrder } = req.body;
    if (!nameEn) {
      return res.status(400).json(formatErrorResponse(new Error("Category English name is required"), 400));
    }
    const category = await categoryService.addCategory({
      nameEn,
      nameAr: nameAr || nameEn,
      slug,
      descriptionEn,
      descriptionAr,
      image,
      active,
      displayOrder
    });
    appCache.delete("categories:list");
    return res.status(201).json({ success: true, category });
  } catch (err) {
    return res.status(400).json(formatErrorResponse(err, 400));
  }
});
router.put("/categories/:id", async (req, res) => {
  try {
    const category = await categoryService.updateCategory(req.params.id, req.body);
    if (!category) return res.status(404).json(formatErrorResponse(new Error("Category not found in MySQL"), 404));
    appCache.delete("categories:list");
    appCache.delete(`category:${req.params.id}`);
    return res.json({ success: true, category });
  } catch (err) {
    return res.status(400).json(formatErrorResponse(err, 400));
  }
});
router.delete("/categories/:id", async (req, res) => {
  try {
    await categoryService.deleteCategory(req.params.id);
    appCache.delete("categories:list");
    appCache.delete(`category:${req.params.id}`);
    return res.json({ success: true, message: "Category deleted from MySQL database" });
  } catch (err) {
    return res.status(500).json(formatErrorResponse(err, 500));
  }
});
router.get("/products", async (_req, res) => {
  try {
    const cached = appCache.get("products:list");
    if (cached) {
      return res.json({
        success: true,
        count: cached.length,
        products: cached,
        cached: true
      });
    }
    const products = await inventoryService.getProducts();
    appCache.set("products:list", products);
    return res.json({
      success: true,
      count: products.length,
      products,
      cached: false
    });
  } catch (err) {
    return res.status(500).json(formatErrorResponse(err, 500));
  }
});
router.get("/products/:id", async (req, res) => {
  try {
    const cacheKey = `product:${req.params.id}`;
    const cached = appCache.get(cacheKey);
    if (cached) {
      return res.json({ success: true, product: cached, cached: true });
    }
    const product = await inventoryService.getProductById(req.params.id);
    if (!product) return res.status(404).json(formatErrorResponse(new Error("Product not found in MySQL"), 404));
    appCache.set(cacheKey, product);
    return res.json({ success: true, product, cached: false });
  } catch (err) {
    return res.status(500).json(formatErrorResponse(err, 500));
  }
});
router.post("/products", async (req, res) => {
  try {
    const product = await inventoryService.addProduct(req.body);
    appCache.delete("products:list");
    return res.status(201).json({ success: true, product });
  } catch (err) {
    return res.status(400).json(formatErrorResponse(err, 400));
  }
});
router.put("/products/:id", async (req, res) => {
  try {
    const product = await inventoryService.updateProduct(req.params.id, req.body);
    if (!product) return res.status(404).json(formatErrorResponse(new Error("Product not found in MySQL"), 404));
    appCache.delete("products:list");
    appCache.delete(`product:${req.params.id}`);
    return res.json({ success: true, product });
  } catch (err) {
    return res.status(400).json(formatErrorResponse(err, 400));
  }
});
router.delete("/products/:id", async (req, res) => {
  try {
    await inventoryService.deleteProduct(req.params.id);
    appCache.delete("products:list");
    appCache.delete(`product:${req.params.id}`);
    return res.json({ success: true, message: "Product deleted from MySQL database" });
  } catch (err) {
    return res.status(500).json(formatErrorResponse(err, 500));
  }
});
router.post("/products/:id/stock", async (req, res) => {
  try {
    const { skuOrSize, colorHex, delta, absoluteNewStock } = req.body;
    const updated = await inventoryService.adjustStock(
      req.params.id,
      skuOrSize,
      colorHex,
      Number(delta || 0),
      typeof absoluteNewStock === "number" ? absoluteNewStock : void 0
    );
    return res.json({ success: true, product: updated });
  } catch (err) {
    return res.status(400).json({ error: err?.message || "Failed to adjust stock in MySQL" });
  }
});
router.get("/inventory/balances", async (_req, res) => {
  try {
    const balances = await inventoryService.getInventoryBalances();
    return res.json({
      success: true,
      ...balances
    });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Failed to calculate inventory balances from MySQL" });
  }
});
router.post("/inventory/deduct", async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: "items array is required" });
    }
    const result = await inventoryService.deductStock(items);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Failed to deduct stock in MySQL" });
  }
});
router.post("/payments/create", async (req, res) => {
  try {
    const { paymentMethod, orderNumber, amount, customerName, customerPhone, customerEmail, invoiceItems } = req.body;
    const result = await serverPaymentService.process(paymentMethod || "myfatoorah", {
      orderNumber,
      amount,
      currency: "BHD",
      customerName,
      customerPhone,
      customerEmail,
      invoiceItems
    });
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Payment initiation failed" });
  }
});
router.post("/payments/myfatoorah/execute", async (req, res) => {
  try {
    const provider = serverPaymentService.getProvider("myfatoorah");
    const result = await provider.initiatePayment(req.body);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error?.message || "MyFatoorah payment execution failed" });
  }
});
router.post("/payments/myfatoorah/send-receipt", async (req, res) => {
  try {
    const provider = serverPaymentService.getProvider("myfatoorah");
    if (typeof provider.sendReceipt === "function") {
      const result = await provider.sendReceipt(req.body);
      return res.json(result);
    }
    return res.json({
      success: true,
      receiptNumber: `RCPT-BDS-${req.body.orderNumber}-${Math.floor(1e3 + Math.random() * 9e3)}`,
      message: `Receipt dispatched to ${req.body.customerEmail}`
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "MyFatoorah receipt dispatch failed" });
  }
});
router.post("/payments/webhook", async (req, res) => {
  const { provider, signature } = req.body;
  try {
    const paymentProvider = serverPaymentService.getProvider(provider || "myfatoorah");
    const isValid = await paymentProvider.verifyWebhook(signature, req.body);
    return res.json({ received: true, verified: isValid });
  } catch (err) {
    return res.status(400).json({ error: "Webhook processing error" });
  }
});
router.get("/orders", async (_req, res) => {
  try {
    const orders = await orderService.getOrders();
    return res.json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (err) {
    return res.status(500).json(formatErrorResponse(err, 500));
  }
});
router.get("/orders/:id", async (req, res) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json(formatErrorResponse(new Error("Order not found"), 404));
    }
    return res.json({
      success: true,
      order,
      id: order.id
    });
  } catch (err) {
    return res.status(500).json(formatErrorResponse(err, 500));
  }
});
router.get("/orders/user/:userId", async (req, res) => {
  try {
    const email = req.query.email || "";
    const orders = await orderService.getOrdersByUser(req.params.userId, email);
    return res.json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (err) {
    return res.status(500).json(formatErrorResponse(err, 500));
  }
});
router.post("/orders", async (req, res) => {
  try {
    const orderData = req.body;
    if (!orderData) {
      return res.status(400).json(formatErrorResponse(new Error("Order body is required"), 400));
    }
    if (!orderData.customerName) {
      return res.status(400).json(formatErrorResponse(new Error("customerName is required"), 400));
    }
    if (!orderData.customerEmail) {
      return res.status(400).json(formatErrorResponse(new Error("customerEmail is required"), 400));
    }
    if (!orderData.customerPhone) {
      return res.status(400).json(formatErrorResponse(new Error("customerPhone is required"), 400));
    }
    if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
      return res.status(400).json(formatErrorResponse(new Error("Order items must be a non-empty array"), 400));
    }
    const orderStatus = orderData.orderStatus || orderData.order_status || "Confirmed";
    if (!validateOrderStatus(orderStatus)) {
      return res.status(400).json(formatErrorResponse(new Error(`Invalid order_status '${orderStatus}'. Must be Confirmed, Preparing, Shipped, Delivered, or Cancelled`), 400));
    }
    const paymentStatus = orderData.paymentStatus || orderData.payment_status || "Pending";
    if (!validatePaymentStatus(paymentStatus)) {
      return res.status(400).json(formatErrorResponse(new Error(`Invalid payment_status '${paymentStatus}'. Must be Pending, Paid, Failed, or Refunded`), 400));
    }
    const created = await orderService.createOrder({
      ...orderData,
      orderStatus,
      paymentStatus
    });
    appCache.delete("products:list");
    return res.status(201).json({
      success: true,
      order: created,
      id: created.id
    });
  } catch (err) {
    return res.status(500).json(formatErrorResponse(err, 500));
  }
});
router.put("/orders/:id", async (req, res) => {
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
      return res.status(404).json(formatErrorResponse(new Error("Order not found"), 404));
    }
    return res.json({
      success: true,
      order: updated,
      id: updated.id
    });
  } catch (err) {
    return res.status(500).json(formatErrorResponse(err, 500));
  }
});
router.delete("/orders/:id", async (req, res) => {
  try {
    await orderService.deleteOrder(req.params.id);
    return res.json({
      success: true,
      id: req.params.id,
      message: "Order deleted successfully from database"
    });
  } catch (err) {
    return res.status(500).json(formatErrorResponse(err, 500));
  }
});
router.put("/orders/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json(formatErrorResponse(new Error("status is required"), 400));
    }
    if (!validateOrderStatus(status)) {
      return res.status(400).json(formatErrorResponse(new Error(`Invalid order_status '${status}'. Must be Confirmed, Preparing, Shipped, Delivered, or Cancelled`), 400));
    }
    const updated = await orderService.updateOrderStatus(req.params.id, status);
    return res.json({ success: updated, id: req.params.id, orderStatus: status });
  } catch (err) {
    return res.status(500).json(formatErrorResponse(err, 500));
  }
});
router.post("/orders/:id/confirm-payment", async (req, res) => {
  try {
    const success = await orderService.confirmDeliveryPayment(req.params.id);
    return res.json({ success, id: req.params.id, message: "Payment confirmed in database" });
  } catch (err) {
    return res.status(500).json(formatErrorResponse(err, 500));
  }
});
router.post("/sales/record-order", async (req, res) => {
  try {
    const data = req.body.order || req.body;
    if (!data || !data.orderNumber) {
      return res.status(400).json({ error: "Order data with orderNumber is required" });
    }
    const rawItems = Array.isArray(data.items) ? data.items : [];
    if (rawItems.length === 0) {
      return res.status(400).json({ error: "Order has no line items to record" });
    }
    const enrichedItems = await Promise.all(
      rawItems.map(async (it) => {
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
          }
        }
        return {
          productId: it.productId,
          productSku: sku || `BDS-${it.productId}`,
          productNameEn: nameEn || "Luxury Nightwear Garment",
          productNameAr: nameAr || "\u0645\u0644\u0627\u0628\u0633 \u0646\u0648\u0645 \u0641\u0627\u062E\u0631\u0629",
          categoryId: categoryId || "cat-silk-nightwear",
          categoryNameEn: categoryNameEn || "Nightwear",
          size: it.size || "M",
          colorName: it.color || it.colorName || "Default",
          colorHex: it.colorHex || "#340404",
          unitPrice: Number(it.unitPrice ?? it.price ?? 0),
          quantity: Number(it.quantity ?? 1),
          totalAmount: it.totalPrice ?? it.totalAmount ?? Number(((it.unitPrice ?? it.price ?? 0) * (it.quantity ?? 1)).toFixed(3))
        };
      })
    );
    const deliveryAddress = data.shippingAddress || data.deliveryAddress || {};
    const recordResult = await salesService.recordOrderSales({
      id: data.id || `ord-${Date.now()}`,
      orderNumber: data.orderNumber,
      userId: data.userId,
      customerName: data.customerName || "Customer",
      customerEmail: data.customerEmail || "",
      customerPhone: data.customerPhone || "",
      paymentMethod: data.paymentMethod || "benefit_pay",
      paymentStatus: data.paymentStatus || "Paid",
      deliveryAddress: {
        area: deliveryAddress.area || "Adliya",
        city: deliveryAddress.city || "Manama"
      },
      items: enrichedItems
    });
    return res.status(201).json({
      ...recordResult,
      message: `Persisted ${recordResult.recordedSalesCount} product sales line items in MySQL for ${data.orderNumber}`
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Failed to record product sales in MySQL" });
  }
});
router.get("/sales", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 50), 200);
    const offset = Math.max(Number(req.query.offset || 0), 0);
    const sales = await salesService.getAllSales(limit, offset);
    return res.json({
      success: true,
      count: sales.length,
      limit,
      offset,
      sales
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Failed to fetch sales records from MySQL" });
  }
});
router.get("/sales/analytics", async (req, res) => {
  try {
    const topLimit = Math.min(Number(req.query.topLimit || 8), 50);
    const analytics = await salesService.getSalesAnalytics(topLimit);
    return res.json({
      success: true,
      engine: "mysql",
      ...analytics
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Failed to calculate sales analytics in MySQL" });
  }
});
router.get("/sales/top-products", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 8), 50);
    const analytics = await salesService.getSalesAnalytics(limit);
    return res.json({
      success: true,
      topProducts: analytics.topProducts
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Failed to fetch top selling products from MySQL" });
  }
});
router.get("/sales/order/:orderId", async (req, res) => {
  try {
    const sales = await salesService.getSalesByOrder(req.params.orderId);
    return res.json({
      success: true,
      count: sales.length,
      sales
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Failed to fetch sales for order from MySQL" });
  }
});
router.get("/sales/product/:productId", async (req, res) => {
  try {
    const sales = await salesService.getSalesByProduct(req.params.productId);
    return res.json({
      success: true,
      count: sales.length,
      sales
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Failed to fetch product sales from MySQL" });
  }
});
router.get("/admin/customer-purchases", async (_req, res) => {
  try {
    const customers = await salesService.getCustomerPurchasesSummary();
    return res.json({
      success: true,
      count: customers.length,
      customers
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Failed to fetch customer purchases from MySQL" });
  }
});
router.get("/admin/customer-purchases/:customerIdOrEmail", async (req, res) => {
  try {
    const purchases = await salesService.getCustomerPurchasesDetail(req.params.customerIdOrEmail);
    return res.json({
      success: true,
      count: purchases.length,
      purchases
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Failed to fetch customer purchase history" });
  }
});
router.get("/admin/product-buyers/:productId", async (req, res) => {
  try {
    const buyers = await salesService.getProductBuyers(req.params.productId);
    return res.json({
      success: true,
      count: buyers.length,
      buyers
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Failed to fetch product buyers" });
  }
});
router.get("/health", async (_req, res) => {
  const isUp = await pingDatabase();
  const dbStatus2 = getDatabaseStatus();
  res.json({
    status: isUp ? "ok" : "degraded",
    db: isUp ? "up" : "down",
    mode: isUp ? "database" : isUsingMemoryFallback() ? "memory-fallback (NOT SAVED)" : "unavailable",
    dbErrorCode: isUp ? null : dbStatus2.errorCode || null,
    env: config.env,
    version: config.appVersion,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    service: "THE BEDTIME STORE API",
    market: "Kingdom of Bahrain (BHD)",
    databaseEngine: "MariaDB/MySQL",
    // Host / user / database names and the human-readable hint are for development only
    ...config.isDev ? { dbDetails: dbStatus2 } : {}
  });
});
var api_default = router;

// server.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path3.dirname(__filename);
async function startServer() {
  validateEnvironment();
  const app = express2();
  const PORT = config.port;
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: false,
      frameguard: false,
      originAgentCluster: false
    })
  );
  app.use((_req, res, next) => {
    res.removeHeader("X-Frame-Options");
    next();
  });
  if (config.isProd) {
    app.use(
      cors({
        origin: config.corsOrigin,
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
      })
    );
  } else {
    app.use(cors());
  }
  const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1e3,
    // 15 minutes
    max: config.isProd ? 30 : 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many authentication attempts. Please try again later." }
  });
  const writeRateLimiter = rateLimit({
    windowMs: 1 * 60 * 1e3,
    // 1 minute
    max: config.isProd ? 120 : 1e3,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many write requests. Please try again later." },
    skip: (req) => req.method === "GET" || req.method === "OPTIONS" || req.method === "HEAD"
  });
  app.use("/api/auth/login", authRateLimiter);
  app.use("/api/auth/register", authRateLimiter);
  app.use("/api", writeRateLimiter);
  app.use((req, res, next) => {
    const startTime = Date.now();
    if (config.isDev) {
      console.log(`[DEV API] ${req.method} ${req.url}`);
    }
    res.on("finish", () => {
      const durationMs = Date.now() - startTime;
      if (config.isDev) {
        console.log(`[DEV RES] ${req.method} ${req.url} -> ${res.statusCode} (${durationMs}ms)`);
      } else {
        console.log(`[PROD] ${req.method} ${req.originalUrl || req.url} ${res.statusCode} ${durationMs}ms`);
      }
    });
    next();
  });
  app.use(express2.json({ limit: "25mb" }));
  app.use(express2.urlencoded({ extended: true, limit: "25mb" }));
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, env: config.env, time: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.use("/api", api_default);
  app.use("/api", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
  });
  const imageDirs = [
    path3.join(__dirname, "public", "images"),
    path3.join(__dirname, "uploads", "images"),
    path3.join(__dirname, "dist", "images")
  ];
  for (const dir of imageDirs) {
    if (fs3.existsSync(dir)) {
      console.log(`[Server] Serving /images from: ${dir}`);
      app.use("/images", express2.static(dir));
    }
  }
  app.use("/images", (_req, res) => {
    res.status(404).end();
  });
  const bootstrapData = async () => {
    await authService.seedDefaultUsers();
    await categoryService.seedIfNeeded();
    await inventoryService.seedIfNeeded();
    if (!config.isProd || process.env.SEED_DEMO_DATA === "true") {
      await orderService.seedIfNeeded();
      await salesService.seedInitialSalesIfNeeded();
    } else {
      console.log("Production: skipping demo orders/sales seeding (set SEED_DEMO_DATA=true to force).");
    }
    console.log("Database bootstrap and catalog seeding complete.");
  };
  startConnectionManager(bootstrapData).catch((err) => {
    console.error("Connection manager crashed:", err?.message || err);
  });
  const distPath = path3.join(__dirname, "dist");
  const serveBuiltFrontend = () => {
    console.log(`[Server] Serving production static bundle from: ${distPath}`);
    app.use(express2.static(distPath));
    app.use((req, res, next) => {
      if (req.method !== "GET" && req.method !== "HEAD") return next();
      res.sendFile(path3.join(distPath, "index.html"));
    });
  };
  if (config.isProd) {
    if (fs3.existsSync(distPath)) {
      serveBuiltFrontend();
    } else {
      console.warn('[Server] Production dist directory not found. Please run "npm run build".');
      app.use((_req, res) => {
        res.status(503).json({
          error: "Production bundle not found. Please build the application using npm run build."
        });
      });
    }
  } else {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          hmr: process.env.DISABLE_HMR !== "true"
        },
        appType: "spa"
      });
      app.use(vite.middlewares);
      console.log("[Server] Vite development middleware mounted successfully.");
    } catch (viteErr) {
      console.error("[Server] Failed to initialize Vite middleware:", viteErr);
      if (fs3.existsSync(distPath)) {
        console.warn("[Server] Falling back to the built dist bundle. Set NODE_ENV=production on this host.");
        serveBuiltFrontend();
      }
    }
  }
  app.use((err, _req, res, _next) => {
    console.error("[Server] Unhandled error:", err?.message || err);
    res.status(err?.status || 500).json({ error: err?.message || "Internal server error" });
  });
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`[THE BEDTIME STORE] Server running in ${config.env.toUpperCase()} mode at http://0.0.0.0:${PORT}`);
  });
  const gracefulShutdown = (signal) => {
    console.log(`
[Server] Received ${signal}. Initiating graceful shutdown...`);
    server.close(async () => {
      console.log("[Server] HTTP server closed.");
      await closePool();
      console.log("[Server] Cleanup finished. Exiting.");
      process.exit(0);
    });
    setTimeout(() => {
      console.error("[Server] Graceful shutdown timeout reached. Terminating forcefully.");
      process.exit(1);
    }, 1e4);
  };
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
}
startServer();
