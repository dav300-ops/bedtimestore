/**
 * MySQL Database Queries & DDL Schema Definitions
 * The Bedtime Store - Luxury Nightwear Boutique (Bahrain)
 *
 * Comprehensive relational queries for:
 * 1. User Authentication & Session Security (OWASP compliant)
 * 2. Category Data Manipulation (CRUD)
 * 3. Product & Inventory Stock Management (CRUD)
 * 4. Orders & Pay-On-Delivery Verification
 * 5. Security Audit Logging
 */

// ============================================================================
// DDL TABLE SCHEMA QUERIES
// ============================================================================

export const DDL_CREATE_USERS_TABLE = `
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

export const DDL_CREATE_CATEGORIES_TABLE = `
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

export const DDL_CREATE_PRODUCTS_TABLE = `
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

export const DDL_CREATE_ORDERS_TABLE = `
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

export const DDL_CREATE_SECURITY_LOGS_TABLE = `
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

export const DDL_CREATE_PRODUCT_SALES_TABLE = `
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

// ============================================================================
// 1. USER AUTHENTICATION QUERIES
// ============================================================================

export const SQL_REGISTER_USER = `
INSERT INTO users (
  id, email, password_hash, first_name, last_name, phone, role, is_guest, two_factor_enabled, saved_addresses, wishlist, connected_providers, created_at, updated_at
) VALUES (?, LOWER(?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
`;

export const SQL_FIND_USER_BY_EMAIL = `
SELECT 
  id, email, password_hash, first_name, last_name, phone, role, is_guest, two_factor_enabled,
  saved_addresses, wishlist, connected_providers, created_at, updated_at
FROM users 
WHERE LOWER(email) = LOWER(?)
LIMIT 1
`;

export const SQL_FIND_USER_BY_ID = `
SELECT 
  id, email, first_name, last_name, phone, role, is_guest, two_factor_enabled,
  saved_addresses, wishlist, connected_providers, created_at, updated_at
FROM users 
WHERE id = ?
LIMIT 1
`;

export const SQL_UPDATE_USER_PASSWORD = `
UPDATE users 
SET password_hash = ?, updated_at = NOW() 
WHERE id = ?
`;

export const SQL_UPDATE_USER_PROFILE = `
UPDATE users 
SET first_name = ?, last_name = ?, phone = ?, updated_at = NOW() 
WHERE id = ?
`;

export const SQL_UPDATE_USER_WISHLIST = `
UPDATE users 
SET wishlist = ?, updated_at = NOW() 
WHERE id = ?
`;

export const SQL_UPDATE_USER_ADDRESSES = `
UPDATE users 
SET saved_addresses = ?, updated_at = NOW() 
WHERE id = ?
`;

export const SQL_INSERT_SECURITY_LOG = `
INSERT INTO security_logs (id, user_id, action, ip, location, device, created_at)
VALUES (?, ?, ?, ?, ?, ?, NOW())
`;

export const SQL_GET_USER_SECURITY_LOGS = `
SELECT id, user_id, action, ip, location, device, created_at
FROM security_logs
WHERE user_id = ?
ORDER BY created_at DESC
LIMIT 20
`;

// ============================================================================
// 2. CATEGORY DATA MANIPULATION QUERIES
// ============================================================================

export const SQL_SELECT_ALL_CATEGORIES = `
SELECT 
  id, slug, name_en AS nameEn, name_ar AS nameAr,
  description_en AS descriptionEn, description_ar AS descriptionAr,
  image, active, display_order AS displayOrder, created_at AS createdAt, updated_at AS updatedAt
FROM categories
ORDER BY display_order ASC, created_at ASC
`;

export const SQL_SELECT_CATEGORY_BY_ID_OR_SLUG = `
SELECT 
  id, slug, name_en AS nameEn, name_ar AS nameAr,
  description_en AS descriptionEn, description_ar AS descriptionAr,
  image, active, display_order AS displayOrder, created_at AS createdAt, updated_at AS updatedAt
FROM categories
WHERE id = ? OR slug = ?
LIMIT 1
`;

export const SQL_INSERT_CATEGORY = `
INSERT INTO categories (
  id, slug, name_en, name_ar, description_en, description_ar, image, active, display_order, created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
`;

export const SQL_UPDATE_CATEGORY = `
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

export const SQL_DELETE_CATEGORY = `
DELETE FROM categories
WHERE id = ?
`;

export const SQL_COUNT_CATEGORIES = `
SELECT COUNT(*) AS total FROM categories
`;

// ============================================================================
// 3. PRODUCT & INVENTORY DATA MANIPULATION QUERIES
// ============================================================================

export const SQL_SELECT_ALL_PRODUCTS = `
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

export const SQL_SELECT_PRODUCT_BY_ID_OR_SKU = `
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

export const SQL_INSERT_PRODUCT = `
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

export const SQL_UPDATE_PRODUCT = `
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

export const SQL_UPDATE_PRODUCT_VARIANTS = `
UPDATE products
SET variants = ?, updated_at = NOW()
WHERE id = ?
`;

export const SQL_DELETE_PRODUCT = `
DELETE FROM products
WHERE id = ?
`;

export const SQL_COUNT_PRODUCTS = `
SELECT COUNT(*) AS total FROM products
`;

// ============================================================================
// 4. ORDER MANAGEMENT QUERIES
// ============================================================================

export const SQL_INSERT_ORDER = `
INSERT INTO orders (
  id, order_number, user_id, customer_name, customer_email, customer_phone,
  delivery_address, items, subtotal, discount, shipping_fee, total,
  order_status, payment_status, payment_method, pin_code, created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
`;

export const SQL_SELECT_ALL_ORDERS = `
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

export const SQL_SELECT_ORDERS_BY_USER = `
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

export const SQL_UPDATE_ORDER_STATUS = `
UPDATE orders
SET order_status = ?, updated_at = NOW()
WHERE id = ? OR order_number = ?
`;

export const SQL_CONFIRM_ORDER_PAYMENT = `
UPDATE orders
SET payment_status = 'Paid', order_status = 'Delivered', updated_at = NOW()
WHERE id = ? OR order_number = ?
`;

// ============================================================================
// 5. PRODUCT SALES & REVENUE ANALYTICS QUERIES
// ============================================================================

export const SQL_INSERT_PRODUCT_SALE = `
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

export const SQL_SELECT_ALL_PRODUCT_SALES = `
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

export const SQL_SELECT_SALES_BY_PRODUCT = `
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

export const SQL_SELECT_SALES_BY_ORDER = `
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

export const SQL_SELECT_SALES_BY_DATE_RANGE = `
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
WHERE sale_date BETWEEN ? AND ?
ORDER BY created_at DESC
`;

export const SQL_SELECT_TOP_SELLING_PRODUCTS = `
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

export const SQL_SELECT_SALES_BY_CATEGORY = `
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

export const SQL_SELECT_SALES_BY_PAYMENT_METHOD = `
SELECT 
  COALESCE(payment_method, 'unknown') AS paymentMethod,
  COUNT(DISTINCT order_id) AS transactionCount,
  CAST(SUM(quantity) AS SIGNED) AS totalUnitsSold,
  CAST(SUM(total_amount) AS DECIMAL(10, 3)) AS totalVolumeBHD
FROM product_sales
GROUP BY payment_method
ORDER BY totalVolumeBHD DESC
`;

export const SQL_SELECT_SALES_BY_BAHRAIN_AREA = `
SELECT 
  COALESCE(customer_area, 'Manama') AS areaName,
  COUNT(DISTINCT order_id) AS orderCount,
  CAST(SUM(quantity) AS SIGNED) AS unitsSold,
  CAST(SUM(total_amount) AS DECIMAL(10, 3)) AS totalRevenueBHD
FROM product_sales
GROUP BY customer_area
ORDER BY totalRevenueBHD DESC
`;

export const SQL_SELECT_DAILY_SALES_TREND = `
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

export const SQL_SELECT_SALES_OVERALL_SUMMARY = `
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

export const SQL_UPDATE_SALE_PAYMENT_STATUS = `
UPDATE product_sales
SET payment_status = ?, updated_at = NOW()
WHERE order_id = ? OR order_number = ?
`;

export const SQL_COUNT_PRODUCT_SALES = `
SELECT COUNT(*) AS total FROM product_sales
`;

