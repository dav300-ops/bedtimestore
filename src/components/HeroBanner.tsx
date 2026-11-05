import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { HERO_IMAGE } from '../assets/images';

interface HeroBannerProps {
  onShopClick: () => void;
  onBridalClick?: () => void;
}

// Art Deco / Baroque filigree corner flourish in metallic gold (#C9A24B)
const CornerFlourish: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    viewBox="0 0 40 40" 
    className={`w-7 h-7 sm:w-9 sm:h-9 text-[#C9A24B] pointer-events-none drop-shadow-xs ${className || ''}`}
    fill="none" 
    stroke="currentColor"
    aria-hidden="true"
  >
    {/* Outer corner frame */}
    <path d="M2 18 L2 2 L18 2" strokeWidth="1.5" strokeLinecap="round" />
    {/* Inner decorative filigree curves */}
    <path d="M6 24 C6 14 14 6 24 6" strokeWidth="1.2" strokeLinecap="round" opacity="0.9" />
    <path d="M2 2 L14 14" strokeWidth="1" opacity="0.75" />
    <circle cx="14" cy="14" r="1.5" fill="#C9A24B" />
    <circle cx="6" cy="6" r="1.5" fill="#E3C878" />
    <path d="M24 6 C28 6 32 4 34 2" strokeWidth="0.8" opacity="0.7" />
    <path d="M6 24 C6 28 4 32 2 34" strokeWidth="0.8" opacity="0.7" />
  </svg>
);

export const HeroBanner: React.FC<HeroBannerProps> = ({ onShopClick }) => {
  const { language, isRtl } = useLanguage();

  return (
    <section 
      className="relative overflow-hidden bg-gradient-to-b from-[#F1ECFA] to-[#F7F3FC] border-b border-[#C9A24B]/30 min-h-[500px] flex items-center justify-center"
      style={{
        backgroundImage: 'radial-gradient(ellipse at 80% 20%, rgba(227, 200, 120, 0.08) 0%, transparent 50%), linear-gradient(to bottom, #F1ECFA 0%, #F7F3FC 100%)'
      }}
    >
      <div className="w-full max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          
          {/* Left Column: Vertically Centered (~45% on desktop: 5 of 12 columns or 45%) */}
          <div className="lg:col-span-5 flex flex-col items-center text-center space-y-4 sm:space-y-5 z-10 px-2 sm:px-4">
            
            {/* 1. Eyebrow: "SPRING / SUMMER 2026 COLLECTION" flanked by thin gold horizontal lines */}
            <div className="flex items-center justify-center gap-3 w-full">
              <span className="h-[1px] w-6 sm:w-10 bg-[#C9A24B]/70" aria-hidden="true" />
              <span className="text-[10px] sm:text-[11px] font-semibold tracking-[0.22em] sm:tracking-[0.26em] uppercase text-[#C9A24B] select-none">
                {language === 'ar' ? 'مجموعة ربيع / صيف ٢٠٢٦' : 'SPRING / SUMMER 2026 COLLECTION'}
              </span>
              <span className="h-[1px] w-6 sm:w-10 bg-[#C9A24B]/70" aria-hidden="true" />
            </div>

            {/* 2. Headline in two lines, large high-contrast serif (~64px desktop) */}
            <h1 
              className="font-serif leading-[1.08] tracking-tight select-none"
              style={{ fontFamily: '"Cormorant Garamond", "Playfair Display", Georgia, serif' }}
            >
              <span className="block text-4xl sm:text-5xl lg:text-[62px] font-normal text-[#8A5A1E]">
                {language === 'ar' ? 'نامي بجمال.' : 'Sleep Beautifully.'}
              </span>
              <span className="block text-4xl sm:text-5xl lg:text-[62px] font-normal text-[#6A4315] mt-0.5">
                {language === 'ar' ? 'اشعري بالجمال.' : 'Feel Beautiful.'}
              </span>
            </h1>

            {/* 3. Small gold lotus/fleur ornament divider with thin gold lines either side, centered under headline */}
            <div className="flex items-center justify-center gap-3 w-full max-w-xs py-1" aria-hidden="true">
              <div className="h-[1px] bg-gradient-to-r from-transparent via-[#C9A24B] to-[#C9A24B] flex-1 opacity-75" />
              <div className="text-[#C9A24B] px-1">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 3c-1.2 2.5-3 5-3 8 0 2.5 1.5 4.5 3 5 1.5-.5 3-2.5 3-5 0-3-1.8-5.5-3-8zm-5 6c-.5 2-1 4-1 6 0 2.2 1.3 4 3 4.8-.8-1.5-1.2-3.2-1-4.8.2-2 1-4 1.5-5.5-1-.2-1.8-.3-2.5-.5zm10 0c-.7.2-1.5.3-2.5.5.5 1.5 1.3 3.5 1.5 5.5.2 1.6-.2 3.3-1 4.8 1.7-.8 3-2.6 3-4.8 0-2-.5-4-1-6zM3 17c.5 1.5 2 2.8 4 3.5-.8-.8-1.4-1.8-1.7-3-.8-.1-1.6-.3-2.3-.5zm18 0c-.7.2-1.5.4-2.3.5-.3 1.2-.9 2.2-1.7 3 2-.7 3.5-2 4-3.5z" />
                </svg>
              </div>
              <div className="h-[1px] bg-gradient-to-l from-transparent via-[#C9A24B] to-[#C9A24B] flex-1 opacity-75" />
            </div>

            {/* 4. Body copy, ~15px, dark brown, centered */}
            <p className="text-[14px] sm:text-[15px] leading-relaxed text-[#3B2A24] max-w-md mx-auto font-normal font-sans opacity-95">
              {language === 'ar'
                ? 'بيجامات حرير التوت الطبيعي ١٠٠٪ المصنوعة يدوياً، قمصان نوم ناعمة من الدانتيل الفرنسي، وأرواب صباحية ساحرة للعرائس مصممة لأناقة خالدة في البحرين.'
                : 'Handcrafted 100% mulberry silk pajamas, whisper-soft French lace slips, and ethereal bridal morning robes tailored for timeless elegance in Bahrain.'}
            </p>

            {/* 5. CTA button: Burgundy fill (#6B0F1F), 1.5px gold border (#C9A24B), slightly rounded corners, cream/gold text, subtle gold glow on hover */}
            <div className="pt-2">
              <button
                type="button"
                onClick={onShopClick}
                className="inline-flex items-center justify-center gap-3 bg-[#6B0F1F] hover:bg-[#4A0A15] text-[#FBF4E4] hover:text-white border-[1.5px] border-[#C9A24B] rounded-sm px-7 sm:px-8 py-3 sm:py-3.5 text-xs sm:text-[13px] uppercase tracking-[0.2em] font-semibold transition-all duration-300 shadow-md hover:shadow-[0_0_24px_rgba(201,162,75,0.45)] cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24B]"
              >
                <span>{language === 'ar' ? 'تسوقي ملابس النوم' : 'SHOP NIGHTWEAR'}</span>
                <span className="text-[#E3C878] group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">
                  {isRtl ? '←' : '→'}
                </span>
              </button>
            </div>

            {/* 6. Bottom trust strip: Thin gold rules above and below, items spaced apart: "100% Grade 6A" and "Express 24h" in small gold-brown serif text */}
            <div className="w-full max-w-sm pt-2">
              <div className="border-y border-[#C9A24B]/40 py-2.5 flex items-center justify-around text-center">
                <div className="px-3">
                  <p 
                    className="font-serif text-xs sm:text-[13px] font-semibold tracking-wide text-[#8A5A1E] leading-tight"
                    style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}
                  >
                    100% Grade 6A
                  </p>
                  <p className="text-[10px] text-[#5E453D] tracking-wider uppercase font-sans mt-0.5">
                    {language === 'ar' ? 'حرير توت نقي' : 'Mulberry Silk'}
                  </p>
                </div>

                <div className="h-6 w-[1px] bg-[#C9A24B]/50" aria-hidden="true" />

                <div className="px-3">
                  <p 
                    className="font-serif text-xs sm:text-[13px] font-semibold tracking-wide text-[#8A5A1E] leading-tight"
                    style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}
                  >
                    Express 24h
                  </p>
                  <p className="text-[10px] text-[#5E453D] tracking-wider uppercase font-sans mt-0.5">
                    {language === 'ar' ? 'توصيل البحرين' : 'Bahrain Delivery'}
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: ~55% on desktop (7 of 12 columns) */}
          <div className="lg:col-span-7 relative w-full">
            {/* Outer container with double gold border and ornate gold corner flourishes at all 4 corners */}
            <div className="relative p-2 sm:p-2.5 rounded-2xl border border-[#C9A24B]/60 bg-gradient-to-br from-[#E3C878]/10 via-transparent to-[#C9A24B]/10 shadow-xl max-w-lg lg:max-w-none mx-auto">
              
              {/* Ornate Gold Corner Flourishes (Art Deco / Baroque filigree) at all 4 corners */}
              <CornerFlourish className="absolute -top-1 -left-1 z-20" />
              <CornerFlourish className="absolute -top-1 -right-1 -scale-x-100 z-20" />
              <CornerFlourish className="absolute -bottom-1 -left-1 -scale-y-100 z-20" />
              <CornerFlourish className="absolute -bottom-1 -right-1 -scale-x-100 -scale-y-100 z-20" />

              {/* Inner photo container with second gold border */}
              <div className="relative rounded-xl overflow-hidden border border-[#C9A24B] shadow-inner bg-white aspect-[4/3] sm:aspect-[4/3] lg:aspect-[16/11] group">
                <img
                  src={HERO_IMAGE}
                  alt="Woman in luxury burgundy lace and satin wrap robe seated on gilded cream silk sofa in Bahrain boutique"
                  className="w-full h-full object-cover object-center transform group-hover:scale-104 transition-transform duration-700"
                  loading="eager"
                  referrerPolicy="no-referrer"
                />

                {/* Subtle soft vignette on photo */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

                {/* Bottom Overlay: Slim burgundy caption bar with gold borders and gold text, split */}
                <div className="absolute bottom-3 sm:bottom-4 left-3 right-3 sm:left-4 sm:right-4 bg-[#6B0F1F]/95 backdrop-blur-md border border-[#C9A24B] rounded-sm py-2 px-3 sm:px-4 flex items-center justify-between text-xs shadow-lg">
                  <span 
                    className="font-serif tracking-wider font-medium text-[11px] sm:text-xs text-[#E3C878] truncate"
                    style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}
                  >
                    {language === 'ar' ? 'حرير التوت التوقيعي · مشغل المنامة' : 'Signature Silk, Atelier · Manama'}
                  </span>
                  
                  {/* Thin vertical gold divider */}
                  <div className="h-3.5 w-[1px] bg-[#C9A24B]/60 mx-2 sm:mx-3 shrink-0" aria-hidden="true" />
                  
                  <span className="font-sans font-semibold tracking-widest uppercase text-[10px] sm:text-[11px] text-[#FBF4E4] shrink-0">
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
