import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  X,
  Filter,
  Package,
  ArrowUpDown,
  LayoutGrid,
  List,
  Calendar,
  MessageSquare,
  Sparkles,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { api } from '../services/api';
import Logo from '../components/common/Logo';
import Avatar from '../components/common/Avatar';
import Badge from '../components/common/Badge';
import UpvoteButton from '../components/common/UpvoteButton';
import { ProductRowSkeleton } from '../components/common/Skeleton';

export function ProductsPage({ dates = [], onSelectProduct }) {
  const [activeDate, setActiveDate] = useState(dates[0] || '');
  const [sort, setSort] = useState('rank');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'

  // Update active date if dates list changes
  useEffect(() => {
    if (dates.length > 0 && !activeDate) {
      setActiveDate(dates[0]);
    }
  }, [dates, activeDate]);

  useEffect(() => {
    if (!activeDate) return;
    setLoading(true);
    api
      .getProducts({ date: activeDate, sort, limit: 100 })
      .then((data) => setProducts(data.products || []))
      .catch((err) => {
        console.error('Failed to load products:', err);
        setProducts([]);
      })
      .finally(() => setLoading(false));
  }, [activeDate, sort]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return products;
    return products.filter((p) => {
      const name = (p.name || '').toLowerCase();
      const tagline = (p.tagline || '').toLowerCase();
      const topics = (p.topics || []).map((t) => t.toLowerCase());
      return name.includes(q) || tagline.includes(q) || topics.some((t) => t.includes(q));
    });
  }, [products, search]);

  const formatDateLabel = (d) => {
    if (!d) return 'Select Date';
    try {
      const dt = new Date(`${d}T12:00:00`);
      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return d;
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Products Explorer
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-[#FF6154] dark:bg-orange-950/60 dark:text-orange-400">
              {filtered.length} Indexed
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
            Browse daily leaderboard winners, upvote stats, community comments, and makers.
          </p>
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs">
        {/* Date Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <div className="flex items-center gap-1 text-xs font-semibold text-slate-400 dark:text-zinc-500 mr-2 shrink-0">
            <Calendar size={13} />
            <span>Target:</span>
          </div>

          {dates.map((d) => (
            <button
              key={d}
              onClick={() => setActiveDate(d)}
              className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeDate === d
                  ? 'bg-[#FF6154] text-white shadow-ph'
                  : 'bg-slate-100 hover:bg-slate-200/70 text-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300'
              }`}
            >
              {formatDateLabel(d)}
            </button>
          ))}

          {dates.length === 0 && (
            <span className="text-xs text-slate-400 dark:text-zinc-500 italic">
              No dates recorded yet
            </span>
          )}
        </div>

        {/* Search, Sort & View Mode */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-60">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by name, topic..."
              className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#FF6154]/20 focus:border-[#FF6154] transition"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 focus:outline-none focus:border-[#FF6154]"
            >
              <option value="rank">Sort: Daily Rank</option>
              <option value="score">Sort: Most Upvotes</option>
              <option value="comments">Sort: Most Comments</option>
            </select>
          </div>

          {/* View Toggle */}
          <div className="flex items-center rounded-xl border border-slate-200 dark:border-zinc-800 p-0.5 bg-slate-100/80 dark:bg-zinc-800/80">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-400 dark:text-zinc-500 hover:text-slate-700'
              }`}
              title="List View"
            >
              <List size={14} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-400 dark:text-zinc-500 hover:text-slate-700'
              }`}
              title="Grid View"
            >
              <LayoutGrid size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Products Content */}
      <div className="card overflow-hidden bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl shadow-xs">
        {loading ? (
          <div className="divide-y divide-slate-100 dark:divide-zinc-800/80">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProductRowSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-slate-400 dark:text-zinc-500">
            <Package size={40} className="mx-auto mb-3 opacity-30 text-slate-400" />
            <h3 className="font-bold text-sm text-slate-700 dark:text-zinc-300">
              {search ? 'No products match your search' : 'No launches scraped for this date'}
            </h3>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
              Try adjusting your search terms or selecting another date above.
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View Mode */
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 stagger">
            {filtered.map((item, i) => {
              const name = item.name || 'Untitled';
              const tagline = item.tagline || '';
              const score = item.score ?? 0;
              const comments = item.comments_count ?? 0;
              const topics = (item.topics || []).slice(0, 2);
              const rank = item.rank || i + 1;
              const makers = item.makers || [];

              return (
                <div
                  key={item.post_id || item.product_slug || i}
                  onClick={() => onSelectProduct(item)}
                  className="group relative flex flex-col justify-between p-5 rounded-2xl border border-slate-200/70 hover:border-[#FF6154]/50 dark:border-zinc-800 dark:hover:border-[#FF6154]/60 bg-white dark:bg-zinc-900/80 card-hover cursor-pointer"
                >
                  <div>
                    {/* Top row with rank and upvotes */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-lg bg-orange-50 text-[#FF6154] dark:bg-orange-950/60 dark:text-orange-400 text-xs font-extrabold border border-orange-200/50 dark:border-orange-900/40">
                          #{rank}
                        </span>
                        <Logo name={name} uuid={item.logo_uuid} size={42} />
                      </div>
                      <UpvoteButton count={score} size="sm" />
                    </div>

                    <h3 className="font-bold text-sm text-slate-900 dark:text-zinc-100 group-hover:text-[#FF6154] transition-colors line-clamp-1">
                      {name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                      {tagline}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs text-slate-400 dark:text-zinc-500">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {topics.map((t) => (
                        <Badge key={t} variant="neutral" size="sm">
                          {t}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center gap-1 font-medium">
                      <MessageSquare size={12} />
                      <span>{comments}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List View Mode */
          <div className="divide-y divide-slate-100 dark:divide-zinc-800/80 stagger">
            {filtered.map((item, i) => {
              const name = item.name || 'Untitled';
              const tagline = item.tagline || '';
              const score = item.score ?? 0;
              const comments = item.comments_count ?? 0;
              const topics = (item.topics || []).slice(0, 3);
              const rank = item.rank || i + 1;
              const makers = item.makers || [];

              return (
                <div
                  key={item.post_id || item.product_slug || i}
                  onClick={() => onSelectProduct(item)}
                  className="group flex items-center gap-4 px-6 py-4 hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors"
                >
                  {/* Rank */}
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
                  <Logo name={name} uuid={item.logo_uuid} size={46} />

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-zinc-100 group-hover:text-[#FF6154] transition-colors truncate">
                        {name}
                      </h3>
                      {rank === 1 && (
                        <Badge variant="ph" size="sm">
                          #1 Product of the Day
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 truncate">
                      {tagline}
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {topics.map((t) => (
                        <Badge key={t} variant="neutral" size="sm">
                          {t}
                        </Badge>
                      ))}

                      {makers.length > 0 && (
                        <span className="text-[11px] text-slate-400 dark:text-zinc-500 flex items-center gap-1 ml-1">
                          by {makers.map((m) => m.name || m.username).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Upvotes & Comments */}
                  <div className="flex items-center gap-5 shrink-0">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-zinc-500">
                      <MessageSquare size={13} />
                      <span className="font-medium text-slate-600 dark:text-zinc-300">
                        {comments}
                      </span>
                    </div>

                    <UpvoteButton count={score} />

                    <ChevronRight
                      size={18}
                      className="text-slate-300 dark:text-zinc-600 group-hover:text-[#FF6154] group-hover:translate-x-0.5 transition"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductsPage;
