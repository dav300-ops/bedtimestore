import React, { useState, useRef } from 'react';
import { Product, ProductSize } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/ProductCard';
import { ProductAlbumModal } from '../components/ProductAlbumModal';
import { 
  Heart, 
  ShoppingBag, 
  Check, 
  Truck, 
  ShieldCheck, 
  RefreshCw, 
  Share2, 
  ChevronRight, 
  ChevronLeft,
  Sparkles,
  Ruler,
  Baby,
  Layers,
  Package,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  Eye,
  Images,
  Maximize2
} from 'lucide-react';

interface ProductDetailPageProps {
  product: Product;
  onNavigateCheckout: () => void;
  onSelectProduct: (p: Product) => void;
  onQuickView: (p: Product) => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product: initialProduct,
  onNavigateCheckout,
  onSelectProduct,
  onQuickView,
}) => {
  const { language, formatBHD, t, isRtl } = useLanguage();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useAuth();
  const { products } = useStore();

  // Keep synced with live dynamic database state
  const product = products.find((p) => p.id === initialProduct.id) || initialProduct;

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const mobileGalleryRef = useRef<HTMLDivElement>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [selectedSize, setSelectedSize] = useState<ProductSize>(
    product.variants[0]?.size || 'S'
  );

  // Group unique colors with aggregate live stock balance
  const uniqueColors = Array.from(
    new Map(
      product.variants.map((v) => {
        const colorStock = product.variants
          .filter((sub) => sub.colorHex.toLowerCase() === v.colorHex.toLowerCase())
          .reduce((sum, sub) => sum + (Number(sub.stock) || 0), 0);

        return [
          v.colorHex.toLowerCase(),
          {
            hex: v.colorHex,
            nameEn: v.colorNameEn,
            nameAr: v.colorNameAr,
            totalStock: colorStock,
          },
        ];
      })
    ).values()
  );

  const [selectedColor, setSelectedColor] = useState(
    uniqueColors[0] || { hex: 'var(--maroon-900)', nameEn: 'Standard', nameAr: 'افتراضي', totalStock: 0 }
  );

  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'details' | 'care' | 'shipping' | 'varieties'>('details');
  const [isAddedFeedback, setIsAddedFeedback] = useState(false);
  const [isKidsSizeModalOpen, setIsKidsSizeModalOpen] = useState(false);
  const [isAlbumModalOpen, setIsAlbumModalOpen] = useState(false);

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
  const displayCare = language === 'ar' 
    ? product.careInstructionsAr 
    : language === 'ru' && product.careInstructionsRu 
      ? product.careInstructionsRu 
      : language === 'fr' && product.careInstructionsFr
        ? product.careInstructionsFr
        : product.careInstructionsEn;
  const isWishlisted = isInWishlist(product.id);

  // Total stock across all varieties for this product
  const totalProductStock = (product.variants || []).reduce(
    (sum, v) => sum + (Number(v.stock) || 0),
    0
  );

  // Active selected variant stock
  const currentVariant = product.variants.find(
    (v) =>
      v.size === selectedSize &&
      (v.colorNameEn.toLowerCase() === selectedColor.nameEn.toLowerCase() ||
        v.colorHex.toLowerCase() === selectedColor.hex.toLowerCase())
  );

  const availableStock = currentVariant ? currentVariant.stock : 0;
  const isOutOfStock = availableStock === 0;
  const isLowStock = availableStock > 0 && availableStock <= 4;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPosition({ x, y });
  };

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    const res = addToCart(
      product,
      selectedSize,
      language === 'ar' ? selectedColor.nameAr : selectedColor.nameEn,
      selectedColor.hex,
      quantity
    );
    if (res.success) {
      setIsAddedFeedback(true);
      setTimeout(() => setIsAddedFeedback(false), 1500);
    }
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    addToCart(
      product,
      selectedSize,
      language === 'ar' ? selectedColor.nameAr : selectedColor.nameEn,
      selectedColor.hex,
      quantity
    );
    onNavigateCheckout();
  };

  // Related products
  const related = products
    .filter((p) => p.id !== product.id && p.categoryId === product.categoryId)
    .slice(0, 4);

  const galleryImages =
    product.images && product.images.filter((img) => typeof img === 'string' && img.trim() !== '').length > 0
      ? product.images.filter((img) => typeof img === 'string' && img.trim() !== '')
      : ['/images/hero_pic.jpeg'];

  const effectiveUnitPrice = product.salePrice ?? product.price;

  const handleMobileGalleryScroll = () => {
    const el = mobileGalleryRef.current;
    if (!el || el.clientWidth === 0) return;
    const idx = Math.round(Math.abs(el.scrollLeft) / el.clientWidth);
    if (idx >= 0 && idx < galleryImages.length && idx !== activeImageIndex) {
      setActiveImageIndex(idx);
    }
  };

  const scrollToSlide = (idx: number) => {
    setActiveImageIndex(idx);
    const el = mobileGalleryRef.current;
    if (!el) return;
    el.scrollTo({
      left: idx * el.clientWidth,
      behavior: 'smooth',
    });
  };

  return (
    <div className="bg-[var(--surface-page)] min-h-screen pt-4 pb-28 sm:py-10 lg:pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-8 uppercase tracking-wider">
          <span className="hover:text-[var(--maroon-700)] cursor-pointer">
            {language === 'ar' ? 'الرئيسية' : 'Home'}
          </span>
          <span>/</span>
          <span className="hover:text-[var(--maroon-700)] cursor-pointer">
            {language === 'ar' ? product.categoryNameAr : product.categoryNameEn}
          </span>
          <span>/</span>
          <span className="text-[var(--text-strong)] font-semibold truncate max-w-xs">{displayName}</span>
        </nav>

        {/* Main PDP Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 bg-[var(--surface-card)] p-6 sm:p-10 rounded-[var(--radius-card)] border border-[var(--line)] shadow-[var(--shadow-soft)]">
          
          {/* Left Column: Mobile Swipeable Gallery + Desktop Interactive Zoom Gallery */}
          <div className="lg:col-span-7 space-y-4">
            {/* Mobile Swipeable Horizontal Gallery (< lg) */}
            <div className="lg:hidden space-y-3">
              <div className="relative rounded-[var(--radius-card)] overflow-hidden border border-[var(--line)] bg-[var(--surface-card)]">
                <div
                  ref={mobileGalleryRef}
                  dir="ltr"
                  onScroll={handleMobileGalleryScroll}
                  aria-label={t.mobileMenu.slideLabel}
                  className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none"
                >
                  {galleryImages.map((img, idx) => (
                    <div
                      key={`${product.id}-slide-${idx}`}
                      className="w-full shrink-0 snap-center aspect-[4/5] bg-[var(--surface-card)] relative"
                    >
                      <img
                        src={img}
                        alt={`${displayName} - ${idx + 1}`}
                        loading={idx === 0 ? 'eager' : 'lazy'}
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover object-center"
                      />
                    </div>
                  ))}
                </div>

                {/* Badges */}
                <div className="absolute top-3 start-3 flex flex-col gap-1.5 z-10 pointer-events-none">
                  {product.salePrice && product.salePrice < product.price && (
                    <span className="bg-[var(--red-600)] text-[var(--text-on-maroon)] text-[11px] font-bold px-2.5 py-1 uppercase tracking-wider rounded-[var(--radius-pill)] shadow-sm">
                      {language === 'ar' ? 'تخفيض' : 'SALE'} -{Math.round(((product.price - product.salePrice) / product.price) * 100)}%
                    </span>
                  )}
                  {product.newArrival && (
                    <span className="bg-[var(--surface-champagne)] text-[var(--maroon-700)] border border-[var(--gold-decor)] text-[11px] font-semibold px-2.5 py-1 uppercase tracking-wider rounded-[var(--radius-pill)] shadow-sm">
                      {t.product.new}
                    </span>
                  )}
                </div>

                {/* Fullscreen Album Button */}
                <button
                  type="button"
                  onClick={() => setIsAlbumModalOpen(true)}
                  aria-label={language === 'ar' ? 'عرض ألبوم الصور' : 'Product Album'}
                  className="absolute bottom-3 end-3 z-10 min-h-[44px] px-3 py-1.5 bg-[var(--maroon-700)]/90 text-[var(--text-on-maroon)] text-[11px] font-semibold uppercase tracking-wider rounded-[var(--radius-pill)] backdrop-blur-md border border-[var(--gold-decor)] flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Images className="w-3.5 h-3.5 text-[var(--gold-decor)]" />
                  <span>{galleryImages.length}</span>
                </button>
              </div>

              {/* Pagination Dots */}
              {galleryImages.length > 1 && (
                <div className="flex items-center justify-center gap-1.5" role="tablist" aria-label={t.mobileMenu.slideLabel}>
                  {galleryImages.map((_, idx) => {
                    const isActive = idx === activeImageIndex;
                    return (
                      <button
                        key={`dot-${idx}`}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        aria-label={t.mobileMenu.goToSlide.replace('{index}', String(idx + 1))}
                        onClick={() => scrollToSlide(idx)}
                        className="min-w-[28px] min-h-[28px] flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-decor)] rounded-full"
                      >
                        <span
                          className={`block rounded-full transition-all duration-200 ${
                            isActive
                              ? 'w-5 h-2 bg-[var(--maroon-700)]'
                              : 'w-2 h-2 bg-[var(--gold-soft)]'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Desktop Interactive Zoomable Image (>= lg) */}
            <div
              className="hidden lg:block relative aspect-[3/4] bg-[var(--surface-card)] rounded-[var(--radius-card)] overflow-hidden border border-[var(--line)] cursor-crosshair shadow-xs"
              onMouseEnter={() => setIsZoomed(true)}
              onMouseLeave={() => setIsZoomed(false)}
              onMouseMove={handleMouseMove}
            >
              <img
                src={galleryImages[activeImageIndex] || galleryImages[0]}
                alt={displayName}
                className={`w-full h-full object-cover object-center transition-transform duration-200 ${
                  isZoomed ? 'scale-150 origin-center' : 'scale-100'
                }`}
                style={
                  isZoomed
                    ? {
                        transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                      }
                    : undefined
                }
                referrerPolicy="no-referrer"
              />

              {/* Badges */}
              <div className="absolute top-4 start-4 flex flex-col gap-1.5 z-10">
                {product.salePrice && product.salePrice < product.price && (
                  <span className="bg-[var(--red-600)] text-[var(--text-on-maroon)] text-[11px] font-bold px-2.5 py-1 uppercase tracking-wider rounded-[var(--radius-pill)] shadow-sm">
                    {language === 'ar' ? 'تخفيض' : 'SALE'} -{Math.round(((product.price - product.salePrice) / product.price) * 100)}%
                  </span>
                )}
                {product.newArrival && (
                  <span className="bg-[var(--surface-champagne)] text-[var(--maroon-700)] text-[11px] font-semibold px-2.5 py-1 uppercase tracking-wider rounded-[var(--radius-pill)] shadow-sm border border-[var(--gold-decor)]">
                    {t.product.new}
                  </span>
                )}
                {product.ageGroup && (
                  <span className="bg-[var(--maroon-900)] text-[var(--text-on-maroon)] text-[11px] font-bold px-2.5 py-1 uppercase tracking-wider rounded-[var(--radius-pill)] shadow-sm border border-[var(--gold-decor)]">
                    {language === 'ar' ? `لعمر ${product.ageGroup} سنوات` : `Ages ${product.ageGroup}`}
                  </span>
                )}
              </div>

              {/* Product Image Album Trigger Button */}
              <button
                type="button"
                onClick={() => setIsAlbumModalOpen(true)}
                className="absolute bottom-3 end-3 z-10 px-3 py-1.5 bg-[var(--maroon-700)] hover:bg-[var(--maroon-600)] text-[var(--text-on-maroon)] text-[11px] font-semibold uppercase tracking-wider rounded-[var(--radius-pill)] border border-[var(--gold-decor)] flex items-center gap-1.5 transition-all shadow-md cursor-pointer hover:scale-105"
                title="Open Product Image Album"
              >
                <Images className="w-3.5 h-3.5 text-[var(--gold-decor)]" />
                <span>{language === 'ar' ? 'عرض ألبوم الصور' : 'Product Album'}</span>
                <span className="text-[10px] text-[var(--surface-champagne)] font-mono">({galleryImages.length})</span>
              </button>
            </div>

            {/* Desktop Thumbnail Navigation */}
            {galleryImages.length > 1 && (
              <div className="hidden lg:flex gap-3 overflow-x-auto pb-2">
                {galleryImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-20 h-24 rounded-xs overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                      activeImageIndex === idx
                        ? 'border-[var(--maroon-700)] ring-2 ring-[var(--gold-decor)] shadow-xs'
                        : 'border-[var(--line)] opacity-75 hover:opacity-100 hover:border-[var(--gold-decor)]'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Contiguous Purchase Module */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
            <div className="space-y-6">
              
              {/* Category, SKU, and Dynamic Stock Badge */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-[var(--gold-text)] gold-text-rtl-weight uppercase tracking-wider font-semibold flex-wrap gap-2">
                  <span>{language === 'ar' ? product.categoryNameAr : product.categoryNameEn}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[var(--text-muted)]">SKU: {product.sku}</span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[var(--radius-pill)] text-[10px] font-bold bg-[var(--surface-champagne)] text-[var(--maroon-700)] border border-[var(--gold-decor)]">
                      <Package className="w-3 h-3 text-[var(--gold-text)]" />
                      {totalProductStock} {language === 'ar' ? 'قطعة في المخزون' : 'Units in Stock'}
                    </span>
                  </div>
                </div>

                <h1 className="font-heading text-3xl sm:text-4xl font-semibold text-[var(--maroon-700)] leading-tight">
                  {displayName}
                </h1>

                <div className="flex items-center gap-2 pt-1 text-xs">
                  <div className="text-[var(--gold-text)] font-medium tracking-tighter">★★★★★</div>
                  <span className="font-semibold text-[var(--text-strong)]">{product.rating}</span>
                  <span className="text-[var(--text-muted)]">({product.reviewCount} {t.product.reviews})</span>
                </div>
              </div>

              {/* Price Block in BHD */}
              <div className="flex items-baseline gap-4 py-2 border-y border-[var(--line)]">
                {product.salePrice ? (
                  <>
                    <span className="text-3xl font-bold text-[var(--red-600)] tabular-nums">
                      {formatBHD(product.salePrice)}
                    </span>
                    <span className="text-base text-[var(--text-muted)] line-through tabular-nums">
                      {formatBHD(product.price)}
                    </span>
                    <span className="text-xs text-[var(--red-600)] font-bold bg-[var(--surface-blush)] border border-[var(--red-600)] px-2 py-0.5 rounded-[var(--radius-pill)]">
                      {language === 'ar' ? 'تخفيض' : 'SALE'} -{Math.round(((product.price - product.salePrice) / product.price) * 100)}%
                    </span>
                  </>
                ) : (
                  <span className="text-3xl font-bold text-[var(--text-strong)] tabular-nums">
                    {formatBHD(product.price)}
                  </span>
                )}
              </div>

              {/* Color Variety Selector with live stock counts */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-[var(--text-strong)] uppercase tracking-wider flex items-center gap-1.5">
                    <span>{t.product.selectColor}:</span>
                    <span className="text-[var(--maroon-700)] font-bold">
                      {language === 'ar' ? selectedColor.nameAr : selectedColor.nameEn}
                    </span>
                  </span>
                  <span className="text-[11px] text-[var(--gold-text)] gold-text-rtl-weight font-medium">
                    {selectedColor.totalStock} {language === 'ar' ? 'قطعة بهذا اللون' : 'units in this color'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {uniqueColors.map((color) => {
                    const isSelected = selectedColor.hex.toLowerCase() === color.hex.toLowerCase();
                    return (
                      <button
                        key={color.hex}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        className={`p-2 rounded-xs border text-left rtl:text-right flex items-center gap-2.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[var(--maroon-700)] bg-[var(--surface-champagne)] ring-1 ring-[var(--maroon-700)] shadow-xs'
                            : 'border-[var(--line)] bg-[var(--surface-card)] hover:bg-[var(--surface-page)]'
                        }`}
                      >
                        <span
                          className="w-5 h-5 rounded-full border border-[var(--line)] shrink-0 shadow-xs"
                          style={{ backgroundColor: color.hex }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-[var(--text-strong)] truncate">
                            {language === 'ar' ? color.nameAr : color.nameEn}
                          </p>
                          <p className="text-[10px] text-[var(--text-muted)] font-medium">
                            {color.totalStock > 0 ? `${color.totalStock} ${language === 'ar' ? 'متوفر' : 'in stock'}` : (language === 'ar' ? 'نفذت الكمية' : 'Sold out')}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Size Variety Selector with per-variant stock indicators */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-[var(--text-strong)] uppercase tracking-wider">{t.product.selectSize}:</span>
                  <button
                    onClick={() => setIsKidsSizeModalOpen(true)}
                    className="text-[var(--maroon-700)] underline cursor-pointer hover:text-[var(--maroon-600)]"
                  >
                    {product.isKids || product.ageGroup ? (language === 'ar' ? 'دليل مقاسات الأطفال' : 'Kids Size Guide') : t.product.sizeGuide}
                  </button>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {(product.variants.length > 0
                    ? Array.from(new Set(product.variants.map((v) => v.size)))
                    : (['XS', 'S', 'M', 'L', 'XL'] as ProductSize[])
                  ).map((size) => {
                    const isSelected = selectedSize === size;
                    const varStock = product.variants.find(
                      (v) =>
                        v.size === size &&
                        (v.colorHex.toLowerCase() === selectedColor.hex.toLowerCase() ||
                          v.colorNameEn.toLowerCase() === selectedColor.nameEn.toLowerCase())
                    )?.stock ?? 0;

                    const isVarOut = varStock === 0;

                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={`p-2.5 rounded-xs border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                          isSelected
                            ? 'bg-[var(--maroon-700)] text-[var(--text-on-maroon)] border-[var(--maroon-700)] shadow-xs font-bold'
                            : isVarOut
                            ? 'bg-[var(--surface-blush)] text-[var(--text-muted)] border-[var(--line)] opacity-75'
                            : 'bg-[var(--surface-card)] text-[var(--text-strong)] border-[var(--line)] hover:bg-[var(--surface-champagne)]'
                        }`}
                      >
                        <span className="text-xs font-bold">{size}</span>
                        <span className={`text-[10px] mt-0.5 font-medium ${
                          isSelected
                            ? 'text-[var(--surface-champagne)]'
                            : isVarOut || varStock <= 4
                              ? 'text-[var(--red-600)]'
                              : 'text-[var(--status-success)]'
                        }`}>
                          {isVarOut ? (language === 'ar' ? 'نفذ' : 'Out') : `${varStock} ${language === 'ar' ? 'قطعة' : 'left'}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Interactive Variety Explorer: Click through Available Varieties & Stock */}
              <div className="bg-[var(--surface-page)] p-4 rounded-[var(--radius-card)] border border-[var(--line)] shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-[var(--gold-text)]" />
                    <span className="font-semibold text-xs text-[var(--text-strong)] uppercase tracking-wider">
                      {language === 'ar' ? 'تصفحي جميع الموديلات والمخزون المتاح' : 'Click Through Available Varieties & Stock'}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-[var(--radius-pill)] bg-[var(--surface-champagne)] text-[var(--maroon-700)] border border-[var(--gold-decor)]">
                    {product.variants.length} {language === 'ar' ? 'موديلات متوفرة' : 'Varieties Available'}
                  </span>
                </div>

                <p className="text-[11px] text-[var(--text-muted)]">
                  {language === 'ar'
                    ? 'اضغطي على أي موديل لتحديده وتحديث المقاس واللون والكمية المتوفرة تلقائياً:'
                    : 'Click any variety tile below to switch color & size and see real-time warehouse stock:'}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                  {product.variants.map((v, idx) => {
                    const isSelected =
                      (v.colorHex.toLowerCase() === selectedColor.hex.toLowerCase() ||
                        v.colorNameEn.toLowerCase() === selectedColor.nameEn.toLowerCase()) &&
                      v.size === selectedSize;

                    const vStock = Number(v.stock) || 0;
                    const isVOut = vStock === 0;
                    const isVLow = vStock > 0 && vStock <= 4;

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          const matchedColor = uniqueColors.find(
                            (c) =>
                              c.hex.toLowerCase() === v.colorHex.toLowerCase() ||
                              c.nameEn.toLowerCase() === v.colorNameEn.toLowerCase()
                          );
                          if (matchedColor) {
                            setSelectedColor(matchedColor);
                          }
                          setSelectedSize(v.size as ProductSize);
                        }}
                        className={`p-2 rounded-xs border text-left rtl:text-right transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-[var(--maroon-700)] bg-[var(--surface-champagne)] ring-1 ring-[var(--maroon-700)] shadow-xs'
                            : isVOut
                            ? 'border-[var(--line)] bg-[var(--surface-blush)] opacity-75'
                            : 'border-[var(--line)] bg-[var(--surface-card)] hover:border-[var(--gold-decor)]'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-[var(--line)] shrink-0 shadow-xs"
                            style={{ backgroundColor: v.colorHex }}
                          />
                          <span className="text-[11px] font-semibold text-[var(--text-strong)] truncate">
                            {language === 'ar' ? v.colorNameAr : v.colorNameEn}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[var(--line)]">
                          <span className="font-mono font-bold text-[var(--text-strong)] bg-[var(--surface-card)] px-1.5 py-0.2 rounded-xs border border-[var(--line)]">
                            {v.size}
                          </span>
                          <span
                            className={`font-bold tabular-nums text-[10px] ${
                              isVOut || isVLow
                                ? 'text-[var(--red-600)]'
                                : 'text-[var(--status-success)]'
                            }`}
                          >
                            {isVOut
                              ? (language === 'ar' ? 'نفذت' : 'Out')
                              : `${vStock} ${language === 'ar' ? 'قطع' : 'left'}`}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Variety Stock & Availability Status Callout */}
              <div
                role={isOutOfStock || isLowStock ? 'alert' : undefined}
                className={`p-3 rounded-xs border flex items-center justify-between text-xs ${
                  isOutOfStock || isLowStock
                    ? 'bg-[var(--surface-blush)] border-[var(--red-600)] text-[var(--red-600)]'
                    : 'bg-[var(--status-success-bg)] border-[var(--status-success-border)] text-[var(--status-success)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isOutOfStock || isLowStock ? (
                    <AlertTriangle className="w-4 h-4 text-[var(--red-600)] shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-[var(--status-success)] shrink-0" />
                  )}
                  <div>
                    <span className="font-bold block">
                      {isOutOfStock
                        ? (language === 'ar' ? 'نفذت الكمية لهذا المقاس واللون' : 'Selected Variety Out of Stock')
                        : isLowStock
                        ? (language === 'ar' ? `كمية محدودة جداً: باقي ${availableStock} قطع فقط!` : `Low Stock Alert: Only ${availableStock} units remaining!`)
                        : (language === 'ar' ? `متوفر في المخزون: ${availableStock} قطع جاهزة للتوصيل السريع` : `In Stock: ${availableStock} units ready for immediate Bahrain dispatch`)}
                    </span>
                    <span className="text-[11px] opacity-85">
                      {selectedColor.nameEn} · {selectedSize} · SKU: {currentVariant?.sku || product.sku}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quantity & CTAs (visible inline on desktop/tablet; mobile also gets sticky bottom bar) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3">
                  {/* Quantity Stepper */}
                  <div className="flex items-center border border-[var(--line)] rounded-[var(--radius-pill)] bg-[var(--surface-card)]">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      aria-label="Decrease quantity"
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--text-strong)] hover:bg-[var(--surface-champagne)] rounded-s-full cursor-pointer"
                    >
                      -
                    </button>
                    <span className="px-3 text-sm font-semibold tabular-nums text-[var(--text-strong)]">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.min(Math.max(1, availableStock), quantity + 1))}
                      aria-label="Increase quantity"
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--text-strong)] hover:bg-[var(--surface-champagne)] rounded-e-full cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  {/* Add to Cart CTA */}
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={isOutOfStock}
                    className={`flex-1 min-h-[48px] px-6 font-semibold text-xs uppercase tracking-wider rounded-[var(--radius-pill)] shadow-[var(--shadow-soft)] transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      isOutOfStock
                        ? 'bg-[var(--line)] text-[var(--text-muted)] cursor-not-allowed'
                        : isAddedFeedback
                          ? 'bg-[var(--maroon-900)] text-[var(--text-on-maroon)]'
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
                        <span>{isOutOfStock ? t.product.outOfStock : t.mobileMenu.addToBag}</span>
                      </>
                    )}
                  </button>

                  {/* Wishlist Button */}
                  <button
                    type="button"
                    onClick={() => toggleWishlist(product.id)}
                    className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full border transition-colors cursor-pointer ${
                      isWishlisted
                        ? 'bg-[var(--maroon-700)] text-[var(--text-on-maroon)] border-[var(--maroon-700)]'
                        : 'border-[var(--line)] text-[var(--maroon-700)] hover:bg-[var(--surface-champagne)]'
                    }`}
                    aria-label={t.mobileMenu.wishlist}
                  >
                    <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
                  </button>
                </div>

                {/* Instant Buy Now Button */}
                <button
                  onClick={handleBuyNow}
                  disabled={isOutOfStock}
                  className="w-full py-3 px-6 bg-[var(--maroon-900)] hover:bg-[var(--maroon-600)] text-[var(--text-on-maroon)] font-semibold text-xs uppercase tracking-wider rounded-[var(--radius-pill)] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {t.product.buyNow}
                </button>
              </div>

              {/* Bahrain Delivery Guarantee Strip */}
              <div className="bg-[var(--surface-champagne)] p-3.5 rounded-[var(--radius-card)] border border-[var(--gold-decor)] space-y-2 text-xs text-[var(--text-body)]">
                <div className="flex items-center gap-2 text-[var(--maroon-700)] font-semibold">
                  <Truck className="w-4 h-4 text-[var(--gold-text)]" />
                  <span>{language === 'ar' ? 'توصيل سريع داخل مملكة البحرين' : 'Bahrain Delivery & Courier'}</span>
                </div>
                <p className="text-[11px] text-[var(--text-body)] leading-relaxed">
                  {t.product.deliveryInfo}
                </p>
              </div>

            </div>

            {/* Product Specifications & Care Tabs */}
            <div className="pt-6 border-t border-[var(--line)]">
              <div className="flex gap-4 border-b border-[var(--line)] pb-2 text-xs font-semibold uppercase tracking-wider">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`pb-1 transition-colors cursor-pointer ${
                    activeTab === 'details' ? 'text-[var(--maroon-700)] border-b-2 border-[var(--maroon-700)]' : 'text-[var(--text-muted)]'
                  }`}
                >
                  {language === 'ar' ? 'الوصف والخامة' : 'Fabric & Details'}
                </button>
                <button
                  onClick={() => setActiveTab('care')}
                  className={`pb-1 transition-colors cursor-pointer ${
                    activeTab === 'care' ? 'text-[var(--maroon-700)] border-b-2 border-[var(--maroon-700)]' : 'text-[var(--text-muted)]'
                  }`}
                >
                  {language === 'ar' ? 'إرشادات العناية' : 'Care Guide'}
                </button>
                <button
                  onClick={() => setActiveTab('shipping')}
                  className={`pb-1 transition-colors cursor-pointer ${
                    activeTab === 'shipping' ? 'text-[var(--maroon-700)] border-b-2 border-[var(--maroon-700)]' : 'text-[var(--text-muted)]'
                  }`}
                >
                  {language === 'ar' ? 'الشحن والاسترجاع' : 'Shipping & Returns'}
                </button>
                <button
                  onClick={() => setActiveTab('varieties')}
                  className={`pb-1 transition-colors cursor-pointer ${
                    activeTab === 'varieties' ? 'text-[var(--maroon-700)] border-b-2 border-[var(--maroon-700)]' : 'text-[var(--text-muted)]'
                  }`}
                >
                  {language === 'ar' ? 'الموديلات والمخزون' : 'Stock & Varieties'}
                </button>
              </div>

              <div className="pt-3 text-xs text-[var(--text-body)] leading-relaxed font-light">
                {activeTab === 'details' && (
                  <div className="space-y-2">
                    <p>{displayDesc}</p>
                    <p><strong className="text-[var(--text-strong)]">{language === 'ar' ? 'الخامة:' : 'Material:'}</strong> {displayMaterial}</p>
                  </div>
                )}
                {activeTab === 'care' && (
                  <p>{displayCare}</p>
                )}
                {activeTab === 'shipping' && (
                  <p>{t.product.deliveryInfo}</p>
                )}
                {activeTab === 'varieties' && (
                  <div className="space-y-3">
                    <p className="text-[11px] text-[var(--text-body)]">
                      {language === 'ar'
                        ? 'جدول المخزون المتاح لحظياً من مستودع البحرين لكافة الألوان والمقاسات:'
                        : 'Warehouse stock balance for all active sizes & color shades:'}
                    </p>
                    <div className="border border-[var(--line)] rounded-xs overflow-hidden">
                      <table className="w-full text-left rtl:text-right text-[11px]">
                        <thead className="bg-[var(--surface-champagne)] text-[var(--maroon-700)] font-semibold uppercase">
                          <tr>
                            <th className="p-2.5">{language === 'ar' ? 'اللون' : 'Color'}</th>
                            <th className="p-2.5">{language === 'ar' ? 'المقاس' : 'Size'}</th>
                            <th className="p-2.5">{language === 'ar' ? 'المخزون' : 'In Stock'}</th>
                            <th className="p-2.5 text-right rtl:text-left">{language === 'ar' ? 'اختيار' : 'Action'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--line)] bg-[var(--surface-card)]">
                          {product.variants.map((v, i) => {
                            const vStock = Number(v.stock) || 0;
                            const isVSelected =
                              (v.colorHex.toLowerCase() === selectedColor.hex.toLowerCase() ||
                                v.colorNameEn.toLowerCase() === selectedColor.nameEn.toLowerCase()) &&
                              v.size === selectedSize;

                            return (
                              <tr key={i} className={isVSelected ? 'bg-[var(--surface-champagne)] font-semibold' : ''}>
                                <td className="p-2.5 flex items-center gap-1.5">
                                  <span
                                    className="w-3 h-3 rounded-full border border-[var(--line)]"
                                    style={{ backgroundColor: v.colorHex }}
                                  />
                                  <span>{language === 'ar' ? v.colorNameAr : v.colorNameEn}</span>
                                </td>
                                <td className="p-2.5 font-mono">{v.size}</td>
                                <td className="p-2.5">
                                  <span className={vStock <= 4 ? 'text-[var(--red-600)] font-semibold' : 'text-[var(--status-success)] font-semibold'}>
                                    {vStock === 0 ? (language === 'ar' ? 'نفذت الكمية' : 'Out of stock') : `${vStock} ${language === 'ar' ? 'قطعة' : 'units'}`}
                                  </span>
                                </td>
                                <td className="p-2.5 text-right rtl:text-left">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const matchedColor = uniqueColors.find(
                                        (c) =>
                                          c.hex.toLowerCase() === v.colorHex.toLowerCase() ||
                                          c.nameEn.toLowerCase() === v.colorNameEn.toLowerCase()
                                      );
                                      if (matchedColor) setSelectedColor(matchedColor);
                                      setSelectedSize(v.size as ProductSize);
                                    }}
                                    className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-[var(--radius-pill)] bg-[var(--surface-page)] hover:bg-[var(--maroon-700)] text-[var(--maroon-700)] hover:text-[var(--text-on-maroon)] border border-[var(--line)] transition-colors cursor-pointer"
                                  >
                                    {isVSelected ? (language === 'ar' ? 'محدد حالياً' : 'Selected') : (language === 'ar' ? 'اختيار' : 'Select')}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

        {/* Dedicated Product Image Album Showcase for Available Product */}
        {product.images && product.images.length > 0 && (
          <div className="mt-16 bg-[var(--surface-card)] p-6 sm:p-10 rounded-[var(--radius-card)] border border-[var(--line)] shadow-[var(--shadow-soft)] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[var(--line)] pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--gold-text)] gold-text-rtl-weight uppercase tracking-wider">
                  <Images className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'ألبوم صور القطعة المتوفرة' : 'Product Photo Album'}</span>
                </div>
                <h3 className="font-heading text-2xl sm:text-3xl font-bold text-[var(--maroon-700)] mt-1">
                  {language === 'ar' ? `ألبوم صور: ${displayName}` : `Image Album: ${displayName}`}
                </h3>
                <p className="text-xs text-[var(--text-body)] mt-1">
                  {language === 'ar' 
                    ? `استعرضي جميع الصور والزوايا المتاحة لهذه القطعة (${product.images.length} صور عالية الدقة). انقري على أي صورة للتكبير الكامل.`
                    : `High-resolution studio photography capturing every angle and detail (${product.images.length} available photos). Click any image to view in full resolution.`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAlbumModalOpen(true)}
                className="px-4 py-2 bg-[var(--maroon-700)] hover:bg-[var(--maroon-600)] text-[var(--text-on-maroon)] text-xs font-semibold uppercase tracking-wider rounded-[var(--radius-pill)] flex items-center gap-2 self-start sm:self-auto transition-colors cursor-pointer shadow-xs"
              >
                <Maximize2 className="w-3.5 h-3.5 text-[var(--gold-decor)]" />
                <span>{language === 'ar' ? 'فتح الألبوم كامل الشاشة' : 'Open Fullscreen Album'}</span>
              </button>
            </div>

            {/* Gallery Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              {product.images.map((img, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setActiveImageIndex(idx);
                    setIsAlbumModalOpen(true);
                  }}
                  className="group relative aspect-[3/4] rounded-[var(--radius-card)] overflow-hidden border border-[var(--line)] hover:border-[var(--gold-decor)] bg-[var(--surface-champagne)] cursor-pointer shadow-xs transition-all duration-300 hover:shadow-[var(--shadow-soft)]"
                >
                  <img
                    src={img}
                    alt={`${displayName} - Photo ${idx + 1}`}
                    className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-[var(--maroon-900)]/0 group-hover:bg-[var(--maroon-900)]/25 transition-colors flex items-center justify-center">
                    <span className="p-2 rounded-full bg-[var(--surface-card)] text-[var(--maroon-700)] opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:scale-110 duration-200 shadow-md">
                      <Maximize2 className="w-4 h-4 text-[var(--gold-text)]" />
                    </span>
                  </div>
                  <div className="absolute bottom-2 left-2 rtl:left-auto rtl:right-2 bg-[var(--maroon-900)]/85 backdrop-blur-xs text-[var(--text-on-maroon)] text-[10px] font-mono px-1.5 py-0.5 rounded-xs border border-[var(--gold-decor)]">
                    {idx + 1} / {product.images.length}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related Products Carousel */}
        {related.length > 0 && (
          <div className="mt-16">
            <h3 className="font-heading text-2xl font-semibold text-[var(--maroon-700)] mb-6">
              {t.carousels.youMayAlsoLike}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              {related.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onQuickView={onQuickView}
                  onSelectProduct={onSelectProduct}
                  onOpenAlbumModal={() => {
                    onSelectProduct(p);
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Children Size Guide Modal */}
        {isKidsSizeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--scrim-dark)] backdrop-blur-xs">
            <div className="bg-[var(--surface-card)] rounded-[var(--radius-card)] border border-[var(--line)] max-w-lg w-full p-6 space-y-5 shadow-[var(--shadow-soft)]">
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
                <div className="flex items-center gap-2">
                  <Ruler className="w-5 h-5 text-[var(--gold-text)]" />
                  <h3 className="font-heading text-lg font-semibold text-[var(--maroon-700)]">
                    {t.kidsCollection.sizeGuideTitle}
                  </h3>
                </div>
                <button
                  onClick={() => setIsKidsSizeModalOpen(false)}
                  className="text-[var(--text-muted)] hover:text-[var(--maroon-700)] text-sm p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-[var(--text-body)]">
                {t.kidsCollection.sizeGuideDesc}
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left rtl:text-right border border-[var(--line)]">
                  <thead className="bg-[var(--surface-champagne)] text-[var(--maroon-700)] font-semibold">
                    <tr>
                      <th className="p-2.5 border-b border-[var(--line)]">{language === 'ar' ? 'الفئة العمرية' : 'Age Bracket'}</th>
                      <th className="p-2.5 border-b border-[var(--line)]">{language === 'ar' ? 'المقاس' : 'Size'}</th>
                      <th className="p-2.5 border-b border-[var(--line)]">{language === 'ar' ? 'طول الطفل' : 'Height'}</th>
                      <th className="p-2.5 border-b border-[var(--line)]">{language === 'ar' ? 'الوزن التقريبي' : 'Weight'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line)] text-[var(--text-body)]">
                    <tr className="hover:bg-[var(--surface-page)]">
                      <td className="p-2.5 font-bold text-[var(--maroon-700)]">{language === 'ar' ? '٣ إلى ٥ سنوات' : '3 to 5 Years'}</td>
                      <td className="p-2.5 font-semibold">3-4Y / 4-5Y</td>
                      <td className="p-2.5">98 – 110 cm</td>
                      <td className="p-2.5">14 – 19 kg</td>
                    </tr>
                    <tr className="hover:bg-[var(--surface-page)]">
                      <td className="p-2.5 font-bold text-[var(--maroon-700)]">{language === 'ar' ? '٥ إلى ٧ سنوات' : '5 to 7 Years'}</td>
                      <td className="p-2.5 font-semibold">5-6Y / 6-7Y</td>
                      <td className="p-2.5">110 – 122 cm</td>
                      <td className="p-2.5">19 – 24 kg</td>
                    </tr>
                    <tr className="hover:bg-[var(--surface-page)]">
                      <td className="p-2.5 font-bold text-[var(--maroon-700)]">{language === 'ar' ? '٨ إلى ٩ سنوات' : '8 to 9 Years'}</td>
                      <td className="p-2.5 font-semibold">8-9Y</td>
                      <td className="p-2.5">125 – 135 cm</td>
                      <td className="p-2.5">25 – 32 kg</td>
                    </tr>
                    <tr className="hover:bg-[var(--surface-page)]">
                      <td className="p-2.5 font-bold text-[var(--maroon-700)]">{language === 'ar' ? '١٠ إلى ١٢ سنة' : '10 to 12 Years'}</td>
                      <td className="p-2.5 font-semibold">10-12Y</td>
                      <td className="p-2.5">138 – 152 cm</td>
                      <td className="p-2.5">33 – 45 kg</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="text-right rtl:text-left pt-2">
                <button
                  onClick={() => setIsKidsSizeModalOpen(false)}
                  className="px-5 py-2 bg-[var(--maroon-700)] text-[var(--text-on-maroon)] text-xs font-semibold rounded-[var(--radius-pill)] hover:bg-[var(--maroon-600)] transition-colors cursor-pointer"
                >
                  {language === 'ar' ? 'إغلاق الدليل' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Fullscreen Product Image Album Modal */}
        <ProductAlbumModal
          isOpen={isAlbumModalOpen}
          onClose={() => setIsAlbumModalOpen(false)}
          product={product}
          allProducts={products}
          onSelectProduct={onSelectProduct}
          initialImageIndex={activeImageIndex}
        />

        {/* Mobile Sticky Bottom Add to Bag Bar (< lg) */}
        <div
          className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-[var(--surface-card)]/95 backdrop-blur-md border-t border-[var(--line)] px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[var(--shadow-drawer)]"
        >
          <div className="flex items-center gap-2.5 max-w-xl mx-auto">
            {/* Price in BHD */}
            <div className="shrink-0 min-w-[78px] text-start">
              <p className={`text-sm font-bold tabular-nums leading-tight ${product.salePrice ? 'text-[var(--red-600)]' : 'text-[var(--text-strong)]'}`}>
                {formatBHD(effectiveUnitPrice * quantity)}
              </p>
              {quantity > 1 && (
                <p className="text-[10px] tabular-nums text-[var(--text-muted)]">
                  {formatBHD(effectiveUnitPrice)} × {quantity}
                </p>
              )}
            </div>

            {/* Quantity Stepper (44x44px buttons) */}
            <div className="inline-flex items-center border border-[var(--line)] rounded-[var(--radius-pill)] bg-[var(--surface-card)] shrink-0">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                aria-label="Decrease quantity"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-base font-semibold text-[var(--text-strong)] active:bg-[var(--surface-champagne)] rounded-s-full cursor-pointer"
              >
                −
              </button>
              <span className="px-1.5 text-sm font-bold tabular-nums text-[var(--text-strong)] min-w-[20px] text-center">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(Math.min(Math.max(1, availableStock), quantity + 1))}
                aria-label="Increase quantity"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-base font-semibold text-[var(--text-strong)] active:bg-[var(--surface-champagne)] rounded-e-full cursor-pointer"
              >
                +
              </button>
            </div>

            {/* Add to Bag Button */}
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className={`flex-1 min-h-[48px] px-4 font-semibold text-xs uppercase tracking-wider rounded-[var(--radius-pill)] shadow-[var(--shadow-soft)] transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-decor)] ${
                isOutOfStock
                  ? 'bg-[var(--line)] text-[var(--text-muted)] cursor-not-allowed'
                  : isAddedFeedback
                    ? 'bg-[var(--maroon-900)] text-[var(--text-on-maroon)]'
                    : 'bg-[var(--maroon-700)] hover:bg-[var(--maroon-600)] text-[var(--text-on-maroon)]'
              }`}
            >
              {isAddedFeedback ? (
                <>
                  <Check className="w-4 h-4 shrink-0" />
                  <span className="truncate">{t.product.addedToCart}</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4 shrink-0" />
                  <span className="truncate">
                    {isOutOfStock ? t.product.outOfStock : t.mobileMenu.addToBag}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
