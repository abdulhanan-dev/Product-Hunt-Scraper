import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Package,
  Users,
  Clock3,
  ArrowRight,
  X,
  Sparkles,
  Command,
  ArrowUp,
} from 'lucide-react';
import Logo from './common/Logo';
import Avatar from './common/Avatar';
import Badge from './common/Badge';

export default function CommandPalette({
  isOpen,
  onClose,
  products = [],
  people = [],
  onSelectProduct,
  onSelectPerson,
  onNavigate,
}) {
  const [query, setQuery] = useState('');

  // ESC key listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset query on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 4);
    return products
      .filter((p) => {
        const name = (p.name || '').toLowerCase();
        const tagline = (p.tagline || '').toLowerCase();
        const topics = (p.topics || []).map((t) => t.toLowerCase());
        return name.includes(q) || tagline.includes(q) || topics.some((t) => t.includes(q));
      })
      .slice(0, 5);
  }, [query, products]);

  const filteredPeople = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return people.slice(0, 3);
    return people
      .filter((p) => {
        const name = (p.name || '').toLowerCase();
        const username = (p.username || '').toLowerCase();
        const headline = (p.headline || '').toLowerCase();
        return name.includes(q) || username.includes(q) || headline.includes(q);
      })
      .slice(0, 4);
  }, [query, people]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-900/50 backdrop-blur-sm fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center border-b border-slate-100 dark:border-zinc-800 px-4 py-3.5">
          <Search size={18} className="text-[#FF6154] mr-3 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, people, categories, or jump to page..."
            className="w-full bg-transparent text-sm text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 outline-none font-medium"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 rounded"
            >
              <X size={15} />
            </button>
          )}
          <span className="ml-2 hidden rounded-lg bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-zinc-400 sm:inline-block border border-slate-200 dark:border-zinc-700">
            ESC
          </span>
        </div>

        {/* Results Container */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
          {/* Quick Navigation Commands */}
          {!query && (
            <div>
              <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                Quick Navigation
              </p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {[
                  { id: 'dashboard', label: 'Dashboard', icon: Sparkles },
                  { id: 'products', label: 'Products', icon: Package },
                  { id: 'persons', label: 'People', icon: Users },
                  { id: 'history', label: 'Scraping Runs', icon: Clock3 },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      onClose();
                    }}
                    className="flex items-center gap-2 rounded-xl p-2.5 text-left text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:bg-orange-50 hover:text-[#FF6154] dark:hover:bg-zinc-800 transition"
                  >
                    <item.icon size={15} className="text-[#FF6154]" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Products Section */}
          {filteredProducts.length > 0 && (
            <div>
              <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                Products
              </p>
              <div className="space-y-1">
                {filteredProducts.map((p, idx) => (
                  <button
                    key={p.post_id || p.product_slug || idx}
                    onClick={() => {
                      onSelectProduct(p);
                      onClose();
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Logo name={p.name} uuid={p.logo_uuid} size={34} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-zinc-100 group-hover:text-[#FF6154] transition truncate">
                            {p.name}
                          </span>
                          {p.rank && (
                            <Badge variant="ph" size="sm">
                              #{p.rank}
                            </Badge>
                          )}
                        </div>
                        <p className="truncate text-xs text-slate-400 dark:text-zinc-500">
                          {p.tagline}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-zinc-500 shrink-0 ml-3">
                      <span className="flex items-center gap-0.5 font-semibold text-slate-600 dark:text-zinc-300">
                        <ArrowUp size={11} className="text-[#FF6154]" /> {p.score ?? 0}
                      </span>
                      <ArrowRight
                        size={14}
                        className="opacity-0 group-hover:opacity-100 text-[#FF6154] group-hover:translate-x-0.5 transition"
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* People Section */}
          {filteredPeople.length > 0 && (
            <div>
              <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                People
              </p>
              <div className="space-y-1">
                {filteredPeople.map((person, idx) => (
                  <button
                    key={person.username || idx}
                    onClick={() => {
                      onSelectPerson(person.username);
                      onClose();
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        name={person.name || person.username}
                        src={person.avatar_url}
                        size={32}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-zinc-100 group-hover:text-[#FF6154] transition truncate">
                            {person.name || person.username}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400 dark:text-zinc-500">
                            @{person.username}
                          </span>
                        </div>
                        <p className="truncate text-xs text-slate-400 dark:text-zinc-500">
                          {person.headline || 'Community Member'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-3">
                      <Badge variant={person.is_maker ? 'indigo' : 'neutral'} size="sm">
                        {person.is_maker ? 'Maker' : 'Member'}
                      </Badge>
                      <ArrowRight
                        size={14}
                        className="opacity-0 group-hover:opacity-100 text-[#FF6154] group-hover:translate-x-0.5 transition"
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredProducts.length === 0 && filteredPeople.length === 0 && (
            <div className="py-12 text-center">
              <Package size={30} className="mx-auto text-slate-300 dark:text-zinc-600 mb-2" />
              <p className="text-sm font-bold text-slate-700 dark:text-zinc-300">
                No results found for "{query}"
              </p>
              <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
                Try searching by product name, category, or username.
              </p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950 px-4 py-2.5 text-[11px] text-slate-500 dark:text-zinc-400">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-1.5 py-0.5">
                ↵
              </kbd>{' '}
              to select
            </span>
            <span>
              <kbd className="rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-1.5 py-0.5">
                esc
              </kbd>{' '}
              to close
            </span>
          </div>
          <span className="text-[#FF6154] font-semibold">Product Hunt Scraper</span>
        </div>
      </div>
    </div>
  );
}
