/**
 * Unified Frontend API Client & Data Layer for The Bedtime Store
 *
 * Requirements:
 * 1. Components never call fetch directly; all network interactions route through this layer.
 * 2. In development, logs every API call (method, URL, status, response).
 * 3. Read Strategy: Stale-While-Revalidate (instant UI load from cache + background revalidation).
 * 4. Write Strategy: Write-Through (write to MariaDB first; only update cache on server confirmation).
 * 5. Throws descriptive errors with server error text ({ error, code, sqlMessage }).
 */

import { browserCache } from './cache';
import { Category, Product, Order, OrderStatus } from '../types';

export interface ApiErrorResponse {
  error: string;
  code?: string;
  sqlMessage?: string | null;
}

class ApiService {
  private isDev(): boolean {
    try {
      return Boolean(import.meta.env?.DEV);
    } catch {
      return false;
    }
  }

  /**
   * Internal request wrapper with debug logging and standard error parsing
   */
  private async request<T = any>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    const method = options.method || 'GET';
    const startTime = Date.now();

    if (this.isDev()) {
      console.log(`[API CALL] ${method} ${url}`, options.body ? JSON.parse(options.body as string) : '');
    }

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(options.headers || {}),
        },
        ...options,
      });
    } catch (networkErr: any) {
      if (this.isDev()) {
        console.error(`[API NETWORK FAILURE] ${method} ${url}:`, networkErr?.message);
      }
      throw new Error(`Network failure connecting to API: ${networkErr?.message || 'Server unreachable'}`);
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
      console.log(`[API RES] ${method} ${url} -> status ${response.status} (${duration}ms):`, data);
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
  // CATEGORIES (Stale-While-Revalidate Read + Write-Through)
  // ==========================================================================

  public async getCategories(
    onRevalidate?: (fresh: Category[]) => void
  ): Promise<Category[]> {
    const cacheKey = 'catalog_categories';
    const cached = browserCache.get<Category[]>(cacheKey);

    // Background revalidator
    const fetchFresh = async () => {
      try {
        const res = await this.request<{ success: boolean; categories: Category[] }>('/api/categories');
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
      // Fire background revalidation
      fetchFresh();
      return cached.data;
    }

    return await fetchFresh();
  }

  public async createCategory(categoryData: Partial<Category>): Promise<Category> {
    const res = await this.request<{ success: boolean; category: Category; id: string }>('/api/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });

    const saved = res.category;
    // Write-Through: update cache only after database confirms success
    const current = browserCache.get<Category[]>('catalog_categories');
    if (current.data) {
      browserCache.set('catalog_categories', [...current.data, saved], true);
    } else {
      browserCache.set('catalog_categories', [saved], true);
    }

    return saved;
  }

  public async updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
    const res = await this.request<{ success: boolean; category: Category; id: string }>(`/api/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });

    const updated = res.category;
    // Write-Through update
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
    await this.request(`/api/categories/${id}`, { method: 'DELETE' });

    // Write-Through invalidate
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
  // PRODUCTS (Stale-While-Revalidate Read + Write-Through)
  // ==========================================================================

  public async getProducts(
    onRevalidate?: (fresh: Product[]) => void
  ): Promise<Product[]> {
    const cacheKey = 'catalog_products';
    const cached = browserCache.get<Product[]>(cacheKey);

    const fetchFresh = async () => {
      try {
        const res = await this.request<{ success: boolean; products: Product[] }>('/api/products');
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
    const res = await this.request<{ success: boolean; product: Product; id: string }>('/api/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });

    const saved = res.product;
    // Write-Through: update cache only after database confirms success
    const current = browserCache.get<Product[]>('catalog_products');
    if (current.data) {
      browserCache.set('catalog_products', [saved, ...current.data.filter((p) => p.id !== saved.id)], true);
    } else {
      browserCache.set('catalog_products', [saved], true);
    }

    return saved;
  }

  public async updateProduct(id: string, updates: any): Promise<Product> {
    const res = await this.request<{ success: boolean; product: Product; id: string }>(`/api/products/${id}`, {
      method: 'PUT',
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
    await this.request(`/api/products/${id}`, { method: 'DELETE' });

    const current = browserCache.get<Product[]>('catalog_products');
    if (current.data) {
      browserCache.set(
        'catalog_products',
        current.data.filter((p) => p.id !== id),
        true
      );
    }
  }

  // ==========================================================================
  // ORDERS (Memory/Session Cache Only - Never Stored in localStorage)
  // ==========================================================================

  public async getOrders(
    onRevalidate?: (fresh: Order[]) => void
  ): Promise<Order[]> {
    const cacheKey = 'orders_session_list';
    // Orders are kept in memory only for security
    const cached = browserCache.get<Order[]>(cacheKey);

    const fetchFresh = async () => {
      try {
        const res = await this.request<{ success: boolean; orders: Order[] }>('/api/orders');
        const orders = res.orders || [];
        browserCache.set(cacheKey, orders, false); // persistToLocalStorage = false
        if (onRevalidate) {
          onRevalidate(orders);
        }
        return orders;
      } catch (err: any) {
        if (this.isDev()) {
          console.warn('[API Background Revalidate Warning] Orders fetch failed:', err?.message);
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

  public async createOrder(orderData: any): Promise<Order> {
    const res = await this.request<{ success: boolean; order: Order; id: string }>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });

    const saved = res.order;
    // Invalidate product catalog cache because stock changed during order insertion
    browserCache.invalidate('catalog_products');

    // Update orders in session memory
    const current = browserCache.get<Order[]>('orders_session_list');
    if (current.data) {
      browserCache.set('orders_session_list', [saved, ...current.data], false);
    }

    return saved;
  }

  public async updateOrder(id: string, updates: any): Promise<Order> {
    const res = await this.request<{ success: boolean; order: Order; id: string }>(`/api/orders/${id}`, {
      method: 'PUT',
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
    await this.request(`/api/orders/${id}`, { method: 'DELETE' });

    const current = browserCache.get<Order[]>('orders_session_list');
    if (current.data) {
      browserCache.set(
        'orders_session_list',
        current.data.filter((o) => o.id !== id),
        false
      );
    }
  }

  // ==========================================================================
  // SYSTEM HEALTH & CACHE FLUSH
  // ==========================================================================

  public async checkHealth(): Promise<{ status: string; db: string; env: string; version: string }> {
    return await this.request('/api/health');
  }

  /**
   * Manual Refresh Data: flushes in-memory and browser cache and re-queries MariaDB directly
   */
  public async clearCacheAndRefresh(): Promise<{
    categories: Category[];
    products: Product[];
    orders: Order[];
  }> {
    // 1. Clear frontend browser cache
    browserCache.clearAll();

    // 2. Notify server to flush API cache as well
    try {
      await this.request('/api/cache/clear', { method: 'POST' });
    } catch {
      // Non-fatal
    }

    // 3. Re-fetch all dynamic data fresh from MariaDB
    const [categories, products, orders] = await Promise.all([
      this.getCategories(),
      this.getProducts(),
      this.getOrders(),
    ]);

    return { categories, products, orders };
  }
}

export const api = new ApiService();
