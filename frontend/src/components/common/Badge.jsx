import React from 'react';

const VARIANTS = {
  ph: 'bg-orange-50 text-[#FF6154] border-orange-200/80 dark:bg-orange-950/40 dark:text-[#ff8276] dark:border-orange-800/50',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200/70 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/50',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50',
  amber: 'bg-amber-50 text-amber-700 border-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50',
  sky: 'bg-sky-50 text-sky-700 border-sky-200/70 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/50',
  rose: 'bg-rose-50 text-rose-700 border-rose-200/70 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50',
  neutral: 'bg-slate-100/90 text-slate-700 border-slate-200/80 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-700/60',
};

export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
  icon: Icon = null,
}) {
  const sizeClasses =
    size === 'sm'
      ? 'text-[10px] px-1.5 py-0.5 gap-1 font-medium'
      : size === 'lg'
      ? 'text-xs px-3 py-1 gap-1.5 font-semibold'
      : 'text-[11px] px-2 py-0.5 gap-1 font-medium';

  return (
    <span
      className={`inline-flex items-center rounded-lg border leading-none transition-colors ${VARIANTS[variant] || VARIANTS.neutral} ${sizeClasses} ${className}`}
    >
      {Icon && <Icon size={size === 'sm' ? 10 : 12} className="shrink-0" />}
      <span>{children}</span>
    </span>
  );
}

export default Badge;
