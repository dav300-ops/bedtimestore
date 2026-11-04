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
    <section 
      className="py-14 border-b transition-colors bg-[var(--color-bg)] border-[var(--color-border)]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Title */}
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <span 
            className="text-xs font-semibold tracking-widest uppercase text-[var(--color-primary)]"
          >
            {language === 'ar' ? 'تشكيلات متجر وقت النوم' : 'The Signature Edit'}
          </span>
          <h2 
            className="font-heading text-3xl sm:text-4xl font-semibold text-[var(--color-heading)]"
          >
            {t.categories.title}
          </h2>
          <p 
            className="text-sm font-light text-[var(--color-text-secondary)]"
          >
            {t.categories.subtitle}
          </p>
        </div>

        {/* Category Tiles Grid - Card background with gold hover border & contrast text */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-5">
          {activeCategories.map((cat) => {
            const name = language === 'ar' ? cat.nameAr : cat.nameEn;
            const desc = language === 'ar' ? cat.descriptionAr : cat.descriptionEn;
            const isKids = cat.id === 'cat-kids-sleepwear';

            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className="group relative flex flex-col rounded-sm overflow-hidden p-3.5 text-left rtl:text-right transition-all duration-300 hover:shadow-md hover:-translate-y-1 cursor-pointer bg-[var(--color-card)] border border-[var(--color-border)] hover:border-[var(--color-gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]"
              >
                {/* Visual Thumbnail with clean white container */}
                <div className="w-full aspect-square rounded-sm overflow-hidden bg-white mb-2.5 relative border border-[var(--color-border)]/50 group-hover:border-[var(--color-gold)]/60 transition-colors">
                  <img
                    src={cat.image}
                    alt={name}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                  {isKids && (
                    <span className="absolute top-1.5 left-1.5 rtl:left-auto rtl:right-1.5 bg-[var(--color-primary)] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-xs border border-[var(--color-gold)]/40 shadow-xs">
                      3–12Y
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-heading text-sm font-semibold text-[var(--color-text)] leading-snug group-hover:text-[var(--color-primary)] transition-colors">
                      {name}
                    </h3>
                    <p className="text-[11px] text-[var(--color-text-secondary)] line-clamp-2 mt-1 font-normal leading-normal hidden sm:block">
                      {desc}
                    </p>
                  </div>

                  {/* SHOP -> link */}
                  <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-[var(--color-primary)] group-hover:text-[var(--color-primary-hover)] uppercase tracking-wider transition-colors">
                    <span>{language === 'ar' ? 'تسوقي' : 'SHOP'}</span>
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
