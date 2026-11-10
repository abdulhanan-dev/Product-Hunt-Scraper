import React, { useMemo } from 'react';
import {
  Package,
  Users,
  MessageSquare,
  TrendingUp,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ArrowUpRight,
  Star,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';
import Logo from '../components/common/Logo';
import Badge from '../components/common/Badge';
import UpvoteButton from '../components/common/UpvoteButton';
import Skeleton from '../components/common/Skeleton';

const CATEGORY_COLORS = ['#FF6154', '#6366f1', '#10b981', '#f59e0b', '#0ea5e9'];

export function DashboardPage({
  stats,
  topProducts = [],
  loading = false,
  onNavigate,
  onSelectProduct,
}) {
  const s = stats || {};
  const run = s.latest_run || {};
  const runStats = run.stats || {};

  // Extract top categories from products
  const categories = useMemo(() => {
    const freq = {};
    (topProducts || []).forEach((p) => {
      (p.topics || []).forEach((t) => {
        freq[t] = (freq[t] || 0) + 1;
      });
    });
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const maxVal = sorted[0]?.[1] || 1;
    return sorted.map(([name, count]) => ({
      name,
      count,
      pct: Math.round((count / maxVal) * 100),
    }));
  }, [topProducts]);

  return (
    <div className="p-6 md:p-8 space-y-7 max-w-7xl mx-auto fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Data Intelligence Dashboard
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
              Live DB
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
            Aggregated insights, leaderboard rankings, and maker intelligence from Product Hunt.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate('products')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#FF6154] hover:bg-[#eb5246] text-white shadow-ph hover:shadow-ph-lg transition-all"
          >
            <span>Explore All Products</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger">
        {[
          {
            label: 'Total Products Scraped',
            val: s.products ?? '—',
            icon: Package,
            color: 'from-orange-500/10 to-orange-500/5 text-[#FF6154] border-orange-200/60 dark:border-orange-900/30',
            bgIcon: 'bg-orange-500/10 text-[#FF6154]',
          },
          {
            label: 'Makers & Commenters',
            val: s.profiles ?? '—',
            icon: Users,
            color: 'from-indigo-500/10 to-indigo-500/5 text-indigo-600 border-indigo-200/60 dark:border-indigo-900/30',
            bgIcon: 'bg-indigo-500/10 text-indigo-600',
          },
          {
            label: 'Discussion Comments',
            val: s.comments ?? '—',
            icon: MessageSquare,
            color: 'from-sky-500/10 to-sky-500/5 text-sky-600 border-sky-200/60 dark:border-sky-900/30',
            bgIcon: 'bg-sky-500/10 text-sky-600',
          },
          {
            label: 'Verified Daily Launches',
            val: s.launches ?? '—',
            icon: TrendingUp,
            color: 'from-emerald-500/10 to-emerald-500/5 text-emerald-600 border-emerald-200/60 dark:border-emerald-900/30',
            bgIcon: 'bg-emerald-500/10 text-emerald-600',
          },
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="card card-hover p-5 relative overflow-hidden bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl shadow-xs"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                  {card.label}
                </span>
                <div className={`p-2.5 rounded-xl ${card.bgIcon}`}>
                  <Icon size={18} />
                </div>
              </div>
              <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-100">
                {typeof card.val === 'number' ? card.val.toLocaleString() : card.val}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Synchronized from MongoDB</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Two Column Grid: Latest Run + Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest Scraping Run Card */}
        <div className="card p-6 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-zinc-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity size={18} className="text-[#FF6154]" />
                Latest Scraping Run
              </h2>
              {run.target_date && (
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Pacific Target Date:{' '}
                  <span className="font-mono font-semibold text-slate-800 dark:text-zinc-200">
                    {run.target_date}
                  </span>
                </p>
              )}
            </div>
            {run.status === 'SUCCESS' ? (
              <Badge variant="emerald" icon={CheckCircle2}>
                Success
              </Badge>
            ) : run.status ? (
              <Badge variant="rose" icon={XCircle}>
                {run.status}
              </Badge>
            ) : null}
          </div>

          <div className="space-y-3">
            {[
              {
                label: 'Products Upserted',
                value: runStats.launches_upserted ?? '—',
                note: 'Leaderboard daily launches',
              },
              {
                label: 'New Profiles Saved',
                value: runStats.new_profiles_saved ?? '—',
                note: 'Makers & hunters normalized',
              },
              {
                label: 'Comments Harvested',
                value: runStats.comments_saved ?? '—',
                note: 'Nested threads & upvote counts',
              },
              {
                label: 'Run Duration',
                value: runStats.duration_seconds
                  ? `${Math.floor(runStats.duration_seconds / 60)}m ${Math.round(
                      runStats.duration_seconds % 60
                    )}s`
                  : '—',
                note: 'Headless automation pipeline',
              },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800/60"
              >
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                    {row.label}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-zinc-500">{row.note}</p>
                </div>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white font-mono">
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 flex items-center justify-between">
            <button
              onClick={() => onNavigate('history')}
              className="text-xs font-semibold text-[#FF6154] hover:text-[#e04a3d] flex items-center gap-1 transition"
            >
              View Full Run Logs & History <ChevronRight size={13} />
            </button>
          </div>
        </div>

        {/* Top Product Categories Distribution */}
        <div className="card p-6 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-zinc-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers size={18} className="text-indigo-600 dark:text-indigo-400" />
                Trending Product Categories
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Distribution across scraped featured launches
              </p>
            </div>
            <span className="text-xs font-mono font-medium text-slate-400 dark:text-zinc-500">
              Top 5 Tags
            </span>
          </div>

          {categories.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-zinc-500">
              <Package size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-xs">No category tags indexed yet.</p>
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              {categories.map((cat, idx) => (
                <div key={cat.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-2 text-slate-800 dark:text-zinc-200">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                      />
                      {cat.name}
                    </span>
                    <span className="text-slate-500 dark:text-zinc-400 font-mono">
                      {cat.count} product{cat.count > 1 ? 's' : ''} ({cat.pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${cat.pct}%`,
                        backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top 3 Featured Products Showcase */}
      <div className="card overflow-hidden bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl shadow-xs">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles size={18} className="text-amber-500" />
              Leaderboard Spotlight
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Click any product to open its dedicated full page
            </p>
          </div>
          <button
            onClick={() => onNavigate('products')}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            <span>View All Products</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-zinc-800/80">
          {(topProducts || []).slice(0, 4).map((p, i) => {
            const name = p.name || 'Untitled Product';
            const tagline = p.tagline || '';
            const score = p.score ?? 0;
            const comments = p.comments_count ?? 0;
            const topics = (p.topics || []).slice(0, 3);
            const rank = p.rank || i + 1;

            return (
              <div
                key={p.post_id || p.product_slug || i}
                onClick={() => onSelectProduct(p)}
                className="group p-5 flex items-center gap-4 hover:bg-slate-50/80 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
              >
                {/* Rank Badge */}
                <span
                  className={`w-7 h-7 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 ${
                    rank == 1
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 ring-1 ring-amber-300'
                      : rank == 2
                      ? 'bg-slate-200 text-slate-800 dark:bg-zinc-800 dark:text-zinc-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  #{rank}
                </span>

                {/* Logo */}
                <Logo name={name} uuid={p.logo_uuid} size={46} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-zinc-100 group-hover:text-[#FF6154] transition-colors truncate">
                      {name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                    {tagline}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {topics.map((t) => (
                      <Badge key={t} variant="neutral" size="sm">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Stats & Actions */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400">
                    <MessageSquare size={13} />
                    <span>{comments}</span>
                  </div>
                  <UpvoteButton count={score} />
                  <ChevronRight
                    size={16}
                    className="text-slate-300 dark:text-zinc-600 group-hover:text-[#FF6154] group-hover:translate-x-0.5 transition"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
