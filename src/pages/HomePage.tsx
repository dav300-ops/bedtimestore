import React from 'react';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { HeroBanner } from '../components/HeroBanner';
import { CategoryGrid } from '../components/CategoryGrid';
import { ProductCarousel } from '../components/ProductCarousel';
import { KidsCollectionSection } from '../components/KidsCollectionSection';
import { Product } from '../types';
import { Sparkles, Shield, Truck, RefreshCw, Star, Images, Maximize2, ArrowRight } from 'lucide-react';
import { GoogleReviewsSection } from '../components/GoogleReviewsSection';
import { SILK_PJ_IMAGE } from '../assets/images';

interface HomePageProps {
  onNavigate: (page: string, params?: any) => void;
  onQuickView: (product: Product) => void;
  onSelectProduct: (product: Product) => void;
  onOpenAlbumModal?: (product: Product, initialIndex?: number) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  onQuickView,
  onSelectProduct,
  onOpenAlbumModal,
}) => {
  const { products } = useStore();
  const { t, language, formatBHD, isRtl } = useLanguage();

  const newArrivals = products.filter((p) => p.newArrival && p.active);
  const bestSellers = products.filter((p) => p.bestSeller && p.active);
  const saleProducts = products.filter((p) => p.salePrice && p.salePrice < p.price && p.active);
  const silkNightwear = products.filter(
    (p) => (p.categoryId === 'cat-silk-nightwear' || p.tags.includes('Silk')) && p.active
  );

  return (
    <div className="space-y-0">
      {/* 1. Hero Section */}
      <HeroBanner
        onShopClick={() => onNavigate('shop')}
        onBridalClick={() => onNavigate('shop', { category: 'cat-bridal' })}
      />

      {/* 2. Antique Gold Lotus Ornament Divider */}
      <div className="py-6 flex items-center justify-center max-w-sm mx-auto px-4" aria-hidden="true">
        <div className="h-[1px] bg-gradient-to-r from-transparent via-[var(--color-gold)] to-transparent flex-1 opacity-70" />
        <div className="px-3 text-[var(--color-gold)] flex items-center gap-1.5">
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M12 3c-1.2 2.5-3 5-3 8 0 2.5 1.5 4.5 3 5 1.5-.5 3-2.5 3-5 0-3-1.8-5.5-3-8zm-5 6c-.5 2-1 4-1 6 0 2.2 1.3 4 3 4.8-.8-1.5-1.2-3.2-1-4.8.2-2 1-4 1.5-5.5-1-.2-1.8-.3-2.5-.5zm10 0c-.7.2-1.5.3-2.5.5.5 1.5 1.3 3.5 1.5 5.5.2 1.6-.2 3.3-1 4.8 1.7-.8 3-2.6 3-4.8 0-2-.5-4-1-6zM3 17c.5 1.5 2 2.8 4 3.5-.8-.8-1.4-1.8-1.7-3-.8-.1-1.6-.3-2.3-.5zm18 0c-.7.2-1.5.4-2.3.5-.3 1.2-.9 2.2-1.7 3 2-.7 3.5-2 4-3.5z" />
          </svg>
        </div>
        <div className="h-[1px] bg-gradient-to-r from-transparent via-[var(--color-gold)] to-transparent flex-1 opacity-70" />
      </div>

      {/* 3. Category Tiles (Pale Lilac & Card background) */}
      <CategoryGrid
        onSelectCategory={(categoryId) => onNavigate('shop', { category: categoryId })}
      />

      {/* 4. Carousel: New Arrivals */}
      <ProductCarousel
        title={t.carousels.newArrivals}
        subtitle={t.carousels.newArrivalsSub}
        products={newArrivals.length > 0 ? newArrivals : products.slice(0, 4)}
        onQuickView={onQuickView}
        onSelectProduct={onSelectProduct}
        onOpenAlbumModal={onOpenAlbumModal}
        onViewAll={() => onNavigate('shop', { filter: 'newArrival' })}
      />

      {/* 5. Editorial Spotlight Banner */}
      <section className="bg-[var(--color-card)] py-16 border-y border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-5 bg-white p-3 rounded-sm shadow-md border border-[var(--color-gold)]/50">
              <img
                src={SILK_PJ_IMAGE}
                alt="Mulberry Silk Tailored Pajamas"
                className="w-full aspect-[4/5] object-cover rounded-xs"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="lg:col-span-7 space-y-5 lg:pl-8 rtl:lg:pl-0 rtl:lg:pr-8">
              <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-primary)]">
                {language === 'ar' ? 'حرفية الخياطة الراقية' : 'Boutique Craftsmanship'}
              </span>
              <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-semibold text-[var(--color-heading)] leading-tight">
                {language === 'ar'
                  ? 'نعومة حرير التوت.. لليالٍ هادئة لا تُضاهى'
                  : 'The Art of Mulberry Silk Rest'}
              </h2>
              <p className="text-sm sm:text-base text-[var(--color-text-secondary)] leading-relaxed font-light">
                {language === 'ar'
                  ? 'كل غرزة في مجموعاتنا صُممت لتحتضن بشرتك بلطف فائق. نستخدم حرير طبيعي نقي عيار ٢٢ موميه يعمل على الحفاظ على ترطيب البشرة ومنع تجعد الشعر أثناء النوم، لتبدئي كل صباح بإشراقة طبيعية.'
                  : 'Every thread in THE BEDTIME STORE collection is meticulously balanced between skin-loving nourishment and regal silhouette. Designed in our Bahrain atelier, our sleep sets breathe effortlessly in Gulf climates while maintaining immaculate drape.'}
              </p>
              
              <div className="pt-2">
                <button
                  onClick={() => onNavigate('shop', { category: 'cat-silk-nightwear' })}
                  className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-7 py-3 text-xs uppercase font-semibold tracking-wider rounded-sm transition-colors shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]"
                >
                  {language === 'ar' ? 'اكتشفي مجموعة الحرير' : 'Discover Silk Nightwear'}
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 6. Carousel: Best Sellers */}
      <ProductCarousel
        title={t.carousels.bestSellers}
        subtitle={t.carousels.bestSellersSub}
        products={bestSellers.length > 0 ? bestSellers : products.slice(0, 4)}
        onQuickView={onQuickView}
        onSelectProduct={onSelectProduct}
        onOpenAlbumModal={onOpenAlbumModal}
        onViewAll={() => onNavigate('shop', { filter: 'bestSeller' })}
      />

      {/* 7. Curated Kids Collection Showcase (Ages 3-5, 5-7, 8-9, 10-12) */}
      <KidsCollectionSection
        onNavigate={onNavigate}
        onQuickView={onQuickView}
        onSelectProduct={onSelectProduct}
      />

      {/* 8. Carousel: Sale & Seasonal Offers */}
      {saleProducts.length > 0 && (
        <ProductCarousel
          title={t.carousels.sale}
          subtitle={t.carousels.saleSub}
          products={saleProducts}
          onQuickView={onQuickView}
          onSelectProduct={onSelectProduct}
          onOpenAlbumModal={onOpenAlbumModal}
          onViewAll={() => onNavigate('shop', { filter: 'sale' })}
        />
      )}

      {/* 9. High-Fashion Lookbook & Product Image Album Section */}
      <section className="bg-[var(--color-text)] text-[var(--color-bg)] py-16 border-t border-[var(--color-border)]/40 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[var(--color-accent)] text-xs font-semibold uppercase tracking-widest border border-[var(--color-accent)]/30">
                <Images className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'ألبوم صور أزياء النوم' : 'Product Image Album & Lookbook'}</span>
              </div>
              <h2 className="font-heading text-2xl sm:text-4xl font-bold text-white tracking-tight">
                {language === 'ar' ? 'معرض صور القطع المتوفرة بالمتجر' : 'Explore Available Pieces in High-Definition'}
              </h2>
              <p className="text-xs sm:text-sm text-[var(--color-bg)]/80 max-w-xl">
                {language === 'ar'
                  ? 'شاهدي تفاصيل الخامات الحريرية، أطقم الدانتيل، وأرواب العرائس عبر ألبوم الصور التفاعلي كامل الشاشة.'
                  : 'Zoom into delicate silk weaves, hand-stitched piping, and Chantilly lace hems with our interactive high-definition album.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('album')}
              className="px-5 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold uppercase tracking-wider rounded-xs flex items-center gap-2 self-start md:self-auto transition-colors cursor-pointer shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            >
              <span>{language === 'ar' ? 'عرض الألبوم بالكامل' : 'View Complete Album'}</span>
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          </div>

          {/* Album Photos Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {products.slice(0, 4).map((p) => {
              const totalStock = (p.variants || []).reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    if (onOpenAlbumModal) {
                      onOpenAlbumModal(p, 0);
                    } else {
                      onNavigate('album');
                    }
                  }}
                  className="group relative bg-[var(--color-card)]/10 rounded-sm overflow-hidden border border-[var(--color-border)]/40 hover:border-[var(--color-accent)] transition-all cursor-pointer shadow-lg"
                >
                  <div className="aspect-[3/4] overflow-hidden relative">
                    <img
                      src={p.images[0]}
                      alt={language === 'ar' ? p.nameAr : p.nameEn}
                      className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                    
                    <div className="absolute top-2.5 left-2.5 rtl:left-auto rtl:right-2.5 bg-[var(--color-text)]/70 backdrop-blur-md text-white text-[10px] font-mono font-semibold px-2 py-0.5 rounded-xs flex items-center gap-1 z-10">
                      <Images className="w-3 h-3 text-[var(--color-accent)]" />
                      <span>{p.images.length} {language === 'ar' ? 'صور' : 'Photos'}</span>
                    </div>

                    <div className="absolute top-2.5 right-2.5 rtl:right-auto rtl:left-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="p-1.5 rounded-full bg-white/20 hover:bg-white text-white hover:text-[var(--color-text)] transition-colors block">
                        <Maximize2 className="w-3.5 h-3.5" />
                      </span>
                    </div>

                    <div className="absolute bottom-3 inset-x-3 space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-[var(--color-accent)] font-medium">
                        {language === 'ar' ? p.categoryNameAr : p.categoryNameEn}
                      </p>
                      <h4 className="font-heading text-sm font-semibold text-white truncate">
                        {language === 'ar' ? p.nameAr : p.nameEn}
                      </h4>
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-white/20">
                        <span className="text-[var(--color-bg)] font-bold tabular-nums">
                          {formatBHD(p.salePrice ?? p.price)}
                        </span>
                        <span className="text-[10px] text-emerald-400 font-medium">
                          {totalStock > 0 ? `${totalStock} in Stock` : 'Out of Stock'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 10. Embedded Google Reviews & Social Proof Section */}
      <GoogleReviewsSection
        widgetId="YOUR_FEATURABLE_WIDGET_ID"
        title={language === 'ar' ? 'ماذا تقول عميلاتنا في تقييمات جوجل؟' : 'What Our Customers Are Saying'}
        subtitle={
          language === 'ar'
            ? 'تجارب حقيقية وتقييمات موثقة عبر جوجل من عميلاتنا في مملكة البحرين ودول الخليج العربي.'
            : 'Real feedback, verified ratings, and authentic reviews from shoppers across Bahrain.'
        }
        brandName="THE BEDTIME STORE"
        rating={4.9}
        reviewCount={148}
      />

    </div>
  );
};
