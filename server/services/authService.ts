import { executeQuery } from '../db';
import { hashPassword, isHashedPassword, verifyPassword } from '../utils/password';
import { signAdminToken } from '../utils/adminToken';
import {
  SQL_REGISTER_USER,
  SQL_FIND_USER_BY_EMAIL,
  SQL_FIND_USER_BY_ID,
  SQL_UPDATE_USER_PASSWORD,
  SQL_UPDATE_USER_PROFILE,
  SQL_INSERT_SECURITY_LOG,
  SQL_GET_USER_SECURITY_LOGS,
  SQL_SELECT_ALL_ADMINS,
} from '../queries/mysqlQueries';

export interface MySQLUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'customer' | 'admin' | 'superadmin';
  isGuest: boolean;
  twoFactorEnabled: boolean;
  savedAddresses?: any[];
  wishlist?: string[];
  connectedProviders?: Record<string, boolean>;
  createdAt?: string;
  updatedAt?: string;
}

export class MySQLAuthService {
  /**
   * Seed Initial Luxury Boutique Demo Users (Admin and Verified Customer) into MySQL
   * All seeded passwords are stored using salted scrypt hashes.
   */
  public async seedDefaultUsers(): Promise<void> {
    try {
      const existingAdminRows = await executeQuery(SQL_FIND_USER_BY_EMAIL, ['admin@thebedtimestore.bh']);
      if (!existingAdminRows || existingAdminRows.length === 0) {
        console.log(' Seeding default administrator account with scrypt password hash...');
        const hashedAdminPassword = hashPassword('Admin@Bedtime2026!');
        await executeQuery(SQL_REGISTER_USER, [
          'usr-admin-01',
          'admin@thebedtimestore.bh',
          hashedAdminPassword,
          'Reem',
          'Al Mansoor',
          '+973 3922 8899',
          'admin',
          0,
          1,
          JSON.stringify([
            {
              id: 'addr-admin-01',
              buildingNumber: 'Boutique 10',
              roadNumber: 'Road 3812',
              blockNumber: 'Block 338',
              area: 'Adliya',
              city: 'Manama',
              country: 'Bahrain',
              isDefault: true,
            },
          ]),
          JSON.stringify(['prod-1', 'prod-3']),
          JSON.stringify({ google: true, email: true }),
        ]);
      } else {
        const rawAdmin = existingAdminRows[0];
        const storedHash = rawAdmin.password_hash || rawAdmin.password;
        if (storedHash && !isHashedPassword(storedHash)) {
          await executeQuery(SQL_UPDATE_USER_PASSWORD, [hashPassword(storedHash), rawAdmin.id]);
        }
      }

      const existingCustomerRows = await executeQuery(SQL_FIND_USER_BY_EMAIL, ['fatima@thebedtimestore.bh']);
      if (!existingCustomerRows || existingCustomerRows.length === 0) {
        console.log('[MySQL] Seeding default verified customer account...');
        const hashedCustomerPassword = hashPassword('LuxurySilk@2026');
        await executeQuery(SQL_REGISTER_USER, [
          'usr-customer-01',
          'fatima@thebedtimestore.bh',
          hashedCustomerPassword,
          'Fatima',
          'Al Khalifa',
          '+973 3922 1144',
          'customer',
          0,
          0,
          JSON.stringify([
            {
              id: 'addr-cust-01',
              buildingNumber: 'Villa 24',
              roadNumber: 'Road 3812',
              blockNumber: 'Block 338',
              area: 'Adliya',
              city: 'Manama',
              country: 'Bahrain',
              isDefault: true,
            },
          ]),
          JSON.stringify(['prod-1', 'prod-2', 'prod-5']),
          JSON.stringify({ google: true, email: true }),
        ]);
      } else {
        const rawCustomer = existingCustomerRows[0];
        const storedHash = rawCustomer.password_hash || rawCustomer.password;
        if (storedHash && !isHashedPassword(storedHash)) {
          await executeQuery(SQL_UPDATE_USER_PASSWORD, [hashPassword(storedHash), rawCustomer.id]);
        }
      }
    } catch (err: any) {
      console.warn(' Notice during user seeding:', err?.message);
    }
  }

  /**
   * Find user by email using MySQL query
   */
  public async findUserByEmail(email: string): Promise<any | null> {
    const rows = await executeQuery(SQL_FIND_USER_BY_EMAIL, [email]);
    if (!rows || rows.length === 0) return null;
    return this.mapUserRow(rows[0]);
  }

  /**
   * Find user by primary ID using MySQL query
   */
  public async findUserById(id: string): Promise<any | null> {
    const rows = await executeQuery(SQL_FIND_USER_BY_ID, [id]);
    if (!rows || rows.length === 0) return null;
    return this.mapUserRow(rows[0]);
  }

  /**
   * Register a new public customer user in MySQL (never assigns admin role)
   */
  public async register(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password?: string;
    phone?: string;
    role?: 'customer' | 'admin' | 'superadmin';
    isGuest?: boolean;
    ip?: string;
    device?: string;
  }): Promise<{ user: MySQLUser; token: string }> {
    const existing = await this.findUserByEmail(userData.email);
    if (existing) {
      throw new Error('An account with this email already exists in our database.');
    }

    const userId = `usr-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    // Public registration strictly creates customer accounts only
    const role: 'customer' = 'customer';
    const hashedPassword = hashPassword(userData.password || 'GuestPassword@2026');

    await executeQuery(SQL_REGISTER_USER, [
      userId,
      userData.email.toLowerCase().trim(),
      hashedPassword,
      userData.firstName.trim(),
      userData.lastName.trim(),
      userData.phone || '',
      role,
      userData.isGuest ? 1 : 0,
      0, // two_factor_enabled
      JSON.stringify([]), // saved_addresses
      JSON.stringify([]), // wishlist
      JSON.stringify({ email: true }), // connected_providers
    ]);

    // Record security audit log
    await this.logSecurityEvent({
      userId,
      action: userData.isGuest ? 'guest_login' : 'register_success',
      ip: userData.ip || '127.0.0.1',
      location: 'Manama, Bahrain',
      device: userData.device || 'Web Browser',
    });

    const user = (await this.findUserById(userId))!;
    const token = `bds-jwt-${userId}-${Date.now()}`;

    return { user, token };
  }

  /**
   * Authenticate / Login customer user against MySQL database
   */
  public async login(
    email: string,
    passwordAttempt: string,
    meta?: { ip?: string; device?: string }
  ): Promise<{ user: MySQLUser; token: string }> {
    const rows = await executeQuery(SQL_FIND_USER_BY_EMAIL, [email]);
    if (!rows || rows.length === 0) {
      throw new Error('Invalid credentials. No user found with this email in database.');
    }

    const rawUser = rows[0];
    if (rawUser.role === 'admin' || rawUser.role === 'superadmin') {
      throw new Error('Account login failed.');
    }

    const passwordHash = rawUser.password_hash || rawUser.password;

    if (!verifyPassword(passwordAttempt, passwordHash)) {
      await this.logSecurityEvent({
        userId: rawUser.id,
        action: 'login_failed',
        ip: meta?.ip || '127.0.0.1',
        location: 'Manama, Bahrain',
        device: meta?.device || 'Web Browser',
      });
      throw new Error('Invalid password for this account.');
    }

    // Migrate legacy plaintext password hash on successful login
    if (passwordHash && !isHashedPassword(passwordHash)) {
      await executeQuery(SQL_UPDATE_USER_PASSWORD, [hashPassword(passwordAttempt), rawUser.id]);
    }

    await this.logSecurityEvent({
      userId: rawUser.id,
      action: 'login_success',
      ip: meta?.ip || '127.0.0.1',
      location: 'Manama, Bahrain',
      device: meta?.device || 'Web Browser',
    });

    const user = this.mapUserRow(rawUser);
    const token = `bds-jwt-${user.id}-${Date.now()}`;

    return { user, token };
  }

  /**
   * Dedicated Administrator Authentication against MySQL database
   */
  public async loginAdmin(
    email: string,
    passwordAttempt: string,
    meta?: { ip?: string; device?: string }
  ): Promise<{ user: MySQLUser; token: string }> {
    const cleanEmail = email.toLowerCase().trim();
    const rows = await executeQuery(SQL_FIND_USER_BY_EMAIL, [cleanEmail]);
    if (!rows || rows.length === 0) {
      throw new Error('Invalid administrator email or password.');
    }

    const rawUser = rows[0];
    if (rawUser.role !== 'admin' && rawUser.role !== 'superadmin') {
      await this.logSecurityEvent({
        userId: rawUser.id,
        action: 'admin_login_denied',
        ip: meta?.ip || '127.0.0.1',
        location: 'Manama, Bahrain',
        device: meta?.device || 'Admin Portal',
      });
      throw new Error('Access denied: this account does not have administrator privileges.');
    }

    const passwordHash = rawUser.password_hash || rawUser.password;
    if (!verifyPassword(passwordAttempt, passwordHash)) {
      await this.logSecurityEvent({
        userId: rawUser.id,
        action: 'admin_login_failed',
        ip: meta?.ip || '127.0.0.1',
        location: 'Manama, Bahrain',
        device: meta?.device || 'Admin Portal',
      });
      throw new Error('Invalid administrator email or password.');
    }

    // Upgrade legacy plaintext hash transparently if needed
    if (passwordHash && !isHashedPassword(passwordHash)) {
      await executeQuery(SQL_UPDATE_USER_PASSWORD, [hashPassword(passwordAttempt), rawUser.id]);
    }

    await this.logSecurityEvent({
      userId: rawUser.id,
      action: 'admin_login_success',
      ip: meta?.ip || '127.0.0.1',
      location: 'Manama, Bahrain',
      device: meta?.device || 'Admin Portal',
    });

    const user = this.mapUserRow(rawUser);
    const token = signAdminToken({
      id: user.id,
      email: user.email,
      role: user.role === 'superadmin' ? 'superadmin' : 'admin',
    });

    return { user, token };
  }

  /**
   * Update password in MySQL (always hashed with scrypt)
   */
  public async updatePassword(userId: string, newPassword: string): Promise<boolean> {
    const hashed = hashPassword(newPassword);
    await executeQuery(SQL_UPDATE_USER_PASSWORD, [hashed, userId]);
    await this.logSecurityEvent({
      userId,
      action: 'password_change',
      ip: '127.0.0.1',
      location: 'Manama, Bahrain',
      device: 'Web Client',
    });
    return true;
  }

  /**
   * Update user profile in MySQL
   */
  public async updateProfile(
    userId: string,
    profile: { firstName: string; lastName: string; phone?: string }
  ): Promise<MySQLUser> {
    await executeQuery(SQL_UPDATE_USER_PROFILE, [profile.firstName, profile.lastName, profile.phone || '', userId]);
    return (await this.findUserById(userId))!;
  }

  /**
   * Log security action
   */
  public async logSecurityEvent(entry: {
    userId: string;
    action: string;
    ip: string;
    location?: string;
    device?: string;
  }): Promise<void> {
    const logId = `log-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    try {
      await executeQuery(SQL_INSERT_SECURITY_LOG, [
        logId,
        entry.userId,
        entry.action,
        entry.ip,
        entry.location || 'Bahrain',
        entry.device || 'Desktop',
      ]);
    } catch (err: any) {
      console.warn('[MySQL] Failed to write security log:', err?.message);
    }
  }

  /**
   * Fetch user security logs from MySQL
   */
  public async getUserSecurityLogs(userId: string): Promise<any[]> {
    const rows = await executeQuery(SQL_GET_USER_SECURITY_LOGS, [userId]);
    return rows.map((r) => ({
      id: r.id,
      timestamp: r.created_at,
      action: r.action,
      ip: r.ip,
      location: r.location,
      device: r.device,
    }));
  }

  /**
   * Retrieve all boutique administrators from MySQL database
   */
  public async getAllAdmins(): Promise<MySQLUser[]> {
    const rows = await executeQuery(SQL_SELECT_ALL_ADMINS, []);
    return (rows || []).map((r: any) => this.mapUserRow(r));
  }

  /**
   * Create New Boutique Administrator Account (Admin Role Only)
   * Password is always hashed with salted scrypt before writing to MySQL.
   */
  public async createAdmin(adminData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
    createdByAdminId?: string;
    ip?: string;
    device?: string;
  }): Promise<MySQLUser> {
    const cleanEmail = adminData.email.toLowerCase().trim();
    if (!adminData.password || adminData.password.length < 8) {
      throw new Error('Administrator password must be at least 8 characters.');
    }

    const existing = await this.findUserByEmail(cleanEmail);
    if (existing) {
      throw new Error(`An account with email "${cleanEmail}" already exists in the MySQL database.`);
    }

    const userId = `usr-admin-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const role = 'admin';
    const hashedPassword = hashPassword(adminData.password);

    await executeQuery(SQL_REGISTER_USER, [
      userId,
      cleanEmail,
      hashedPassword,
      adminData.firstName.trim(),
      adminData.lastName.trim(),
      adminData.phone || '+973 1722 8844',
      role,
      0, // is_guest: false
      0, // two_factor_enabled: false initially
      JSON.stringify([]), // saved_addresses
      JSON.stringify([]), // wishlist
      JSON.stringify({ email: true }), // connected_providers
    ]);

    // Record security audit event
    await this.logSecurityEvent({
      userId,
      action: 'admin_created',
      ip: adminData.ip || '127.0.0.1',
      location: 'Manama, Bahrain',
      device: adminData.device || `Created by Administrator (${adminData.createdByAdminId || 'Staff'})`,
    });

    const createdAdmin = (await this.findUserById(userId))!;
    return createdAdmin;
  }

  /**
   * Helper to map relational row to camelCase TypeScript object
   */
  private mapUserRow(row: any): MySQLUser {
    const parseJson = (val: any) => {
      if (!val) return [];
      if (typeof val === 'string') {
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
      role: row.role || 'customer',
      isGuest: Boolean(row.is_guest || row.isGuest),
      twoFactorEnabled: Boolean(row.two_factor_enabled || row.twoFactorEnabled),
      savedAddresses: parseJson(row.saved_addresses || row.savedAddresses),
      wishlist: parseJson(row.wishlist),
      connectedProviders: parseJson(row.connected_providers || row.connectedProviders),
      createdAt: row.created_at || row.createdAt,
      updatedAt: row.updated_at || row.updatedAt,
    };
  }
}

export const authService = new MySQLAuthService();
