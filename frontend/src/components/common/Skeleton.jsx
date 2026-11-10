import React from 'react';

export function Skeleton({ width = 'w-full', height = 'h-4', rounded = 'rounded-md', className = '' }) {
  return <div className={`skeleton ${width} ${height} ${rounded} ${className}`} />;
}

export function ProductRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b border-slate-100 dark:border-zinc-800/80">
      <Skeleton width="w-12" height="h-12" rounded="rounded-2xl" />
      <div className="flex-1 space-y-2">
        <Skeleton width="w-48" height="h-4" />
        <Skeleton width="w-3/4" height="h-3" />
        <div className="flex gap-2 pt-1">
          <Skeleton width="w-14" height="h-4" rounded="rounded-md" />
          <Skeleton width="w-16" height="h-4" rounded="rounded-md" />
        </div>
      </div>
      <Skeleton width="w-12" height="h-12" rounded="rounded-xl" />
    </div>
  );
}

export function PersonCardSkeleton() {
  return (
    <div className="p-4 rounded-2xl border border-slate-100 dark:border-zinc-800/80 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton width="w-12" height="h-12" rounded="rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton width="w-28" height="h-4" />
          <Skeleton width="w-20" height="h-3" />
        </div>
      </div>
      <Skeleton width="w-full" height="h-3" />
      <Skeleton width="w-2/3" height="h-3" />
    </div>
  );
}

export default Skeleton;
