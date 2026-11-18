import crypto from 'crypto';
import { executeQuery } from '../db';
import { hashPassword, needsPasswordMigration, verifyPassword } from '../utils/password';
import { signAdminToken } from '../utils/adminToken';
import {
  SQL_REGISTER_USER,
  SQL_FIND_USER_BY_EMAIL,
  SQL_FIND_USER_BY_ID,
  SQL_UPDATE_USER_PASSWORD,
  SQL_MIGRATE_PASSWORD_HASH,
  SQL_UPDATE_ADMIN_OTP_SETTING,
  SQL_UPDATE_USER_PROFILE,
  SQL_INSERT_SECURITY_LOG,
  SQL_GET_USER_SECURITY_LOGS,
  SQL_SELECT_ALL_ADMINS,
  SQL_COUNT_ADMINS,
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
  mustChangePassword?: boolean;
  otpLoginEnabled?: boolean;
  savedAddresses?: any[];
  wishlist?: string[];
  connectedProviders?: Record<string, boolean>;
  createdAt?: string;
  updatedAt?: string;
}

export class MySQLAuthService {
  /**
   * Startup check: never hardcode default emails or passwords in source code.
   * Logs an advisory notice if no admin/superadmin account exists yet.
   */
  public async seedDefaultUsers(): Promise<void> {
    try {
      const rows = await executeQuery<{ total: number }>(SQL_COUNT_ADMINS, []);
      const adminCount = Number(rows?.[0]?.total || 0);
      if (adminCount === 0) {
        console.warn(
          '[Auth] No administrator account found. To bootstrap a superadmin safely, set SEED_ADMIN_EMAIL & SEED_ADMIN_PASSWORD and run: npm run seed:superadmin'
        );
      }
    } catch (err: any) {
      console.warn('Notice during admin existence check:', err?.message);
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
   * Hashes password with bcrypt (cost 12).
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
    const rawPassword =
      userData.password && userData.password.length > 0
        ? userData.password
        : crypto.randomBytes(24).toString('hex');
    const hashedPassword = await hashPassword(rawPassword);

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
   * Authenticate / Login customer user against MySQL database.
   * Supports dual-format verification (scrypt & bcrypt) with lazy migration to bcrypt.
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
    const isValid = await verifyPassword(passwordAttempt, passwordHash);

    if (!isValid) {
      await this.logSecurityEvent({
        userId: rawUser.id,
        action: 'login_failed',
        ip: meta?.ip || '127.0.0.1',
        location: 'Manama, Bahrain',
        device: meta?.device || 'Web Browser',
      });
      throw new Error('Invalid password for this account.');
    }

    // Lazy migration: transparently upgrade scrypt$ (or legacy unhashed) passwords to bcrypt
    if (needsPasswordMigration(passwordHash)) {
      const upgradedHash = await hashPassword(passwordAttempt);
      await executeQuery(SQL_MIGRATE_PASSWORD_HASH, [upgradedHash, rawUser.id]);
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
   * Dedicated Administrator Authentication against MySQL database.
   * Supports dual-format verification (scrypt & bcrypt) with lazy migration to bcrypt.
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
    const isValid = await verifyPassword(passwordAttempt, passwordHash);

    if (!isValid) {
      await this.logSecurityEvent({
        userId: rawUser.id,
        action: 'admin_login_failed',
        ip: meta?.ip || '127.0.0.1',
        location: 'Manama, Bahrain',
        device: meta?.device || 'Admin Portal',
      });
      throw new Error('Invalid administrator email or password.');
    }

    // Lazy migration: transparently upgrade scrypt$ (or legacy unhashed) passwords to bcrypt.
    // Preserves must_change_password if it was already set (e.g. seeded superadmin).
    if (needsPasswordMigration(passwordHash)) {
      const upgradedHash = await hashPassword(passwordAttempt);
      await executeQuery(SQL_MIGRATE_PASSWORD_HASH, [upgradedHash, rawUser.id]);
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
      mustChangePassword: Boolean(user.mustChangePassword),
    });

    return { user, token };
  }

  /**
   * Update password in MySQL (always hashed with bcrypt) and clear must_change_password.
   */
  public async updatePassword(userId: string, newPassword: string): Promise<boolean> {
    const hashed = await hashPassword(newPassword);
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
   * Update administrator password to a new bcrypt-hashed password, clearing must_change_password = 0
   * and issuing a fresh admin session token.
   * For password sessions, verifies currentPassword; for active passwordless OTP recovery sessions,
   * allows setting a new password directly if currentPassword is omitted.
   */
  public async changeAdminPassword(
    adminId: string,
    currentPassword: string,
    newPassword: string,
    meta?: { ip?: string; device?: string; authMethod?: 'password' | 'otp' }
  ): Promise<{ user: MySQLUser; token: string }> {
    if (!newPassword || newPassword.length < 8) {
      throw new Error('New administrator password must be at least 8 characters.');
    }

    const rows = await executeQuery(
      'SELECT id, email, password_hash, role FROM users WHERE id = ? LIMIT 1',
      [adminId]
    );
    if (!rows || rows.length === 0) {
      throw new Error('Administrator account not found.');
    }

    const rawUser = rows[0];
    if (rawUser.role !== 'admin' && rawUser.role !== 'superadmin') {
      throw new Error('Access denied: administrator role required.');
    }

    const isOtpRecovery = meta?.authMethod === 'otp' && !currentPassword;
    if (!isOtpRecovery) {
      if (!currentPassword) {
        throw new Error('Current password is required.');
      }
      const isValid = await verifyPassword(currentPassword, rawUser.password_hash || rawUser.password);
      if (!isValid) {
        throw new Error('Current password is incorrect.');
      }
    }

    const hashed = await hashPassword(newPassword);
    await executeQuery(SQL_UPDATE_USER_PASSWORD, [hashed, adminId]);

    await this.logSecurityEvent({
      userId: adminId,
      action: 'password_changed',
      ip: meta?.ip || '127.0.0.1',
      location: 'Manama, Bahrain',
      device: meta?.device || 'Admin Portal',
    });

    const user = (await this.findUserById(adminId))!;
    const token = signAdminToken({
      id: user.id,
      email: user.email,
      role: user.role === 'superadmin' ? 'superadmin' : 'admin',
      mustChangePassword: false,
      authMethod: meta?.authMethod || 'password',
    });

    return { user, token };
  }

  /**
   * Toggle per-admin Email Code Sign-In ("otp_login_enabled") setting in MariaDB/MySQL
   */
  public async updateAdminOtpLoginSetting(
    targetAdminId: string,
    enabled: boolean,
    actorAdminId: string,
    meta?: { ip?: string; device?: string }
  ): Promise<MySQLUser> {
    const existing = await this.findUserById(targetAdminId);
    if (!existing || (existing.role !== 'admin' && existing.role !== 'superadmin')) {
      throw new Error('Administrator account not found.');
    }

    await executeQuery(SQL_UPDATE_ADMIN_OTP_SETTING, [enabled ? 1 : 0, targetAdminId]);

    await this.logSecurityEvent({
      userId: targetAdminId,
      action: enabled ? 'otp_login_enabled' : 'otp_login_disabled',
      ip: meta?.ip || '127.0.0.1',
      location: 'Manama, Bahrain',
      device: meta?.device || `Updated by ${actorAdminId}`,
    });

    return (await this.findUserById(targetAdminId))!;
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
   * Password is always hashed with bcrypt (cost 12) before writing to MySQL.
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
    const hashedPassword = await hashPassword(adminData.password);

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
      mustChangePassword: Boolean(row.must_change_password ?? row.mustChangePassword),
      otpLoginEnabled:
        row.otp_login_enabled === undefined && row.otpLoginEnabled === undefined
          ? true
          : Boolean(row.otp_login_enabled ?? row.otpLoginEnabled),
      savedAddresses: parseJson(row.saved_addresses || row.savedAddresses),
      wishlist: parseJson(row.wishlist),
      connectedProviders: parseJson(row.connected_providers || row.connectedProviders),
      createdAt: row.created_at || row.createdAt,
      updatedAt: row.updated_at || row.updatedAt,
    };
  }
}

export const authService = new MySQLAuthService();
