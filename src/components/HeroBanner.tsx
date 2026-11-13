import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useStore } from '../context/StoreContext';
import { storeConfig } from '../config/storeConfig';
import { HERO_IMAGE } from '../assets/images';

interface HeroBannerProps {
  onShopClick: () => void;
  onBridalClick?: () => void;
}

const CornerFlourish: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 40 40"
    className={`w-6 h-6 sm:w-8 sm:h-8 text-[var(--gold-decor)] pointer-events-none drop-shadow-xs ${className || ''}`}
    fill="none"
    stroke="currentColor"
    aria-hidden="true"
  >
    <path d="M2 18 L2 2 L18 2" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M6 24 C6 14 14 6 24 6" strokeWidth="1.2" strokeLinecap="round" opacity="0.9" />
    <path d="M2 2 L14 14" strokeWidth="1" opacity="0.75" />
    <circle cx="14" cy="14" r="1.5" fill="currentColor" />
    <circle cx="6" cy="6" r="1.5" fill="var(--gold-soft)" />
  </svg>
);

export const HeroBanner: React.FC<HeroBannerProps> = ({ onShopClick }) => {
  const { language, t, isRtl } = useLanguage();
  const { cms } = useStore();

  const seasonEyebrow =
    (language === 'ar'
      ? cms?.heroKickerAr
      : language === 'ru'
        ? cms?.heroKickerRu
        : language === 'fr'
          ? cms?.heroKickerFr
          : cms?.heroKickerEn) ||
    storeConfig.defaultSeasonEyebrow[language] ||
    t.hero.kicker;

  const heroTitle =
    (language === 'en' && cms?.heroTitleEn) ||
    (language === 'ar' && cms?.heroTitleAr) ||
    t.hero.title;

  const titleParts = heroTitle.split(/(?<=\.)\s+/).filter(Boolean);
  const firstLine = titleParts[0] || heroTitle;
  const secondLine = titleParts.slice(1).join(' ');

  const heroSubtitle =
    (language === 'en' && cms?.heroSubtitleEn) ||
    (language === 'ar' && cms?.heroSubtitleAr) ||
    t.hero.subtitle;

  const heroCta =
    (language === 'en' && cms?.heroCtaEn) ||
    (language === 'ar' && cms?.heroCtaAr) ||
    t.hero.cta;

  return (
    <section
      className="relative overflow-hidden border-b border-[var(--gold-decor)]/40 flex items-center justify-center"
      style={{
        backgroundColor: 'var(--surface-page)',
        backgroundImage:
          'radial-gradient(ellipse at 80% 20%, var(--gold-soft) 0%, transparent 50%), linear-gradient(to bottom, var(--surface-page) 0%, var(--surface-champagne) 100%)',
      }}
    >
      <div className="w-full max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-10 items-center">
          {/* Primary Column: Eyebrow, Heading, Short Subline, Single CTA */}
          <div className="lg:col-span-5 flex flex-col items-center text-center space-y-3.5 sm:space-y-5 z-10 px-1 sm:px-4">
            {/* Dynamic Season Eyebrow (flanked by 1px --gold-decor lines) */}
            <div className="flex items-center justify-center gap-2.5 sm:gap-3 w-full">
              <span className="h-[1px] w-6 sm:w-10 bg-[var(--gold-decor)]" aria-hidden="true" />
              <span className="text-[11px] font-semibold tracking-[0.18em] sm:tracking-[0.24em] uppercase text-[var(--gold-text)] gold-text-rtl-weight select-none">
                {seasonEyebrow}
              </span>
              <span className="h-[1px] w-6 sm:w-10 bg-[var(--gold-decor)]" aria-hidden="true" />
            </div>

            {/* Serif Hero Headline */}
            <h1
              className="font-serif leading-[1.08] tracking-tight select-none text-balance text-[var(--maroon-700)]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              <span className="block text-[34px] sm:text-5xl lg:text-[60px] font-medium">
                {firstLine}
              </span>
              {secondLine && (
                <span className="block text-[34px] sm:text-5xl lg:text-[60px] font-normal mt-0.5">
                  {secondLine}
                </span>
              )}
            </h1>

            {/* Subtle divider on tablet/desktop */}
            <div className="hidden sm:flex items-center justify-center gap-3 w-full max-w-xs py-1" aria-hidden="true">
              <div className="h-[1px] bg-gradient-to-r from-transparent via-[var(--gold-decor)] to-[var(--gold-decor)] flex-1 opacity-80" />
              <div className="text-[var(--gold-decor)] px-1">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 3c-1.2 2.5-3 5-3 8 0 2.5 1.5 4.5 3 5 1.5-.5 3-2.5 3-5 0-3-1.8-5.5-3-8zm-5 6c-.5 2-1 4-1 6 0 2.2 1.3 4 3 4.8-.8-1.5-1.2-3.2-1-4.8.2-2 1-4 1.5-5.5-1-.2-1.8-.3-2.5-.5zm10 0c-.7.2-1.5.3-2.5.5.5 1.5 1.3 3.5 1.5 5.5.2 1.6-.2 3.3-1 4.8 1.7-.8 3-2.6 3-4.8 0-2-.5-4-1-6z" />
                </svg>
              </div>
              <div className="h-[1px] bg-gradient-to-l from-transparent via-[var(--gold-decor)] to-[var(--gold-decor)] flex-1 opacity-80" />
            </div>

            {/* Concise subline */}
            <p className="text-[14px] sm:text-[15px] leading-relaxed text-[var(--text-body)] max-w-md mx-auto font-normal line-clamp-2 sm:line-clamp-none">
              {heroSubtitle}
            </p>

            {/* Primary CTA Button */}
            <div className="pt-1 sm:pt-2">
              <button
                type="button"
                onClick={onShopClick}
                className="min-h-[48px] inline-flex items-center justify-center gap-2.5 bg-[var(--maroon-700)] hover:bg-[var(--maroon-600)] active:scale-[0.99] text-[var(--text-on-maroon)] border-[1.5px] border-[var(--gold-decor)] rounded-[var(--radius-pill)] px-7 sm:px-8 py-3 text-xs sm:text-[13px] uppercase tracking-[0.18em] font-semibold transition-all duration-200 shadow-[var(--shadow-soft)] cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-decor)]"
              >
                <span>{heroCta}</span>
                <span
                  aria-hidden="true"
                  className="text-[var(--surface-champagne)] group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform"
                >
                  {isRtl ? '←' : '→'}
                </span>
              </button>
            </div>

            {/* Trust strip shown on tablet/desktop */}
            <div className="hidden sm:block w-full max-w-sm pt-2">
              <div className="border-y border-[var(--gold-decor)]/50 py-2.5 flex items-center justify-around text-center">
                <div className="px-3">
                  <p
                    className="font-serif text-[13px] font-semibold tracking-wide text-[var(--maroon-700)] leading-tight"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    100% Grade 6A
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] tracking-wider uppercase font-sans mt-0.5">
                    {language === 'ar'
                      ? 'حرير توت نقي'
                      : language === 'ru'
                        ? 'Натуральный шёлк'
                        : language === 'fr'
                          ? 'Soie de Mûrier'
                          : 'Mulberry Silk'}
                  </p>
                </div>

                <div className="h-6 w-[1px] bg-[var(--gold-decor)]/60" aria-hidden="true" />

                <div className="px-3">
                  <p
                    className="font-serif text-[13px] font-semibold tracking-wide text-[var(--maroon-700)] leading-tight"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    Express 24h
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] tracking-wider uppercase font-sans mt-0.5">
                    {language === 'ar'
                      ? 'توصيل البحرين'
                      : language === 'ru'
                        ? 'Доставка по Бахрейну'
                        : language === 'fr'
                          ? 'Livraison Bahreïn'
                          : 'Bahrain Delivery'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Visual Column: Eager Hero Image with aspect-ratio */}
          <div className="lg:col-span-7 relative w-full">
            <div className="relative p-1.5 sm:p-2.5 rounded-2xl border border-[var(--gold-decor)]/60 bg-[var(--surface-card)]/50 shadow-[var(--shadow-soft)] max-w-lg lg:max-w-none mx-auto">
              <CornerFlourish className="hidden sm:block absolute -top-1 -start-1 z-20" />
              <CornerFlourish className="hidden sm:block absolute -top-1 -end-1 -scale-x-100 z-20" />
              <CornerFlourish className="hidden sm:block absolute -bottom-1 -start-1 -scale-y-100 z-20" />
              <CornerFlourish className="hidden sm:block absolute -bottom-1 -end-1 -scale-x-100 -scale-y-100 z-20" />

              <div className="relative rounded-xl overflow-hidden border border-[var(--gold-decor)] shadow-inner bg-[var(--surface-card)] aspect-[4/3] lg:aspect-[16/11] group">
                <img
                  src={HERO_IMAGE}
                  alt={heroTitle}
                  className="w-full h-full object-cover object-center transform group-hover:scale-[1.03] transition-transform duration-700"
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  referrerPolicy="no-referrer"
                />

                <div className="hidden sm:block absolute inset-0 bg-gradient-to-t from-[var(--maroon-900)]/55 via-transparent to-transparent pointer-events-none" />

                <div className="hidden sm:flex absolute bottom-4 inset-x-4 bg-[var(--maroon-900)]/95 backdrop-blur-md border border-[var(--gold-decor)] rounded-sm py-2 px-4 items-center justify-between text-xs shadow-lg">
                  <span
                    className="font-serif tracking-wider font-medium text-xs text-[var(--surface-champagne)] truncate"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {language === 'ar'
                      ? 'حرير التوت التوقيعي · مشغل المنامة'
                      : language === 'ru'
                        ? 'Фирменный шёлк · Ателье в Манаме'
                        : language === 'fr'
                          ? 'Soie Signature · Atelier de Manama'
                          : 'Signature Silk, Atelier · Manama'}
                  </span>
                  <div className="h-3.5 w-[1px] bg-[var(--gold-decor)]/70 mx-3 shrink-0" aria-hidden="true" />
                  <span className="font-sans font-semibold tracking-widest uppercase text-[11px] text-[var(--text-on-maroon)] shrink-0">
                    {language === 'ar'
                      ? 'إصدار محدود'
                      : language === 'ru'
                        ? 'Лимитированная серия'
                        : language === 'fr'
                          ? 'Édition Limitée'
                          : 'Limited Edition'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
