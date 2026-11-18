import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, BahrainAddress, AuthProviderType, SecurityLogItem } from '../types';
import {
  analyzePassword,
  hashPasswordWithSalt,
  getBruteForceStatus,
  recordFailedLogin,
  resetFailedLogin,
  GOOGLE_PRESETS,
  GITHUB_PRESETS,
} from '../services/authSecurity';
import { api } from '../services/api';

interface StoredAuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'customer' | 'admin' | 'superadmin';
  passwordHash: string;
  authProvider?: AuthProviderType;
  avatarUrl?: string;
  savedAddresses: BahrainAddress[];
  wishlist: string[];
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  connectedProviders?: {
    google?: boolean;
    github?: boolean;
    email?: boolean;
  };
  securityLogs?: SecurityLogItem[];
  createdAt: string;
}

interface AuthContextType {
  // Public storefront customer session
  currentUser: User | null;
  isGuest: boolean;
  loginAsGuest: (guestName?: string) => User;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string; remainingSeconds?: number; user?: User }>;
  register: (data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
  }) => Promise<{ success: boolean; error?: string }>;
  loginWithOAuth: (
    provider: 'google' | 'github',
    preset?: { name: string; email: string; avatarUrl: string; handle?: string }
  ) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => void;

  // Dedicated Administrator session (completely separate from public storefront auth)
  adminUser: User | null;
  adminToken: string | null;
  isAdmin: boolean;
  loginAdmin: (
    email: string,
    pass: string
  ) => Promise<{ success: boolean; error?: string; remainingSeconds?: number; admin?: User }>;
  logoutAdmin: () => void;
  changeAdminPassword: (currentPass: string, newPass: string) => Promise<{ success: boolean; error?: string }>;
  createAdminUser: (data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    password: string;
  }) => Promise<{ success: boolean; error?: string; admin?: User }>;

  // Customer account utilities
  changePassword: (currentPass: string, newPass: string) => Promise<{ success: boolean; error?: string }>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; resetCode?: string; error?: string }>;
  resetPasswordWithToken: (email: string, code: string, newPass: string) => Promise<{ success: boolean; error?: string }>;
  toggleTwoFactor: (enabled: boolean) => Promise<{
    success: boolean;
    secret?: string;
    qrData?: string;
    backupCodes?: string[];
  }>;
  linkOAuthProvider: (provider: 'google' | 'github') => Promise<{ success: boolean; error?: string }>;
  unlinkOAuthProvider: (provider: 'google' | 'github') => Promise<{ success: boolean; error?: string }>;
  addAddress: (address: BahrainAddress) => void;
  toggleWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;

  // Global Public Auth Modal Controls
  isAuthModalOpen: boolean;
  authModalMode: 'signin' | 'signup' | 'forgot';
  openAuthModal: (mode?: 'signin' | 'signup' | 'forgot') => void;
  closeAuthModal: () => void;
  setAuthModalMode: (mode: 'signin' | 'signup' | 'forgot') => void;
}

const USERS_DB_KEY = 'bedtime_registered_users_v2';
const ADMIN_USER_KEY = 'bedtime_admin_user';
const ADMIN_TOKEN_KEY = 'bedtime_admin_token';
const RESET_CODES_KEY = 'bedtime_auth_reset_codes';

export const createGuestUser = (guestName = 'Guest'): User => ({
  id: `guest-${Date.now()}`,
  firstName: guestName,
  lastName: 'Shopper',
  email: '',
  phone: '',
  role: 'customer',
  isGuest: true,
  authProvider: 'guest',
  savedAddresses: [],
  wishlist: [],
  createdAt: new Date().toISOString(),
});

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Public storefront user (never holds an admin session automatically)
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('bedtime_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.role !== 'admin' && parsed.role !== 'superadmin') {
          return parsed;
        }
      } catch {
        // fallback
      }
    }
    return createGuestUser();
  });

  // Dedicated Admin session state
  const [adminUser, setAdminUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(ADMIN_USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [adminToken, setAdminToken] = useState<string | null>(() => {
    return api.getAdminToken();
  });

  const isAdmin = Boolean(
    adminUser && adminToken && (adminUser.role === 'admin' || adminUser.role === 'superadmin')
  );

  // Verify existing admin token with backend on mount (if not an offline preview token)
  useEffect(() => {
    if (!adminToken || adminToken.startsWith('offline-admin-')) return;
    api.getAdminSession(adminToken).then((res) => {
      if (res?.success && res.admin) {
        setAdminUser(res.admin);
        localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(res.admin));
      }
    }).catch((err: any) => {
      if (err?.status === 401 || err?.status === 403) {
        setAdminUser(null);
        setAdminToken(null);
        api.setAdminToken(null);
        localStorage.removeItem(ADMIN_USER_KEY);
      }
    });
  }, [adminToken]);

  // Global modal state (customer auth only)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup' | 'forgot'>('signin');

  const isGuest = Boolean(currentUser?.isGuest);

  const loginAsGuest = (guestName = 'Guest'): User => {
    const guest = createGuestUser(guestName);
    setCurrentUser(guest);
    setIsAuthModalOpen(false);
    return guest;
  };

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('bedtime_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('bedtime_user');
    }
  }, [currentUser]);

  const openAuthModal = (mode: 'signin' | 'signup' | 'forgot' = 'signin') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const getStoredUsers = (): StoredAuthUser[] => {
    try {
      const raw = localStorage.getItem(USERS_DB_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const saveStoredUsers = (users: StoredAuthUser[]) => {
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
  };

  const logSecurityAction = (user: User, action: SecurityLogItem['action']): User => {
    const newLog: SecurityLogItem = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      action,
      ip: '82.194.22.10',
      location: 'Manama, Bahrain',
      device: navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop Browser',
    };
    return {
      ...user,
      securityLogs: [newLog, ...(user.securityLogs || []).slice(0, 19)],
    };
  };

  /**
   * Public Storefront Customer Login (Strict Role Separation: rejects admins)
   */
  const login = async (
    email: string,
    pass: string
  ): Promise<{ success: boolean; error?: string; remainingSeconds?: number; user?: User }> => {
    const trimmedEmail = email.toLowerCase().trim();
    if (!trimmedEmail) {
      return { success: false, error: 'Email address is required.' };
    }

    const lockStatus = getBruteForceStatus(trimmedEmail);
    if (lockStatus.isLocked) {
      return {
        success: false,
        error: `Account temporarily locked due to multiple failed login attempts. Please wait ${lockStatus.remainingSeconds} seconds before trying again.`,
        remainingSeconds: lockStatus.remainingSeconds,
      };
    }

    // Try real backend customer login first
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password: pass }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success && data.user) {
        resetFailedLogin(trimmedEmail);
        const loggedIn = logSecurityAction(data.user, 'login_success');
        setCurrentUser(loggedIn);
        return { success: true, user: loggedIn };
      }
      if (res.status === 401 || res.status === 403) {
        const failRecord = recordFailedLogin(trimmedEmail);
        return {
          success: false,
          error: data?.error || `Invalid email or password. ${failRecord.attemptsRemaining} attempt(s) remaining.`,
          remainingSeconds: failRecord.isLocked ? 60 : undefined,
        };
      }
      // On 503 DB unavailable, fall through to client-side customer verification
    } catch {
      // Network offline fallback below
    }

    const submittedHash = await hashPasswordWithSalt(pass);
    const storedUsers = getStoredUsers();
    const storedUser = storedUsers.find((u) => u.email.toLowerCase() === trimmedEmail);

    if (storedUser) {
      if (storedUser.role === 'admin' || storedUser.role === 'superadmin') {
        return {
          success: false,
          error: 'Login failed.',
        };
      }
      if (storedUser.passwordHash === submittedHash) {
        resetFailedLogin(trimmedEmail);
        const { passwordHash: _, ...safeUser } = storedUser;
        const loggedIn = logSecurityAction(safeUser, 'login_success');
        setCurrentUser(loggedIn);
        return { success: true, user: loggedIn };
      }
    }

    const failRecord = recordFailedLogin(trimmedEmail);
    if (failRecord.isLocked) {
      return {
        success: false,
        error: `Security Alert: 5 consecutive failed attempts. Your account has been temporarily locked for 60 seconds.`,
        remainingSeconds: 60,
      };
    }

    return {
      success: false,
      error: `Invalid email or password. ${failRecord.attemptsRemaining} attempt(s) remaining before security lockout.`,
    };
  };

  /**
   * Dedicated Administrator Login (/admin/login -> POST /api/admin/login)
   */
  const loginAdmin = async (
    email: string,
    pass: string
  ): Promise<{ success: boolean; error?: string; remainingSeconds?: number; admin?: User }> => {
    const trimmedEmail = email.toLowerCase().trim();
    if (!trimmedEmail || !pass) {
      return { success: false, error: 'Administrator email and password are required.' };
    }

    const lockKey = `admin:${trimmedEmail}`;
    const lockStatus = getBruteForceStatus(lockKey);
    if (lockStatus.isLocked) {
      return {
        success: false,
        error: `Administrator portal temporarily locked. Please wait ${lockStatus.remainingSeconds} seconds before trying again.`,
        remainingSeconds: lockStatus.remainingSeconds,
      };
    }

    try {
      const res = await api.loginAdmin(trimmedEmail, pass);
      if (res?.success && res.admin && res.token) {
        resetFailedLogin(lockKey);
        const loggedInAdmin = logSecurityAction(res.admin, 'login_success');
        api.setAdminToken(res.token);
        setAdminToken(res.token);
        setAdminUser(loggedInAdmin);
        localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(loggedInAdmin));
        return { success: true, admin: loggedInAdmin };
      }
    } catch (err: any) {
      // Real auth rejection from server (invalid password / non-admin user)
      if (err?.status === 401 || err?.status === 403 || err?.status === 400) {
        const failRecord = recordFailedLogin(lockKey);
        return {
          success: false,
          error: failRecord.isLocked
            ? 'Too many failed administrator sign-in attempts. Locked for 60 seconds.'
            : err?.message || `Invalid administrator credentials. ${failRecord.attemptsRemaining} attempt(s) remaining.`,
          remainingSeconds: failRecord.isLocked ? 60 : undefined,
        };
      }
      // Only fall back to hashed local store if DB is unavailable (503) or network error
    }

    // Hashed local fallback when MariaDB is offline in preview
    const submittedHash = await hashPasswordWithSalt(pass);
    const storedUsers = getStoredUsers();
    const storedAdmin = storedUsers.find(
      (u) => u.email.toLowerCase() === trimmedEmail && (u.role === 'admin' || u.role === 'superadmin')
    );

    if (storedAdmin && storedAdmin.passwordHash === submittedHash) {
      resetFailedLogin(lockKey);
      const { passwordHash: _, ...safeAdmin } = storedAdmin;
      const loggedInAdmin = logSecurityAction(safeAdmin, 'login_success');
      const fallbackToken = `offline-admin-${safeAdmin.id}-${Date.now()}`;
      api.setAdminToken(fallbackToken);
      setAdminToken(fallbackToken);
      setAdminUser(loggedInAdmin);
      localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(loggedInAdmin));
      return { success: true, admin: loggedInAdmin };
    }

    const failRecord = recordFailedLogin(lockKey);
    if (failRecord.isLocked) {
      return {
        success: false,
        error: 'Too many failed administrator sign-in attempts. Locked for 60 seconds.',
        remainingSeconds: 60,
      };
    }

    return {
      success: false,
      error: `Invalid administrator email or password. ${failRecord.attemptsRemaining} attempt(s) remaining.`,
    };
  };

  const logoutAdmin = () => {
    api.logoutAdmin();
    api.setAdminToken(null);
    setAdminToken(null);
    setAdminUser(null);
    localStorage.removeItem(ADMIN_USER_KEY);
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  };

  /**
   * Rotate Administrator Password (used for must_change_password enforcement & admin security)
   */
  const changeAdminPassword = async (
    currentPass: string,
    newPass: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isAdmin || !adminUser) {
      return { success: false, error: 'Administrator session is not active.' };
    }
    const analysis = analyzePassword(newPass);
    if (!analysis.checks.minLength || !analysis.checks.hasUpper || !analysis.checks.hasLower || !analysis.checks.hasNumber || !analysis.checks.hasSpecial) {
      return {
        success: false,
        error: 'New password must be at least 8 characters and include uppercase, lowercase, numeric, and special characters.',
      };
    }

    try {
      const res = await api.changeAdminPassword(currentPass, newPass);
      if (res?.success && res.admin && res.token) {
        api.setAdminToken(res.token);
        setAdminToken(res.token);
        const updatedAdmin = { ...res.admin, mustChangePassword: false };
        setAdminUser(updatedAdmin);
        localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(updatedAdmin));
        return { success: true };
      }
      return { success: false, error: 'Failed to update administrator password.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update administrator password.' };
    }
  };

  /**
   * Public Customer Sign Up (Customer Role Only)
   */
  const register = async (data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
  }) => {
    const emailTrimmed = data.email.toLowerCase().trim();
    if (!emailTrimmed || !data.firstName || !data.lastName) {
      return { success: false, error: 'Please fill in all required profile fields.' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      return { success: false, error: 'Please enter a valid email address (e.g. name@domain.com).' };
    }

    const analysis = analyzePassword(data.password);
    if (!analysis.checks.minLength) {
      return { success: false, error: 'Password must be at least 8 characters in length.' };
    }
    if (!analysis.checks.hasUpper || !analysis.checks.hasLower) {
      return { success: false, error: 'Password must contain both uppercase (A-Z) and lowercase (a-z) letters.' };
    }
    if (!analysis.checks.hasNumber) {
      return { success: false, error: 'Password must contain at least one numeric digit (0-9).' };
    }
    if (!analysis.checks.hasSpecial) {
      return { success: false, error: 'Password must contain at least one special symbol (!@#$%^&*).' };
    }
    if (!analysis.checks.notCommon) {
      return { success: false, error: 'Password is too common or easily guessable. Please choose a more complex phrase.' };
    }

    const storedUsers = getStoredUsers();
    if (storedUsers.some((u) => u.email.toLowerCase() === emailTrimmed)) {
      return { success: false, error: 'An account with this email address already exists. Please sign in.' };
    }

    const passwordHash = await hashPasswordWithSalt(data.password);

    const newUser: User = {
      id: `usr-${Date.now()}`,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: emailTrimmed,
      phone: data.phone.trim(),
      role: 'customer',
      isGuest: false,
      authProvider: 'email',
      connectedProviders: { email: true },
      twoFactorEnabled: false,
      savedAddresses: [],
      wishlist: currentUser?.wishlist || [],
      createdAt: new Date().toISOString(),
      securityLogs: [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'account_created',
          ip: '82.194.22.10',
          location: 'Manama, Bahrain',
          device: 'Web Client',
        },
      ],
    };

    const storedRecord: StoredAuthUser = {
      ...newUser,
      passwordHash,
    };
    saveStoredUsers([...storedUsers, storedRecord]);

    try {
      const regRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          email: emailTrimmed,
          phone: data.phone.trim(),
          password: data.password,
          isGuest: false,
        }),
      });
      if (!regRes.ok) {
        const body = await regRes.json().catch(() => ({}));
        console.error('[Auth] Account was NOT saved to the database:', regRes.status, body?.error || body);
      }
    } catch (apiErr) {
      console.warn('MySQL auth registration sync note:', apiErr);
    }

    setCurrentUser(newUser);
    return { success: true };
  };

  /**
   * Google & GitHub OAuth Integration (Public Customer Storefront Only)
   */
  const loginWithOAuth = async (
    provider: 'google' | 'github',
    preset?: { name: string; email: string; avatarUrl: string; handle?: string }
  ) => {
    await new Promise((resolve) => setTimeout(resolve, 400));

    let chosen = preset;
    if (!chosen) {
      chosen = provider === 'google' ? GOOGLE_PRESETS[0] : GITHUB_PRESETS[0];
    }

    const nameParts = chosen.name.split(' ');
    const firstName = nameParts[0] || (provider === 'github' ? chosen.handle || 'GitHub User' : 'Google User');
    const lastName = nameParts.slice(1).join(' ') || '';

    const storedUsers = getStoredUsers();
    const existing = storedUsers.find(
      (u) => u.email.toLowerCase() === chosen!.email.toLowerCase() && u.role !== 'admin' && u.role !== 'superadmin'
    );

    if (existing) {
      const updatedUser: User = {
        ...existing,
        role: 'customer',
        avatarUrl: chosen.avatarUrl || existing.avatarUrl,
        connectedProviders: {
          ...existing.connectedProviders,
          [provider]: true,
        },
      };
      const loggedIn = logSecurityAction(updatedUser, 'oauth_connected');
      setCurrentUser(loggedIn);
      return { success: true, user: loggedIn };
    }

    const newOAuthUser: User = {
      id: `usr-${provider}-${Date.now()}`,
      firstName,
      lastName,
      email: chosen.email,
      phone: '+973 3900 8822',
      role: 'customer',
      authProvider: provider,
      avatarUrl: chosen.avatarUrl,
      connectedProviders: {
        [provider]: true,
      },
      twoFactorEnabled: false,
      savedAddresses: [],
      wishlist: [],
      createdAt: new Date().toISOString(),
      securityLogs: [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'oauth_connected',
          ip: '82.194.22.10',
          location: 'Manama, Bahrain',
          device: `${provider === 'google' ? 'Google OAuth 2.0' : 'GitHub OAuth'}`,
        },
      ],
    };

    setCurrentUser(newOAuthUser);
    return { success: true, user: newOAuthUser };
  };

  /**
   * Create New Boutique Administrator (Authenticated Admin Session Only)
   * Password is hashed via bcrypt (cost 12) on the backend before MySQL storage.
   */
  const createAdminUser = async (data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    password: string;
  }): Promise<{ success: boolean; error?: string; admin?: User }> => {
    if (!isAdmin || !adminToken) {
      return { success: false, error: 'Unauthorized: Please sign in through the Admin Portal to create administrators.' };
    }

    const emailTrimmed = data.email.toLowerCase().trim();
    if (!emailTrimmed || !data.firstName.trim() || !data.password) {
      return { success: false, error: 'Please provide first name, official boutique email, and password.' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      return { success: false, error: 'Please enter a valid official email address.' };
    }

    const analysis = analyzePassword(data.password);
    if (!analysis.checks.minLength) {
      return { success: false, error: 'Admin password must be at least 8 characters in length.' };
    }
    if (!analysis.checks.hasUpper || !analysis.checks.hasLower) {
      return { success: false, error: 'Admin password must contain both uppercase (A-Z) and lowercase (a-z) letters.' };
    }
    if (!analysis.checks.hasNumber) {
      return { success: false, error: 'Admin password must contain at least one numeric digit (0-9).' };
    }
    if (!analysis.checks.hasSpecial) {
      return { success: false, error: 'Admin password must contain at least one special symbol (!@#$%^&*).' };
    }

    const passwordHash = await hashPasswordWithSalt(data.password);
    const storedUsers = getStoredUsers();

    // Persist to MySQL via separated protected /api/admin/create-admin route (hashes with bcrypt on server)
    let createdServerAdmin: User | null = null;
    try {
      const apiRes = await api.createAdminAccount({
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: emailTrimmed,
        phone: data.phone?.trim() || '+973 1722 8844',
        password: data.password,
      });
      if (apiRes?.success && apiRes.admin) {
        createdServerAdmin = apiRes.admin;
      }
    } catch (apiErr: any) {
      // Reject validation, duplicate, or auth errors directly
      if (apiErr?.status && apiErr.status !== 503) {
        return { success: false, error: apiErr?.message || 'Failed to create administrator in database.' };
      }
      // If 503 DB unavailable, fall through only if not duplicate in local cache
      if (storedUsers.some((u) => u.email.toLowerCase() === emailTrimmed)) {
        return { success: false, error: 'An administrator or user account with this email already exists.' };
      }
    }

    const newAdminUser: User = createdServerAdmin || {
      id: `usr-admin-${Date.now()}`,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: emailTrimmed,
      phone: data.phone?.trim() || '+973 1722 8844',
      role: 'admin',
      isGuest: false,
      authProvider: 'email',
      connectedProviders: { email: true },
      twoFactorEnabled: false,
      savedAddresses: [
        {
          buildingNumber: 'Atelier Boutique 10',
          roadNumber: 'Road 3812',
          blockNumber: 'Block 338',
          area: 'Adliya',
          city: 'Manama',
          country: 'Bahrain',
        },
      ],
      wishlist: [],
      createdAt: new Date().toISOString(),
      securityLogs: [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'admin_created',
          ip: '82.194.22.10',
          location: 'Manama, Bahrain',
          device: `Created by admin ${adminUser?.email || 'Boutique Console'}`,
        },
      ],
    };

    const storedRecord: StoredAuthUser = {
      ...newAdminUser,
      passwordHash,
    };
    saveStoredUsers([...storedUsers.filter((u) => u.email.toLowerCase() !== emailTrimmed), storedRecord]);

    return { success: true, admin: newAdminUser };
  };

  /**
   * Password Change with Verification & Policy Enforcement
   */
  const changePassword = async (
    currentPass: string,
    newPass: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: 'User is not authenticated.' };

    const analysis = analyzePassword(newPass);
    if (analysis.score < 50) {
      return { success: false, error: 'New password does not satisfy required strength criteria (8+ chars, upper, lower, number, symbol).' };
    }

    const currentHash = await hashPasswordWithSalt(currentPass);
    const newHash = await hashPasswordWithSalt(newPass);

    const storedUsers = getStoredUsers();
    const index = storedUsers.findIndex((u) => u.id === currentUser.id);

    if (index !== -1) {
      if (storedUsers[index].passwordHash !== currentHash) {
        return { success: false, error: 'Current password provided is incorrect.' };
      }
      storedUsers[index].passwordHash = newHash;
      saveStoredUsers(storedUsers);
    }

    try {
      await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, newPassword: newPass }),
      });
    } catch {
      // best effort
    }

    const updated = logSecurityAction(
      {
        ...currentUser,
        passwordHash: newHash,
      },
      'password_changed'
    );
    setCurrentUser(updated);
    return { success: true };
  };

  const requestPasswordReset = async (
    email: string
  ): Promise<{ success: boolean; resetCode?: string; error?: string }> => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const trimmed = email.toLowerCase().trim();
    if (!trimmed) return { success: false, error: 'Email address is required.' };

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetData = {
      email: trimmed,
      code: resetCode,
      expiresAt: Date.now() + 15 * 60 * 1000,
    };

    localStorage.setItem(RESET_CODES_KEY, JSON.stringify(resetData));
    return { success: true, resetCode };
  };

  const resetPasswordWithToken = async (
    email: string,
    code: string,
    newPass: string
  ): Promise<{ success: boolean; error?: string }> => {
    await new Promise((resolve) => setTimeout(resolve, 400));

    const raw = localStorage.getItem(RESET_CODES_KEY);
    if (!raw) return { success: false, error: 'No active password reset request found.' };

    try {
      const data = JSON.parse(raw);
      if (data.email !== email.toLowerCase().trim() || data.code !== code.trim()) {
        return { success: false, error: 'Invalid or expired 6-digit security code.' };
      }
      if (Date.now() > data.expiresAt) {
        return { success: false, error: 'Security code has expired. Please request a new one.' };
      }

      const analysis = analyzePassword(newPass);
      if (analysis.score < 50) {
        return { success: false, error: 'New password does not meet security requirements.' };
      }

      const newHash = await hashPasswordWithSalt(newPass);
      const storedUsers = getStoredUsers();
      const userIndex = storedUsers.findIndex((u) => u.email.toLowerCase() === email.toLowerCase().trim());

      if (userIndex !== -1) {
        storedUsers[userIndex].passwordHash = newHash;
        saveStoredUsers(storedUsers);
      }

      localStorage.removeItem(RESET_CODES_KEY);
      resetFailedLogin(email);
      return { success: true };
    } catch {
      return { success: false, error: 'Password reset failed. Please try again.' };
    }
  };

  const toggleTwoFactor = async (
    enabled: boolean
  ): Promise<{
    success: boolean;
    secret?: string;
    qrData?: string;
    backupCodes?: string[];
  }> => {
    if (!currentUser) return { success: false };

    if (enabled) {
      const secret = 'BDS-' + Array.from({ length: 16 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[Math.floor(Math.random() * 32)]).join('');
      const backupCodes = ['9214-4820', '8812-3901', '7721-6543', '1109-8422', '4521-9988', '3320-1178'];
      const qrData = `otpauth://totp/TheBedtimeStore:${encodeURIComponent(currentUser.email)}?secret=${secret}&issuer=TheBedtimeStoreBH`;

      const updated = logSecurityAction(
        {
          ...currentUser,
          twoFactorEnabled: true,
          twoFactorSecret: secret,
        },
        '2fa_enabled'
      );
      setCurrentUser(updated);
      return { success: true, secret, qrData, backupCodes };
    } else {
      const updated = logSecurityAction(
        {
          ...currentUser,
          twoFactorEnabled: false,
          twoFactorSecret: undefined,
        },
        '2fa_disabled'
      );
      setCurrentUser(updated);
      return { success: true };
    }
  };

  const linkOAuthProvider = async (provider: 'google' | 'github') => {
    if (!currentUser) return { success: false, error: 'Not logged in' };
    const updated = logSecurityAction(
      {
        ...currentUser,
        connectedProviders: {
          ...currentUser.connectedProviders,
          [provider]: true,
        },
      },
      'oauth_connected'
    );
    setCurrentUser(updated);
    return { success: true };
  };

  const unlinkOAuthProvider = async (provider: 'google' | 'github') => {
    if (!currentUser) return { success: false, error: 'Not logged in' };
    const updated = logSecurityAction(
      {
        ...currentUser,
        connectedProviders: {
          ...currentUser.connectedProviders,
          [provider]: false,
        },
      },
      'oauth_disconnected'
    );
    setCurrentUser(updated);
    return { success: true };
  };

  const logout = () => {
    const guest = createGuestUser();
    setCurrentUser(guest);
  };

  const addAddress = (address: BahrainAddress) => {
    if (!currentUser) return;
    const updated = {
      ...currentUser,
      savedAddresses: [...currentUser.savedAddresses, address],
    };
    setCurrentUser(updated);
  };

  const toggleWishlist = (productId: string) => {
    if (!currentUser) {
      openAuthModal('signin');
      return;
    }
    const exists = currentUser.wishlist.includes(productId);
    const updatedWishlist = exists
      ? currentUser.wishlist.filter((id) => id !== productId)
      : [...currentUser.wishlist, productId];

    setCurrentUser({
      ...currentUser,
      wishlist: updatedWishlist,
    });
  };

  const isInWishlist = (productId: string) => {
    return !!currentUser?.wishlist.includes(productId);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAdmin,
        isGuest,
        loginAsGuest,
        login,
        register,
        loginWithOAuth,
        logout,
        adminUser,
        adminToken,
        loginAdmin,
        logoutAdmin,
        changeAdminPassword,
        createAdminUser,
        changePassword,
        requestPasswordReset,
        resetPasswordWithToken,
        toggleTwoFactor,
        linkOAuthProvider,
        unlinkOAuthProvider,
        addAddress,
        toggleWishlist,
        isInWishlist,
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        setAuthModalMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
