import React, { useState, useEffect, useRef } from 'react';
import { Product, ProductSize } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Maximize2, 
  ShoppingBag, 
  Package, 
  Check, 
  SlidersHorizontal,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Info
} from 'lucide-react';

interface ProductAlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  allProducts: Product[];
  onSelectProduct: (p: Product) => void;
  initialImageIndex?: number;
}

export const ProductAlbumModal: React.FC<ProductAlbumModalProps> = ({
  isOpen,
  onClose,
  product,
  allProducts,
  onSelectProduct,
  initialImageIndex = 0,
}) => {
  const { language, formatBHD, isRtl } = useLanguage();
  const { addToCart } = useCart();

  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(initialImageIndex);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAddedFeedback, setIsAddedFeedback] = useState(false);

  // Sync active product when opened
  useEffect(() => {
    if (product && allProducts.length > 0) {
      const idx = allProducts.findIndex((p) => p.id === product.id);
      if (idx !== -1) {
        setCurrentProductIndex(idx);
      }
      setCurrentImageIndex(initialImageIndex);
      setZoomLevel(1);
    }
  }, [product, initialImageIndex, allProducts]);

  const activeProduct = allProducts[currentProductIndex] || product;

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        if (isRtl) handlePrevImage();
        else handleNextImage();
      } else if (e.key === 'ArrowLeft') {
        if (isRtl) handleNextImage();
        else handlePrevImage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentImageIndex, currentProductIndex, isRtl, activeProduct]);

  if (!isOpen || !activeProduct) return null;

  const images = activeProduct.images && activeProduct.images.length > 0
    ? activeProduct.images
    : ['/images/hero_pic.jpeg'];

  const totalImages = images.length;
  const currentImage = images[currentImageIndex] || images[0];

  const totalStock = (activeProduct.variants || []).reduce(
    (sum, v) => sum + (Number(v.stock) || 0),
    0
  );
  const isOutOfStock = totalStock === 0;
  const isLowStock = totalStock > 0 && totalStock <= 4;
  const unitPrice = activeProduct.salePrice ?? activeProduct.price;

  const handleNextImage = () => {
    setZoomLevel(1);
    setCurrentImageIndex((prev) => (prev + 1) % totalImages);
  };

  const handlePrevImage = () => {
    setZoomLevel(1);
    setCurrentImageIndex((prev) => (prev - 1 + totalImages) % totalImages);
  };

  const handleNextProduct = () => {
    if (allProducts.length <= 1) return;
    setZoomLevel(1);
    setCurrentImageIndex(0);
    setCurrentProductIndex((prev) => (prev + 1) % allProducts.length);
  };

  const handlePrevProduct = () => {
    if (allProducts.length <= 1) return;
    setZoomLevel(1);
    setCurrentImageIndex(0);
    setCurrentProductIndex((prev) => (prev - 1 + allProducts.length) % allProducts.length);
  };

  const handleQuickAdd = () => {
    if (isOutOfStock) return;
    const defaultVariant = activeProduct.variants[0];
    const res = addToCart(
      activeProduct,
      defaultVariant?.size || 'S',
      language === 'ar' ? (defaultVariant?.colorNameAr || 'وردي') : (defaultVariant?.colorNameEn || 'Blush'),
      defaultVariant?.colorHex || 'var(--color-card)',
      1
    );
    if (res.success) {
      setIsAddedFeedback(true);
      setTimeout(() => setIsAddedFeedback(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[var(--color-text)]/95 backdrop-blur-md flex flex-col">
      {/* Top Navigation & Controls Bar */}
      <div className="h-16 px-4 sm:px-6 flex items-center justify-between border-b border-[var(--color-accent)]/30 bg-[var(--color-text)]/90 text-[var(--color-bg)] shrink-0 z-20">
        <div className="flex items-center gap-3">
          <span className="font-heading text-lg font-bold tracking-wider text-white uppercase hidden sm:inline">
            {language === 'ar' ? 'ألبوم صور المنتجات' : 'Product Image Album'}
          </span>
          <span className="text-[11px] text-[var(--color-accent)] font-mono px-2 py-0.5 rounded-xs bg-white/10">
            {activeProduct.sku}
          </span>
          <span className="text-xs text-[var(--color-bg)]/70 hidden md:inline">
            {currentProductIndex + 1} / {allProducts.length} {language === 'ar' ? 'منتجات' : 'pieces'}
          </span>
        </div>

        {/* Center: Image Counter in Album */}
        <div className="flex items-center gap-1.5 text-xs text-[var(--color-accent)] font-medium font-mono">
          <span>{language === 'ar' ? 'صورة' : 'Image'}</span>
          <span className="text-white font-bold">{currentImageIndex + 1}</span>
          <span>/</span>
          <span>{totalImages}</span>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Zoom controls */}
          <div className="hidden sm:flex items-center bg-white/10 rounded-xs border border-white/10 p-0.5">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(1, z - 0.5))}
              disabled={zoomLevel <= 1}
              className="p-1.5 text-[var(--color-bg)] hover:text-white disabled:opacity-40 cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono px-2 text-[var(--color-accent)] tabular-nums">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(3, z + 0.5))}
              disabled={zoomLevel >= 3}
              className="p-1.5 text-[var(--color-bg)] hover:text-white disabled:opacity-40 cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            {zoomLevel > 1 && (
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="p-1.5 text-[var(--color-accent)] hover:text-white cursor-pointer ml-1"
                title="Reset Zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Toggle Sidebar Info */}
          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-2 rounded-xs border transition-colors cursor-pointer ${
              isSidebarOpen
                ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                : 'bg-white/10 text-[var(--color-bg)] border-white/20 hover:bg-white/20'
            }`}
            title="Toggle Product Details Panel"
          >
            <Info className="w-4 h-4" />
          </button>

          {/* Close Lightbox */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-red-600/80 text-white rounded-xs border border-white/20 transition-colors cursor-pointer"
            title="Close Album (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Main Image Stage */}
        <div className="flex-1 relative flex items-center justify-center p-4 sm:p-8 overflow-hidden select-none">
          {/* Previous Image Arrow */}
          {totalImages > 1 && (
            <button
              type="button"
              onClick={isRtl ? handleNextImage : handlePrevImage}
              className="absolute left-4 rtl:left-auto rtl:right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-[var(--color-text)]/60 hover:bg-[var(--color-text)] text-white border border-[var(--color-accent)]/40 shadow-lg transition-transform hover:scale-110 cursor-pointer"
              title="Previous Photo"
            >
              {isRtl ? <ChevronRight className="w-6 h-6" /> : <ChevronLeft className="w-6 h-6" />}
            </button>
          )}

          {/* Next Image Arrow */}
          {totalImages > 1 && (
            <button
              type="button"
              onClick={isRtl ? handlePrevImage : handleNextImage}
              className="absolute right-4 rtl:right-auto rtl:left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-[var(--color-text)]/60 hover:bg-[var(--color-text)] text-white border border-[var(--color-accent)]/40 shadow-lg transition-transform hover:scale-110 cursor-pointer"
              title="Next Photo"
            >
              {isRtl ? <ChevronLeft className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
            </button>
          )}

          {/* High Resolution Display Canvas */}
          <div className="w-full h-full flex items-center justify-center overflow-hidden">
            <img
              src={currentImage}
              alt={activeProduct.nameEn}
              style={{
                transform: `scale(${zoomLevel})`,
                transition: 'transform 0.25s ease-out',
                maxHeight: 'calc(100vh - 180px)',
              }}
              className="object-contain max-w-full rounded-xs shadow-2xl transition-all cursor-zoom-in"
              onClick={() => setZoomLevel((z) => (z === 1 ? 2 : 1))}
            />
          </div>

          {/* Bottom Thumbnail Filmstrip */}
          {totalImages > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-[var(--color-text)]/70 backdrop-blur-md px-3 py-2 rounded-xs border border-[var(--color-accent)]/40 flex items-center gap-2.5 max-w-[90vw] overflow-x-auto shadow-xl">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setZoomLevel(1);
                    setCurrentImageIndex(idx);
                  }}
                  className={`w-12 h-14 sm:w-14 sm:h-16 rounded-xs overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                    currentImageIndex === idx
                      ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/50 scale-105'
                      : 'border-white/30 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Product Fast Switcher Pill at Top Center */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-[var(--color-text)]/70 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 flex items-center gap-3 text-xs text-[var(--color-bg)] shadow-lg">
            <button
              type="button"
              onClick={handlePrevProduct}
              className="hover:text-white flex items-center gap-1 cursor-pointer"
              title="Previous Product"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{language === 'ar' ? 'السابق' : language === 'ru' ? 'Назад' : language === 'fr' ? 'Précédent' : 'Prev Piece'}</span>
            </button>
            <span className="text-[var(--color-accent)] font-mono">·</span>
            <span className="font-semibold truncate max-w-[160px] sm:max-w-[220px]">
              {language === 'ar' 
                ? activeProduct.nameAr 
                : language === 'ru' && activeProduct.nameRu 
                  ? activeProduct.nameRu 
                  : language === 'fr' && activeProduct.nameFr 
                    ? activeProduct.nameFr 
                    : activeProduct.nameEn}
            </span>
            <span className="text-[var(--color-accent)] font-mono">·</span>
            <button
              type="button"
              onClick={handleNextProduct}
              className="hover:text-white flex items-center gap-1 cursor-pointer"
              title="Next Product"
            >
              <span className="hidden sm:inline">{language === 'ar' ? 'التالي' : language === 'ru' ? 'Далее' : language === 'fr' ? 'Suivant' : 'Next Piece'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Product Details & Purchase Drawer (Collapsible Sidebar) */}
        {isSidebarOpen && (
          <div className="w-full md:w-96 bg-[var(--color-text)] text-[var(--color-bg)] p-6 border-t md:border-t-0 md:border-l rtl:md:border-l-0 rtl:md:border-r border-[var(--color-accent)]/30 flex flex-col justify-between overflow-y-auto shrink-0 z-20 shadow-2xl">
            <div className="space-y-5">
              {/* Category & Status */}
              <div className="flex items-center justify-between text-xs">
                <span className="uppercase tracking-widest text-[var(--color-accent)] font-semibold">
                  {language === 'ar' 
                    ? activeProduct.categoryNameAr 
                    : language === 'ru' && activeProduct.categoryNameRu 
                      ? activeProduct.categoryNameRu 
                      : language === 'fr' && activeProduct.categoryNameFr 
                        ? activeProduct.categoryNameFr 
                        : activeProduct.categoryNameEn}
                </span>
                <span className={`px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase tracking-wider ${
                  isOutOfStock
                    ? 'bg-red-900/60 text-red-200 border border-red-500/50'
                    : isLowStock
                    ? 'bg-amber-900/60 text-amber-200 border border-amber-500/50'
                    : 'bg-emerald-900/60 text-emerald-200 border border-emerald-500/50'
                }`}>
                  {isOutOfStock
                    ? (language === 'ar' ? 'نفذت الكمية' : 'Out of Stock')
                    : isLowStock
                    ? (language === 'ar' ? `كمية محدودة: باقي ${totalStock}` : `Low Stock: ${totalStock} left`)
                    : (language === 'ar' ? `متوفر: ${totalStock} قطعة` : `In Stock: ${totalStock} units`)}
                </span>
              </div>

              {/* Product Title */}
              <h2 className="font-heading text-xl sm:text-2xl font-bold text-white leading-tight">
                {language === 'ar' ? activeProduct.nameAr : activeProduct.nameEn}
              </h2>

              {/* Price Block */}
              <div className="flex items-baseline gap-3 py-2 border-y border-[var(--color-accent)]/30">
                <span className="text-2xl font-bold text-[var(--color-bg)] tabular-nums">
                  {formatBHD(unitPrice)}
                </span>
                {activeProduct.salePrice && (
                  <span className="text-sm text-[var(--color-bg)]/50 line-through tabular-nums">
                    {formatBHD(activeProduct.price)}
                  </span>
                )}
                {activeProduct.salePrice && (
                  <span className="text-[11px] font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/20 px-2 py-0.5 rounded-xs">
                    {Math.round(((activeProduct.price - activeProduct.salePrice) / activeProduct.price) * 100)}% OFF
                  </span>
                )}
              </div>

              {/* Editorial Description */}
              <p className="text-xs text-[var(--color-bg)]/85 leading-relaxed font-light">
                {language === 'ar' ? activeProduct.descriptionAr : activeProduct.descriptionEn}
              </p>

              {/* Material & Tailoring Note */}
              <div className="bg-[var(--color-text)]/60 p-3.5 rounded-xs border border-[var(--color-accent)]/30 space-y-1.5 text-xs">
                <p className="font-semibold text-[var(--color-accent)]">
                  {language === 'ar' ? 'الخامة والتفصيل:' : 'Fabric & Composition:'}
                </p>
                <p className="text-[11px] text-[var(--color-bg)]/90">
                  {language === 'ar' ? activeProduct.materialAr : activeProduct.materialEn}
                </p>
              </div>

              {/* Available Shades / Varieties in Stock */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--color-accent)] font-semibold uppercase tracking-wider">
                    {language === 'ar' ? 'الألوان المتاحة بالألبوم:' : 'Available Shades:'}
                  </span>
                  <span className="text-[11px] text-[var(--color-bg)]/60">
                    {activeProduct.variants.length} {language === 'ar' ? 'موديلات' : 'varieties'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {Array.from(new Set(activeProduct.variants.map((v) => v.colorHex))).map((hex) => {
                    const variant = activeProduct.variants.find((v) => v.colorHex.toLowerCase() === hex.toLowerCase());
                    return (
                      <div
                        key={hex}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--color-text)]/70 border border-[var(--color-accent)]/30 rounded-xs text-[11px]"
                      >
                        <span
                          className="w-3 h-3 rounded-full border border-white/20 shrink-0"
                          style={{ backgroundColor: hex }}
                        />
                        <span>{language === 'ar' ? variant?.colorNameAr : variant?.colorNameEn}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-6 border-t border-[var(--color-accent)]/30 space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  onSelectProduct(activeProduct);
                  onClose();
                }}
                className="w-full py-3 px-4 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold text-xs uppercase tracking-wider rounded-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>{language === 'ar' ? 'تصفح المقاسات والموديلات كاملة' : 'Select Varieties & View Details'}</span>
              </button>

              <button
                type="button"
                onClick={handleQuickAdd}
                disabled={isOutOfStock}
                className={`w-full py-2.5 px-4 rounded-xs text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                  isOutOfStock
                    ? 'bg-white/10 text-white/40 cursor-not-allowed'
                    : isAddedFeedback
                    ? 'bg-emerald-700 text-white'
                    : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white shadow-sm'
                }`}
              >
                {isAddedFeedback ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{language === 'ar' ? 'تمت الإضافة للحقيبة' : 'Added to Bag'}</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    <span>{language === 'ar' ? 'إضافة سريعة للحقيبة' : 'Quick Add to Bag'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
