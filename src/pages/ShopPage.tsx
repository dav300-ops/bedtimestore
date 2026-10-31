import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { ProductCard } from '../components/ProductCard';
import { Product, ProductSize, KidAgeRange } from '../types';
import { Filter, SlidersHorizontal, Search, X, Check, Baby, ShieldCheck, Ruler, Images } from 'lucide-react';

interface ShopPageProps {
  initialFilter?: string;
  initialCategory?: string;
  initialSearch?: string;
  initialAgeGroup?: KidAgeRange;
  onQuickView: (product: Product) => void;
  onSelectProduct: (product: Product) => void;
  onOpenAlbumModal?: (product: Product, initialIndex?: number) => void;
  onNavigate?: (page: string, params?: any) => void;
}

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
  const { products, categories } = useStore();
  const { language, formatBHD, t, isRtl } = useLanguage();

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || 'all');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<KidAgeRange | 'all'>(initialAgeGroup || 'all');
  const [selectedSize, setSelectedSize] = useState<ProductSize | 'all'>('all');
  const [selectedColor, setSelectedColor] = useState<string>('all');
  const [selectedSpecialTag, setSelectedSpecialTag] = useState<string>(initialFilter || 'all');
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [priceMax, setPriceMax] = useState<number>(50);
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'rating' | 'newest'>('featured');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isKidsSizeModalOpen, setIsKidsSizeModalOpen] = useState(false);

  useEffect(() => {
    if (initialFilter !== undefined) setSelectedSpecialTag(initialFilter || 'all');
    if (initialCategory !== undefined) setSelectedCategory(initialCategory || 'all');
    if (initialSearch !== undefined) setSearchQuery(initialSearch);
    if (initialAgeGroup !== undefined) setSelectedAgeGroup(initialAgeGroup || 'all');
  }, [initialFilter, initialCategory, initialSearch, initialAgeGroup]);

  // Dynamic available sizes based on category / kids filter
  const isKidsActive = selectedCategory === 'cat-kids-sleepwear' || selectedAgeGroup !== 'all';
  const sizes: ProductSize[] = isKidsActive
    ? ['3-4Y', '4-5Y', '5-6Y', '6-7Y', '8-9Y', '10-12Y']
    : ['XS', 'S', 'M', 'L', 'XL', '3-4Y', '4-5Y', '5-6Y', '6-7Y', '8-9Y', '10-12Y'];

  // All unique colors in catalog
  const availableColors = useMemo(() => {
    const map = new Map<string, { hex: string; nameEn: string; nameAr: string }>();
    products.forEach((p) => {
      p.variants.forEach((v) => {
        if (!map.has(v.colorHex)) {
          map.set(v.colorHex, { hex: v.colorHex, nameEn: v.colorNameEn, nameAr: v.colorNameAr });
        }
      });
    });
    return Array.from(map.values());
  }, [products]);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.active) return false;

      // Category filter
      if (selectedCategory !== 'all' && p.categoryId !== selectedCategory) {
        return false;
      }

      // Age group filter (Kids)
      if (selectedAgeGroup !== 'all') {
        if (p.ageGroup !== selectedAgeGroup) return false;
      }

      // Special tag filter
      if (selectedSpecialTag === 'newArrival' && !p.newArrival) return false;
      if (selectedSpecialTag === 'bestSeller' && !p.bestSeller) return false;
      if (selectedSpecialTag === 'sale' && (!p.salePrice || p.salePrice >= p.price)) return false;

      // Size filter
      if (selectedSize !== 'all') {
        const hasSize = p.variants.some((v) => v.size === selectedSize && v.stock > 0);
        if (!hasSize) return false;
      }

      // Color filter
      if (selectedColor !== 'all') {
        const hasColor = p.variants.some((v) => v.colorHex === selectedColor && v.stock > 0);
        if (!hasColor) return false;
      }

      // Max price filter (BHD)
      const effectivePrice = p.salePrice ?? p.price;
      if (effectivePrice > priceMax) return false;

      // In stock only
      if (inStockOnly) {
        const totalStock = p.variants.reduce((sum, v) => sum + v.stock, 0);
        if (totalStock <= 0) return false;
      }

      // Search query (English & Arabic name, SKU, Material)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesEn = p.nameEn.toLowerCase().includes(q) || p.descriptionEn.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.materialEn.toLowerCase().includes(q);
        const matchesAr = p.nameAr.toLowerCase().includes(q) || p.descriptionAr.toLowerCase().includes(q) || p.materialAr.toLowerCase().includes(q);
        if (!matchesEn && !matchesAr) return false;
      }

      return true;
    }).sort((a, b) => {
      const priceA = a.salePrice ?? a.price;
      const priceB = b.salePrice ?? b.price;

      if (sortBy === 'price-asc') return priceA - priceB;
      if (sortBy === 'price-desc') return priceB - priceA;
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
    });
  }, [
    products,
    selectedCategory,
    selectedAgeGroup,
    selectedSpecialTag,
    selectedSize,
    selectedColor,
    priceMax,
    inStockOnly,
    searchQuery,
    sortBy,
  ]);

  const resetFilters = () => {
    setSelectedCategory('all');
    setSelectedAgeGroup('all');
    setSelectedSize('all');
    setSelectedColor('all');
    setSelectedSpecialTag('all');
    setSearchQuery('');
    setPriceMax(50);
    setInStockOnly(false);
  };

  return (
    <div className="bg-[#FBE7E3] min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Page Header */}
        <div className="border-b border-[#E1D1E4] pb-6 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-[#8E7C49]">
              {language === 'ar' ? 'البحرين · التشكيلات الكاملة' : 'Kingdom of Bahrain · Catalog'}
            </span>
            <h1 className="font-heading text-3xl sm:text-4xl font-semibold text-[#340404] mt-1">
              {language === 'ar' ? 'متجر ملابس النوم الفاخرة' : 'Luxury Sleepwear Catalog'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'ar' ? 'بحث بالاسم، الخامة أو الرمز...' : 'Search name, fabric, SKU...'}
                className="w-48 sm:w-64 px-3 py-2 pl-8 rtl:pl-3 rtl:pr-8 text-xs bg-white border border-[#E1D1E4] rounded-xs text-[#340404] focus:outline-none focus:ring-1 focus:ring-[#E22001]"
              />
              <Search className="w-3.5 h-3.5 absolute left-2.5 rtl:left-auto rtl:right-2.5 top-2.5 text-[#8E7C49]" />
            </div>

            {/* Mobile Filter Toggle Button */}
            <button
              onClick={() => setIsMobileFilterOpen(true)}
              className="lg:hidden p-2 bg-white text-[#340404] border border-[#E1D1E4] rounded-xs flex items-center gap-1.5 text-xs font-medium"
            >
              <Filter className="w-4 h-4 text-[#8E7C49]" />
              <span>{language === 'ar' ? 'تصفية' : 'Filter'}</span>
            </button>

            {/* Product Album Trigger Button */}
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('album')}
                className="px-3 py-2 bg-white hover:bg-[#340404] text-[#340404] hover:text-[#FBE7E3] border border-[#E1D1E4] rounded-xs text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs shrink-0"
                title={language === 'ar' ? 'تصفح ألبوم صور المنتجات' : 'Browse Product Image Album'}
              >
                <Images className="w-3.5 h-3.5 text-[#8E7C49]" />
                <span className="hidden sm:inline">{language === 'ar' ? 'ألبوم الصور' : 'Product Album'}</span>
              </button>
            )}

            {/* Sort Select */}
            <div className="flex items-center gap-1">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-white border border-[#E1D1E4] rounded-xs text-xs py-2 px-3 text-[#340404] focus:outline-none focus:ring-1 focus:ring-[#E22001]"
              >
                <option value="featured">{language === 'ar' ? 'المختارات المميزة' : 'Featured'}</option>
                <option value="newest">{language === 'ar' ? 'الأحدث أولاً' : 'Newest'}</option>
                <option value="price-asc">{language === 'ar' ? 'السعر: من الأقل للأعلى' : 'Price: Low to High'}</option>
                <option value="price-desc">{language === 'ar' ? 'السعر: من الأعلى للأقل' : 'Price: High to Low'}</option>
                <option value="rating">{language === 'ar' ? 'الأعلى تقييماً' : 'Highest Rated'}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Desktop Filter Sidebar */}
          <aside className="hidden lg:block space-y-6 bg-white/70 p-6 rounded-sm border border-[#E1D1E4] h-fit">
            <div className="flex items-center justify-between border-b border-[#E1D1E4] pb-3">
              <span className="font-heading text-lg font-semibold text-[#340404]">
                {language === 'ar' ? 'خيارات التصفية' : 'Filter Catalog'}
              </span>
              <button
                onClick={resetFilters}
                className="text-[11px] text-[#E22001] underline hover:text-[#340404]"
              >
                {language === 'ar' ? 'إعادة ضبط' : 'Reset All'}
              </button>
            </div>

            {/* Special Collections Segmented Filter */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#340404] block uppercase tracking-wider">
                {language === 'ar' ? 'المجموعات الخاصة' : 'Collections'}
              </label>
              <div className="flex flex-col gap-1 text-xs">
                {[
                  { id: 'all', labelEn: 'All Nightwear', labelAr: 'جميع المعروضات' },
                  { id: 'newArrival', labelEn: 'New Arrivals', labelAr: 'وصل حديثًا' },
                  { id: 'bestSeller', labelEn: 'Best Sellers', labelAr: 'الأكثر مبيعًا' },
                  { id: 'sale', labelEn: 'Sale & Offers', labelAr: 'التخفيضات' },
                ].map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => setSelectedSpecialTag(tag.id)}
                    className={`text-left rtl:text-right py-1.5 px-2 rounded-xs transition-colors ${
                      selectedSpecialTag === tag.id
                        ? 'bg-[#E1D1E4] text-[#340404] font-semibold'
                        : 'text-[#340404]/70 hover:text-[#340404] hover:bg-white'
                    }`}
                  >
                    {language === 'ar' ? tag.labelAr : tag.labelEn}
                  </button>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div className="space-y-2 pt-3 border-t border-[#E1D1E4]/70">
              <label className="text-xs font-semibold text-[#340404] block uppercase tracking-wider">
                {language === 'ar' ? 'التصنيفات' : 'Categories'}
              </label>
              <div className="flex flex-col gap-1 text-xs">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`text-left rtl:text-right py-1.5 px-2 rounded-xs transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-[#E1D1E4] text-[#340404] font-semibold'
                      : 'text-[#340404]/70 hover:text-[#340404] hover:bg-white'
                  }`}
                >
                  {language === 'ar' ? 'جميع التصنيفات' : 'All Categories'}
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`text-left rtl:text-right py-1.5 px-2 rounded-xs transition-colors ${
                      selectedCategory === cat.id
                        ? 'bg-[#E1D1E4] text-[#340404] font-semibold'
                        : 'text-[#340404]/70 hover:text-[#340404] hover:bg-white'
                    }`}
                  >
                    {language === 'ar' ? cat.nameAr : cat.nameEn}
                  </button>
                ))}
              </div>
            </div>

            {/* Kids Age Brackets */}
            <div className="space-y-2 pt-3 border-t border-[#E1D1E4]/70">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#340404] flex items-center gap-1.5 uppercase tracking-wider">
                  <Baby className="w-3.5 h-3.5 text-[#8E7C49]" />
                  <span>{language === 'ar' ? 'فئات أعمار الأطفال' : 'Kids Age Brackets'}</span>
                </label>
                {selectedAgeGroup !== 'all' && (
                  <button
                    onClick={() => setSelectedAgeGroup('all')}
                    className="text-[10px] text-[#E22001] underline"
                  >
                    {language === 'ar' ? 'الكل' : 'Clear'}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs">
                {[
                  { id: '3-5', labelEn: '3 to 5 Y', labelAr: '٣-٥ سنوات' },
                  { id: '5-7', labelEn: '5 to 7 Y', labelAr: '٥-٧ سنوات' },
                  { id: '8-9', labelEn: '8 to 9 Y', labelAr: '٨-٩ سنوات' },
                  { id: '10-12', labelEn: '10 to 12 Y', labelAr: '١٠-١٢ سنة' },
                ].map((age) => (
                  <button
                    key={age.id}
                    onClick={() => {
                      setSelectedAgeGroup(selectedAgeGroup === age.id ? 'all' : (age.id as KidAgeRange));
                      if (selectedCategory !== 'cat-kids-sleepwear' && selectedAgeGroup !== age.id) {
                        setSelectedCategory('cat-kids-sleepwear');
                      }
                    }}
                    className={`text-center py-1.5 px-2 rounded-xs border text-[11px] font-medium transition-colors ${
                      selectedAgeGroup === age.id
                        ? 'bg-[#340404] text-[#FBE7E3] border-[#340404]'
                        : 'bg-white text-[#340404] border-[#E1D1E4] hover:bg-[#FBE7E3]'
                    }`}
                  >
                    {language === 'ar' ? age.labelAr : age.labelEn}
                  </button>
                ))}
              </div>
            </div>

            {/* Sizes */}
            <div className="space-y-2 pt-3 border-t border-[#E1D1E4]/70">
              <label className="text-xs font-semibold text-[#340404] block uppercase tracking-wider">
                {language === 'ar' ? 'المقاس' : 'Size'}
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setSelectedSize('all')}
                  className={`px-2.5 py-1 text-xs rounded-xs border transition-colors ${
                    selectedSize === 'all'
                      ? 'bg-[#340404] text-white border-[#340404]'
                      : 'bg-white text-[#340404] border-[#E1D1E4] hover:bg-[#FBE7E3]'
                  }`}
                >
                  {language === 'ar' ? 'الكل' : 'All'}
                </button>
                {sizes.map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setSelectedSize(sz)}
                    className={`px-2.5 py-1 text-xs rounded-xs border transition-colors ${
                      selectedSize === sz
                        ? 'bg-[#E1D1E4] text-[#340404] border-[#340404] font-bold'
                        : 'bg-white text-[#340404] border-[#E1D1E4] hover:bg-[#FBE7E3]'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

          

            {/* Price Range */}
            <div className="space-y-2 pt-3 border-t border-[#E1D1E4]/70">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-[#340404]">{language === 'ar' ? 'الحد الأقصى للسعر:' : 'Max Price:'}</span>
                <span className="font-bold text-[#E22001] tabular-nums">{formatBHD(priceMax)}</span>
              </div>
              <input
                type="range"
                min="10"
                max="50"
                step="1"
                value={priceMax}
                onChange={(e) => setPriceMax(Number(e.target.value))}
                className="w-full accent-[#E22001]"
              />
            </div>

            {/* In Stock Only Checkbox */}
            <div className="pt-3 border-t border-[#E1D1E4]/70 flex items-center gap-2">
              <input
                type="checkbox"
                id="inStockCheck"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="accent-[#8E7C49] w-4 h-4 rounded-xs"
              />
              <label htmlFor="inStockCheck" className="text-xs text-[#340404] cursor-pointer">
                {language === 'ar' ? 'المتوفر في المخزون فقط' : 'In Stock Items Only'}
              </label>
            </div>

          </aside>

          {/* Product Grid Area */}
          <main className="lg:col-span-3">

            {/* Curated Kids Collection Age Header Banner */}
            {(selectedCategory === 'cat-kids-sleepwear' || selectedAgeGroup !== 'all') && (
              <div className="bg-white p-5 rounded-sm border border-[#E1D1E4] mb-6 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E1D1E4]/70 pb-3">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#8E7C49]/15 text-[#8E7C49] rounded-full text-[11px] font-semibold uppercase tracking-wider mb-1">
                      <Baby className="w-3 h-3" />
                      <span>{language === 'ar' ? 'تشكيلة الأطفال الحصرية' : 'Curated Kids Collection'}</span>
                    </div>
                    <h2 className="font-heading text-xl font-semibold text-[#340404]">
                      {language === 'ar' ? 'ملابس نوم الأطفال حسب الفئة العمرية' : 'Curated Bedtime Sleepwear by Age'}
                    </h2>
                  </div>

                  <button
                    onClick={() => setIsKidsSizeModalOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs text-[#8E7C49] hover:text-[#340404] font-medium underline underline-offset-4 py-1"
                  >
                    <Ruler className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'دليل مقاسات الأطفال' : 'Kids Size Chart'}</span>
                  </button>
                </div>

                {/* Age selector pills */}
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: 'all', labelEn: 'All Kids (3–12Y)', labelAr: 'جميع الأطفال (٣-١٢ سنة)' },
                    { id: '3-5', labelEn: 'Ages 3 to 5', labelAr: 'من ٣ إلى ٥ سنوات' },
                    { id: '5-7', labelEn: 'Ages 5 to 7', labelAr: 'من ٥ إلى ٧ سنوات' },
                    { id: '8-9', labelEn: 'Ages 8 to 9', labelAr: 'من ٨ إلى ٩ سنوات' },
                    { id: '10-12', labelEn: 'Ages 10 to 12', labelAr: 'من ١٠ إلى ١٢ سنة' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setSelectedAgeGroup(tab.id as any);
                        if (selectedCategory !== 'cat-kids-sleepwear') setSelectedCategory('cat-kids-sleepwear');
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        selectedAgeGroup === tab.id
                          ? 'bg-[#340404] text-[#FBE7E3] shadow-xs'
                          : 'bg-[#FAF5F2] text-[#340404] hover:bg-[#FBE7E3] border border-[#E1D1E4]'
                      }`}
                    >
                      {language === 'ar' ? tab.labelAr : tab.labelEn}
                    </button>
                  ))}
                </div>

                {/* Active Age Group Quick Info */}
                {selectedAgeGroup !== 'all' && (
                  <div className="p-3 bg-[#FAF5F2] rounded-xs text-xs text-[#340404]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-[#E1D1E4]/50">
                    <div>
                      <span className="font-bold text-[#340404]">
                        {language === 'ar' ? t.kidsCollection.ageRanges[selectedAgeGroup] : t.kidsCollection.ageRanges[selectedAgeGroup]}:
                      </span>{' '}
                      <span>{language === 'ar' ? t.kidsCollection.ageDescriptions[selectedAgeGroup] : t.kidsCollection.ageDescriptions[selectedAgeGroup]}</span>
                    </div>
                    <span className="text-[11px] text-[#8E7C49] font-medium shrink-0">
                      OEKO-TEX Certified
                    </span>
                  </div>
                )}
              </div>
            )}

            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-sm border border-[#E1D1E4] p-12 text-center space-y-4">
                <h3 className="font-heading text-xl font-semibold text-[#340404]">
                  {language === 'ar' ? 'لم نتمكن من إيجاد قطع تطابق بحثك' : 'No matching pieces found'}
                </h3>
                <p className="text-xs text-[#340404]/70 max-w-sm mx-auto">
                  {language === 'ar'
                    ? 'جربي تعديل خيارات التصفية أو البحث عن فئات أخرى مثل الحرير الطبيعي أو البيجامات.'
                    : 'Try clearing some filters or searching for terms like Silk, Satin, or Nightdress.'}
                </p>
                <button
                  onClick={resetFilters}
                  className="bg-[#E22001] text-white px-5 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-xs hover:bg-[#c01b01] transition-colors"
                >
                  {language === 'ar' ? 'عرض جميع المعروضات' : 'Clear Filters & Show All'}
                </button>
              </div>
            ) : (
              <div>
                <p className="text-xs text-[#340404]/70 mb-4 tabular-nums">
                  {language === 'ar'
                    ? `عرض ${filteredProducts.length} من إجمالي ${products.length} قطعة فاخرة`
                    : `Showing ${filteredProducts.length} of ${products.length} luxury pieces`}
                </p>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onQuickView={onQuickView}
                      onSelectProduct={onSelectProduct}
                      onOpenAlbumModal={onOpenAlbumModal}
                    />
                  ))}
                </div>
              </div>
            )}
          </main>

        </div>
      </div>

      {/* Mobile Filter Slide-over Drawer */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden lg:hidden">
          <div
            onClick={() => setIsMobileFilterOpen(false)}
            className="absolute inset-0 bg-[#340404]/50 backdrop-blur-xs"
          />
          <div className="fixed inset-y-0 right-0 rtl:right-auto rtl:left-0 max-w-full flex pl-10 rtl:pl-0 rtl:pr-10">
            <div className="w-screen max-w-xs bg-white p-6 overflow-y-auto space-y-6">
              <div className="flex justify-between items-center border-b border-[#E1D1E4] pb-3">
                <span className="font-heading text-lg font-semibold text-[#340404]">
                  {language === 'ar' ? 'خيارات التصفية' : 'Filter Catalog'}
                </span>
                <button
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="p-1 text-[#340404] hover:text-[#E22001]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Special collections */}
              <div className="space-y-2 text-xs">
                <label className="font-semibold text-[#340404] block uppercase">
                  {language === 'ar' ? 'المجموعات' : 'Collections'}
                </label>
                <div className="flex flex-col gap-1">
                  {[
                    { id: 'all', labelEn: 'All Nightwear', labelAr: 'جميع المعروضات' },
                    { id: 'newArrival', labelEn: 'New Arrivals', labelAr: 'وصل حديثًا' },
                    { id: 'bestSeller', labelEn: 'Best Sellers', labelAr: 'الأكثر مبيعًا' },
                    { id: 'sale', labelEn: 'Sale & Offers', labelAr: 'التخفيضات' },
                  ].map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => {
                        setSelectedSpecialTag(tag.id);
                        setIsMobileFilterOpen(false);
                      }}
                      className={`text-left rtl:text-right py-1.5 px-2 rounded-xs ${
                        selectedSpecialTag === tag.id ? 'bg-[#E1D1E4] font-bold text-[#340404]' : 'text-[#340404]/70'
                      }`}
                    >
                      {language === 'ar' ? tag.labelAr : tag.labelEn}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categories */}
              <div className="space-y-2 text-xs pt-3 border-t border-[#E1D1E4]">
                <label className="font-semibold text-[#340404] block uppercase">
                  {language === 'ar' ? 'التصنيفات' : 'Categories'}
                </label>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => {
                      setSelectedCategory('all');
                      setIsMobileFilterOpen(false);
                    }}
                    className={`text-left rtl:text-right py-1.5 px-2 rounded-xs ${
                      selectedCategory === 'all' ? 'bg-[#E1D1E4] font-bold' : 'text-[#340404]/70'
                    }`}
                  >
                    {language === 'ar' ? 'الكل' : 'All'}
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedCategory(c.id);
                        setIsMobileFilterOpen(false);
                      }}
                      className={`text-left rtl:text-right py-1.5 px-2 rounded-xs ${
                        selectedCategory === c.id ? 'bg-[#E1D1E4] font-bold' : 'text-[#340404]/70'
                      }`}
                    >
                      {language === 'ar' ? c.nameAr : c.nameEn}
                    </button>
                  ))}
                </div>
              </div>

              {/* Kids Age Brackets (Mobile) */}
              <div className="space-y-2 text-xs pt-3 border-t border-[#E1D1E4]">
                <label className="font-semibold text-[#340404] flex items-center gap-1.5 uppercase">
                  <Baby className="w-3.5 h-3.5 text-[#8E7C49]" />
                  <span>{language === 'ar' ? 'فئات أعمار الأطفال' : 'Kids Age Brackets'}</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'all', labelEn: 'All Kids', labelAr: 'الكل' },
                    { id: '3-5', labelEn: '3 to 5 Y', labelAr: '٣-٥ سنوات' },
                    { id: '5-7', labelEn: '5 to 7 Y', labelAr: '٥-٧ سنوات' },
                    { id: '8-9', labelEn: '8 to 9 Y', labelAr: '٨-٩ سنوات' },
                    { id: '10-12', labelEn: '10 to 12 Y', labelAr: '١٠-١٢ سنة' },
                  ].map((age) => (
                    <button
                      key={age.id}
                      onClick={() => {
                        setSelectedAgeGroup(age.id as any);
                        if (selectedCategory !== 'cat-kids-sleepwear' && age.id !== 'all') {
                          setSelectedCategory('cat-kids-sleepwear');
                        }
                        setIsMobileFilterOpen(false);
                      }}
                      className={`py-1.5 px-2 text-center rounded-xs border text-[11px] font-medium ${
                        selectedAgeGroup === age.id
                          ? 'bg-[#340404] text-[#FBE7E3] border-[#340404]'
                          : 'bg-white text-[#340404] border-[#E1D1E4]'
                      }`}
                    >
                      {language === 'ar' ? age.labelAr : age.labelEn}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reset button */}
              <div className="pt-4 border-t border-[#E1D1E4]">
                <button
                  onClick={() => {
                    resetFilters();
                    setIsMobileFilterOpen(false);
                  }}
                  className="w-full py-2 bg-[#E22001] text-white text-xs font-semibold uppercase tracking-wider rounded-xs"
                >
                  {language === 'ar' ? 'إعادة ضبط التصفية' : 'Reset Filters'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Children Size Guide Modal */}
      {isKidsSizeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-sm border border-[#E1D1E4] max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E1D1E4] pb-3">
              <div className="flex items-center gap-2">
                <Ruler className="w-5 h-5 text-[#8E7C49]" />
                <h3 className="font-heading text-lg font-semibold text-[#340404]">
                  {t.kidsCollection.sizeGuideTitle}
                </h3>
              </div>
              <button
                onClick={() => setIsKidsSizeModalOpen(false)}
                className="text-[#340404]/60 hover:text-[#340404] text-sm p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#340404]/80">
              {t.kidsCollection.sizeGuideDesc}
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left rtl:text-right border border-[#E1D1E4]">
                <thead className="bg-[#FAF5F2] text-[#340404] font-semibold">
                  <tr>
                    <th className="p-2.5 border-b border-[#E1D1E4]">{language === 'ar' ? 'الفئة العمرية' : 'Age Bracket'}</th>
                    <th className="p-2.5 border-b border-[#E1D1E4]">{language === 'ar' ? 'المقاس' : 'Size'}</th>
                    <th className="p-2.5 border-b border-[#E1D1E4]">{language === 'ar' ? 'طول الطفل' : 'Height'}</th>
                    <th className="p-2.5 border-b border-[#E1D1E4]">{language === 'ar' ? 'الوزن التقريبي' : 'Weight'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1D1E4] text-[#340404]/90">
                  <tr className="hover:bg-[#FBE7E3]/30">
                    <td className="p-2.5 font-bold text-[#E22001]">{language === 'ar' ? '٣ إلى ٥ سنوات' : '3 to 5 Years'}</td>
                    <td className="p-2.5 font-semibold">3-4Y / 4-5Y</td>
                    <td className="p-2.5">98 – 110 cm</td>
                    <td className="p-2.5">14 – 19 kg</td>
                  </tr>
                  <tr className="hover:bg-[#FBE7E3]/30">
                    <td className="p-2.5 font-bold text-[#E22001]">{language === 'ar' ? '٥ إلى ٧ سنوات' : '5 to 7 Years'}</td>
                    <td className="p-2.5 font-semibold">5-6Y / 6-7Y</td>
                    <td className="p-2.5">110 – 122 cm</td>
                    <td className="p-2.5">19 – 24 kg</td>
                  </tr>
                  <tr className="hover:bg-[#FBE7E3]/30">
                    <td className="p-2.5 font-bold text-[#E22001]">{language === 'ar' ? '٨ إلى ٩ سنوات' : '8 to 9 Years'}</td>
                    <td className="p-2.5 font-semibold">8-9Y</td>
                    <td className="p-2.5">125 – 135 cm</td>
                    <td className="p-2.5">25 – 32 kg</td>
                  </tr>
                  <tr className="hover:bg-[#FBE7E3]/30">
                    <td className="p-2.5 font-bold text-[#E22001]">{language === 'ar' ? '١٠ إلى ١٢ سنة' : '10 to 12 Years'}</td>
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
                className="px-5 py-2 bg-[#340404] text-white text-xs font-semibold rounded-xs hover:bg-[#E22001] transition-colors"
              >
                {language === 'ar' ? 'إغلاق الدليل' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
