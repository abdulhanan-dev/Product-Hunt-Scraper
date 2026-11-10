import React, { useState } from 'react';
import { ChevronUp } from 'lucide-react';

export function UpvoteButton({
  count = 0,
  size = 'md',
  onClick,
  interactive = true,
  className = '',
}) {
  const [upvoted, setUpvoted] = useState(false);
  const [currentCount, setCurrentCount] = useState(Number(count) || 0);

  const handleClick = (e) => {
    e.stopPropagation();
    if (!interactive) return;

    if (upvoted) {
      setUpvoted(false);
      setCurrentCount((prev) => Math.max(0, prev - 1));
    } else {
      setUpvoted(true);
      setCurrentCount((prev) => prev + 1);
    }

    if (onClick) onClick(!upvoted);
  };

  if (size === 'lg') {
    return (
      <button
        onClick={handleClick}
        className={`group flex flex-col items-center justify-center min-w-[72px] px-3.5 py-3 rounded-2xl border transition-all duration-200 active:scale-95 shadow-sm ${
          upvoted
            ? 'bg-[#FF6154] border-[#FF6154] text-white shadow-ph'
            : 'bg-white border-slate-200 hover:border-[#FF6154]/50 hover:bg-orange-50/40 text-slate-800 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:border-[#FF6154]/60 dark:hover:bg-zinc-800/80 dark:text-zinc-100'
        } ${className}`}
      >
        <ChevronUp
          size={18}
          strokeWidth={3}
          className={`transition-transform duration-200 group-hover:-translate-y-0.5 ${
            upvoted ? 'text-white' : 'text-[#FF6154]'
          }`}
        />
        <span className="text-base font-extrabold tracking-tight mt-0.5">
          {currentCount.toLocaleString()}
        </span>
        <span
          className={`text-[10px] font-semibold uppercase tracking-wider ${
            upvoted ? 'text-white/80' : 'text-slate-400 dark:text-zinc-500'
          }`}
        >
          Upvotes
        </span>
      </button>
    );
  }

  if (size === 'sm') {
    return (
      <button
        onClick={handleClick}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-semibold transition-all active:scale-95 ${
          upvoted
            ? 'bg-[#FF6154] border-[#FF6154] text-white shadow-sm'
            : 'bg-white border-slate-200 text-slate-700 hover:border-[#FF6154]/40 hover:bg-orange-50/30 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-[#FF6154]/50'
        } ${className}`}
      >
        <ChevronUp size={12} strokeWidth={3} className={upvoted ? 'text-white' : 'text-[#FF6154]'} />
        <span>{currentCount}</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`group flex flex-col items-center justify-center min-w-[50px] px-2.5 py-1.5 rounded-xl border transition-all duration-200 active:scale-95 shadow-xs ${
        upvoted
          ? 'bg-[#FF6154] border-[#FF6154] text-white shadow-ph'
          : 'bg-white border-slate-200 hover:border-[#FF6154]/40 hover:bg-orange-50/30 text-slate-800 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:border-[#FF6154]/50 dark:hover:bg-zinc-800 dark:text-zinc-100'
      } ${className}`}
    >
      <ChevronUp
        size={14}
        strokeWidth={3}
        className={`transition-transform duration-200 group-hover:-translate-y-0.5 ${
          upvoted ? 'text-white' : 'text-[#FF6154]'
        }`}
      />
      <span className="text-xs font-bold mt-0.5">{currentCount}</span>
    </button>
  );
}

export default UpvoteButton;
