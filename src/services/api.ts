/**
 * Unified Frontend API Client & Data Layer for The Bedtime Store
 *
 * Requirements:
 * 1. Components never call fetch directly; all network interactions route through this layer.
 * 2. Public storefront endpoints (/api/*) are strictly separated from protected Admin endpoints (/api/admin/*).
 * 3. Read Strategy: Stale-While-Revalidate (instant UI load from cache + background revalidation).
 * 4. Write Strategy: Write-Through (write to MariaDB first; only update cache on server confirmation).
 */

import { browserCache } from './cache';
import { Category, Product, Order } from '../types';

export interface ApiErrorResponse {
  error: string;
  code?: string;
  sqlMessage?: string | null;
}

const ADMIN_TOKEN_STORAGE_KEY = 'bedtime_admin_token';

class ApiService {
  private isDev(): boolean {
    try {
      return Boolean(import.meta.env?.DEV);
    } catch {
      return false;
    }
  }

  public getAdminToken(): string | null {
    try {
      return localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  public setAdminToken(token: string | null): void {
    try {
      if (token) {
        localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
      } else {
        localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }

  private getAdminHeaders(): Record<string, string> {
    const token = this.getAdminToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private resolveUrl(url: string): string {
    if (/^https?:\/\//i.test(url)) return url;
    try {
      const base = (import.meta as any).env?.VITE_API_BASE_URL || '';
      if (base && typeof base === 'string') {
        const cleanBase = base.replace(/\/+$/, '');
        const cleanPath = url.startsWith('/') ? url : `/${url}`;
        return `${cleanBase}${cleanPath}`;
      }
    } catch {
      // fall through to relative same-origin path
    }
    return url;
  }

  /**
   * Internal request wrapper with transient GET retry, debug logging, and standard error parsing
   */
  private async request<T = any>(
    url: string,
    options: RequestInit & { silentNetworkError?: boolean } = {}
  ): Promise<T> {
    const { silentNetworkError, ...fetchOptions } = options;
    const method = (fetchOptions.method || 'GET').toUpperCase();
    const resolvedUrl = this.resolveUrl(url);
    const startTime = Date.now();

    if (this.isDev()) {
      console.log(`[API CALL] ${method} ${url}`);
    }

    const maxAttempts = method === 'GET' ? 3 : 1;
    let response: Response | null = null;
    let lastNetworkErr: any = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        response = await fetch(resolvedUrl, {
          ...fetchOptions,
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(fetchOptions.headers || {}),
          },
        });
        break;
      } catch (networkErr: any) {
        lastNetworkErr = networkErr;
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 400));
          continue;
        }
      }
    }

    if (!response) {
      if (this.isDev()) {
        if (silentNetworkError) {
          console.warn(`[API NETWORK WARNING] ${method} ${url}:`, lastNetworkErr?.message);
        } else {
          console.error(`[API NETWORK FAILURE] ${method} ${url}:`, lastNetworkErr?.message);
        }
      }
      const err: any = new Error(`Network failure connecting to API: ${lastNetworkErr?.message || 'Server unreachable'}`);
      err.code = 'NETWORK_ERROR';
      throw err;
    }

    const duration = Date.now() - startTime;
    let data: any = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch {
        data = null;
      }
    }

    if (this.isDev()) {
      console.log(`[API RES] ${method} ${url} -> status ${response.status} (${duration}ms)`);
    }

    if (!response.ok) {
      const errorMsg = data?.error || `Request failed with status ${response.status}`;
      const code = data?.code || (response.status === 400 ? 'VALIDATION_ERROR' : 'API_ERROR');
      const sqlMessage = data?.sqlMessage || null;

      const error: any = new Error(errorMsg);
      error.code = code;
      error.sqlMessage = sqlMessage;
      error.status = response.status;
      throw error;
    }

    return data as T;
  }

  // ==========================================================================
  // ADMIN AUTHENTICATION & MANAGEMENT (/api/admin/*)
  // ==========================================================================

  public async loginAdmin(email: string, password: string): Promise<{ success: boolean; admin: any; token: string }> {
    return await this.request('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  public async logoutAdmin(): Promise<void> {
    try {
      await this.request('/api/admin/logout', { method: 'POST' });
    } catch {
      // best effort
    }
  }

  public async getAdminSession(token?: string): Promise<{ success: boolean; admin: any }> {
    const authToken = token || this.getAdminToken();
    return await this.request('/api/admin/session', {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      silentNetworkError: true,
    });
  }

  public async createAdminAccount(payload: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    password: string;
  }): Promise<{ success: boolean; admin: any; message?: string }> {
    return await this.request('/api/admin/create-admin', {
      method: 'POST',
      headers: this.getAdminHeaders(),
      body: JSON.stringify(payload),
    });
  }

  public async getAdministrators(): Promise<any[]> {
    const res = await this.request<{ success: boolean; admins: any[] }>('/api/admin/administrators', {
      headers: this.getAdminHeaders(),
      silentNetworkError: true,
    });
    return res.admins || [];
  }

  public async getAdminInventoryBalances(): Promise<any> {
    return await this.request('/api/admin/inventory/balances', {
      headers: this.getAdminHeaders(),
      silentNetworkError: true,
    });
  }

  public async getAdminSalesAnalytics(): Promise<any> {
    return await this.request('/api/admin/sales/analytics', {
      headers: this.getAdminHeaders(),
      silentNetworkError: true,
    });
  }

  public async getAdminSales(limit = 100): Promise<any[]> {
    const res = await this.request<{ success: boolean; sales: any[] }>(`/api/admin/sales?limit=${limit}`, {
      headers: this.getAdminHeaders(),
      silentNetworkError: true,
    });
    return res.sales || [];
  }

  public async getAdminCustomerPurchases(): Promise<any[]> {
    const res = await this.request<{ success: boolean; customers: any[] }>('/api/admin/customer-purchases', {
      headers: this.getAdminHeaders(),
      silentNetworkError: true,
    });
    return res.customers || [];
  }

  public async getAdminCustomerPurchaseDetail(customerIdOrEmail: string): Promise<any[]> {
    const res = await this.request<{ success: boolean; purchases: any[] }>(
      `/api/admin/customer-purchases/${encodeURIComponent(customerIdOrEmail)}`,
      { headers: this.getAdminHeaders(), silentNetworkError: true }
    );
    return res.purchases || [];
  }

  public async getAdminProductBuyers(productId: string): Promise<any[]> {
    const res = await this.request<{ success: boolean; buyers: any[] }>(
      `/api/admin/product-buyers/${encodeURIComponent(productId)}`,
      { headers: this.getAdminHeaders(), silentNetworkError: true }
    );
    return res.buyers || [];
  }

  // ==========================================================================
  // CATEGORIES (Public Read + Protected Admin Writes)
  // ==========================================================================

  public async getCategories(
    onRevalidate?: (fresh: Category[]) => void
  ): Promise<Category[]> {
    const cacheKey = 'catalog_categories';
    const cached = browserCache.get<Category[]>(cacheKey);

    const fetchFresh = async () => {
      try {
        const res = await this.request<{ success: boolean; categories: Category[] }>('/api/categories', {
          silentNetworkError: true,
        });
        const categories = res.categories || [];
        browserCache.set(cacheKey, categories, true);
        if (onRevalidate) {
          onRevalidate(categories);
        }
        return categories;
      } catch (err: any) {
        if (this.isDev()) {
          console.warn('[API Background Revalidate Warning] Categories fetch failed:', err?.message);
        }
        return cached.data || [];
      }
    };

    if (cached.data && cached.data.length > 0) {
      fetchFresh();
      return cached.data;
    }

    return await fetchFresh();
  }

  public async createCategory(categoryData: Partial<Category>): Promise<Category> {
    const res = await this.request<{ success: boolean; category: Category; id: string }>('/api/admin/categories', {
      method: 'POST',
      headers: this.getAdminHeaders(),
      body: JSON.stringify(categoryData),
    });

    const saved = res.category;
    const current = browserCache.get<Category[]>('catalog_categories');
    if (current.data) {
      browserCache.set('catalog_categories', [...current.data, saved], true);
    } else {
      browserCache.set('catalog_categories', [saved], true);
    }

    return saved;
  }

  public async updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
    const res = await this.request<{ success: boolean; category: Category; id: string }>(`/api/admin/categories/${id}`, {
      method: 'PUT',
      headers: this.getAdminHeaders(),
      body: JSON.stringify(updates),
    });

    const updated = res.category;
    const current = browserCache.get<Category[]>('catalog_categories');
    if (current.data) {
      browserCache.set(
        'catalog_categories',
        current.data.map((c) => (c.id === id ? updated : c)),
        true
      );
    }

    return updated;
  }

  public async deleteCategory(id: string): Promise<void> {
    await this.request(`/api/admin/categories/${id}`, {
      method: 'DELETE',
      headers: this.getAdminHeaders(),
    });

    const current = browserCache.get<Category[]>('catalog_categories');
    if (current.data) {
      browserCache.set(
        'catalog_categories',
        current.data.filter((c) => c.id !== id),
        true
      );
    }
  }

  // ==========================================================================
  // PRODUCTS (Public Read + Protected Admin Writes)
  // ==========================================================================

  public async getProducts(
    onRevalidate?: (fresh: Product[]) => void
  ): Promise<Product[]> {
    const cacheKey = 'catalog_products';
    const cached = browserCache.get<Product[]>(cacheKey);

    const fetchFresh = async () => {
      try {
        const res = await this.request<{ success: boolean; products: Product[] }>('/api/products', {
          silentNetworkError: true,
        });
        const products = res.products || [];
        browserCache.set(cacheKey, products, true);
        if (onRevalidate) {
          onRevalidate(products);
        }
        return products;
      } catch (err: any) {
        if (this.isDev()) {
          console.warn('[API Background Revalidate Warning] Products fetch failed:', err?.message);
        }
        return cached.data || [];
      }
    };

    if (cached.data && cached.data.length > 0) {
      fetchFresh();
      return cached.data;
    }

    return await fetchFresh();
  }

  public async createProduct(productData: any): Promise<Product> {
    const res = await this.request<{ success: boolean; product: Product; id: string }>('/api/admin/products', {
      method: 'POST',
      headers: this.getAdminHeaders(),
      body: JSON.stringify(productData),
    });

    const saved = res.product;
    const current = browserCache.get<Product[]>('catalog_products');
    if (current.data) {
      browserCache.set('catalog_products', [saved, ...current.data.filter((p) => p.id !== saved.id)], true);
    } else {
      browserCache.set('catalog_products', [saved], true);
    }

    return saved;
  }

  public async updateProduct(id: string, updates: any): Promise<Product> {
    const res = await this.request<{ success: boolean; product: Product; id: string }>(`/api/admin/products/${id}`, {
      method: 'PUT',
      headers: this.getAdminHeaders(),
      body: JSON.stringify(updates),
    });

    const updated = res.product;
    const current = browserCache.get<Product[]>('catalog_products');
    if (current.data) {
      browserCache.set(
        'catalog_products',
        current.data.map((p) => (p.id === id ? updated : p)),
        true
      );
    }

    return updated;
  }

  public async deleteProduct(id: string): Promise<void> {
    await this.request(`/api/admin/products/${id}`, {
      method: 'DELETE',
      headers: this.getAdminHeaders(),
    });

    const current = browserCache.get<Product[]>('catalog_products');
    if (current.data) {
      browserCache.set(
        'catalog_products',
        current.data.filter((p) => p.id !== id),
        true
      );
    }
  }

  public async adjustProductStock(
    productId: string,
    skuOrSize: string,
    colorHex: string,
    delta: number,
    absoluteNewStock?: number
  ): Promise<Product | null> {
    const res = await this.request<{ success: boolean; product: Product }>(`/api/admin/products/${productId}/stock`, {
      method: 'POST',
      headers: this.getAdminHeaders(),
      body: JSON.stringify({ skuOrSize, colorHex, delta, absoluteNewStock }),
    });
    browserCache.invalidate('catalog_products');
    return res.product || null;
  }

  // ==========================================================================
  // ORDERS (Customer Checkout & Lookup + Protected Admin Management)
  // ==========================================================================

  public async getOrders(
    onRevalidate?: (fresh: Order[]) => void
  ): Promise<Order[]> {
    if (!this.getAdminToken()) {
      return [];
    }

    const cacheKey = 'orders_session_list';
    const cached = browserCache.get<Order[]>(cacheKey);

    const fetchFresh = async () => {
      try {
        const res = await this.request<{ success: boolean; orders: Order[] }>('/api/admin/orders', {
          headers: this.getAdminHeaders(),
          silentNetworkError: true,
        });
        const orders = res.orders || [];
        browserCache.set(cacheKey, orders, false);
        if (onRevalidate) {
          onRevalidate(orders);
        }
        return orders;
      } catch (err: any) {
        if (this.isDev()) {
          console.warn('[API Background Revalidate Warning] Admin orders fetch failed:', err?.message);
        }
        return cached.data || [];
      }
    };

    if (cached.data && cached.data.length > 0) {
      fetchFresh();
      return cached.data;
    }

    return await fetchFresh();
  }

  public async getCustomerOrders(userId: string, email: string): Promise<Order[]> {
    try {
      const res = await this.request<{ success: boolean; orders: Order[] }>(
        `/api/orders/user/${encodeURIComponent(userId)}?email=${encodeURIComponent(email)}`,
        { silentNetworkError: true }
      );
      return res.orders || [];
    } catch {
      return [];
    }
  }

  public async createOrder(orderData: any): Promise<Order> {
    const res = await this.request<{ success: boolean; order: Order; id: string }>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });

    const saved = res.order;
    browserCache.invalidate('catalog_products');

    const current = browserCache.get<Order[]>('orders_session_list');
    if (current.data) {
      browserCache.set('orders_session_list', [saved, ...current.data], false);
    }

    return saved;
  }

  public async updateOrder(id: string, updates: any): Promise<Order> {
    const res = await this.request<{ success: boolean; order: Order; id: string }>(`/api/admin/orders/${id}`, {
      method: 'PUT',
      headers: this.getAdminHeaders(),
      body: JSON.stringify(updates),
    });

    const updated = res.order;
    const current = browserCache.get<Order[]>('orders_session_list');
    if (current.data) {
      browserCache.set(
        'orders_session_list',
        current.data.map((o) => (o.id === id ? updated : o)),
        false
      );
    }

    return updated;
  }

  public async deleteOrder(id: string): Promise<void> {
    await this.request(`/api/admin/orders/${id}`, {
      method: 'DELETE',
      headers: this.getAdminHeaders(),
    });

    const current = browserCache.get<Order[]>('orders_session_list');
    if (current.data) {
      browserCache.set(
        'orders_session_list',
        current.data.filter((o) => o.id !== id),
        false
      );
    }
  }

  public async confirmDeliveryPayment(orderId: string): Promise<{ success: boolean; message?: string }> {
    return await this.request(`/api/admin/orders/${encodeURIComponent(orderId)}/confirm-payment`, {
      method: 'POST',
      headers: this.getAdminHeaders(),
    });
  }

  public async recordOrderSales(order: Order): Promise<any> {
    try {
      return await this.request('/api/sales/record-order', {
        method: 'POST',
        body: JSON.stringify({ order }),
      });
    } catch {
      return null;
    }
  }

  // ==========================================================================
  // SYSTEM HEALTH
  // ==========================================================================

  public async checkHealth(): Promise<{ status?: string; ok?: boolean; db?: string; env: string; version?: string }> {
    return await this.request('/api/health', { silentNetworkError: true });
  }
}

export const api = new ApiService();
