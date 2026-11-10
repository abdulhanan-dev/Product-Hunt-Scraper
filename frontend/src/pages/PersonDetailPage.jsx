import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Share2,
  ExternalLink,
  Calendar,
  Package,
  MessageSquare,
  Users,
  Flame,
  Globe,
  CheckCircle2,
  ArrowUp,
  Check,
  ChevronRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import Logo from '../components/common/Logo';
import Avatar from '../components/common/Avatar';
import Badge from '../components/common/Badge';
import UpvoteButton from '../components/common/UpvoteButton';
import Skeleton from '../components/common/Skeleton';

function TwitterIcon({ size = 13, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={style}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function GithubIcon({ size = 13, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={style}>
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function LinkedinIcon({ size = 13, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={style}>
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9h2.77v8.37H6.46v-8.37M7.85 6.44a1.62 1.62 0 1 0 0 3.24 1.62 1.62 0 0 0 0-3.24z" />
    </svg>
  );
}

const SOCIAL_CONFIG = {
  twitter: { label: 'Twitter / X', color: '#1DA1F2', icon: TwitterIcon },
  github: { label: 'GitHub', color: '#24292e', icon: GithubIcon },
  linkedin: { label: 'LinkedIn', color: '#0A66C2', icon: LinkedinIcon },
  website: { label: 'Website', color: '#10B981', icon: Globe },
};

export function PersonDetailPage({ username, onBack, onSelectProduct }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('products');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    api
      .getProfile(username)
      .then((res) => {
        setData(res);
        if (res?.made_products?.length === 0 && res?.comments?.length > 0) {
          setActiveTab('comments');
        }
      })
      .catch((err) => {
        console.error('Failed to load profile:', err);
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [username]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const profile = data?.profile || {};
  const madeProducts = data?.made_products || [];
  const comments = data?.comments || [];

  const name = profile.name || username;
  const headline = profile.headline || '';
  const about = profile.about || '';
  const isMaker = profile.is_maker;
  const isVerified = profile.is_verified || profile.verified;
  const followers = profile.followers_count || 0;
  const following = profile.following_count || 0;
  const streak = profile.streak || 0;
  const socialLinks = profile.social_links || {};
  const phUrl = `https://www.producthunt.com/@${username}`;

  const joinedDate = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : null;

  const socialEntries = Object.entries(socialLinks).filter(([, v]) => Boolean(v));

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-7 fade-in">
      {/* Navigation Top Bar */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 transition shadow-xs"
        >
          <ArrowLeft size={14} />
          <span>Back to People</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 transition shadow-xs"
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Share2 size={14} />}
            <span>{copied ? 'Copied Profile Link!' : 'Share'}</span>
          </button>

          <a
            href={phUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#FF6154] hover:bg-[#eb5246] text-white shadow-ph transition"
          >
            <span className="font-extrabold text-[11px]">PH</span>
            <span>Product Hunt</span>
            <ExternalLink size={11} />
          </a>
        </div>
      </div>

      {/* Hero Profile Banner */}
      <div className="card p-6 md:p-8 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl shadow-sm relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-indigo-500/10 via-transparent to-transparent pointer-events-none rounded-full blur-2xl" />

        {loading ? (
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Skeleton width="w-20" height="h-20" rounded="rounded-full" />
            <div className="flex-1 space-y-2 text-center sm:text-left">
              <Skeleton width="w-48" height="h-6" />
              <Skeleton width="w-32" height="h-4" />
              <Skeleton width="w-3/4" height="h-4" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 relative z-10 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <Avatar
                name={name}
                src={profile.avatar_url}
                size={84}
                isVerified={isMaker}
                className="ring-4 ring-orange-100 dark:ring-zinc-800"
              />

              <div className="space-y-1.5">
                <div className="flex items-center justify-center md:justify-start gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    {name}
                  </h1>
                  {isMaker && (
                    <Badge variant="indigo" size="md">
                      ✓ Maker
                    </Badge>
                  )}
                  {isVerified && (
                    <Badge variant="emerald" size="md">
                      Verified
                    </Badge>
                  )}
                </div>

                <p className="text-xs font-mono text-slate-400 dark:text-zinc-500 font-semibold">
                  @{username}
                </p>

                {headline && (
                  <p className="text-sm text-slate-700 dark:text-zinc-300 max-w-xl leading-relaxed font-medium">
                    {headline}
                  </p>
                )}

                <div className="flex items-center justify-center md:justify-start gap-3 pt-2 text-xs text-slate-400 dark:text-zinc-500 flex-wrap">
                  {joinedDate && (
                    <span className="flex items-center gap-1">
                      <Calendar size={13} /> Joined {joinedDate}
                    </span>
                  )}
                  {streak > 0 && (
                    <span className="flex items-center gap-1 font-bold text-amber-500">
                      <Flame size={13} className="fill-amber-500" />
                      {streak} Day Streak
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Pill Bar */}
            <div className="flex items-center gap-2.5 p-2 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/70 dark:border-zinc-800 shrink-0">
              <div className="px-3 py-1.5 text-center">
                <p className="text-base font-extrabold text-slate-900 dark:text-white">
                  {followers.toLocaleString()}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  Followers
                </p>
              </div>

              <div className="w-px h-8 bg-slate-200 dark:bg-zinc-700" />

              <div className="px-3 py-1.5 text-center">
                <p className="text-base font-extrabold text-slate-900 dark:text-white">
                  {following.toLocaleString()}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  Following
                </p>
              </div>

              <div className="w-px h-8 bg-slate-200 dark:bg-zinc-700" />

              <div className="px-3 py-1.5 text-center">
                <p className="text-base font-extrabold text-[#FF6154]">
                  {madeProducts.length}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  Products
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Social Links Bar */}
        {socialEntries.length > 0 && (
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-center md:justify-start gap-2.5 flex-wrap">
            {socialEntries.map(([platform, url]) => {
              const cfg = SOCIAL_CONFIG[platform.toLowerCase()] || {
                label: platform,
                color: '#64748B',
                icon: Globe,
              };
              const Icon = cfg.icon;

              return (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition"
                >
                  <Icon size={13} style={{ color: cfg.color }} />
                  <span className="capitalize">{cfg.label}</span>
                  <ExternalLink size={10} className="text-slate-400" />
                </a>
              );
            })}
          </div>
        )}
      </div>

      {/* Profile Tabs Layout */}
      <div className="space-y-6">
        {/* Tab Buttons */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-100/80 dark:bg-zinc-900/80 border border-slate-200/80 dark:border-zinc-800 max-w-md">
          <button
            onClick={() => setActiveTab('products')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition ${
              activeTab === 'products'
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <Package size={14} className={activeTab === 'products' ? 'text-[#FF6154]' : ''} />
            <span>Made Products ({madeProducts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('comments')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition ${
              activeTab === 'comments'
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <MessageSquare size={14} className={activeTab === 'comments' ? 'text-sky-500' : ''} />
            <span>Comments ({comments.length})</span>
          </button>

          {about && (
            <button
              onClick={() => setActiveTab('about')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition ${
                activeTab === 'about'
                  ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <Users size={14} />
              <span>Bio</span>
            </button>
          )}
        </div>

        {/* Tab Contents */}
        <div className="card p-6 md:p-7 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl shadow-xs min-h-[320px]">
          {loading ? (
            <div className="space-y-4">
              <Skeleton height="h-20" rounded="rounded-2xl" />
              <Skeleton height="h-20" rounded="rounded-2xl" />
            </div>
          ) : (
            <>
              {/* 1. MADE PRODUCTS TAB */}
              {activeTab === 'products' && (
                <div className="space-y-4 fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Products Created or Hunted
                    </h3>
                    <span className="text-xs text-slate-400 dark:text-zinc-500">
                      Click any product to view full details
                    </span>
                  </div>

                  {madeProducts.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 dark:text-zinc-500">
                      <Package size={36} className="mx-auto mb-2 opacity-30" />
                      <p className="text-xs">No products made by this user in database.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {madeProducts.map((prod, idx) => {
                        const prodName = prod.name || 'Product';
                        const score = prod.score ?? 0;
                        const rank = prod.rank;

                        return (
                          <div
                            key={idx}
                            onClick={() => onSelectProduct(prod)}
                            className="group p-4 rounded-2xl border border-slate-200/70 hover:border-[#FF6154]/50 dark:border-zinc-800 dark:hover:border-[#FF6154]/60 bg-white dark:bg-zinc-900/60 card-hover cursor-pointer transition flex items-center justify-between gap-4"
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <Logo name={prodName} uuid={prod.logo_uuid} size={46} />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-sm text-slate-900 dark:text-zinc-100 group-hover:text-[#FF6154] transition truncate">
                                    {prodName}
                                  </h4>
                                  {rank && <Badge variant="ph" size="sm">#{rank}</Badge>}
                                </div>
                                <p className="text-xs text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                                  {prod.tagline || 'Product on Product Hunt'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <UpvoteButton count={score} size="sm" />
                              <ChevronRight size={16} className="text-slate-300 dark:text-zinc-600 group-hover:text-[#FF6154] group-hover:translate-x-0.5 transition" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* 2. COMMENTS AUTHORED TAB */}
              {activeTab === 'comments' && (
                <div className="space-y-4 fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Community Comments
                    </h3>
                    <span className="text-xs text-slate-400 dark:text-zinc-500">
                      Top comments sorted by upvotes
                    </span>
                  </div>

                  {comments.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 dark:text-zinc-500">
                      <MessageSquare size={36} className="mx-auto mb-2 opacity-30" />
                      <p className="text-xs">No comments logged for this profile.</p>
                    </div>
                  ) : (
                    <div className="space-y-3.5 divide-y divide-slate-100 dark:divide-zinc-800/60">
                      {comments.map((c, i) => {
                        const body = (c.body_html || '')
                          .replace(/<[^>]*>/g, ' ')
                          .replace(/\s+/g, ' ')
                          .trim();

                        return (
                          <div key={i} className="pt-3.5 first:pt-0 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              {c.post_slug && (
                                <Badge variant="ph" size="sm">
                                  {c.post_slug}
                                </Badge>
                              )}
                              {c.votes_count > 0 && (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-zinc-400">
                                  <ArrowUp size={11} className="text-[#FF6154]" />
                                  {c.votes_count} upvotes
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                              {body || '—'}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* 3. ABOUT TAB */}
              {activeTab === 'about' && (
                <div className="space-y-4 fade-in">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-zinc-800">
                    About {name}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                    {about}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default PersonDetailPage;
