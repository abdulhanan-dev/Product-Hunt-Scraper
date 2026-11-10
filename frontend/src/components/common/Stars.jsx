import React from 'react';
import { Star } from 'lucide-react';

export function Stars({ rating = 0, max = 5, size = 13, showValue = false, className = '' }) {
  const roundedRating = Math.round((Number(rating) || 0) * 10) / 10;

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: max }).map((_, idx) => {
          const filled = idx + 1 <= Math.round(roundedRating);
          return (
            <Star
              key={idx}
              size={size}
              className={`transition-colors ${
                filled
                  ? 'text-amber-400 fill-amber-400 dark:text-amber-400 dark:fill-amber-400'
                  : 'text-slate-200 fill-slate-100 dark:text-zinc-700 dark:fill-zinc-800'
              }`}
            />
          );
        })}
      </div>
      {showValue && (
        <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300 ml-0.5">
          {roundedRating > 0 ? roundedRating.toFixed(1) : '—'}
        </span>
      )}
    </div>
  );
}

export default Stars;
