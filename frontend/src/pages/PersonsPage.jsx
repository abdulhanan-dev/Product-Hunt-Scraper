import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  X,
  Filter,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Flame,
  ArrowUp,
  Package,
} from 'lucide-react';
import { api } from '../services/api';
import Avatar from '../components/common/Avatar';
import Badge from '../components/common/Badge';
import { PersonCardSkeleton } from '../components/common/Skeleton';

export function PersonsPage({ onSelectPerson }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All'); // 'All' | 'Makers' | 'Commenters'
  const [displayCount, setDisplayCount] = useState(24);

  useEffect(() => {
    setLoading(true);
    api
      .getProfiles({ limit: 200, search })
      .then((data) => {
        setProfiles(data.profiles || []);
      })
      .catch((err) => {
        console.error('Failed to load profiles:', err);
        setProfiles([]);
      })
      .finally(() => setLoading(false));
  }, [search]);

  const filtered = useMemo(() => {
    let list = profiles;
    if (filter === 'Makers') {
      list = list.filter((p) => p.is_maker);
    } else if (filter === 'Commenters') {
      list = list.filter((p) => !p.is_maker);
    }
    return list;
  }, [profiles, filter]);

  const visibleProfiles = filtered.slice(0, displayCount);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Community & Makers Directory
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              {filtered.length} Indexed
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
            Discover founders, makers, hunters, and top community contributors from Product Hunt.
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {['All', 'Makers', 'Commenters'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filter === f
                  ? 'bg-[#FF6154] text-white shadow-ph'
                  : 'bg-slate-100 hover:bg-slate-200/70 text-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, handle, bio..."
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
      </div>

      {/* Profiles Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <PersonCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-slate-400 dark:text-zinc-500 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-8">
          <Users size={40} className="mx-auto mb-3 opacity-30 text-slate-400" />
          <h3 className="font-bold text-sm text-slate-700 dark:text-zinc-300">
            {search ? 'No people match your search' : 'No profiles found in database'}
          </h3>
          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
            Try adjusting your search criteria or filter tabs above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger">
          {visibleProfiles.map((person, idx) => {
            const name = person.name || person.username || 'Anonymous User';
            const username = person.username;
            const headline = person.headline || '';
            const isMaker = person.is_maker;
            const streak = person.streak || 0;
            const followers = person.followers_count || 0;

            return (
              <div
                key={person.username || idx}
                onClick={() => username && onSelectPerson(username)}
                className="group relative flex flex-col justify-between p-5 rounded-2xl border border-slate-200/80 hover:border-[#FF6154]/50 dark:border-zinc-800 dark:hover:border-[#FF6154]/60 bg-white dark:bg-zinc-900/80 card-hover cursor-pointer transition shadow-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={name}
                        src={person.avatar_url}
                        size={48}
                        isVerified={isMaker}
                      />
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-zinc-100 group-hover:text-[#FF6154] transition truncate">
                          {name}
                        </h3>
                        <p className="text-xs font-mono text-slate-400 dark:text-zinc-500 truncate">
                          @{username}
                        </p>
                      </div>
                    </div>

                    <Badge variant={isMaker ? 'indigo' : 'neutral'} size="sm">
                      {isMaker ? 'Maker' : 'Commenter'}
                    </Badge>
                  </div>

                  {headline ? (
                    <p className="text-xs text-slate-600 dark:text-zinc-300 line-clamp-2 leading-relaxed">
                      {headline}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 dark:text-zinc-500 italic">
                      Product Hunt community member
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs text-slate-400 dark:text-zinc-500">
                  <div className="flex items-center gap-3">
                    {followers > 0 && (
                      <span className="font-semibold text-slate-600 dark:text-zinc-300">
                        {followers.toLocaleString()} <span className="font-normal text-slate-400">followers</span>
                      </span>
                    )}
                    {streak > 0 && (
                      <span className="flex items-center gap-1 font-bold text-amber-500">
                        <Flame size={12} className="fill-amber-500" />
                        {streak}d
                      </span>
                    )}
                  </div>

                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:text-[#FF6154] flex items-center gap-0.5 transition">
                    Profile <ChevronRight size={13} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination / Load More */}
      {!loading && filtered.length > displayCount && (
        <div className="text-center pt-4">
          <button
            onClick={() => setDisplayCount((prev) => prev + 24)}
            className="px-6 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 transition shadow-xs"
          >
            Load More People ({filtered.length - displayCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
}

export default PersonsPage;
