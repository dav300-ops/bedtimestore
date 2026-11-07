import mysql from 'mysql2/promise';
import * as Q from './server/queries/mysqlQueries.ts';

const db = await mysql.createConnection({
  host: 'localhost',
  user: 'appuser',
  password: 'LocalTest123',
  database: 'thebedtime_store',
});

// 1. Create tables (this is probably the step missing on your live host)
for (const sql of [
  Q.DDL_CREATE_USERS_TABLE, Q.DDL_CREATE_CATEGORIES_TABLE, Q.DDL_CREATE_PRODUCTS_TABLE,
  Q.DDL_CREATE_ORDERS_TABLE, Q.DDL_CREATE_SECURITY_LOGS_TABLE, Q.DDL_CREATE_PRODUCT_SALES_TABLE,
]) await db.query(sql);
console.log('Tables created\n');

async function t(name, sql, params) {
  try {
    const [r] = await db.execute(sql, params);
    console.log('OK  ', name, '(rows affected:', r.affectedRows + ')');
  } catch (e) {
    console.log('FAIL', name, '→', e.code, '-', e.sqlMessage || e.message);
  }
}

await db.beginTransaction();

await t('insert category', Q.SQL_INSERT_CATEGORY,
  ['c1', 'test-cat', 'Test', 'اختبار', 'desc', 'desc', null, 1, 0]);

await t('insert product', Q.SQL_INSERT_PRODUCT, [
  'p1', 'SKU1', 'Test', 'اختبار', 'desc', 'desc', 'c1', 'Test', 'اختبار',
  9.5, null, 'BHD', JSON.stringify([]), JSON.stringify([{ size: 'M', stock: 5 }]),
  null, null, null, null, JSON.stringify([]), 0, 0, 0, 1, 5, 0, 'women', null,
]);

await t('insert order', Q.SQL_INSERT_ORDER, [
  'o1', 'ORD-1', null, 'Test', 't@t.com', '33333333',
  JSON.stringify({ city: 'Manama' }), JSON.stringify([]),
  9.5, 0, 1, 10.5, 'Confirmed', 'Pending', 'cod', '1234',
]);

await t('insert product sale', Q.SQL_INSERT_PRODUCT_SALE, [
  's1', 'o1', 'ORD-1', 'p1', 'SKU1', 'Test', 'اختبار', 'c1', 'Test',
  'M', 'Blue', '#0000ff', 9.5, 1, 9.5, 'BHD', 'cod', 'Pending',
  null, 'Test', 't@t.com', 'Manama', 'Manama',
]);

await t('update sale payment status', Q.SQL_UPDATE_SALE_PAYMENT_STATUS, ['Paid', 'o1', 'ORD-1']);

await db.rollback();
await db.end();