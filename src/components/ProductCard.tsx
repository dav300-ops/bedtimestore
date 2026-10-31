import React, { useState } from 'react';
import { Product } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Heart, Eye, ShoppingBag, Check, Images } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onQuickView: (product: Product) => void;
  onSelectProduct: (product: Product) => void;
  onOpenAlbumModal?: (product: Product, initialIndex?: number) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onQuickView,
  onSelectProduct,
  onOpenAlbumModal,
}) => {
  const { language, formatBHD, t } = useLanguage();
  const { toggleWishlist, isInWishlist } = useAuth();
  const { addToCart } = useCart();
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [isAddedFeedback, setIsAddedFeedback] = useState(false);

  const isWishlisted = isInWishlist(product.id);
  const displayName = language === 'ar' ? product.nameAr : product.nameEn;
  const displayCategory = language === 'ar' ? product.categoryNameAr : product.categoryNameEn;

  // Unique colors from variants
  const uniqueColors = Array.from(
    new Map(
      product.variants.map((v) => [
        v.colorHex,
        { hex: v.colorHex, nameEn: v.colorNameEn, nameAr: v.colorNameAr },
      ])
    ).values()
  );

  const selectedColor = uniqueColors[selectedColorIndex] || uniqueColors[0];

  // Has discount
  const hasDiscount = product.salePrice && product.salePrice < product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.price - product.salePrice!) / product.price) * 100)
    : 0;

  // Default first variant size
  const defaultSize = product.variants[0]?.size || 'S';

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(
      product,
      defaultSize,
      language === 'ar' ? selectedColor.nameAr : selectedColor.nameEn,
      selectedColor.hex,
      1
    );
    setIsAddedFeedback(true);
    setTimeout(() => setIsAddedFeedback(false), 1500);
  };

  return (
    <div
      onClick={() => onSelectProduct(product)}
      className="group relative flex flex-col bg-white border border-[#E1D1E4]/70 rounded-sm overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer"
    >
      {/* Visual Canvas (White background) */}
      <div className="relative aspect-[3/4] w-full bg-white overflow-hidden flex items-center justify-center p-3">
        {/* Main image with smooth fallback */}
        <img
          src={product.images[0]}
          alt={displayName}
          className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(e) => {
            // Graceful fallback to secondary image or neutral gradient
            if (product.images[1] && (e.currentTarget as HTMLImageElement).src !== product.images[1]) {
              (e.currentTarget as HTMLImageElement).src = product.images[1];
            }
          }}
        />

        {/* Status badges */}
        <div className="absolute top-3 left-3 rtl:left-auto rtl:right-3 flex flex-col gap-1 z-10">
          {hasDiscount && (
            <span className="bg-[#E22001] text-white text-[10px] font-bold px-2 py-0.5 tracking-wider uppercase rounded-xs shadow-sm">
              -{discountPercent}%
            </span>
          )}
          {product.newArrival && (
            <span className="bg-[#8E7C49] text-white text-[10px] font-semibold px-2 py-0.5 tracking-wider uppercase rounded-xs shadow-sm">
              {t.product.new}
            </span>
          )}
          {product.bestSeller && !product.newArrival && (
            <span className="bg-[#340404] text-white text-[10px] font-semibold px-2 py-0.5 tracking-wider uppercase rounded-xs shadow-sm">
              {t.product.bestseller}
            </span>
          )}
          {product.ageGroup && (
            <span className="bg-[#8E7C49] text-white text-[10px] font-bold px-2 py-0.5 tracking-wider uppercase rounded-xs shadow-sm">
              {language === 'ar' ? `عمر ${product.ageGroup} سنوات` : `Ages ${product.ageGroup}`}
            </span>
          )}
        </div>

        {/* Wishlist button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(product.id);
          }}
          className={`absolute top-3 right-3 rtl:right-auto rtl:left-3 p-2 rounded-full transition-all ${
            isWishlisted
              ? 'bg-[#E22001] text-white shadow-md'
              : 'bg-white/85 hover:bg-white text-[#340404] hover:text-[#E22001] shadow-sm'
          }`}
          aria-label="Toggle Wishlist"
        >
          <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
        </button>

        {/* Photos Count Badge */}
        {product.images && product.images.length > 1 && (
          <div 
            onClick={(e) => {
              if (onOpenAlbumModal) {
                e.stopPropagation();
                onOpenAlbumModal(product, 0);
              }
            }}
            className="absolute bottom-3 left-3 rtl:left-auto rtl:right-3 bg-black/65 hover:bg-[#340404] backdrop-blur-xs text-white text-[9px] font-mono font-medium px-2 py-0.5 rounded-xs flex items-center gap-1 z-10 cursor-pointer transition-colors shadow-xs"
            title={language === 'ar' ? `${product.images.length} صور في الألبوم` : `${product.images.length} photos in album`}
          >
            <Images className="w-3 h-3 text-[#8E7C49]" />
            <span>{product.images.length}</span>
          </div>
        )}

        {/* Hover Quick Action Drawer */}
        <div className="absolute inset-x-3 bottom-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onQuickView(product);
            }}
            className="flex-1 py-2 px-3 bg-white/95 hover:bg-white text-[#340404] border border-[#E1D1E4] text-xs font-medium uppercase tracking-wider rounded-xs shadow-md transition-colors flex items-center justify-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5 text-[#8E7C49]" />
            <span>{t.product.quickView}</span>
          </button>

          {/* Open Image Album Button */}
          {onOpenAlbumModal && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenAlbumModal(product, 0);
              }}
              className="p-2 bg-white/95 hover:bg-[#340404] text-[#340404] hover:text-[#FBE7E3] border border-[#E1D1E4] rounded-xs shadow-md transition-colors"
              title={language === 'ar' ? 'عرض ألبوم الصور' : 'Open Product Album'}
              aria-label="Open Product Album"
            >
              <Images className="w-4 h-4 text-[#8E7C49]" />
            </button>
          )}

          <button
            type="button"
            onClick={handleQuickAdd}
            className={`p-2 rounded-xs shadow-md transition-all ${
              isAddedFeedback
                ? 'bg-[#8E7C49] text-white'
                : 'bg-[#E22001] hover:bg-[#c01b01] text-white'
            }`}
            aria-label="Quick Add to Bag"
            title="Quick Add"
          >
            {isAddedFeedback ? (
              <Check className="w-4 h-4" />
            ) : (
              <ShoppingBag className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 flex flex-col flex-1 justify-between bg-white">
        <div className="space-y-1.5">
          {/* Subtle Category Kicker */}
          <p className="text-[11px] font-medium tracking-wider uppercase text-[#8E7C49]">
            {displayCategory}
          </p>

          {/* Product Name */}
          <h3 className="font-heading text-base font-semibold text-[#340404] line-clamp-1 group-hover:text-[#E22001] transition-colors">
            {displayName}
          </h3>

          {/* Color Dots */}
          {uniqueColors.length > 0 && (
            <div className="flex items-center gap-1.5 pt-1">
              {uniqueColors.map((color, idx) => (
                <button
                  key={color.hex}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedColorIndex(idx);
                  }}
                  className={`w-3.5 h-3.5 rounded-full border transition-all ${
                    selectedColorIndex === idx
                      ? 'border-[#340404] ring-1 ring-[#340404] scale-110'
                      : 'border-black/20 hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.hex }}
                  title={language === 'ar' ? color.nameAr : color.nameEn}
                  aria-label={color.nameEn}
                />
              ))}
              {uniqueColors.length > 1 && (
                <span className="text-[10px] text-[#340404]/60 ml-1 rtl:ml-0 rtl:mr-1">
                  {uniqueColors.length} {language === 'ar' ? 'ألوان' : 'shades'}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Price & Rating */}
        <div className="pt-3 mt-2 border-t border-[#E1D1E4]/50 flex items-baseline justify-between">
          <div className="flex items-baseline gap-2">
            {hasDiscount ? (
              <>
                <span className="text-sm sm:text-base font-bold text-[#E22001] tabular-nums">
                  {formatBHD(product.salePrice!)}
                </span>
                <span className="text-xs text-[#340404]/50 line-through tabular-nums">
                  {formatBHD(product.price)}
                </span>
              </>
            ) : (
              <span className="text-sm sm:text-base font-bold text-[#340404] tabular-nums">
                {formatBHD(product.price)}
              </span>
            )}
          </div>

          <div className="text-[11px] text-[#8E7C49] font-medium tabular-nums flex items-center gap-1">
            <span>★</span>
            <span>{product.rating}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
