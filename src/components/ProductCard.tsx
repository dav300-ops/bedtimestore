import React, { useState, useMemo, memo } from 'react';
import { Product, ProductSize } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Heart, Check, ShoppingBag, Eye } from 'lucide-react';
import { QuickAddPopover } from './QuickAddPopover';

interface ProductCardProps {
  product: Product;
  onSelectProduct: (product: Product) => void;
  onQuickView?: (product: Product) => void;
  onOpenAlbumModal?: (product: Product, initialIndex?: number) => void;
}

export const ProductCard: React.FC<ProductCardProps> = memo(({
  product,
  onSelectProduct,
  onQuickView,
  onOpenAlbumModal,
}) => {
  const { language, formatBHD } = useLanguage();
  const { toggleWishlist, isInWishlist } = useAuth();
  const { addToCart } = useCart();

  const [isHovered, setIsHovered] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [justAddedSize, setJustAddedSize] = useState<string | null>(null);
  const [isSingleAddedFeedback, setIsSingleAddedFeedback] = useState(false);
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);

  const isWishlisted = isInWishlist(product.id);
  const displayName = language === 'ar' 
    ? product.nameAr 
    : language === 'ru' && product.nameRu 
      ? product.nameRu 
      : language === 'fr' && (product as any).nameFr
        ? (product as any).nameFr
        : product.nameEn;
  const displayCategory = language === 'ar' 
    ? product.categoryNameAr 
    : language === 'ru' && product.categoryNameRu 
      ? product.categoryNameRu 
      : language === 'fr' && (product as any).categoryNameFr
        ? (product as any).categoryNameFr
        : product.categoryNameEn;

  // Extract unique colors from variants
  const uniqueColors = useMemo(() => {
    return Array.from(
      new Map(
        product.variants.map((v) => [
          v.colorHex,
          { hex: v.colorHex, nameEn: v.colorNameEn, nameAr: v.colorNameAr },
        ])
      ).values()
    );
  }, [product.variants]);

  const activeColor = uniqueColors[selectedColorIndex] || uniqueColors[0] || {
    hex: '#340404',
    nameEn: 'Standard',
    nameAr: 'الأساسي',
  };

  // Discount calculation
  const hasDiscount = Boolean(product.salePrice && product.salePrice < product.price);
  const discountPercent = hasDiscount
    ? Math.round(((product.price - product.salePrice!) / product.price) * 100)
    : 0;

  // Stock evaluation
  const totalStock = useMemo(() => {
    if (!product.variants || product.variants.length === 0) return 99;
    return product.variants.reduce((acc, v) => acc + (v.stock || 0), 0);
  }, [product.variants]);

  const isOutOfStock = totalStock <= 0;

  // Distinct sizes available
  const distinctSizes = useMemo(() => {
    const set = new Set<ProductSize>();
    product.variants.forEach((v) => {
      if (v.stock > 0) set.add(v.size);
    });
    return Array.from(set);
  }, [product.variants]);

  // Image handling
  const hasSecondImage = Boolean(product.images && product.images[1]);
  const primaryImage = product.images?.[0] || '/images/hero_luxury_sleepwear_1791490145358.jpg';
  const secondaryImage = product.images?.[1] || primaryImage;

  // Direct quick add for single variant / free size
  const handleDirectQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isOutOfStock) return;

    if (distinctSizes.length > 1) {
      setIsQuickAddOpen(true);
      return;
    }

    const targetSize = distinctSizes[0] || product.variants[0]?.size || 'M';
    addToCart(
      product,
      targetSize,
      language === 'ar' ? activeColor.nameAr : activeColor.nameEn,
      activeColor.hex,
      1
    );

    setIsSingleAddedFeedback(true);
    setTimeout(() => setIsSingleAddedFeedback(false), 1400);
  };

  const handleSizeSelectFromPopover = (size: ProductSize) => {
    addToCart(
      product,
      size,
      language === 'ar' ? activeColor.nameAr : activeColor.nameEn,
      activeColor.hex,
      1
    );

    setJustAddedSize(size);
    setTimeout(() => {
      setJustAddedSize(null);
      setIsQuickAddOpen(false);
    }, 1100);
  };

  return (
    <div
      role="article"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsQuickAddOpen(false);
      }}
      className="group bg-white rounded-[10px] overflow-hidden border border-[#CFC3C6]/60 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col relative select-none"
      style={{
        borderRadius: '10px',
        borderColor: 'var(--border-shop, #CFC3C6)',
      }}
    >
      {/* Whole Card Click Link (Accessible) */}
      <a
        href={`#product-${product.id}`}
        onClick={(e) => {
          e.preventDefault();
          onSelectProduct(product);
        }}
        aria-label={`${displayName} - ${formatBHD(product.salePrice || product.price)}`}
        className="block relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B3261E] rounded-[10px]"
      >
        {/* Image Area: aspect-ratio 4/5 (approx 281 x 340 desktop), object-fit cover */}
        <div 
          className="relative aspect-[4/5] w-full bg-[#FAF5F3] overflow-hidden"
          style={{ aspectRatio: '4/5' }}
        >
          {/* Main Primary Image */}
          <img
            src={primaryImage}
            alt={displayName}
            width={281}
            height={340}
            loading="lazy"
            referrerPolicy="no-referrer"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              isOutOfStock ? 'opacity-50 grayscale-[20%]' : ''
            } ${hasSecondImage && isHovered ? 'opacity-0' : 'opacity-100'}`}
          />

          {/* Crossfade Secondary Image on Hover */}
          {hasSecondImage && (
            <img
              src={secondaryImage}
              alt={`${displayName} - alternate view`}
              width={281}
              height={340}
              loading="lazy"
              referrerPolicy="no-referrer"
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                isOutOfStock ? 'opacity-50 grayscale-[20%]' : ''
              } ${isHovered ? 'opacity-100' : 'opacity-0'}`}
            />
          )}

          {/* Image count badge: small "2" badge, drops on hover when crossfading */}
          {hasSecondImage && (
            <div
              className={`absolute bottom-3 left-3 rtl:left-auto rtl:right-3 px-1.5 py-0.5 rounded-[4px] bg-black/60 text-white text-[11px] font-medium leading-none transition-opacity duration-200 pointer-events-none ${
                isHovered ? 'opacity-0' : 'opacity-100'
              }`}
            >
              2
            </div>
          )}

          {/* Top-Left Badges: -X% on #B3261E or "New" on #6B1E3F */}
          <div className="absolute top-2 left-2 rtl:left-auto rtl:right-2 z-10 flex flex-col gap-1 pointer-events-none">
            {hasDiscount ? (
              <span
                className="bg-[#B3261E] text-white text-[12px] font-semibold px-2 py-0.5 rounded-[4px] shadow-xs uppercase tracking-wider"
                style={{ backgroundColor: 'var(--sale-red, #B3261E)' }}
              >
                -{discountPercent}%
              </span>
            ) : product.newArrival ? (
              <span
                className="bg-[#6B1E3F] text-white text-[12px] font-semibold px-2 py-0.5 rounded-[4px] shadow-xs uppercase tracking-wider"
                style={{ backgroundColor: 'var(--brand-burgundy, #6B1E3F)' }}
              >
                {language === 'ar' ? 'جديد' : language === 'ru' ? 'Новинка' : language === 'fr' ? 'Nouveau' : 'New'}
              </span>
            ) : null}
          </div>

          {/* Top-Right: Wishlist Heart Button (44x44px white circle, burgundy icon, 8px from corner) */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleWishlist(product.id);
            }}
            aria-label={isWishlisted 
              ? (language === 'ar' ? 'إزالة من المفضلة' : language === 'ru' ? 'Удалить из избранного' : language === 'fr' ? 'Retirer des favoris' : 'Remove from wishlist') 
              : (language === 'ar' ? 'إضافة إلى المفضلة' : language === 'ru' ? 'Добавить в избранное' : language === 'fr' ? 'Ajouter aux favoris' : 'Add to wishlist')}
            aria-pressed={isWishlisted}
            className="absolute top-2 right-2 rtl:right-auto rtl:left-2 z-20 w-[44px] h-[44px] rounded-full bg-white shadow-sm flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B3261E]"
            title={language === 'ar' ? 'المفضلة' : language === 'ru' ? 'Избранное' : language === 'fr' ? 'Favoris' : 'Wishlist'}
          >
            <Heart
              className={`w-5 h-5 transition-colors ${
                isWishlisted
                  ? 'fill-[#6B1E3F] text-[#6B1E3F]'
                  : 'text-[#6B1E3F] hover:text-[#B3261E]'
              }`}
              style={{
                color: 'var(--brand-burgundy, #6B1E3F)',
                fill: isWishlisted ? 'var(--brand-burgundy, #6B1E3F)' : 'none',
              }}
            />
          </button>

          {/* Bottom Action: Out of Stock label OR "+ Quick add" button */}
          {isOutOfStock ? (
            <div
              className="absolute inset-x-3 bottom-3 z-20 h-[44px] rounded-[8px] bg-white/90 text-[#5F5357] text-[14px] font-semibold flex items-center justify-center select-none cursor-not-allowed border border-[#CFC3C6]"
            >
              {language === 'ar' ? 'نفدت الكمية' : language === 'ru' ? 'Распродано' : language === 'fr' ? 'Épuisé' : 'Sold out'}
            </div>
          ) : (
            <>
              {/* Full-width "+ Quick add" button (44px tall, inset 12px, bg rgba(255,255,255,.95), text #2A1A20 14px weight 600, radius 8px) */}
              <button
                type="button"
                onClick={handleDirectQuickAdd}
                className={`absolute inset-x-3 bottom-3 z-20 h-[44px] rounded-[8px] px-4 text-[14px] font-semibold transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B3261E] ${
                  isSingleAddedFeedback
                    ? 'bg-[#6B1E3F] text-white'
                    : 'bg-white/95 hover:bg-white text-[#2A1A20] hover:text-[#6B1E3F] border border-[#CFC3C6]/60 hover:border-[#6B1E3F]'
                }`}
                style={{
                  color: isSingleAddedFeedback ? '#FFFFFF' : 'var(--text-shop-main, #2A1A20)',
                }}
              >
                {isSingleAddedFeedback ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>{language === 'ar' ? 'تمت الإضافة ✓' : language === 'ru' ? 'В корзине ✓' : language === 'fr' ? 'Ajouté ✓' : 'Added to bag ✓'}</span>
                  </>
                ) : (
                  <>
                    <span className="text-base leading-none font-bold">+</span>
                    <span>{language === 'ar' ? 'إضافة سريعة' : language === 'ru' ? 'В корзину' : language === 'fr' ? 'Ajout rapide' : 'Quick add'}</span>
                  </>
                )}
              </button>

              {/* Popover for products with multiple sizes */}
              {isQuickAddOpen && (
                <QuickAddPopover
                  product={product}
                  selectedColorHex={activeColor.hex}
                  onSelectSize={handleSizeSelectFromPopover}
                  onClose={() => setIsQuickAddOpen(false)}
                  justAddedSize={justAddedSize}
                />
              )}
            </>
          )}
        </div>

        {/* Content Below Image: padding 14px 16px 16px, 6px vertical gaps */}
        <div 
          className="p-[14px_16px_16px] flex flex-col gap-[6px] bg-white text-left rtl:text-right"
        >
          {/* Category Label: 12px uppercase, letter-spacing .08em, #5F5357 */}
          <span 
            className="text-[12px] uppercase tracking-[0.08em] font-medium truncate"
            style={{ color: 'var(--text-shop-secondary, #5F5357)' }}
          >
            {displayCategory}
          </span>

          {/* Product Name: serif 17px, #2A1A20 */}
          <h3 
            className="font-serif text-[17px] font-semibold leading-snug line-clamp-1 group-hover:text-[#6B1E3F] transition-colors"
            style={{ 
              fontFamily: '"Cormorant Garamond", Georgia, serif',
              color: 'var(--text-shop-main, #2A1A20)'
            }}
          >
            {displayName}
          </h3>

          {/* Color Swatches: 16px circles with 1px #CFC3C6 border, plus "N shades" in 12px #5F5357 */}
          <div 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="flex items-center gap-1.5 py-0.5"
          >
            {uniqueColors.slice(0, 5).map((color, idx) => (
              <button
                key={color.hex}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedColorIndex(idx);
                }}
                aria-label={language === 'ar' ? color.nameAr : color.nameEn}
                className={`w-[16px] h-[16px] rounded-full border transition-all cursor-pointer ${
                  selectedColorIndex === idx
                    ? 'border-[#2A1A20] ring-1 ring-[#2A1A20] scale-110'
                    : 'border-[#CFC3C6] hover:scale-105'
                }`}
                style={{
                  backgroundColor: color.hex,
                  borderColor: selectedColorIndex === idx ? 'var(--text-shop-main, #2A1A20)' : 'var(--border-shop, #CFC3C6)',
                }}
              />
            ))}

            {uniqueColors.length > 0 && (
              <span 
                className="text-[12px] font-normal ml-1 rtl:ml-0 rtl:mr-1"
                style={{ color: 'var(--text-shop-secondary, #5F5357)' }}
              >
                {uniqueColors.length} {language === 'ar' ? 'ألوان' : language === 'ru' ? 'оттенка' : language === 'fr' ? 'nuances' : 'shades'}
              </span>
            )}
          </div>

          {/* 1px #EEE4E4 Divider */}
          <div 
            className="h-[1px] w-full my-0.5" 
            style={{ backgroundColor: 'var(--divider-shop, #EEE4E4)' }} 
          />

          {/* Price & Rating Row */}
          <div className="flex items-baseline justify-between pt-0.5">
            {/* Left: Current price bold 17px (#B3261E on sale, #2A1A20 otherwise), original price struck through 13px #5F5357 */}
            <div className="flex items-baseline gap-2">
              {hasDiscount ? (
                <>
                  <span 
                    className="text-[17px] font-bold tabular-nums"
                    style={{ color: 'var(--sale-red, #B3261E)' }}
                  >
                    {formatBHD(product.salePrice!)}
                  </span>
                  <span 
                    className="text-[13px] line-through tabular-nums"
                    style={{ color: 'var(--text-shop-secondary, #5F5357)' }}
                  >
                    {formatBHD(product.price)}
                  </span>
                </>
              ) : (
                <span 
                  className="text-[17px] font-bold tabular-nums"
                  style={{ color: 'var(--text-shop-main, #2A1A20)' }}
                >
                  {formatBHD(product.price)}
                </span>
              )}
            </div>

            {/* Right: "★ 4.9 (123)" at 13px #5F5357, with real rating and review count. Hide if no reviews */}
            {typeof product.rating === 'number' && typeof product.reviewCount === 'number' && product.reviewCount > 0 && (
              <div 
                className="text-[13px] font-normal tabular-nums flex items-center gap-1 shrink-0"
                style={{ color: 'var(--text-shop-secondary, #5F5357)' }}
              >
                <span className="text-[#8E7C49]">★</span>
                <span>{product.rating.toFixed(1)}</span>
                <span>({product.reviewCount})</span>
              </div>
            )}
          </div>
        </div>
      </a>
    </div>
  );
});

ProductCard.displayName = 'ProductCard';
