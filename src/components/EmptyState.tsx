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
      <div className="w-14 h-14 rounded-full bg-[#DDD3EA]/60 text-[#6B1E3F] flex items-center justify-center mb-4">
        <Sparkles className="w-7 h-7 text-[#6B1E3F]" />
      </div>

      <h3 
        className="font-serif text-2xl font-bold mb-2 text-[#2A1A20]"
        style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}
      >
        {language === 'ar' ? 'لا توجد منتجات تطابق اختياراتك' : 'No products match your filters'}
      </h3>

      <p className="text-[14px] text-[#5F5357] mb-6 leading-relaxed">
        {language === 'ar' 
          ? 'جربي تعديل المقاس، اللون، نوع القماش أو نطاق السعر للعثور على قطع النوم الفاخرة التي تبحثين عنها.'
          : 'Try adjusting your size, color, fabric, or price range to discover our available luxury bedtime collections.'}
      </p>

      <button
        type="button"
        onClick={onClearFilters}
        className="h-[44px] px-6 rounded-[8px] bg-[#6B1E3F] hover:bg-[#521630] text-white text-[14px] font-semibold transition-all inline-flex items-center gap-2 cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B3261E]"
        style={{ backgroundColor: 'var(--brand-burgundy, #6B1E3F)' }}
      >
        <RotateCcw className="w-4 h-4" />
        <span>{language === 'ar' ? 'مسح الفلاتر' : 'Clear filters'}</span>
      </button>
    </div>
  );
};
