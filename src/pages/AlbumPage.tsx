import React, { useState } from 'react';
import { Product } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useStore } from '../context/StoreContext';
import { 
  Images, 
  Maximize2, 
  SlidersHorizontal, 
  Package, 
  Sparkles, 
  Search, 
  Check, 
  Eye, 
  ShoppingBag,
  Filter,
  Grid3X3,
  Columns,
  Layers,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface AlbumPageProps {
  onSelectProduct: (p: Product) => void;
  onOpenAlbumModal: (product: Product, initialIndex?: number) => void;
  onQuickView: (product: Product) => void;
}

export const AlbumPage: React.FC<AlbumPageProps> = ({
  onSelectProduct,
  onOpenAlbumModal,
  onQuickView,
}) => {
  const { language, formatBHD, isRtl } = useLanguage();
  const { products, categories } = useStore();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [layoutMode, setLayoutMode] = useState<'editorial' | 'grid'>('editorial');
  const [activeCardImageIndexes, setActiveCardImageIndexes] = useState<Record<string, number>>({});

  // Filter products
  const filteredProducts = products.filter((p) => {
    if (selectedCategory !== 'all' && p.categoryId !== selectedCategory) {
      return false;
    }
    const totalStock = (p.variants || []).reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
    if (inStockOnly && totalStock <= 0) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.nameEn.toLowerCase().includes(q) || p.nameAr.includes(q);
      const matchSku = p.sku.toLowerCase().includes(q);
      const matchCat = p.categoryNameEn.toLowerCase().includes(q);
      if (!matchName && !matchSku && !matchCat) return false;
    }
    return true;
  });

  const handleNextCardImage = (e: React.MouseEvent, productId: string, totalImages: number) => {
    e.stopPropagation();
    setActiveCardImageIndexes((prev) => ({
      ...prev,
      [productId]: ((prev[productId] || 0) + 1) % totalImages,
    }));
  };

  const handlePrevCardImage = (e: React.MouseEvent, productId: string, totalImages: number) => {
    e.stopPropagation();
    setActiveCardImageIndexes((prev) => ({
      ...prev,
      [productId]: ((prev[productId] || 0) - 1 + totalImages) % totalImages,
    }));
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* Editorial Header Banner */}
      <section className="bg-[var(--color-text)] text-[var(--color-bg)] py-14 sm:py-20 border-b border-[var(--color-accent)]/40 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[var(--color-accent)]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-10 w-80 h-80 bg-[var(--color-primary)]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[var(--color-accent)] text-xs font-semibold uppercase tracking-widest border border-[var(--color-accent)]/30">
            <Images className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'ألبوم صور التشكيلة لعام ٢٠٢٦' : '2026 Collection Image Album'}</span>
          </div>

          <h1 className="font-heading text-3xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight">
            {language === 'ar' ? 'معرض صور ملابس النوم الفاخرة' : 'Boutique Sleepwear Image Album'}
          </h1>

          <p className="max-w-2xl mx-auto text-xs sm:text-sm text-[var(--color-bg)]/80 leading-relaxed font-light">
            {language === 'ar'
              ? 'تصفحي تفاصيل التصاميم والخامات الملكية من حرير التوت الطبيعي والدانتيل الفرنسي الناعم عبر ألبوم الصور الحصري لجميع القطع المتوفرة بالبحرين.'
              : 'Immerse yourself in high-resolution photography capturing the ethereal drape of pure Mulberry silk, hand-cut French eyelash lace, and liquid satin nightwear.'}
          </p>

          <div className="flex items-center justify-center gap-6 pt-2 text-xs text-[var(--color-accent)] font-medium font-mono">
            <span>{products.length} {language === 'ar' ? 'تصميم حصري' : 'Signature Pieces'}</span>
            <span>·</span>
            <span>{products.reduce((acc, p) => acc + (p.images?.length || 1), 0)} {language === 'ar' ? 'صورة عالية الدقة' : 'High-Res Photographs'}</span>
            <span>·</span>
            <span>{language === 'ar' ? 'متوفر بمستودع البحرين' : 'In-Stock in Bahrain'}</span>
          </div>
        </div>
      </section>

      {/* Filter & Layout Navigation Toolbar */}
      <section className="sticky top-20 z-30 bg-[var(--color-bg)]/95 backdrop-blur-md border-b border-[var(--color-border)] py-4 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 text-xs">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-1.5 rounded-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-[var(--color-text)] text-[var(--color-bg)]'
                  : 'bg-white border border-[var(--color-border)] text-[var(--color-text)] hover:bg-white/80'
              }`}
            >
              {language === 'ar' ? 'جميع القطع' : 'All Pieces'}
            </button>

            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-[var(--color-text)] text-[var(--color-bg)] font-bold'
                    : 'bg-white border border-[var(--color-border)] text-[var(--color-text)] hover:bg-white/80'
                }`}
              >
                {language === 'ar' ? cat.nameAr : cat.nameEn}
              </button>
            ))}
          </div>

          {/* Search, Stock Toggle, and Layout Mode Controls */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            {/* Live In-Stock Only Toggle */}
            <label className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="w-4 h-4 accent-[var(--color-primary)] rounded"
              />
              <span>{language === 'ar' ? 'المتوفر فقط بالمخزون' : 'In Stock Only'}</span>
            </label>

            {/* Layout Toggles */}
            <div className="flex items-center bg-white border border-[var(--color-border)] rounded-xs p-0.5">
              <button
                type="button"
                onClick={() => setLayoutMode('editorial')}
                className={`p-1.5 rounded-xs transition-colors cursor-pointer ${
                  layoutMode === 'editorial' ? 'bg-[var(--color-text)] text-[var(--color-bg)]' : 'text-[var(--color-text)] hover:bg-gray-100'
                }`}
                title="Editorial Masonry View"
              >
                <Columns className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('grid')}
                className={`p-1.5 rounded-xs transition-colors cursor-pointer ${
                  layoutMode === 'grid' ? 'bg-[var(--color-text)] text-[var(--color-bg)]' : 'text-[var(--color-text)] hover:bg-gray-100'
                }`}
                title="Standard Album Grid"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* Album Gallery Showcase */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        {filteredProducts.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-sm border border-[var(--color-border)] space-y-4 max-w-lg mx-auto shadow-xs">
            <Images className="w-10 h-10 text-[var(--color-accent)] mx-auto opacity-70" />
            <h3 className="font-heading text-xl font-bold text-[var(--color-text)]">
              {language === 'ar' ? 'لا توجد صور مطابقة لخيارات التصفية' : 'No Album Images Found'}
            </h3>
            <p className="text-xs text-[var(--color-text)]/70">
              {language === 'ar' ? 'جربي إزالة التصفية لعرض جميع صور ملابس النوم.' : 'Try resetting the filters to view the complete sleepwear collection.'}
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all');
                setInStockOnly(false);
                setSearchQuery('');
              }}
              className="px-5 py-2 bg-[var(--color-text)] text-white text-xs font-semibold uppercase tracking-wider rounded-xs cursor-pointer"
            >
              {language === 'ar' ? 'إعادة ضبط التصفية' : 'Reset Filters'}
            </button>
          </div>
        ) : (
          <div className={
            layoutMode === 'editorial'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10'
              : 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6'
          }>
            {filteredProducts.map((product) => {
              const images = product.images && product.images.length > 0
                ? product.images
                : ['/images/hero_pic.jpeg'];

              const totalImages = images.length;
              const activeImageIdx = activeCardImageIndexes[product.id] || 0;
              const currentImg = images[activeImageIdx] || images[0];

              const totalStock = (product.variants || []).reduce(
                (sum, v) => sum + (Number(v.stock) || 0),
                0
              );
              const isOutOfStock = totalStock === 0;
              const isLowStock = totalStock > 0 && totalStock <= 4;
              const unitPrice = product.salePrice ?? product.price;

              return (
                <div
                  key={product.id}
                  className="group bg-white rounded-sm border border-[var(--color-border)] overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                >
                  {/* Visual Canvas Card */}
                  <div className="relative aspect-[3/4] bg-neutral-100 overflow-hidden cursor-pointer">
                    <img
                      src={currentImg}
                      alt={language === 'ar' ? product.nameAr : product.nameEn}
                      className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                      loading="lazy"
                      onClick={() => onOpenAlbumModal(product, activeImageIdx)}
                    />

                    {/* Image Counter Badge */}
                    <div className="absolute top-3 left-3 rtl:left-auto rtl:right-3 bg-black/65 backdrop-blur-md text-white text-[10px] font-mono font-semibold px-2 py-0.5 rounded-xs flex items-center gap-1 z-10">
                      <Images className="w-3 h-3 text-[var(--color-accent)]" />
                      <span>{activeImageIdx + 1}/{totalImages}</span>
                    </div>

                    {/* Available Stock Tag */}
                    <div className="absolute top-3 right-3 rtl:right-auto rtl:left-3 z-10">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-xs uppercase tracking-wider ${
                        isOutOfStock
                          ? 'bg-red-600 text-white'
                          : isLowStock
                          ? 'bg-amber-500 text-white'
                          : 'bg-[var(--color-text)]/80 text-[var(--color-bg)] backdrop-blur-xs'
                      }`}>
                        {isOutOfStock
                          ? (language === 'ar' ? 'نفذت الكمية' : 'Out of Stock')
                          : isLowStock
                          ? (language === 'ar' ? `باقي ${totalStock} قطع` : `${totalStock} Left`)
                          : (language === 'ar' ? `${totalStock} متوفر` : `${totalStock} in Stock`)}
                      </span>
                    </div>

                    {/* Multi-Image Navigation Arrows (if product has multiple images) */}
                    {totalImages > 1 && (
                      <div className="absolute inset-y-0 inset-x-2 flex items-center justify-between pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => handlePrevCardImage(e, product.id, totalImages)}
                          className="p-1.5 rounded-full bg-black/60 hover:bg-[var(--color-text)] text-white pointer-events-auto transition-transform hover:scale-110 cursor-pointer shadow-md"
                          title="Previous Photo"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleNextCardImage(e, product.id, totalImages)}
                          className="p-1.5 rounded-full bg-black/60 hover:bg-[var(--color-text)] text-white pointer-events-auto transition-transform hover:scale-110 cursor-pointer shadow-md"
                          title="Next Photo"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Hover Overlay Button to Open Fullscreen Lightbox Album */}
                    <div className="absolute inset-x-4 bottom-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenAlbumModal(product, activeImageIdx);
                        }}
                        className="flex-1 py-2.5 px-3 bg-white/95 hover:bg-white text-[var(--color-text)] border border-[var(--color-border)] text-xs font-semibold uppercase tracking-wider rounded-xs shadow-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Maximize2 className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                        <span>{language === 'ar' ? 'فتح الألبوم كامل الشاشة' : 'Open Album View'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Clean Typographic Metadata (Anti-Slop, No Pills) */}
                  <div className="p-4 sm:p-5 flex flex-col justify-between flex-1 bg-white space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-[var(--color-accent)] uppercase tracking-wider font-semibold">
                        <span>{language === 'ar' ? product.categoryNameAr : product.categoryNameEn}</span>
                        <span className="font-mono text-[var(--color-text)]/60">SKU: {product.sku}</span>
                      </div>

                      <h3
                        onClick={() => onSelectProduct(product)}
                        className="font-heading text-base sm:text-lg font-semibold text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors cursor-pointer leading-snug line-clamp-1"
                      >
                        {language === 'ar' ? product.nameAr : product.nameEn}
                      </h3>

                      <p className="text-xs text-[var(--color-text)]/70 line-clamp-2 leading-relaxed font-light">
                        {language === 'ar' ? product.descriptionAr : product.descriptionEn}
                      </p>
                    </div>

                    {/* Color Swatches and Price */}
                    <div className="pt-3 border-t border-[var(--color-border)]/60 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {Array.from(new Set(product.variants.map((v) => v.colorHex))).map((hex) => (
                          <span
                            key={hex}
                            className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-xs"
                            style={{ backgroundColor: hex }}
                            title={hex}
                          />
                        ))}
                      </div>

                      <div className="text-right rtl:text-left">
                        {product.salePrice ? (
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-sm sm:text-base font-bold text-[var(--color-primary)] tabular-nums">
                              {formatBHD(product.salePrice)}
                            </span>
                            <span className="text-xs text-[var(--color-text)]/50 line-through tabular-nums">
                              {formatBHD(product.price)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm sm:text-base font-bold text-[var(--color-text)] tabular-nums">
                            {formatBHD(product.price)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Link: Explore Varieties */}
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectProduct(product)}
                        className="flex-1 py-2 bg-[var(--color-bg)] hover:bg-[var(--color-text)] text-[var(--color-text)] hover:text-[var(--color-bg)] text-xs font-semibold uppercase tracking-wider rounded-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                        <span>{language === 'ar' ? 'تصفح الموديلات' : 'Explore Varieties'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenAlbumModal(product, activeImageIdx)}
                        className="p-2 border border-[var(--color-border)] hover:bg-[var(--color-bg)] text-[var(--color-text)] rounded-xs transition-colors cursor-pointer"
                        title="View Fullscreen Album"
                      >
                        <Maximize2 className="w-4 h-4 text-[var(--color-accent)]" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
