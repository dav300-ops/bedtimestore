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
  onNavigateAdmin: () => void;
}

export const AccountPage: React.FC<AccountPageProps> = ({
  initialTab = 'orders',
  onQuickView,
  onSelectProduct,
  onNavigateAdmin,
}) => {
  const {
    currentUser,
    logout,
    addAddress,
    isAdmin,
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
      <div className="bg-[var(--color-bg)] min-h-screen py-10 px-4">
        <div className="max-w-md mx-auto">
          <AuthModal
            embedded={true}
            defaultMode="signin"
            onNavigate={(page) => {
              if (page === 'admin') {
                onNavigateAdmin();
              }
            }}
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
    <div className="bg-[var(--color-bg)] min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* User Header Profile Card */}
        <div className="bg-[var(--color-card)] p-6 sm:p-8 rounded-sm border border-[var(--color-border)] shadow-xs mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            {currentUser.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.firstName}
                className="w-16 h-16 rounded-full object-cover border-2 border-[var(--color-accent)] shadow-xs shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[var(--color-text)] text-[var(--color-bg)] flex items-center justify-center font-heading text-2xl font-bold shrink-0 border-2 border-[var(--color-accent)]">
                {currentUser.firstName.charAt(0)}
              </div>
            )}

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)]">
                  {isAr ? 'عضوية ذا بدتايم ستور' : 'Boutique Client Profile'}
                </span>
                
              </div>

              <h1 className="font-heading text-2xl sm:text-3xl font-semibold text-[var(--color-text)]">
                {t.account.welcome}, {currentUser.firstName} {currentUser.lastName}
              </h1>
              <p className="text-xs text-[var(--color-text)]/70">
                {currentUser.email} · {currentUser.phone}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <button
                onClick={onNavigateAdmin}
                className="px-4 py-2 bg-[var(--color-text)] hover:bg-[var(--color-primary-hover)] text-[var(--color-bg)] text-xs font-semibold uppercase tracking-wider rounded-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-[var(--color-primary)]" />
                <span>{t.nav.admin}</span>
              </button>
            )}

            <button
              onClick={logout}
              className="px-4 py-2 bg-white border border-[var(--color-border)] hover:bg-[var(--color-bg)] text-[var(--color-text)] text-xs font-semibold uppercase tracking-wider rounded-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-[var(--color-primary)]" />
              <span>{t.account.logout}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[var(--color-border)] mb-8 overflow-x-auto gap-2">
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
                    ? 'bg-[var(--color-card)] text-[var(--color-primary)] border-t-2 border-[var(--color-primary)] shadow-xs font-bold'
                    : 'bg-[var(--color-border)]/50 text-[var(--color-text)] hover:bg-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className="px-1.5 py-0.2 bg-[var(--color-bg)] text-[var(--color-text)] rounded-full text-[10px] tabular-nums">
                    {tab.count}
                  </span>
                )}
                {tab.badge && (
                  <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
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
                <div className="bg-[var(--color-card)] p-12 text-center rounded-sm border border-[var(--color-border)] space-y-2">
                  <p className="text-sm font-semibold text-[var(--color-text)]">{t.account.noOrders}</p>
                </div>
              ) : (
                userOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="bg-[var(--color-card)] p-6 rounded-sm border border-[var(--color-border)] shadow-xs space-y-4"
                  >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-sm text-[var(--color-text)]">{ord.orderNumber}</span>
                          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-xs ${
                            ord.orderStatus === 'Delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-[var(--color-bg)] text-[var(--color-accent)]'
                          }`}>
                            {ord.orderStatus}
                          </span>
                          {ord.paymentMethod === 'pay_on_delivery' && ord.deliveryVerificationCode && (
                            <span className="bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-mono text-[10px] px-2 py-0.5 rounded-xs font-semibold">
                              PIN: {ord.deliveryVerificationCode}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--color-text)]/70">
                          {new Date(ord.createdAt).toLocaleDateString()} · {ord.paymentMethod.replace('_', ' ').toUpperCase()}
                        </p>
                        <p className="text-xs text-[var(--color-text)]/80">
                          {ord.shippingAddress.buildingNumber}, {ord.shippingAddress.roadNumber}, {ord.shippingAddress.area}, Bahrain
                        </p>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 self-end md:self-auto flex-wrap sm:flex-nowrap">
                        <span className="font-bold text-base text-[var(--color-text)] tabular-nums mr-2 rtl:mr-0 rtl:ml-2">
                          {formatBHD(ord.total)}
                        </span>
                        <button
                          onClick={() => setSelectedReceiptOrder(ord)}
                          className="px-3 py-2 bg-[var(--color-card)] border border-[var(--color-border)] hover:bg-[var(--color-bg)] text-[var(--color-text)] text-xs font-semibold uppercase tracking-wider rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                          title="View & Send Purchase Receipt"
                        >
                          <FileText className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                          <span>{isAr ? 'الإيصال' : 'Receipt'}</span>
                        </button>
                        <button
                          onClick={() => setInspectOrder(ord)}
                          className="px-4 py-2 bg-[var(--color-border)] hover:bg-[var(--color-card)] text-[var(--color-text)] text-xs font-semibold uppercase tracking-wider rounded-xs transition-colors cursor-pointer"
                        >
                          {isAr ? 'تتبع وتفاصيل' : 'Track Order'}
                        </button>
                      </div>
                    </div>

                    {/* Product Identification Thumbnail Strip for Customer Recognition */}
                    {ord.items && ord.items.length > 0 && (
                      <div className="pt-3 border-t border-[var(--color-border)]/60">
                        <span className="text-[10px] uppercase font-semibold text-[var(--color-accent)] tracking-wider block mb-2">
                          {isAr ? 'القطع المشمولة في هذا الطلب (انقري للتعرف على المنتج):' : 'Identified Items in this Order (Click to View):'}
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {ord.items.map((item, idx) => {
                            const matchedProd = products.find((p) => p.id === item.productId);
                            const imgUrl = item.image || matchedProd?.images?.[0] || '/images/hero_pic.jpeg';

                            return (
                              <div
                                key={idx}
                                onClick={() => {
                                  if (matchedProd) onSelectProduct(matchedProd);
                                }}
                                className="flex items-center gap-3 p-2 bg-[var(--color-bg)] hover:bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xs transition-colors cursor-pointer group"
                                title={isAr ? 'انقري لعرض تفاصيل القطعة' : 'Click to view product details'}
                              >
                                <div className="w-12 h-14 bg-[var(--color-card)] rounded-xs overflow-hidden border border-[var(--color-accent)]/40 shrink-0 relative shadow-2xs">
                                  <img
                                    src={imgUrl}
                                    alt={isAr ? item.nameAr : item.nameEn}
                                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform"
                                  />
                                  {item.quantity > 1 && (
                                    <span className="absolute bottom-0 right-0 bg-[var(--color-text)] text-white text-[9px] font-mono px-1 rounded-tl-xs">
                                      x{item.quantity}
                                    </span>
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-xs text-[var(--color-text)] truncate group-hover:text-[var(--color-primary)] transition-colors">
                                    {isAr ? item.nameAr : item.nameEn}
                                  </p>
                                  <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                                    {item.size} · {item.color}
                                  </p>
                                  <p className="text-[11px] font-bold text-[var(--color-text)] mt-0.5 tabular-nums">
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
                <div className="bg-[var(--color-card)] p-12 text-center rounded-sm border border-[var(--color-border)] space-y-2">
                  <p className="text-sm font-semibold text-[var(--color-text)]">{t.account.noWishlist}</p>
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
                <h3 className="font-heading text-lg font-semibold text-[var(--color-text)]">
                  {isAr ? 'عناوين التوصيل في مملكة البحرين' : 'Bahrain Delivery Addresses'}
                </h3>
                <button
                  onClick={() => setIsAddingAddress(!isAddingAddress)}
                  className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold uppercase tracking-wider rounded-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isAr ? 'إضافة عنوان جديد' : 'Add New Address'}</span>
                </button>
              </div>

              {/* Add Address Form */}
              {isAddingAddress && (
                <form onSubmit={handleAddAddress} className="bg-[var(--color-card)] p-6 rounded-sm border border-[var(--color-border)] space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <label className="font-semibold text-[var(--color-text)]">{t.checkout.building} *</label>
                      <input
                        type="text"
                        required
                        value={newBuilding}
                        onChange={(e) => setNewBuilding(e.target.value)}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-[var(--color-text)]">{t.checkout.road} *</label>
                      <input
                        type="text"
                        required
                        value={newRoad}
                        onChange={(e) => setNewRoad(e.target.value)}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-[var(--color-text)]">{t.checkout.block} *</label>
                      <input
                        type="text"
                        required
                        value={newBlock}
                        onChange={(e) => setNewBlock(e.target.value)}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-[var(--color-text)]">{t.checkout.area} *</label>
                      <input
                        type="text"
                        required
                        value={newArea}
                        onChange={(e) => setNewArea(e.target.value)}
                        placeholder="e.g. Seef, Adliya, Saar"
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xs"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-[var(--color-primary)] text-white text-xs font-semibold uppercase tracking-wider rounded-xs cursor-pointer"
                    >
                      {isAr ? 'حفظ العنوان' : 'Save Address'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingAddress(false)}
                      className="px-4 py-2.5 bg-gray-100 text-gray-700 text-xs rounded-xs cursor-pointer"
                    >
                      {t.admin.cancel}
                    </button>
                  </div>
                </form>
              )}

              {/* Address Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentUser.savedAddresses.map((addr, idx) => (
                  <div key={idx} className="bg-[var(--color-card)] p-5 rounded-sm border border-[var(--color-border)] space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-[var(--color-accent)] font-bold uppercase tracking-wider">
                      <MapPin className="w-4 h-4" />
                      <span>{isAr ? `عنوان رقم ${idx + 1}` : `Address #${idx + 1}`}</span>
                    </div>
                    <p className="font-semibold text-[var(--color-text)]">
                      {addr.buildingNumber}, {addr.roadNumber}, {addr.blockNumber}
                    </p>
                    <p className="text-[var(--color-text)]/80">
                      {addr.area}, {addr.city}, Bahrain
                    </p>
                    {addr.additionalInstructions && (
                      <p className="text-[11px] text-[var(--color-text)]/60 italic">
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
                <div className="bg-[var(--color-card)] p-6 sm:p-7 rounded-sm border border-[var(--color-border)] shadow-xs space-y-5">
                  <div className="flex items-center gap-2.5 border-b border-[var(--color-border)] pb-3">
                    <KeyRound className="w-5 h-5 text-[var(--color-accent)]" />
                    <div>
                      <h3 className="font-heading text-lg font-semibold text-[var(--color-text)]">
                        {t.account.changePassword}
                      </h3>
                      <p className="text-[11px] text-gray-500">
                        {isAr ? 'تشفير وحماية كلمة المرور وفق أعلى معايير الأمان (OWASP).' : 'Update your password with cryptographic SHA-256 salted hashing.'}
                      </p>
                    </div>
                  </div>

                  {passwordChangeStatus.error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xs text-xs text-red-700 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <div>{passwordChangeStatus.error}</div>
                    </div>
                  )}

                  {passwordChangeStatus.success && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xs text-xs text-emerald-800 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>{passwordChangeStatus.success}</div>
                    </div>
                  )}

                  <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
                    <div className="space-y-1">
                      <label className="font-semibold text-[var(--color-text)]">
                        {t.account.currentPassword} *
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPass ? 'text' : 'password'}
                          required
                          value={currentPasswordInput}
                          onChange={(e) => setCurrentPasswordInput(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xs pr-10 rtl:pr-3 rtl:pl-10 outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPass(!showCurrentPass)}
                          className="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 pr-3 rtl:pr-0 rtl:pl-3 flex items-center text-gray-400 hover:text-gray-700"
                        >
                          {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-[var(--color-text)]">
                        {t.account.newPassword} *
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPass ? 'text' : 'password'}
                          required
                          value={newPasswordInput}
                          onChange={(e) => setNewPasswordInput(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xs pr-10 rtl:pr-3 rtl:pl-10 outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPass(!showNewPass)}
                          className="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 pr-3 rtl:pr-0 rtl:pl-3 flex items-center text-gray-400 hover:text-gray-700"
                        >
                          {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Password strength meter */}
                      <PasswordStrengthMeter password={newPasswordInput} showChecklist={true} />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-[var(--color-text)]">
                        {t.account.confirmNewPassword} *
                      </label>
                      <input
                        type="password"
                        required
                        value={confirmPasswordInput}
                        onChange={(e) => setConfirmPasswordInput(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xs outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isChangingPass}
                      className="w-full py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold uppercase tracking-wider rounded-xs transition-colors cursor-pointer"
                    >
                      {isChangingPass ? (isAr ? 'جارٍ التحديث...' : 'Updating Security...') : t.account.updatePassword}
                    </button>
                  </form>
                </div>

                {/* Section B: Two-Factor Auth & Connected OAuth */}
                <div className="space-y-6">
                  
                  {/* Two-Factor Authentication Card */}
                  <div className="bg-[var(--color-card)] p-6 sm:p-7 rounded-sm border border-[var(--color-border)] shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-[var(--color-accent)]" />
                        <h3 className="font-heading text-lg font-semibold text-[var(--color-text)]">
                          {t.account.twoFactorAuth}
                        </h3>
                      </div>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          currentUser.twoFactorEnabled
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {currentUser.twoFactorEnabled ? t.account.enabled : t.account.disabled}
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 leading-relaxed">
                      {t.account.twoFactorDesc}
                    </p>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2 text-xs">
                        <Smartphone className="w-4 h-4 text-[var(--color-accent)]" />
                        <span className="font-medium">
                          {currentUser.twoFactorEnabled ? 'Google / Apple Authenticator' : (isAr ? 'غير مفعل' : 'Not configured')}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handleToggle2FA}
                        className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-xs transition-colors cursor-pointer ${
                          currentUser.twoFactorEnabled
                            ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                            : 'bg-[var(--color-text)] hover:bg-[var(--color-primary-hover)] text-white'
                        }`}
                      >
                        {currentUser.twoFactorEnabled ? t.account.disable2FA : t.account.enable2FA}
                      </button>
                    </div>
                  </div>

                  {/* Connected OAuth Accounts Card */}
                  <div className="bg-[var(--color-card)] p-6 sm:p-7 rounded-sm border border-[var(--color-border)] shadow-xs space-y-4">
                    <div className="border-b border-[var(--color-border)] pb-3">
                      <h3 className="font-heading text-lg font-semibold text-[var(--color-text)]">
                        {t.account.connectedAccounts}
                      </h3>
                      <p className="text-[11px] text-gray-500">
                        {isAr ? 'تسجيل دخول سريع وآمن بنقرة واحدة بحساباتك الموثقة.' : 'Single-click seamless authentication via OAuth 2.0.'}
                      </p>
                    </div>

                    <div className="divide-y divide-[var(--color-border)] text-xs">
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
                            <p className="font-semibold text-gray-900">Google</p>
                            <p className="text-[11px] text-gray-500">
                              {currentUser.connectedProviders?.google ? (isAr ? 'تم التحقق من الحساب' : 'Account linked & verified') : (isAr ? 'غير مرتبط' : 'Not linked')}
                            </p>
                          </div>
                        </div>

                        {currentUser.connectedProviders?.google ? (
                          <button
                            type="button"
                            onClick={() => unlinkOAuthProvider('google')}
                            className="px-3 py-1.5 border border-gray-200 hover:border-red-300 text-gray-600 hover:text-red-600 rounded-xs text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            {t.account.disconnect}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setActiveOAuthProvider('google')}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xs text-[11px] font-semibold transition-colors cursor-pointer"
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
              <div className="bg-[var(--color-card)] p-6 sm:p-7 rounded-sm border border-[var(--color-border)] shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-[var(--color-accent)]" />
                    <h3 className="font-heading text-lg font-semibold text-[var(--color-text)]">
                      {t.account.securityLog}
                    </h3>
                  </div>
                  <span className="text-[11px] text-gray-500">
                    {isAr ? 'آخر عمليات تسجيل الدخول والأمان' : 'Recent authentication events & sessions'}
                  </span>
                </div>

                <div className="divide-y divide-[var(--color-border)] text-xs">
                  {securityLogs.map((log) => {
                    const isSuccess = log.action === 'login_success' || log.action === 'oauth_connected' || log.action === '2fa_enabled';
                    return (
                      <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isSuccess ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                          />
                          <div>
                            <p className="font-semibold text-gray-900">
                              {log.action === 'login_success' && (isAr ? 'تسجيل دخول ناجح' : 'Successful Sign In')}
                              {log.action === 'account_created' && (isAr ? 'إنشاء حساب جديد' : 'Account Created')}
                              {log.action === 'password_changed' && (isAr ? 'تغيير كلمة المرور' : 'Password Changed')}
                              {log.action === 'oauth_connected' && (isAr ? 'ربط حساب OAuth' : 'OAuth Provider Linked')}
                              {log.action === 'oauth_disconnected' && (isAr ? 'إلغاء ربط حساب OAuth' : 'OAuth Provider Unlinked')}
                              {log.action === '2fa_enabled' && (isAr ? 'تفعيل المصادقة الثنائية' : '2FA Enabled')}
                              {log.action === '2fa_disabled' && (isAr ? 'تعطيل المصادقة الثنائية' : '2FA Disabled')}
                            </p>
                            <p className="text-[11px] text-gray-500">
                              {log.device} · IP: {log.ip} · {log.location}
                            </p>
                          </div>
                        </div>

                        <span className="text-[11px] text-gray-400 font-mono self-end sm:self-auto">
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
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-[var(--color-text)]/60 backdrop-blur-xs">
          <div className="bg-[var(--color-card)] rounded-sm max-w-lg w-full p-6 sm:p-8 space-y-6 border border-[var(--color-border)]">
            <div className="flex justify-between items-center border-b border-[var(--color-border)] pb-3">
              <div>
                <h3 className="font-heading text-xl font-semibold text-[var(--color-text)]">
                  {isAr ? 'تتبع حالة الطلب' : 'Live Order Tracking'}
                </h3>
                <p className="font-mono text-xs text-[var(--color-accent)]">{inspectOrder.orderNumber}</p>
              </div>
              <button
                onClick={() => setInspectOrder(null)}
                className="text-gray-400 hover:text-[var(--color-text)] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-[var(--color-bg)]/40 rounded-xs border border-[var(--color-border)] text-xs space-y-1">
                <p><strong>{isAr ? 'الحالة الحالية:' : 'Current Status:'}</strong> <span className="text-[var(--color-primary)] font-bold">{inspectOrder.orderStatus}</span></p>
                <p><strong>{isAr ? 'وسيلة الدفع:' : 'Payment:'}</strong> {inspectOrder.paymentMethod === 'pay_on_delivery' ? (isAr ? 'الدفع عند الاستلام' : 'Pay On Delivery') : inspectOrder.paymentMethod.replace('_', ' ').toUpperCase()} ({inspectOrder.paymentStatus})</p>
                <p><strong>{isAr ? 'المبلغ الكلي:' : 'Total Amount:'}</strong> {formatBHD(inspectOrder.total)}</p>
              </div>

              {/* Product Visual Identification in Order Tracking */}
              {inspectOrder.items && inspectOrder.items.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text)] flex items-center justify-between">
                    <span>{isAr ? 'القطع المشمولة في هذا الطلب:' : 'Items Included in this Order:'}</span>
                    <span className="text-[10px] font-mono text-[var(--color-accent)]">
                      {inspectOrder.items.length} {isAr ? 'قطع' : 'items'}
                    </span>
                  </h4>
                  <div className="divide-y divide-[var(--color-border)] border border-[var(--color-border)] rounded-xs bg-[var(--color-bg)] overflow-hidden max-h-48 overflow-y-auto">
                    {inspectOrder.items.map((item, idx) => {
                      const matchedProd = products.find((p) => p.id === item.productId);
                      const img = item.image || matchedProd?.images?.[0] || '/images/hero_pic.jpeg';

                      return (
                        <div key={idx} className="p-2.5 flex items-center justify-between gap-3 text-xs bg-white">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={img}
                              alt={isAr ? item.nameAr : item.nameEn}
                              className="w-10 h-12 object-cover rounded-xs border border-gray-200 shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="font-semibold text-[var(--color-text)] truncate">
                                {isAr ? item.nameAr : item.nameEn}
                              </p>
                              <p className="text-[10px] text-gray-500 font-mono">
                                {item.size} · {item.color} · {isAr ? `الكمية: ${item.quantity}` : `Qty: ${item.quantity}`}
                              </p>
                            </div>
                          </div>
                          <span className="font-bold text-[var(--color-text)] tabular-nums shrink-0">
                            {formatBHD(item.totalPrice || item.unitPrice * item.quantity)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {inspectOrder.paymentMethod === 'pay_on_delivery' && inspectOrder.deliveryVerificationCode && (
                <div className="p-4 bg-white rounded-xs border-2 border-[var(--color-accent)] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-text)]">
                      <Truck className="w-4 h-4 text-[var(--color-accent)]" />
                      <span>{isAr ? 'رمز وباركود التحقق عند الاستلام' : 'On-Delivery Verification PIN & QR'}</span>
                    </div>
                    {inspectOrder.paymentStatus === 'Paid' ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-xs">
                        {isAr ? 'تم تأكيد السداد' : 'Payment Confirmed'}
                      </span>
                    ) : (
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-xs">
                        {isAr ? 'بانتظار التحصيل' : 'Pending Collection'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between bg-[var(--color-bg)]/50 p-2.5 rounded-xs border border-[var(--color-border)]">
                    <div>
                      <span className="text-[9px] text-[var(--color-accent)] uppercase font-mono block">6-Digit PIN</span>
                      <span className="font-mono text-2xl font-extrabold text-[var(--color-text)] tracking-widest tabular-nums">
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
                  <p className="text-[10px] text-[var(--color-text)]/70 leading-normal">
                    {isAr ? 'يرجى إبراز هذا الرمز أو ترك المندوب يمسح الباركود لتأكيد الدفع عند استلام الطرد.' : 'Present this PIN or let the delivery courier scan your QR code upon delivery.'}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text)]">
                  {isAr ? 'سجل مراحل التوصيل' : 'Status Timeline'}
                </h4>
                <div className="space-y-2 border-l-2 rtl:border-l-0 rtl:border-r-2 border-[var(--color-accent)] pl-3 rtl:pl-0 rtl:pr-3">
                  {inspectOrder.statusHistory.map((h, i) => (
                    <div key={i} className="text-xs">
                      <p className="font-semibold text-[var(--color-text)]">{h.status}</p>
                      <p className="text-[11px] text-[var(--color-text)]/60">
                        {new Date(h.timestamp).toLocaleString()}
                      </p>
                      {h.note && <p className="text-[11px] text-[var(--color-accent)] mt-0.5">{h.note}</p>}
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
                className="flex-1 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold uppercase tracking-wider rounded-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <FileText className="w-4 h-4" />
                <span>{isAr ? 'عرض وإرسال إيصال الشراء' : 'View & Send Receipt'}</span>
              </button>

              <button
                onClick={() => setInspectOrder(null)}
                className="px-6 py-2.5 bg-[var(--color-text)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold uppercase tracking-wider rounded-xs cursor-pointer transition-colors"
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
