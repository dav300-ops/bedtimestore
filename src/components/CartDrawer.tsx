import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { X, Trash2, Plus, Minus, ArrowRight, ArrowLeft, Tag, ShoppingBag, Lock, UserCheck } from 'lucide-react';

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
    total,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
  } = useCart();

  const { language, formatBHD, t, isRtl } = useLanguage();
  const { currentUser, isGuest, openAuthModal } = useAuth();
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponMessage, setCouponMessage] = useState<{ text: string; error: boolean } | null>(null);

  if (!isCartOpen) return null;

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCodeInput.trim()) return;
    const res = useCart; // closure reference
    const result = applyCoupon(couponCodeInput);
    if (result.success) {
      setCouponMessage({ text: result.message, error: false });
      setCouponCodeInput('');
    } else {
      setCouponMessage({ text: result.message, error: true });
    }
  };

  // Free shipping threshold: 25.000 BHD
  const freeShippingThreshold = 25.000;
  const amountNeeded = Math.max(0, freeShippingThreshold - subtotal);
  const progressPercent = Math.min(100, (subtotal / freeShippingThreshold) * 100);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={() => setIsCartOpen(false)}
        className="absolute inset-0 bg-[var(--color-text)]/50 backdrop-blur-xs transition-opacity duration-300"
      />

      <div className={`fixed inset-y-0 ${isRtl ? 'left-0' : 'right-0'} max-w-full flex pl-10 rtl:pl-0 rtl:pr-10`}>
        <div className="w-screen max-w-md bg-[var(--color-bg)] border-l rtl:border-l-0 rtl:border-r border-[var(--color-border)] shadow-2xl flex flex-col">
          
          {/* Drawer Header */}
          <div className="p-5 border-b border-[var(--color-border)] bg-[var(--color-card)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[var(--color-primary)]" />
              <h2 className="font-heading text-xl font-semibold text-[var(--color-text)]">
                {t.cart.title} ({cart.reduce((s, i) => s + i.quantity, 0)})
              </h2>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-1.5 text-[var(--color-text)] hover:text-[var(--color-primary)] rounded-full hover:bg-[var(--color-bg)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              aria-label="Close Bag"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Complimentary Shipping Progress Banner */}
          <div className="bg-[var(--color-card)]/70 px-5 py-3 border-b border-[var(--color-border)]">
            <div className="flex justify-between text-xs font-medium text-[var(--color-text)] mb-1.5">
              <span>
                {amountNeeded <= 0
                  ? t.cart.freeShippingQualified
                  : t.cart.freeShippingAway.replace('{amount}', formatBHD(amountNeeded))}
              </span>
              <span className="font-bold tabular-nums">{Math.round(progressPercent)}%</span>
            </div>
            <div className="w-full bg-[var(--color-bg)] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[var(--color-primary)] h-full transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {cart.length === 0 ? (
              <div className="py-16 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-[var(--color-card)] flex items-center justify-center text-[var(--color-primary)]">
                  <ShoppingBag className="w-8 h-8 stroke-1" />
                </div>
                <h3 className="font-heading text-lg font-semibold text-[var(--color-text)]">
                  {t.cart.empty}
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] max-w-xs mx-auto">
                  {t.cart.emptySub}
                </p>
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    onContinueShopping();
                  }}
                  className="mt-2 bg-[var(--color-primary)] text-white px-5 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-[var(--color-primary-hover)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                >
                  {t.cart.startShopping}
                </button>
              </div>
            ) : (
              cart.map((item) => {
                const name = language === 'ar' ? item.product.nameAr : item.product.nameEn;
                const unitPrice = item.product.salePrice ?? item.product.price;

                return (
                  <div
                    key={item.id}
                    className="flex gap-4 p-3 bg-[var(--color-card)] rounded-sm border border-[var(--color-border)] shadow-xs"
                  >
                    {/* Item Image */}
                    <div className="w-20 h-24 bg-white rounded-xs overflow-hidden shrink-0">
                      <img
                        src={item.product.images[0]}
                        alt={name}
                        className="w-full h-full object-cover object-center"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    {/* Item Details */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <h4 className="font-heading text-sm font-semibold text-[var(--color-text)] line-clamp-1">
                            {name}
                          </h4>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors ml-2"
                            aria-label="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Selected Variants */}
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-[var(--color-text-secondary)]">
                          <span>{t.cart.size}: <strong className="text-[var(--color-text)]">{item.size}</strong></span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <span
                              className="w-2.5 h-2.5 rounded-full border border-black/20"
                              style={{ backgroundColor: item.colorHex }}
                            />
                            {item.color}
                          </span>
                        </div>
                      </div>

                      {/* Quantity & Unit Price */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--color-border)]/40">
                        <div className="flex items-center border border-[var(--color-border)] rounded-xs bg-[var(--color-bg)]">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1 hover:bg-[var(--color-card)] text-[var(--color-text)] transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2.5 text-xs font-semibold tabular-nums text-[var(--color-text)]">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1 hover:bg-[var(--color-card)] text-[var(--color-text)] transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <span className="text-xs font-bold text-[var(--color-text)] tabular-nums">
                          {formatBHD(unitPrice * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer & Checkout Area */}
          {cart.length > 0 && (
            <div className="p-5 bg-[var(--color-card)] border-t border-[var(--color-border)] space-y-3.5">
              
              {/* Promo Code Input */}
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={couponCodeInput}
                    onChange={(e) => setCouponCodeInput(e.target.value)}
                    placeholder={language === 'ar' ? 'رمز القسيمة (مثال: WELCOME10)' : 'Promo Code (e.g. WELCOME10)'}
                    className="w-full px-3 py-2 text-xs bg-white border border-[var(--color-border)] rounded-xs text-[var(--color-text)] uppercase font-mono focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                  />
                  <Tag className="w-3.5 h-3.5 absolute right-2.5 rtl:right-auto rtl:left-2.5 top-2.5 text-[var(--color-accent)]" />
                </div>
                <button
                  type="submit"
                  className="px-3 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold uppercase tracking-wider rounded-xs transition-colors cursor-pointer"
                >
                  {t.cart.apply}
                </button>
              </form>

              {/* Coupon status / remove */}
              {couponMessage && (
                <p className={`text-[11px] ${couponMessage.error ? 'text-[var(--color-primary)]' : 'text-[var(--color-accent)]'}`}>
                  {couponMessage.text}
                </p>
              )}
              {appliedCoupon && (
                <div className="flex items-center justify-between bg-[var(--color-bg)] px-2.5 py-1 rounded-xs text-xs">
                  <span className="text-[var(--color-text)] font-medium font-mono">
                    {appliedCoupon.code} (-{appliedCoupon.type === 'percentage' ? `${appliedCoupon.value}%` : formatBHD(appliedCoupon.value)})
                  </span>
                  <button
                    onClick={removeCoupon}
                    className="text-[var(--color-primary)] text-[10px] font-semibold underline hover:text-[var(--color-text)]"
                  >
                    {language === 'ar' ? 'إزالة' : 'Remove'}
                  </button>
                </div>
              )}

              {/* Cost Calculations */}
              <div className="space-y-1.5 text-xs text-[var(--color-text-secondary)] pt-1">
                <div className="flex justify-between">
                  <span>{t.cart.subtotal}</span>
                  <span className="font-semibold text-[var(--color-text)] tabular-nums">{formatBHD(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-[var(--color-primary)]">
                    <span>{t.cart.discount}</span>
                    <span className="font-bold tabular-nums">-{formatBHD(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>{t.cart.shipping}</span>
                  <span className="font-semibold text-[var(--color-text)] tabular-nums">
                    {shippingFee === 0 ? (
                      <span className="text-[var(--color-primary)] font-bold">
                        {language === 'ar' ? 'مجاني' : 'FREE'}
                      </span>
                    ) : (
                      formatBHD(shippingFee)
                    )}
                  </span>
                </div>
                <div className="pt-2 border-t border-[var(--color-border)] flex justify-between text-sm font-bold text-[var(--color-text)]">
                  <span>{t.cart.total}</span>
                  <span className="text-base text-[var(--color-text)] tabular-nums">{formatBHD(total)}</span>
                </div>
              </div>

              {/* Guest Notification / Account Requirement */}
              {(!currentUser || currentUser.isGuest || isGuest) && (
                <div className="bg-[var(--color-bg)] border border-[var(--color-gold)] rounded-xs p-2.5 text-[11px] text-[var(--color-text)] flex items-center justify-between gap-2 shadow-2xs">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[var(--color-gold)] shrink-0" />
                    <span>
                      {language === 'ar'
                        ? 'تتسوقين كزائر. يرجى إنشاء حساب لإتمام الطلب.'
                        : 'Shopping as Guest. You must create an account before checkout.'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCartOpen(false);
                      openAuthModal('signup');
                    }}
                    className="text-[var(--color-primary)] font-bold underline hover:text-[var(--color-text)] shrink-0 cursor-pointer text-[10px] uppercase tracking-wider"
                  >
                    {language === 'ar' ? 'إنشاء حساب' : 'Sign Up'}
                  </button>
                </div>
              )}

              {/* Proceed to Checkout Button */}
              <button
                onClick={() => {
                  if (!currentUser || currentUser.isGuest || isGuest) {
                    setIsCartOpen(false);
                    openAuthModal('signup');
                  } else {
                    setIsCartOpen(false);
                    onNavigateCheckout();
                  }
                }}
                className="w-full py-3.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold text-xs uppercase tracking-wider rounded-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]"
              >
                <span>
                  {!currentUser || currentUser.isGuest || isGuest
                    ? (language === 'ar' ? 'إنشاء حساب وإتمام الطلب' : 'Create Account to Checkout')
                    : t.cart.checkout}
                </span>
                {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </button>

              <button
                onClick={() => setIsCartOpen(false)}
                className="w-full text-center text-[11px] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
              >
                {t.cart.continueShopping}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
