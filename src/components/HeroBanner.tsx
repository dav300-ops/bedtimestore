import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useStore } from '../context/StoreContext';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { HERO_IMAGE } from '../assets/images';

interface HeroBannerProps {
  onShopClick: () => void;
  onBridalClick: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onShopClick, onBridalClick }) => {
  const { language, isRtl } = useLanguage();
  const { cms } = useStore();

  const kicker = language === 'ar' ? cms.heroKickerAr : cms.heroKickerEn;
  const title = language === 'ar' ? cms.heroTitleAr : cms.heroTitleEn;
  const subtitle = language === 'ar' ? cms.heroSubtitleAr : cms.heroSubtitleEn;
  const cta = language === 'ar' ? cms.heroCtaAr : cms.heroCtaEn;

  return (
    <section className="relative bg-[#FBE7E3] overflow-hidden border-b border-[#E1D1E4]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Text Content */}
          <div className="lg:col-span-6 space-y-6 z-10">
            {/* Kicker */}
            <div className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-[#8E7C49]">
              <span>{kicker}</span>
              <span aria-hidden="true">·</span>
              <span>{language === 'ar' ? 'مملكة البحرين' : ''}</span>
            </div>

            {/* Display Headline */}
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl text-[#340404] font-normal leading-[1.15] text-balance">
              {title}
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-[#340404]/80 leading-relaxed font-light max-w-xl">
              {subtitle}
            </p>

            {/* Actions */}
            <div className="pt-4 flex flex-wrap items-center gap-4">
              <button
                onClick={onShopClick}
                className="inline-flex items-center gap-3 bg-[#E22001] hover:bg-[#c01b01] text-white px-7 py-3.5 text-sm uppercase tracking-wider font-semibold rounded-sm shadow-sm transition-all hover:translate-y-[-1px]"
              >
                <span>{cta}</span>
                {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </button>

            </div>

            {/* Trust Markers */}
            <div className="pt-6 border-t border-[#E1D1E4] grid grid-cols-3 gap-4 text-xs text-[#340404]/75">
              <div>
                <p className="font-semibold text-[#8E7C49]">100% Grade-6A</p>
                <p className="text-[11px]">{language === 'ar' ? 'حرير توت طبيعي' : 'Mulberry Silk'}</p>
              </div>
           
              <div>
                <p className="font-semibold text-[#8E7C49]">Express 24h</p>
                <p className="text-[11px]">{language === 'ar' ? 'توصيل سريع بالبحرين' : 'Bahrain Delivery'}</p>
              </div>
            </div>

          </div>

          {/* Hero Visual Asset */}
          <div className="lg:col-span-6 relative">
            <div className="relative mx-auto max-w-lg lg:max-w-none">
              {/* Subtle back decorative frame in Pastel Day */}
              <div className="absolute -inset-2 sm:-inset-4 bg-[#E1D1E4]/60 rounded-sm -rotate-1" />
              
              <div className="relative bg-white rounded-sm overflow-hidden shadow-xl aspect-[16/10] sm:aspect-[4/3] lg:aspect-[16/11]">
                <img
                  src={HERO_IMAGE}
                  alt="The Bedtime Store Luxury Nightwear Fashion"
                  className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-700"
                  loading="eager"
                  referrerPolicy="no-referrer"
                />
                
                {/* Discrete luxury caption */}
                <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-sm border border-[#E1D1E4] flex items-center justify-between text-xs text-[#340404]">
                  <span className="font-heading font-medium tracking-wide">
                    {language === 'ar' ? 'مجموعة الحرير الخام - تصوير أزياء المنامة' : 'Signature Silk Atelier · Manama'}
                  </span>
                  <span className="text-[#8E7C49] font-medium text-[11px]">
                    {language === 'ar' ? 'إصدار محدود' : 'Limited Edition'}
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
