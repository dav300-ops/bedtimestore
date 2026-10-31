import React from 'react';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { Category } from '../types';
import { ArrowRight, ArrowLeft } from 'lucide-react';

interface CategoryGridProps {
  onSelectCategory: (categoryId: string) => void;
}

export const CategoryGrid: React.FC<CategoryGridProps> = ({ onSelectCategory }) => {
  const { categories } = useStore();
  const { language, isRtl, t } = useLanguage();

  const activeCategories = categories.filter((c) => c.active).sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <section className="py-14 bg-[#FBE7E3] border-b border-[#E1D1E4]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Title */}
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <span className="text-xs font-semibold tracking-widest uppercase text-[#8E7C49]">
            {language === 'ar' ? 'تشكيلات متجر وقت النوم' : 'The Signature Edit'}
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-semibold text-[#340404]">
            {t.categories.title}
          </h2>
          <p className="text-sm text-[#340404]/75 font-light">
            {t.categories.subtitle}
          </p>
        </div>

        {/* Category Tiles Grid - Pastel Day backgrounds with Black Bean text */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4 sm:gap-5">
          {activeCategories.map((cat) => {
            const name = language === 'ar' ? cat.nameAr : cat.nameEn;
            const desc = language === 'ar' ? cat.descriptionAr : cat.descriptionEn;
            const isKids = cat.id === 'cat-kids-sleepwear';

            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className="group relative flex flex-col bg-[#E1D1E4] hover:bg-[#d8c3dc] border border-[#E1D1E4]/90 rounded-sm overflow-hidden p-3.5 text-left rtl:text-right transition-all duration-300 hover:shadow-md hover:-translate-y-1 cursor-pointer"
              >
                {/* Visual Thumbnail */}
                <div className="w-full aspect-square rounded-sm overflow-hidden bg-white mb-2.5 relative">
                  <img
                    src={cat.image}
                    alt={name}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                  {isKids && (
                    <span className="absolute top-1.5 left-1.5 rtl:left-auto rtl:right-1.5 bg-[#340404] text-[#FBE7E3] text-[9px] font-bold px-1.5 py-0.5 rounded-xs">
                      3–12Y
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-heading text-sm font-semibold text-[#340404] leading-snug group-hover:text-[#E22001] transition-colors">
                      {name}
                    </h3>
                    <p className="text-[10px] text-[#340404]/75 line-clamp-2 mt-1 font-light leading-normal hidden sm:block">
                      {desc}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-[#340404] uppercase tracking-wider group-hover:text-[#E22001] transition-colors">
                    <span>{language === 'ar' ? 'تسوقي' : 'Shop'}</span>
                    {isRtl ? (
                      <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
                    ) : (
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

      </div>
    </section>
  );
};
