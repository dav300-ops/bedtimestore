/**
 * Safe, Idempotent Superadmin Seed CLI Script
 *
 * Usage:
 *   SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_PASSWORD='StrongPassword!23' npm run seed:superadmin
 *
 * Security rules:
 * - Never hardcodes any default email or password in source control.
 * - Exits cleanly with an error if SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD is missing.
 * - Creates a default superadmin ONLY when zero admin/superadmin accounts exist in `users`.
 * - Hashes the password with bcrypt (cost 12) and sets must_change_password = 1 so the
 *   operator is forced to set a new personal password on first sign-in.
 */
import mysql from 'mysql2/promise';
import { config } from '../server/config';
import { describeDbError } from '../server/db';
import { BCRYPT_COST, hashPassword } from '../server/utils/password';
import {
  DDL_CREATE_USERS_TABLE,
  SQL_COUNT_ADMINS,
  SQL_FIND_USER_BY_EMAIL,
  SQL_INSERT_SUPERADMIN,
} from '../server/queries/mysqlQueries';

export interface SeedQueryExecutor {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
}

export interface SeedResult {
  created: boolean;
  reason?: string;
  email?: string;
  id?: string;
}

export async function seedSuperadminAccount(
  db: SeedQueryExecutor,
  env: NodeJS.ProcessEnv = process.env
): Promise<SeedResult> {
  const email = (env.SEED_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = env.SEED_ADMIN_PASSWORD || '';
  const firstName = (env.SEED_ADMIN_FIRST_NAME || 'Boutique').trim();
  const lastName = (env.SEED_ADMIN_LAST_NAME || 'Superadmin').trim();

  if (!email || !password) {
    throw new Error(
      'Missing required environment variables: SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must both be set. No account was created.'
    );
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error(`Invalid SEED_ADMIN_EMAIL format: "${email}". No account was created.`);
  }

  if (password.length < 8) {
    throw new Error(
      'SEED_ADMIN_PASSWORD must be at least 8 characters long. No account was created.'
    );
  }

  // Only create a superadmin if zero admin/superadmin accounts currently exist
  const countRows = await db.query<{ total: number }>(SQL_COUNT_ADMINS, []);
  const adminCount = Number(countRows?.[0]?.total || 0);

  if (adminCount > 0) {
    console.log(
      `[Seed Superadmin] An administrator account already exists (count: ${adminCount}). Skipping creation (idempotent).`
    );
    return { created: false, reason: 'admin_already_exists' };
  }

  // Guard against email collision with an existing customer account
  const existingEmailRows = await db.query<{ id: string; role: string }>(SQL_FIND_USER_BY_EMAIL, [email]);
  if (existingEmailRows && existingEmailRows.length > 0) {
    throw new Error(
      `Cannot seed superadmin: email "${email}" is already used by an existing ${existingEmailRows[0].role} account.`
    );
  }

  const passwordHash = await hashPassword(password);
  const id = `usr-superadmin-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

  await db.query(SQL_INSERT_SUPERADMIN, [
    id,
    email,
    passwordHash,
    firstName,
    lastName,
    '',
    1, // must_change_password = 1 (force password rotation on first login)
    JSON.stringify([]),
    JSON.stringify([]),
    JSON.stringify({ email: true }),
  ]);

  console.log(`[Seed Superadmin] Created superadmin account "${email}" (bcrypt cost ${BCRYPT_COST}, must_change_password=1).`);
  console.warn('================================================================================');
  console.warn('SECURITY ACTION REQUIRED:');
  console.warn('1. Sign in at /admin/login using your seeded credentials and IMMEDIATELY');
  console.warn('   set a new personal password (enforced automatically on first sign-in).');
  console.warn('2. Remove SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD from your .env file and');
  console.warn('   hosting environment variables once initial login is complete.');
  console.warn('================================================================================');

  return { created: true, email, id };
}

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || '').trim();
  const password = process.env.SEED_ADMIN_PASSWORD || '';

  if (!email || !password) {
    console.error(
      '[Seed Superadmin ERROR] Both SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD environment variables are required.'
    );
    console.error(
      'Example: SEED_ADMIN_EMAIL=owner@yourdomain.com SEED_ADMIN_PASSWORD=\'YourStrongPassword!1\' npm run seed:superadmin'
    );
    process.exit(1);
  }

  const { host, port, user, password: dbPassword, database, ssl } = config.db;
  if (!host || !user || !database) {
    console.error(
      '[Seed Superadmin ERROR] Database environment variables (DB_HOST, DB_USER, DB_NAME) must be configured.'
    );
    process.exit(1);
  }

  let conn: mysql.Connection | null = null;
  try {
    conn = await mysql.createConnection({
      host,
      port,
      user,
      password: dbPassword,
      database,
      charset: 'utf8mb4',
      connectTimeout: 8000,
      ssl: ssl ? { rejectUnauthorized: false } : undefined,
    });

    await conn.query(DDL_CREATE_USERS_TABLE);
    try {
      await conn.query('ALTER TABLE users ADD COLUMN must_change_password TINYINT(1) DEFAULT 0');
    } catch (alterErr: any) {
      if (alterErr?.errno !== 1060 && alterErr?.code !== 'ER_DUP_FIELDNAME') {
        throw alterErr;
      }
    }

    const executor: SeedQueryExecutor = {
      async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
        const [rows] = await conn!.execute(sql, params.map((p) => (p === undefined ? null : p)));
        return rows as T[];
      },
    };

    await seedSuperadminAccount(executor, process.env);
  } catch (err: any) {
    if (err?.code || err?.errno) {
      const { code, hint } = describeDbError(err);
      console.error(`[Seed Superadmin ERROR] ${code}: ${hint}`);
    } else {
      console.error(`[Seed Superadmin ERROR] ${err?.message || err}`);
    }
    process.exitCode = 1;
  } finally {
    if (conn) {
      await conn.end();
    }
  }
}

const isCliEntry =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  Boolean(process.argv[1]) &&
  /seedSuperadmin\.(ts|js|mjs|cjs)$/i.test(process.argv[1]);

if (isCliEntry) {
  main();
}
