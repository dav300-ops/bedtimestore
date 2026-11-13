import React from 'react';

export const ProductCardSkeleton: React.FC = () => {
  return (
    <div 
      className="bg-[var(--surface-card)] rounded-[var(--radius-card)] overflow-hidden border border-[var(--line)] shadow-xs flex flex-col animate-pulse"
    >
      {/* 4/5 Aspect Ratio Image Skeleton */}
      <div 
        className="aspect-[4/5] w-full bg-[var(--surface-champagne)]/60"
        style={{ aspectRatio: '4/5' }}
      />

      {/* Content Skeleton */}
      <div className="p-[14px_16px_16px] flex flex-col gap-[8px] bg-[var(--surface-card)]">
        {/* Category kicker */}
        <div className="h-3 w-20 bg-[var(--line)] rounded-xs" />

        {/* Product title */}
        <div className="h-4 w-4/5 bg-[var(--line)] rounded-xs" />

        {/* Color swatches */}
        <div className="flex items-center gap-1.5 py-1">
          <div className="w-4 h-4 rounded-full bg-[var(--line)]" />
          <div className="w-4 h-4 rounded-full bg-[var(--line)]" />
          <div className="w-4 h-4 rounded-full bg-[var(--line)]" />
          <div className="h-3 w-12 bg-[var(--line)]/60 rounded-xs" />
        </div>

        {/* 1px divider */}
        <div className="h-[1px] w-full bg-[var(--line)] my-0.5" />

        {/* Price & Rating */}
        <div className="flex items-center justify-between pt-0.5">
          <div className="h-4 w-16 bg-[var(--line)] rounded-xs" />
          <div className="h-3 w-10 bg-[var(--line)]/80 rounded-xs" />
        </div>
      </div>
    </div>
  );
};
