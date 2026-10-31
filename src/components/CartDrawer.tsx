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
        className="absolute inset-0 bg-[#340404]/50 backdrop-blur-xs transition-opacity duration-300"
      />

      <div className={`fixed inset-y-0 ${isRtl ? 'left-0' : 'right-0'} max-w-full flex pl-10 rtl:pl-0 rtl:pr-10`}>
        <div className="w-screen max-w-md bg-[#FBE7E3] border-l rtl:border-l-0 rtl:border-r border-[#E1D1E4] shadow-2xl flex flex-col">
          
          {/* Drawer Header */}
          <div className="p-5 border-b border-[#E1D1E4] bg-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#E22001]" />
              <h2 className="font-heading text-xl font-semibold text-[#340404]">
                {t.cart.title} ({cart.reduce((s, i) => s + i.quantity, 0)})
              </h2>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-1.5 text-[#340404] hover:text-[#E22001] rounded-full hover:bg-[#FBE7E3] transition-colors"
              aria-label="Close Bag"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Complimentary Shipping Progress Banner */}
          <div className="bg-[#E1D1E4]/70 px-5 py-3 border-b border-[#E1D1E4]">
            <div className="flex justify-between text-xs font-medium text-[#340404] mb-1.5">
              <span>
                {amountNeeded <= 0
                  ? t.cart.freeShippingQualified
                  : t.cart.freeShippingAway.replace('{amount}', formatBHD(amountNeeded))}
              </span>
              <span className="font-bold tabular-nums">{Math.round(progressPercent)}%</span>
            </div>
            <div className="w-full bg-white h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#8E7C49] h-full transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {cart.length === 0 ? (
              <div className="py-16 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-white flex items-center justify-center text-[#8E7C49]">
                  <ShoppingBag className="w-8 h-8 stroke-1" />
                </div>
                <h3 className="font-heading text-lg font-semibold text-[#340404]">
                  {t.cart.empty}
                </h3>
                <p className="text-xs text-[#340404]/70 max-w-xs mx-auto">
                  {t.cart.emptySub}
                </p>
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    onContinueShopping();
                  }}
                  className="mt-2 bg-[#E22001] text-white px-5 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-[#c01b01] transition-colors"
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
                    className="flex gap-4 p-3 bg-white rounded-sm border border-[#E1D1E4]/80 shadow-xs"
                  >
                    {/* Item Image */}
                    <div className="w-20 h-24 bg-[#FBE7E3] rounded-xs overflow-hidden shrink-0">
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
                          <h4 className="font-heading text-sm font-semibold text-[#340404] line-clamp-1">
                            {name}
                          </h4>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-[#340404]/40 hover:text-[#E22001] transition-colors ml-2"
                            aria-label="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Selected Variants */}
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-[#340404]/70">
                          <span>{t.cart.size}: <strong className="text-[#340404]">{item.size}</strong></span>
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
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#E1D1E4]/40">
                        <div className="flex items-center border border-[#E1D1E4] rounded-xs bg-white">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1 hover:bg-[#FBE7E3] text-[#340404] transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2.5 text-xs font-semibold tabular-nums text-[#340404]">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1 hover:bg-[#FBE7E3] text-[#340404] transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <span className="text-xs font-bold text-[#340404] tabular-nums">
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
            <div className="p-5 bg-white border-t border-[#E1D1E4] space-y-3.5">
              
              {/* Promo Code Input */}
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={couponCodeInput}
                    onChange={(e) => setCouponCodeInput(e.target.value)}
                    placeholder={language === 'ar' ? 'رمز القسيمة (مثال: WELCOME10)' : 'Promo Code (e.g. WELCOME10)'}
                    className="w-full px-3 py-2 text-xs bg-[#FBE7E3]/40 border border-[#E1D1E4] rounded-xs text-[#340404] uppercase font-mono focus:outline-none focus:ring-1 focus:ring-[#E22001]"
                  />
                  <Tag className="w-3.5 h-3.5 absolute right-2.5 rtl:right-auto rtl:left-2.5 top-2.5 text-[#8E7C49]" />
                </div>
                <button
                  type="submit"
                  className="px-3 py-2 bg-[#E1D1E4] hover:bg-[#d8c3dc] text-[#340404] text-xs font-semibold uppercase tracking-wider rounded-xs transition-colors"
                >
                  {t.cart.apply}
                </button>
              </form>

              {/* Coupon status / remove */}
              {couponMessage && (
                <p className={`text-[11px] ${couponMessage.error ? 'text-[#E22001]' : 'text-[#8E7C49]'}`}>
                  {couponMessage.text}
                </p>
              )}
              {appliedCoupon && (
                <div className="flex items-center justify-between bg-[#E1D1E4]/50 px-2.5 py-1 rounded-xs text-xs">
                  <span className="text-[#340404] font-medium font-mono">
                    {appliedCoupon.code} (-{appliedCoupon.type === 'percentage' ? `${appliedCoupon.value}%` : formatBHD(appliedCoupon.value)})
                  </span>
                  <button
                    onClick={removeCoupon}
                    className="text-[#E22001] text-[10px] font-semibold underline hover:text-[#340404]"
                  >
                    {language === 'ar' ? 'إزالة' : 'Remove'}
                  </button>
                </div>
              )}

              {/* Cost Calculations */}
              <div className="space-y-1.5 text-xs text-[#340404]/80 pt-1">
                <div className="flex justify-between">
                  <span>{t.cart.subtotal}</span>
                  <span className="font-semibold text-[#340404] tabular-nums">{formatBHD(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-[#E22001]">
                    <span>{t.cart.discount}</span>
                    <span className="font-bold tabular-nums">-{formatBHD(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>{t.cart.shipping}</span>
                  <span className="font-semibold text-[#340404] tabular-nums">
                    {shippingFee === 0 ? (
                      <span className="text-[#8E7C49] font-bold">
                        {language === 'ar' ? 'مجاني' : 'FREE'}
                      </span>
                    ) : (
                      formatBHD(shippingFee)
                    )}
                  </span>
                </div>
                <div className="pt-2 border-t border-[#E1D1E4] flex justify-between text-sm font-bold text-[#340404]">
                  <span>{t.cart.total}</span>
                  <span className="text-base text-[#340404] tabular-nums">{formatBHD(total)}</span>
                </div>
              </div>

              {/* Guest Notification / Account Requirement */}
              {(!currentUser || currentUser.isGuest || isGuest) && (
                <div className="bg-[#FBE7E3] border border-[#8E7C49]/40 rounded-xs p-2.5 text-[11px] text-[#340404] flex items-center justify-between gap-2 shadow-2xs">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#8E7C49] shrink-0" />
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
                    className="text-[#E22001] font-bold underline hover:text-black shrink-0 cursor-pointer text-[10px] uppercase tracking-wider"
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
                className="w-full py-3.5 bg-[#E22001] hover:bg-[#c01b01] text-white font-semibold text-xs uppercase tracking-wider rounded-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
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
                className="w-full text-center text-[11px] text-[#340404]/60 hover:text-[#340404] transition-colors"
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
