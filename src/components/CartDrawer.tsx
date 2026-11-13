import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { X, Trash2, Plus, Minus, ArrowRight, ArrowLeft, Tag, ShoppingBag, Lock, Check, AlertCircle } from 'lucide-react';

interface CartDrawerProps {
  onNavigateCheckout: () => void;
  onContinueShopping: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  onNavigateCheckout,
  onContinueShopping,
}) => {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeFromCart,
    subtotal,
    discount,
    shippingFee,
    freeDeliveryThreshold,
    total,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
  } = useCart();

  const { language, formatBHD, t, isRtl } = useLanguage();
  const { currentUser, isGuest, openAuthModal } = useAuth();
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponMessage, setCouponMessage] = useState<{ text: string; error: boolean } | null>(null);

  // Body scroll lock & Escape key handling while bag drawer is open
  useEffect(() => {
    if (!isCartOpen) return;
    document.body.classList.add('drawer-scroll-locked');

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCartOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.classList.remove('drawer-scroll-locked');
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCartOpen, setIsCartOpen]);

  if (!isCartOpen) return null;

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCodeInput.trim()) return;
    const result = applyCoupon(couponCodeInput);
    if (result.success) {
      setCouponMessage({ text: result.message, error: false });
      setCouponCodeInput('');
    } else {
      setCouponMessage({ text: result.message, error: true });
    }
  };

  const amountNeeded = Math.max(0, freeDeliveryThreshold - subtotal);
  const progressPercent = Math.min(100, (subtotal / Math.max(1, freeDeliveryThreshold)) * 100);
  const hasFreeDelivery = amountNeeded <= 0;
  const totalCount = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={t.cart.title}
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={() => setIsCartOpen(false)}
        className="mobile-drawer-backdrop absolute inset-0 bg-[var(--scrim-dark)] backdrop-blur-xs"
      />

      {/* Slide-in Drawer anchored at inset-inline-end */}
      <div className="fixed inset-y-0 end-0 max-w-full flex ps-6 sm:ps-10">
        <div className="bag-drawer-panel w-screen max-w-md bg-[var(--surface-card)] border-s border-[var(--line)] shadow-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="px-4 sm:px-5 py-3.5 border-b border-[var(--line)] bg-[var(--surface-card)] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-5 h-5 text-[var(--maroon-700)]" />
              <h2 className="font-heading text-xl font-semibold text-[var(--maroon-700)]">
                {t.cart.title} ({totalCount})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsCartOpen(false)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--maroon-700)] hover:bg-[var(--surface-page)] rounded-full transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-decor)]"
              aria-label={t.mobileMenu.closeMenu}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Delivery Progress Bar (track --gold-soft, fill --maroon-700 turning --gold-decor + Check icon) */}
          <div className="bg-[var(--surface-page)] px-4 sm:px-5 py-3 border-b border-[var(--line)] shrink-0">
            <div className="flex justify-between items-center gap-2 text-xs font-medium text-[var(--text-strong)] mb-1.5">
              <span className="leading-snug flex items-center gap-1.5">
                {hasFreeDelivery && (
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[var(--gold-decor)] text-[var(--maroon-900)] shrink-0">
                    <Check className="w-3 h-3 stroke-[2.5]" />
                  </span>
                )}
                <span>
                  {hasFreeDelivery
                    ? t.cart.freeShippingQualified
                    : t.cart.freeShippingAway.replace('{amount}', formatBHD(amountNeeded))}
                </span>
              </span>
              <span className="font-bold tabular-nums text-[var(--maroon-700)] shrink-0">
                {Math.round(progressPercent)}%
              </span>
            </div>
            <div className="w-full bg-[var(--gold-soft)] h-2 rounded-[var(--radius-pill)] overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-[var(--radius-pill)] ${
                  hasFreeDelivery ? 'bg-[var(--gold-decor)]' : 'bg-[var(--maroon-700)]'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-[var(--surface-card)]">
            {cart.length === 0 ? (
              <div className="py-16 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-[var(--surface-champagne)] border border-[var(--gold-decor)]/50 flex items-center justify-center text-[var(--maroon-700)]">
                  <ShoppingBag className="w-8 h-8 stroke-1" />
                </div>
                <h3 className="font-heading text-lg font-semibold text-[var(--maroon-700)]">
                  {t.cart.empty}
                </h3>
                <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto">
                  {t.cart.emptySub}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsCartOpen(false);
                    onContinueShopping();
                  }}
                  className="mt-2 min-h-[48px] bg-[var(--maroon-700)] hover:bg-[var(--maroon-600)] text-[var(--text-on-maroon)] px-7 py-3 text-xs font-semibold uppercase tracking-wider rounded-[var(--radius-pill)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-decor)]"
                >
                  {t.cart.startShopping}
                </button>
              </div>
            ) : (
              cart.map((item) => {
                const name =
                  language === 'ar'
                    ? item.product.nameAr
                    : language === 'ru' && item.product.nameRu
                      ? item.product.nameRu
                      : language === 'fr' && item.product.nameFr
                        ? item.product.nameFr
                        : item.product.nameEn;
                const unitPrice = item.product.salePrice ?? item.product.price;

                return (
                  <div
                    key={item.id}
                    className="flex gap-3 p-3 bg-[var(--surface-page)] rounded-[var(--radius-card)] border border-[var(--line)] shadow-xs"
                  >
                    <div className="w-20 h-24 bg-[var(--surface-card)] rounded-md overflow-hidden shrink-0 border border-[var(--line)]">
                      <img
                        src={
                          item.product.images?.[0] && item.product.images[0].trim() !== ''
                            ? item.product.images[0]
                            : '/images/hero_pic.jpeg'
                        }
                        alt={name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover object-center"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start gap-1">
                          <h4 className="font-heading text-sm font-semibold text-[var(--text-strong)] line-clamp-2 leading-snug text-start">
                            {name}
                          </h4>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id)}
                            className="min-w-[36px] min-h-[36px] -mt-1 -me-1 flex items-center justify-center text-[var(--red-600)] hover:text-[var(--red-700)] hover:bg-[var(--surface-blush)] transition-colors shrink-0 cursor-pointer rounded-full"
                            aria-label={`Remove ${name}`}
                            title={language === 'ar' ? 'إزالة' : 'Remove'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2 mt-1 text-[11px] text-[var(--text-muted)]">
                          <span>
                            {t.cart.size}: <strong className="text-[var(--text-strong)]">{item.size}</strong>
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <span
                              className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
                              style={{ backgroundColor: item.colorHex }}
                            />
                            <span className="truncate">{item.color}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--line)]">
                        <div className="inline-flex items-center border border-[var(--line)] rounded-[var(--radius-pill)] bg-[var(--surface-card)]">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="min-w-[36px] min-h-[36px] flex items-center justify-center hover:bg-[var(--surface-champagne)] text-[var(--text-strong)] transition-colors rounded-s-[var(--radius-pill)] cursor-pointer"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2.5 text-xs font-semibold tabular-nums text-[var(--text-strong)]">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="min-w-[36px] min-h-[36px] flex items-center justify-center hover:bg-[var(--surface-champagne)] text-[var(--text-strong)] transition-colors rounded-e-[var(--radius-pill)] cursor-pointer"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <span className="text-sm font-bold text-[var(--text-strong)] tabular-nums">
                          {formatBHD(unitPrice * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Sticky Bottom Footer & Checkout CTA */}
          {cart.length > 0 && (
            <div className="px-4 sm:px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-[var(--surface-card)] border-t border-[var(--line)] space-y-3 shrink-0 shadow-[var(--shadow-drawer)]">
              {/* Promo Code Input */}
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={couponCodeInput}
                    onChange={(e) => setCouponCodeInput(e.target.value)}
                    placeholder={
                      language === 'ar'
                        ? 'رمز القسيمة (مثال: WELCOME10)'
                        : language === 'ru'
                          ? 'Промокод (например: WELCOME10)'
                          : language === 'fr'
                            ? 'Code promo (ex. WELCOME10)'
                            : 'Promo Code (e.g. WELCOME10)'
                    }
                    className="token-input w-full min-h-[44px] ps-3 pe-9 text-base sm:text-xs border rounded-[var(--radius-pill)] uppercase font-mono"
                  />
                  <Tag className="w-4 h-4 absolute end-3 top-1/2 -translate-y-1/2 text-[var(--gold-text)] pointer-events-none" />
                </div>
                <button
                  type="submit"
                  className="min-h-[44px] px-4 bg-[var(--maroon-700)] hover:bg-[var(--maroon-600)] text-[var(--text-on-maroon)] text-xs font-semibold uppercase tracking-wider rounded-[var(--radius-pill)] transition-colors cursor-pointer shrink-0"
                >
                  {t.cart.apply}
                </button>
              </form>

              {couponMessage && (
                <div
                  role={couponMessage.error ? 'alert' : 'status'}
                  className={`text-xs px-3 py-2 rounded-lg border flex items-center gap-2 ${
                    couponMessage.error
                      ? 'bg-[var(--surface-blush)] border-[var(--red-600)] text-[var(--red-600)] font-medium'
                      : 'bg-[var(--surface-champagne)] border-[var(--gold-decor)] text-[var(--maroon-700)] font-medium'
                  }`}
                >
                  {couponMessage.error ? (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  ) : (
                    <Check className="w-4 h-4 shrink-0" />
                  )}
                  <span>{couponMessage.text}</span>
                </div>
              )}

              {appliedCoupon && (
                <div className="flex items-center justify-between bg-[var(--surface-champagne)] border border-[var(--gold-decor)]/60 px-3 py-1.5 rounded-[var(--radius-pill)] text-xs">
                  <span className="text-[var(--text-strong)] font-medium font-mono">
                    {appliedCoupon.code} (-
                    {appliedCoupon.type === 'percentage'
                      ? `${appliedCoupon.value}%`
                      : formatBHD(appliedCoupon.value)}
                    )
                  </span>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    className="text-[var(--red-600)] hover:text-[var(--red-700)] text-xs font-semibold underline cursor-pointer"
                  >
                    {language === 'ar' ? 'إزالة' : 'Remove'}
                  </button>
                </div>
              )}

              {/* Subtotal / Shipping / Total */}
              <div className="space-y-1.5 text-xs text-[var(--text-body)]">
                <div className="flex justify-between">
                  <span>{t.cart.subtotal}</span>
                  <span className="font-semibold text-[var(--text-strong)] tabular-nums">
                    {formatBHD(subtotal)}
                  </span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-[var(--maroon-700)]">
                    <span>{t.cart.discount}</span>
                    <span className="font-bold tabular-nums">-{formatBHD(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>{t.cart.shipping}</span>
                  <span className="font-semibold text-[var(--text-strong)] tabular-nums">
                    {shippingFee === 0 ? (
                      <span className="text-[var(--maroon-700)] font-bold">
                        {language === 'ar' ? 'مجاني' : 'FREE'}
                      </span>
                    ) : (
                      formatBHD(shippingFee)
                    )}
                  </span>
                </div>
                <div className="pt-2 border-t border-[var(--line)] flex justify-between text-sm font-bold text-[var(--text-strong)]">
                  <span>{t.cart.total}</span>
                  <span className="text-base text-[var(--maroon-700)] tabular-nums">
                    {formatBHD(total)}
                  </span>
                </div>
              </div>

              {(!currentUser || currentUser.isGuest || isGuest) && (
                <div className="bg-[var(--surface-champagne)] border border-[var(--gold-decor)] rounded-lg p-2.5 text-[11px] text-[var(--text-strong)] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[var(--gold-text)] shrink-0" />
                    <span>
                      {language === 'ar'
                        ? 'تتسوقين كزائر. يرجى إنشاء حساب لإتمام الطلب.'
                        : 'Shopping as Guest. Create an account before checkout.'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCartOpen(false);
                      openAuthModal('signup');
                    }}
                    className="text-[var(--maroon-700)] hover:text-[var(--maroon-600)] font-bold underline shrink-0 cursor-pointer text-[11px] uppercase"
                  >
                    {language === 'ar' ? 'إنشاء حساب' : 'Sign Up'}
                  </button>
                </div>
              )}

              {/* Primary Checkout CTA */}
              <button
                type="button"
                onClick={() => {
                  if (!currentUser || currentUser.isGuest || isGuest) {
                    setIsCartOpen(false);
                    openAuthModal('signup');
                  } else {
                    setIsCartOpen(false);
                    onNavigateCheckout();
                  }
                }}
                className="w-full min-h-[48px] bg-[var(--maroon-700)] hover:bg-[var(--maroon-600)] text-[var(--text-on-maroon)] font-semibold text-xs uppercase tracking-wider rounded-[var(--radius-pill)] shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-decor)]"
              >
                <span>
                  {!currentUser || currentUser.isGuest || isGuest
                    ? language === 'ar'
                      ? 'إنشاء حساب وإتمام الطلب'
                      : 'Create Account to Checkout'
                    : t.cart.checkout}
                </span>
                {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
