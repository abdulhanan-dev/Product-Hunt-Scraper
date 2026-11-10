import React from 'react';
import {
  LayoutDashboard,
  Package,
  Users,
  Clock3,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Zap,
  Server,
  Terminal,
  Activity,
  Flame,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'products', label: 'Products', icon: Package, countKey: 'products' },
  { id: 'persons', label: 'People', icon: Users, countKey: 'profiles' },
  { id: 'history', label: 'Scraping History', icon: Clock3, countKey: 'runs' },
];

export function Sidebar({
  page,
  onNavigate,
  stats,
  isCollapsed,
  onToggleCollapse,
  onOpenScraper,
  onOpenServer,
}) {
  const { theme, isDark, toggleTheme } = useTheme();

  const latestRun = stats?.latest_run;
  const targetDate = latestRun?.target_date;
  const isScraperSuccess = latestRun?.status === 'SUCCESS';

  return (
    <aside
      className={`relative shrink-0 flex flex-col h-screen sticky top-0 z-30 transition-all duration-300 ease-in-out border-r bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-slate-200/80 dark:border-zinc-800/80 ${
        isCollapsed ? 'w-[76px]' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center px-4 border-b border-slate-100 dark:border-zinc-800/80 justify-between">
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-3 group text-left overflow-hidden focus:outline-none"
        >
          {/* Logo Icon */}
          <div className="relative shrink-0 w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF6154] to-[#ff8f6b] flex items-center justify-center text-white shadow-ph group-hover:scale-105 transition-transform">
            <Flame size={19} className="fill-white" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>

          {!isCollapsed && (
            <div className="min-w-0 transition-opacity duration-200">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                  LaunchBase
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-orange-100 text-[#FF6154] dark:bg-orange-950/60 dark:text-orange-400">
                  v2.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-zinc-500 truncate font-medium">
                Product Hunt Scraper
              </p>
            </div>
          )}
        </button>

        {!isCollapsed && (
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-zinc-500 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/80 transition-colors"
            title="Collapse Sidebar"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        <div className="mb-2">
          {!isCollapsed && (
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1">
              Explorer
            </p>
          )}

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              page === item.id ||
              (page === 'product-detail' && item.id === 'products') ||
              (page === 'person-detail' && item.id === 'persons');
            const count = item.countKey && stats ? stats[item.countKey] : null;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-gradient-to-r from-orange-50 to-orange-100/60 text-[#FF6154] shadow-xs dark:from-orange-950/30 dark:to-orange-900/10 dark:text-[#ff786b] dark:border dark:border-orange-900/30 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/60'
                } ${isCollapsed ? 'justify-center' : ''}`}
              >
                <Icon
                  size={18}
                  className={`shrink-0 transition-transform duration-150 group-hover:scale-110 ${
                    isActive
                      ? 'text-[#FF6154] dark:text-[#ff786b]'
                      : 'text-slate-400 group-hover:text-slate-600 dark:text-zinc-500 dark:group-hover:text-zinc-300'
                  }`}
                />

                {!isCollapsed && (
                  <>
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    {count !== null && count !== undefined && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors ${
                          isActive
                            ? 'bg-[#FF6154] text-white shadow-xs'
                            : 'bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400 group-hover:bg-slate-200 dark:group-hover:bg-zinc-700'
                        }`}
                      >
                        {count.toLocaleString()}
                      </span>
                    )}
                  </>
                )}

                {/* Active Indicator Bar on left */}
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-[#FF6154]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Quick Tools / Modals */}
        <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/80">
          {!isCollapsed && (
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1">
              Automation & Server
            </p>
          )}

          {onOpenScraper && (
            <button
              onClick={onOpenScraper}
              title={isCollapsed ? 'Scraper Pipeline' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/60 transition ${
                isCollapsed ? 'justify-center' : ''
              }`}
            >
              <Terminal size={17} className="text-violet-500 shrink-0" />
              {!isCollapsed && <span className="flex-1 text-left truncate">Run Scraper</span>}
            </button>
          )}

          {onOpenServer && (
            <button
              onClick={onOpenServer}
              title={isCollapsed ? 'Contabo VPS Status' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/60 transition ${
                isCollapsed ? 'justify-center' : ''
              }`}
            >
              <Server size={17} className="text-emerald-500 shrink-0" />
              {!isCollapsed && <span className="flex-1 text-left truncate">Contabo VPS</span>}
            </button>
          )}
        </div>
      </nav>

      {/* Live Sync Status Widget */}
      {!isCollapsed && targetDate && (
        <div className="mx-3 mb-3 p-3 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200/70 dark:border-zinc-800/80">
          <div className="flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-zinc-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Sync Active
            </span>
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded-md">
              Pacific Date
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400">
            Latest Leaderboard:{' '}
            <span className="font-mono font-medium text-slate-700 dark:text-zinc-300">
              {targetDate}
            </span>
          </p>
        </div>
      )}

      {/* Footer & Controls */}
      <div className="p-3 border-t border-slate-100 dark:border-zinc-800/80 space-y-1">
        {/* Dark Mode Button */}
        <button
          onClick={toggleTheme}
          title={isCollapsed ? (isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode') : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/80 transition ${
            isCollapsed ? 'justify-center' : ''
          }`}
        >
          {isDark ? (
            <Sun size={17} className="text-amber-400 shrink-0 transition-transform duration-300 rotate-0 hover:rotate-90" />
          ) : (
            <Moon size={17} className="text-indigo-600 shrink-0 transition-transform duration-300 hover:-rotate-12" />
          )}
          {!isCollapsed && (
            <span className="flex-1 text-left truncate">
              {isDark ? 'Light Theme' : 'Dark Theme'}
            </span>
          )}
        </button>

        {/* Sidebar Toggle Button (when collapsed) */}
        {isCollapsed && (
          <button
            onClick={onToggleCollapse}
            title="Expand Sidebar"
            className="w-full flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-zinc-500 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/80 transition"
          >
            <ChevronRight size={17} />
          </button>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
