import React, { useEffect, useRef } from 'react';
import { Product, ProductSize } from '../types';
import { Check, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface QuickAddPopoverProps {
  product: Product;
  selectedColorHex?: string;
  onSelectSize: (size: ProductSize) => void;
  onClose: () => void;
  justAddedSize: string | null;
}

export const QuickAddPopover: React.FC<QuickAddPopoverProps> = ({
  product,
  selectedColorHex,
  onSelectSize,
  onClose,
  justAddedSize,
}) => {
  const { language } = useLanguage();
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Extract unique sizes with stock check
  const sizeMap = new Map<ProductSize, number>();
  product.variants.forEach((v) => {
    // If a color is selected, prefer stock for that color, or aggregate
    if (!selectedColorHex || v.colorHex === selectedColorHex) {
      sizeMap.set(v.size, (sizeMap.get(v.size) || 0) + v.stock);
    } else if (!sizeMap.has(v.size)) {
      sizeMap.set(v.size, v.stock);
    }
  });

  const uniqueSizes = Array.from(sizeMap.entries());

  return (
    <div
      ref={popoverRef}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className="absolute inset-x-3 bottom-3 z-30 bg-[var(--color-card)] rounded-[8px] p-3 shadow-xl border border-[var(--color-border)] animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] font-semibold text-[var(--color-text)] uppercase tracking-wider">
          {language === 'ar' ? 'اختاري المقاس:' : language === 'ru' ? 'Выберите размер:' : language === 'fr' ? 'Choisissez la taille :' : 'Select Size:'}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
          className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] p-1 rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)]"
          aria-label="Close size picker"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto py-1">
        {uniqueSizes.map(([size, stock]) => {
          const isOutOfStock = stock <= 0;
          const isJustAdded = justAddedSize === size;

          return (
            <button
              key={size}
              type="button"
              disabled={isOutOfStock}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isOutOfStock) {
                  onSelectSize(size);
                }
              }}
              className={`h-9 px-3 rounded-md text-[13px] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                isJustAdded
                  ? 'bg-[var(--color-primary-hover)] text-white shadow-xs'
                  : isOutOfStock
                    ? 'opacity-40 line-through cursor-not-allowed border border-[var(--color-border)] text-[var(--color-text-secondary)]'
                    : 'bg-[var(--color-bg)] hover:bg-[var(--color-card)] text-[var(--color-text)] border border-[var(--color-border)] hover:border-[var(--color-primary)]'
              }`}
            >
              {isJustAdded && <Check className="w-3 h-3 text-white" />}
              <span>{size}</span>
            </button>
          );
        })}
      </div>

      {justAddedSize && (
        <p className="mt-2 text-[11px] font-bold text-center text-[var(--color-primary)] animate-in fade-in">
          {language === 'ar' ? 'تمت الإضافة إلى الحقيبة ✓' : language === 'ru' ? 'Добавлено в корзину ✓' : language === 'fr' ? 'Ajouté au panier ✓' : 'Added to bag ✓'}
        </p>
      )}
    </div>
  );
};
