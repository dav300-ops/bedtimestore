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
  const primaryImage = product.images?.[0] || '/images/hero_pic.jpeg';
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
      className="group bg-[var(--color-card)] rounded-[10px] overflow-hidden border border-[var(--color-border)] shadow-xs hover:shadow-md hover:border-[var(--color-gold)] transition-all duration-200 flex flex-col relative select-none"
    >
      {/* Whole Card Click Link (Accessible) */}
      <a
        href={`#product-${product.id}`}
        onClick={(e) => {
          e.preventDefault();
          onSelectProduct(product);
        }}
        aria-label={`${displayName} - ${formatBHD(product.salePrice || product.price)}`}
        className="block relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)] rounded-[10px]"
      >
        {/* Image Area: aspect-ratio 4/5 (approx 281 x 340 desktop), object-fit cover */}
        <div 
          className="relative aspect-[4/5] w-full bg-white overflow-hidden"
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
              className={`absolute bottom-3 left-3 rtl:left-auto rtl:right-3 px-1.5 py-0.5 rounded-[4px] bg-[var(--color-text)]/70 text-white text-[11px] font-medium leading-none transition-opacity duration-200 pointer-events-none ${
                isHovered ? 'opacity-0' : 'opacity-100'
              }`}
            >
              2
            </div>
          )}

          {/* Top-Left Badges: -X% or "New" with gold border */}
          <div className="absolute top-2 left-2 rtl:left-auto rtl:right-2 z-10 flex flex-col gap-1 pointer-events-none">
            {hasDiscount ? (
              <span
                className="bg-[var(--color-primary)] text-white text-[12px] font-semibold px-2 py-0.5 rounded-[4px] shadow-xs uppercase tracking-wider border border-[var(--color-gold)]/40"
              >
                -{discountPercent}%
              </span>
            ) : product.newArrival ? (
              <span
                className="bg-[var(--color-primary)] text-white text-[12px] font-semibold px-2 py-0.5 rounded-[4px] shadow-xs uppercase tracking-wider border border-[var(--color-gold)]/40"
              >
                {language === 'ar' ? 'جديد' : language === 'ru' ? 'Новинка' : language === 'fr' ? 'Nouveau' : 'New'}
              </span>
            ) : null}
          </div>

          {/* Top-Right: Wishlist Heart Button with gold-accent border */}
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
            className="absolute top-2 right-2 rtl:right-auto rtl:left-2 z-20 w-[44px] h-[44px] rounded-full bg-[var(--color-card)]/90 backdrop-blur-xs border border-[var(--color-gold)]/40 hover:border-[var(--color-gold)] shadow-sm flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]"
            title={language === 'ar' ? 'المفضلة' : language === 'ru' ? 'Избранное' : language === 'fr' ? 'Favoris' : 'Wishlist'}
          >
            <Heart
              className={`w-5 h-5 transition-colors ${
                isWishlisted
                  ? 'fill-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]'
              }`}
            />
          </button>

          {/* Bottom Action: Out of Stock label OR "+ Quick add" button */}
          {isOutOfStock ? (
            <div
              className="absolute inset-x-3 bottom-3 z-20 h-[44px] rounded-[8px] bg-[var(--color-card)]/90 text-[var(--color-text-secondary)] text-[14px] font-semibold flex items-center justify-center select-none cursor-not-allowed border border-[var(--color-border)]"
            >
              {language === 'ar' ? 'نفدت الكمية' : language === 'ru' ? 'Распродано' : language === 'fr' ? 'Épuisé' : 'Sold out'}
            </div>
          ) : (
            <>
              {/* Full-width "+ Quick add" button */}
              <button
                type="button"
                onClick={handleDirectQuickAdd}
                className={`absolute inset-x-3 bottom-3 z-20 h-[44px] rounded-[8px] px-4 text-[14px] font-semibold transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                  isSingleAddedFeedback
                    ? 'bg-[var(--color-primary-hover)] text-white'
                    : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white'
                }`}
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
          className="p-[14px_16px_16px] flex flex-col gap-[6px] bg-[var(--color-card)] text-left rtl:text-right"
        >
          {/* Category Label */}
          <span 
            className="text-[12px] uppercase tracking-[0.08em] font-medium truncate text-[var(--color-text-secondary)]"
          >
            {displayCategory}
          </span>

          {/* Product Name */}
          <h3 
            className="font-serif text-[17px] font-semibold leading-snug line-clamp-1 text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors"
            style={{ 
              fontFamily: '"Cormorant Garamond", Georgia, serif'
            }}
          >
            {displayName}
          </h3>

          {/* Color Swatches */}
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
                    ? 'border-[var(--color-primary)] ring-1 ring-[var(--color-primary)] scale-110'
                    : 'border-[var(--color-border)] hover:scale-105'
                }`}
                style={{
                  backgroundColor: color.hex,
                }}
              />
            ))}

            {uniqueColors.length > 0 && (
              <span 
                className="text-[12px] font-normal ml-1 rtl:ml-0 rtl:mr-1 text-[var(--color-text-secondary)]"
              >
                {uniqueColors.length} {language === 'ar' ? 'ألوان' : language === 'ru' ? 'оттенка' : language === 'fr' ? 'nuances' : 'shades'}
              </span>
            )}
          </div>

          {/* Divider */}
          <div 
            className="h-[1px] w-full my-0.5 bg-[var(--color-border)]" 
          />

          {/* Price & Rating Row */}
          <div className="flex items-baseline justify-between pt-0.5">
            {/* Left: Prices in main text color */}
            <div className="flex items-baseline gap-2">
              {hasDiscount ? (
                <>
                  <span 
                    className="text-[17px] font-bold tabular-nums text-[var(--color-text)]"
                  >
                    {formatBHD(product.salePrice!)}
                  </span>
                  <span 
                    className="text-[13px] line-through tabular-nums text-[var(--color-text-secondary)]"
                  >
                    {formatBHD(product.price)}
                  </span>
                </>
              ) : (
                <span 
                  className="text-[17px] font-bold tabular-nums text-[var(--color-text)]"
                >
                  {formatBHD(product.price)}
                </span>
              )}
            </div>

            {/* Right: Reviews with gold star */}
            {typeof product.rating === 'number' && typeof product.reviewCount === 'number' && product.reviewCount > 0 && (
              <div 
                className="text-[13px] font-normal tabular-nums flex items-center gap-1 shrink-0 text-[var(--color-text-secondary)]"
              >
                <span className="text-[var(--color-gold)]">★</span>
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
