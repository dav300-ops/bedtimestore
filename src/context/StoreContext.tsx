import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, Category, Order, Coupon, ProductReview, OrderStatus } from '../types';

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
  dbStatus: {
    connected: boolean;
    state: string;
    host?: string;
    database?: string;
    error?: string;
  };
  inventoryOverview: InventoryOverviewData | null;
  salesAnalytics: SalesAnalyticsData | null;
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  duplicateProduct: (id: string) => Promise<void>;
  adjustStock: (productId: string, skuOrSize: string, colorHex: string, delta: number, absoluteNewStock?: number) => Promise<void>;
  addCategory: (category: Omit<Category, 'id'> & { id?: string }) => Promise<any>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<any>;
  deleteCategory: (id: string) => Promise<boolean>;
  addOrder: (order: Order) => void;
  recordSalesForOrder: (order: Order) => Promise<any>;
  updateOrderStatus: (orderId: string, status: OrderStatus, note?: string) => void;
  confirmDeliveryPayment: (orderId: string, enteredCode?: string, confirmedBy?: string) => { success: boolean; message: string };
  addCoupon: (coupon: Coupon) => void;
  updateCoupon: (code: string, updates: Partial<Coupon>) => void;
  deleteCoupon: (code: string) => void;
  updateCMS: (settings: Partial<CMSBannerSettings>) => void;
  deductInventory: (items: { productId: string; size: string; color: string; quantity: number }[]) => boolean;
  refreshData: () => Promise<void>;
  getProductById: (id: string) => Product | undefined;
  getCategoryBySlug: (slug: string) => Category | undefined;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Dynamic state populated exclusively by database queries
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('bedtime_products');
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('bedtime_categories');
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('bedtime_orders');
    return saved ? JSON.parse(saved) : [];
  });

  const [coupons, setCoupons] = useState<Coupon[]>(() => {
    const saved = localStorage.getItem('bedtime_coupons');
    return saved ? JSON.parse(saved) : [];
  });

  const [cms, setCms] = useState<CMSBannerSettings>(() => {
    const saved = localStorage.getItem('bedtime_cms');
    return saved ? JSON.parse(saved) : DEFAULT_CMS;
  });

  useEffect(() => {
    localStorage.setItem('bedtime_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('bedtime_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('bedtime_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('bedtime_coupons', JSON.stringify(coupons));
  }, [coupons]);

  useEffect(() => {
    localStorage.setItem('bedtime_cms', JSON.stringify(cms));
  }, [cms]);

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

  const refreshData = async () => {
    try {
      // 1. Fetch live dynamic products from MySQL
      const prodRes = await fetch('/api/products');
      if (prodRes.ok) {
        const data = await prodRes.json();
        if (data?.success && Array.isArray(data.products) && data.products.length > 0) {
          setProducts(data.products);
        }
      }

      // 2. Fetch live dynamic categories from MySQL
      const catRes = await fetch('/api/categories');
      if (catRes.ok) {
        const catData = await catRes.json();
        if (catData?.success && Array.isArray(catData.categories) && catData.categories.length > 0) {
          setCategories(catData.categories);
        }
      }

      // 3. Fetch live dynamic orders from MySQL
      const ordRes = await fetch('/api/orders');
      if (ordRes.ok) {
        const ordData = await ordRes.json();
        if (ordData?.success && Array.isArray(ordData.orders) && ordData.orders.length > 0) {
          setOrders(ordData.orders);
        }
      }

      // 4. Fetch inventory stock balances from MySQL
      const invRes = await fetch('/api/inventory/balances');
      if (invRes.ok) {
        const invData = await invRes.json();
        if (invData?.success) {
          setInventoryOverview(invData);
        }
      }

      // 5. Fetch MySQL status
      const dbRes = await fetch('/api/db/status');
      if (dbRes.ok) {
        const dbData = await dbRes.json();
        if (dbData?.status) {
          setDbStatus(dbData.status);
        }
      }

      // 6. Fetch MySQL aggregated product sales analytics
      const salesRes = await fetch('/api/sales/analytics');
      if (salesRes.ok) {
        const salesData = await salesRes.json();
        if (salesData?.success) {
          setSalesAnalytics(salesData);
        }
      }
    } catch (err) {
      console.warn('MySQL API sync notice:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 15000);
    return () => clearInterval(interval);
  }, []);

  const addProduct = async (newProd: Omit<Product, 'id' | 'createdAt'>) => {
    const product: Product = {
      ...newProd,
      id: `prod-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setProducts((prev) => [product, ...prev]);

    try {
      await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      });
      refreshData();
    } catch (err) {
      console.warn('Error saving product to server:', err);
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );

    try {
      await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      refreshData();
    } catch (err) {
      console.warn('Error updating product on server:', err);
    }
  };

  const deleteProduct = async (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));

    try {
      await fetch(`/api/products/${id}`, { method: 'DELETE' });
      refreshData();
    } catch (err) {
      console.warn('Error deleting product on server:', err);
    }
  };

  const duplicateProduct = async (id: string) => {
    const orig = products.find((p) => p.id === id);
    if (!orig) return;
    const duplicated: Product = {
      ...orig,
      id: `prod-${Date.now()}`,
      nameEn: `${orig.nameEn} (Copy)`,
      nameAr: `${orig.nameAr} (نسخة)`,
      sku: `${orig.sku}-CPY`,
      createdAt: new Date().toISOString(),
    };
    setProducts((prev) => [duplicated, ...prev]);

    try {
      await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicated),
      });
      refreshData();
    } catch (err) {
      console.warn('Error duplicating product on server:', err);
    }
  };

  const adjustStock = async (
    productId: string,
    skuOrSize: string,
    colorHex: string,
    delta: number,
    absoluteNewStock?: number
  ) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        const updatedVariants = (p.variants || []).map((v) => {
          const match =
            (v.sku === skuOrSize || v.size === skuOrSize) &&
            (!colorHex || v.colorHex.toLowerCase() === colorHex.toLowerCase());
          if (match) {
            const newStock =
              typeof absoluteNewStock === 'number'
                ? Math.max(0, absoluteNewStock)
                : Math.max(0, (v.stock || 0) + delta);
            return { ...v, stock: newStock };
          }
          return v;
        });
        return { ...p, variants: updatedVariants };
      })
    );

    try {
      await fetch(`/api/products/${productId}/stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skuOrSize, colorHex, delta, absoluteNewStock }),
      });
      refreshData();
    } catch (err) {
      console.warn('Error syncing stock adjustment:', err);
    }
  };

  const addCategory = async (categoryData: Omit<Category, 'id'> & { id?: string }) => {
    const slug =
      categoryData.slug ||
      (categoryData.nameEn || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    const tempId = categoryData.id || `cat-${slug || Date.now()}`;
    const newCategory: Category = {
      ...categoryData,
      id: tempId,
      slug: slug || tempId,
      displayOrder: categoryData.displayOrder ?? (categories.length + 1),
      active: categoryData.active !== undefined ? categoryData.active : true,
    };
    setCategories((prev) => [...prev, newCategory]);

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCategory),
      });
      const data = await res.json();
      if (data?.success && data.category) {
        setCategories((prev) =>
          prev.map((c) => (c.id === tempId ? data.category : c))
        );
        return data.category;
      }
      refreshData();
      return newCategory;
    } catch (err) {
      console.warn('Error saving category to MySQL database:', err);
      return newCategory;
    }
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );

    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data?.success && data.category) {
        setCategories((prev) =>
          prev.map((c) => (c.id === id ? data.category : c))
        );
        return data.category;
      }
      refreshData();
    } catch (err) {
      console.warn('Error updating category on server:', err);
    }
  };

  const deleteCategory = async (id: string): Promise<boolean> => {
    setCategories((prev) => prev.filter((c) => c.id !== id));

    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      const data = await res.json();
      refreshData();
      return data?.success ?? true;
    } catch (err) {
      console.warn('Error deleting category on server:', err);
      return false;
    }
  };

  const recordSalesForOrder = async (order: Order) => {
    try {
      const res = await fetch('/api/sales/record-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order }),
      });
      const data = await res.json();
      refreshData();
      return data;
    } catch (err) {
      console.warn('Failed to record product sales in MySQL database:', err);
      return null;
    }
  };

  const addOrder = (order: Order) => {
    setOrders((prev) => [order, ...prev]);

    // Persist full order in MySQL
    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    }).catch((err) => console.warn('Failed to save order in MySQL:', err));

    // Asynchronously record individual product sales line items into MySQL
    recordSalesForOrder(order);
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus, note?: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const newHistory = [
          ...o.statusHistory,
          {
            status,
            timestamp: new Date().toISOString(),
            note,
          },
        ];
        return {
          ...o,
          orderStatus: status,
          statusHistory: newHistory,
          updatedAt: new Date().toISOString(),
        };
      })
    );

    // Persist status change to MySQL
    fetch(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, note }),
    }).catch((err) => console.warn('Failed to update order status in MySQL:', err));
  };

  const confirmDeliveryPayment = (
    orderId: string,
    enteredCode?: string,
    confirmedBy = 'Admin / Courier'
  ): { success: boolean; message: string } => {
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

    const now = new Date().toISOString();
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === targetOrder.id) {
          return {
            ...o,
            paymentStatus: 'Paid' as const,
            isDeliveryPaidConfirmed: true,
            deliveryPaymentConfirmedAt: now,
            deliveryPaymentConfirmedBy: confirmedBy,
            orderStatus: o.orderStatus === 'Shipped' || o.orderStatus === 'Preparing' ? ('Delivered' as const) : o.orderStatus,
            statusHistory: [
              ...o.statusHistory,
              {
                status: 'Delivered' as const,
                timestamp: now,
                note: `Payment confirmed upon delivery (${targetOrder.deliveryVerificationCode}) by ${confirmedBy}`,
              },
            ],
            updatedAt: now,
          };
        }
        return o;
      })
    );

    // Persist payment confirmation to MySQL
    fetch(`/api/orders/${targetOrder.id}/confirm-payment`, {
      method: 'POST',
    }).catch((err) => console.warn('Failed to confirm order payment in MySQL:', err));

    return {
      success: true,
      message: `Delivery payment verified and marked as Paid for ${targetOrder.orderNumber}!`,
    };
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

    fetch('/api/inventory/deduct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
      .then(refreshData)
      .catch((e) => console.warn('Deduct sync error:', e));

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
        getProductById,
        getCategoryBySlug,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = (): StoreContextType => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
