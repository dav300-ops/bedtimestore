import React from 'react';
import { useLanguage } from '../context/LanguageContext';

export interface CategoryChipItem {
  id: string;
  nameEn: string;
  nameAr: string;
  nameRu: string;
  nameFr: string;
}

export const STORE_CATEGORIES: CategoryChipItem[] = [
  { id: 'all', nameEn: 'All Nightwear', nameAr: 'جميع ملابس النوم', nameRu: 'Все модели', nameFr: 'Tous les Vêtements de Nuit' },
  { id: 'cat-night-dresses', nameEn: 'Night Dresses', nameAr: 'فساتين النوم', nameRu: 'Ночные сорочки', nameFr: 'Robes & Nuisettes' },
  { id: 'cat-pajama-sets', nameEn: 'Pajama Sets', nameAr: 'أطقم البيجامات', nameRu: 'Комплекты пижам', nameFr: 'Ensembles Pyjamas' },
  { id: 'cat-robes', nameEn: 'Robes & Kimonos', nameAr: 'الأرواب والكيمونو', nameRu: 'Халаты и кимоно', nameFr: 'Peignoirs & Kimonos' },
  { id: 'cat-silk-nightwear', nameEn: 'Pure Silk Collection', nameAr: 'مجموعة الحرير الطبيعي', nameRu: 'Натуральный шёлк', nameFr: 'Collection Soie Pure' },
  { id: 'cat-bridal', nameEn: 'Bridal Nightwear', nameAr: 'تشكيلة العرائس', nameRu: 'Свадебная линия', nameFr: 'Lingerie de Nuit Mariée' },
  { id: 'cat-sleep-sets', nameEn: 'Sleep & Cami Sets', nameAr: 'أطقم الكامي والراحة', nameRu: 'Комплекты с топами', nameFr: 'Ensembles Cami & Détente' },
  { id: 'cat-kids-sleepwear', nameEn: 'Curated Kids Collection', nameAr: 'تشكيلة الأطفال الفاخرة', nameRu: 'Детская коллекция', nameFr: 'Collection Enfants' },
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
      className="w-full bg-[var(--surface-lavender)] py-4 px-4 sm:px-6 md:px-12 transition-colors border-b border-[var(--line)]"
    >
      <div className="flex items-center gap-[10px] overflow-x-auto pb-1 scrollbar-none select-none scroll-smooth">
        {STORE_CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.id;
          const label = language === 'ar' ? cat.nameAr : language === 'ru' ? cat.nameRu : language === 'fr' ? cat.nameFr : cat.nameEn;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              aria-pressed={isActive}
              className={`h-[44px] rounded-[var(--radius-pill)] px-[18px] text-[14px] whitespace-nowrap shrink-0 transition-all duration-150 flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-decor)] focus-visible:ring-offset-2 ${
                isActive
                  ? 'bg-[var(--maroon-700)] text-[var(--text-on-maroon)] font-semibold shadow-xs border border-[var(--maroon-700)]'
                  : 'bg-[var(--surface-card)] text-[var(--maroon-700)] font-normal hover:bg-[var(--surface-page)] hover:border-[var(--maroon-700)] border border-[var(--line)]'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
