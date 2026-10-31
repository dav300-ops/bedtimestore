import React from 'react';
import { useLanguage } from '../context/LanguageContext';

export interface CategoryChipItem {
  id: string;
  nameEn: string;
  nameAr: string;
  nameRu: string;
}

export const STORE_CATEGORIES: CategoryChipItem[] = [
  { id: 'all', nameEn: 'All Nightwear', nameAr: 'جميع ملابس النوم', nameRu: 'Все модели' },
  { id: 'cat-night-dresses', nameEn: 'Night Dresses', nameAr: 'فساتين النوم', nameRu: 'Ночные сорочки' },
  { id: 'cat-pajama-sets', nameEn: 'Pajama Sets', nameAr: 'أطقم البيجامات', nameRu: 'Комплекты пижам' },
  { id: 'cat-robes', nameEn: 'Robes & Kimonos', nameAr: 'الأرواب والكيمونو', nameRu: 'Халаты и кимоно' },
  { id: 'cat-silk-nightwear', nameEn: 'Pure Silk Collection', nameAr: 'مجموعة الحرير الطبيعي', nameRu: 'Натуральный шёлк' },
  { id: 'cat-bridal', nameEn: 'Bridal Nightwear', nameAr: 'تشكيلة العرائس', nameRu: 'Свадебная линия' },
  { id: 'cat-sleep-sets', nameEn: 'Sleep & Cami Sets', nameAr: 'أطقم الكامي والراحة', nameRu: 'Комплекты с топами' },
  { id: 'cat-kids-sleepwear', nameEn: 'Curated Kids Collection', nameAr: 'تشكيلة الأطفال الفاخرة', nameRu: 'Детская коллекция' },
];

interface CategoryChipsProps {
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
}

export const CategoryChips: React.FC<CategoryChipsProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  const { language } = useLanguage();

  return (
    <nav 
      aria-label="Category filter"
      className="w-full bg-[#FFF8F6] py-4 px-4 sm:px-6 md:px-12 transition-colors border-b border-[#EEE4E4]"
      style={{ backgroundColor: 'var(--bg-shop, #FFF8F6)' }}
    >
      <div className="flex items-center gap-[10px] overflow-x-auto pb-1 scrollbar-none select-none scroll-smooth">
        {STORE_CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.id;
          const label = language === 'ar' ? cat.nameAr : language === 'ru' ? cat.nameRu : cat.nameEn;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              aria-pressed={isActive}
              className={`h-[44px] rounded-[22px] px-[18px] text-[14px] whitespace-nowrap shrink-0 transition-all duration-150 flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B3261E] focus-visible:ring-offset-2 ${
                isActive
                  ? 'bg-[#DDD3EA] text-[#2A1A20] font-semibold shadow-xs border border-[#CFC3C6]/50'
                  : 'bg-white text-[#2A1A20] font-normal hover:bg-[#FFF8F6] hover:border-[#2A1A20]/40 border border-[#CFC3C6]'
              }`}
              style={{
                backgroundColor: isActive ? 'var(--chip-lavender, #DDD3EA)' : '#FFFFFF',
                borderColor: isActive ? 'transparent' : 'var(--border-shop, #CFC3C6)',
                color: 'var(--text-shop-main, #2A1A20)',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
