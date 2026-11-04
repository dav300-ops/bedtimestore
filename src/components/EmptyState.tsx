import React from 'react';
import { Sparkles, RotateCcw } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface EmptyStateProps {
  onClearFilters: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onClearFilters }) => {
  const { language } = useLanguage();

  return (
    <div className="py-20 px-4 text-center max-w-md mx-auto flex flex-col items-center">
      <div className="w-14 h-14 rounded-full bg-[var(--color-card)] text-[var(--color-primary)] flex items-center justify-center mb-4 border border-[var(--color-border)]">
        <Sparkles className="w-7 h-7 text-[var(--color-primary)]" />
      </div>

      <h3 
        className="font-serif text-2xl font-bold mb-2 text-[var(--color-text)]"
        style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}
      >
        {language === 'ar' ? 'لا توجد منتجات تطابق اختياراتك' : 'No products match your filters'}
      </h3>

      <p className="text-[14px] text-[var(--color-text-secondary)] mb-6 leading-relaxed">
        {language === 'ar' 
          ? 'جربي تعديل المقاس، اللون، نوع القماش أو نطاق السعر للعثور على قطع النوم الفاخرة التي تبحثين عنها.'
          : 'Try adjusting your size, color, fabric, or price range to discover our available luxury bedtime collections.'}
      </p>

      <button
        type="button"
        onClick={onClearFilters}
        className="h-[44px] px-6 rounded-[8px] bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-[14px] font-semibold transition-all inline-flex items-center gap-2 cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
      >
        <RotateCcw className="w-4 h-4" />
        <span>{language === 'ar' ? 'مسح الفلاتر' : 'Clear filters'}</span>
      </button>
    </div>
  );
};
