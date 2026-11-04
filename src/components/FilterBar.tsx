import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronDown, 
  X, 
  SlidersHorizontal, 
  RotateCcw,
  Check
} from 'lucide-react';
import { ProductSize } from '../types';
import { useLanguage } from '../context/LanguageContext';

export interface FilterState {
  size: ProductSize | 'all';
  color: string; // color hex or 'all'
  minPrice: number;
  maxPrice: number;
  fabric: string; // 'all', 'silk', 'satin', 'cotton', 'lace', 'velvet'
  collection: string; // 'all', 'newArrival', 'bestSeller', 'sale'
  sort: 'bestSeller' | 'newArrival' | 'price-asc' | 'price-desc' | 'rating';
}

interface FilterBarProps {
  totalCount: number;
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
  onClearAll: () => void;
  availableSizes: ProductSize[];
  availableColors: { hex: string; nameEn: string; nameAr: string }[];
  availableFabrics: { id: string; nameEn: string; nameAr: string }[];
  minCatalogPrice: number;
  maxCatalogPrice: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  totalCount,
  filters,
  onFilterChange,
  onClearAll,
  availableSizes,
  availableColors,
  availableFabrics,
  minCatalogPrice,
  maxCatalogPrice,
}) => {
  const { language, formatBHD, isRtl } = useLanguage();

  // Active open dropdown tracker
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);

  // Local state for debounced price slider
  const [localPriceMax, setLocalPriceMax] = useState<number>(filters.maxPrice);
  const priceDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalPriceMax(filters.maxPrice);
  }, [filters.maxPrice]);

  const handlePriceSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setLocalPriceMax(val);

    if (priceDebounceTimer.current) clearTimeout(priceDebounceTimer.current);
    priceDebounceTimer.current = setTimeout(() => {
      onFilterChange({ maxPrice: val });
    }, 250);
  };

  // Close dropdowns on outside click or Escape
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenDropdown(null);
        setIsMobileSheetOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleDropdown = (name: string) => {
    setOpenDropdown((prev) => (prev === name ? null : name));
  };

  // Active filter chip helpers
  const activeChips: { id: string; label: string; onRemove: () => void }[] = [];

  if (filters.collection !== 'all') {
    const colLabels: Record<string, { en: string; ar: string; ru: string; fr: string }> = {
      newArrival: { en: 'New Arrivals', ar: 'وصل حديثاً', ru: 'Новинки', fr: 'Nouveautés' },
      bestSeller: { en: 'Best Sellers', ar: 'الأكثر طلباً', ru: 'Хиты продаж', fr: 'Meilleures Ventes' },
      sale: { en: 'Sale & Offers', ar: 'التخفيضات', ru: 'Скидки и акции', fr: 'Offres Privilèges' },
    };
    const colObj = colLabels[filters.collection];
    if (colObj) {
      activeChips.push({
        id: 'collection',
        label: language === 'ar' ? colObj.ar : language === 'ru' ? colObj.ru : language === 'fr' ? colObj.fr : colObj.en,
        onRemove: () => onFilterChange({ collection: 'all' }),
      });
    }
  }

  if (filters.size !== 'all') {
    activeChips.push({
      id: 'size',
      label: `${language === 'ar' ? 'المقاس' : language === 'ru' ? 'Размер' : language === 'fr' ? 'Taille' : 'Size'}: ${filters.size}`,
      onRemove: () => onFilterChange({ size: 'all' }),
    });
  }

  if (filters.color !== 'all') {
    const foundColor = availableColors.find((c) => c.hex === filters.color);
    const colorName = foundColor 
      ? (language === 'ar' ? foundColor.nameAr : language === 'ru' && (foundColor as any).nameRu ? (foundColor as any).nameRu : language === 'fr' && (foundColor as any).nameFr ? (foundColor as any).nameFr : foundColor.nameEn) 
      : filters.color;
    activeChips.push({
      id: 'color',
      label: `${language === 'ar' ? 'اللون' : language === 'ru' ? 'Цвет' : language === 'fr' ? 'Couleur' : 'Color'}: ${colorName}`,
      onRemove: () => onFilterChange({ color: 'all' }),
    });
  }

  if (filters.fabric !== 'all') {
    const foundFabric = availableFabrics.find((f) => f.id === filters.fabric);
    const fabricName = foundFabric 
      ? (language === 'ar' ? foundFabric.nameAr : language === 'ru' && (foundFabric as any).nameRu ? (foundFabric as any).nameRu : language === 'fr' && (foundFabric as any).nameFr ? (foundFabric as any).nameFr : foundFabric.nameEn) 
      : filters.fabric;
    activeChips.push({
      id: 'fabric',
      label: `${language === 'ar' ? 'القماش' : language === 'ru' ? 'Ткань' : language === 'fr' ? 'Matière' : 'Fabric'}: ${fabricName}`,
      onRemove: () => onFilterChange({ fabric: 'all' }),
    });
  }

  if (filters.maxPrice < maxCatalogPrice) {
    activeChips.push({
      id: 'price',
      label: `≤ ${formatBHD(filters.maxPrice)}`,
      onRemove: () => onFilterChange({ maxPrice: maxCatalogPrice }),
    });
  }

  const sortOptions = [
    { id: 'bestSeller', labelEn: 'Best selling', labelAr: 'الأكثر مبيعاً', labelRu: 'По популярности', labelFr: 'Meilleures ventes' },
    { id: 'newArrival', labelEn: 'New arrivals', labelAr: 'وصل حديثاً', labelRu: 'Сначала новинки', labelFr: 'Nouveautés' },
    { id: 'price-asc', labelEn: 'Price low to high', labelAr: 'السعر: من الأقل للأعلى', labelRu: 'По возрастанию цены', labelFr: 'Prix croissant' },
    { id: 'price-desc', labelEn: 'Price high to low', labelAr: 'السعر: من الأعلى للأقل', labelRu: 'По убыванию цены', labelFr: 'Prix décroissant' },
    { id: 'rating', labelEn: 'Top rated', labelAr: 'الأعلى تقييماً', labelRu: 'По рейтингу', labelFr: 'Mieux notés' },
  ];

  const currentSortLabel = sortOptions.find((s) => s.id === filters.sort);

  return (
    <div 
      ref={barRef}
      className="sticky top-[68px] z-30 bg-[var(--color-bg)]/95 backdrop-blur-sm border-b border-[var(--color-border)] transition-colors"
    >
      <div 
        className="w-full px-4 sm:px-6 md:px-12 py-3 flex items-center justify-between gap-4"
        style={{ paddingLeft: 'clamp(16px, 3.5vw, 48px)', paddingRight: 'clamp(16px, 3.5vw, 48px)' }}
      >
        
        {/* Left Side: Dropdown buttons Size, Color, Price, Fabric */}
        <div className="hidden md:flex items-center gap-2.5 flex-wrap">
          
          {/* Collection Filter Dropdown (New Arrivals, Best Sellers, Sale) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleDropdown('collection')}
              aria-expanded={openDropdown === 'collection'}
              className={`h-[44px] px-4 rounded-[8px] border text-[14px] font-medium flex items-center gap-2 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                filters.collection !== 'all'
                  ? 'bg-[var(--color-card)] text-[var(--color-text)] border-[var(--color-primary)] font-semibold'
                  : 'bg-white text-[var(--color-text)] hover:bg-[var(--color-card)]/50 border-[var(--color-border)]'
              }`}
            >
              <span>{language === 'ar' ? 'المجموعات' : 'Collection'}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === 'collection' ? 'rotate-180' : ''}`} />
            </button>

            {openDropdown === 'collection' && (
              <div 
                className="absolute top-full mt-1.5 z-40 w-48 bg-[var(--color-bg)] rounded-[8px] border border-[var(--color-border)] shadow-lg p-2 animate-in fade-in duration-150"
              >
                {[
                  { id: 'all', labelEn: 'All Items', labelAr: 'كل المنتجات' },
                  { id: 'newArrival', labelEn: 'New Arrivals', labelAr: 'وصل حديثاً' },
                  { id: 'bestSeller', labelEn: 'Best Sellers', labelAr: 'الأكثر طلباً' },
                  { id: 'sale', labelEn: 'Sale & Offers', labelAr: 'عروض وتخفيضات' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onFilterChange({ collection: item.id });
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left rtl:text-right px-3 py-2 text-[13px] rounded-md flex items-center justify-between cursor-pointer ${
                      filters.collection === item.id ? 'bg-[var(--color-card)] font-semibold text-[var(--color-primary)]' : 'hover:bg-[var(--color-card)]/60 text-[var(--color-text)]'
                    }`}
                  >
                    <span>{language === 'ar' ? item.labelAr : item.labelEn}</span>
                    {filters.collection === item.id && <Check className="w-4 h-4 text-[var(--color-primary)]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Size Filter Dropdown */}
          {availableSizes.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleDropdown('size')}
                aria-expanded={openDropdown === 'size'}
                className={`h-[44px] px-4 rounded-[8px] border text-[14px] font-medium flex items-center gap-2 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                  filters.size !== 'all'
                    ? 'bg-[var(--color-card)] text-[var(--color-text)] border-[var(--color-primary)] font-semibold'
                    : 'bg-white text-[var(--color-text)] hover:bg-[var(--color-card)]/50 border-[var(--color-border)]'
                }`}
              >
                <span>{language === 'ar' ? 'المقاس' : 'Size'}</span>
                {filters.size !== 'all' && <span className="font-bold">({filters.size})</span>}
                <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === 'size' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'size' && (
                <div 
                  className="absolute top-full mt-1.5 z-40 w-56 bg-[var(--color-bg)] rounded-[8px] border border-[var(--color-border)] shadow-lg p-3 animate-in fade-in duration-150"
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--color-border)]">
                    <span className="text-[12px] font-bold text-[var(--color-text-secondary)]">
                      {language === 'ar' ? 'المقاسات المتاحة' : 'Available Sizes'}
                    </span>
                    {filters.size !== 'all' && (
                      <button
                        type="button"
                        onClick={() => onFilterChange({ size: 'all' })}
                        className="text-[11px] text-[var(--color-primary)] hover:underline"
                      >
                        {language === 'ar' ? 'إعادة ضبط' : 'Reset'}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto">
                    {availableSizes.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          onFilterChange({ size: filters.size === s ? 'all' : s });
                          setOpenDropdown(null);
                        }}
                        className={`h-9 rounded-md text-[13px] font-semibold flex items-center justify-center cursor-pointer transition-colors ${
                          filters.size === s
                            ? 'bg-[var(--color-primary)] text-white'
                            : 'bg-white hover:bg-[var(--color-card)] text-[var(--color-text)] border border-[var(--color-border)]'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Color Filter Dropdown */}
          {availableColors.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleDropdown('color')}
                aria-expanded={openDropdown === 'color'}
                className={`h-[44px] px-4 rounded-[8px] border text-[14px] font-medium flex items-center gap-2 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                  filters.color !== 'all'
                    ? 'bg-[var(--color-card)] text-[var(--color-text)] border-[var(--color-primary)] font-semibold'
                    : 'bg-white text-[var(--color-text)] hover:bg-[var(--color-card)]/50 border-[var(--color-border)]'
                }`}
              >
                <span>{language === 'ar' ? 'اللون' : 'Color'}</span>
                {filters.color !== 'all' && (
                  <span 
                    className="w-3.5 h-3.5 rounded-full border border-[var(--color-border)] inline-block"
                    style={{ backgroundColor: filters.color }}
                  />
                )}
                <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === 'color' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'color' && (
                <div 
                  className="absolute top-full mt-1.5 z-40 w-64 bg-[var(--color-bg)] rounded-[8px] border border-[var(--color-border)] shadow-lg p-3 animate-in fade-in duration-150"
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--color-border)]">
                    <span className="text-[12px] font-bold text-[var(--color-text-secondary)]">
                      {language === 'ar' ? 'تدرجات الألوان' : 'Color Palette'}
                    </span>
                    {filters.color !== 'all' && (
                      <button
                        type="button"
                        onClick={() => onFilterChange({ color: 'all' })}
                        className="text-[11px] text-[var(--color-primary)] hover:underline"
                      >
                        {language === 'ar' ? 'إعادة ضبط' : 'Reset'}
                      </button>
                    )}
                  </div>
                  <div className="space-y-1 max-h-56 overflow-y-auto">
                    {availableColors.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => {
                          onFilterChange({ color: filters.color === c.hex ? 'all' : c.hex });
                          setOpenDropdown(null);
                        }}
                        className={`w-full p-2 rounded-md flex items-center justify-between text-left rtl:text-right text-[13px] cursor-pointer ${
                          filters.color === c.hex ? 'bg-[var(--color-card)] font-semibold text-[var(--color-primary)]' : 'hover:bg-[var(--color-card)]/60 text-[var(--color-text)]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span 
                            className="w-4 h-4 rounded-full border border-[var(--color-border)] shrink-0" 
                            style={{ backgroundColor: c.hex }} 
                          />
                          <span>{language === 'ar' ? c.nameAr : c.nameEn}</span>
                        </div>
                        {filters.color === c.hex && <Check className="w-4 h-4 text-[var(--color-primary)]" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Price Range Filter Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleDropdown('price')}
              aria-expanded={openDropdown === 'price'}
              className={`h-[44px] px-4 rounded-[8px] border text-[14px] font-medium flex items-center gap-2 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                filters.maxPrice < maxCatalogPrice
                  ? 'bg-[var(--color-card)] text-[var(--color-text)] border-[var(--color-primary)] font-semibold'
                  : 'bg-white text-[var(--color-text)] hover:bg-[var(--color-card)]/50 border-[var(--color-border)]'
              }`}
            >
              <span>{language === 'ar' ? 'السعر' : 'Price'}</span>
              {filters.maxPrice < maxCatalogPrice && (
                <span className="font-bold">({formatBHD(filters.maxPrice)})</span>
              )}
              <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === 'price' ? 'rotate-180' : ''}`} />
            </button>

            {openDropdown === 'price' && (
              <div 
                className="absolute top-full mt-1.5 z-40 w-64 bg-[var(--color-bg)] rounded-[8px] border border-[var(--color-border)] shadow-lg p-4 animate-in fade-in duration-150"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[12px] font-bold text-[var(--color-text-secondary)]">
                    {language === 'ar' ? 'الحد الأقصى للسعر' : 'Max Price Range'}
                  </span>
                  <span className="text-[14px] font-bold text-[var(--color-primary)] tabular-nums">
                    {formatBHD(localPriceMax)}
                  </span>
                </div>

                <input
                  type="range"
                  min={minCatalogPrice}
                  max={maxCatalogPrice}
                  step={1}
                  value={localPriceMax}
                  onChange={handlePriceSliderChange}
                  className="w-full accent-[var(--color-primary)] cursor-pointer"
                />

                <div className="flex items-center justify-between text-[11px] text-[var(--color-text-secondary)] mt-1 tabular-nums">
                  <span>{formatBHD(minCatalogPrice)}</span>
                  <span>{formatBHD(maxCatalogPrice)}</span>
                </div>

                <div className="mt-3 pt-2 border-t border-[var(--color-border)] flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      onFilterChange({ maxPrice: maxCatalogPrice });
                      setLocalPriceMax(maxCatalogPrice);
                      setOpenDropdown(null);
                    }}
                    className="text-[12px] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] font-medium cursor-pointer"
                  >
                    {language === 'ar' ? 'إعادة ضبط' : 'Reset'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Fabric Filter Dropdown */}
          {availableFabrics.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleDropdown('fabric')}
                aria-expanded={openDropdown === 'fabric'}
                className={`h-[44px] px-4 rounded-[8px] border text-[14px] font-medium flex items-center gap-2 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                  filters.fabric !== 'all'
                    ? 'bg-[var(--color-card)] text-[var(--color-text)] border-[var(--color-primary)] font-semibold'
                    : 'bg-white text-[var(--color-text)] hover:bg-[var(--color-card)]/50 border-[var(--color-border)]'
                }`}
              >
                <span>{language === 'ar' ? 'نوع القماش' : 'Fabric'}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === 'fabric' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'fabric' && (
                <div 
                  className="absolute top-full mt-1.5 z-40 w-56 bg-[var(--color-bg)] rounded-[8px] border border-[var(--color-border)] shadow-lg p-2 animate-in fade-in duration-150"
                >
                  <button
                    type="button"
                    onClick={() => {
                      onFilterChange({ fabric: 'all' });
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left rtl:text-right px-3 py-2 text-[13px] rounded-md flex items-center justify-between cursor-pointer ${
                      filters.fabric === 'all' ? 'bg-[var(--color-card)] font-semibold text-[var(--color-primary)]' : 'hover:bg-[var(--color-card)]/60 text-[var(--color-text)]'
                    }`}
                  >
                    <span>{language === 'ar' ? 'جميع الأقمشة' : 'All Fabrics'}</span>
                    {filters.fabric === 'all' && <Check className="w-4 h-4 text-[var(--color-primary)]" />}
                  </button>

                  {availableFabrics.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        onFilterChange({ fabric: f.id });
                        setOpenDropdown(null);
                      }}
                      className={`w-full text-left rtl:text-right px-3 py-2 text-[13px] rounded-md flex items-center justify-between cursor-pointer ${
                        filters.fabric === f.id ? 'bg-[var(--color-card)] font-semibold text-[var(--color-primary)]' : 'hover:bg-[var(--color-card)]/60 text-[var(--color-text)]'
                      }`}
                    >
                      <span>{language === 'ar' ? f.nameAr : f.nameEn}</span>
                      {filters.fabric === f.id && <Check className="w-4 h-4 text-[var(--color-primary)]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Mobile Filter Toggle Button (collapses into single 44px button) */}
        <div className="md:hidden flex items-center">
          <button
            type="button"
            onClick={() => setIsMobileSheetOpen(true)}
            className="h-[44px] px-4 rounded-[8px] bg-white border border-[var(--color-border)] text-[14px] font-semibold text-[var(--color-text)] flex items-center gap-2 shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          >
            <SlidersHorizontal className="w-4 h-4 text-[var(--color-primary)]" />
            <span>{language === 'ar' ? 'تصفية المنتجات' : 'Filters'}</span>
            {activeChips.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-[var(--color-primary)] text-white text-[11px] font-bold flex items-center justify-center">
                {activeChips.length}
              </span>
            )}
          </button>
        </div>

        {/* Right Side: [N] products count and Sort dropdown */}
        <div className="flex items-center gap-4 shrink-0">
          {/* Live Product Count */}
          <span 
            className="text-[14px] font-medium tabular-nums whitespace-nowrap text-[var(--color-text-secondary)]"
          >
            {totalCount} {language === 'ar' ? 'منتج' : language === 'ru' ? 'товаров' : language === 'fr' ? 'produits' : 'products'}
          </span>

          {/* Sort Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleDropdown('sort')}
              aria-expanded={openDropdown === 'sort'}
              className="h-[44px] px-3.5 rounded-[8px] bg-white border border-[var(--color-border)] text-[14px] text-[var(--color-text)] font-medium flex items-center gap-2 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] hover:bg-[var(--color-card)]/50"
            >
              <span className="hidden sm:inline text-[var(--color-text-secondary)] text-[13px]">
                {language === 'ar' ? 'ترتيب:' : language === 'ru' ? 'Сортировка:' : language === 'fr' ? 'Trier par :' : 'Sort:'}
              </span>
              <span className="font-semibold truncate max-w-[120px] sm:max-w-[150px]">
                {currentSortLabel ? (language === 'ar' ? currentSortLabel.labelAr : language === 'ru' ? currentSortLabel.labelRu : language === 'fr' ? currentSortLabel.labelFr : currentSortLabel.labelEn) : 'Sort'}
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === 'sort' ? 'rotate-180' : ''}`} />
            </button>

            {openDropdown === 'sort' && (
              <div 
                className={`absolute top-full mt-1.5 z-40 w-56 bg-[var(--color-bg)] rounded-[8px] border border-[var(--color-border)] shadow-lg p-2 animate-in fade-in duration-150 ${
                  isRtl ? 'left-0 text-right' : 'right-0 text-left'
                }`}
              >
                {sortOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onFilterChange({ sort: opt.id as any });
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left rtl:text-right px-3 py-2 text-[13px] rounded-md flex items-center justify-between cursor-pointer ${
                      filters.sort === opt.id ? 'bg-[var(--color-card)] font-semibold text-[var(--color-primary)]' : 'hover:bg-[var(--color-card)]/60 text-[var(--color-text)]'
                    }`}
                  >
                    <span>{language === 'ar' ? opt.labelAr : language === 'ru' ? opt.labelRu : language === 'fr' ? opt.labelFr : opt.labelEn}</span>
                    {filters.sort === opt.id && <Check className="w-4 h-4 text-[var(--color-primary)]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Selected Filters Removable Chips row with "Clear all" link */}
      {activeChips.length > 0 && (
        <div 
          className="w-full px-4 sm:px-6 md:px-12 pb-3 pt-1 flex items-center gap-2 flex-wrap"
          style={{ paddingLeft: 'clamp(16px, 3.5vw, 48px)', paddingRight: 'clamp(16px, 3.5vw, 48px)' }}
        >
          {activeChips.map((chip) => (
            <span
              key={chip.id}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-card)] text-[var(--color-text)] text-[13px] font-medium border border-[var(--color-border)] shadow-2xs"
            >
              <span>{chip.label}</span>
              <button
                type="button"
                onClick={chip.onRemove}
                className="hover:text-[var(--color-primary)] p-0.5 rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)]"
                aria-label={`Remove filter ${chip.label}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}

          <button
            type="button"
            onClick={onClearAll}
            className="text-[13px] font-semibold text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] hover:underline ml-2 rtl:ml-0 rtl:mr-2 cursor-pointer focus-visible:outline-none"
          >
            {language === 'ar' ? 'مسح الكل' : language === 'ru' ? 'Сбросить всё' : language === 'fr' ? 'Tout effacer' : 'Clear all'}
          </button>
        </div>
      )}

      {/* Mobile Bottom Sheet Filter Drawer */}
      {isMobileSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--color-text)]/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-h-[85vh] bg-[var(--color-bg)] rounded-t-[20px] p-5 overflow-y-auto animate-in slide-in-from-bottom duration-200 shadow-2xl flex flex-col border-t border-[var(--color-border)]"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-[var(--color-primary)]" />
                <h3 className="font-serif text-lg font-bold text-[var(--color-text)]">
                  {language === 'ar' ? 'تصفية المنتجات' : 'Filter Products'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileSheetOpen(false)}
                className="p-1.5 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text)] cursor-pointer"
                aria-label="Close filters"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5 py-4 flex-1">
              {/* Collection */}
              <div>
                <label className="text-[13px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-2">
                  {language === 'ar' ? 'المجموعات' : 'Collection'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'all', labelEn: 'All', labelAr: 'الكل' },
                    { id: 'newArrival', labelEn: 'New Arrivals', labelAr: 'وصل حديثاً' },
                    { id: 'bestSeller', labelEn: 'Best Sellers', labelAr: 'الأكثر طلباً' },
                    { id: 'sale', labelEn: 'Sale & Offers', labelAr: 'تخفيضات' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onFilterChange({ collection: item.id })}
                      className={`h-9 px-3 rounded-full text-[13px] font-medium border cursor-pointer ${
                        filters.collection === item.id
                          ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                          : 'bg-white text-[var(--color-text)] border-[var(--color-border)] hover:bg-[var(--color-card)]/50'
                      }`}
                    >
                      {language === 'ar' ? item.labelAr : item.labelEn}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sizes */}
              {availableSizes.length > 0 && (
                <div>
                  <label className="text-[13px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-2">
                    {language === 'ar' ? 'المقاس' : 'Size'}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableSizes.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => onFilterChange({ size: filters.size === s ? 'all' : s })}
                        className={`h-9 w-12 rounded-md text-[13px] font-bold border cursor-pointer ${
                          filters.size === s
                            ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                            : 'bg-white text-[var(--color-text)] border-[var(--color-border)] hover:bg-[var(--color-card)]/50'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Colors */}
              {availableColors.length > 0 && (
                <div>
                  <label className="text-[13px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-2">
                    {language === 'ar' ? 'اللون' : 'Color'}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableColors.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => onFilterChange({ color: filters.color === c.hex ? 'all' : c.hex })}
                        className={`h-9 px-3 rounded-full text-[13px] font-medium border flex items-center gap-2 cursor-pointer ${
                          filters.color === c.hex
                            ? 'bg-[var(--color-card)] text-[var(--color-primary)] border-[var(--color-primary)] font-bold'
                            : 'bg-white text-[var(--color-text)] border-[var(--color-border)] hover:bg-[var(--color-card)]/50'
                        }`}
                      >
                        <span 
                          className="w-3.5 h-3.5 rounded-full border border-[var(--color-border)]" 
                          style={{ backgroundColor: c.hex }} 
                        />
                        <span>{language === 'ar' ? c.nameAr : c.nameEn}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Fabrics */}
              {availableFabrics.length > 0 && (
                <div>
                  <label className="text-[13px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-2">
                    {language === 'ar' ? 'نوع القماش' : 'Fabric'}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableFabrics.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => onFilterChange({ fabric: filters.fabric === f.id ? 'all' : f.id })}
                        className={`h-9 px-3 rounded-full text-[13px] font-medium border ${
                          filters.fabric === f.id
                            ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                            : 'bg-white text-[var(--color-text)] border-[var(--color-border)]'
                        }`}
                      >
                        {language === 'ar' ? f.nameAr : f.nameEn}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Price Max */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[13px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
                    {language === 'ar' ? 'الحد الأقصى للسعر' : 'Max Price'}
                  </label>
                  <span className="text-[14px] font-bold text-[var(--color-primary)] tabular-nums">
                    {formatBHD(localPriceMax)}
                  </span>
                </div>
                <input
                  type="range"
                  min={minCatalogPrice}
                  max={maxCatalogPrice}
                  step={1}
                  value={localPriceMax}
                  onChange={handlePriceSliderChange}
                  className="w-full accent-[var(--color-primary)]"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--color-border)] flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  onClearAll();
                  setIsMobileSheetOpen(false);
                }}
                className="flex-1 h-[44px] rounded-[8px] border border-[var(--color-border)] text-[14px] font-semibold text-[var(--color-text)]"
              >
                {language === 'ar' ? 'مسح الكل' : 'Clear All'}
              </button>
              <button
                type="button"
                onClick={() => setIsMobileSheetOpen(false)}
                className="flex-1 h-[44px] rounded-[8px] bg-[var(--color-primary)] text-white text-[14px] font-semibold"
              >
                {language === 'ar' ? `عرض (${totalCount})` : `Show (${totalCount})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
