import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { Product, ProductSize, KidAgeRange } from '../types';
import { CategoryChips } from '../components/CategoryChips';
import { FilterBar, FilterState } from '../components/FilterBar';
import { ProductGrid } from '../components/ProductGrid';
import { ArrowDown, Sparkles } from 'lucide-react';

interface ShopPageProps {
  initialFilter?: string;
  initialCategory?: string;
  initialSearch?: string;
  initialAgeGroup?: KidAgeRange;
  onQuickView?: (product: Product) => void;
  onSelectProduct: (product: Product) => void;
  onOpenAlbumModal?: (product: Product, initialIndex?: number) => void;
  onNavigate?: (page: string, params?: any) => void;
}

const PRODUCTS_PER_PAGE = 8;

export const ShopPage: React.FC<ShopPageProps> = ({
  initialFilter,
  initialCategory,
  initialSearch = '',
  initialAgeGroup,
  onQuickView,
  onSelectProduct,
  onOpenAlbumModal,
  onNavigate,
}) => {
  const { products } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const { language, formatBHD, isRtl } = useLanguage();

  // Compute Catalog Boundaries
  const { minCatalogPrice, maxCatalogPrice, availableSizes, availableColors, availableFabrics } = useMemo(() => {
    let minP = 10;
    let maxP = 60;
    const sizesSet = new Set<ProductSize>();
    const colorsMap = new Map<string, { hex: string; nameEn: string; nameAr: string }>();

    if (products.length > 0) {
      const prices = products.map((p) => p.salePrice || p.price);
      minP = Math.floor(Math.min(...prices));
      maxP = Math.ceil(Math.max(...products.map((p) => p.price)));

      products.forEach((p) => {
        p.variants.forEach((v) => {
          if (v.stock > 0) {
            sizesSet.add(v.size);
            if (!colorsMap.has(v.colorHex)) {
              colorsMap.set(v.colorHex, {
                hex: v.colorHex,
                nameEn: v.colorNameEn,
                nameAr: v.colorNameAr,
              });
            }
          }
        });
      });
    }

    // Supported fabrics based on real materials in catalog
    const fabrics = [
      { id: 'silk', nameEn: 'Mulberry Silk', nameAr: 'حرير التوت الطبيعي', nameRu: 'Шёлк малбери' },
      { id: 'satin', nameEn: 'Liquid Satin', nameAr: 'ساتان فائق النعومة', nameRu: 'Атласный сатин' },
      { id: 'cotton', nameEn: 'Organic Cotton', nameAr: 'قطن بيما عضوي', nameRu: 'Органический хлопок' },
      { id: 'lace', nameEn: 'Chantilly Lace', nameAr: 'دانتيل شانتيلي', nameRu: 'Французское кружево' },
      { id: 'velvet', nameEn: 'Silk Velvet', nameAr: 'مخمل حريري', nameRu: 'Шёлковый бархат' },
    ];

    // Desired size order
    const sizeOrder: ProductSize[] = ['XS', 'S', 'M', 'L', 'XL', 'Free Size', '3-4Y', '4-5Y', '5-6Y', '6-7Y', '8-9Y', '10-12Y'];
    const sortedSizes = Array.from(sizesSet).sort((a, b) => {
      const idxA = sizeOrder.indexOf(a);
      const idxB = sizeOrder.indexOf(b);
      return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
    });

    return {
      minCatalogPrice: minP,
      maxCatalogPrice: maxP,
      availableSizes: sortedSizes,
      availableColors: Array.from(colorsMap.values()),
      availableFabrics: fabrics,
    };
  }, [products]);

  // Read initial query params from URL if present
  const getInitialFiltersFromUrl = (): FilterState & { category: string; search: string } => {
    if (typeof window === 'undefined') {
      return {
        category: initialCategory || 'all',
        collection: initialFilter || 'all',
        size: 'all',
        color: 'all',
        minPrice: minCatalogPrice,
        maxPrice: maxCatalogPrice,
        fabric: 'all',
        sort: 'bestSeller',
        search: initialSearch,
      };
    }

    const params = new URLSearchParams(window.location.search);
    return {
      category: params.get('category') || initialCategory || 'all',
      collection: params.get('collection') || initialFilter || 'all',
      size: (params.get('size') as ProductSize) || 'all',
      color: params.get('color') || 'all',
      minPrice: Number(params.get('minPrice')) || minCatalogPrice,
      maxPrice: Number(params.get('maxPrice')) || maxCatalogPrice,
      fabric: params.get('fabric') || 'all',
      sort: (params.get('sort') as any) || 'bestSeller',
      search: params.get('search') || initialSearch,
    };
  };

  const initialUrlState = getInitialFiltersFromUrl();

  // State Management
  const [selectedCategory, setSelectedCategory] = useState<string>(initialUrlState.category);
  const [filters, setFilters] = useState<FilterState>({
    size: initialUrlState.size,
    color: initialUrlState.color,
    minPrice: initialUrlState.minPrice,
    maxPrice: initialUrlState.maxPrice || maxCatalogPrice,
    fabric: initialUrlState.fabric,
    collection: initialUrlState.collection,
    sort: initialUrlState.sort,
  });
  const [searchQuery, setSearchQuery] = useState<string>(initialUrlState.search);
  const [visibleCount, setVisibleCount] = useState<number>(PRODUCTS_PER_PAGE);

  // Sync state with URL Query String so views are shareable and back-button works
  const syncUrl = useCallback(
    (cat: string, f: FilterState, search: string) => {
      if (typeof window === 'undefined') return;
      const url = new URL(window.location.href);

      if (cat !== 'all') url.searchParams.set('category', cat);
      else url.searchParams.delete('category');

      if (f.collection !== 'all') url.searchParams.set('collection', f.collection);
      else url.searchParams.delete('collection');

      if (f.size !== 'all') url.searchParams.set('size', f.size);
      else url.searchParams.delete('size');

      if (f.color !== 'all') url.searchParams.set('color', f.color);
      else url.searchParams.delete('color');

      if (f.fabric !== 'all') url.searchParams.set('fabric', f.fabric);
      else url.searchParams.delete('fabric');

      if (f.sort !== 'bestSeller') url.searchParams.set('sort', f.sort);
      else url.searchParams.delete('sort');

      if (f.maxPrice < maxCatalogPrice) url.searchParams.set('maxPrice', String(f.maxPrice));
      else url.searchParams.delete('maxPrice');

      if (search) url.searchParams.set('search', search);
      else url.searchParams.delete('search');

      window.history.replaceState({}, '', url.toString());
    },
    [maxCatalogPrice]
  );

  // Listen for browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const updated = getInitialFiltersFromUrl();
      setSelectedCategory(updated.category);
      setFilters({
        size: updated.size,
        color: updated.color,
        minPrice: updated.minPrice,
        maxPrice: updated.maxPrice || maxCatalogPrice,
        fabric: updated.fabric,
        collection: updated.collection,
        sort: updated.sort,
      });
      setSearchQuery(updated.search);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [maxCatalogPrice]);

  // Update whenever props change from parent navigation
  useEffect(() => {
    if (initialCategory !== undefined) setSelectedCategory(initialCategory || 'all');
    if (initialFilter !== undefined) setFilters((prev) => ({ ...prev, collection: initialFilter || 'all' }));
    if (initialSearch !== undefined) setSearchQuery(initialSearch);
  }, [initialCategory, initialFilter, initialSearch]);

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setVisibleCount(PRODUCTS_PER_PAGE);
    syncUrl(categoryId, filters, searchQuery);
  };

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters((prev) => {
      const updated = { ...prev, ...newFilters };
      syncUrl(selectedCategory, updated, searchQuery);
      return updated;
    });
    setVisibleCount(PRODUCTS_PER_PAGE);
  };

  const handleClearAll = () => {
    const resetFilters: FilterState = {
      size: 'all',
      color: 'all',
      minPrice: minCatalogPrice,
      maxPrice: maxCatalogPrice,
      fabric: 'all',
      collection: 'all',
      sort: 'bestSeller',
    };
    setSelectedCategory('all');
    setSearchQuery('');
    setFilters(resetFilters);
    setVisibleCount(PRODUCTS_PER_PAGE);
    syncUrl('all', resetFilters, '');
  };

  // Derive visible products with useMemo (NO duplicate in state)
  const filteredProducts = useMemo(() => {
    let result = products.filter((p) => {
      if (!p.active) return false;

      // Category Filter
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'cat-kids-sleepwear') {
          if (p.categoryId !== 'cat-kids-sleepwear' && !p.isKids) return false;
        } else if (p.categoryId !== selectedCategory) {
          return false;
        }
      }

      // Collection Filter
      if (filters.collection === 'newArrival' && !p.newArrival) return false;
      if (filters.collection === 'bestSeller' && !p.bestSeller) return false;
      if (filters.collection === 'sale' && (!p.salePrice || p.salePrice >= p.price)) return false;

      // Size Filter
      if (filters.size !== 'all') {
        const hasSize = p.variants.some((v) => v.size === filters.size && v.stock > 0);
        if (!hasSize) return false;
      }

      // Color Filter
      if (filters.color !== 'all') {
        const hasColor = p.variants.some((v) => v.colorHex.toLowerCase() === filters.color.toLowerCase() && v.stock > 0);
        if (!hasColor) return false;
      }

      // Price Range Filter
      const effectivePrice = p.salePrice || p.price;
      if (effectivePrice > filters.maxPrice) return false;

      // Fabric Filter
      if (filters.fabric !== 'all') {
        const mat = (p.materialEn || '').toLowerCase();
        if (filters.fabric === 'silk' && !mat.includes('silk') && !mat.includes('mulberry')) return false;
        if (filters.fabric === 'satin' && !mat.includes('satin')) return false;
        if (filters.fabric === 'cotton' && !mat.includes('cotton') && !mat.includes('pima')) return false;
        if (filters.fabric === 'lace' && !mat.includes('lace') && !mat.includes('chantilly')) return false;
        if (filters.fabric === 'velvet' && !mat.includes('velvet')) return false;
      }

      // Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchNameEn = p.nameEn.toLowerCase().includes(query);
        const matchNameAr = p.nameAr.toLowerCase().includes(query);
        const matchDesc = p.descriptionEn.toLowerCase().includes(query);
        const matchMat = (p.materialEn || '').toLowerCase().includes(query);
        const matchTag = p.tags.some((t) => t.toLowerCase().includes(query));
        if (!matchNameEn && !matchNameAr && !matchDesc && !matchMat && !matchTag) {
          return false;
        }
      }

      return true;
    });

    // Sorting Logic
    return result.sort((a, b) => {
      const priceA = a.salePrice || a.price;
      const priceB = b.salePrice || b.price;

      switch (filters.sort) {
        case 'price-asc':
          return priceA - priceB;
        case 'price-desc':
          return priceB - priceA;
        case 'rating':
          return (b.rating || 0) - (a.rating || 0) || (b.reviewCount || 0) - (a.reviewCount || 0);
        case 'newArrival':
          return (b.newArrival ? 1 : 0) - (a.newArrival ? 1 : 0) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'bestSeller':
        default:
          return (b.bestSeller ? 1 : 0) - (a.bestSeller ? 1 : 0) || (b.reviewCount || 0) - (a.reviewCount || 0);
      }
    });
  }, [products, selectedCategory, filters, searchQuery]);

  const totalFilteredCount = filteredProducts.length;
  const displayedProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount]);

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + PRODUCTS_PER_PAGE, totalFilteredCount));
  };

  return (
    <div 
      className="min-h-screen bg-[#FFF8F6] text-[#2A1A20] flex flex-col transition-colors"
      style={{ 
        backgroundColor: 'var(--bg-shop, #FFF8F6)',
        color: 'var(--text-shop-main, #2A1A20)'
      }}
    >
      {/* 3. Category Chips Row (replaces old left sidebar completely) */}
      <CategoryChips
        selectedCategory={selectedCategory}
        onSelectCategory={handleCategorySelect}
      />

      {/* 4. Filter Bar (sticky just below the 68px header) */}
      <FilterBar
        totalCount={totalFilteredCount}
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearAll={handleClearAll}
        availableSizes={availableSizes}
        availableColors={availableColors}
        availableFabrics={availableFabrics}
        minCatalogPrice={minCatalogPrice}
        maxCatalogPrice={maxCatalogPrice}
      />

      {/* 5. Product Grid & States */}
      <div className="flex-1 pb-16">
        <ProductGrid
          products={displayedProducts}
          isLoading={isLoading}
          onSelectProduct={onSelectProduct}
          onQuickView={onQuickView}
          onOpenAlbumModal={onOpenAlbumModal}
          onClearFilters={handleClearAll}
        />

        {/* Pagination: "Load more" button showing "Showing X of N" */}
        {displayedProducts.length > 0 && displayedProducts.length < totalFilteredCount && (
          <div className="mt-8 mb-12 flex flex-col items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleLoadMore}
              className="h-[48px] px-8 rounded-[8px] bg-white hover:bg-[#DDD3EA] text-[#2A1A20] font-semibold text-[14px] border border-[#CFC3C6] hover:border-[#6B1E3F] shadow-xs hover:shadow-sm transition-all duration-150 inline-flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B3261E]"
            >
              <span>{language === 'ar' ? 'تحميل المزيد من المنتجات' : 'Load more products'}</span>
              <ArrowDown className="w-4 h-4 text-[#6B1E3F]" />
            </button>

            <span 
              className="text-[13px] font-medium tabular-nums"
              style={{ color: 'var(--text-shop-secondary, #5F5357)' }}
            >
              {language === 'ar' 
                ? `عرض ${displayedProducts.length} من أصل ${totalFilteredCount} منتج` 
                : `Showing ${displayedProducts.length} of ${totalFilteredCount}`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
