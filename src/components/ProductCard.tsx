import React, { useState, useMemo, memo } from 'react';
import { Product, ProductSize } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Heart, Check } from 'lucide-react';
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
  const displayName =
    language === 'ar'
      ? product.nameAr
      : language === 'ru' && product.nameRu
        ? product.nameRu
        : language === 'fr' && product.nameFr
          ? product.nameFr
          : product.nameEn;

  const displayCategory =
    language === 'ar'
      ? product.categoryNameAr
      : language === 'ru' && product.categoryNameRu
        ? product.categoryNameRu
        : language === 'fr' && product.categoryNameFr
          ? product.categoryNameFr
          : product.categoryNameEn;

  const uniqueColors = useMemo(() => {
    if (!product.variants || !Array.isArray(product.variants)) return [];
    const colorMap = new Map<string, { hex: string; nameEn: string; nameAr: string }>();
    product.variants.forEach((v) => {
      const hex = v.colorHex || (v as any).color_hex || '#4A0A15';
      const nameEn = v.colorNameEn || (v as any).color || 'Standard';
      const nameAr = v.colorNameAr || (v as any).color || 'الأساسي';
      if (!colorMap.has(hex)) {
        colorMap.set(hex, { hex, nameEn, nameAr });
      }
    });
    return Array.from(colorMap.values());
  }, [product.variants]);

  const activeColor = uniqueColors[selectedColorIndex] ||
    uniqueColors[0] || {
      hex: '#4A0A15',
      nameEn: 'Standard',
      nameAr: 'الأساسي',
    };

  const hasDiscount = Boolean(product.salePrice && product.salePrice < product.price);
  const discountPercent = hasDiscount
    ? Math.round(((product.price - product.salePrice!) / product.price) * 100)
    : 0;

  const totalStock = useMemo(() => {
    if (!product.variants || product.variants.length === 0) return 99;
    return product.variants.reduce((acc, v) => acc + (v.stock || 0), 0);
  }, [product.variants]);

  const isOutOfStock = totalStock <= 0;

  const distinctSizes = useMemo(() => {
    const set = new Set<ProductSize>();
    product.variants.forEach((v) => {
      if (v.stock > 0) set.add(v.size);
    });
    return Array.from(set);
  }, [product.variants]);

  const validImages = useMemo(() => {
    if (!product.images || !Array.isArray(product.images)) return ['/images/hero_pic.jpeg'];
    const filtered = product.images.filter((img) => typeof img === 'string' && img.trim() !== '');
    return filtered.length > 0 ? filtered : ['/images/hero_pic.jpeg'];
  }, [product.images]);

  const primaryImage = validImages[0] || '/images/hero_pic.jpeg';
  const hasSecondImage = validImages.length > 1;
  const secondaryImage = hasSecondImage ? validImages[1] : primaryImage;
  const primarySrcSet = product.imageSrcSets?.[0];
  const secondarySrcSet = product.imageSrcSets?.[1];
  const responsiveSizes = '(max-width: 767px) 46vw, (max-width: 1023px) 45vw, 280px';

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
      <a
        href={`#product-${product.id}`}
        onClick={(e) => {
          e.preventDefault();
          onSelectProduct(product);
        }}
        aria-label={`${displayName} - ${formatBHD(product.salePrice || product.price)}`}
        className="block relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)] rounded-[10px]"
      >
        {/* Image Container: 4:5 aspect ratio, object-cover */}
        <div
          className="relative aspect-[4/5] w-full bg-white overflow-hidden"
          style={{ aspectRatio: '4/5' }}
        >
          <img
            src={primaryImage}
            srcSet={primarySrcSet}
            sizes={responsiveSizes}
            alt={displayName}
            width={280}
            height={350}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              isOutOfStock ? 'opacity-50 grayscale-[20%]' : ''
            } ${hasSecondImage && isHovered ? 'opacity-0' : 'opacity-100'}`}
          />

          {hasSecondImage && (
            <img
              src={secondaryImage}
              srcSet={secondarySrcSet}
              sizes={responsiveSizes}
              alt={`${displayName} - alternate view`}
              width={280}
              height={350}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className={`hidden sm:block absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                isOutOfStock ? 'opacity-50 grayscale-[20%]' : ''
              } ${isHovered ? 'opacity-100' : 'opacity-0'}`}
            />
          )}

          {/* Top-Start Sale / New Marker */}
          <div className="absolute top-2 start-2 z-10 flex flex-col gap-1 pointer-events-none">
            {hasDiscount ? (
              <span className="bg-[var(--color-maroon)] text-white text-[11px] font-semibold px-2 py-0.5 rounded-[4px] shadow-xs uppercase tracking-wider border border-[var(--color-gold)]/40">
                -{discountPercent}%
              </span>
            ) : product.newArrival ? (
              <span className="hidden sm:inline-block bg-[var(--color-maroon)] text-white text-[11px] font-semibold px-2 py-0.5 rounded-[4px] shadow-xs uppercase tracking-wider border border-[var(--color-gold)]/40">
                {language === 'ar' ? 'جديد' : language === 'ru' ? 'Новинка' : language === 'fr' ? 'Nouveau' : 'New'}
              </span>
            ) : null}
          </div>

          {/* Top-End: 44x44px Wishlist Heart Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleWishlist(product.id);
            }}
            aria-label={
              isWishlisted
                ? language === 'ar'
                  ? 'إزالة من المفضلة'
                  : language === 'ru'
                    ? 'Удалить из избранного'
                    : language === 'fr'
                      ? 'Retirer des favoris'
                      : 'Remove from wishlist'
                : language === 'ar'
                  ? 'إضافة إلى المفضلة'
                  : language === 'ru'
                    ? 'Добавить в избранное'
                    : language === 'fr'
                      ? 'Ajouter aux favoris'
                      : 'Add to wishlist'
            }
            aria-pressed={isWishlisted}
            className="absolute top-1.5 end-1.5 z-20 w-[44px] h-[44px] rounded-full bg-[var(--color-card)]/90 backdrop-blur-xs border border-[var(--color-gold)]/40 hover:border-[var(--color-gold)] shadow-sm flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]"
          >
            <Heart
              className={`w-5 h-5 transition-colors ${
                isWishlisted
                  ? 'fill-[var(--color-maroon)] text-[var(--color-maroon)]'
                  : 'text-[var(--color-maroon)] hover:text-[var(--color-maroon-dark)]'
              }`}
            />
          </button>

          {/* Desktop/Tablet (+sm) Quick Add / Sold Out Bar */}
          {isOutOfStock ? (
            <div className="hidden sm:flex absolute inset-x-3 bottom-3 z-20 h-[44px] rounded-full bg-[var(--color-card)]/95 text-[var(--color-text-secondary)] text-[13px] font-semibold items-center justify-center select-none cursor-not-allowed border border-[var(--color-border)]">
              {language === 'ar' ? 'نفدت الكمية' : language === 'ru' ? 'Распродано' : language === 'fr' ? 'Épuisé' : 'Sold out'}
            </div>
          ) : (
            <div className="hidden sm:block">
              <button
                type="button"
                onClick={handleDirectQuickAdd}
                className={`absolute inset-x-3 bottom-3 z-20 h-[44px] rounded-full px-4 text-[13px] font-semibold transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)] ${
                  isSingleAddedFeedback
                    ? 'bg-[var(--color-maroon-dark)] text-white'
                    : 'bg-[var(--color-maroon)] hover:bg-[var(--color-maroon-dark)] text-white'
                }`}
              >
                {isSingleAddedFeedback ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>
                      {language === 'ar'
                        ? 'تمت الإضافة ✓'
                        : language === 'ru'
                          ? 'В корзине ✓'
                          : language === 'fr'
                            ? 'Ajouté ✓'
                            : 'Added to bag ✓'}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-base leading-none font-bold">+</span>
                    <span>
                      {language === 'ar'
                        ? 'إضافة سريعة'
                        : language === 'ru'
                          ? 'В корзину'
                          : language === 'fr'
                            ? 'Ajout rapide'
                            : 'Quick add'}
                    </span>
                  </>
                )}
              </button>

              {isQuickAddOpen && (
                <QuickAddPopover
                  product={product}
                  selectedColorHex={activeColor.hex}
                  onSelectSize={handleSizeSelectFromPopover}
                  onClose={() => setIsQuickAddOpen(false)}
                  justAddedSize={justAddedSize}
                />
              )}
            </div>
          )}
        </div>

        {/* Card Body: Clean 2-line name clamp + BHD price on mobile; swatches/category/rating on sm+ */}
        <div className="p-3 sm:p-4 flex flex-col gap-1.5 bg-[var(--color-card)] text-start">
          {/* Category Label (sm+) */}
          <span className="hidden sm:block text-[11px] uppercase tracking-[0.08em] font-medium truncate text-[var(--color-text-secondary)]">
            {displayCategory}
          </span>

          {/* Product Name (2-line clamp) */}
          <h3
            className="font-serif text-[15px] sm:text-[17px] font-semibold leading-snug line-clamp-2 min-h-[2.6em] text-[var(--color-text)] group-hover:text-[var(--color-maroon)] transition-colors"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {displayName}
          </h3>

          {/* Color Swatches (sm+) */}
          <div
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="hidden sm:flex items-center gap-1.5 py-0.5"
          >
            {uniqueColors.slice(0, 5).map((color, idx) => (
              <button
                key={`${product.id}-color-${color.hex}-${idx}`}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedColorIndex(idx);
                }}
                aria-label={language === 'ar' ? color.nameAr : color.nameEn}
                className={`w-[16px] h-[16px] rounded-full border transition-all cursor-pointer ${
                  selectedColorIndex === idx
                    ? 'border-[var(--color-maroon)] ring-1 ring-[var(--color-maroon)] scale-110'
                    : 'border-[var(--color-border)] hover:scale-105'
                }`}
                style={{ backgroundColor: color.hex }}
              />
            ))}

            {uniqueColors.length > 0 && (
              <span className="text-[12px] font-normal ms-1 text-[var(--color-text-secondary)]">
                {uniqueColors.length}{' '}
                {language === 'ar' ? 'ألوان' : language === 'ru' ? 'оттенка' : language === 'fr' ? 'nuances' : 'shades'}
              </span>
            )}
          </div>

          <div className="hidden sm:block h-[1px] w-full my-0.5 bg-[var(--color-border)]" />

          {/* Price in BHD (+ Rating on sm+) */}
          <div className="flex items-baseline justify-between gap-2 pt-0.5">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              {hasDiscount ? (
                <>
                  <span className="text-[15px] sm:text-[17px] font-bold tabular-nums text-[var(--color-maroon)]">
                    {formatBHD(product.salePrice!)}
                  </span>
                  <span className="text-[12px] sm:text-[13px] line-through tabular-nums text-[var(--color-text-secondary)]">
                    {formatBHD(product.price)}
                  </span>
                </>
              ) : (
                <span className="text-[15px] sm:text-[17px] font-bold tabular-nums text-[var(--color-text)]">
                  {formatBHD(product.price)}
                </span>
              )}
            </div>

            {typeof product.rating === 'number' && typeof product.reviewCount === 'number' && product.reviewCount > 0 && (
              <div className="hidden sm:flex text-[13px] font-normal tabular-nums items-center gap-1 shrink-0 text-[var(--color-text-secondary)]">
                <span className="text-[var(--color-gold-text)]">★</span>
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
