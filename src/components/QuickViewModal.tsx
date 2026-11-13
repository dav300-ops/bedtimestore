import React, { useState } from 'react';
import { Product, ProductSize } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { X, Heart, ShoppingBag, Check, ShieldCheck } from 'lucide-react';

interface QuickViewModalProps {
  product: Product | null;
  onClose: () => void;
  onViewDetails: (product: Product) => void;
}

export const QuickViewModal: React.FC<QuickViewModalProps> = ({
  product,
  onClose,
  onViewDetails,
}) => {
  const { language, formatBHD, t } = useLanguage();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useAuth();

  if (!product) return null;

  // Defaults
  const [selectedSize, setSelectedSize] = useState<ProductSize>(
    product.variants[0]?.size || 'S'
  );

  const uniqueColors = Array.from(
    new Map(
      product.variants.map((v) => [
        v.colorHex,
        { hex: v.colorHex, nameEn: v.colorNameEn, nameAr: v.colorNameAr },
      ])
    ).values()
  );

  const [selectedColor, setSelectedColor] = useState(
    uniqueColors[0] || { hex: 'var(--maroon-900)', nameEn: 'Standard', nameAr: 'افتراضي' }
  );

  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isAddedFeedback, setIsAddedFeedback] = useState(false);

  // Find variant stock
  const currentVariant = product.variants.find(
    (v) =>
      v.size === selectedSize &&
      (v.colorNameEn === selectedColor.nameEn || v.colorHex === selectedColor.hex)
  );

  const availableStock = currentVariant ? currentVariant.stock : 10;
  const isLowStock = availableStock > 0 && availableStock <= 4;
  const isOutOfStock = availableStock === 0;

  const displayName = language === 'ar' 
    ? product.nameAr 
    : language === 'ru' && product.nameRu 
      ? product.nameRu 
      : language === 'fr' && product.nameFr
        ? product.nameFr
        : product.nameEn;
  const displayDesc = language === 'ar' 
    ? product.descriptionAr 
    : language === 'ru' && product.descriptionRu 
      ? product.descriptionRu 
      : language === 'fr' && product.descriptionFr
        ? product.descriptionFr
        : product.descriptionEn;
  const isWishlisted = isInWishlist(product.id);

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    const result = addToCart(
      product,
      selectedSize,
      language === 'ar' ? selectedColor.nameAr : selectedColor.nameEn,
      selectedColor.hex,
      quantity
    );
    if (result.success) {
      setIsAddedFeedback(true);
      setTimeout(() => {
        setIsAddedFeedback(false);
        onClose();
      }, 900);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6">
      <div
        onClick={onClose}
        className="fixed inset-0 bg-[var(--scrim-dark)] backdrop-blur-xs transition-opacity"
      />

      <div className="relative bg-[var(--surface-card)] rounded-[var(--radius-card)] max-w-3xl w-full overflow-hidden shadow-[var(--shadow-soft)] z-10 border border-[var(--line)]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rtl:right-auto rtl:left-4 z-20 p-1.5 rounded-full bg-[var(--surface-card)]/90 hover:bg-[var(--surface-card)] text-[var(--text-strong)] hover:text-[var(--maroon-700)] transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          
          {/* Gallery View */}
          <div className="p-6 bg-[var(--surface-page)] flex flex-col justify-between border-b md:border-b-0 md:border-r rtl:md:border-r-0 rtl:md:border-l border-[var(--line)]">
            <div className="aspect-[3/4] bg-[var(--surface-card)] rounded-[calc(var(--radius-card)-4px)] overflow-hidden relative shadow-inner">
              <img
                src={(product.images?.[activeImageIndex] && product.images[activeImageIndex].trim() !== '')
                  ? product.images[activeImageIndex]
                  : ((product.images?.[0] && product.images[0].trim() !== '') ? product.images[0] : '/images/hero_pic.jpeg')}
                alt={displayName}
                className="w-full h-full object-cover object-center"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Thumbnails */}
            {product.images.length > 1 && (
              <div className="flex gap-2 mt-4">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-14 h-16 rounded-xs overflow-hidden border transition-all cursor-pointer ${
                      activeImageIndex === idx
                        ? 'border-[var(--maroon-700)] ring-1 ring-[var(--maroon-700)]'
                        : 'border-[var(--line)] opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={(img && img.trim() !== '') ? img : '/images/hero_pic.jpeg'} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Purchasing Controls */}
          <div className="p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              {/* Category & Title */}
              <div>
                <p className="text-xs uppercase font-semibold tracking-wider text-[var(--gold-text)] gold-text-rtl-weight">
                  {language === 'ar' ? product.categoryNameAr : product.categoryNameEn}
                </p>
                <h2 className="font-heading text-2xl font-semibold text-[var(--maroon-700)] mt-1">
                  {displayName}
                </h2>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3">
                {product.salePrice ? (
                  <>
                    <span className="text-2xl font-bold text-[var(--red-600)] tabular-nums">
                      {formatBHD(product.salePrice)}
                    </span>
                    <span className="text-sm text-[var(--text-muted)] line-through tabular-nums">
                      {formatBHD(product.price)}
                    </span>
                  </>
                ) : (
                  <span className="text-2xl font-bold text-[var(--text-strong)] tabular-nums">
                    {formatBHD(product.price)}
                  </span>
                )}
              </div>

              {/* Description & Material */}
              <p className="text-xs text-[var(--text-body)] line-clamp-3 leading-relaxed">
                {displayDesc}
              </p>

              {/* Color Selector */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-[var(--text-strong)]">{t.product.selectColor}:</span>
                  <span className="text-[var(--gold-text)] font-medium">
                    {language === 'ar' ? selectedColor.nameAr : selectedColor.nameEn}
                  </span>
                </div>
                <div className="flex gap-2">
                  {uniqueColors.map((color) => (
                    <button
                      key={color.hex}
                      onClick={() => setSelectedColor(color)}
                      className={`w-7 h-7 rounded-full border transition-all cursor-pointer ${
                        selectedColor.hex === color.hex
                          ? 'border-[var(--maroon-700)] ring-2 ring-[var(--maroon-700)] scale-110'
                          : 'border-[var(--line)] hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={language === 'ar' ? color.nameAr : color.nameEn}
                    />
                  ))}
                </div>
              </div>

              {/* Size Selector */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-[var(--text-strong)]">{t.product.selectSize}:</span>
                  {product.ageGroup && (
                    <span className="px-2 py-0.5 bg-[var(--surface-champagne)] text-[var(--gold-text)] border border-[var(--gold-decor)]/50 font-bold rounded-xs text-[10px]">
                      {language === 'ar' ? `عمر ${product.ageGroup} سنوات` : `Ages ${product.ageGroup}`}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(product.variants.length > 0
                    ? Array.from(new Set(product.variants.map((v) => v.size)))
                    : (['XS', 'S', 'M', 'L', 'XL'] as ProductSize[])
                  ).map((size) => {
                    const isSelected = selectedSize === size;
                    return (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`px-3.5 py-1.5 text-xs font-medium rounded-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[var(--maroon-700)] text-[var(--text-on-maroon)] border border-[var(--maroon-700)] font-bold shadow-xs'
                            : 'bg-[var(--surface-card)] text-[var(--text-strong)] border border-[var(--line)] hover:bg-[var(--surface-page)]'
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stock Status */}
              <div className="text-xs">
                {isOutOfStock ? (
                  <span className="text-[var(--red-600)] bg-[var(--surface-blush)] px-2.5 py-1 rounded-xs font-semibold inline-flex items-center gap-1.5">
                    ● {t.product.outOfStock}
                  </span>
                ) : isLowStock ? (
                  <span className="text-[var(--red-600)] bg-[var(--surface-blush)] px-2.5 py-1 rounded-xs font-semibold inline-flex items-center gap-1.5">
                    ● {t.product.lowStock.replace('{count}', String(availableStock))}
                  </span>
                ) : (
                  <span className="text-[var(--status-success)] font-medium inline-flex items-center gap-1.5">
                    ● {t.product.inStock}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-3 border-t border-[var(--line)]">
              <div className="flex items-center gap-3">
                {/* Quantity */}
                <div className="flex items-center border border-[var(--line)] rounded-xs bg-[var(--surface-card)]">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-2.5 py-2 text-[var(--text-strong)] hover:bg-[var(--surface-page)] cursor-pointer"
                  >
                    -
                  </button>
                  <span className="px-3 text-xs font-semibold tabular-nums text-[var(--text-strong)]">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}
                    className="px-2.5 py-2 text-[var(--text-strong)] hover:bg-[var(--surface-page)] cursor-pointer"
                  >
                    +
                  </button>
                </div>

                {/* Primary Add to Cart (Maroon) */}
                <button
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  className={`flex-1 py-3 px-4 font-semibold text-xs uppercase tracking-wider rounded-[var(--radius-pill)] shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isOutOfStock
                      ? 'bg-[var(--line)] text-[var(--text-muted)] cursor-not-allowed'
                      : isAddedFeedback
                      ? 'bg-[var(--status-success)] text-[var(--text-on-maroon)]'
                      : 'bg-[var(--maroon-700)] hover:bg-[var(--maroon-600)] text-[var(--text-on-maroon)]'
                  }`}
                >
                  {isAddedFeedback ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{t.product.addedToCart}</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      <span>{t.product.addToCart}</span>
                    </>
                  )}
                </button>

                {/* Wishlist */}
                <button
                  onClick={() => toggleWishlist(product.id)}
                  className={`p-3 rounded-full border transition-colors cursor-pointer ${
                    isWishlisted
                      ? 'bg-[var(--maroon-700)] text-[var(--text-on-maroon)] border-[var(--maroon-700)]'
                      : 'border-[var(--line)] text-[var(--text-strong)] hover:bg-[var(--surface-page)]'
                  }`}
                  aria-label="Wishlist"
                >
                  <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
                </button>
              </div>

              {/* Full details link */}
              <button
                onClick={() => {
                  onClose();
                  onViewDetails(product);
                }}
                className="w-full text-center text-xs text-[var(--text-strong)] underline hover:text-[var(--maroon-700)] transition-colors py-1 font-medium cursor-pointer"
              >
                {language === 'ar' ? 'عرض تفاصيل المنتج الكاملة' : 'View Full Product Details'}
              </button>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
