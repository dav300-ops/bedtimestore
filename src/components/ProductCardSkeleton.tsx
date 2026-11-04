import React from 'react';

export const ProductCardSkeleton: React.FC = () => {
  return (
    <div 
      className="bg-[var(--color-card)] rounded-[10px] overflow-hidden border border-[var(--color-border)] shadow-xs flex flex-col animate-pulse"
      style={{ borderRadius: '10px' }}
    >
      {/* 4/5 Aspect Ratio Image Skeleton (white placeholder) */}
      <div 
        className="aspect-[4/5] w-full bg-white/70"
        style={{ aspectRatio: '4/5' }}
      />

      {/* Content Skeleton */}
      <div className="p-[14px_16px_16px] flex flex-col gap-[8px] bg-[var(--color-card)]">
        {/* Category kicker */}
        <div className="h-3 w-20 bg-[var(--color-border)] rounded-xs" />

        {/* Product title */}
        <div className="h-4 w-4/5 bg-[var(--color-border)] rounded-xs" />

        {/* Color swatches */}
        <div className="flex items-center gap-1.5 py-1">
          <div className="w-4 h-4 rounded-full bg-[var(--color-border)]" />
          <div className="w-4 h-4 rounded-full bg-[var(--color-border)]" />
          <div className="w-4 h-4 rounded-full bg-[var(--color-border)]" />
          <div className="h-3 w-12 bg-[var(--color-border)]/60 rounded-xs" />
        </div>

        {/* 1px divider */}
        <div className="h-[1px] w-full bg-[var(--color-border)] my-0.5" />

        {/* Price & Rating */}
        <div className="flex items-center justify-between pt-0.5">
          <div className="h-4 w-16 bg-[var(--color-border)] rounded-xs" />
          <div className="h-3 w-10 bg-[var(--color-border)]/80 rounded-xs" />
        </div>
      </div>
    </div>
  );
};
