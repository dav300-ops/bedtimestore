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
    uniqueColors[0] || { hex: '#000', nameEn: 'Standard', nameAr: 'افتراضي' }
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
  const displayMaterial = language === 'ar' 
    ? product.materialAr 
    : language === 'ru' && product.materialRu 
      ? product.materialRu 
      : language === 'fr' && product.materialFr
        ? product.materialFr
        : product.materialEn;
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
        className="fixed inset-0 bg-[var(--color-text)]/60 backdrop-blur-xs transition-opacity"
      />

      <div className="relative bg-[var(--color-card)] rounded-sm max-w-3xl w-full overflow-hidden shadow-2xl z-10 border border-[var(--color-border)]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rtl:right-auto rtl:left-4 z-20 p-1.5 rounded-full bg-white/80 hover:bg-white text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          
          {/* Gallery View */}
          <div className="p-6 bg-[var(--color-bg)]/30 flex flex-col justify-between border-b md:border-b-0 md:border-r rtl:md:border-r-0 rtl:md:border-l border-[var(--color-border)]">
            <div className="aspect-[3/4] bg-[var(--color-card)] rounded-sm overflow-hidden relative shadow-inner">
              <img
                src={product.images[activeImageIndex] || product.images[0]}
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
                    className={`w-14 h-16 rounded-xs overflow-hidden border transition-all ${
                      activeImageIndex === idx
                        ? 'border-[var(--color-text)] ring-1 ring-[var(--color-text)]'
                        : 'border-[var(--color-border)] opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
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
                <p className="text-xs uppercase font-semibold tracking-wider text-[var(--color-accent)]">
                  {language === 'ar' ? product.categoryNameAr : product.categoryNameEn}
                </p>
                <h2 className="font-heading text-2xl font-semibold text-[var(--color-text)] mt-1">
                  {displayName}
                </h2>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3">
                {product.salePrice ? (
                  <>
                    <span className="text-2xl font-bold text-[var(--color-primary)] tabular-nums">
                      {formatBHD(product.salePrice)}
                    </span>
                    <span className="text-sm text-[var(--color-text)]/50 line-through tabular-nums">
                      {formatBHD(product.price)}
                    </span>
                  </>
                ) : (
                  <span className="text-2xl font-bold text-[var(--color-text)] tabular-nums">
                    {formatBHD(product.price)}
                  </span>
                )}
              </div>

              {/* Description & Material */}
              <p className="text-xs text-[var(--color-text)]/75 line-clamp-3 leading-relaxed">
                {displayDesc}
              </p>

              {/* Color Selector */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-[var(--color-text)]">{t.product.selectColor}:</span>
                  <span className="text-[var(--color-accent)] font-medium">
                    {language === 'ar' ? selectedColor.nameAr : selectedColor.nameEn}
                  </span>
                </div>
                <div className="flex gap-2">
                  {uniqueColors.map((color) => (
                    <button
                      key={color.hex}
                      onClick={() => setSelectedColor(color)}
                      className={`w-7 h-7 rounded-full border transition-all ${
                        selectedColor.hex === color.hex
                          ? 'border-[var(--color-text)] ring-2 ring-[var(--color-text)] scale-110'
                          : 'border-black/20 hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={language === 'ar' ? color.nameAr : color.nameEn}
                    />
                  ))}
                </div>
              </div>

              {/* Size Selector (selected state: Pastel Day fill with Black Bean border) */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-[var(--color-text)]">{t.product.selectSize}:</span>
                  {product.ageGroup && (
                    <span className="px-2 py-0.5 bg-[var(--color-accent)]/15 text-[var(--color-accent)] font-bold rounded-xs text-[10px]">
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
                        className={`px-3.5 py-1.5 text-xs font-medium rounded-xs transition-all ${
                          isSelected
                            ? 'bg-[var(--color-border)] text-[var(--color-text)] border border-[var(--color-text)] font-bold shadow-xs'
                            : 'bg-white text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-bg)]'
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stock Status (Rural Green for in stock, Scarlet for low stock) */}
              <div className="text-xs">
                {isOutOfStock ? (
                  <span className="text-[var(--color-primary)] font-semibold flex items-center gap-1.5">
                    ● {t.product.outOfStock}
                  </span>
                ) : isLowStock ? (
                  <span className="text-[var(--color-primary)] font-semibold flex items-center gap-1.5">
                    ● {t.product.lowStock.replace('{count}', String(availableStock))}
                  </span>
                ) : (
                  <span className="text-[var(--color-accent)] font-medium flex items-center gap-1.5">
                    ● {t.product.inStock}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-3 border-t border-[var(--color-border)]">
              <div className="flex items-center gap-3">
                {/* Quantity */}
                <div className="flex items-center border border-[var(--color-border)] rounded-xs bg-white">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-2.5 py-2 text-[var(--color-text)] hover:bg-[var(--color-bg)]"
                  >
                    -
                  </button>
                  <span className="px-3 text-xs font-semibold tabular-nums text-[var(--color-text)]">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}
                    className="px-2.5 py-2 text-[var(--color-text)] hover:bg-[var(--color-bg)]"
                  >
                    +
                  </button>
                </div>

                {/* Primary Add to Cart (Scarlet) */}
                <button
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  className={`flex-1 py-3 px-4 font-semibold text-xs uppercase tracking-wider rounded-xs shadow-md transition-all flex items-center justify-center gap-2 ${
                    isOutOfStock
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : isAddedFeedback
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white'
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
                  className={`p-3 rounded-xs border transition-colors ${
                    isWishlisted
                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                      : 'border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-bg)]'
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
                className="w-full text-center text-xs text-[var(--color-text)] underline hover:text-[var(--color-primary)] transition-colors py-1 font-medium"
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
