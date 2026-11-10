/**
 * Database self-check. Uses the SAME configuration loader as the app.
 *
 *   npm run db:check                      (development settings)
 *   NODE_ENV=production npm run db:check  (production settings, e.g. on the live host)
 *
 * It connects, checks privileges, makes sure the tables exist, and performs a real
 * INSERT / UPDATE / DELETE inside a transaction that is ROLLED BACK (nothing is left behind).
 */
import mysql from 'mysql2/promise';
import { config } from '../server/config';
import { describeDbError } from '../server/db';
import {
  DDL_CREATE_USERS_TABLE, DDL_CREATE_CATEGORIES_TABLE, DDL_CREATE_PRODUCTS_TABLE,
  DDL_CREATE_ORDERS_TABLE, DDL_CREATE_SECURITY_LOGS_TABLE, DDL_CREATE_PRODUCT_SALES_TABLE,
  SQL_INSERT_CATEGORY, SQL_UPDATE_CATEGORY, SQL_DELETE_CATEGORY,
} from '../server/queries/mysqlQueries';

const ok = (m: string) => console.log(`  PASS  ${m}`);
const bad = (m: string) => console.log(`  FAIL  ${m}`);

async function main() {
  const { host, port, user, password, database, ssl } = config.db;
  console.log(`\nMode: ${config.env}`);
  console.log(`Target: ${user || '(no user)'}@${host || '(no host)'}:${port}/${database || '(no db)'}  ssl=${ssl}`);
  console.log(`Password set: ${password ? 'yes' : 'NO (empty)'}\n`);

  if (!host || !user || !database) {
    bad('DB_HOST, DB_USER and DB_NAME must all be set (check your .env / hosting environment variables).');
    process.exit(1);
  }

  let conn: mysql.Connection;
  try {
    conn = await mysql.createConnection({
      host, port, user, password, database, charset: 'utf8mb4', connectTimeout: 8000,
      ssl: ssl ? { rejectUnauthorized: false } : undefined,
    });
    ok('Connected');
  } catch (err: any) {
    const { code, hint } = describeDbError(err);
    bad(`Could not connect: ${code}`);
    console.log(`        ${hint}\n`);
    process.exit(1);
  }

  try {
    const [[v]]: any = await conn.query('SELECT VERSION() AS v, @@read_only AS ro, @@max_allowed_packet AS pkt');
    ok(`Server version ${v.v}`);
    if (Number(v.ro) === 1) bad('Server is READ ONLY (replica or locked instance): writes will fail. Use the primary endpoint.');
    else ok('Server is writable');
    const mb = Number(v.pkt) / 1024 / 1024;
    (mb < 8 ? bad : ok)(`max_allowed_packet = ${mb.toFixed(1)} MB${mb < 8 ? ' (low: saving products with large base64 images may fail)' : ''}`);

    const [grants]: any = await conn.query('SHOW GRANTS FOR CURRENT_USER()');
    const text = grants.map((g: any) => Object.values(g)[0]).join('\n');
    const has = (p: string) => new RegExp(`\\b(ALL PRIVILEGES|${p})\\b`, 'i').test(text);
    for (const p of ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE']) {
      (has(p) ? ok : bad)(`Privilege ${p}`);
    }

    for (const ddl of [DDL_CREATE_USERS_TABLE, DDL_CREATE_CATEGORIES_TABLE, DDL_CREATE_PRODUCTS_TABLE,
      DDL_CREATE_ORDERS_TABLE, DDL_CREATE_SECURITY_LOGS_TABLE, DDL_CREATE_PRODUCT_SALES_TABLE]) {
      await conn.query(ddl);
    }
    const [tables]: any = await conn.query('SHOW TABLES');
    ok(`Tables present: ${tables.map((t: any) => Object.values(t)[0]).join(', ')}`);

    // Real write test, rolled back
    await conn.beginTransaction();
    const id = `dbcheck-${Date.now()}`;
    await conn.execute(SQL_INSERT_CATEGORY, [id, id, 'DB check', 'فحص', '', '', '', 1, 0]);
    ok('INSERT works');
    await conn.execute(SQL_UPDATE_CATEGORY, ['DB check 2', 'فحص', id, '', '', '', 1, 0, id]);
    ok('UPDATE works');
    await conn.execute(SQL_DELETE_CATEGORY, [id]);
    ok('DELETE works');
    await conn.rollback();
    ok('Test transaction rolled back (no data left behind)');

    console.log('\nResult: the database accepts writes with these settings.\n');
  } catch (err: any) {
    const { code, hint } = describeDbError(err);
    bad(`${code}: ${hint}`);
    try { await conn.rollback(); } catch {}
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

main();
