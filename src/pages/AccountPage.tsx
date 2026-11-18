import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { ProductCard } from '../components/ProductCard';
import { Product, BahrainAddress, Order } from '../types';
import { DeliveryQrCode } from '../components/DeliveryQrCode';
import { AuthModal } from '../components/AuthModal';
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter';
import { TwoFactorModal } from '../components/TwoFactorModal';
import { OAuthDialogModal } from '../components/OAuthDialogModal';
import { ReceiptModal } from '../components/ReceiptModal';
import { 
  User, 
  MapPin, 
  Package, 
  Heart, 
  LogOut, 
  Plus, 
  ShieldCheck,
  CheckCircle2,
  Lock,
  Truck,
  Eye,
  EyeOff,
  AlertCircle,
  Smartphone,
  KeyRound,
  History,
  Check,
  FileText,
  Mail
} from 'lucide-react';

interface AccountPageProps {
  initialTab?: 'profile' | 'orders' | 'addresses' | 'wishlist' | 'security';
  onQuickView: (p: Product) => void;
  onSelectProduct: (p: Product) => void;
}

export const AccountPage: React.FC<AccountPageProps> = ({
  initialTab = 'orders',
  onQuickView,
  onSelectProduct,
}) => {
  const {
    currentUser,
    logout,
    addAddress,
    changePassword,
    toggleTwoFactor,
    unlinkOAuthProvider,
  } = useAuth();
  const { orders, products } = useStore();
  const { language, formatBHD, t } = useLanguage();
  const isAr = language === 'ar';

  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'addresses' | 'wishlist' | 'security'>(
    initialTab === 'profile' ? 'orders' : initialTab
  );

  // Add Address Form State
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [newBuilding, setNewBuilding] = useState('');
  const [newRoad, setNewRoad] = useState('');
  const [newBlock, setNewBlock] = useState('');
  const [newArea, setNewArea] = useState('');
  const [newCity, setNewCity] = useState('Manama');

  // Change Password Form State
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passwordChangeStatus, setPasswordChangeStatus] = useState<{ success?: string; error?: string }>({});
  const [isChangingPass, setIsChangingPass] = useState(false);

  // 2FA Modal
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);

  // OAuth Dialog Modal
  const [activeOAuthProvider, setActiveOAuthProvider] = useState<'google' | null>(null);

  // Selected Order for Detail Modal
  const [inspectOrder, setInspectOrder] = useState<Order | null>(null);

  // Selected Order for Receipt Modal
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<Order | null>(null);

  const handleAddAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBuilding || !newRoad || !newBlock || !newArea) return;
    addAddress({
      buildingNumber: newBuilding,
      roadNumber: newRoad,
      blockNumber: newBlock,
      area: newArea,
      city: newCity,
      country: 'Bahrain',
    });
    setIsAddingAddress(false);
    setNewBuilding('');
    setNewRoad('');
    setNewBlock('');
    setNewArea('');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeStatus({});

    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordChangeStatus({
        error: isAr ? 'كلمة المرور الجديدة وتأكيدها غير متطابقتين.' : 'New password and confirmation do not match.',
      });
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await changePassword(currentPasswordInput, newPasswordInput);
      if (res.success) {
        setPasswordChangeStatus({
          success: isAr ? 'تم تحديث كلمة المرور وتشفيرها بنجاح!' : 'Password updated and cryptographically hashed successfully!',
        });
        setCurrentPasswordInput('');
        setNewPasswordInput('');
        setConfirmPasswordInput('');
      } else {
        setPasswordChangeStatus({
          error: res.error || (isAr ? 'فشل تغيير كلمة المرور.' : 'Password change failed.'),
        });
      }
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleToggle2FA = async () => {
    if (currentUser?.twoFactorEnabled) {
      await toggleTwoFactor(false);
    } else {
      setIs2FAModalOpen(true);
    }
  };

  // If user is not logged in or is guest, show complete embedded auth system
  if (!currentUser || currentUser.isGuest) {
    return (
      <div className="bg-[var(--surface-page)] min-h-screen py-10 px-4">
        <div className="max-w-md mx-auto">
          <AuthModal
            embedded={true}
            defaultMode="signin"
          />
        </div>
      </div>
    );
  }

  // Wishlisted products
  const wishlistProducts = products.filter((p) => currentUser.wishlist.includes(p.id));

  // User's orders
  const userOrders = orders.filter((o) => o.customerEmail === currentUser.email || o.userId === currentUser.id);

  // Security logs
  const securityLogs = currentUser.securityLogs || [
    {
      id: 'log-def-1',
      timestamp: new Date().toISOString(),
      action: 'login_success' as const,
      ip: '82.194.22.10',
      location: 'Manama, Bahrain',
      device: 'Desktop Browser',
    },
  ];

  return (
    <div className="bg-[var(--surface-page)] min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* User Header Profile Card */}
        <div className="bg-[var(--surface-card)] p-6 sm:p-8 rounded-[var(--radius-card)] border border-[var(--line)] shadow-[var(--shadow-soft)] mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            {currentUser.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.firstName}
                className="w-16 h-16 rounded-full object-cover border-2 border-[var(--gold-decor)] shadow-xs shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[var(--maroon-700)] text-[var(--text-on-maroon)] flex items-center justify-center font-heading text-2xl font-bold shrink-0 border-2 border-[var(--gold-decor)]">
                {currentUser.firstName.charAt(0)}
              </div>
            )}

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-[var(--gold-text)] gold-text-rtl-weight">
                  {isAr ? 'عضوية ذا بدتايم ستور' : 'Boutique Client Profile'}
                </span>
              </div>

              <h1 className="font-heading text-2xl sm:text-3xl font-semibold text-[var(--maroon-700)]">
                {t.account.welcome}, {currentUser.firstName} {currentUser.lastName}
              </h1>
              <p className="text-xs text-[var(--text-muted)]">
                {currentUser.email} · {currentUser.phone}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={logout}
              className="px-4 py-2 bg-[var(--surface-card)] border border-[var(--line)] hover:border-[var(--red-600)] text-[var(--red-600)] hover:bg-[var(--surface-blush)] text-xs font-semibold uppercase tracking-wider rounded-[var(--radius-pill)] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t.account.logout}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[var(--line)] mb-8 overflow-x-auto gap-2">
          {[
            { id: 'orders', label: t.account.orders, icon: Package, count: userOrders.length },
            { id: 'wishlist', label: t.account.wishlist, icon: Heart, count: wishlistProducts.length },
            { id: 'addresses', label: t.account.savedAddresses, icon: MapPin, count: currentUser.savedAddresses.length },
            { id: 'security', label: t.account.security, icon: ShieldCheck, badge: currentUser.twoFactorEnabled ? '2FA' : undefined },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-5 text-xs font-semibold uppercase tracking-wider rounded-t-xs transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--surface-card)] text-[var(--maroon-700)] border-t-2 border-[var(--maroon-700)] shadow-xs font-bold'
                    : 'bg-[var(--surface-champagne)] text-[var(--text-body)] hover:bg-[var(--surface-card)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className="px-1.5 py-0.2 bg-[var(--surface-page)] text-[var(--maroon-700)] border border-[var(--line)] rounded-full text-[10px] tabular-nums">
                    {tab.count}
                  </span>
                )}
                {tab.badge && (
                  <span className="px-1.5 py-0.2 bg-[var(--status-success-bg)] text-[var(--status-success)] border border-[var(--status-success-border)] rounded-full text-[10px] font-bold">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div>
          {/* 1. Orders Tab */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              {userOrders.length === 0 ? (
                <div className="bg-[var(--surface-card)] p-12 text-center rounded-[var(--radius-card)] border border-[var(--line)] space-y-2">
                  <p className="text-sm font-semibold text-[var(--text-strong)]">{t.account.noOrders}</p>
                </div>
              ) : (
                userOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="bg-[var(--surface-card)] p-6 rounded-[var(--radius-card)] border border-[var(--line)] shadow-xs space-y-4"
                  >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-mono font-bold text-sm text-[var(--text-strong)]">{ord.orderNumber}</span>
                          <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-[var(--radius-pill)] border ${
                            ord.orderStatus === 'Delivered'
                              ? 'bg-[var(--status-success-bg)] text-[var(--status-success)] border-[var(--status-success-border)]'
                              : ord.orderStatus === 'Cancelled'
                              ? 'bg-[var(--surface-blush)] text-[var(--red-600)] border-[var(--red-600)]'
                              : 'bg-[var(--surface-champagne)] text-[var(--maroon-700)] border-[var(--gold-decor)]'
                          }`}>
                            {ord.orderStatus}
                          </span>
                          {ord.paymentMethod === 'pay_on_delivery' && ord.deliveryVerificationCode && (
                            <span className="bg-[var(--surface-champagne)] text-[var(--maroon-700)] border border-[var(--gold-decor)] font-mono text-[10px] px-2 py-0.5 rounded-[var(--radius-pill)] font-semibold">
                              PIN: {ord.deliveryVerificationCode}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--text-muted)]">
                          {new Date(ord.createdAt).toLocaleDateString()} · {ord.paymentMethod.replace('_', ' ').toUpperCase()}
                        </p>
                        <p className="text-xs text-[var(--text-body)]">
                          {ord.shippingAddress.buildingNumber}, {ord.shippingAddress.roadNumber}, {ord.shippingAddress.area}, Bahrain
                        </p>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 self-end md:self-auto flex-wrap sm:flex-nowrap">
                        <span className="font-bold text-base text-[var(--maroon-700)] tabular-nums mr-2 rtl:mr-0 rtl:ml-2">
                          {formatBHD(ord.total)}
                        </span>
                        <button
                          onClick={() => setSelectedReceiptOrder(ord)}
                          className="px-3.5 py-2 bg-[var(--surface-card)] border border-[var(--line)] hover:border-[var(--maroon-700)] text-[var(--maroon-700)] text-xs font-semibold uppercase tracking-wider rounded-[var(--radius-pill)] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                          title="View & Send Purchase Receipt"
                        >
                          <FileText className="w-3.5 h-3.5 text-[var(--gold-text)]" />
                          <span>{isAr ? 'الإيصال' : 'Receipt'}</span>
                        </button>
                        <button
                          onClick={() => setInspectOrder(ord)}
                          className="px-4 py-2 bg-[var(--maroon-700)] hover:bg-[var(--maroon-600)] text-[var(--text-on-maroon)] text-xs font-semibold uppercase tracking-wider rounded-[var(--radius-pill)] transition-colors cursor-pointer"
                        >
                          {isAr ? 'تتبع وتفاصيل' : 'Track Order'}
                        </button>
                      </div>
                    </div>

                    {/* Product Identification Thumbnail Strip */}
                    {ord.items && ord.items.length > 0 && (
                      <div className="pt-3 border-t border-[var(--line)]">
                        <span className="text-[10px] uppercase font-semibold text-[var(--gold-text)] gold-text-rtl-weight tracking-wider block mb-2">
                          {isAr ? 'القطع المشمولة في هذا الطلب (انقري للتعرف على المنتج):' : 'Identified Items in this Order (Click to View):'}
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {ord.items.map((item, idx) => {
                            const matchedProd = products.find((p) => p.id === item.productId);
                            const imgUrl = (item.image && item.image.trim() !== '') 
                              ? item.image 
                              : ((matchedProd?.images?.[0] && matchedProd.images[0].trim() !== '') ? matchedProd.images[0] : '/images/hero_pic.jpeg');

                            return (
                              <div
                                key={idx}
                                onClick={() => {
                                  if (matchedProd) onSelectProduct(matchedProd);
                                }}
                                className="flex items-center gap-3 p-2 bg-[var(--surface-page)] hover:bg-[var(--surface-champagne)] border border-[var(--line)] rounded-xs transition-colors cursor-pointer group"
                                title={isAr ? 'انقري لعرض تفاصيل القطعة' : 'Click to view product details'}
                              >
                                <div className="w-12 h-14 bg-[var(--surface-card)] rounded-xs overflow-hidden border border-[var(--gold-decor)] shrink-0 relative shadow-2xs">
                                  <img
                                    src={imgUrl}
                                    alt={isAr ? item.nameAr : item.nameEn}
                                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform"
                                  />
                                  {item.quantity > 1 && (
                                    <span className="absolute bottom-0 right-0 bg-[var(--maroon-900)] text-[var(--text-on-maroon)] text-[9px] font-mono px-1 rounded-tl-xs">
                                      x{item.quantity}
                                    </span>
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-xs text-[var(--text-strong)] truncate group-hover:text-[var(--maroon-700)] transition-colors">
                                    {isAr ? item.nameAr : item.nameEn}
                                  </p>
                                  <p className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">
                                    {item.size} · {item.color}
                                  </p>
                                  <p className="text-[11px] font-bold text-[var(--maroon-700)] mt-0.5 tabular-nums">
                                    {formatBHD(item.totalPrice || item.unitPrice * item.quantity)}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* 2. Wishlist Tab */}
          {activeTab === 'wishlist' && (
            <div>
              {wishlistProducts.length === 0 ? (
                <div className="bg-[var(--surface-card)] p-12 text-center rounded-[var(--radius-card)] border border-[var(--line)] space-y-2">
                  <p className="text-sm font-semibold text-[var(--text-strong)]">{t.account.noWishlist}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                  {wishlistProducts.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      onQuickView={onQuickView}
                      onSelectProduct={onSelectProduct}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. Addresses Tab */}
          {activeTab === 'addresses' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-heading text-lg font-semibold text-[var(--maroon-700)]">
                  {isAr ? 'عناوين التوصيل في مملكة البحرين' : 'Bahrain Delivery Addresses'}
                </h3>
                <button
                  onClick={() => setIsAddingAddress(!isAddingAddress)}
                  className="px-4 py-2 bg-[var(--maroon-700)] hover:bg-[var(--maroon-600)] text-[var(--text-on-maroon)] text-xs font-semibold uppercase tracking-wider rounded-[var(--radius-pill)] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isAr ? 'إضافة عنوان جديد' : 'Add New Address'}</span>
                </button>
              </div>

              {/* Add Address Form */}
              {isAddingAddress && (
                <form onSubmit={handleAddAddress} className="bg-[var(--surface-card)] p-6 rounded-[var(--radius-card)] border border-[var(--line)] space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <label className="font-semibold text-[var(--text-strong)]">{t.checkout.building} *</label>
                      <input
                        type="text"
                        required
                        value={newBuilding}
                        onChange={(e) => setNewBuilding(e.target.value)}
                        className="token-input w-full px-3 py-2 border rounded-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-[var(--text-strong)]">{t.checkout.road} *</label>
                      <input
                        type="text"
                        required
                        value={newRoad}
                        onChange={(e) => setNewRoad(e.target.value)}
                        className="token-input w-full px-3 py-2 border rounded-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-[var(--text-strong)]">{t.checkout.block} *</label>
                      <input
                        type="text"
                        required
                        value={newBlock}
                        onChange={(e) => setNewBlock(e.target.value)}
                        className="token-input w-full px-3 py-2 border rounded-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-[var(--text-strong)]">{t.checkout.area} *</label>
                      <input
                        type="text"
                        required
                        value={newArea}
                        onChange={(e) => setNewArea(e.target.value)}
                        placeholder="e.g. Seef, Adliya, Saar"
                        className="token-input w-full px-3 py-2 border rounded-xs"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-[var(--maroon-700)] hover:bg-[var(--maroon-600)] text-[var(--text-on-maroon)] text-xs font-semibold uppercase tracking-wider rounded-[var(--radius-pill)] cursor-pointer transition-colors"
                    >
                      {isAr ? 'حفظ العنوان' : 'Save Address'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingAddress(false)}
                      className="px-4 py-2.5 bg-[var(--surface-page)] border border-[var(--line)] text-[var(--text-body)] hover:bg-[var(--surface-champagne)] text-xs font-semibold rounded-[var(--radius-pill)] cursor-pointer transition-colors"
                    >
                      {t.admin.cancel}
                    </button>
                  </div>
                </form>
              )}

              {/* Address Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentUser.savedAddresses.map((addr, idx) => (
                  <div key={idx} className="bg-[var(--surface-card)] p-5 rounded-[var(--radius-card)] border border-[var(--line)] space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-[var(--gold-text)] gold-text-rtl-weight font-bold uppercase tracking-wider">
                      <MapPin className="w-4 h-4" />
                      <span>{isAr ? `عنوان رقم ${idx + 1}` : `Address #${idx + 1}`}</span>
                    </div>
                    <p className="font-semibold text-[var(--text-strong)]">
                      {addr.buildingNumber}, {addr.roadNumber}, {addr.blockNumber}
                    </p>
                    <p className="text-[var(--text-body)]">
                      {addr.area}, {addr.city}, Bahrain
                    </p>
                    {addr.additionalInstructions && (
                      <p className="text-[11px] text-[var(--text-muted)] italic">
                        {addr.additionalInstructions}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Security & Logins Tab */}
          {activeTab === 'security' && (
            <div className="space-y-8">
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Section A: Change Password */}
                <div className="bg-[var(--surface-card)] p-6 sm:p-7 rounded-[var(--radius-card)] border border-[var(--line)] shadow-[var(--shadow-soft)] space-y-5">
                  <div className="flex items-center gap-2.5 border-b border-[var(--line)] pb-3">
                    <KeyRound className="w-5 h-5 text-[var(--gold-decor)]" />
                    <div>
                      <h3 className="font-heading text-lg font-semibold text-[var(--text-strong)]">
                        {t.account.changePassword}
                      </h3>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {isAr ? 'تشفير وحماية كلمة المرور وفق أعلى معايير الأمان (bcrypt).' : 'Update your password with adaptive bcrypt salted hashing.'}
                      </p>
                    </div>
                  </div>

                  {passwordChangeStatus.error && (
                    <div
                      role="alert"
                      className="p-3 bg-[var(--surface-blush)] border border-[var(--red-600)] rounded-[var(--radius-card)] text-xs text-[var(--red-600)] flex items-start gap-2"
                    >
                      <AlertCircle className="w-4 h-4 text-[var(--red-600)] shrink-0 mt-0.5" />
                      <div>{passwordChangeStatus.error}</div>
                    </div>
                  )}

                  {passwordChangeStatus.success && (
                    <div className="p-3 bg-[var(--status-success-bg)] border border-[var(--status-success-border)] rounded-[var(--radius-card)] text-xs text-[var(--status-success)] flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[var(--status-success)] shrink-0 mt-0.5" />
                      <div>{passwordChangeStatus.success}</div>
                    </div>
                  )}

                  <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
                    <div className="space-y-1">
                      <label className="font-semibold text-[var(--text-strong)]">
                        {t.account.currentPassword} *
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPass ? 'text' : 'password'}
                          required
                          aria-invalid={Boolean(passwordChangeStatus.error)}
                          value={currentPasswordInput}
                          onChange={(e) => setCurrentPasswordInput(e.target.value)}
                          placeholder="••••••••"
                          className="token-input w-full px-3 py-2 border rounded-[var(--radius-card)] pr-10 rtl:pr-3 rtl:pl-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPass(!showCurrentPass)}
                          className="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 pr-3 rtl:pr-0 rtl:pl-3 flex items-center text-[var(--text-muted)] hover:text-[var(--text-strong)]"
                        >
                          {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-[var(--text-strong)]">
                        {t.account.newPassword} *
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPass ? 'text' : 'password'}
                          required
                          aria-invalid={Boolean(passwordChangeStatus.error)}
                          value={newPasswordInput}
                          onChange={(e) => setNewPasswordInput(e.target.value)}
                          placeholder="••••••••"
                          className="token-input w-full px-3 py-2 border rounded-[var(--radius-card)] pr-10 rtl:pr-3 rtl:pl-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPass(!showNewPass)}
                          className="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 pr-3 rtl:pr-0 rtl:pl-3 flex items-center text-[var(--text-muted)] hover:text-[var(--text-strong)]"
                        >
                          {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Password strength meter */}
                      <PasswordStrengthMeter password={newPasswordInput} showChecklist={true} />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-[var(--text-strong)]">
                        {t.account.confirmNewPassword} *
                      </label>
                      <input
                        type="password"
                        required
                        aria-invalid={Boolean(passwordChangeStatus.error)}
                        value={confirmPasswordInput}
                        onChange={(e) => setConfirmPasswordInput(e.target.value)}
                        placeholder="••••••••"
                        className="token-input w-full px-3 py-2 border rounded-[var(--radius-card)]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isChangingPass}
                      className="w-full py-2.5 bg-[var(--maroon-700)] hover:bg-[var(--maroon-600)] text-[var(--text-on-maroon)] font-semibold uppercase tracking-wider rounded-[var(--radius-pill)] transition-colors cursor-pointer"
                    >
                      {isChangingPass ? (isAr ? 'جارٍ التحديث...' : 'Updating Security...') : t.account.updatePassword}
                    </button>
                  </form>
                </div>

                {/* Section B: Two-Factor Auth & Connected OAuth */}
                <div className="space-y-6">
                  
                  {/* Two-Factor Authentication Card */}
                  <div className="bg-[var(--surface-card)] p-6 sm:p-7 rounded-[var(--radius-card)] border border-[var(--line)] shadow-[var(--shadow-soft)] space-y-4">
                    <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-[var(--gold-decor)]" />
                        <h3 className="font-heading text-lg font-semibold text-[var(--text-strong)]">
                          {t.account.twoFactorAuth}
                        </h3>
                      </div>
                      <span
                        className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-[var(--radius-pill)] border ${
                          currentUser.twoFactorEnabled
                            ? 'bg-[var(--status-success-bg)] text-[var(--status-success)] border-[var(--status-success-border)]'
                            : 'bg-[var(--surface-page)] text-[var(--text-muted)] border-[var(--line)]'
                        }`}
                      >
                        {currentUser.twoFactorEnabled ? t.account.enabled : t.account.disabled}
                      </span>
                    </div>

                    <p className="text-xs text-[var(--text-body)] leading-relaxed">
                      {t.account.twoFactorDesc}
                    </p>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2 text-xs text-[var(--text-strong)]">
                        <Smartphone className="w-4 h-4 text-[var(--gold-decor)]" />
                        <span className="font-medium">
                          {currentUser.twoFactorEnabled ? 'Google / Apple Authenticator' : (isAr ? 'غير مفعل' : 'Not configured')}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handleToggle2FA}
                        className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-[var(--radius-pill)] transition-colors cursor-pointer ${
                          currentUser.twoFactorEnabled
                            ? 'bg-[var(--surface-page)] hover:bg-[var(--surface-champagne)] text-[var(--text-strong)] border border-[var(--line)]'
                            : 'bg-[var(--maroon-700)] hover:bg-[var(--maroon-600)] text-[var(--text-on-maroon)]'
                        }`}
                      >
                        {currentUser.twoFactorEnabled ? t.account.disable2FA : t.account.enable2FA}
                      </button>
                    </div>
                  </div>

                  {/* Connected OAuth Accounts Card */}
                  <div className="bg-[var(--surface-card)] p-6 sm:p-7 rounded-[var(--radius-card)] border border-[var(--line)] shadow-[var(--shadow-soft)] space-y-4">
                    <div className="border-b border-[var(--line)] pb-3">
                      <h3 className="font-heading text-lg font-semibold text-[var(--text-strong)]">
                        {t.account.connectedAccounts}
                      </h3>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {isAr ? 'تسجيل دخول سريع وآمن بنقرة واحدة بحساباتك الموثقة.' : 'Single-click seamless authentication via OAuth 2.0.'}
                      </p>
                    </div>

                    <div className="divide-y divide-[var(--line)] text-xs">
                      {/* Google */}
                      <div className="py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                              fill="#4285F4"
                              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                            />
                          </svg>
                          <div>
                            <p className="font-semibold text-[var(--text-strong)]">Google</p>
                            <p className="text-[11px] text-[var(--text-muted)]">
                              {currentUser.connectedProviders?.google ? (isAr ? 'تم التحقق من الحساب' : 'Account linked & verified') : (isAr ? 'غير مرتبط' : 'Not linked')}
                            </p>
                          </div>
                        </div>

                        {currentUser.connectedProviders?.google ? (
                          <button
                            type="button"
                            onClick={() => unlinkOAuthProvider('google')}
                            className="px-3.5 py-1.5 border border-[var(--line)] hover:border-[var(--red-600)] text-[var(--red-600)] hover:bg-[var(--surface-blush)] rounded-[var(--radius-pill)] text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            {t.account.disconnect}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setActiveOAuthProvider('google')}
                            className="px-3.5 py-1.5 bg-[var(--maroon-700)] hover:bg-[var(--maroon-600)] text-[var(--text-on-maroon)] rounded-[var(--radius-pill)] text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            {t.account.connect}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Section C: Security Activity Audit Log */}
              <div className="bg-[var(--surface-card)] p-6 sm:p-7 rounded-[var(--radius-card)] border border-[var(--line)] shadow-[var(--shadow-soft)] space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-[var(--gold-decor)]" />
                    <h3 className="font-heading text-lg font-semibold text-[var(--text-strong)]">
                      {t.account.securityLog}
                    </h3>
                  </div>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    {isAr ? 'آخر عمليات تسجيل الدخول والأمان' : 'Recent authentication events & sessions'}
                  </span>
                </div>

                <div className="divide-y divide-[var(--line)] text-xs">
                  {securityLogs.map((log) => {
                    const isSuccess = log.action === 'login_success' || log.action === 'oauth_connected' || log.action === '2fa_enabled';
                    return (
                      <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isSuccess ? 'bg-[var(--status-success)]' : 'bg-[var(--gold-decor)]'
                            }`}
                          />
                          <div>
                            <p className="font-semibold text-[var(--text-strong)]">
                              {log.action === 'login_success' && (isAr ? 'تسجيل دخول ناجح' : 'Successful Sign In')}
                              {log.action === 'account_created' && (isAr ? 'إنشاء حساب جديد' : 'Account Created')}
                              {log.action === 'password_changed' && (isAr ? 'تغيير كلمة المرور' : 'Password Changed')}
                              {log.action === 'oauth_connected' && (isAr ? 'ربط حساب OAuth' : 'OAuth Provider Linked')}
                              {log.action === 'oauth_disconnected' && (isAr ? 'إلغاء ربط حساب OAuth' : 'OAuth Provider Unlinked')}
                              {log.action === '2fa_enabled' && (isAr ? 'تفعيل المصادقة الثنائية' : '2FA Enabled')}
                              {log.action === '2fa_disabled' && (isAr ? 'تعطيل المصادقة الثنائية' : '2FA Disabled')}
                            </p>
                            <p className="text-[11px] text-[var(--text-muted)]">
                              {log.device} · IP: {log.ip} · {log.location}
                            </p>
                          </div>
                        </div>

                        <span className="text-[11px] text-[var(--text-muted)] font-mono self-end sm:self-auto">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* Inspect Order Tracking Modal */}
      {inspectOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-[var(--scrim-dark)] backdrop-blur-xs">
          <div className="bg-[var(--surface-card)] rounded-[var(--radius-card)] max-w-lg w-full p-6 sm:p-8 space-y-6 border border-[var(--line)] shadow-[var(--shadow-soft)]">
            <div className="flex justify-between items-center border-b border-[var(--line)] pb-3">
              <div>
                <h3 className="font-heading text-xl font-semibold text-[var(--text-strong)]">
                  {isAr ? 'تتبع حالة الطلب' : 'Live Order Tracking'}
                </h3>
                <p className="font-mono text-xs text-[var(--gold-text)] gold-text-rtl-weight">{inspectOrder.orderNumber}</p>
              </div>
              <button
                type="button"
                aria-label={isAr ? 'إغلاق' : 'Close'}
                onClick={() => setInspectOrder(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-strong)] cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-[var(--surface-page)] rounded-[var(--radius-card)] border border-[var(--line)] text-xs text-[var(--text-body)] space-y-1">
                <p><strong className="text-[var(--text-strong)]">{isAr ? 'الحالة الحالية:' : 'Current Status:'}</strong> <span className="text-[var(--maroon-700)] font-bold">{inspectOrder.orderStatus}</span></p>
                <p><strong className="text-[var(--text-strong)]">{isAr ? 'وسيلة الدفع:' : 'Payment:'}</strong> {inspectOrder.paymentMethod === 'pay_on_delivery' ? (isAr ? 'الدفع عند الاستلام' : 'Pay On Delivery') : inspectOrder.paymentMethod.replace('_', ' ').toUpperCase()} ({inspectOrder.paymentStatus})</p>
                <p><strong className="text-[var(--text-strong)]">{isAr ? 'المبلغ الكلي:' : 'Total Amount:'}</strong> {formatBHD(inspectOrder.total)}</p>
              </div>

              {/* Product Visual Identification in Order Tracking */}
              {inspectOrder.items && inspectOrder.items.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-strong)] flex items-center justify-between">
                    <span>{isAr ? 'القطع المشمولة في هذا الطلب:' : 'Items Included in this Order:'}</span>
                    <span className="text-[10px] font-mono text-[var(--gold-text)] gold-text-rtl-weight">
                      {inspectOrder.items.length} {isAr ? 'قطع' : 'items'}
                    </span>
                  </h4>
                  <div className="divide-y divide-[var(--line)] border border-[var(--line)] rounded-[var(--radius-card)] bg-[var(--surface-page)] overflow-hidden max-h-48 overflow-y-auto">
                    {inspectOrder.items.map((item, idx) => {
                      const matchedProd = products.find((p) => p.id === item.productId);
                      const img = (item.image && item.image.trim() !== '') 
                        ? item.image 
                        : ((matchedProd?.images?.[0] && matchedProd.images[0].trim() !== '') ? matchedProd.images[0] : '/images/hero_pic.jpeg');

                      return (
                        <div key={idx} className="p-2.5 flex items-center justify-between gap-3 text-xs bg-[var(--surface-card)]">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={img}
                              alt={isAr ? item.nameAr : item.nameEn}
                              className="w-10 h-12 object-cover rounded-[var(--radius-card)] border border-[var(--line)] shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="font-semibold text-[var(--text-strong)] truncate">
                                {isAr ? item.nameAr : item.nameEn}
                              </p>
                              <p className="text-[10px] text-[var(--text-muted)] font-mono">
                                {item.size} · {item.color} · {isAr ? `الكمية: ${item.quantity}` : `Qty: ${item.quantity}`}
                              </p>
                            </div>
                          </div>
                          <span className="font-bold text-[var(--text-strong)] tabular-nums shrink-0">
                            {formatBHD(item.totalPrice || item.unitPrice * item.quantity)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {inspectOrder.paymentMethod === 'pay_on_delivery' && inspectOrder.deliveryVerificationCode && (
                <div className="p-4 bg-[var(--surface-card)] rounded-[var(--radius-card)] border-2 border-[var(--gold-decor)] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-strong)]">
                      <Truck className="w-4 h-4 text-[var(--gold-decor)]" />
                      <span>{isAr ? 'رمز وباركود التحقق عند الاستلام' : 'On-Delivery Verification PIN & QR'}</span>
                    </div>
                    {inspectOrder.paymentStatus === 'Paid' ? (
                      <span className="text-[10px] bg-[var(--status-success-bg)] text-[var(--status-success)] border border-[var(--status-success-border)] font-bold px-2.5 py-0.5 rounded-[var(--radius-pill)]">
                        {isAr ? 'تم تأكيد السداد' : 'Payment Confirmed'}
                      </span>
                    ) : (
                      <span className="text-[10px] bg-[var(--surface-champagne)] text-[var(--gold-text)] border border-[var(--gold-soft)] font-bold px-2.5 py-0.5 rounded-[var(--radius-pill)] gold-text-rtl-weight">
                        {isAr ? 'بانتظار التحصيل' : 'Pending Collection'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between bg-[var(--surface-page)] p-2.5 rounded-[var(--radius-card)] border border-[var(--line)]">
                    <div>
                      <span className="text-[9px] text-[var(--gold-text)] gold-text-rtl-weight uppercase font-mono block">6-Digit PIN</span>
                      <span className="font-mono text-2xl font-extrabold text-[var(--text-strong)] tracking-widest tabular-nums">
                        {inspectOrder.deliveryVerificationCode}
                      </span>
                    </div>
                    <DeliveryQrCode
                      orderNumber={inspectOrder.orderNumber}
                      verificationCode={inspectOrder.deliveryVerificationCode}
                      amount={inspectOrder.total}
                      size={120}
                      showDownload={true}
                    />
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] leading-normal">
                    {isAr ? 'يرجى إبراز هذا الرمز أو ترك المندوب يمسح الباركود لتأكيد الدفع عند استلام الطرد.' : 'Present this PIN or let the delivery courier scan your QR code upon delivery.'}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-strong)]">
                  {isAr ? 'سجل مراحل التوصيل' : 'Status Timeline'}
                </h4>
                <div className="space-y-2 border-l-2 rtl:border-l-0 rtl:border-r-2 border-[var(--gold-decor)] pl-3 rtl:pl-0 rtl:pr-3">
                  {inspectOrder.statusHistory.map((h, i) => (
                    <div key={i} className="text-xs">
                      <p className="font-semibold text-[var(--text-strong)]">{h.status}</p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {new Date(h.timestamp).toLocaleString()}
                      </p>
                      {h.note && <p className="text-[11px] text-[var(--gold-text)] gold-text-rtl-weight mt-0.5">{h.note}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const ordToInspect = inspectOrder;
                  setSelectedReceiptOrder(ordToInspect);
                }}
                className="flex-1 py-2.5 bg-[var(--maroon-700)] hover:bg-[var(--maroon-600)] text-[var(--text-on-maroon)] text-xs font-semibold uppercase tracking-wider rounded-[var(--radius-pill)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-[var(--shadow-soft)]"
              >
                <FileText className="w-4 h-4" />
                <span>{isAr ? 'عرض وإرسال إيصال الشراء' : 'View & Send Receipt'}</span>
              </button>

              <button
                type="button"
                onClick={() => setInspectOrder(null)}
                className="px-6 py-2.5 bg-[var(--surface-page)] hover:bg-[var(--surface-champagne)] text-[var(--text-strong)] border border-[var(--line)] text-xs font-semibold uppercase tracking-wider rounded-[var(--radius-pill)] cursor-pointer transition-colors"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Purchase Receipt & Tax Invoice Modal */}
      {selectedReceiptOrder && (
        <ReceiptModal
          order={selectedReceiptOrder}
          isOpen={Boolean(selectedReceiptOrder)}
          onClose={() => setSelectedReceiptOrder(null)}
        />
      )}

      {/* Two-Factor Setup Modal */}
      {is2FAModalOpen && (
        <TwoFactorModal
          isOpen={is2FAModalOpen}
          onClose={() => setIs2FAModalOpen(false)}
        />
      )}

      {/* OAuth Connect Modal */}
      {activeOAuthProvider && (
        <OAuthDialogModal
          provider={activeOAuthProvider}
          onClose={() => setActiveOAuthProvider(null)}
        />
      )}

    </div>
  );
};
