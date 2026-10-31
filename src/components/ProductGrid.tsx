import React from 'react';
import { Product } from '../types';
import { ProductCard } from './ProductCard';
import { ProductCardSkeleton } from './ProductCardSkeleton';
import { EmptyState } from './EmptyState';

interface ProductGridProps {
  products: Product[];
  isLoading?: boolean;
  onSelectProduct: (product: Product) => void;
  onQuickView?: (product: Product) => void;
  onOpenAlbumModal?: (product: Product, initialIndex?: number) => void;
  onClearFilters: () => void;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  isLoading = false,
  onSelectProduct,
  onQuickView,
  onOpenAlbumModal,
  onClearFilters,
}) => {
  if (isLoading) {
    return (
      <div 
        className="w-full px-4 sm:px-6 md:px-12 py-6"
        style={{ paddingLeft: 'clamp(16px, 3.5vw, 48px)', paddingRight: 'clamp(16px, 3.5vw, 48px)' }}
      >
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, idx) => (
            <ProductCardSkeleton key={`skeleton-${idx}`} />
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return <EmptyState onClearFilters={onClearFilters} />;
  }

  return (
    <section 
      aria-label="Products catalog"
      className="w-full px-4 sm:px-6 md:px-12 py-6"
      style={{ paddingLeft: 'clamp(16px, 3.5vw, 48px)', paddingRight: 'clamp(16px, 3.5vw, 48px)' }}
    >
      {/* 4 columns at 1280px and up, 3 at 1024px, 2 on tablet and mobile. 20px gap. */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onSelectProduct={onSelectProduct}
            onQuickView={onQuickView}
            onOpenAlbumModal={onOpenAlbumModal}
          />
        ))}
      </div>
    </section>
  );
};
