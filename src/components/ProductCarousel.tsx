import React, { useRef } from 'react';
import { Product } from '../types';
import { ProductCard } from './ProductCard';
import { useLanguage } from '../context/LanguageContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ProductCarouselProps {
  title: string;
  subtitle?: string;
  products: Product[];
  onQuickView: (product: Product) => void;
  onSelectProduct: (product: Product) => void;
  onViewAll?: () => void;
  onOpenAlbumModal?: (product: Product, initialIndex?: number) => void;
}

export const ProductCarousel: React.FC<ProductCarouselProps> = ({
  title,
  subtitle,
  products,
  onQuickView,
  onSelectProduct,
  onViewAll,
  onOpenAlbumModal,
}) => {
  const { isRtl, language } = useLanguage();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const scrollAmount = 320;
    // In RTL, scrollLeft behaves inversely in standard browsers
    const multiplier = direction === 'left' ? -1 : 1;
    container.scrollBy({
      left: multiplier * scrollAmount,
      behavior: 'smooth',
    });
  };

  if (!products || products.length === 0) return null;

  return (
    <section className="py-12 border-b border-[#E1D1E4]/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <h2 className="font-heading text-2xl sm:text-3xl font-semibold text-[#340404] tracking-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs sm:text-sm text-[#340404]/70 mt-1 font-light">
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {onViewAll && (
              <button
                onClick={onViewAll}
                className="text-xs uppercase font-semibold tracking-wider text-[#340404] hover:text-[#E22001] mr-3 rtl:mr-0 rtl:ml-3 transition-colors"
              >
                {language === 'ar' ? 'عرض الكل' : 'View All'}
              </button>
            )}

            {/* Carousel navigation controls (flip in RTL) */}
            <button
              onClick={() => scroll(isRtl ? 'right' : 'left')}
              className="p-2 rounded-full border border-[#E1D1E4] bg-white text-[#340404] hover:bg-[#E1D1E4] hover:text-[#E22001] transition-colors shadow-xs"
              aria-label="Previous Products"
            >
              {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            <button
              onClick={() => scroll(isRtl ? 'left' : 'right')}
              className="p-2 rounded-full border border-[#E1D1E4] bg-white text-[#340404] hover:bg-[#E1D1E4] hover:text-[#E22001] transition-colors shadow-xs"
              aria-label="Next Products"
            >
              {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Horizontal Carousel Track */}
        <div
          ref={scrollContainerRef}
          className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 pt-1 scrollbar-none scroll-smooth snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {products.map((product) => (
            <div
              key={product.id}
              className="w-[260px] sm:w-[280px] lg:w-[290px] shrink-0 snap-start"
            >
              <ProductCard
                product={product}
                onQuickView={onQuickView}
                onSelectProduct={onSelectProduct}
                onOpenAlbumModal={onOpenAlbumModal}
              />
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
