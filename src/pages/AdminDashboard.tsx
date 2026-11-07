import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Product, Category, Order, Coupon, OrderStatus, ProductSize, KidAgeRange } from '../types';
import { DeliveryQrCode } from '../components/DeliveryQrCode';
import { ReceiptModal } from '../components/ReceiptModal';
import { CreateAdminModal } from '../components/CreateAdminModal';
import { 
  BarChart3, 
  Package, 
  Layers, 
  ShoppingBag, 
  Tag, 
  Sliders, 
  Plus, 
  UserPlus, 
  Edit3, 
  Trash2, 
  Copy, 
  CheckCircle, 
  AlertTriangle, 
  ArrowUpRight, 
  TrendingUp, 
  Eye, 
  Search,
  Save,
  X,
  Truck,
  QrCode,
  ShieldCheck,
  Check,
  CheckCircle2,
  Camera,
  Printer,
  ScanLine,
  FileText,
  Database,
  RefreshCw,
  Upload,
  Boxes,
  Image as ImageIcon,
  FolderPlus,
  ExternalLink,
  Code2,
  DollarSign,
  PieChart,
  Activity,
  Users,
  UserCheck,
  Mail,
  Phone,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { 
  HERO_IMAGE, 
  SILK_PJ_IMAGE, 
  ROSE_SATIN_IMAGE, 
  LACE_ROBE_IMAGE, 
  KIDS_PJ_IMAGE, 
  KIDS_ROBE_IMAGE,
  KIDS_COTTON_IMAGE
} from '../assets/images';
import { optimizeImageFile } from '../utils/imageOptimizer';

interface AdminDashboardProps {
  onReturnToStore: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onReturnToStore }) => {
  const { 
    products, 
    categories, 
    orders, 
    coupons, 
    cms,
    dbStatus,
    inventoryOverview,
    salesAnalytics,
    adjustStock,
    refreshData,
    manualRefresh,
    isLoadingCatalog,
    addProduct, 
    updateProduct, 
    deleteProduct, 
    duplicateProduct,
    addCategory,
    updateCategory,
    deleteCategory,
    updateOrderStatus,
    confirmDeliveryPayment,
    addCoupon,
    updateCoupon,
    deleteCoupon,
    updateCMS,
  } = useStore();

  const { language, formatBHD, t } = useLanguage();
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'customers' | 'products' | 'inventory' | 'categories' | 'orders' | 'coupons' | 'cms' | 'admins'>('overview');
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryStockFilter, setInventoryStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [stockFeedback, setStockFeedback] = useState<string | null>(null);
  const [editingVariantStocks, setEditingVariantStocks] = useState<Record<string, number>>({});
  const [isRefreshingDb, setIsRefreshingDb] = useState(false);

  // Boutique Administrator & Staff Management State (Admin Dashboard Exclusive)
  const [isCreateAdminModalOpen, setIsCreateAdminModalOpen] = useState(false);
  const [adminList, setAdminList] = useState<any[]>([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false);
  const [adminSearch, setAdminSearch] = useState('');

  const fetchAdmins = () => {
    setIsLoadingAdmins(true);
    fetch('/api/admin/administrators')
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.admins) && data.admins.length > 0) {
          setAdminList(data.admins);
        } else {
          // Default fallback demo administrators if newly initialized
          setAdminList([
            {
              id: 'usr-admin-01',
              firstName: 'Reem',
              lastName: 'Al Mansoor',
              email: 'admin@thebedtimestore.bh',
              phone: '+973 1722 8844',
              role: 'admin',
              twoFactorEnabled: true,
              createdAt: '2026-01-01T00:00:00Z',
            },
          ]);
        }
      })
      .catch((err) => {
        console.warn('Failed to load administrators from MySQL:', err);
        setAdminList([
          {
            id: 'usr-admin-01',
            firstName: 'Reem',
            lastName: 'Al Mansoor',
            email: 'admin@thebedtimestore.bh',
            phone: '+973 1722 8844',
            role: 'admin',
            twoFactorEnabled: true,
            createdAt: '2026-01-01T00:00:00Z',
          },
        ]);
      })
      .finally(() => setIsLoadingAdmins(false));
  };

  // MySQL Product Sales & Analytics State
  const [salesRecords, setSalesRecords] = useState<any[]>([]);
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [salesSearch, setSalesSearch] = useState('');
  const [salesAreaFilter, setSalesAreaFilter] = useState('all');
  const [salesPaymentFilter, setSalesPaymentFilter] = useState('all');
  const [salesViewMode, setSalesViewMode] = useState<'table' | 'leaderboard' | 'queries'>('table');
  const [activeQueryTab, setActiveQueryTab] = useState<'insert' | 'top_products' | 'category' | 'regional' | 'summary' | 'ddl'>('insert');

  // Customer Purchases & User-Product Association State
  const [customerPurchases, setCustomerPurchases] = useState<any[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerViewMode, setCustomerViewMode] = useState<'by_customer' | 'by_product'>('by_customer');
  const [selectedCustomerEmail, setSelectedCustomerEmail] = useState<string | null>(null);
  const [customerDetailSales, setCustomerDetailSales] = useState<any[]>([]);
  const [isLoadingCustomerDetail, setIsLoadingCustomerDetail] = useState(false);
  const [selectedProductIdForBuyers, setSelectedProductIdForBuyers] = useState<string | null>(null);
  const [productBuyersList, setProductBuyersList] = useState<any[]>([]);
  const [isLoadingProductBuyers, setIsLoadingProductBuyers] = useState(false);

  React.useEffect(() => {
    if (activeTab === 'sales' || activeTab === 'overview' || activeTab === 'customers') {
      setIsLoadingSales(true);
      fetch('/api/sales?limit=100')
        .then((res) => res.json())
        .then((data) => {
          if (data?.success && Array.isArray(data.sales)) {
            setSalesRecords(data.sales);
          }
        })
        .catch((err) => console.warn('Failed to load sales line items from MySQL:', err))
        .finally(() => setIsLoadingSales(false));
    }

    if (activeTab === 'customers' || activeTab === 'overview') {
      setIsLoadingCustomers(true);
      fetch('/api/admin/customer-purchases')
        .then((res) => res.json())
        .then((data) => {
          if (data?.success && Array.isArray(data.customers)) {
            setCustomerPurchases(data.customers);
          }
        })
        .catch((err) => console.warn('Failed to load customer purchases from MySQL:', err))
        .finally(() => setIsLoadingCustomers(false));
    }

    if (activeTab === 'admins' || activeTab === 'overview') {
      fetchAdmins();
    }
  }, [activeTab]);

  const handleSelectCustomer = (email: string) => {
    if (selectedCustomerEmail === email) {
      setSelectedCustomerEmail(null);
      setCustomerDetailSales([]);
      return;
    }
    setSelectedCustomerEmail(email);
    setIsLoadingCustomerDetail(true);
    fetch(`/api/admin/customer-purchases/${encodeURIComponent(email)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.purchases)) {
          setCustomerDetailSales(data.purchases);
        }
      })
      .catch((err) => console.warn('Failed to load customer detail sales:', err))
      .finally(() => setIsLoadingCustomerDetail(false));
  };

  const handleSelectProductBuyers = (productId: string) => {
    if (selectedProductIdForBuyers === productId) {
      setSelectedProductIdForBuyers(null);
      setProductBuyersList([]);
      return;
    }
    setSelectedProductIdForBuyers(productId);
    setIsLoadingProductBuyers(true);
    fetch(`/api/admin/product-buyers/${encodeURIComponent(productId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.buyers)) {
          setProductBuyersList(data.buyers);
        }
      })
      .catch((err) => console.warn('Failed to load product buyers:', err))
      .finally(() => setIsLoadingProductBuyers(false));
  };

  // Delivery Verification (POD) Admin State
  const [enteredVerificationCode, setEnteredVerificationCode] = useState('');
  const [selectedPodOrderId, setSelectedPodOrderId] = useState('');
  const [verificationFeedback, setVerificationFeedback] = useState<{ text: string; success: boolean } | null>(null);
  const [qrInspectOrder, setQrInspectOrder] = useState<Order | null>(null);
  const [isQrScannerModalOpen, setIsQrScannerModalOpen] = useState(false);
  const [scannedRawPayload, setScannedRawPayload] = useState('');
  const [isSimulatingScan, setIsSimulatingScan] = useState(false);
  const [selectedAdminReceiptOrder, setSelectedAdminReceiptOrder] = useState<Order | null>(null);

  const handleScanQrPayload = (payload: string) => {
    if (!payload.trim()) return;
    setIsSimulatingScan(true);
    setTimeout(async () => {
      setIsSimulatingScan(false);
      const clean = payload.trim();
      const parts = clean.split(':');
      let orderNum = '';
      let pin = '';
      if (parts.length >= 3 && parts[0] === 'BDS-VERIFY') {
        orderNum = parts[1];
        pin = parts[2];
      } else if (/^\d{6}$/.test(clean)) {
        pin = clean;
      } else {
        orderNum = clean;
      }

      const matched = orders.find(
        (o) =>
          (orderNum && o.orderNumber === orderNum) ||
          (pin && o.deliveryVerificationCode === pin) ||
          o.id === clean
      );

      if (!matched) {
        setVerificationFeedback({
          text: language === 'ar' ? 'رمز QR غير معروف أو لم يتم العثور على طلب مطابق.' : 'QR Code payload not recognized or order not found.',
          success: false,
        });
        return;
      }

      const res = await confirmDeliveryPayment(
        matched.id,
        pin || matched.deliveryVerificationCode,
        currentUser?.email || 'Admin / Courier Scanner'
      );
      if (res.success) {
        setVerificationFeedback({
          text: language === 'ar' 
            ? `✓ تم مسح رمز QR بنجاح وتأكيد استلام ${formatBHD(matched.total)} للطلب ${matched.orderNumber}!`
            : `✓ QR verified successfully! Collected ${formatBHD(matched.total)} for order ${matched.orderNumber}.`,
          success: true,
        });
        setScannedRawPayload('');
        setIsQrScannerModalOpen(false);
      } else {
        setVerificationFeedback({ text: res.message, success: false });
      }
    }, 600);
  };

  // Product Editing / Creation Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [productImageUpload, setProductImageUpload] = useState<string>('');
  const [productAdditionalImages, setProductAdditionalImages] = useState<string[]>([]);
  const [newImageUrlInput, setNewImageUrlInput] = useState<string>('');
  const [productImageMeta, setProductImageMeta] = useState<{ name: string; size: string } | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState<boolean>(false);
  const [productUploadError, setProductUploadError] = useState<string | null>(null);
  const [productFeedback, setProductFeedback] = useState<{ text: string; success: boolean } | null>(null);
  const [isSavingProduct, setIsSavingProduct] = useState<boolean>(false);

  // Sync image upload state whenever a product is selected for editing or creating
  React.useEffect(() => {
    if (editingProduct) {
      setProductImageUpload(editingProduct.images?.[0] || '');
      setProductAdditionalImages(editingProduct.images?.slice(1) || []);
      setNewImageUrlInput('');
      setProductImageMeta(null);
      setProductUploadError(null);
      setProductFeedback(null);
    } else if (isCreatingProduct) {
      setProductImageUpload('');
      setProductAdditionalImages([]);
      setNewImageUrlInput('');
      setProductImageMeta(null);
      setProductUploadError(null);
      setProductFeedback(null);
    }
  }, [editingProduct, isCreatingProduct]);

  // Support high-resolution camera/device photos up to 50MB with instant optimization
  const handleProductImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingImage(true);
    setProductUploadError(null);
    try {
      const result = await optimizeImageFile(file, 2560, 0.92);
      setProductImageUpload(result.dataUrl);
      setProductImageMeta({
        name: result.originalFileName,
        size: `${result.originalSizeFormatted} → ${result.optimizedSizeFormatted} (Retina 2.5K)`,
      });
    } catch (err: any) {
      setProductUploadError(err.message || 'Failed to process image');
    } finally {
      setIsProcessingImage(false);
      e.target.value = '';
    }
  };

  // Support multiple high-resolution gallery images up to 50MB each
  const handleAddSecondaryImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsProcessingImage(true);
    setProductUploadError(null);
    try {
      const optimizedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const result = await optimizeImageFile(file, 2560, 0.92);
        optimizedUrls.push(result.dataUrl);
      }
      setProductAdditionalImages((prev) => [...prev, ...optimizedUrls]);
    } catch (err: any) {
      setProductUploadError(err.message || 'Failed to process gallery images');
    } finally {
      setIsProcessingImage(false);
      e.target.value = '';
    }
  };

  // Category Modal & Management State
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    nameEn: '',
    nameAr: '',
    slug: '',
    descriptionEn: '',
    descriptionAr: '',
    image: '',
    active: true,
    displayOrder: 1,
  });
  const [categoryImageUpload, setCategoryImageUpload] = useState<string>('');
  const [categoryFeedback, setCategoryFeedback] = useState<{ text: string; success: boolean } | null>(null);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  // Sync category form on edit / create
  React.useEffect(() => {
    if (editingCategory) {
      setCategoryForm({
        nameEn: editingCategory.nameEn || '',
        nameAr: editingCategory.nameAr || '',
        slug: editingCategory.slug || '',
        descriptionEn: editingCategory.descriptionEn || '',
        descriptionAr: editingCategory.descriptionAr || '',
        image: editingCategory.image || '',
        active: editingCategory.active !== undefined ? editingCategory.active : true,
        displayOrder: editingCategory.displayOrder || 1,
      });
      setCategoryImageUpload(editingCategory.image || '');
    } else if (isCreatingCategory) {
      setCategoryForm({
        nameEn: '',
        nameAr: '',
        slug: '',
        descriptionEn: '',
        descriptionAr: '',
        image: ROSE_SATIN_IMAGE,
        active: true,
        displayOrder: categories.length + 1,
      });
      setCategoryImageUpload(ROSE_SATIN_IMAGE);
    }
  }, [editingCategory, isCreatingCategory, categories.length]);

  const handleCategoryImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setCategoryImageUpload(base64);
        setCategoryForm((prev) => ({ ...prev, image: base64 }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.nameEn.trim()) return;

    setIsSavingCategory(true);
    try {
      const finalSlug =
        categoryForm.slug.trim() ||
        categoryForm.nameEn
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
      const finalImage = categoryImageUpload || categoryForm.image || ROSE_SATIN_IMAGE;

      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          nameEn: categoryForm.nameEn.trim(),
          nameAr: categoryForm.nameAr.trim() || categoryForm.nameEn.trim(),
          slug: finalSlug,
          descriptionEn: categoryForm.descriptionEn.trim(),
          descriptionAr: categoryForm.descriptionAr.trim(),
          image: finalImage,
          active: categoryForm.active,
          displayOrder: Number(categoryForm.displayOrder) || 1,
        });
        setCategoryFeedback({
          text: language === 'ar' ? 'تم حفظ التعديلات على القسم في قاعدة بيانات MySQL بنجاح' : 'Category updated and saved to MySQL database successfully!',
          success: true,
        });
      } else {
        await addCategory({
          nameEn: categoryForm.nameEn.trim(),
          nameAr: categoryForm.nameAr.trim() || categoryForm.nameEn.trim(),
          slug: finalSlug,
          descriptionEn: categoryForm.descriptionEn.trim(),
          descriptionAr: categoryForm.descriptionAr.trim(),
          image: finalImage,
          active: categoryForm.active,
          displayOrder: Number(categoryForm.displayOrder) || (categories.length + 1),
        });
        setCategoryFeedback({
          text: language === 'ar' ? 'تم إنشاء وحفظ القسم الجديد في قاعدة بيانات MySQL بنجاح' : 'New category created and saved to MySQL database successfully!',
          success: true,
        });
      }

      setIsCreatingCategory(false);
      setEditingCategory(null);
      setTimeout(() => setCategoryFeedback(null), 3500);
    } catch (err: any) {
      setCategoryFeedback({
        text: err?.message || 'Failed to save category to Database',
        success: false,
      });
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    try {
      await deleteCategory(categoryToDelete.id);
      setCategoryFeedback({
        text: language === 'ar'
          ? `تم حذف القسم "${categoryToDelete.nameAr || categoryToDelete.nameEn}" من قاعدة بيانات MySQL`
          : `Category "${categoryToDelete.nameEn}" deleted from Database!`,
        success: true,
      });
      setCategoryToDelete(null);
      setTimeout(() => setCategoryFeedback(null), 3500);
    } catch (err: any) {
      setCategoryFeedback({
        text: err?.message || 'Failed to delete category',
        success: false,
      });
    }
  };

  const handleToggleCategoryActive = async (cat: Category) => {
    try {
      const nextActive = !cat.active;
      await updateCategory(cat.id, { active: nextActive });
      setCategoryFeedback({
        text: language === 'ar'
          ? `تم تغيير حالة "${cat.nameAr || cat.nameEn}" إلى ${nextActive ? 'نشط' : 'مخفي'}`
          : `Category "${cat.nameEn}" status changed to ${nextActive ? 'Active' : 'Hidden'} in MySQL database`,
        success: true,
      });
      setTimeout(() => setCategoryFeedback(null), 2500);
    } catch (err: any) {
      setCategoryFeedback({
        text: err?.message || 'Failed to toggle category active status',
        success: false,
      });
    }
  };

  // Coupon Creation State
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponValue, setNewCouponValue] = useState(10);
  const [newCouponType, setNewCouponType] = useState<'percentage' | 'fixed'>('percentage');
  const [newCouponMin, setNewCouponMin] = useState(20);

  // CMS Editor State
  const [cmsForm, setCmsForm] = useState(cms);
  const [cmsSaveFeedback, setCmsSaveFeedback] = useState(false);

  // Key Metrics
  const totalSales = orders.reduce((sum, o) => sum + (o.paymentStatus === 'Paid' ? o.total : 0), 0);
  const totalOrdersCount = orders.length;
  const pendingOrdersCount = orders.filter((o) => o.orderStatus === 'Pending' || o.orderStatus === 'Preparing').length;
  const lowStockProducts = products.filter((p) =>
    p.variants.some((v) => v.stock > 0 && v.stock <= 4)
  );

  // Dynamic MySQL Inventory Balances
  const totalStockUnits = products.reduce(
    (sum, p) => sum + (p.variants || []).reduce((vSum, v) => vSum + (Number(v.stock) || 0), 0),
    0
  );
  const totalInventoryValuation = products.reduce(
    (sum, p) =>
      sum +
      (p.variants || []).reduce(
        (vSum, v) => vSum + (Number(v.stock) || 0) * (p.salePrice ?? p.price),
        0
      ),
    0
  );
  const totalVariantsCount = products.reduce((sum, p) => sum + (p.variants?.length || 0), 0);
  const outOfStockProducts = products.filter((p) =>
    (p.variants || []).every((v) => Number(v.stock) <= 0)
  );

  // Quick stock adjustment handler
  const handleQuickAdjustStock = async (
    productId: string,
    variantSku: string,
    colorHex: string,
    delta: number,
    absoluteNewStock?: number
  ) => {
    try {
      await adjustStock(productId, variantSku, colorHex, delta, absoluteNewStock);
      setStockFeedback(
        language === 'ar' ? 'تم تحديث رصيد المخزون في قاعدة بيانات MySQL بنجاح' : 'Stock balance updated in MySQL database'
      );
      setTimeout(() => setStockFeedback(null), 2500);
    } catch (err) {
      console.error('Failed to update stock:', err);
    }
  };

  // Handle Save CMS
  const handleSaveCMS = (e: React.FormEvent) => {
    e.preventDefault();
    updateCMS(cmsForm);
    setCmsSaveFeedback(true);
    setTimeout(() => setCmsSaveFeedback(false), 2000);
  };

  // Handle Create Coupon
  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim()) return;
    addCoupon({
      code: newCouponCode.trim().toUpperCase(),
      type: newCouponType,
      value: Number(newCouponValue),
      minimumOrder: Number(newCouponMin),
      usageLimit: 100,
      usedCount: 0,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '2026-12-31',
      active: true,
    });
    setNewCouponCode('');
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[var(--color-bg)]">
      
      {/* 1. Sidebar - Black Bean background with Dogwood text */}
      <aside className="w-full md:w-64 bg-[var(--color-text)] text-[var(--color-bg)] p-6 flex flex-col justify-between shrink-0 border-r border-[var(--color-accent)]/30">
        <div className="space-y-8">
          {/* Brand Wordmark */}
          <div>
            <span className="font-heading text-xl font-bold tracking-wider text-white uppercase block">
              {t.storeName}
            </span>
            <span className="text-[11px] text-[var(--color-accent)] tracking-widest uppercase font-semibold">
              {t.admin.portalTitle}
            </span>
          </div>

          {/* Nav List */}
          <nav className="space-y-1.5 text-xs">
            {[
              { id: 'overview', label: t.admin.sidebarOverview, icon: BarChart3 },
              { id: 'sales', label: language === 'ar' ? 'مبيعات المنتجات ' : language === 'ru' ? 'Продажи товаров' : 'Product Sales ', icon: TrendingUp, badge: salesAnalytics?.summary?.totalSaleItems ?? salesRecords.length },
              { id: 'customers', label: language === 'ar' ? 'مشتريات العميلات والمنتجات' : language === 'ru' ? 'Покупки клиентов и товаров' : 'Customer Purchases', icon: Users, badge: customerPurchases.length },
              { id: 'products', label: t.admin.sidebarProducts, icon: Package },
              { id: 'inventory', label: language === 'ar' ? 'المخزون والأرصدة' : language === 'ru' ? 'Склад и остатки' : 'Stock & Balances', icon: Database, badge: inventoryOverview?.lowStockCount ?? lowStockProducts.length },
              { id: 'categories', label: t.admin.sidebarCategories, icon: Layers },
              { id: 'orders', label: t.admin.sidebarOrders, icon: ShoppingBag, badge: pendingOrdersCount },
              { id: 'coupons', label: t.admin.sidebarCoupons, icon: Tag },
              { id: 'cms', label: t.admin.sidebarCMS, icon: Sliders },
              { id: 'admins', label: language === 'ar' ? 'فريق الإدارة والمشرفين' : language === 'ru' ? 'Администраторы' : 'Administrators & Staff', icon: ShieldCheck, badge: adminList.length > 0 ? adminList.length : undefined },
            ].map((item) => {
              const Icon = item.icon;
              const isSelected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xs transition-colors text-left rtl:text-right font-medium ${
                    isSelected
                      ? 'bg-[var(--color-primary)] text-white font-bold'
                      : 'hover:bg-white/10 text-[var(--color-bg)]/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-1.5 py-0.5 bg-white text-[var(--color-text)] text-[10px] font-bold rounded-full tabular-nums">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer actions */}
        <div className="pt-6 border-t border-white/10 space-y-3">
          <button
            onClick={onReturnToStore}
            className="w-full py-2.5 bg-white/10 hover:bg-white text-white hover:text-[var(--color-text)] text-xs font-semibold uppercase tracking-wider rounded-xs transition-colors text-center"
          >
            {language === 'ar' ? 'العودة للمتجر الرئيسي' : 'Return to Boutique'}
          </button>
          <p className="text-[10px] text-[var(--color-bg)]/50 text-center">
            {currentUser?.email} (Admin)
          </p>
        </div>
      </aside>

      {/* 2. Main Content Area - Dogwood background with White cards */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-[var(--color-border)] mb-8 gap-4">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-semibold text-[var(--color-text)] capitalize">
              {activeTab === 'overview' && t.admin.sidebarOverview}
              {activeTab === 'sales' && (language === 'ar' ? 'سجلات ومبيعات المنتجات' : language === 'ru' ? 'Продажи товаров' : 'Product Sales')}
              {activeTab === 'customers' && (language === 'ar' ? 'مشتريات العميلات وسجل المنتجات' : language === 'ru' ? 'Покупки клиентов и купленные товары' : 'Customer Purchases & Products Bought')}
              {activeTab === 'products' && t.admin.sidebarProducts}
              {activeTab === 'inventory' && (language === 'ar' ? 'أرصدة ومخزون المنتجات' : language === 'ru' ? 'Складской учёт и остатки' : 'Product Stock & Balances')}
              {activeTab === 'categories' && t.admin.sidebarCategories}
              {activeTab === 'orders' && t.admin.sidebarOrders}
              {activeTab === 'coupons' && t.admin.sidebarCoupons}
              {activeTab === 'cms' && t.admin.sidebarCMS}
              {activeTab === 'admins' && (language === 'ar' ? 'فريق الإدارة وصلاحيات المشرفين' : language === 'ru' ? 'Администраторы бутика' : 'Boutique Administrators & Staff Access')}
            </h1>
            
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => manualRefresh()}
              disabled={isLoadingCatalog}
              className="px-3 py-2 bg-[var(--color-card)] hover:bg-[var(--color-border)] text-[var(--color-text)] border border-[var(--color-border)] text-xs font-semibold rounded-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Clear browser cache and reload fresh data from database"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[var(--color-primary)] ${isLoadingCatalog ? 'animate-spin' : ''}`} />
              <span>{isLoadingCatalog ? (language === 'ar' ? 'جاري التحديث...' : 'Refreshing...') : (language === 'ar' ? 'تحديث البيانات' : 'Refresh data')}</span>
            </button>

            {activeTab === 'admins' && (
              <button
                type="button"
                onClick={() => setIsCreateAdminModalOpen(true)}
                className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold uppercase tracking-wider rounded-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>{language === 'ar' ? 'إضافة مشرف جديد' : language === 'ru' ? 'Создать администратора' : 'Create New Admin'}</span>
              </button>
            )}

            {activeTab === 'inventory' && (
              <button
                type="button"
                onClick={() => setIsCreatingProduct(true)}
                className="px-3.5 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold uppercase tracking-wider rounded-xs flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'إضافة منتج' : 'Add Product'}</span>
              </button>
            )}

            {activeTab === 'products' && (
              <button
                onClick={() => setIsCreatingProduct(true)}
                className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold uppercase tracking-wider rounded-xs flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>{t.admin.addNewProduct}</span>
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: OVERVIEW METRICS */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              
              <div className="bg-[var(--color-card)] p-5 rounded-sm border border-[var(--color-border)] shadow-xs space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                  {t.admin.totalSales}
                </span>
                <p className="text-xl sm:text-2xl font-bold text-[var(--color-text)] tabular-nums">
                  {formatBHD(totalSales)}
                </p>
                <div className="flex items-center gap-1 text-[11px] text-[var(--color-accent)]">
                  <TrendingUp className="w-3 h-3" />
                  <span>+18.4% vs last month</span>
                </div>
              </div>

              <div className="bg-[var(--color-card)] p-5 rounded-sm border border-[var(--color-border)] shadow-xs space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                  {t.admin.totalOrders}
                </span>
                <p className="text-xl sm:text-2xl font-bold text-[var(--color-text)] tabular-nums">
                  {totalOrdersCount}
                </p>
                <div className="flex items-center gap-1 text-[11px] text-[var(--color-text)]/60">
                  <span>{orders.filter((o) => o.paymentStatus === 'Paid').length} Completed</span>
                </div>
              </div>

              <div className="bg-[var(--color-card)] p-5 rounded-sm border border-[var(--color-border)] shadow-xs space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">
                  {t.admin.pendingFulfillment}
                </span>
                <p className="text-xl sm:text-2xl font-bold text-[var(--color-primary)] tabular-nums">
                  {pendingOrdersCount}
                </p>
                <p className="text-[11px] text-[var(--color-text)]/60">Requires dispatch</p>
              </div>

              <div 
                onClick={() => setActiveTab('inventory')}
                className="bg-[var(--color-card)] p-5 rounded-sm border border-[var(--color-border)] hover:border-[var(--color-accent)] shadow-xs space-y-1.5 cursor-pointer transition-colors"
                title="Click to manage stock balances"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                    {language === 'ar' ? 'رصيد المخزون' : 'Inventory Valuation'}
                  </span>
                  <Database className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                </div>
                <p className="text-xl sm:text-2xl font-bold text-[var(--color-text)] tabular-nums">
                  {formatBHD(totalInventoryValuation)}
                </p>
                <div className="flex items-center justify-between text-[11px] text-[var(--color-accent)]">
                  <span>{totalStockUnits} {language === 'ar' ? 'قطعة بالمستودع' : 'units in warehouse'}</span>
                </div>
              </div>

              <div 
                onClick={() => {
                  setActiveTab('inventory');
                  setInventoryStockFilter('low_stock');
                }}
                className="bg-[var(--color-card)] p-5 rounded-sm border border-[var(--color-border)] hover:border-[var(--color-primary)] shadow-xs space-y-1.5 cursor-pointer transition-colors"
                title="Click to view low stock items"
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">
                  {t.admin.lowStockAlerts}
                </span>
                <p className="text-xl sm:text-2xl font-bold text-[var(--color-primary)] tabular-nums">
                  {lowStockProducts.length}
                </p>
                <p className="text-[11px] text-[var(--color-text)]/60">{outOfStockProducts.length} out of stock</p>
              </div>

            </div>

            {/* Pay On Delivery Verification Action Banner */}
            {orders.some((o) => o.paymentMethod === 'pay_on_delivery' && o.paymentStatus === 'Pending') && (
              <div className="bg-[var(--color-text)] text-[var(--color-bg)] p-5 rounded-sm border-2 border-[var(--color-accent)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 bg-[var(--color-accent)]/20 rounded-xs border border-[var(--color-accent)] text-[var(--color-accent)]">
                    <QrCode className="w-6 h-6 text-[var(--color-accent)]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-[var(--color-primary)] text-white text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-xs tracking-wider">
                        Action Required
                      </span>
                      <h4 className="font-heading text-lg font-bold text-white">
                        {language === 'ar' ? 'طلبات بانتظار تأكيد استلام الدفع عند الاستلام' : 'Pending Pay On Delivery Collections'}
                      </h4>
                    </div>
                    <p className="text-xs text-[var(--color-bg)]/85 mt-1">
                      {language === 'ar'
                        ? `يوجد ${orders.filter((o) => o.paymentMethod === 'pay_on_delivery' && o.paymentStatus === 'Pending').length} طلب بانتظار تأكيد السداد عبر الرمز المكون من ٦ أرقام أو مسح رمز QR.`
                        : `${orders.filter((o) => o.paymentMethod === 'pay_on_delivery' && o.paymentStatus === 'Pending').length} order(s) awaiting payment collection verification via customer 6-digit PIN or optical QR code scan.`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 w-full md:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('orders');
                      setIsQrScannerModalOpen(true);
                    }}
                    className="flex-1 md:flex-none px-4 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold uppercase tracking-wider rounded-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Camera className="w-4 h-4" />
                    <span>{language === 'ar' ? 'تشغيل ماسح QR' : 'Launch QR Scanner'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className="flex-1 md:flex-none px-4 py-2.5 bg-[var(--color-bg)] hover:bg-white text-[var(--color-text)] text-xs font-semibold uppercase tracking-wider rounded-xs transition-colors"
                  >
                    <span>{language === 'ar' ? 'إدارة الطلبات' : 'View Orders'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Boutique Administrator Role & Staff Management Card */}
            <div className="bg-[var(--color-bg)] border border-[var(--color-accent)]/40 p-5 rounded-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-[var(--color-text)] text-[var(--color-bg)] flex items-center justify-center shrink-0 border border-[var(--color-accent)]/50 shadow-xs">
                  <ShieldCheck className="w-6 h-6 text-[var(--color-accent)]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-[var(--color-accent)]/20 text-[var(--color-accent)] font-bold text-[10px] uppercase px-2 py-0.5 rounded-xs border border-[var(--color-accent)]/30">
                      {language === 'ar' ? 'صلاحية المشرف' : 'Administrator Role'}
                    </span>
                    <h4 className="font-heading text-base sm:text-lg font-bold text-[var(--color-text)]">
                      {language === 'ar' ? 'إدارة المشرفين وتعيين حسابات إدارية جديدة' : 'Administrator Management & Role Assignment'}
                    </h4>
                  </div>
                  <p className="text-xs text-[var(--color-text)]/75 mt-0.5">
                    {language === 'ar'
                      ? `بصفتك مشرفاً معتمداً، يمكنك إنشاء حسابات مشرفين جديدة للمتجر وحفظها في MySQL. المشرفون الجدد سيتم توجيههم تلقائياً إلى هذه اللوحة فور تسجيل الدخول.`
                      : `You have the authority to create new store administrators. All administrators are registered in MySQL and automatically redirected to this dashboard upon login.`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreateAdminModalOpen(true)}
                  className="flex-1 md:flex-none px-4 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold uppercase tracking-wider rounded-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{language === 'ar' ? 'إنشاء مشرف جديد' : 'Create New Admin'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('admins')}
                  className="flex-1 md:flex-none px-4 py-2.5 border border-[var(--color-accent)] text-[var(--color-text)] hover:bg-[var(--color-text)] hover:text-[var(--color-bg)] text-xs font-semibold uppercase tracking-wider rounded-xs transition-colors cursor-pointer"
                >
                  <span>{language === 'ar' ? `فريق الإدارة (${adminList.length})` : `View Admins (${adminList.length})`}</span>
                </button>
              </div>
            </div>

            {/* Sales Chart / Category Breakdown (brand palette colors: Scarlet & Rural Green) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Revenue Performance by Category (Live from MySQL SQL_SELECT_SALES_BY_CATEGORY) */}
              <div className="lg:col-span-7 bg-[var(--color-card)] p-6 sm:p-8 rounded-sm border border-[var(--color-border)] shadow-xs space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading text-lg font-semibold text-[var(--color-text)]">
                    {t.admin.salesOverview}
                  </h3>
                 
                </div>
                
                <div className="space-y-4">
                  {(salesAnalytics?.salesByCategory && salesAnalytics.salesByCategory.length > 0
                    ? salesAnalytics.salesByCategory
                    : [
                        { categoryName: 'Pure Silk Collection', percentage: 45, totalRevenueBHD: 412.500 },
                        { categoryName: 'Pajama Sets', percentage: 30, totalRevenueBHD: 275.000 },
                        { categoryName: 'Night Dresses', percentage: 15, totalRevenueBHD: 137.500 },
                        { categoryName: 'Bridal Robes & Kimonos', percentage: 10, totalRevenueBHD: 91.500 },
                      ]
                  ).map((cat: any, idx: number) => {
                    const colors = ['var(--color-primary)', 'var(--color-accent)', 'var(--color-text)', 'var(--color-text-secondary)', 'var(--color-primary)'];
                    const color = colors[idx % colors.length];
                    const pct = Number(cat.percentage || 0);
                    return (
                      <div key={cat.categoryName || idx} className="space-y-1.5 text-xs">
                        <div className="flex justify-between font-medium text-[var(--color-text)]">
                          <span className="truncate pr-2">{cat.categoryName}</span>
                          <span className="tabular-nums font-bold shrink-0">
                            {formatBHD(cat.totalRevenueBHD)} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-[var(--color-bg)] h-2 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${Math.max(4, Math.min(100, pct))}%`, backgroundColor: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Best Selling Products (Live from MySQL SQL_SELECT_TOP_SELLING_PRODUCTS) */}
              <div className="lg:col-span-5 bg-[var(--color-card)] p-6 sm:p-8 rounded-sm border border-[var(--color-border)] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading text-lg font-semibold text-[var(--color-text)]">
                    {language === 'ar' ? 'القطع الأكثر طلبًا بالبحرين' : 'Best Performing Pieces'}
                  </h3>
                  <span className="text-[10px] bg-[var(--color-bg)] px-2 py-0.5 rounded-xs border border-[var(--color-border)] text-[var(--color-accent)] font-mono uppercase">
                    BEST SALES
                  </span>
                </div>

                <div className="space-y-3">
                  {(salesAnalytics?.topProducts && salesAnalytics.topProducts.length > 0
                    ? salesAnalytics.topProducts.slice(0, 4).map((tp) => {
                        const matchedProduct = products.find((p) => p.id === tp.productId);
                        return {
                          id: tp.productId,
                          nameEn: tp.productNameEn,
                          nameAr: tp.productNameAr,
                          sku: tp.productSku,
                          price: tp.totalRevenueBHD / Math.max(1, tp.unitsSold),
                          unitsSold: tp.unitsSold,
                          revenue: tp.totalRevenueBHD,
                          rating: matchedProduct?.rating || 4.9,
                          image: matchedProduct?.images[0] || HERO_IMAGE,
                        };
                      })
                    : products.slice(0, 4).map((p) => ({
                        id: p.id,
                        nameEn: p.nameEn,
                        nameAr: p.nameAr,
                        sku: p.sku,
                        price: p.price,
                        unitsSold: 8,
                        revenue: p.price * 8,
                        rating: p.rating,
                        image: p.images[0],
                      }))
                  ).map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-2 rounded-xs hover:bg-[var(--color-bg)]/30">
                      <img
                        src={item.image}
                        alt=""
                        className="w-10 h-12 object-cover rounded-xs border border-[var(--color-border)]"
                      />
                      <div className="flex-1 min-w-0 text-xs">
                        <p className="font-semibold text-[var(--color-text)] truncate">
                          {language === 'ar' ? item.nameAr : item.nameEn}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-[var(--color-text)]/70">
                          <span className="text-[var(--color-accent)] font-medium tabular-nums">{formatBHD(item.revenue)}</span>
                          <span>•</span>
                          <span>{item.unitsSold} {language === 'ar' ? 'مباع' : 'sold'}</span>
                        </div>
                      </div>
                      <div className="text-right text-[11px] text-[var(--color-text)]/60 tabular-nums">
                        ★ {item.rating}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Recent Orders Table */}
            <div className="bg-[var(--color-card)] rounded-sm border border-[var(--color-border)] shadow-xs overflow-hidden">
              <div className="p-6 border-b border-[var(--color-border)]">
                <h3 className="font-heading text-lg font-semibold text-[var(--color-text)]">
                  {t.admin.recentOrders}
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left rtl:text-right text-xs">
                  <thead className="bg-[var(--color-bg)]/50 text-[var(--color-text)] font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="p-4">Order #</th>
                      <th className="p-4">{t.admin.customer}</th>
                      <th className="p-4">{t.admin.date}</th>
                      <th className="p-4">{t.admin.total}</th>
                      <th className="p-4">{t.admin.status}</th>
                      <th className="p-4">{t.admin.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {orders.slice(0, 5).map((o) => (
                      <tr key={o.id} className="hover:bg-[var(--color-bg)]/20">
                        <td className="p-4 font-mono font-bold text-[var(--color-text)]">{o.orderNumber}</td>
                        <td className="p-4 font-medium text-[var(--color-text)]">{o.customerName}</td>
                        <td className="p-4 text-[var(--color-text)]/70">{new Date(o.createdAt).toLocaleDateString()}</td>
                        <td className="p-4 font-bold text-[var(--color-text)] tabular-nums">{formatBHD(o.total)}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase ${
                            o.orderStatus === 'Delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : o.orderStatus === 'Shipped'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {o.orderStatus}
                          </span>
                        </td>
                        <td className="p-4">
                          <select
                            value={o.orderStatus}
                            onChange={(e) => updateOrderStatus(o.id, e.target.value as OrderStatus)}
                            className="text-[11px] p-1 border border-[var(--color-border)] rounded-xs bg-white text-[var(--color-text)]"
                          >
                            <option value="Confirmed">Confirmed</option>
                            <option value="Preparing">Preparing</option>
                            <option value="Shipped">Shipped</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB: PRODUCT SALES & ANALYTICS  */}
        {activeTab === 'sales' && (
          <div className="space-y-6">
            
            {/* Sales Control Bar */}
            

            {/* Top Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-[var(--color-card)] p-5 rounded-sm border border-[var(--color-border)] shadow-xs space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                  {language === 'ar' ? 'إجمالي المبيعات' : 'Gross Sales Revenue'}
                </span>
                <p className="text-xl sm:text-2xl font-bold text-[var(--color-text)] tabular-nums">
                  {formatBHD(salesAnalytics?.summary?.grossRevenueBHD ?? totalSales)}
                </p>
                <p className="text-[11px] text-[var(--color-text)]/60">BHD (Bahraini Dinar)</p>
              </div>

              <div className="bg-[var(--color-card)] p-5 rounded-sm border border-[var(--color-border)] shadow-xs space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                  {language === 'ar' ? 'القطع المباعة' : 'Total Units Sold'}
                </span>
                <p className="text-xl sm:text-2xl font-bold text-[var(--color-text)] tabular-nums">
                  {salesAnalytics?.summary?.totalUnitsSold ?? salesRecords.reduce((s, r) => s + (r.quantity || 1), 0)}
                </p>
                <p className="text-[11px] text-[var(--color-text)]/60">Across all orders</p>
              </div>

              <div className="bg-[var(--color-card)] p-5 rounded-sm border border-[var(--color-border)] shadow-xs space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                  {language === 'ar' ? 'سجلات المبيعات' : 'Line-Item Sales Rows'}
                </span>
                <p className="text-xl sm:text-2xl font-bold text-[var(--color-text)] tabular-nums">
                  {salesAnalytics?.summary?.totalSaleItems ?? salesRecords.length}
                </p>
                <p className="text-[11px] text-[var(--color-text)]/60 font-mono">product_sales table</p>
              </div>

              <div className="bg-[var(--color-card)] p-5 rounded-sm border border-[var(--color-border)] shadow-xs space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                  {language === 'ar' ? 'منتجات مميزة مباعة' : 'Distinct SKUs Sold'}
                </span>
                <p className="text-xl sm:text-2xl font-bold text-[var(--color-text)] tabular-nums">
                  {salesAnalytics?.summary?.distinctProductsSold ?? 4}
                </p>
                <p className="text-[11px] text-[var(--color-text)]/60">From luxury catalog</p>
              </div>

              <div className="bg-[var(--color-card)] p-5 rounded-sm border border-[var(--color-border)] shadow-xs space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                  {language === 'ar' ? 'متوسط سعر القطعة' : 'Avg Item Value'}
                </span>
                <p className="text-xl sm:text-2xl font-bold text-[var(--color-text)] tabular-nums">
                  {formatBHD(salesAnalytics?.summary?.averageItemValueBHD ?? 32.500)}
                </p>
                <p className="text-[11px] text-[var(--color-text)]/60">Per line-item unit</p>
              </div>
            </div>

            {/* View Mode Switcher */}
            <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] pb-3">
              {[
                { id: 'table', label: language === 'ar' ? 'جدول سجلات المبيعات (product_sales)' : 'Line-Item Sales Table', icon: Boxes },
                { id: 'leaderboard', label: language === 'ar' ? 'القطع الأكثر مبيعًا' : 'Top Products Leaderboard', icon: TrendingUp },
               
              ].map((m) => {
                const Icon = m.icon;
                const isCurrent = salesViewMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSalesViewMode(m.id as any)}
                    className={`px-3.5 py-2 text-xs font-semibold rounded-xs flex items-center gap-2 transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-[var(--color-text)] text-white shadow-xs'
                        : 'bg-white border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-bg)]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* SUB-VIEW 1: LINE ITEM SALES TABLE */}
            {salesViewMode === 'table' && (
              <div className="bg-[var(--color-card)] rounded-sm border border-[var(--color-border)] shadow-xs overflow-hidden space-y-4">
                
                {/* Search & Filters */}
                <div className="p-4 bg-[var(--color-bg)] border-b border-[var(--color-border)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 rtl:left-auto rtl:right-3" />
                    <input
                      type="text"
                      value={salesSearch}
                      onChange={(e) => setSalesSearch(e.target.value)}
                      placeholder={language === 'ar' ? 'بحث بالمنتج أو رمز SKU أو رقم الطلب...' : 'Search by SKU, Product Name, Order #, or Customer...'}
                      className="w-full pl-9 pr-3 rtl:pr-9 rtl:pl-3 py-1.5 text-xs bg-white border border-[var(--color-border)] rounded-xs outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={salesAreaFilter}
                      onChange={(e) => setSalesAreaFilter(e.target.value)}
                      className="px-2.5 py-1.5 text-xs bg-white border border-[var(--color-border)] rounded-xs text-[var(--color-text)]"
                    >
                      <option value="all">{language === 'ar' ? 'جميع مناطق البحرين' : 'All Bahrain Areas'}</option>
                      <option value="Adliya">Adliya (العدلية)</option>
                      <option value="Seef">Seef (السيف)</option>
                      <option value="Manama">Manama (المنامة)</option>
                      <option value="Riffa">Riffa (الرفاع)</option>
                      <option value="Saar">Saar (سار)</option>
                      <option value="Amwaj Islands">Amwaj Islands (جزر أمواج)</option>
                    </select>

                    <select
                      value={salesPaymentFilter}
                      onChange={(e) => setSalesPaymentFilter(e.target.value)}
                      className="px-2.5 py-1.5 text-xs bg-white border border-[var(--color-border)] rounded-xs text-[var(--color-text)]"
                    >
                      <option value="all">{language === 'ar' ? 'جميع طرق الدفع' : 'All Payment Methods'}</option>
                      <option value="benefit_pay">BenefitPay</option>
                      <option value="apple_pay">Apple Pay</option>
                      <option value="myfatoorah">MyFatoorah</option>
                      <option value="pay_on_delivery">Pay On Delivery</option>
                    </select>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left rtl:text-right text-xs">
                    <thead className="bg-[var(--color-bg)]/50 text-[var(--color-text)] font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="p-3.5">Order # / Sale ID</th>
                        <th className="p-3.5">Product & SKU</th>
                        <th className="p-3.5">Variant (Size / Color)</th>
                        <th className="p-3.5 text-right rtl:text-left">Unit Price</th>
                        <th className="p-3.5 text-center">Qty</th>
                        <th className="p-3.5 text-right rtl:text-left">Total (BHD)</th>
                        <th className="p-3.5">Bahrain Region</th>
                        <th className="p-3.5">Payment</th>
                        <th className="p-3.5">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {salesRecords
                        .filter((s) => {
                          const query = salesSearch.toLowerCase().trim();
                          const matchSearch =
                            !query ||
                            s.orderNumber?.toLowerCase().includes(query) ||
                            s.productSku?.toLowerCase().includes(query) ||
                            s.productNameEn?.toLowerCase().includes(query) ||
                            s.productNameAr?.toLowerCase().includes(query) ||
                            s.customerName?.toLowerCase().includes(query);
                          const matchArea = salesAreaFilter === 'all' || s.customerArea === salesAreaFilter;
                          const matchPayment = salesPaymentFilter === 'all' || s.paymentMethod === salesPaymentFilter;
                          return matchSearch && matchArea && matchPayment;
                        })
                        .map((s, idx) => (
                          <tr key={s.id || idx} className="hover:bg-[var(--color-bg)]/20 transition-colors">
                            <td className="p-3.5 font-mono">
                              <span className="font-bold text-[var(--color-text)] block">{s.orderNumber}</span>
                              <span className="text-[10px] text-gray-400 block truncate max-w-[120px]">{s.id}</span>
                            </td>
                            <td className="p-3.5">
                              <span className="font-semibold text-[var(--color-text)] block">
                                {language === 'ar' ? s.productNameAr || s.productNameEn : s.productNameEn}
                              </span>
                              <span className="text-[10px] font-mono text-[var(--color-accent)] block">{s.productSku}</span>
                            </td>
                            <td className="p-3.5">
                              <div className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded-xs text-[10px] font-bold">
                                  {s.variantSize || 'M'}
                                </span>
                                <span
                                  className="w-3 h-3 rounded-full border border-[var(--color-border)]"
                                  style={{ backgroundColor: s.variantColorHex || 'var(--color-text)' }}
                                  title={s.variantColorName}
                                />
                                <span className="text-[11px] text-gray-600">{s.variantColorName}</span>
                              </div>
                            </td>
                            <td className="p-3.5 text-right rtl:text-left tabular-nums font-medium text-[var(--color-text)]">
                              {formatBHD(s.unitPrice)}
                            </td>
                            <td className="p-3.5 text-center tabular-nums font-bold text-[var(--color-text)]">
                              {s.quantity}
                            </td>
                            <td className="p-3.5 text-right rtl:text-left tabular-nums font-bold text-[var(--color-primary)]">
                              {formatBHD(s.totalAmount)}
                            </td>
                            <td className="p-3.5">
                              <span className="px-2 py-0.5 rounded-xs text-[10px] font-semibold bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-accent)]">
                                {s.customerArea || 'Manama'}
                              </span>
                            </td>
                            <td className="p-3.5">
                              <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                                {s.paymentMethod?.replace('_', ' ') || 'BenefitPay'}
                              </span>
                            </td>
                            <td className="p-3.5 text-gray-500 font-mono text-[11px]">
                              {s.saleDate ? new Date(s.saleDate).toLocaleDateString() : '2026-03-24'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {salesRecords.length === 0 && (
                  <div className="p-8 text-center text-gray-500 text-xs">
                    {language === 'ar' ? 'لا توجد سجلات مبيعات مسجلة بعد' : 'No product sales recorded yet in.'}
                  </div>
                )}
              </div>
            )}

            {/* SUB-VIEW 2: TOP SELLING PRODUCTS LEADERBOARD */}
            {salesViewMode === 'leaderboard' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(salesAnalytics?.topProducts && salesAnalytics.topProducts.length > 0
                  ? salesAnalytics.topProducts
                  : []
                ).map((tp, idx) => {
                  const matched = products.find((p) => p.id === tp.productId);
                  return (
                    <div
                      key={tp.productId || idx}
                      className="bg-[var(--color-card)] p-5 rounded-sm border border-[var(--color-border)] shadow-xs flex flex-col justify-between space-y-4 hover:border-[var(--color-accent)] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                            idx === 0
                              ? 'bg-[var(--color-primary)] text-white shadow-xs'
                              : idx === 1
                              ? 'bg-[var(--color-accent)] text-white'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            #{idx + 1}
                          </span>
                          <div>
                            <span className="text-[10px] font-mono uppercase text-[var(--color-accent)] block">{tp.productSku}</span>
                            <h4 className="font-heading font-semibold text-sm text-[var(--color-text)]">
                              {language === 'ar' ? tp.productNameAr || tp.productNameEn : tp.productNameEn}
                            </h4>
                          </div>
                        </div>
                        {matched?.images?.[0] && (
                          <img
                            src={matched.images[0]}
                            alt=""
                            className="w-12 h-14 object-cover rounded-xs border border-[var(--color-border)]"
                          />
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2 bg-[var(--color-bg)] p-2.5 rounded-xs border border-[var(--color-border)] text-center text-xs">
                        <div>
                          <span className="text-[10px] text-gray-500 block uppercase font-mono">Units Sold</span>
                          <span className="font-bold text-[var(--color-text)] text-sm tabular-nums">{tp.unitsSold}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 block uppercase font-mono">Orders</span>
                          <span className="font-bold text-[var(--color-text)] text-sm tabular-nums">{tp.ordersCount}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 block uppercase font-mono">Gross BHD</span>
                          <span className="font-bold text-[var(--color-primary)] text-sm tabular-nums">{formatBHD(tp.totalRevenueBHD)}</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-gray-600">
                          <span>Catalog Category</span>
                          <span className="font-semibold text-[var(--color-text)]">{tp.categoryNameEn || 'Luxury Nightwear'}</span>
                        </div>
                        <div className="w-full bg-[var(--color-bg)] h-1.5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[var(--color-primary)] rounded-full"
                            style={{
                              width: `${Math.min(100, Math.max(15, (Number(tp.unitsSold) / 20) * 100))}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* SUB-VIEW 3:  QUERIES & SCHEMA INSPECTOR */}
            {salesViewMode === 'queries' && (
              <div className="bg-[var(--color-card)] rounded-sm border border-[var(--color-border)] shadow-xs overflow-hidden">
                <div className="p-4 bg-[var(--color-text)] text-[var(--color-bg)] border-b border-[var(--color-accent)]/40 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="font-heading font-semibold text-sm text-white">
                       Relational Queries & DDL Schema (`product_sales`)
                    </h4>
                    <p className="text-[11px] text-[var(--color-bg)]/75">
                      Production SQL queries executed via the  connection pool (``) with parameterization.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'insert', label: 'INSERT Sale Item' },
                      { id: 'top_products', label: 'Top Products Aggregation' },
                      { id: 'category', label: 'Category Revenue' },
                      { id: 'regional', label: 'Bahrain Area Sales' },
                      { id: 'summary', label: 'Overall Summary KPIs' },
                      { id: 'ddl', label: 'CREATE TABLE DDL' },
                    ].map((q) => (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setActiveQueryTab(q.id as any)}
                        className={`px-2.5 py-1 text-[11px] font-mono rounded-xs transition-colors cursor-pointer ${
                          activeQueryTab === q.id
                            ? 'bg-[var(--color-primary)] text-white font-bold'
                            : 'bg-white/10 text-[var(--color-bg)] hover:bg-white/20'
                        }`}
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-6 bg-[var(--color-text)] text-emerald-400 font-mono text-xs overflow-x-auto leading-relaxed">
                  <pre>
                    {activeQueryTab === 'insert' && `/* Parameterized Query executed when customer completes checkout in Bahrain */
INSERT INTO product_sales (
  id, order_id, order_number, product_id, product_sku,
  product_name_en, product_name_ar, category_id, category_name_en,
  variant_size, variant_color_name, variant_color_hex,
  unit_price, quantity, total_amount, currency,
  payment_method, payment_status, customer_id, customer_name,
  customer_email, customer_area, customer_city, sale_date
) VALUES (
  ?, ?, ?, ?, ?,
  ?, ?, ?, ?,
  ?, ?, ?,
  ?, ?, ?, ?,
  ?, ?, ?, ?,
  ?, ?, ?, CURRENT_DATE
);`}

                    {activeQueryTab === 'top_products' && `/* Aggregates best selling nightwear pieces ordered by units sold and gross BHD revenue */
SELECT 
  product_id AS productId,
  product_sku AS productSku,
  product_name_en AS productNameEn,
  product_name_ar AS productNameAr,
  category_name_en AS categoryNameEn,
  SUM(quantity) AS unitsSold,
  COUNT(DISTINCT order_id) AS ordersCount,
  ROUND(SUM(total_amount), 3) AS totalRevenueBHD
FROM product_sales
WHERE payment_status != 'Failed'
GROUP BY product_id, product_sku, product_name_en, product_name_ar, category_name_en
ORDER BY unitsSold DESC, totalRevenueBHD DESC
LIMIT ?;`}

                    {activeQueryTab === 'category' && `/* Computes category revenue breakdown and percentage for analytics charts */
SELECT 
  category_name_en AS categoryName,
  SUM(quantity) AS totalUnits,
  ROUND(SUM(total_amount), 3) AS totalRevenueBHD,
  ROUND((SUM(total_amount) / (SELECT SUM(total_amount) FROM product_sales WHERE payment_status != 'Failed')) * 100, 1) AS percentage
FROM product_sales
WHERE payment_status != 'Failed'
GROUP BY category_name_en
ORDER BY totalRevenueBHD DESC;`}

                    {activeQueryTab === 'regional' && `/* Bahrain geographic revenue distribution (Adliya, Seef, Riffa, Saar, Amwaj, etc.) */
SELECT 
  customer_area AS customerArea,
  COUNT(DISTINCT order_id) AS ordersCount,
  SUM(quantity) AS unitsSold,
  ROUND(SUM(total_amount), 3) AS totalRevenueBHD
FROM product_sales
WHERE payment_status != 'Failed' AND customer_area IS NOT NULL
GROUP BY customer_area
ORDER BY totalRevenueBHD DESC;`}

                    {activeQueryTab === 'summary' && `/* Executive summary KPIs for the boutique overview tab */
SELECT 
  COUNT(*) AS totalSaleItems,
  COUNT(DISTINCT order_id) AS totalOrders,
  COUNT(DISTINCT product_id) AS distinctProductsSold,
  COALESCE(SUM(quantity), 0) AS totalUnitsSold,
  ROUND(COALESCE(SUM(total_amount), 0), 3) AS grossRevenueBHD,
  ROUND(COALESCE(AVG(total_amount), 0), 3) AS averageItemValueBHD
FROM product_sales
WHERE payment_status != 'Failed';`}

                    {activeQueryTab === 'ddl' && `/* DDL Schema definition with indexes on order_id, product_id, product_sku, and sale_date */
CREATE TABLE IF NOT EXISTS product_sales (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL,
  order_number VARCHAR(64) NOT NULL,
  product_id VARCHAR(64) NOT NULL,
  product_sku VARCHAR(64) NOT NULL,
  product_name_en VARCHAR(255) NOT NULL,
  product_name_ar VARCHAR(255) NOT NULL,
  category_id VARCHAR(64),
  category_name_en VARCHAR(128),
  variant_size VARCHAR(32),
  variant_color_name VARCHAR(64),
  variant_color_hex VARCHAR(32),
  unit_price DECIMAL(10, 3) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  total_amount DECIMAL(10, 3) NOT NULL,
  currency VARCHAR(8) DEFAULT 'BHD',
  payment_method VARCHAR(64) DEFAULT 'benefit_pay',
  payment_status VARCHAR(32) DEFAULT 'Paid',
  customer_id VARCHAR(64),
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_area VARCHAR(128),
  customer_city VARCHAR(128),
  sale_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sales_order (order_id),
  INDEX idx_sales_product (product_id),
  INDEX idx_sales_sku (product_sku),
  INDEX idx_sales_date (sale_date),
  INDEX idx_sales_area (customer_area)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`}
                  </pre>
                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB: CUSTOMER PURCHASES & USER-PRODUCT ASSOCIATION */}
        {activeTab === 'customers' && (
          <div className="space-y-6">
            {/* Top Stat Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[var(--color-card)] p-5 rounded-sm border border-[var(--color-border)] shadow-xs space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                  {language === 'ar' ? 'إجمالي العميلات المشترين' : language === 'ru' ? 'Всего покупателей' : 'Total Purchasing Customers'}
                </span>
                <p className="text-2xl font-bold text-[var(--color-text)] tabular-nums">
                  {customerPurchases.length}
                </p>
                <p className="text-[11px] text-[var(--color-text)]/60">
                  {language === 'ar' ? 'عميلات مسجلات وطلبات زوار' : language === 'ru' ? 'Зарегистрированные и гости' : 'Registered & Guest Buyers'}
                </p>
              </div>

              <div className="bg-[var(--color-card)] p-5 rounded-sm border border-[var(--color-border)] shadow-xs space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                  {language === 'ar' ? 'إجمالي القطع المشتراة' : language === 'ru' ? 'Куплено единиц' : 'Total Products Purchased'}
                </span>
                <p className="text-2xl font-bold text-[var(--color-text)] tabular-nums">
                  {customerPurchases.reduce((sum, c) => sum + (Number(c.totalItemsPurchased) || 0), 0)}
                </p>
                <p className="text-[11px] text-[var(--color-text)]/60">
                  {language === 'ar' ? 'قطع نوم فاخرة مسلمة' : language === 'ru' ? 'Единиц роскошной одежды' : 'Units of luxury nightwear'}
                </p>
              </div>

              <div className="bg-[var(--color-card)] p-5 rounded-sm border border-[var(--color-border)] shadow-xs space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                  {language === 'ar' ? 'إجمالي مبيعات العميلات' : language === 'ru' ? 'Общая сумма покупок' : 'Total Customer Spend'}
                </span>
                <p className="text-2xl font-bold text-[var(--color-text)] tabular-nums">
                  {formatBHD(customerPurchases.reduce((sum, c) => sum + (Number(c.totalSpendBHD) || 0), 0))}
                </p>
                <div className="flex items-center gap-1 text-[11px] text-[var(--color-accent)]">
                  <TrendingUp className="w-3 h-3" />
                  <span>{language === 'ar' ? 'إيرادات محققة في البحرين' : language === 'ru' ? 'Выручка в Бахрейне' : 'Revenue generated in Bahrain'}</span>
                </div>
              </div>

              <div className="bg-[var(--color-card)] p-5 rounded-sm border border-[var(--color-border)] shadow-xs space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                  {language === 'ar' ? 'متوسط إنفاق العميلة' : language === 'ru' ? 'Средний чек клиента' : 'Avg Customer Spend'}
                </span>
                <p className="text-2xl font-bold text-[var(--color-text)] tabular-nums">
                  {customerPurchases.length > 0
                    ? formatBHD(
                        customerPurchases.reduce((sum, c) => sum + (Number(c.totalSpendBHD) || 0), 0) /
                          customerPurchases.length
                      )
                    : formatBHD(0)}
                </p>
                <p className="text-[11px] text-[var(--color-text)]/60">
                  {language === 'ar' ? 'عبر جميع الطلبات السابقة' : language === 'ru' ? 'По всей истории заказов' : 'Across lifetime purchases'}
                </p>
              </div>
            </div>

            {/* Controls Bar: Search & View Mode Switch */}
            <div className="bg-[var(--color-card)] p-4 rounded-sm border border-[var(--color-border)] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-xs border border-[var(--color-border)] p-0.5 bg-[var(--color-bg)]/30">
                  <button
                    type="button"
                    onClick={() => setCustomerViewMode('by_customer')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xs transition-colors flex items-center gap-1.5 ${
                      customerViewMode === 'by_customer'
                        ? 'bg-[var(--color-text)] text-white shadow-xs'
                        : 'text-[var(--color-text)] hover:bg-white'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'عرض العميلات ومشترياتهن' : language === 'ru' ? 'По клиентам и покупкам' : 'By Customer Purchases'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerViewMode('by_product')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xs transition-colors flex items-center gap-1.5 ${
                      customerViewMode === 'by_product'
                        ? 'bg-[var(--color-text)] text-white shadow-xs'
                        : 'text-[var(--color-text)] hover:bg-white'
                    }`}
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'عرض المنتجات والمشترين' : language === 'ru' ? 'По товарам и покупателям' : 'By Product Buyers'}</span>
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-[var(--color-accent)] absolute left-3 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder={
                    customerViewMode === 'by_customer'
                      ? (language === 'ar' ? 'البحث باسم العميلة، البريد، أو المنطقة...' : language === 'ru' ? 'Поиск покупателя по имени, email или району...' : 'Search by customer name, email, or area...')
                      : (language === 'ar' ? 'البحث باسم المنتج أو الرمز SKU...' : language === 'ru' ? 'Поиск товара по названию или SKU...' : 'Search product by name or SKU...')
                  }
                  className="w-full pl-9 pr-4 rtl:pl-4 rtl:pr-9 py-2 text-xs border border-[var(--color-border)] rounded-xs bg-[var(--color-bg)]/20 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                />
                {customerSearch && (
                  <button
                    onClick={() => setCustomerSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rtl:right-auto rtl:left-3 text-gray-400 hover:text-[var(--color-text)]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* VIEW MODE 1: BY CUSTOMER */}
            {customerViewMode === 'by_customer' && (
              <div className="bg-[var(--color-card)] rounded-sm border border-[var(--color-border)] shadow-xs overflow-hidden">
                <div className="p-4 bg-[var(--color-bg)]/30 border-b border-[var(--color-border)] flex items-center justify-between">
                  <span className="font-heading text-sm font-bold text-[var(--color-text)]">
                    {language === 'ar' ? 'سجل العميلات والمنتجات المشتراة' : language === 'ru' ? 'Список покупателей и купленные ими товары' : 'Customer Purchasing Profiles & Associated Products'}
                  </span>
                  <span className="text-xs text-[var(--color-accent)] font-medium">
                    {customerPurchases.length} {language === 'ar' ? 'عميلة مسجلة في قاعدة البيانات' : language === 'ru' ? 'клиентов в базе данных' : 'customers in MySQL database'}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left rtl:text-right text-xs">
                    <thead className="bg-[var(--color-bg)]/50 text-[var(--color-text)] font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="p-4">{language === 'ar' ? 'العميلة' : language === 'ru' ? 'Покупатель' : 'Customer'}</th>
                        <th className="p-4">{language === 'ar' ? 'المنطقة / العنوان' : language === 'ru' ? 'Район / Город' : 'Area / City'}</th>
                        <th className="p-4 text-center">{language === 'ar' ? 'الطلبات' : language === 'ru' ? 'Заказов' : 'Orders'}</th>
                        <th className="p-4 text-center">{language === 'ar' ? 'القطع المشتراة' : language === 'ru' ? 'Куплено шт.' : 'Items Bought'}</th>
                        <th className="p-4 text-center">{language === 'ar' ? 'منتجات مميزة' : language === 'ru' ? 'Разных товаров' : 'Distinct Items'}</th>
                        <th className="p-4">{language === 'ar' ? 'إجمالي الإنفاق' : language === 'ru' ? 'Сумма покупок' : 'Total Spend'}</th>
                        <th className="p-4">{language === 'ar' ? 'آخر شراء' : language === 'ru' ? 'Дата покупки' : 'Last Purchase'}</th>
                        <th className="p-4 text-right rtl:text-left">{language === 'ar' ? 'تفاصيل المنتجات' : language === 'ru' ? 'Товары' : 'Products Bought'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {isLoadingCustomers ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-gray-500">
                            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[var(--color-accent)]" />
                            <span>{language === 'ar' ? 'جاري تحميل سجلات العميلات من MySQL...' : language === 'ru' ? 'Загрузка профилей покупателей...' : 'Loading customer purchasing data from MySQL...'}</span>
                          </td>
                        </tr>
                      ) : customerPurchases.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-gray-500">
                            {language === 'ar' ? 'لا توجد سجلات مشتريات مسجلة حتى الآن.' : language === 'ru' ? 'Пока нет сохранённых покупок.' : 'No customer purchases recorded yet.'}
                          </td>
                        </tr>
                      ) : (
                        customerPurchases
                          .filter((cust) => {
                            if (!customerSearch.trim()) return true;
                            const q = customerSearch.toLowerCase();
                            return (
                              (cust.customerName && cust.customerName.toLowerCase().includes(q)) ||
                              (cust.customerEmail && cust.customerEmail.toLowerCase().includes(q)) ||
                              (cust.customerArea && cust.customerArea.toLowerCase().includes(q)) ||
                              (cust.customerCity && cust.customerCity.toLowerCase().includes(q))
                            );
                          })
                          .map((cust) => {
                            const isExpanded = selectedCustomerEmail === cust.customerEmail;
                            return (
                              <React.Fragment key={cust.customerEmail || cust.customerId}>
                                <tr className={`hover:bg-[var(--color-bg)]/20 transition-colors ${isExpanded ? 'bg-[var(--color-bg)]/30' : ''}`}>
                                  <td className="p-4">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-8 h-8 rounded-full bg-[var(--color-text)] text-white flex items-center justify-center font-bold text-xs shrink-0">
                                        {(cust.customerName || cust.customerEmail || 'C').charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <p className="font-bold text-[var(--color-text)]">
                                          {cust.customerName || 'Boutique Shopper'}
                                        </p>
                                        <p className="text-[11px] text-[var(--color-text)]/70 font-mono">
                                          {cust.customerEmail}
                                        </p>
                                        {cust.customerId && (
                                          <span className="text-[10px] text-[var(--color-accent)] font-mono">
                                            ID: {cust.customerId.slice(0, 14)}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-4">
                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-xs text-[11px]">
                                      {cust.customerArea || 'Manama'}, {cust.customerCity || 'Bahrain'}
                                    </span>
                                  </td>
                                  <td className="p-4 text-center font-semibold text-[var(--color-text)] tabular-nums">
                                    {cust.totalOrders}
                                  </td>
                                  <td className="p-4 text-center font-bold text-[var(--color-primary)] tabular-nums">
                                    {cust.totalItemsPurchased}
                                  </td>
                                  <td className="p-4 text-center text-[var(--color-accent)] font-medium tabular-nums">
                                    {cust.distinctProductsCount}
                                  </td>
                                  <td className="p-4 font-bold text-[var(--color-text)] tabular-nums">
                                    {formatBHD(cust.totalSpendBHD)}
                                  </td>
                                  <td className="p-4 text-[11px] text-[var(--color-text)]/70 tabular-nums">
                                    {cust.lastPurchaseDate || 'Recent'}
                                  </td>
                                  <td className="p-4 text-right rtl:text-left">
                                    <button
                                      type="button"
                                      onClick={() => handleSelectCustomer(cust.customerEmail)}
                                      className={`px-3 py-1.5 text-xs font-semibold rounded-xs transition-all flex items-center gap-1 ml-auto rtl:ml-0 rtl:mr-auto cursor-pointer ${
                                        isExpanded
                                          ? 'bg-[var(--color-text)] text-white'
                                          : 'bg-white border border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-accent)] hover:bg-[var(--color-bg)]/30'
                                      }`}
                                    >
                                      <span>
                                        {isExpanded
                                          ? (language === 'ar' ? 'إغلاق المنتجات' : language === 'ru' ? 'Скрыть товары' : 'Hide Products')
                                          : (language === 'ar' ? 'عرض المنتجات المشتراة' : language === 'ru' ? 'Купленные товары' : 'View Products')}
                                      </span>
                                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    </button>
                                  </td>
                                </tr>

                                {/* Expanded Products Drawer for this customer */}
                                {isExpanded && (
                                  <tr className="bg-[var(--color-bg)]">
                                    <td colSpan={8} className="p-4 border-y-2 border-[var(--color-accent)]/30">
                                      <div className="space-y-3">
                                        <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
                                          <div className="flex items-center gap-2">
                                            <Package className="w-4 h-4 text-[var(--color-accent)]" />
                                            <span className="font-bold text-[var(--color-text)] text-xs">
                                              {language === 'ar' ? 'جميع المنتجات التي اشترتها العميلة:' : language === 'ru' ? 'Все товары, купленные этим клиентом:' : 'All Products Purchased by this Customer:'}
                                            </span>
                                            <span className="text-[11px] text-[var(--color-accent)] font-medium">
                                              ({cust.customerName || cust.customerEmail})
                                            </span>
                                          </div>
                                          <span className="text-[11px] text-[var(--color-text)]/70">
                                            {customerDetailSales.length} {language === 'ar' ? 'بند منتج مسجل' : language === 'ru' ? 'позиций в заказах' : 'recorded line items'}
                                          </span>
                                        </div>

                                        {isLoadingCustomerDetail ? (
                                          <div className="py-6 text-center text-gray-500">
                                            <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-[var(--color-accent)]" />
                                            <span>{language === 'ar' ? 'جاري استرجاع تفاصيل المنتجات من MySQL...' : language === 'ru' ? 'Загрузка позиций...' : 'Retrieving purchase details from MySQL...'}</span>
                                          </div>
                                        ) : customerDetailSales.length === 0 ? (
                                          <p className="text-xs text-gray-500 py-2">
                                            {language === 'ar' ? 'لا توجد منتجات مسجلة لهذه العميلة.' : language === 'ru' ? 'Нет записей о товарах для этого клиента.' : 'No line items recorded for this customer.'}
                                          </p>
                                        ) : (
                                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                                            {customerDetailSales.map((item, idx) => {
                                              const prodInfo = products.find((p) => p.id === item.productId || p.sku === item.productSku);
                                              const img = prodInfo?.images?.[0] || ROSE_SATIN_IMAGE;
                                              const itemName = language === 'ar' ? (item.productNameAr || prodInfo?.nameAr) : (language === 'ru' && prodInfo?.nameRu ? prodInfo.nameRu : (item.productNameEn || prodInfo?.nameEn));

                                              return (
                                                <div
                                                  key={item.id || `${item.orderNumber}-${idx}`}
                                                  className="bg-[var(--color-card)] p-3 rounded-xs border border-[var(--color-border)] shadow-2xs flex items-start gap-3 hover:border-[var(--color-accent)] transition-all"
                                                >
                                                  <img
                                                    src={img}
                                                    alt=""
                                                    className="w-14 h-16 object-cover rounded-xs border border-[var(--color-border)] shrink-0"
                                                    onError={(e) => {
                                                      (e.target as HTMLImageElement).src = ROSE_SATIN_IMAGE;
                                                    }}
                                                  />
                                                  <div className="flex-1 min-w-0 space-y-1">
                                                    <div className="flex items-start justify-between gap-1">
                                                      <h6 className="font-heading font-semibold text-xs text-[var(--color-text)] truncate">
                                                        {itemName}
                                                      </h6>
                                                      <span className="text-[11px] font-bold text-[var(--color-primary)] tabular-nums shrink-0">
                                                        {formatBHD(item.totalAmount)}
                                                      </span>
                                                    </div>

                                                    <div className="flex items-center gap-1 text-[10px] text-[var(--color-accent)] font-mono">
                                                      <span>SKU: {item.productSku}</span>
                                                      <span>·</span>
                                                      <span className="font-bold text-[var(--color-text)]">
                                                        {item.orderNumber}
                                                      </span>
                                                    </div>

                                                    <div className="flex items-center gap-2 text-[10px] text-[var(--color-text)]/80 flex-wrap">
                                                      <span className="px-1.5 py-0.2 bg-gray-100 rounded-xs">
                                                        {language === 'ar' ? 'المقاس' : language === 'ru' ? 'Разм.' : 'Size'}: <strong>{item.variantSize || 'M'}</strong>
                                                      </span>
                                                      <span className="flex items-center gap-1 px-1.5 py-0.2 bg-gray-100 rounded-xs">
                                                        <span
                                                          className="w-2 h-2 rounded-full border border-gray-400 inline-block"
                                                          style={{ backgroundColor: item.variantColorHex || 'var(--color-text)' }}
                                                        />
                                                        <span>{item.variantColorName || 'Standard'}</span>
                                                      </span>
                                                      <span className="px-1.5 py-0.2 bg-rose-50 text-[var(--color-primary)] font-bold rounded-xs">
                                                        ×{item.quantity}
                                                      </span>
                                                    </div>

                                                    <div className="pt-1 flex items-center justify-between text-[10px] text-gray-500 border-t border-gray-100 mt-1">
                                                      <span>{item.saleDate || item.createdAt?.split('T')[0]}</span>
                                                      <span className="px-1.5 py-0.2 bg-green-50 text-green-700 font-semibold rounded-xs">
                                                        {item.paymentStatus || 'Paid'}
                                                      </span>
                                                    </div>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* VIEW MODE 2: BY PRODUCT & BUYERS MATRIX */}
            {customerViewMode === 'by_product' && (
              <div className="space-y-4">
                <div className="bg-[var(--color-card)] p-4 rounded-sm border border-[var(--color-border)] shadow-xs flex items-center justify-between">
                  <div>
                    <h4 className="font-heading text-sm font-bold text-[var(--color-text)]">
                      {language === 'ar' ? 'سجل مشتري المنتجات (Product Buyers Matrix)' : language === 'ru' ? 'Матрица товаров и покупателей' : 'Product-to-Buyers Association Matrix'}
                    </h4>
                    <p className="text-xs text-[var(--color-text)]/70">
                      {language === 'ar' ? 'اضغطي على أي منتج لعرض جميع العميلات اللاتي اشترين هذا المنتج وتفاصيل طلباتهن.' : language === 'ru' ? 'Нажмите на товар, чтобы увидеть всех клиентов, которые его купили.' : 'Click on any product to inspect all customers who purchased it and their order details.'}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-[var(--color-text)] text-white text-xs font-semibold rounded-xs">
                    {products.length} {language === 'ar' ? 'منتج بالمتجر' : language === 'ru' ? 'товаров' : 'Catalog Products'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products
                    .filter((p) => {
                      if (!customerSearch.trim()) return true;
                      const q = customerSearch.toLowerCase();
                      return (
                        p.nameEn.toLowerCase().includes(q) ||
                        p.nameAr.toLowerCase().includes(q) ||
                        (p.nameRu && p.nameRu.toLowerCase().includes(q)) ||
                        p.sku.toLowerCase().includes(q)
                      );
                    })
                    .map((prod) => {
                      const isSelected = selectedProductIdForBuyers === prod.id;
                      const prodName = language === 'ar' ? prod.nameAr : (language === 'ru' && prod.nameRu ? prod.nameRu : prod.nameEn);

                      // Calculate sales for this product from local salesRecords
                      const matchedSales = salesRecords.filter((s) => s.productId === prod.id || s.productSku === prod.sku);
                      const totalSold = matchedSales.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0);
                      const totalRevenue = matchedSales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);

                      return (
                        <div
                          key={prod.id}
                          className={`bg-[var(--color-card)] rounded-sm border transition-all overflow-hidden ${
                            isSelected ? 'border-[var(--color-text)] ring-2 ring-[var(--color-text)]/20 shadow-md' : 'border-[var(--color-border)] hover:border-[var(--color-accent)] shadow-xs'
                          }`}
                        >
                          <div className="p-4 flex items-start gap-3">
                            <img
                              src={prod.images[0] || ROSE_SATIN_IMAGE}
                              alt=""
                              className="w-16 h-20 object-cover rounded-xs border border-[var(--color-border)] shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = ROSE_SATIN_IMAGE;
                              }}
                            />
                            <div className="flex-1 min-w-0 space-y-1">
                              <span className="text-[10px] text-[var(--color-accent)] font-mono block">
                                {prod.sku} · {prod.categoryNameEn}
                              </span>
                              <h5 className="font-heading font-bold text-xs text-[var(--color-text)] line-clamp-1">
                                {prodName}
                              </h5>
                              <p className="text-xs font-bold text-[var(--color-primary)] tabular-nums">
                                {formatBHD(prod.salePrice ?? prod.price)}
                              </p>

                              <div className="flex items-center gap-2 pt-1 text-[11px]">
                                <span className="px-1.5 py-0.5 bg-gray-100 rounded-xs font-semibold text-[var(--color-text)]">
                                  {totalSold} {language === 'ar' ? 'قطعة بيعت' : language === 'ru' ? 'продано' : 'units sold'}
                                </span>
                                {totalRevenue > 0 && (
                                  <span className="text-[var(--color-accent)] font-bold tabular-nums">
                                    {formatBHD(totalRevenue)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="px-4 py-2.5 bg-[var(--color-bg)]/20 border-t border-[var(--color-border)] flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => handleSelectProductBuyers(prod.id)}
                              className={`w-full py-1.5 px-3 text-xs font-semibold rounded-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                                isSelected
                                  ? 'bg-[var(--color-text)] text-white'
                                  : 'bg-white border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-text)] hover:text-white'
                              }`}
                            >
                              <Users className="w-3.5 h-3.5" />
                              <span>
                                {isSelected
                                  ? (language === 'ar' ? 'إخفاء المشترين' : language === 'ru' ? 'Скрыть покупателей' : 'Hide Buyers')
                                  : (language === 'ar' ? 'عرض جميع المشترين' : language === 'ru' ? 'Показать покупателей' : 'View Buyers')}
                              </span>
                            </button>
                          </div>

                          {/* Buyers List Drawer for this Product */}
                          {isSelected && (
                            <div className="p-4 bg-[var(--color-bg)] border-t border-[var(--color-accent)]/30 space-y-3">
                              <div className="flex items-center justify-between text-xs font-bold text-[var(--color-text)]">
                                <span>{language === 'ar' ? 'سجل العميلات اللاتي اشترين هذا المنتج:' : language === 'ru' ? 'Покупатели этого товара:' : 'Customers who bought this product:'}</span>
                                <span className="text-[10px] text-[var(--color-accent)] font-mono">
                                  {productBuyersList.length} {language === 'ar' ? 'مشترية' : language === 'ru' ? 'покупателей' : 'buyers'}
                                </span>
                              </div>

                              {isLoadingProductBuyers ? (
                                <div className="py-4 text-center text-xs text-gray-500">
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin mx-auto mb-1 text-[var(--color-accent)]" />
                                  <span>{language === 'ar' ? 'جاري الاستعلام من قاعدة البيانات...' : language === 'ru' ? 'Загрузка...' : 'Querying MySQL...'}</span>
                                </div>
                              ) : productBuyersList.length === 0 ? (
                                <p className="text-xs text-gray-500 italic py-2">
                                  {language === 'ar' ? 'لم تقم أي عميلة بشراء هذا المنتج بعد.' : language === 'ru' ? 'Этот товар пока не покупали.' : 'No customer purchases recorded for this item yet.'}
                                </p>
                              ) : (
                                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                  {productBuyersList.map((buyer, bIdx) => (
                                    <div
                                      key={`${buyer.orderNumber}-${bIdx}`}
                                      className="p-2.5 bg-white rounded-xs border border-[var(--color-border)] text-[11px] space-y-1"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-[var(--color-text)]">
                                          {buyer.customerName || 'Shopper'}
                                        </span>
                                        <span className="text-[var(--color-primary)] font-bold tabular-nums">
                                          {formatBHD(buyer.totalAmount)}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between text-gray-500 text-[10px]">
                                        <span className="font-mono">{buyer.customerEmail}</span>
                                        <span>{buyer.customerArea || 'Bahrain'}</span>
                                      </div>
                                      <div className="flex items-center justify-between text-gray-600 text-[10px] pt-1 border-t border-gray-100">
                                        <span>
                                          Order: <strong className="font-mono text-[var(--color-text)]">{buyer.orderNumber}</strong> (×{buyer.quantity})
                                        </span>
                                        <span className="px-1.5 py-0.2 bg-green-50 text-green-700 font-semibold rounded-xs">
                                          {buyer.variantSize || 'M'} · {buyer.saleDate || 'Recent'}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB 2: PRODUCT MANAGEMENT */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="bg-[var(--color-card)] rounded-sm border border-[var(--color-border)] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left rtl:text-right text-xs">
                  <thead className="bg-[var(--color-bg)]/50 text-[var(--color-text)] font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="p-4">Image</th>
                      <th className="p-4">Product Name (EN / AR)</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Price (BHD)</th>
                      <th className="p-4">Stock</th>
                      <th className="p-4">{t.admin.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {products.map((p) => {
                      const totalStock = p.variants.reduce((s, v) => s + v.stock, 0);
                      return (
                        <tr key={p.id} className="hover:bg-[var(--color-bg)]/20">
                          <td className="p-4">
                            <img src={p.images[0]} alt="" className="w-10 h-12 object-cover rounded-xs border" />
                          </td>
                          <td className="p-4">
                            <p className="font-semibold text-[var(--color-text)]">{p.nameEn}</p>
                            <p className="text-[11px] text-[var(--color-text)]/70">{p.nameAr}</p>
                          </td>
                          <td className="p-4 text-[var(--color-accent)] font-medium">{p.categoryNameEn}</td>
                          <td className="p-4 font-bold text-[var(--color-text)] tabular-nums">
                            {formatBHD(p.salePrice ?? p.price)}
                          </td>
                          <td className="p-4 tabular-nums">
                            <span className={totalStock <= 4 ? 'text-[var(--color-primary)] font-bold' : 'text-[var(--color-text)]'}>
                              {totalStock} units
                            </span>
                          </td>
                          <td className="p-4 flex items-center gap-2">
                            <button
                              onClick={() => duplicateProduct(p.id)}
                              className="p-1.5 text-gray-500 hover:text-[var(--color-text)]"
                              title="Duplicate"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingProduct(p)}
                              className="p-1.5 text-[var(--color-accent)] hover:text-[var(--color-text)]"
                              title="Edit"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteProduct(p.id)}
                              className="p-1.5 text-[var(--color-primary)] hover:text-red-700"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2.5: LIVE MYSQL STOCK & PRODUCT BALANCES */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            
            {/* Live Stock Feedback Banner */}
            {stockFeedback && (
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-xs text-xs font-semibold flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{stockFeedback}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setStockFeedback(null)}
                  className="text-emerald-700 hover:text-[var(--color-text)] cursor-pointer font-bold"
                >
                  ✕
                </button>
              </div>
            )}

           


            {/* Inventory KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="bg-[var(--color-card)] p-5 rounded-sm border border-[var(--color-border)] shadow-xs space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                  {language === 'ar' ? 'إجمالي القطع بالمخزون' : 'Total Units Available'}
                </span>
                <p className="text-2xl font-bold text-[var(--color-text)] tabular-nums">
                  {totalStockUnits} <span className="text-xs font-normal text-[var(--color-text)]/60">{language === 'ar' ? 'قطعة' : 'units'}</span>
                </p>
                <p className="text-[11px] text-[var(--color-text)]/60">
                  {language === 'ar' ? `موزعة على ${totalVariantsCount} موديل ومقاس` : `Across ${totalVariantsCount} distinct varieties`}
                </p>
              </div>

              <div className="bg-[var(--color-card)] p-5 rounded-sm border border-[var(--color-border)] shadow-xs space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                  {language === 'ar' ? 'قيمة رصيد المخزون (بالدينار)' : 'Total Inventory Valuation'}
                </span>
                <p className="text-2xl font-bold text-[var(--color-text)] tabular-nums">
                  {formatBHD(totalInventoryValuation)}
                </p>
                <p className="text-[11px] text-[var(--color-accent)] font-medium">
                  {language === 'ar' ? 'وفق سعر البيع الفعلي الحالي' : 'Calculated at current active retail prices'}
                </p>
              </div>

              <div className="bg-[var(--color-card)] p-5 rounded-sm border border-[var(--color-border)] shadow-xs space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-primary)]">
                  {language === 'ar' ? 'تنبيهات انخفاض المخزون' : 'Low Stock Alert'}
                </span>
                <p className="text-2xl font-bold text-[var(--color-primary)] tabular-nums">
                  {lowStockProducts.length} <span className="text-xs font-normal text-[var(--color-text)]/60">{language === 'ar' ? 'منتجات' : 'products'}</span>
                </p>
                <p className="text-[11px] text-[var(--color-text)]/60">
                  {language === 'ar' ? 'أقل من ٥ قطع بالمستودع' : 'Stock level at or below 4 units'}
                </p>
              </div>

              <div className="bg-[var(--color-card)] p-5 rounded-sm border border-[var(--color-border)] shadow-xs space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text)]">
                  {language === 'ar' ? 'المنتجات المنتهية' : 'Out of Stock Varieties'}
                </span>
                <p className="text-2xl font-bold text-[var(--color-text)] tabular-nums">
                  {outOfStockProducts.length} <span className="text-xs font-normal text-[var(--color-text)]/60">{language === 'ar' ? 'منتجات' : 'products'}</span>
                </p>
                <p className="text-[11px] text-[var(--color-text)]/60">
                  {language === 'ar' ? 'تحتاج إلى إعادة تزويد عاجل' : 'Needs immediate warehouse restocking'}
                </p>
              </div>

            </div>

            {/* Search & Stock Filter Toolbar */}
            <div className="bg-[var(--color-card)] p-4 rounded-sm border border-[var(--color-border)] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-[var(--color-accent)] absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  placeholder={language === 'ar' ? 'ابحثي باسم المنتج أو رمز SKU...' : 'Search product or SKU...'}
                  className="w-full pl-9 pr-3 rtl:pl-3 rtl:pr-9 py-2 text-xs bg-white text-[var(--color-text)] border border-[var(--color-border)] rounded-xs focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                />
              </div>

              <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 text-xs">
                {[
                  { id: 'all', label: language === 'ar' ? 'الكل' : 'All Products', count: products.length },
                  { id: 'in_stock', label: language === 'ar' ? 'متوفر' : 'In Stock', count: products.filter((p) => p.variants.some((v) => v.stock > 4)).length },
                  { id: 'low_stock', label: language === 'ar' ? 'كمية قليلة' : 'Low Stock', count: lowStockProducts.length },
                  { id: 'out_of_stock', label: language === 'ar' ? 'منتهي' : 'Out of Stock', count: outOfStockProducts.length },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setInventoryStockFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      inventoryStockFilter === f.id
                        ? 'bg-[var(--color-text)] text-[var(--color-bg)]'
                        : 'bg-white border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-bg)]'
                    }`}
                  >
                    <span>{f.label}</span>
                    <span className="ml-1.5 rtl:ml-0 rtl:mr-1.5 px-1.5 py-0.2 bg-[var(--color-text)]/10 rounded-full text-[10px]">
                      {f.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Product Balances & Live Stock Table */}
            <div className="bg-[var(--color-card)] rounded-sm border border-[var(--color-border)] shadow-xs overflow-hidden">
              <div className="p-4 bg-[var(--color-bg)]/40 border-b border-[var(--color-border)] flex items-center justify-between">
                <div>
                  <h3 className="font-heading text-base font-bold text-[var(--color-text)]">
                    {language === 'ar' ? 'أرصدة المنتجات ومخزون الموديلات' : 'Live Product Balances & Variety Stock Table'}
                  </h3>
                  <p className="text-xs text-[var(--color-text)]/70">
                    {language === 'ar' ? 'يمكنك زيادة أو تعديل المخزون مباشرة لكل مقاس ولون، وتنعكس التحديثات فوراً في متجر العملاء وقاعدة بيانات MySQL' : 'Adjust units directly per size and color. Updates are reflected immediately in customer store & MySQL database.'}
                  </p>
                </div>
                <span className="text-xs text-[var(--color-accent)] font-mono font-semibold">
                  {products.length} {language === 'ar' ? 'منتجات مسجلة' : 'Products Synced'}
                </span>
              </div>

              <div className="divide-y divide-[var(--color-border)]">
                {products
                  .filter((p) => {
                    const matchesSearch =
                      !inventorySearch.trim() ||
                      p.nameEn.toLowerCase().includes(inventorySearch.toLowerCase()) ||
                      p.nameAr.includes(inventorySearch) ||
                      p.sku.toLowerCase().includes(inventorySearch.toLowerCase()) ||
                      p.categoryNameEn.toLowerCase().includes(inventorySearch.toLowerCase());

                    if (!matchesSearch) return false;

                    const totalStock = p.variants.reduce((s, v) => s + (Number(v.stock) || 0), 0);
                    if (inventoryStockFilter === 'out_of_stock') {
                      return totalStock === 0;
                    }
                    if (inventoryStockFilter === 'low_stock') {
                      return p.variants.some((v) => v.stock > 0 && v.stock <= 4);
                    }
                    if (inventoryStockFilter === 'in_stock') {
                      return totalStock > 4;
                    }
                    return true;
                  })
                  .map((product) => {
                    const totalUnits = product.variants.reduce((s, v) => s + (Number(v.stock) || 0), 0);
                    const unitPrice = product.salePrice ?? product.price;
                    const totalValuation = totalUnits * unitPrice;
                    const isProductOut = totalUnits === 0;
                    const isProductLow = totalUnits > 0 && totalUnits <= 4;

                    return (
                      <div key={product.id} className="p-5 hover:bg-[var(--color-bg)]/15 transition-colors space-y-4">
                        {/* Product Header Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3.5">
                            <img
                              src={product.images[0]}
                              alt=""
                              className="w-14 h-16 object-cover rounded-xs border border-[var(--color-border)] shrink-0"
                            />
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-[11px] font-bold text-[var(--color-accent)] bg-[var(--color-accent)]/10 px-2 py-0.5 rounded-xs">
                                  {product.sku}
                                </span>
                                <span className="text-[11px] text-[var(--color-text)]/60 uppercase tracking-wider font-semibold">
                                  {language === 'ar' ? product.categoryNameAr : product.categoryNameEn}
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-xs uppercase tracking-wider ${
                                    isProductOut
                                      ? 'bg-red-100 text-red-800'
                                      : isProductLow
                                      ? 'bg-amber-100 text-amber-900'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {isProductOut
                                    ? (language === 'ar' ? 'نفذت الكمية' : 'Out of Stock')
                                    : isProductLow
                                    ? (language === 'ar' ? 'كمية منخفضة' : 'Low Stock')
                                    : (language === 'ar' ? 'متوفر' : 'In Stock')}
                                </span>
                              </div>

                              <h4 className="font-heading text-base font-semibold text-[var(--color-text)] mt-1">
                                {language === 'ar' ? product.nameAr : product.nameEn}
                              </h4>
                            </div>
                          </div>

                          {/* Balances Summary for this Product */}
                          <div className="flex items-center gap-6 self-end sm:self-auto text-right rtl:text-left bg-white p-3 rounded-xs border border-[var(--color-border)]/70">
                            <div>
                              <span className="text-[10px] uppercase tracking-wider text-[var(--color-accent)] block">
                                {language === 'ar' ? 'سعر الوحدة' : 'Retail Price'}
                              </span>
                              <span className="font-bold text-xs text-[var(--color-text)] tabular-nums">
                                {formatBHD(unitPrice)}
                              </span>
                            </div>

                            <div className="border-l rtl:border-l-0 rtl:border-r border-[var(--color-border)] pl-4 rtl:pl-0 rtl:pr-4">
                              <span className="text-[10px] uppercase tracking-wider text-[var(--color-accent)] block">
                                {language === 'ar' ? 'الرصيد المتاح' : 'Available Stock'}
                              </span>
                              <span className={`text-base font-bold tabular-nums ${isProductOut ? 'text-red-600' : isProductLow ? 'text-amber-700' : 'text-[var(--color-text)]'}`}>
                                {totalUnits} <span className="text-[11px] font-normal">{language === 'ar' ? 'قطعة' : 'units'}</span>
                              </span>
                            </div>

                            <div className="border-l rtl:border-l-0 rtl:border-r border-[var(--color-border)] pl-4 rtl:pl-0 rtl:pr-4">
                              <span className="text-[10px] uppercase tracking-wider text-[var(--color-accent)] block">
                                {language === 'ar' ? 'قيمة الرصيد' : 'Balance Value'}
                              </span>
                              <span className="font-bold text-sm text-[var(--color-text)] tabular-nums text-emerald-800">
                                {formatBHD(totalValuation)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Variants Stock Breakdown & Adjustment Controls */}
                        <div className="bg-[var(--color-bg)]/30 rounded-xs border border-[var(--color-border)] p-3 overflow-x-auto">
                          <table className="w-full text-left rtl:text-right text-xs">
                            <thead>
                              <tr className="text-[10px] uppercase tracking-wider text-[var(--color-accent)] border-b border-[var(--color-border)]/60">
                                <th className="pb-2">{language === 'ar' ? 'الموديل / اللون' : 'Variety / Color'}</th>
                                <th className="pb-2">{language === 'ar' ? 'المقاس' : 'Size'}</th>
                                <th className="pb-2">Variant SKU</th>
                                <th className="pb-2">{language === 'ar' ? 'الرصيد الحالي' : 'Available Stock'}</th>
                                <th className="pb-2">{language === 'ar' ? 'قيمة المخزون' : 'Stock Value'}</th>
                                <th className="pb-2 text-right rtl:text-left">{language === 'ar' ? 'إجراءات التعديل والإضافة' : 'Quick Stock Adjuster'}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-border)]/50">
                              {product.variants.map((variant, vIdx) => {
                                const variantKey = `${product.id}-${variant.sku || variant.size}-${variant.colorHex}`;
                                const vStock = Number(variant.stock) || 0;
                                const vValuation = vStock * unitPrice;
                                const isVarOut = vStock === 0;
                                const isVarLow = vStock > 0 && vStock <= 3;
                                const inputVal = editingVariantStocks[variantKey];

                                return (
                                  <tr key={vIdx} className="hover:bg-white/60">
                                    <td className="py-2.5 font-medium text-[var(--color-text)]">
                                      <div className="flex items-center gap-2">
                                        <span
                                          className="w-3.5 h-3.5 rounded-full border border-[var(--color-border)] shadow-xs shrink-0"
                                          style={{ backgroundColor: variant.colorHex }}
                                        />
                                        <span>{language === 'ar' ? variant.colorNameAr : variant.colorNameEn}</span>
                                      </div>
                                    </td>
                                    <td className="py-2.5 font-bold font-mono text-[var(--color-text)]">
                                      {variant.size}
                                    </td>
                                    <td className="py-2.5 font-mono text-[11px] text-[var(--color-text)]/60">
                                      {variant.sku || `${product.sku}-${variant.size}`}
                                    </td>
                                    <td className="py-2.5">
                                      <span
                                        className={`inline-flex items-center gap-1 font-bold text-xs tabular-nums px-2 py-0.5 rounded-xs ${
                                          isVarOut
                                            ? 'bg-red-100 text-red-800'
                                            : isVarLow
                                            ? 'bg-amber-100 text-amber-900'
                                            : 'bg-emerald-50 text-emerald-800'
                                        }`}
                                      >
                                        {vStock} {language === 'ar' ? 'قطعة' : 'units'}
                                      </span>
                                    </td>
                                    <td className="py-2.5 tabular-nums font-semibold text-[var(--color-text)]">
                                      {formatBHD(vValuation)}
                                    </td>
                                    <td className="py-2.5 text-right rtl:text-left">
                                      <div className="inline-flex items-center gap-1.5">
                                        {/* Quick Decrement */}
                                        <button
                                          type="button"
                                          disabled={vStock <= 0}
                                          onClick={() =>
                                            handleQuickAdjustStock(
                                              product.id,
                                              variant.sku || variant.size,
                                              variant.colorHex,
                                              -1
                                            )
                                          }
                                          className="px-2 py-1 bg-white border border-[var(--color-border)] hover:bg-red-50 text-[var(--color-text)] hover:text-red-700 rounded-xs text-[11px] font-bold cursor-pointer disabled:opacity-30"
                                          title="Deduct 1 unit"
                                        >
                                          -1
                                        </button>

                                        {/* Quick +1 */}
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleQuickAdjustStock(
                                              product.id,
                                              variant.sku || variant.size,
                                              variant.colorHex,
                                              1
                                            )
                                          }
                                          className="px-2 py-1 bg-white border border-[var(--color-border)] hover:bg-emerald-50 text-[var(--color-text)] hover:text-emerald-700 rounded-xs text-[11px] font-bold cursor-pointer"
                                          title="Add 1 unit"
                                        >
                                          +1
                                        </button>

                                        {/* Quick +5 */}
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleQuickAdjustStock(
                                              product.id,
                                              variant.sku || variant.size,
                                              variant.colorHex,
                                              5
                                            )
                                          }
                                          className="px-2 py-1 bg-[var(--color-accent)]/15 hover:bg-[var(--color-accent)] text-[var(--color-accent)] hover:text-white rounded-xs text-[11px] font-bold cursor-pointer transition-colors"
                                          title="Add 5 units to stock"
                                        >
                                          +5
                                        </button>

                                        {/* Quick +10 */}
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleQuickAdjustStock(
                                              product.id,
                                              variant.sku || variant.size,
                                              variant.colorHex,
                                              10
                                            )
                                          }
                                          className="px-2 py-1 bg-[var(--color-text)] hover:bg-[var(--color-primary-hover)] text-[var(--color-bg)] rounded-xs text-[11px] font-bold cursor-pointer transition-colors"
                                          title="Restock +10 units"
                                        >
                                          +10
                                        </button>

                                        {/* Direct Number Input */}
                                        <div className="flex items-center gap-1 ml-2 rtl:ml-0 rtl:mr-2">
                                          <input
                                            type="number"
                                            min="0"
                                            value={inputVal !== undefined ? inputVal : vStock}
                                            onChange={(e) => {
                                              const val = parseInt(e.target.value, 10);
                                              setEditingVariantStocks((prev) => ({
                                                ...prev,
                                                [variantKey]: isNaN(val) ? 0 : val,
                                              }));
                                            }}
                                            className="w-14 px-1.5 py-1 text-center bg-white border border-[var(--color-border)] rounded-xs text-xs font-mono font-bold text-[var(--color-text)]"
                                          />
                                          {inputVal !== undefined && inputVal !== vStock && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                handleQuickAdjustStock(
                                                  product.id,
                                                  variant.sku || variant.size,
                                                  variant.colorHex,
                                                  0,
                                                  inputVal
                                                );
                                                setEditingVariantStocks((prev) => {
                                                  const next = { ...prev };
                                                  delete next[variantKey];
                                                  return next;
                                                });
                                              }}
                                              className="px-2 py-1 bg-[var(--color-primary)] text-white text-[10px] font-bold uppercase rounded-xs cursor-pointer shadow-xs"
                                            >
                                              Set
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: CATEGORY MANAGEMENT */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            
            {/* Real-time Category Database Feedback Toast */}
            {categoryFeedback && (
              <div
                className={`p-4 rounded-xs text-xs font-semibold flex items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200 ${
                  categoryFeedback.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                    : 'bg-red-50 text-[var(--color-primary)] border border-red-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {categoryFeedback.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                  )}
                  <span>{categoryFeedback.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCategoryFeedback(null)}
                  className="text-gray-400 hover:text-[var(--color-text)] cursor-pointer text-sm"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Category Metrics Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-[var(--color-card)] p-4 rounded-sm border border-[var(--color-border)] shadow-xs">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text)]/60 block">
                  {language === 'ar' ? 'إجمالي الأقسام' : 'Total Categories'}
                </span>
                <span className="text-2xl font-bold text-[var(--color-text)] tabular-nums">
                  {categories.length}
                </span>
              </div>
              <div className="bg-[var(--color-card)] p-4 rounded-sm border border-[var(--color-border)] shadow-xs">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 block">
                  {language === 'ar' ? 'أقسام نشطة في المتجر' : 'Active Storefront'}
                </span>
                <span className="text-2xl font-bold text-emerald-700 tabular-nums">
                  {categories.filter((c) => c.active).length}
                </span>
              </div>
              <div className="bg-[var(--color-card)] p-4 rounded-sm border border-[var(--color-border)] shadow-xs">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 block">
                  {language === 'ar' ? 'أقسام مخفية / مسودة' : 'Hidden / Draft'}
                </span>
                <span className="text-2xl font-bold text-amber-700 tabular-nums">
                  {categories.filter((c) => !c.active).length}
                </span>
              </div>
             
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-[var(--color-card)] p-4 rounded-sm border border-[var(--color-border)] shadow-xs flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  placeholder={
                    language === 'ar'
                      ? 'البحث باسم القسم، الرابط، أو الوصف...'
                      : 'Search categories by name, slug, or keyword...'
                  }
                  className="w-full pl-9 pr-3 rtl:pl-3 rtl:pr-9 py-2 bg-[var(--color-bg)]/30 border border-[var(--color-border)] rounded-xs text-xs text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                />
                {categorySearch && (
                  <button
                    type="button"
                    onClick={() => setCategorySearch('')}
                    className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[var(--color-text)] text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex bg-[var(--color-bg)]/40 p-1 rounded-xs border border-[var(--color-border)] text-xs">
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('all')}
                    className={`px-3 py-1 rounded-xs font-semibold cursor-pointer transition-colors ${
                      categoryFilter === 'all'
                        ? 'bg-[var(--color-text)] text-white shadow-xs'
                        : 'text-[var(--color-text)]/70 hover:text-[var(--color-text)]'
                    }`}
                  >
                    {language === 'ar' ? 'الكل' : 'All'} ({categories.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('active')}
                    className={`px-3 py-1 rounded-xs font-semibold cursor-pointer transition-colors ${
                      categoryFilter === 'active'
                        ? 'bg-[var(--color-text)] text-white shadow-xs'
                        : 'text-[var(--color-text)]/70 hover:text-[var(--color-text)]'
                    }`}
                  >
                    {language === 'ar' ? 'النشطة' : 'Active'} (
                    {categories.filter((c) => c.active).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('inactive')}
                    className={`px-3 py-1 rounded-xs font-semibold cursor-pointer transition-colors ${
                      categoryFilter === 'inactive'
                        ? 'bg-[var(--color-text)] text-white shadow-xs'
                        : 'text-[var(--color-text)]/70 hover:text-[var(--color-text)]'
                    }`}
                  >
                    {language === 'ar' ? 'المخفية' : 'Hidden'} (
                    {categories.filter((c) => !c.active).length})
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCreatingCategory(true)}
                  className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold uppercase tracking-wider rounded-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'إضافة قسم' : 'Add Category'}</span>
                </button>
              </div>
            </div>

            {/* Category Cards Grid */}
            {(() => {
              const filteredCategories = categories
                .filter((c) => {
                  const query = categorySearch.toLowerCase().trim();
                  const matchesSearch =
                    !query ||
                    c.nameEn.toLowerCase().includes(query) ||
                    c.nameAr.includes(query) ||
                    (c.slug && c.slug.toLowerCase().includes(query)) ||
                    (c.descriptionEn && c.descriptionEn.toLowerCase().includes(query));
                  const matchesFilter =
                    categoryFilter === 'all' ||
                    (categoryFilter === 'active' && c.active) ||
                    (categoryFilter === 'inactive' && !c.active);
                  return matchesSearch && matchesFilter;
                })
                .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

              if (filteredCategories.length === 0) {
                return (
                  <div className="bg-[var(--color-card)] p-12 text-center rounded-sm border border-[var(--color-border)] shadow-xs space-y-4">
                    <Layers className="w-12 h-12 text-gray-300 mx-auto" />
                    <div className="space-y-1">
                      <h4 className="font-heading text-lg font-semibold text-[var(--color-text)]">
                        {language === 'ar' ? 'لم يتم العثور على أقسام مطابقة' : 'No matching categories found'}
                      </h4>
                      <p className="text-xs text-[var(--color-text)]/60 max-w-sm mx-auto">
                        {categorySearch
                          ? language === 'ar'
                            ? `لا توجد نتائج بحث مطابقة لـ "${categorySearch}". جربي كلمة بحث أخرى أو إعادة تعيين الفلاتر.`
                            : `No categories match "${categorySearch}". Try a different keyword or reset filters.`
                          : language === 'ar'
                          ? 'ابدئي بإضافة أول قسم لمنتجات متجرك لتنظيم تشكيلة ملابس النوم الفاخرة.'
                          : 'Get started by creating your first luxury sleepwear category.'}
                      </p>
                    </div>
                    {categorySearch ? (
                      <button
                        type="button"
                        onClick={() => {
                          setCategorySearch('');
                          setCategoryFilter('all');
                        }}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-[var(--color-text)] text-xs font-semibold rounded-xs cursor-pointer"
                      >
                        {language === 'ar' ? 'إعادة تعيين الفلاتر' : 'Reset Search'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsCreatingCategory(true)}
                        className="px-5 py-2.5 bg-[var(--color-primary)] text-white text-xs font-semibold uppercase tracking-wider rounded-xs cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{language === 'ar' ? 'إضافة قسم جديد الآن' : 'Add First Category Now'}</span>
                      </button>
                    )}
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCategories.map((c) => {
                    const linkedProductsCount = products.filter(
                      (p) => p.categoryId === c.id || p.categoryId === c.slug
                    ).length;

                    return (
                      <div
                        key={c.id}
                        className={`bg-[var(--color-card)] rounded-sm border transition-all duration-200 shadow-xs flex flex-col justify-between overflow-hidden group ${
                          c.active ? 'border-[var(--color-border)] hover:border-[var(--color-accent)]' : 'border-gray-200 opacity-80 bg-gray-50/50'
                        }`}
                      >
                        <div>
                          {/* Banner Image & Status Badges */}
                          <div className="relative aspect-[16/9] w-full overflow-hidden bg-gray-100">
                            <img
                              src={c.image || ROSE_SATIN_IMAGE}
                              alt={c.nameEn}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = ROSE_SATIN_IMAGE;
                              }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                            {/* Top Left Chips: Active Status & Display Order */}
                            <div className="absolute top-3 left-3 rtl:left-auto rtl:right-3 flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase tracking-wider shadow-xs ${
                                  c.active
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-gray-800 text-gray-200'
                                }`}
                              >
                                {c.active ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'مخفي' : 'Hidden')}
                              </span>
                              <span className="px-2 py-0.5 rounded-xs text-[10px] font-mono font-bold bg-[var(--color-text)]/80 text-[var(--color-bg)] backdrop-blur-xs shadow-xs">
                                #{c.displayOrder}
                              </span>
                            </div>

                            {/* Top Right: Linked Products Count */}
                            <div className="absolute top-3 right-3 rtl:right-auto rtl:left-3">
                              <span className="px-2.5 py-1 rounded-xs text-[10px] font-semibold bg-[var(--color-card)]/95 text-[var(--color-text)] shadow-xs flex items-center gap-1">
                                <Package className="w-3 h-3 text-[var(--color-accent)]" />
                                <span className="tabular-nums font-bold">{linkedProductsCount}</span>
                                <span>{language === 'ar' ? 'منتج' : 'items'}</span>
                              </span>
                            </div>

                            {/* Bottom Title Overlay */}
                            <div className="absolute bottom-3 left-3 right-3 text-white">
                              <p className="text-xs text-[var(--color-bg)] font-medium font-sans drop-shadow-sm">
                                {c.nameAr}
                              </p>
                              <h4 className="font-heading text-lg font-bold text-white drop-shadow-sm leading-tight">
                                {c.nameEn}
                              </h4>
                            </div>
                          </div>

                          {/* Card Content Details */}
                          <div className="p-4 space-y-3">
                            {/* URL Slug & Database ID */}
                            <div className="flex items-center justify-between gap-2 text-[11px] font-mono bg-[var(--color-bg)]/30 px-2.5 py-1.5 rounded-xs border border-[var(--color-border)]">
                              <span className="text-[var(--color-accent)] font-bold truncate">
                                /{c.slug || c.id}
                              </span>
                              <span className="text-[10px] text-gray-400 shrink-0">
                                ID: {c.id.length > 14 ? `${c.id.slice(0, 14)}...` : c.id}
                              </span>
                            </div>

                            {/* Description preview */}
                            <p className="text-xs text-[var(--color-text)]/75 line-clamp-2 min-h-[2rem]">
                              {language === 'ar'
                                ? c.descriptionAr || c.descriptionEn || 'لا يوجد وصف مدخل لهذا القسم.'
                                : c.descriptionEn || c.descriptionAr || 'No description provided for this luxury category.'}
                            </p>
                          </div>
                        </div>

                        {/* Card Action Footer */}
                        <div className="p-4 pt-2 border-t border-[var(--color-border)] bg-white flex items-center justify-between gap-2">
                          {/* Toggle Active Switch */}
                          <button
                            type="button"
                            onClick={() => handleToggleCategoryActive(c)}
                            className={`px-2.5 py-1.5 rounded-xs text-xs font-medium cursor-pointer transition-colors border ${
                              c.active
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                : 'border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                            title={c.active ? 'Hide from boutique storefront' : 'Make active in boutique storefront'}
                          >
                            {c.active ? (
                              <span>✓ {language === 'ar' ? 'معروض' : 'Active'}</span>
                            ) : (
                              <span>✕ {language === 'ar' ? 'مخفي' : 'Hidden'}</span>
                            )}
                          </button>

                          <div className="flex items-center gap-1.5">
                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCategory(c);
                                setIsCreatingCategory(false);
                              }}
                              className="px-3 py-1.5 rounded-xs bg-[var(--color-text)] hover:bg-[var(--color-primary-hover)] text-[var(--color-bg)] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                              title="Edit Category Details and Image"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                              <span>{language === 'ar' ? 'تعديل' : 'Edit'}</span>
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => setCategoryToDelete(c)}
                              className="p-1.5 rounded-xs border border-red-200 hover:bg-red-50 text-[var(--color-primary)] transition-colors cursor-pointer"
                              title="Delete Category from Database"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

          </div>
        )}

        {/* TAB 4: ORDERS MANAGEMENT */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            
            {/* Delivery Payment Verification (POD) Admin Terminal */}
            <div className="bg-[var(--color-card)] p-6 rounded-sm border-2 border-[var(--color-accent)] shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-[var(--color-bg)] rounded-xs border border-[var(--color-accent)] text-[var(--color-accent)]">
                    <ShieldCheck className="w-5 h-5 text-[var(--color-accent)]" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-bold text-[var(--color-text)]">
                      {language === 'ar' ? 'منصة التحقق من الدفع عند الاستلام (Pay On Delivery)' : 'On-Delivery Payment Verification Terminal'}
                    </h3>
                    <p className="text-xs text-[var(--color-text)]/70">
                      {language === 'ar' ? 'أدخلي الرمز المكون من ٦ أرقام أو امسحي رمز QR لتأكيد استلام المبلغ من العميلة' : 'Verify customer 6-digit PIN or scan QR code to confirm payment collection upon handover'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsQrScannerModalOpen(true)}
                    className="px-3.5 py-2 bg-[var(--color-text)] hover:bg-[var(--color-primary-hover)] text-[var(--color-bg)] text-xs font-semibold uppercase tracking-wider rounded-xs flex items-center gap-2 transition-colors border border-[var(--color-accent)] shadow-xs"
                    title="Launch Optical QR Scanner Terminal"
                  >
                    <Camera className="w-4 h-4 text-[var(--color-accent)]" />
                    <span>{language === 'ar' ? 'تشغيل ماسح QR' : 'Launch QR Scanner'}</span>
                  </button>
                  <div className="text-right">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)] block">
                      Pending POD:
                    </span>
                    <span className="text-xl font-bold text-[var(--color-primary)] tabular-nums">
                      {orders.filter((o) => o.paymentMethod === 'pay_on_delivery' && o.paymentStatus === 'Pending').length} orders
                    </span>
                  </div>
                </div>
              </div>

              {/* 6-Digit PIN Verification Form */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!enteredVerificationCode.trim()) return;

                  // Find matching order by code or selected order
                  let target = orders.find(
                    (o) => o.deliveryVerificationCode === enteredVerificationCode.trim()
                  );

                  if (!target && selectedPodOrderId) {
                    target = orders.find((o) => o.id === selectedPodOrderId);
                  }

                  if (!target) {
                    setVerificationFeedback({
                      text: language === 'ar' ? 'لم يتم العثور على طلب بهذا الرمز المكون من ٦ أرقام.' : 'No order matches this 6-digit verification PIN.',
                      success: false,
                    });
                    return;
                  }

                  const res = await confirmDeliveryPayment(target.id, enteredVerificationCode.trim(), currentUser?.email || 'Admin');
                  if (res.success) {
                    setVerificationFeedback({ text: res.message, success: true });
                    setEnteredVerificationCode('');
                    setSelectedPodOrderId('');
                  } else {
                    setVerificationFeedback({ text: res.message, success: false });
                  }
                }}
                className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
              >
                <div className="sm:col-span-4 space-y-1 text-xs">
                  <label className="font-semibold text-[var(--color-text)] block">
                    {language === 'ar' ? 'رمز التحقق (٦ أرقام)' : 'Customer 6-Digit PIN *'}
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={enteredVerificationCode}
                    onChange={(e) => setEnteredVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 481923"
                    className="w-full px-3 py-2 bg-[var(--color-bg)]/30 border border-[var(--color-accent)] rounded-xs font-mono text-base font-bold text-[var(--color-text)] tracking-widest placeholder:text-gray-400 placeholder:text-xs placeholder:font-sans focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                  />
                </div>

                <div className="sm:col-span-5 space-y-1 text-xs">
                  <label className="font-semibold text-[var(--color-text)] block">
                    {language === 'ar' ? 'أو اختاري من الطلبات بانتظار التحصيل' : 'Or Select Pending POD Order'}
                  </label>
                  <select
                    value={selectedPodOrderId}
                    onChange={(e) => {
                      setSelectedPodOrderId(e.target.value);
                      const ord = orders.find((o) => o.id === e.target.value);
                      if (ord && ord.deliveryVerificationCode) {
                        setEnteredVerificationCode(ord.deliveryVerificationCode);
                      }
                    }}
                    className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-xs text-xs text-[var(--color-text)]"
                  >
                    <option value="">-- Choose pending order --</option>
                    {orders
                      .filter((o) => o.paymentMethod === 'pay_on_delivery' && o.paymentStatus === 'Pending')
                      .map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.orderNumber} - {o.customerName} ({formatBHD(o.total)}) [PIN: {o.deliveryVerificationCode}]
                        </option>
                      ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-[var(--color-accent)] hover:bg-[var(--color-primary-hover)] text-white font-semibold text-xs uppercase tracking-wider rounded-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>{language === 'ar' ? 'تأكيد استلام الدفعة' : 'Confirm Payment'}</span>
                  </button>
                </div>
              </form>

              {verificationFeedback && (
                <div
                  className={`p-3 rounded-xs text-xs font-semibold flex items-center gap-2 ${
                    verificationFeedback.success
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                      : 'bg-red-50 text-[var(--color-primary)] border border-red-200'
                  }`}
                >
                  {verificationFeedback.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  <span>{verificationFeedback.text}</span>
                </div>
              )}
            </div>

            {/* Orders Table */}
            <div className="bg-[var(--color-card)] rounded-sm border border-[var(--color-border)] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left rtl:text-right text-xs">
                  <thead className="bg-[var(--color-bg)]/50 text-[var(--color-text)] font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="p-4">Order ID</th>
                      <th className="p-4">Customer & Phone</th>
                      <th className="p-4">Bahrain Address</th>
                      <th className="p-4">Payment Method & PIN</th>
                      <th className="p-4">Total (BHD)</th>
                      <th className="p-4">Fulfillment Status</th>
                      <th className="p-4">Actions / QR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {orders.map((o) => {
                      const isPodOrder = o.paymentMethod === 'pay_on_delivery';
                      const isPodPending = isPodOrder && o.paymentStatus === 'Pending';

                      return (
                        <tr key={o.id} className={`hover:bg-[var(--color-bg)]/20 ${isPodPending ? 'bg-amber-50/40' : ''}`}>
                          <td className="p-4 font-mono font-bold text-[var(--color-text)]">{o.orderNumber}</td>
                          <td className="p-4">
                            <p className="font-semibold text-[var(--color-text)]">{o.customerName}</p>
                            <p className="text-[11px] text-[var(--color-text)]/60">{o.customerPhone}</p>
                          </td>
                          <td className="p-4 text-[var(--color-text)]/80">
                            {o.shippingAddress.buildingNumber}, {o.shippingAddress.roadNumber}, {o.shippingAddress.area}
                          </td>
                          <td className="p-4 space-y-1">
                            <div className="flex items-center gap-1.5">
                              {isPodOrder && <Truck className="w-3.5 h-3.5 text-[var(--color-accent)]" />}
                              <span className="font-semibold uppercase">
                                {isPodOrder ? 'Pay on Delivery' : o.paymentMethod.replace('_', ' ')}
                              </span>
                            </div>
                            
                            {isPodOrder && o.deliveryVerificationCode && (
                              <div className="flex items-center gap-1">
                                <span className="bg-[var(--color-bg)] text-[var(--color-text)] px-1.5 py-0.5 rounded-xs font-mono font-bold text-[10px]">
                                  PIN: {o.deliveryVerificationCode}
                                </span>
                              </div>
                            )}

                            <div>
                              {o.paymentStatus === 'Paid' ? (
                                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.2 rounded-xs">
                                  ✓ PAID
                                </span>
                              ) : (
                                <span className="text-[10px] text-amber-700 font-bold bg-amber-100 px-1.5 py-0.2 rounded-xs">
                                  ● PENDING COLLECTION
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 font-bold text-[var(--color-text)] tabular-nums">{formatBHD(o.total)}</td>
                          <td className="p-4">
                            <select
                              value={o.orderStatus}
                              onChange={(e) => updateOrderStatus(o.id, e.target.value as OrderStatus)}
                              className="p-1.5 border border-[var(--color-border)] rounded-xs bg-white text-xs text-[var(--color-text)]"
                            >
                              <option value="Pending">Pending</option>
                              <option value="Confirmed">Confirmed</option>
                              <option value="Preparing">Preparing</option>
                              <option value="Shipped">Shipped</option>
                              <option value="Delivered">Delivered</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          </td>
                          <td className="p-4 flex items-center gap-1.5 flex-wrap">
                            {/* Receipt Modal Trigger */}
                            <button
                              type="button"
                              onClick={() => setSelectedAdminReceiptOrder(o)}
                              className="p-1.5 rounded-xs border border-[#0083C9]/40 hover:bg-[#EAF5FC] text-[#0083C9] transition-colors cursor-pointer"
                              title="View & Dispatch Official MyFatoorah Receipt"
                            >
                              <FileText className="w-4 h-4" />
                            </button>

                            {/* QR Code Inspection Modal Trigger */}
                            {isPodOrder && o.deliveryVerificationCode && (
                              <button
                                type="button"
                                onClick={() => setQrInspectOrder(o)}
                                className="p-1.5 rounded-xs border border-[var(--color-border)] hover:bg-[var(--color-bg)] text-[var(--color-text)] transition-colors cursor-pointer"
                                title="View Delivery QR Code & Scan Terminal"
                              >
                                <QrCode className="w-4 h-4 text-[var(--color-accent)]" />
                              </button>
                            )}

                            {/* Quick confirm button for pending POD */}
                            {isPodPending && (
                              <button
                                type="button"
                                onClick={() => {
                                  confirmDeliveryPayment(o.id, o.deliveryVerificationCode, currentUser?.email || 'Admin');
                                }}
                                className="px-2 py-1 bg-[var(--color-accent)] hover:bg-[var(--color-primary-hover)] text-white text-[10px] font-bold uppercase rounded-xs cursor-pointer"
                                title="Mark Paid on Handover"
                              >
                                Verify Paid
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: COUPONS */}
        {activeTab === 'coupons' && (
          <div className="space-y-8">
            {/* Create Coupon Form */}
            <form onSubmit={handleCreateCoupon} className="bg-[var(--color-card)] p-6 rounded-sm border border-[var(--color-border)] shadow-xs space-y-4">
              <h3 className="font-heading text-lg font-semibold text-[var(--color-text)]">
                {language === 'ar' ? 'إنشاء قسيمة ترويجية جديدة' : 'Create Promotional Coupon'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--color-text)]">Coupon Code *</label>
                  <input
                    type="text"
                    required
                    value={newCouponCode}
                    onChange={(e) => setNewCouponCode(e.target.value)}
                    placeholder="e.g. LUXURY20"
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xs font-mono uppercase"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--color-text)]">Type</label>
                  <select
                    value={newCouponType}
                    onChange={(e) => setNewCouponType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xs bg-white"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed BHD Amount</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--color-text)]">Value</label>
                  <input
                    type="number"
                    required
                    value={newCouponValue}
                    onChange={(e) => setNewCouponValue(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--color-text)]">Min Order (BHD)</label>
                  <input
                    type="number"
                    required
                    value={newCouponMin}
                    onChange={(e) => setNewCouponMin(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xs"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-6 py-2.5 bg-[var(--color-primary)] text-white text-xs font-semibold uppercase tracking-wider rounded-xs"
              >
                Add Coupon
              </button>
            </form>

            {/* Coupons List */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {coupons.map((cp) => (
                <div key={cp.code} className="bg-[var(--color-card)] p-5 rounded-sm border border-[var(--color-border)] shadow-xs space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="font-mono text-base font-bold text-[var(--color-primary)]">{cp.code}</span>
                    <button onClick={() => deleteCoupon(cp.code)} className="text-gray-400 hover:text-red-600">✕</button>
                  </div>
                  <p className="text-xs text-[var(--color-text)]">
                    Discount: <strong>{cp.type === 'percentage' ? `${cp.value}%` : `${cp.value} BHD`}</strong>
                  </p>
                  <p className="text-xs text-[var(--color-text)]/70">
                    Min Spend: {formatBHD(cp.minimumOrder)}
                  </p>
                  <p className="text-[11px] text-[var(--color-accent)]">
                    Used: {cp.usedCount} times
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: CMS CUSTOMIZER */}
        {activeTab === 'cms' && (
          <form onSubmit={handleSaveCMS} className="bg-[var(--color-card)] p-6 sm:p-8 rounded-sm border border-[var(--color-border)] shadow-xs space-y-6">
            <div className="flex justify-between items-center border-b border-[var(--color-border)] pb-3">
              <div>
                <h3 className="font-heading text-lg font-semibold text-[var(--color-text)]">
                  {language === 'ar' ? 'إدارة محتوى وواجهة المتجر' : 'Homepage & Announcement CMS'}
                </h3>
                <p className="text-xs text-[var(--color-text)]/70">
                  Configure bilingual headlines and promotions without the hussle.
                </p>
              </div>
              {cmsSaveFeedback && (
                <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> Saved!
                </span>
              )}
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--color-text)]">Announcement Bar (English)</label>
                  <input
                    type="text"
                    value={cmsForm.announcementTextEn}
                    onChange={(e) => setCmsForm({ ...cmsForm, announcementTextEn: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--color-text)]">Announcement Bar (Arabic)</label>
                  <input
                    type="text"
                    value={cmsForm.announcementTextAr}
                    onChange={(e) => setCmsForm({ ...cmsForm, announcementTextAr: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--color-text)]">Hero Title (English)</label>
                  <input
                    type="text"
                    value={cmsForm.heroTitleEn}
                    onChange={(e) => setCmsForm({ ...cmsForm, heroTitleEn: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--color-text)]">Hero Title (Arabic)</label>
                  <input
                    type="text"
                    value={cmsForm.heroTitleAr}
                    onChange={(e) => setCmsForm({ ...cmsForm, heroTitleAr: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--color-text)]">Hero Subtitle (English)</label>
                  <textarea
                    rows={3}
                    value={cmsForm.heroSubtitleEn}
                    onChange={(e) => setCmsForm({ ...cmsForm, heroSubtitleEn: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--color-text)]">Hero Subtitle (Arabic)</label>
                  <textarea
                    rows={3}
                    value={cmsForm.heroSubtitleAr}
                    onChange={(e) => setCmsForm({ ...cmsForm, heroSubtitleAr: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xs"
                  />
                </div>
              </div>

              
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 bg-[var(--color-primary)] text-white text-xs font-semibold uppercase tracking-wider rounded-xs flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{t.admin.saveChanges}</span>
            </button>
          </form>
        )}

        {/* TAB 10: BOUTIQUE ADMINISTRATOR & STAFF MANAGEMENT */}
        {activeTab === 'admins' && (
          <div className="space-y-6">
            
            {/* Top Operational Metrics Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[var(--color-card)] p-5 rounded-sm border border-[var(--color-border)] shadow-xs space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                  {language === 'ar' ? 'إجمالي المشرفين المعتمدين' : language === 'ru' ? 'Всего администраторов' : 'Active Store Admins'}
                </span>
                <p className="text-2xl font-bold text-[var(--color-text)] tabular-nums">
                  {adminList.length}
                </p>
                <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{language === 'ar' ? 'مسجلون في قاعدة بيانات MySQL' : 'MySQL Relational Table users'}</span>
                </p>
              </div>

              <div className="bg-[var(--color-card)] p-5 rounded-sm border border-[var(--color-border)] shadow-xs space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                  {language === 'ar' ? 'صلاحية تعيين المشرفين' : language === 'ru' ? 'Права создания админов' : 'Admin Creation Role'}
                </span>
                <p className="text-xl font-bold text-[var(--color-primary)]">
                  {language === 'ar' ? 'مفعلة للمشرف' : 'Role Enabled'}
                </p>
                <p className="text-[11px] text-[var(--color-text)]/70">
                  {language === 'ar' ? 'خاص وحصري بلوحة التحكم' : 'Restricted to Admin Dashboard'}
                </p>
              </div>

              <div className="bg-[var(--color-card)] p-5 rounded-sm border border-[var(--color-border)] shadow-xs space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                  {language === 'ar' ? 'التوجيه التلقائي بعد الدخول' : language === 'ru' ? 'Автоматический редирект' : 'Post-Auth Redirection'}
                </span>
                <p className="text-xl font-bold text-[var(--color-text)]">
                  {language === 'ar' ? 'توجيه فوري للوحة' : 'Immediate to /admin'}
                </p>
                <p className="text-[11px] text-[var(--color-text)]/70">
                  {language === 'ar' ? 'لجميع المشرفين بعد المصادقة' : 'All authenticated staff'}
                </p>
              </div>

              <div className="bg-[var(--color-card)] p-5 rounded-sm border border-[var(--color-border)] shadow-xs flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-accent)] block">
                    {language === 'ar' ? 'إجراء سريع' : 'Quick Staff Action'}
                  </span>
                  <span className="text-xs text-[var(--color-text)]/80 mt-1 block">
                    {language === 'ar' ? 'إضافة وتعيين مشرف جديد' : 'Onboard new administrator'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateAdminModalOpen(true)}
                  className="mt-2 w-full py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold uppercase tracking-wider rounded-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'فتح نافذة إضافة المشرف' : 'Open Create Admin'}</span>
                </button>
              </div>
            </div>

            {/* Filter and Action Bar */}
            <div className="bg-[var(--color-card)] p-4 rounded-sm border border-[var(--color-border)] flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={adminSearch}
                  onChange={(e) => setAdminSearch(e.target.value)}
                  placeholder={language === 'ar' ? 'بحث عن مشرف بالاسم أو البريد أو الهاتف...' : language === 'ru' ? 'Поиск администратора...' : 'Search admin by name, official email, or phone...'}
                  className="w-full pl-9 pr-3 rtl:pl-3 rtl:pr-9 py-2 border border-[var(--color-border)] rounded-xs text-xs outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchAdmins}
                  disabled={isLoadingAdmins}
                  className="px-3 py-2 border border-[var(--color-border)] hover:bg-gray-50 text-[var(--color-text)] text-xs font-semibold rounded-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Refresh admin list from MySQL"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAdmins ? 'animate-spin text-[var(--color-primary)]' : 'text-gray-500'}`} />
                  <span>{language === 'ar' ? 'تحديث من MySQL' : 'Sync MySQL'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCreateAdminModalOpen(true)}
                  className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold uppercase tracking-wider rounded-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{language === 'ar' ? 'إضافة مشرف جديد' : language === 'ru' ? 'Создать администратора' : 'Create New Admin'}</span>
                </button>
              </div>
            </div>

            {/* Admin Staff Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {adminList
                .filter((adm) => {
                  if (!adminSearch.trim()) return true;
                  const q = adminSearch.toLowerCase();
                  return (
                    (adm.firstName && adm.firstName.toLowerCase().includes(q)) ||
                    (adm.lastName && adm.lastName.toLowerCase().includes(q)) ||
                    (adm.email && adm.email.toLowerCase().includes(q)) ||
                    (adm.phone && adm.phone.toLowerCase().includes(q))
                  );
                })
                .map((admin) => {
                  const isCurrent = currentUser?.email && admin.email.toLowerCase() === currentUser.email.toLowerCase();
                  return (
                    <div
                      key={admin.id}
                      className={`bg-[var(--color-card)] rounded-sm border p-5 space-y-4 shadow-xs transition-all relative ${
                        isCurrent ? 'border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/40' : 'border-[var(--color-border)] hover:border-[var(--color-accent)]/60'
                      }`}
                    >
                      {/* Top Header Row with Avatar & Status */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full bg-[var(--color-text)] text-[var(--color-bg)] flex items-center justify-center font-bold text-sm shrink-0 border border-[var(--color-accent)]/40 shadow-xs">
                            {admin.firstName ? admin.firstName.charAt(0).toUpperCase() : 'A'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="font-heading text-sm font-bold text-[var(--color-text)]">
                                {admin.firstName} {admin.lastName}
                              </h3>
                              {isCurrent && (
                                <span className="bg-[var(--color-accent)] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-xs uppercase tracking-wider">
                                  {language === 'ar' ? 'أنتِ (الجلسة الحالية)' : 'You (Current)'}
                                </span>
                              )}
                            </div>
                            <span className="inline-block mt-0.5 text-[10px] font-bold text-[var(--color-primary)] bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 uppercase tracking-wider">
                              {language === 'ar' ? 'مشرف متجر معتمد' : 'Store Administrator'}
                            </span>
                          </div>
                        </div>

                        <span className="p-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200" title="Active in MySQL">
                          <CheckCircle2 className="w-4 h-4" />
                        </span>
                      </div>

                      {/* Contact & Database Details */}
                      <div className="space-y-1.5 text-xs text-[var(--color-text)]/80 pt-1 border-t border-[var(--color-border)]/70">
                        <div className="flex items-center gap-2 text-[11px] truncate">
                          <Mail className="w-3.5 h-3.5 text-[var(--color-accent)] shrink-0" />
                          <span className="font-mono truncate">{admin.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px]">
                          <Phone className="w-3.5 h-3.5 text-[var(--color-accent)] shrink-0" />
                          <span className="font-mono">{admin.phone || '+973 1722 8844'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500 pt-1">
                          <Database className="w-3 h-3 text-gray-400 shrink-0" />
                          <span className="font-mono truncate">ID: {admin.id}</span>
                        </div>
                      </div>

                      {/* Capabilities Checklist */}
                      <div className="p-2.5 bg-[var(--color-bg)] rounded-xs border border-[var(--color-border)] text-[10px] space-y-1 text-[var(--color-text)]/80">
                        <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                          <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{language === 'ar' ? 'صلاحية إضافة وتعيين مشرفين جدد' : 'Can create and assign new administrators'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                          <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{language === 'ar' ? 'إعادة التوجيه التلقائي للوحة التحكم الإدارية' : 'Automatic redirection to Admin Dashboard upon login'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                          <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{language === 'ar' ? 'إدارة الكتالوج، المخزون، والطلبات في MySQL' : 'Catalog, Inventory & Orders management in MySQL'}</span>
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="flex items-center justify-between text-[10px] text-[var(--color-text)]/60 pt-2 border-t border-[var(--color-border)]/60">
                        <span>{language === 'ar' ? 'تاريخ التعيين:' : 'Appointed:'} {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : 'Active'}</span>
                        <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-xs border border-emerald-200">
                          {admin.twoFactorEnabled ? '2FA Enabled' : 'Verified Staff'}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Security Assurance Callout */}
            <div className="p-4 bg-amber-50/80 border border-amber-300 rounded-xs flex items-start gap-3 text-xs text-amber-950">
              <ShieldCheck className="w-5 h-5 text-[var(--color-accent)] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">
                  {language === 'ar'
                    ? 'سياسة أمان المشرفين وتوجيه الصلاحيات (Bedtime Store Policy)'
                    : 'Administrator Security Governance Policy'}
                </p>
                <p className="text-[11px] leading-relaxed text-amber-900">
                  {language === 'ar'
                    ? 'نافذة إنشاء وتعيين المشرفين مقتصرة حصرياً على لوحة التحكم الإدارية هذه ولا يمكن الوصول إليها من الصفحات العامة. فور قيام المشرف بتسجيل الدخول بأي حساب إداري، يتم توجيهه تلقائياً وبشكل مباشر إلى لوحة التحكم الإدارية لمتابعة عمليات المتجر الفاخر وإدارة المخزون والمبيعات.'
                    : 'The "Create Admin" modal is strictly accessible exclusively within this Admin Dashboard and cannot be viewed on customer pages. Upon authenticating with any administrator credentials, the user is automatically redirected here to the Admin Dashboard for boutique operations.'}
                </p>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* Product Edit / Create Modal */}
      {(editingProduct || isCreatingProduct) && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-[var(--color-text)]/60 backdrop-blur-xs">
          <div className="bg-[var(--color-card)] rounded-sm max-w-2xl w-full p-6 sm:p-8 space-y-4 border border-[var(--color-border)]">
            <div className="flex justify-between items-center border-b border-[var(--color-border)] pb-3">
              <h3 className="font-heading text-xl font-semibold text-[var(--color-text)]">
                {editingProduct ? t.admin.editProduct : t.admin.addNewProduct}
              </h3>
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setIsCreatingProduct(false);
                }}
                className="text-gray-400 hover:text-[var(--color-text)]"
              >
                ✕
              </button>
            </div>

            {/* Live Database Feedback & Error Notifications */}
            {productFeedback && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xs text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{productFeedback.text}</span>
              </div>
            )}

            {productUploadError && (
              <div className="p-3 bg-red-50 border border-red-300 text-red-800 rounded-xs text-xs flex items-center gap-2 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{productUploadError}</span>
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIsSavingProduct(true);
                setProductUploadError(null);
                setProductFeedback(null);

                const form = e.currentTarget;
                const nameEn = (form.elements.namedItem('nameEn') as HTMLInputElement).value.trim();
                const nameAr = (form.elements.namedItem('nameAr') as HTMLInputElement).value.trim();
                const sku = (form.elements.namedItem('sku') as HTMLInputElement)?.value?.trim() || `BDS-${Date.now().toString().slice(-6)}`;
                const price = Number((form.elements.namedItem('price') as HTMLInputElement).value);
                const salePriceVal = (form.elements.namedItem('salePrice') as HTMLInputElement).value;
                const catId = (form.elements.namedItem('categoryId') as HTMLSelectElement).value;
                const materialEn = (form.elements.namedItem('materialEn') as HTMLInputElement)?.value?.trim() || '100% Pure Mulberry Silk';
                const materialAr = (form.elements.namedItem('materialAr') as HTMLInputElement)?.value?.trim() || 'حرير التوت الطبيعي ١٠٠٪';
                const careInstructionsEn = (form.elements.namedItem('careInstructionsEn') as HTMLInputElement)?.value?.trim() || 'Hand wash cold or gentle dry clean.';
                const careInstructionsAr = (form.elements.namedItem('careInstructionsAr') as HTMLInputElement)?.value?.trim() || 'غسيل يدوي بماء بارد أو تنظيف جاف لطيف.';
                const descriptionEn = (form.elements.namedItem('descriptionEn') as HTMLTextAreaElement)?.value?.trim() || 'Handcrafted luxury nightwear tailored for timeless elegance in Bahrain.';
                const descriptionAr = (form.elements.namedItem('descriptionAr') as HTMLTextAreaElement)?.value?.trim() || 'ملابس نوم فاخرة مصنوعة يدوياً لأناقة خالدة في البحرين.';
                const featured = (form.elements.namedItem('featured') as HTMLInputElement)?.checked ?? false;
                const bestSeller = (form.elements.namedItem('bestSeller') as HTMLInputElement)?.checked ?? false;
                const newArrival = (form.elements.namedItem('newArrival') as HTMLInputElement)?.checked ?? true;
                const active = (form.elements.namedItem('active') as HTMLInputElement)?.checked ?? true;
                const ageGroupVal = (form.elements.namedItem('ageGroup') as HTMLSelectElement).value;
                const ageGroup = ageGroupVal !== 'none' ? (ageGroupVal as KidAgeRange) : undefined;
                const isKids = (form.elements.namedItem('isKids') as HTMLInputElement).checked || !!ageGroup || catId === 'cat-kids-sleepwear';
                const cat = categories.find((c) => c.id === catId);

                // Variant stock breakdown from form
                const stockS = Math.max(0, Number((form.elements.namedItem('stockS') as HTMLInputElement)?.value || 10));
                const stockM = Math.max(0, Number((form.elements.namedItem('stockM') as HTMLInputElement)?.value || 10));
                const stockL = Math.max(0, Number((form.elements.namedItem('stockL') as HTMLInputElement)?.value || 8));
                const stockXL = Math.max(0, Number((form.elements.namedItem('stockXL') as HTMLInputElement)?.value || 6));

                const defaultVariants = editingProduct?.variants?.length
                  ? editingProduct.variants
                  : [
                      { size: 'S' as ProductSize, colorNameEn: 'Burgundy', colorNameAr: 'عنابي', colorHex: '#6B0F1F', stock: stockS, sku: `${sku}-S` },
                      { size: 'M' as ProductSize, colorNameEn: 'Burgundy', colorNameAr: 'عنابي', colorHex: '#6B0F1F', stock: stockM, sku: `${sku}-M` },
                      { size: 'L' as ProductSize, colorNameEn: 'Burgundy', colorNameAr: 'عنابي', colorHex: '#6B0F1F', stock: stockL, sku: `${sku}-L` },
                      { size: 'XL' as ProductSize, colorNameEn: 'Burgundy', colorNameAr: 'عنابي', colorHex: '#6B0F1F', stock: stockXL, sku: `${sku}-XL` },
                    ];

                const finalImages = productImageUpload
                  ? [productImageUpload, ...productAdditionalImages]
                  : (editingProduct?.images?.length ? editingProduct.images : [HERO_IMAGE || '/images/hero_pic.jpeg']);

                try {
                  if (editingProduct) {
                    await updateProduct(editingProduct.id, {
                      sku,
                      nameEn,
                      nameAr,
                      price,
                      salePrice: salePriceVal ? Number(salePriceVal) : undefined,
                      categoryId: catId,
                      categoryNameEn: cat?.nameEn || '',
                      categoryNameAr: cat?.nameAr || '',
                      materialEn,
                      materialAr,
                      careInstructionsEn,
                      careInstructionsAr,
                      descriptionEn,
                      descriptionAr,
                      featured,
                      bestSeller,
                      newArrival,
                      active,
                      ageGroup,
                      isKids,
                      images: finalImages,
                      variants: defaultVariants,
                    });
                    setProductFeedback({
                      text: language === 'ar' ? '✓ تم تحديث المنتج وحفظه بنجاح في قاعدة بيانات MySQL!' : '✓ Product data successfully updated and saved to MySQL database!',
                      success: true,
                    });
                  } else {
                    await addProduct({
                      sku,
                      nameEn,
                      nameAr,
                      descriptionEn,
                      descriptionAr,
                      categoryId: catId,
                      categoryNameEn: cat?.nameEn || 'Nightwear',
                      categoryNameAr: cat?.nameAr || 'ملابس نوم',
                      price,
                      salePrice: salePriceVal ? Number(salePriceVal) : undefined,
                      currency: 'BHD',
                      images: finalImages,
                      variants: defaultVariants,
                      materialEn,
                      materialAr,
                      careInstructionsEn,
                      careInstructionsAr,
                      tags: isKids ? ['Kids', 'Silk'] : ['Luxury', 'Silk', 'Boutique'],
                      featured,
                      bestSeller,
                      newArrival,
                      active,
                      rating: 5.0,
                      reviewCount: 0,
                      ageGroup,
                      isKids,
                    });
                    setProductFeedback({
                      text: language === 'ar' ? '✓ تم رفع وإضافة المنتج الجديد بنجاح إلى قاعدة بيانات MySQL!' : '✓ New product successfully uploaded and published to MySQL database!',
                      success: true,
                    });
                  }

                  setTimeout(() => {
                    setEditingProduct(null);
                    setIsCreatingProduct(false);
                    setProductFeedback(null);
                  }, 1200);
                } catch (err: any) {
                  setProductUploadError(err.message || 'Failed to upload product data to MySQL database. Please check your connection.');
                } finally {
                  setIsSavingProduct(false);
                }
              }}
              className="space-y-4 text-xs"
            >
              {/* Product Image Upload Section: Supports Large Files Up to 50MB */}
              <div className="bg-[var(--color-bg)] p-4 rounded-xs border border-[var(--color-border)] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-heading text-xs font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-[var(--color-accent)]" />
                      <span>{language === 'ar' ? 'صورة المنتج الرئيسية (دعم صور فائقة الدقة حتى 50 ميغابايت) *' : 'Primary Product Image (Supports High-Res Images up to 50MB) *'}</span>
                    </label>
                    <p className="text-[11px] text-[var(--color-text)]/70 mt-0.5">
                      {language === 'ar'
                        ? 'يدعم صور الكاميرا والهواتف الذكية عالية الدقة حتى 50 ميغابايت (JPG, PNG, WEBP, AVIF). يتم تحسين الصور تلقائياً لشاشات ريتنا بدقة 2.5K فائقة الوضوح مع الحفاظ التام على تفاصيل أنسجة الحرير والدانتيل.'
                        : 'Upload high-resolution DSLR or smartphone photos up to 50MB (JPG, PNG, WEBP, AVIF). Automatically processed for 2.5K Retina clarity while preserving exquisite silk and lace fabric textures.'}
                    </p>
                  </div>
                  {productImageUpload && (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full flex items-center gap-1 shrink-0">
                      <Check className="w-3 h-3 text-emerald-600" />
                      {language === 'ar' ? 'الصورة جاهزة للرفع' : 'Ready to Upload'}
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-start pt-1">
                  {/* Visual Preview */}
                  <div className="w-32 h-40 bg-[var(--color-card)] rounded-xs border-2 border-dashed border-[var(--color-accent)]/50 overflow-hidden shrink-0 flex items-center justify-center relative shadow-xs group">
                    {isProcessingImage ? (
                      <div className="text-center p-2 text-[var(--color-primary)] space-y-1.5 animate-pulse">
                        <RefreshCw className="w-6 h-6 mx-auto animate-spin text-[var(--color-accent)]" />
                        <span className="text-[10px] block font-semibold">
                          {language === 'ar' ? 'جاري معالجة الصورة...' : 'Processing 50MB file...'}
                        </span>
                      </div>
                    ) : productImageUpload ? (
                      <>
                        <img
                          src={productImageUpload}
                          alt="Customer product preview"
                          className="w-full h-full object-cover object-center"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setProductImageUpload('');
                            setProductImageMeta(null);
                          }}
                          className="absolute top-1 right-1 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-md"
                          title="Remove image"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <div className="text-center p-2 text-gray-400 space-y-1">
                        <Upload className="w-6 h-6 mx-auto text-[var(--color-accent)]" />
                        <span className="text-[10px] block leading-tight text-[var(--color-accent)] font-medium">
                          {language === 'ar' ? 'اختيار صورة (حتى 50MB)' : 'Select Image (up to 50MB)'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Upload Controls & File Specifications */}
                  <div className="flex-1 space-y-2.5 w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 bg-[var(--color-text)] hover:bg-[var(--color-primary-hover)] text-[var(--color-bg)] rounded-xs text-xs font-semibold tracking-wide transition-colors shadow-xs">
                        <Upload className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                        <span>{language === 'ar' ? 'اختيار ورفع ملف صورة من جهازك (حتى 50MB)...' : 'Upload Image from Device (Up to 50MB)...'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleProductImageFile}
                          disabled={isProcessingImage || isSavingProduct}
                        />
                      </label>

                      {productImageUpload && (
                        <button
                          type="button"
                          onClick={() => {
                            setProductImageUpload('');
                            setProductImageMeta(null);
                          }}
                          className="px-2.5 py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded-xs text-xs transition-colors cursor-pointer"
                        >
                          {language === 'ar' ? 'إزالة' : 'Clear'}
                        </button>
                      )}
                    </div>

                    {/* File Optimization Metadata Badge */}
                    {productImageMeta && (
                      <div className="p-2 bg-white rounded-xs border border-[var(--color-border)] text-[11px] text-[var(--color-text)] space-y-0.5">
                        <p className="font-semibold text-[var(--color-primary)] truncate">📁 {productImageMeta.name}</p>
                        <p className="text-[10px] text-emerald-700 font-medium">⚡ Size: {productImageMeta.size}</p>
                      </div>
                    )}

                    <div className="text-[10px] text-[var(--color-text-secondary)] space-y-0.5 leading-relaxed">
                      <p>• <strong>Max Image Size:</strong> Up to 50 MB per file</p>
                      <p>• <strong>Supported Formats:</strong> JPG, JPEG, PNG, WEBP, AVIF</p>
                      <p>• <strong>Display Output:</strong> 2560px Ultra-HD Retina with zero compression artifacting</p>
                    </div>
                  </div>
                </div>

                {/* Additional Album / Gallery Photos (Multi-file upload up to 50MB each) */}
                <div className="pt-2.5 border-t border-[var(--color-border)]/70">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-[11px] font-semibold text-[var(--color-text)]">
                        {language === 'ar' ? 'صور إضافية لألبوم المعرض (اختياري، حتى 50MB لكل صورة)' : 'Additional Gallery Album Photos (Optional, up to 50MB each)'}
                      </span>
                      <p className="text-[10px] text-[var(--color-text-secondary)]">
                        {language === 'ar' ? 'يمكنك اختيار عدة صور في وقت واحد لمعرض أزياء النوم.' : 'Select multiple photos at once for the full lookbook gallery.'}
                      </p>
                    </div>
                    <label className="cursor-pointer text-[10px] text-[var(--color-accent)] hover:underline flex items-center gap-1 font-semibold bg-[var(--color-card)] px-2.5 py-1 rounded-xs border border-[var(--color-border)]">
                      <Plus className="w-3 h-3" />
                      <span>{language === 'ar' ? 'إضافة صور إضافية' : 'Add Gallery Photos'}</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={handleAddSecondaryImageFile}
                        disabled={isProcessingImage || isSavingProduct}
                      />
                    </label>
                  </div>

                  {productAdditionalImages.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1 pt-1">
                      {productAdditionalImages.map((img, idx) => (
                        <div key={idx} className="relative w-16 h-20 bg-white border border-[var(--color-border)] rounded-xs overflow-hidden shrink-0 group shadow-xs">
                          <img src={img} alt={`Gallery item ${idx + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setProductAdditionalImages((prev) => prev.filter((_, i) => i !== idx))}
                            className="absolute top-0.5 right-0.5 p-0.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                            title="Delete this photo"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* SKU, Product Names in English & Arabic */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--color-text)]">SKU / Item Code *</label>
                  <input
                    name="sku"
                    defaultValue={editingProduct?.sku || `BDS-${Date.now().toString().slice(-6)}`}
                    required
                    className="w-full px-3 py-1.5 border border-[var(--color-border)] rounded-xs bg-white text-xs font-mono font-medium"
                    placeholder="e.g. BDS-SILK-01"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--color-text)]">{t.admin.productNameEn} *</label>
                  <input
                    name="nameEn"
                    defaultValue={editingProduct?.nameEn || ''}
                    required
                    placeholder="e.g. Royal Mulberry Silk Pajama Set"
                    className="w-full px-3 py-1.5 border border-[var(--color-border)] rounded-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--color-text)]">{t.admin.productNameAr} *</label>
                  <input
                    name="nameAr"
                    defaultValue={editingProduct?.nameAr || ''}
                    required
                    placeholder="مثال: طقم بيجاما حرير التوت الملكي"
                    className="w-full px-3 py-1.5 border border-[var(--color-border)] rounded-xs bg-white text-right"
                  />
                </div>
              </div>

              {/* Price, Sale Price, Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--color-text)]">{t.admin.priceBHD} (د.ب) *</label>
                  <input
                    type="number"
                    step="0.001"
                    name="price"
                    defaultValue={editingProduct?.price || 28.000}
                    required
                    className="w-full px-3 py-1.5 border border-[var(--color-border)] rounded-xs bg-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--color-text)]">{t.admin.salePriceBHD} (د.ب)</label>
                  <input
                    type="number"
                    step="0.001"
                    name="salePrice"
                    defaultValue={editingProduct?.salePrice || ''}
                    placeholder="Optional promotional price"
                    className="w-full px-3 py-1.5 border border-[var(--color-border)] rounded-xs bg-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--color-text)]">{t.admin.category} *</label>
                  <select
                    name="categoryId"
                    defaultValue={editingProduct?.categoryId || categories[0]?.id}
                    className="w-full px-3 py-1.5 border border-[var(--color-border)] rounded-xs bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.nameEn} ({c.nameAr})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fabric Materials & Care Instructions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--color-text)]">Fabric & Material (English)</label>
                  <input
                    name="materialEn"
                    defaultValue={editingProduct?.materialEn || '100% Mulberry Silk, Grade 6A (22 Momme)'}
                    className="w-full px-3 py-1.5 border border-[var(--color-border)] rounded-xs bg-white"
                    placeholder="e.g. 100% Grade 6A Mulberry Silk"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--color-text)]">خامة القماش (العربية)</label>
                  <input
                    name="materialAr"
                    defaultValue={editingProduct?.materialAr || 'حرير التوت الطبيعي النقي ١٠٠٪ عيار ٢٢ موميه'}
                    className="w-full px-3 py-1.5 border border-[var(--color-border)] rounded-xs bg-white text-right"
                    placeholder="مثال: حرير طبيعي ١٠٠٪، دانتيل فرنسي"
                  />
                </div>
              </div>

              {/* Care Instructions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--color-text)]">Care Instructions (English)</label>
                  <input
                    name="careInstructionsEn"
                    defaultValue={editingProduct?.careInstructionsEn || 'Gentle hand wash cold or delicate dry clean.'}
                    className="w-full px-3 py-1.5 border border-[var(--color-border)] rounded-xs bg-white"
                    placeholder="e.g. Dry clean or hand wash cold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--color-text)]">تعليمات العناية والغسيل (العربية)</label>
                  <input
                    name="careInstructionsAr"
                    defaultValue={editingProduct?.careInstructionsAr || 'غسيل يدوي بماء بارد أو تنظيف جاف لطيف.'}
                    className="w-full px-3 py-1.5 border border-[var(--color-border)] rounded-xs bg-white text-right"
                    placeholder="مثال: غسيل لطيف بماء بارد"
                  />
                </div>
              </div>

              {/* Descriptions (English & Arabic) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--color-text)]">Product Description (English)</label>
                  <textarea
                    name="descriptionEn"
                    rows={2}
                    defaultValue={editingProduct?.descriptionEn || 'Handcrafted luxury sleepwear tailored with timeless elegance in Bahrain.'}
                    className="w-full px-3 py-1.5 border border-[var(--color-border)] rounded-xs bg-white text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--color-text)]">وصف المنتج (العربية)</label>
                  <textarea
                    name="descriptionAr"
                    rows={2}
                    defaultValue={editingProduct?.descriptionAr || 'ملابس نوم فاخرة مصنوعة يدوياً لأناقة هادئة ومريحة في البحرين.'}
                    className="w-full px-3 py-1.5 border border-[var(--color-border)] rounded-xs bg-white text-xs text-right"
                  />
                </div>
              </div>

              {/* Initial Inventory Stock Breakdown by Size */}
              <div className="bg-[var(--color-bg)] p-3 rounded-xs border border-[var(--color-border)] space-y-2">
                <label className="font-semibold text-[var(--color-text)] block">
                  {language === 'ar' ? 'رصيد المخزون الأولي حسب المقاسات (MySQL Inventory Breakdown)' : 'Initial Inventory Stocks by Size (MySQL Inventory Balance)'}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase">Size Small (S)</span>
                    <input
                      type="number"
                      name="stockS"
                      min={0}
                      defaultValue={editingProduct?.variants?.find((v) => v.size === 'S')?.stock ?? 12}
                      className="w-full px-2 py-1 text-xs border border-[var(--color-border)] rounded-xs bg-white text-center font-mono"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase">Size Medium (M)</span>
                    <input
                      type="number"
                      name="stockM"
                      min={0}
                      defaultValue={editingProduct?.variants?.find((v) => v.size === 'M')?.stock ?? 12}
                      className="w-full px-2 py-1 text-xs border border-[var(--color-border)] rounded-xs bg-white text-center font-mono"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase">Size Large (L)</span>
                    <input
                      type="number"
                      name="stockL"
                      min={0}
                      defaultValue={editingProduct?.variants?.find((v) => v.size === 'L')?.stock ?? 8}
                      className="w-full px-2 py-1 text-xs border border-[var(--color-border)] rounded-xs bg-white text-center font-mono"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase">Size X-Large (XL)</span>
                    <input
                      type="number"
                      name="stockXL"
                      min={0}
                      defaultValue={editingProduct?.variants?.find((v) => v.size === 'XL')?.stock ?? 6}
                      className="w-full px-2 py-1 text-xs border border-[var(--color-border)] rounded-xs bg-white text-center font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Flags & Kids Bracket */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[var(--color-bg)] p-3 rounded-xs border border-[var(--color-border)]">
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--color-text)]">Curated Kids Age Bracket</label>
                  <select
                    name="ageGroup"
                    defaultValue={editingProduct?.ageGroup || 'none'}
                    className="w-full px-3 py-1.5 border border-[var(--color-border)] rounded-xs bg-white"
                  >
                    <option value="none">None (Adult / All Ages)</option>
                    <option value="3-5">Ages 3 to 5 (٣ - ٥ سنوات)</option>
                    <option value="5-7">Ages 5 to 7 (٥ - ٧ سنوات)</option>
                    <option value="8-9">Ages 8 to 9 (٨ - ٩ سنوات)</option>
                    <option value="10-12">Ages 10 to 12 (١٠ - ١٢ سنة)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <label className="flex items-center gap-1.5 text-xs text-[var(--color-text)] cursor-pointer">
                    <input
                      type="checkbox"
                      name="featured"
                      defaultChecked={editingProduct?.featured ?? true}
                      className="rounded border-[var(--color-border)] text-[var(--color-primary)]"
                    />
                    <span>Featured</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-[var(--color-text)] cursor-pointer">
                    <input
                      type="checkbox"
                      name="bestSeller"
                      defaultChecked={editingProduct?.bestSeller ?? false}
                      className="rounded border-[var(--color-border)] text-[var(--color-primary)]"
                    />
                    <span>Best Seller</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-[var(--color-text)] cursor-pointer">
                    <input
                      type="checkbox"
                      name="newArrival"
                      defaultChecked={editingProduct?.newArrival ?? true}
                      className="rounded border-[var(--color-border)] text-[var(--color-primary)]"
                    />
                    <span>New Arrival</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-[var(--color-text)] cursor-pointer">
                    <input
                      type="checkbox"
                      name="active"
                      defaultChecked={editingProduct?.active !== false}
                      className="rounded border-[var(--color-border)] text-[var(--color-primary)]"
                    />
                    <span>Active in Store</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-[var(--color-text)] cursor-pointer col-span-2">
                    <input
                      type="checkbox"
                      id="isKidsProductCheck"
                      name="isKids"
                      defaultChecked={editingProduct?.isKids || editingProduct?.categoryId === 'cat-kids-sleepwear'}
                      className="rounded border-[var(--color-border)] text-[var(--color-primary)]"
                    />
                    <span>Mark as Curated Kids Product</span>
                  </label>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end items-center gap-2 pt-4 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct(null);
                    setIsCreatingProduct(false);
                    setProductFeedback(null);
                    setProductUploadError(null);
                  }}
                  className="px-4 py-2 border border-[var(--color-border)] rounded-xs text-[var(--color-text)] hover:bg-[var(--color-bg)] transition-colors cursor-pointer"
                  disabled={isSavingProduct}
                >
                  {t.admin.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSavingProduct || isProcessingImage}
                  className="px-6 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {isSavingProduct ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{language === 'ar' ? 'جاري الحفظ في MySQL...' : 'Uploading to MySQL Database...'}</span>
                    </>
                  ) : (
                    <>
                      <Database className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                      <span>{editingProduct ? (language === 'ar' ? 'تحديث وحفظ في قاعدة البيانات' : 'Update in MySQL Database') : (language === 'ar' ? 'رفع ونشر في قاعدة البيانات' : 'Upload to MySQL Database')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Inspection & Verification Terminal Modal */}
      {qrInspectOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-[var(--color-text)]/60 backdrop-blur-xs">
          <div className="bg-[var(--color-card)] rounded-sm max-w-md w-full p-6 sm:p-8 space-y-5 border border-[var(--color-accent)] shadow-xl text-center">
            <div className="flex justify-between items-center border-b border-[var(--color-border)] pb-3 text-left rtl:text-right">
              <div>
                <span className="text-[10px] text-[var(--color-accent)] uppercase font-mono block">Order Verification Terminal</span>
                <h3 className="font-heading text-xl font-bold text-[var(--color-text)]">{qrInspectOrder.orderNumber}</h3>
              </div>
              <button
                type="button"
                onClick={() => setQrInspectOrder(null)}
                className="text-gray-400 hover:text-[var(--color-text)] p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1 text-xs text-[var(--color-text)]/80 text-left rtl:text-right bg-[var(--color-bg)]/30 p-3 rounded-xs border border-[var(--color-border)]">
              <p><strong>Customer:</strong> {qrInspectOrder.customerName} ({qrInspectOrder.customerPhone})</p>
              <p><strong>Address:</strong> {qrInspectOrder.shippingAddress.buildingNumber}, {qrInspectOrder.shippingAddress.roadNumber}, {qrInspectOrder.shippingAddress.area}</p>
              <p><strong>Amount to Collect:</strong> <span className="text-[var(--color-primary)] font-bold">{formatBHD(qrInspectOrder.total)}</span></p>
            </div>

            {/* Generated QR Code */}
            <div className="py-2 flex flex-col items-center">
              <DeliveryQrCode
                orderNumber={qrInspectOrder.orderNumber}
                verificationCode={qrInspectOrder.deliveryVerificationCode || '000000'}
                amount={qrInspectOrder.total}
                size={180}
                showDownload={true}
              />
            </div>

            {/* Verification PIN */}
            <div className="bg-[var(--color-bg)]/60 p-3 rounded-xs border border-[var(--color-accent)]">
              <span className="text-[10px] uppercase font-mono text-[var(--color-accent)] block">Handover Verification PIN</span>
              <span className="font-mono text-3xl font-extrabold text-[var(--color-text)] tracking-widest">
                {qrInspectOrder.deliveryVerificationCode}
              </span>
            </div>

            {/* Print Slip Action */}
            <button
              type="button"
              onClick={() => window.print()}
              className="w-full py-2 bg-[var(--color-bg)] hover:bg-[var(--color-border)] text-[var(--color-text)] text-xs font-semibold rounded-xs border border-[var(--color-accent)]/40 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              <span>Print Delivery Verification Slip</span>
            </button>

            {/* Confirm Payment Action Button */}
            {qrInspectOrder.paymentStatus !== 'Paid' ? (
              <button
                type="button"
                onClick={async () => {
                  const res = await confirmDeliveryPayment(qrInspectOrder.id, qrInspectOrder.deliveryVerificationCode, currentUser?.email || 'Admin');
                  if (res.success) {
                    setVerificationFeedback({ text: res.message, success: true });
                    setQrInspectOrder(null);
                  }
                }}
                className="w-full py-3 bg-[var(--color-accent)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold uppercase tracking-wider rounded-xs shadow-md transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Simulate QR Scan & Confirm Payment Received</span>
              </button>
            ) : (
              <div className="p-2.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xs flex items-center justify-center gap-1.5">
                <Check className="w-4 h-4" />
                <span>Payment Already Verified & Collected</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setQrInspectOrder(null)}
              className="w-full text-center text-xs text-[var(--color-text)]/60 hover:text-[var(--color-text)]"
            >
              Close Terminal
            </button>
          </div>
        </div>
      )}

      {/* Optical QR Code Scanner Terminal Modal */}
      {isQrScannerModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-[var(--color-text)]/80 backdrop-blur-xs">
          <div className="bg-[var(--color-card)] rounded-sm max-w-lg w-full p-6 sm:p-8 space-y-5 border-2 border-[var(--color-accent)] shadow-2xl">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-[var(--color-border)] pb-3 text-left rtl:text-right">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-[var(--color-bg)] rounded-xs text-[var(--color-accent)]">
                    <Camera className="w-4 h-4" />
                  </span>
                  <h3 className="font-heading text-xl font-bold text-[var(--color-text)]">
                    {language === 'ar' ? 'ماسح رمز QR للتحقق عند الاستلام' : 'Optical QR Scanner Terminal'}
                  </h3>
                </div>
                <p className="text-xs text-[var(--color-text)]/70 mt-1">
                  {language === 'ar' ? 'وجهي الكاميرا أو قارئ الباركود نحو رمز الاستجابة السريعة (QR) الخاص بالطلب' : 'Simulated live optical scanner to verify customer delivery QR codes on arrival'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsQrScannerModalOpen(false)}
                className="text-gray-400 hover:text-[var(--color-text)] p-1 text-base font-bold"
              >
                ✕
              </button>
            </div>

            {/* Simulated Camera Viewfinder */}
            <div className="relative aspect-[16/10] bg-[var(--color-text)] rounded-xs overflow-hidden flex flex-col items-center justify-center border-2 border-[var(--color-accent)]/60 shadow-inner">
              {/* Corner Reticle Brackets */}
              <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-[var(--color-primary)]" />
              <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-[var(--color-primary)]" />
              <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-[var(--color-primary)]" />
              <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-[var(--color-primary)]" />

              {/* Scanning Laser Beam */}
              <div className="absolute left-6 right-6 h-0.5 bg-[var(--color-primary)] shadow-[0_0_12px_var(--color-primary)] animate-pulse" />

              {/* Optical Lens Center Target */}
              <div className="w-28 h-28 border border-white/20 rounded-xs flex items-center justify-center">
                <ScanLine className={`w-12 h-12 ${isSimulatingScan ? 'text-[var(--color-primary)] animate-ping' : 'text-white/60 animate-pulse'}`} />
              </div>

              {/* Viewfinder Status Overlay */}
              <div className="absolute bottom-3 left-0 right-0 text-center px-4">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--color-text)]/70 backdrop-blur-xs rounded-full text-[10px] font-mono text-emerald-400 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  {isSimulatingScan 
                    ? (language === 'ar' ? 'جاري فك تشفير البيانات...' : 'DECODING QR PAYLOAD...') 
                    : (language === 'ar' ? 'العدسة البصرية نشطة · بانتظار مسح الرمز' : 'OPTICAL SENSOR READY · 24 FPS')}
                </span>
              </div>
            </div>

            {/* One-Tap Simulation Picker for Pending POD Orders */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--color-text)] block uppercase tracking-wider">
                {language === 'ar' ? 'الطلبات بانتظار المسح (اضغطي لتأكيد المسح الفوري):' : 'Pending Deliveries in Queue (Tap to Scan):'}
              </label>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {orders.filter((o) => o.paymentMethod === 'pay_on_delivery' && o.paymentStatus === 'Pending').length === 0 ? (
                  <p className="text-xs text-emerald-700 bg-emerald-50 p-3 rounded-xs border border-emerald-200 font-semibold text-center">
                    ✓ {language === 'ar' ? 'جميع طلبات الدفع عند الاستلام مدفوعة ومؤكدة بالكامل!' : 'All Pay on Delivery orders have been verified & collected!'}
                  </p>
                ) : (
                  orders
                    .filter((o) => o.paymentMethod === 'pay_on_delivery' && o.paymentStatus === 'Pending')
                    .map((ord) => (
                      <div
                        key={ord.id}
                        className="p-3 bg-[var(--color-bg)]/40 hover:bg-[var(--color-bg)] rounded-xs border border-[var(--color-accent)]/40 flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[var(--color-text)]">{ord.orderNumber}</span>
                            <span className="text-[10px] bg-white text-[var(--color-accent)] font-mono font-bold px-1.5 py-0.2 rounded-xs border border-[var(--color-accent)]/40">
                              PIN: {ord.deliveryVerificationCode}
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--color-text)]/70">
                            {ord.customerName} · <strong className="text-[var(--color-primary)]">{formatBHD(ord.total)}</strong>
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={isSimulatingScan}
                          onClick={() => handleScanQrPayload(`BDS-VERIFY:${ord.orderNumber}:${ord.deliveryVerificationCode}:${ord.total.toFixed(3)}:BHD`)}
                          className="px-3 py-1.5 bg-[var(--color-accent)] hover:bg-[var(--color-primary-hover)] text-white text-[11px] font-semibold uppercase tracking-wider rounded-xs flex items-center gap-1 shadow-xs transition-colors disabled:opacity-50"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>{language === 'ar' ? 'مسح الرمز' : 'Scan QR'}</span>
                        </button>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Manual QR Payload / Barcode Gun Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleScanQrPayload(scannedRawPayload);
              }}
              className="pt-2 border-t border-[var(--color-border)] space-y-2"
            >
              <label className="text-xs font-semibold text-[var(--color-text)] block">
                {language === 'ar' ? 'أو أدخلي كود المسح أو الرمز المكون من ٦ أرقام يدوياً:' : 'Or Input Barcode Scanner Stream / 6-Digit PIN:'}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={scannedRawPayload}
                  onChange={(e) => setScannedRawPayload(e.target.value)}
                  placeholder="e.g. 481923 or BDS-VERIFY:BDS-2026-7740..."
                  className="flex-1 px-3 py-2 bg-white border border-[var(--color-border)] rounded-xs text-xs font-mono text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                />
                <button
                  type="submit"
                  disabled={!scannedRawPayload.trim() || isSimulatingScan}
                  className="px-4 py-2 bg-[var(--color-text)] hover:bg-[var(--color-primary-hover)] text-[var(--color-bg)] text-xs font-semibold uppercase tracking-wider rounded-xs transition-colors disabled:opacity-50"
                >
                  {language === 'ar' ? 'تحقق' : 'Decode'}
                </button>
              </div>
            </form>

            <button
              type="button"
              onClick={() => setIsQrScannerModalOpen(false)}
              className="w-full text-center text-xs text-[var(--color-text)]/60 hover:text-[var(--color-text)]"
            >
              {language === 'ar' ? 'إغلاق الماسح' : 'Close Scanner'}
            </button>
          </div>
        </div>
      )}

      {/* Official Receipt Dispatch Modal for Admin */}
      {selectedAdminReceiptOrder && (
        <ReceiptModal
          order={selectedAdminReceiptOrder}
          isOpen={Boolean(selectedAdminReceiptOrder)}
          onClose={() => setSelectedAdminReceiptOrder(null)}
        />
      )}

      {/* Category Edit / Create Modal */}
      {(editingCategory || isCreatingCategory) && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-[var(--color-text)]/60 backdrop-blur-xs">
          <div className="bg-[var(--color-card)] rounded-sm max-w-2xl w-full p-6 sm:p-8 space-y-5 border border-[var(--color-border)] shadow-2xl">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-[var(--color-bg)] rounded-xs text-[var(--color-accent)]">
                  <Layers className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-heading text-xl font-bold text-[var(--color-text)]">
                    {editingCategory
                      ? (language === 'ar' ? 'تعديل قسم المتجر' : 'Edit Boutique Category')
                      : (language === 'ar' ? 'إضافة قسم جديد لملابس النوم' : 'Add New Boutique Category')}
                  </h3>
                  <p className="text-[11px] text-[var(--color-accent)] font-medium">
                    {language === 'ar'
                      ? 'سيتم حفظ وتحديث القسم تلقائياً في قاعدة بيانات MySQL'
                      : 'Changes will be automatically synced with MySQL database'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingCategory(null);
                  setIsCreatingCategory(false);
                }}
                className="text-gray-400 hover:text-[var(--color-text)] cursor-pointer text-lg p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
              
              {/* Bilingual Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--color-text)] block">
                    {language === 'ar' ? 'اسم القسم (بالإنجليزية) *' : 'Category Name (English) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={categoryForm.nameEn}
                    onChange={(e) => {
                      const name = e.target.value;
                      setCategoryForm((prev) => ({
                        ...prev,
                        nameEn: name,
                        slug: isCreatingCategory && (!prev.slug || prev.slug === prev.nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''))
                          ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
                          : prev.slug,
                      }));
                    }}
                    placeholder="e.g. Silk Pajama Sets"
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xs bg-[var(--color-bg)]/20 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[var(--color-text)] block">
                    {language === 'ar' ? 'اسم القسم (بالعربية) *' : 'Category Name (Arabic) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={categoryForm.nameAr}
                    onChange={(e) => setCategoryForm({ ...categoryForm, nameAr: e.target.value })}
                    placeholder="مثال: أطقم بيجامات الحرير"
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xs bg-[var(--color-bg)]/20 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] font-medium"
                  />
                </div>
              </div>

              {/* URL Slug & Display Order */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-semibold text-[var(--color-text)] block">
                    {language === 'ar' ? 'الاسم اللطيف للرابط (Slug) *' : 'URL Identifier / Slug *'}
                  </label>
                  <div className="flex items-center">
                    <span className="px-2.5 py-2 bg-gray-100 border border-r-0 border-[var(--color-border)] rounded-l-xs text-[11px] font-mono text-gray-500">
                      /category/
                    </span>
                    <input
                      type="text"
                      required
                      value={categoryForm.slug}
                      onChange={(e) =>
                        setCategoryForm({
                          ...categoryForm,
                          slug: e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, '-')
                            .replace(/--+/g, '-'),
                        })
                      }
                      placeholder="silk-pajama-sets"
                      className="flex-1 px-3 py-2 border border-[var(--color-border)] rounded-r-xs font-mono text-xs text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[var(--color-text)] block">
                    {language === 'ar' ? 'ترتيب العرض' : 'Display Order'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={categoryForm.displayOrder}
                    onChange={(e) => setCategoryForm({ ...categoryForm, displayOrder: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xs text-center font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="bg-[var(--color-bg)]/30 p-3 rounded-xs border border-[var(--color-border)] flex items-center justify-between">
                <div>
                  <span className="font-semibold text-[var(--color-text)] block">
                    {language === 'ar' ? 'تفعيل العرض في المتجر' : 'Active in Boutique Storefront'}
                  </span>
                  <span className="text-[11px] text-[var(--color-text)]/70">
                    {language === 'ar'
                      ? 'عند التفعيل، سيظهر هذا القسم في شريط التصفح والصفحة الرئيسية'
                      : 'Show in header navigation, filters, and homepage collections'}
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={categoryForm.active}
                    onChange={(e) => setCategoryForm({ ...categoryForm, active: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Bilingual Descriptions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--color-text)] block">
                    {language === 'ar' ? 'الوصف (بالإنجليزية)' : 'Description (English)'}
                  </label>
                  <textarea
                    rows={2}
                    value={categoryForm.descriptionEn}
                    onChange={(e) => setCategoryForm({ ...categoryForm, descriptionEn: e.target.value })}
                    placeholder="Handcrafted silk pajamas tailored for timeless elegance..."
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xs focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[var(--color-text)] block">
                    {language === 'ar' ? 'الوصف (بالعربية)' : 'Description (Arabic)'}
                  </label>
                  <textarea
                    rows={2}
                    value={categoryForm.descriptionAr}
                    onChange={(e) => setCategoryForm({ ...categoryForm, descriptionAr: e.target.value })}
                    placeholder="أطقم بيجامات من حرير التوت الطبيعي مصممة لنعومة وراحة تدوم..."
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xs focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                  />
                </div>
              </div>

              {/* Category Image Setup */}
              <div className="pt-2 border-t border-[var(--color-border)] space-y-3">
                <div className="flex justify-between items-center">
                  <label className="font-semibold text-[var(--color-text)] block uppercase tracking-wider text-[11px]">
                    {language === 'ar' ? 'صورة الغلاف للقسم (Category Banner Image)' : 'Category Banner Image'}
                  </label>
                  <span className="text-[10px] text-[var(--color-accent)] font-medium">
                    {language === 'ar' ? 'نسبة العرض ١٦:٩ موصى بها' : '16:9 Aspect Ratio Recommended'}
                  </span>
                </div>

                {/* Live Preview */}
                <div className="relative aspect-[16/9] w-full rounded-xs overflow-hidden bg-gray-100 border border-[var(--color-accent)]/40 shadow-xs">
                  <img
                    src={categoryImageUpload || categoryForm.image || ROSE_SATIN_IMAGE}
                    alt="Category Banner Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = ROSE_SATIN_IMAGE;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <span className="text-[10px] font-medium text-[var(--color-bg)]">
                      {categoryForm.nameAr || 'اسم القسم بالعربية'}
                    </span>
                    <h5 className="font-heading text-base font-bold text-white leading-tight">
                      {categoryForm.nameEn || 'Category Name English'}
                    </h5>
                  </div>
                </div>

                {/* Upload or URL Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-4">
                    <label className="w-full py-2 px-3 bg-[var(--color-text)] hover:bg-[var(--color-primary-hover)] text-[var(--color-bg)] text-xs font-semibold uppercase tracking-wider rounded-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs">
                      <Upload className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                      <span>{language === 'ar' ? 'رفع صورة من جهازك' : 'Upload Image'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleCategoryImageFile}
                      />
                    </label>
                  </div>

                  <div className="sm:col-span-8">
                    <input
                      type="text"
                      value={categoryForm.image}
                      onChange={(e) => {
                        const url = e.target.value;
                        setCategoryForm({ ...categoryForm, image: url });
                        setCategoryImageUpload(url);
                      }}
                      placeholder="Or enter image URL: https://... or /src/assets/..."
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xs text-xs font-mono text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[var(--color-border)] flex justify-end items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingCategory(null);
                    setIsCreatingCategory(false);
                  }}
                  className="px-4 py-2 border border-[var(--color-border)] text-[var(--color-text)] hover:bg-gray-100 rounded-xs font-medium cursor-pointer"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSavingCategory}
                  className="px-6 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold uppercase tracking-wider rounded-xs flex items-center gap-2 shadow-xs cursor-pointer transition-colors disabled:opacity-50"
                >
                  {isSavingCategory ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{language === 'ar' ? 'جاري الحفظ في MySQL...' : 'Saving to MySQL Database...'}</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>
                        {editingCategory
                          ? (language === 'ar' ? 'تحديث القسم' : 'Save Changes')
                          : (language === 'ar' ? 'حفظ القسم الجديد' : 'Save Category')}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Category Confirmation Dialog */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-[var(--color-text)]/70 backdrop-blur-xs">
          <div className="bg-[var(--color-card)] rounded-sm max-w-md w-full p-6 space-y-4 border border-red-200 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600 border-b border-red-100 pb-3">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-heading text-lg font-bold text-[var(--color-text)]">
                {language === 'ar' ? 'تأكيد حذف القسم؟' : 'Delete Category from Database?'}
              </h3>
            </div>

            <div className="space-y-3 text-xs text-[var(--color-text)]/80">
              <p>
                {language === 'ar'
                  ? `هل أنتِ متأكدة من رغبتك في حذف قسم "${categoryToDelete.nameAr || categoryToDelete.nameEn}" نهائياً من قاعدة بيانات MySQL؟`
                  : `Are you sure you want to permanently delete "${categoryToDelete.nameEn}" from MySQL database?`}
              </p>

              {(() => {
                const linkedCount = products.filter(
                  (p) => p.categoryId === categoryToDelete.id || p.categoryId === categoryToDelete.slug
                ).length;
                if (linkedCount > 0) {
                  return (
                    <div className="p-3 bg-amber-50 border border-amber-300 rounded-xs text-amber-900 font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        {language === 'ar'
                          ? `تنبيه: يوجد ${linkedCount} منتج مرتبط بهذا القسم حالياً. يُنصح بتغيير تصنيفها أولاً.`
                          : `Warning: ${linkedCount} products are currently assigned to this category.`}
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            <div className="flex justify-end items-center gap-2 pt-2 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2 border border-[var(--color-border)] text-[var(--color-text)] hover:bg-gray-100 rounded-xs font-medium cursor-pointer text-xs"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCategory}
                className="px-4 py-2 bg-[var(--color-primary)] hover:bg-red-700 text-white rounded-xs font-semibold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'تأكيد الحذف نهائياً' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STRICT ACCESS: Create Admin Modal - ONLY accessible in the Admin Dashboard */}
      {isCreateAdminModalOpen && (
        <CreateAdminModal
          isOpen={isCreateAdminModalOpen}
          onClose={() => setIsCreateAdminModalOpen(false)}
          onAdminCreated={(newAdmin) => {
            setAdminList((prev) => [newAdmin, ...prev.filter((a) => a.id !== newAdmin.id)]);
            fetchAdmins();
          }}
        />
      )}

    </div>
  );
};
