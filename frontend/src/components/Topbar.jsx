import React from 'react';
import {
  Search,
  Moon,
  Sun,
  ChevronRight,
  Terminal,
  Server,
  Sparkles,
  Command,
  ArrowLeft,
  Share2,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export function Topbar({
  page,
  activeItem,
  onNavigate,
  onOpenCommandPalette,
  onOpenScraper,
  onOpenServer,
  searchQuery,
  onSearchChange,
}) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="h-16 px-6 border-b border-slate-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between gap-4 transition-colors">
      {/* Breadcrumbs / Page Title */}
      <div className="flex items-center gap-2 min-w-0">
        {page === 'product-detail' ? (
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => onNavigate('products')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100/80 hover:bg-slate-200/80 dark:text-zinc-400 dark:hover:text-zinc-100 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 transition"
            >
              <ArrowLeft size={13} />
              <span>Back to Products</span>
            </button>
            <ChevronRight size={13} className="text-slate-300 dark:text-zinc-600 shrink-0" />
            <span className="font-bold text-sm text-slate-900 dark:text-zinc-100 truncate">
              {activeItem?.name || 'Product Detail'}
            </span>
          </div>
        ) : page === 'person-detail' ? (
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => onNavigate('persons')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100/80 hover:bg-slate-200/80 dark:text-zinc-400 dark:hover:text-zinc-100 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 transition"
            >
              <ArrowLeft size={13} />
              <span>Back to People</span>
            </button>
            <ChevronRight size={13} className="text-slate-300 dark:text-zinc-600 shrink-0" />
            <span className="font-bold text-sm text-slate-900 dark:text-zinc-100 truncate">
              @{activeItem || 'profile'}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#FF6154]">
              LaunchBase
            </span>
            <ChevronRight size={12} className="text-slate-300 dark:text-zinc-600" />
            <span className="font-bold text-sm text-slate-900 dark:text-white capitalize">
              {page === 'dashboard'
                ? 'Overview & Metrics'
                : page === 'products'
                ? 'Products Directory'
                : page === 'persons'
                ? 'Community & Makers'
                : 'Scraping Runs'}
            </span>
          </div>
        )}
      </div>

      {/* Middle & Right Actions */}
      <div className="flex items-center gap-3">
        {/* Global Command / Search Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="group flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-400 dark:text-zinc-400 bg-slate-100/70 hover:bg-slate-100 border border-slate-200/80 rounded-xl w-60 sm:w-72 justify-between dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800/80 transition-all shadow-xs"
        >
          <div className="flex items-center gap-2 truncate">
            <Search size={14} className="text-slate-400 group-hover:text-[#FF6154] transition-colors" />
            <span className="truncate">Search products, makers...</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400">
            <Command size={10} />K
          </kbd>
        </button>

        {/* Scraper Terminal Button */}
        {onOpenScraper && (
          <button
            onClick={onOpenScraper}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-800 dark:hover:bg-zinc-800/80 transition shadow-xs"
            title="Launch Scraper Terminal"
          >
            <Terminal size={14} className="text-violet-500" />
            <span>Terminal</span>
          </button>
        )}

        {/* Server Modal Button */}
        {onOpenServer && (
          <button
            onClick={onOpenServer}
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-800 dark:hover:bg-zinc-800/80 transition shadow-xs"
            title="Contabo VPS Infrastructure"
          >
            <Server size={14} className="text-emerald-500" />
            <span>VPS Status</span>
          </button>
        )}

        {/* Dark Mode Button with Sun/Moon transition */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
          className="relative p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800/90 transition-all duration-200 shadow-xs active:scale-95"
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? (
            <Sun size={17} className="text-amber-400 animate-spin-once" />
          ) : (
            <Moon size={17} className="text-indigo-600" />
          )}
        </button>
      </div>
    </header>
  );
}

export default Topbar;
