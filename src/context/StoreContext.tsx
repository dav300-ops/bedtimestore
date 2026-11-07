import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, Category, Order, Coupon, OrderStatus } from '../types';
import { api } from '../services/api';
import { browserCache } from '../services/cache';

export interface CMSBannerSettings {
  announcementTextEn: string;
  announcementTextAr: string;
  heroKickerEn: string;
  heroKickerAr: string;
  heroTitleEn: string;
  heroTitleAr: string;
  heroSubtitleEn: string;
  heroSubtitleAr: string;
  heroCtaEn: string;
  heroCtaAr: string;
  logoPicUrl?: string;
}

const DEFAULT_CMS: CMSBannerSettings = {
  announcementTextEn: "24hr Delivery Guaranteed ",
  announcementTextAr: "توصيل مجاني في مملكة البحرين للطلبات أكثر من ٢٥.٠٠٠ د.ب · يتوفر توصيل سريع في نفس اليوم",
  heroKickerEn: "Spring / Summer 2026 Collection",
  heroKickerAr: "مجموعة ربيع وصيف ٢٠٢٦",
  heroTitleEn: "Sleep Beautifully. Feel Beautiful.",
  heroTitleAr: "نامي بأناقة. واشعري بالجمال.",
  heroSubtitleEn: "Handcrafted 100% mulberry silk pajamas, whisper-soft French lace slips, and ethereal bridal morning robes tailored for timeless elegance in Bahrain.",
  heroSubtitleAr: "بيجامات من حرير التوت الطبيعي ١٠٠٪، فساتين نوم انسيابية بالدانتيل الفرنسي، وأرواب صباحية فاخرة للعرائس مصممة بأناقة دائمة في البحرين.",
  heroCtaEn: "Shop Nightwear",
  heroCtaAr: "تسوقي ملابس النوم",
  logoPicUrl: "",
};

export interface InventoryBalanceItem {
  productId: string;
  sku: string;
  nameEn: string;
  nameAr: string;
  categoryNameEn?: string;
  price: number;
  totalUnitsInStock: number;
  totalValueBHD: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  variants: {
    sku: string;
    size: string;
    colorNameEn: string;
    colorHex: string;
    stock: number;
    valueBHD: number;
    status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  }[];
}

export interface InventoryOverviewData {
  totalUnits: number;
  totalInventoryValueBHD: number;
  totalProducts: number;
  totalVariants: number;
  lowStockCount: number;
  outOfStockCount: number;
  dbStatus?: any;
  productBalances: InventoryBalanceItem[];
}

export interface SalesAnalyticsData {
  summary: {
    totalSaleItems: number;
    totalOrders: number;
    distinctProductsSold: number;
    totalUnitsSold: number;
    grossRevenueBHD: number;
    averageItemValueBHD: number;
  };
  topProducts: Array<{
    productId: string;
    productSku: string;
    productNameEn: string;
    productNameAr: string;
    categoryNameEn?: string;
    unitsSold: number;
    ordersCount: number;
    totalRevenueBHD: number;
  }>;
  salesByCategory: Array<{
    categoryName: string;
    totalUnits: number;
    totalRevenueBHD: number;
    percentage: number;
  }>;
  salesByPaymentMethod: Array<{
    paymentMethod: string;
    ordersCount: number;
    totalUnits: number;
    totalRevenueBHD: number;
  }>;
  salesByRegion: Array<{
    customerArea: string;
    ordersCount: number;
    totalRevenueBHD: number;
  }>;
  dailyTrend: Array<{
    saleDate: string;
    ordersCount: number;
    unitsSold: number;
    totalRevenueBHD: number;
  }>;
}

interface StoreContextType {
  products: Product[];
  categories: Category[];
  orders: Order[];
  coupons: Coupon[];
  cms: CMSBannerSettings;
  isLoading: boolean;
  isLoadingCatalog: boolean;
  isSaving: boolean;
  saveError: string | null;
  clearSaveError: () => void;
  dbStatus: {
    connected: boolean;
    state: string;
    host?: string;
    database?: string;
    error?: string;
  };
  inventoryOverview: InventoryOverviewData | null;
  salesAnalytics: SalesAnalyticsData | null;
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => Promise<Product>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;
  duplicateProduct: (id: string) => Promise<void>;
  adjustStock: (productId: string, skuOrSize: string, colorHex: string, delta: number, absoluteNewStock?: number) => Promise<void>;
  addCategory: (category: Omit<Category, 'id'> & { id?: string }) => Promise<Category>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<Category>;
  deleteCategory: (id: string) => Promise<boolean>;
  addOrder: (order: Order) => Promise<Order>;
  recordSalesForOrder: (order: Order) => Promise<any>;
  updateOrderStatus: (orderId: string, status: OrderStatus, note?: string) => Promise<void>;
  confirmDeliveryPayment: (orderId: string, enteredCode?: string, confirmedBy?: string) => Promise<{ success: boolean; message: string }>;
  addCoupon: (coupon: Coupon) => void;
  updateCoupon: (code: string, updates: Partial<Coupon>) => void;
  deleteCoupon: (code: string) => void;
  updateCMS: (settings: Partial<CMSBannerSettings>) => void;
  deductInventory: (items: { productId: string; size: string; color: string; quantity: number }[]) => boolean;
  refreshData: () => Promise<void>;
  manualRefresh: () => Promise<void>;
  getProductById: (id: string) => Product | undefined;
  getCategoryBySlug: (slug: string) => Category | undefined;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Hydrate initial state instantly from browser cache (Stale-While-Revalidate initial pass)
  const [products, setProducts] = useState<Product[]>(() => {
    const cached = browserCache.get<Product[]>('catalog_products');
    return cached.data || [];
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const cached = browserCache.get<Category[]>('catalog_categories');
    return cached.data || [];
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const cached = browserCache.get<Order[]>('orders_session_list');
    return cached.data || [];
  });

  const [coupons, setCoupons] = useState<Coupon[]>(() => {
    try {
      const saved = localStorage.getItem('bedtime_coupons');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [cms, setCms] = useState<CMSBannerSettings>(() => {
    try {
      const saved = localStorage.getItem('bedtime_cms');
      return saved ? JSON.parse(saved) : DEFAULT_CMS;
    } catch {
      return DEFAULT_CMS;
    }
  });

  const [dbStatus, setDbStatus] = useState<{
    connected: boolean;
    state: string;
    host?: string;
    database?: string;
    error?: string;
  }>({
    connected: false,
    state: 'connecting',
  });

  const [inventoryOverview, setInventoryOverview] = useState<InventoryOverviewData | null>(null);
  const [salesAnalytics, setSalesAnalytics] = useState<SalesAnalyticsData | null>(null);

  const clearSaveError = () => setSaveError(null);

  /**
   * Stale-While-Revalidate Refresh:
   * Revalidates categories, products, and orders in the background.
   */
  const refreshData = async () => {
    try {
      // 1. Fetch categories via Stale-While-Revalidate
      const cats = await api.getCategories((fresh) => setCategories(fresh));
      if (cats && cats.length > 0) {
        setCategories(cats);
      }

      // 2. Fetch products via Stale-While-Revalidate
      const prods = await api.getProducts((fresh) => setProducts(fresh));
      if (prods && prods.length > 0) {
        setProducts(prods);
      }

      // 3. Fetch orders (session/memory only)
      const ords = await api.getOrders((fresh) => setOrders(fresh));
      if (ords && ords.length > 0) {
        setOrders(ords);
      }

      // 4. Fetch inventory balances & sales metrics
      fetch('/api/inventory/balances')
        .then((res) => (res.ok ? res.json() : null))
        .then((invData) => {
          if (invData?.success) setInventoryOverview(invData);
        })
        .catch(() => {});

      fetch('/api/sales/analytics')
        .then((res) => (res.ok ? res.json() : null))
        .then((salesData) => {
          if (salesData?.success) setSalesAnalytics(salesData);
        })
        .catch(() => {});

      // 5. Check database status via SELECT 1 health
      fetch('/api/health')
        .then((res) => (res.ok ? res.json() : null))
        .then((health) => {
          if (health) {
            setDbStatus({
              connected: health.db === 'up',
              state: health.db === 'up' ? 'connected' : 'disconnected',
              host: health.dbDetails?.host,
              database: health.dbDetails?.database,
              error: health.error,
            });
          }
        })
        .catch(() => {
          setDbStatus({ connected: false, state: 'disconnected', error: 'Health check offline' });
        });
    } catch (err: any) {
      console.warn('[StoreContext] Refresh notice:', err?.message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Manual Refresh: clears browser cache completely and fetches fresh data
   */
  const manualRefresh = async () => {
    setIsLoading(true);
    try {
      const { categories: freshCats, products: freshProds, orders: freshOrds } =
        await api.clearCacheAndRefresh();
      setCategories(freshCats);
      setProducts(freshProds);
      setOrders(freshOrds);
    } catch (err: any) {
      console.error('[StoreContext] Manual refresh error:', err?.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Save non-sensitive metadata (CMS, coupons)
  useEffect(() => {
    try {
      localStorage.setItem('bedtime_coupons', JSON.stringify(coupons));
    } catch {}
  }, [coupons]);

  useEffect(() => {
    try {
      localStorage.setItem('bedtime_cms', JSON.stringify(cms));
    } catch {}
  }, [cms]);

  // ==========================================================================
  // WRITE-THROUGH MUTATIONS: Write to MariaDB first; update state on success
  // ==========================================================================

  const addProduct = async (newProd: Omit<Product, 'id' | 'createdAt'>): Promise<Product> => {
    setIsSaving(true);
    setSaveError(null);
    try {
      // 1. Write to MariaDB first
      const saved = await api.createProduct(newProd);
      // 2. Only after server confirms success, update UI state
      setProducts((prev) => [saved, ...prev.filter((p) => p.id !== saved.id)]);
      return saved;
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to save product to database';
      setSaveError(errorMsg);
      console.error('[StoreContext] addProduct error:', errorMsg);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>): Promise<Product> => {
    setIsSaving(true);
    setSaveError(null);
    try {
      // 1. Write to MariaDB first
      const updated = await api.updateProduct(id, updates);
      // 2. Update state only after server confirmation
      setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
      return updated;
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to update product in database';
      setSaveError(errorMsg);
      console.error('[StoreContext] updateProduct error:', errorMsg);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const deleteProduct = async (id: string): Promise<void> => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await api.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to delete product from database';
      setSaveError(errorMsg);
      console.error('[StoreContext] deleteProduct error:', errorMsg);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const duplicateProduct = async (id: string) => {
    const orig = products.find((p) => p.id === id);
    if (!orig) return;
    const duplicated = {
      ...orig,
      id: `prod-${Date.now()}`,
      nameEn: `${orig.nameEn} (Copy)`,
      nameAr: `${orig.nameAr} (نسخة)`,
      sku: `${orig.sku}-CPY`,
      createdAt: new Date().toISOString(),
    };
    await addProduct(duplicated);
  };

  const adjustStock = async (
    productId: string,
    skuOrSize: string,
    colorHex: string,
    delta: number,
    absoluteNewStock?: number
  ) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/products/${productId}/stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skuOrSize, colorHex, delta, absoluteNewStock }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.product) {
        setProducts((prev) => prev.map((p) => (p.id === productId ? data.product : p)));
        browserCache.invalidate('catalog_products');
      }
    } catch (err: any) {
      console.error('[StoreContext] adjustStock error:', err?.message);
    } finally {
      setIsSaving(false);
    }
  };

  const addCategory = async (categoryData: Omit<Category, 'id'> & { id?: string }): Promise<Category> => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const saved = await api.createCategory(categoryData);
      setCategories((prev) => [...prev.filter((c) => c.id !== saved.id), saved]);
      return saved;
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to save category to database';
      setSaveError(errorMsg);
      console.error('[StoreContext] addCategory error:', errorMsg);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const updateCategory = async (id: string, updates: Partial<Category>): Promise<Category> => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const updated = await api.updateCategory(id, updates);
      setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
      return updated;
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to update category in database';
      setSaveError(errorMsg);
      console.error('[StoreContext] updateCategory error:', errorMsg);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCategory = async (id: string): Promise<boolean> => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await api.deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      return true;
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to delete category from database';
      setSaveError(errorMsg);
      console.error('[StoreContext] deleteCategory error:', errorMsg);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const recordSalesForOrder = async (order: Order) => {
    try {
      const res = await fetch('/api/sales/record-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order }),
      });
      return await res.json();
    } catch {
      return null;
    }
  };

  const addOrder = async (order: Order): Promise<Order> => {
    setIsSaving(true);
    setSaveError(null);
    try {
      // 1. Transactional write to MariaDB
      const saved = await api.createOrder(order);
      // 2. On confirmed write, update local state
      setOrders((prev) => [saved, ...prev.filter((o) => o.id !== saved.id)]);
      // 3. Revalidate products in background as stock was decremented
      api.getProducts().then((fresh) => setProducts(fresh)).catch(() => {});
      return saved;
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to place order in database';
      setSaveError(errorMsg);
      console.error('[StoreContext] addOrder error:', errorMsg);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus, note?: string) => {
    setIsSaving(true);
    try {
      const updated = await api.updateOrder(orderId, { orderStatus: status, note });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    } catch (err: any) {
      console.error('[StoreContext] updateOrderStatus error:', err?.message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeliveryPayment = async (
    orderId: string,
    enteredCode?: string,
    confirmedBy = 'Admin / Courier'
  ): Promise<{ success: boolean; message: string }> => {
    const targetOrder = orders.find((o) => o.id === orderId || o.orderNumber === orderId);
    if (!targetOrder) {
      return { success: false, message: 'Order not found.' };
    }

    if (enteredCode && enteredCode.trim() !== targetOrder.deliveryVerificationCode) {
      return {
        success: false,
        message: `Incorrect 6-digit verification code. Please check customer invoice.`,
      };
    }

    try {
      const res = await fetch(`/api/orders/${targetOrder.id}/confirm-payment`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await refreshData();
        return {
          success: true,
          message: `Delivery payment verified and marked as Paid for ${targetOrder.orderNumber}!`,
        };
      }
      return { success: false, message: data?.error || 'Failed to confirm payment on server' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Network error confirming payment' };
    }
  };

  const addCoupon = (coupon: Coupon) => {
    setCoupons((prev) => [...prev, coupon]);
  };

  const updateCoupon = (code: string, updates: Partial<Coupon>) => {
    setCoupons((prev) =>
      prev.map((c) => (c.code === code ? { ...c, ...updates } : c))
    );
  };

  const deleteCoupon = (code: string) => {
    setCoupons((prev) => prev.filter((c) => c.code !== code));
  };

  const updateCMS = (settings: Partial<CMSBannerSettings>) => {
    setCms((prev) => ({ ...prev, ...settings }));
  };

  const deductInventory = (items: { productId: string; size: string; color: string; quantity: number }[]): boolean => {
    setProducts((prev) =>
      prev.map((product) => {
        const itemMatches = items.filter((item) => item.productId === product.id);
        if (itemMatches.length === 0) return product;

        const updatedVariants = product.variants.map((variant) => {
          const matchedItem = itemMatches.find(
            (item) => item.size === variant.size && (item.color === variant.colorNameEn || item.color === variant.colorNameAr || item.color === variant.colorHex)
          );
          if (matchedItem) {
            const newStock = Math.max(0, variant.stock - matchedItem.quantity);
            return { ...variant, stock: newStock };
          }
          return variant;
        });

        return { ...product, variants: updatedVariants };
      })
    );

    return true;
  };

  const getProductById = (id: string) => products.find((p) => p.id === id);
  const getCategoryBySlug = (slug: string) => categories.find((c) => c.slug === slug);

  return (
    <StoreContext.Provider
      value={{
        products,
        categories,
        orders,
        coupons,
        cms,
        isLoading,
        isLoadingCatalog: isLoading,
        isSaving,
        saveError,
        clearSaveError,
        dbStatus,
        inventoryOverview,
        salesAnalytics,
        addProduct,
        updateProduct,
        deleteProduct,
        duplicateProduct,
        adjustStock,
        addCategory,
        updateCategory,
        deleteCategory,
        addOrder,
        recordSalesForOrder,
        updateOrderStatus,
        confirmDeliveryPayment,
        addCoupon,
        updateCoupon,
        deleteCoupon,
        updateCMS,
        deductInventory,
        refreshData,
        manualRefresh,
        getProductById,
        getCategoryBySlug,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
