import React from 'react';

export const ProductCardSkeleton: React.FC = () => {
  return (
    <div 
      className="bg-white rounded-[10px] overflow-hidden border border-[#CFC3C6]/40 shadow-xs flex flex-col animate-pulse"
      style={{ borderRadius: '10px' }}
    >
      {/* 4/5 Aspect Ratio Image Skeleton */}
      <div 
        className="aspect-[4/5] w-full bg-neutral-200/70"
        style={{ aspectRatio: '4/5' }}
      />

      {/* Content Skeleton */}
      <div className="p-[14px_16px_16px] flex flex-col gap-[8px] bg-white">
        {/* Category kicker */}
        <div className="h-3 w-20 bg-neutral-200/80 rounded-xs" />

        {/* Product title */}
        <div className="h-4 w-4/5 bg-neutral-200 rounded-xs" />

        {/* Color swatches */}
        <div className="flex items-center gap-1.5 py-1">
          <div className="w-4 h-4 rounded-full bg-neutral-200" />
          <div className="w-4 h-4 rounded-full bg-neutral-200" />
          <div className="w-4 h-4 rounded-full bg-neutral-200" />
          <div className="h-3 w-12 bg-neutral-100 rounded-xs" />
        </div>

        {/* 1px divider */}
        <div className="h-[1px] w-full bg-[#EEE4E4] my-0.5" />

        {/* Price & Rating */}
        <div className="flex items-center justify-between pt-0.5">
          <div className="h-4 w-16 bg-neutral-200 rounded-xs" />
          <div className="h-3 w-10 bg-neutral-200/80 rounded-xs" />
        </div>
      </div>
    </div>
  );
};
