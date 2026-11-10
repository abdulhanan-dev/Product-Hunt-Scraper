import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Globe,
  ExternalLink,
  Share2,
  Calendar,
  MessageSquare,
  Users,
  Star,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  ArrowUp,
  Heart,
  Check,
  Tag,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../services/api';
import Logo from '../components/common/Logo';
import Avatar from '../components/common/Avatar';
import Badge from '../components/common/Badge';
import Stars from '../components/common/Stars';
import UpvoteButton from '../components/common/UpvoteButton';
import Skeleton from '../components/common/Skeleton';
import ErrorBoundary from '../components/common/ErrorBoundary';

function getTagText(item) {
  if (!item) return '';
  if (typeof item === 'string') return item;
  if (typeof item === 'object') {
    return item.name || item.text || item.tag || item.title || item.value || '';
  }
  return String(item);
}

function cleanHtmlText(htmlOrText = '') {
  if (typeof htmlOrText !== 'string') return '';
  return htmlOrText
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function CommentTreeItem({ comment, depth = 0, onSelectPerson }) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const replies = comment.replies || [];
  const hasReplies = replies.length > 0;
  const name = comment.author_name || comment.author_username || 'Anonymous';
  const username = comment.author_username;
  const cleanBody = (comment.body_html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return (
    <div className={`${depth > 0 ? 'border-l-2 border-slate-100 dark:border-zinc-800 pl-4 mt-3' : 'mt-4'}`}>
      <div className="flex items-start gap-3">
        <button
          onClick={() => username && onSelectPerson(username)}
          className="focus:outline-none shrink-0 group"
          title={`View @${username}'s page`}
        >
          <Avatar name={name} size={depth > 0 ? 28 : 34} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => username && onSelectPerson(username)}
              className="font-bold text-xs text-slate-900 dark:text-zinc-100 hover:text-[#FF6154] transition text-left"
            >
              {name}
            </button>
            {username && (
              <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono">
                @{username}
              </span>
            )}

            {comment.votes_count > 0 && (
              <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-800 px-2 py-0.5 rounded-md border border-slate-200/50 dark:border-zinc-700/50">
                <ArrowUp size={10} className="text-[#FF6154]" />
                {comment.votes_count}
              </span>
            )}
          </div>

          <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed mt-1.5 whitespace-pre-line">
            {cleanBody || '—'}
          </p>

          {hasReplies && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              <span>
                {isExpanded
                  ? 'Hide replies'
                  : `Show ${replies.length} repl${replies.length === 1 ? 'y' : 'ies'}`}
              </span>
            </button>
          )}
        </div>
      </div>

      {isExpanded && hasReplies && (
        <div className="space-y-2 mt-2">
          {replies.map((reply) => (
            <CommentTreeItem
              key={reply.comment_id}
              comment={reply}
              depth={depth + 1}
              onSelectPerson={onSelectPerson}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ProductDetailPage({ product, onBack, onSelectPerson }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  // Read initial tab from product prop or URL hash (e.g. #/product/slug/reviews)
  const getInitialTab = () => {
    if (product?.initialTab) return product.initialTab;
    const hash = window.location.hash.replace(/^#\/?/, '');
    if (hash.startsWith('product/')) {
      const parts = hash.slice('product/'.length).split('/');
      if (parts[1]) return parts[1];
    }
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [copied, setCopied] = useState(false);

  const slug = product?.product_slug || product?.post_slug || product?.slug;

  // Sync activeTab if product.initialTab changes via hash routing
  useEffect(() => {
    if (product?.initialTab && product.initialTab !== activeTab) {
      setActiveTab(product.initialTab);
    }
  }, [product?.initialTab]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (slug) {
      window.location.hash = `/product/${encodeURIComponent(slug)}/${tabId}`;
    }
  };

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    api
      .getProductDetail(slug)
      .then((data) => setDetail(data))
      .catch((err) => {
        console.error('Failed to load product detail:', err);
        setDetail(null);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const p = detail?.product || {};
  const launch = detail?.launch || product || {};
  const people = detail?.people || product?.makers || [];
  const builtWith = detail?.built_with || [];
  const comments = detail?.comments || [];
  const commentsTotal = detail?.comments_total ?? comments.length;
  const reviews = detail?.reviews || [];
  const reviewsTotal = detail?.reviews_total ?? reviews.length;
  const reviewsAvg = detail?.reviews_avg ?? 0;
  const reviewsDist = detail?.reviews_dist ?? {};

  const name = product?.name || p?.name || 'Product Detail';
  const tagline = product?.tagline || p?.tagline || '';
  const score = launch?.score ?? product?.score ?? 0;
  const topics = product?.topics || [];
  const rank = launch?.rank || product?.rank;
  const targetDate = launch?.target_date || product?.target_date;
  const primaryLink = p?.primary_link;
  const phUrl = `https://www.producthunt.com/posts/${product?.post_slug || slug}`;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Sparkles },
    { id: 'makers', label: `Makers (${people.length})`, icon: Users },
    { id: 'comments', label: `Discussion (${commentsTotal})`, icon: MessageSquare },
    { id: 'reviews', label: `Reviews (${reviewsTotal})`, icon: Star },
    ...(builtWith.length > 0 ? [{ id: 'stack', label: `Built With (${builtWith.length})`, icon: Layers }] : []),
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-7 fade-in">
      {/* Navigation Top Bar with Back Button & Share */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 transition shadow-xs"
        >
          <ArrowLeft size={14} />
          <span>Back to Products</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 transition shadow-xs"
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Share2 size={14} />}
            <span>{copied ? 'Link Copied!' : 'Share Page'}</span>
          </button>

          {primaryLink && (
            <a
              href={primaryLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#FF6154] hover:bg-[#eb5246] text-white shadow-ph transition"
            >
              <Globe size={13} />
              <span>Visit Website</span>
              <ExternalLink size={11} />
            </a>
          )}
        </div>
      </div>

      {/* Hero Product Banner Card */}
      <div className="card p-6 md:p-8 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl shadow-sm relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-orange-500/10 via-transparent to-transparent pointer-events-none rounded-full blur-2xl" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-5">
            <Logo name={name} uuid={product?.logo_uuid} size={76} rounded="rounded-3xl" />

            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {name}
                </h1>
                {rank && (
                  <Badge variant="ph" size="lg">
                    #{rank} Product of the Day
                  </Badge>
                )}
              </div>

              <p className="text-sm sm:text-base text-slate-600 dark:text-zinc-300 font-medium">
                {tagline}
              </p>

              <div className="flex items-center gap-2 pt-1 flex-wrap">
                {topics.map((t) => (
                  <Badge key={t} variant="indigo" size="sm">
                    {t}
                  </Badge>
                ))}

                {targetDate && (
                  <span className="text-xs text-slate-400 dark:text-zinc-500 flex items-center gap-1 ml-1 font-medium">
                    <Calendar size={12} />
                    Launched {targetDate}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Large Hero Upvote Button */}
          <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
            <UpvoteButton count={score} size="lg" />
          </div>
        </div>
      </div>

      {/* Content Layout: Main Tabs + Right Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
        {/* Main Column (2 spans) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs Navigation */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-100/80 dark:bg-zinc-900/80 border border-slate-200/80 dark:border-zinc-800">
            {tabs.map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => handleTabChange(t.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-[#FF6154]' : ''} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content Cards */}
          <div className="card p-6 md:p-7 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl shadow-xs min-h-[380px]">
            {loading ? (
              <div className="space-y-4">
                <Skeleton height="h-32" rounded="rounded-2xl" />
                <Skeleton width="w-3/4" height="h-5" />
                <Skeleton height="h-4" />
                <Skeleton height="h-4" />
              </div>
            ) : (
              <ErrorBoundary key={activeTab}>
                {/* 1. OVERVIEW TAB */}
                {activeTab === 'overview' && (
                  <div className="space-y-6 fade-in">
                    {/* Media Hero preview */}
                    <div className="w-full h-48 rounded-2xl bg-gradient-to-tr from-slate-900 via-zinc-800 to-slate-950 flex flex-col items-center justify-center text-center p-6 relative overflow-hidden shadow-inner">
                      <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-3">
                        <Logo name={name} uuid={product?.logo_uuid} size={48} />
                      </div>
                      <h3 className="text-lg font-extrabold text-white">{name}</h3>
                      <p className="text-xs text-white/70 max-w-md mt-1">{tagline}</p>
                    </div>

                    {/* Description */}
                    <div>
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2.5">
                        About this launch
                      </h4>
                      <p className="text-sm text-slate-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                        {p?.description ||
                          `${name} is featured on the Product Hunt daily leaderboard. Explore user reviews, community discussions, and makers below.`}
                      </p>
                    </div>

                    {/* Key Bullets extracted */}
                    {p?.description && (
                      <div className="space-y-2 pt-2">
                        {p.description
                          .split('. ')
                          .filter((s) => s.length > 25)
                          .slice(0, 4)
                          .map((sentence, idx) => (
                            <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-zinc-300">
                              <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                              <span>{sentence.replace(/\.$/, '')}.</span>
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Official Product Links */}
                    <div className="pt-4 border-t border-slate-100 dark:border-zinc-800">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-3">
                        Direct Links
                      </h4>
                      <div className="flex flex-wrap gap-2.5">
                        {primaryLink && (
                          <a
                            href={primaryLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 text-slate-800 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 transition"
                          >
                            <Globe size={13} className="text-slate-500" />
                            <span>Official Website</span>
                            <ExternalLink size={11} className="text-slate-400" />
                          </a>
                        )}

                        <a
                          href={phUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-orange-50 hover:bg-orange-100 text-[#FF6154] dark:bg-orange-950/40 dark:text-orange-400 dark:hover:bg-orange-950/60 transition"
                        >
                          <span className="font-extrabold text-[11px]">PH</span>
                          <span>Product Hunt Page</span>
                          <ExternalLink size={11} />
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. MAKERS TAB */}
                {activeTab === 'makers' && (
                  <div className="space-y-4 fade-in">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        Product Makers & Team
                      </h3>
                      <span className="text-xs text-slate-400 dark:text-zinc-500">
                        {people.length} contributor{people.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {people.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 dark:text-zinc-500">
                        <Users size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="text-xs">No makers indexed for this product.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {people.map((person, idx) => {
                          const n = person.name || person.username || 'Anonymous Maker';
                          const username = person.username;

                          return (
                            <div
                              key={idx}
                              onClick={() => username && onSelectPerson(username)}
                              className="group p-4 rounded-2xl border border-slate-200/70 hover:border-[#FF6154]/50 dark:border-zinc-800 dark:hover:border-[#FF6154]/60 bg-white dark:bg-zinc-900/60 card-hover cursor-pointer transition flex items-start gap-3.5"
                            >
                              <Avatar name={n} src={person.avatar_url} size={44} isVerified={person.role === 'maker'} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h4 className="font-bold text-xs text-slate-900 dark:text-zinc-100 group-hover:text-[#FF6154] transition truncate">
                                    {n}
                                  </h4>
                                </div>
                                {username && (
                                  <p className="text-[11px] font-mono text-slate-400 dark:text-zinc-500">
                                    @{username}
                                  </p>
                                )}
                                {person.headline && (
                                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 line-clamp-2">
                                    {person.headline}
                                  </p>
                                )}
                                <div className="mt-2.5 flex items-center justify-between">
                                  <Badge variant={person.role === 'maker' ? 'indigo' : 'neutral'} size="sm">
                                    {person.role || 'Contributor'}
                                  </Badge>
                                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 group-hover:underline">
                                    View profile →
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. DISCUSSION TAB */}
                {activeTab === 'comments' && (
                  <div className="space-y-4 fade-in">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                          Community Discussion
                        </h3>
                        <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
                          Sorted by votes & nested replies
                        </p>
                      </div>
                      <Badge variant="sky">{commentsTotal} Comments</Badge>
                    </div>

                    {comments.length === 0 ? (
                      <div className="py-16 text-center text-slate-400 dark:text-zinc-500">
                        <MessageSquare size={36} className="mx-auto mb-2 opacity-30" />
                        <p className="text-xs">No discussion comments captured.</p>
                      </div>
                    ) : (
                      <div className="space-y-4 divide-y divide-slate-100 dark:divide-zinc-800/60">
                        {comments.map((c) => (
                          <div key={c.comment_id} className="pt-3 first:pt-0">
                            <CommentTreeItem comment={c} onSelectPerson={onSelectPerson} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. REVIEWS TAB */}
                {activeTab === 'reviews' && (
                  <div className="space-y-6 fade-in">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        User Reviews & Sentiment
                      </h3>
                      <Badge variant="amber">{reviewsTotal} Reviews</Badge>
                    </div>

                    {reviews.length === 0 ? (
                      <div className="py-16 text-center text-slate-400 dark:text-zinc-500">
                        <Star size={36} className="mx-auto mb-2 opacity-30" />
                        <p className="text-xs">No user reviews logged for this product.</p>
                      </div>
                    ) : (
                      <>
                        {/* Rating Summary Card */}
                        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/80 dark:border-zinc-800 flex flex-col sm:flex-row items-center gap-6">
                          <div className="text-center sm:text-left shrink-0">
                            <p className="text-4xl font-extrabold text-slate-900 dark:text-white">
                              {reviewsAvg}
                            </p>
                            <div className="mt-1">
                              <Stars rating={reviewsAvg} size={16} />
                            </div>
                            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
                              Based on {reviewsTotal} review{reviewsTotal !== 1 ? 's' : ''}
                            </p>
                          </div>

                          {/* Star distribution */}
                          <div className="flex-1 w-full space-y-1.5">
                            {[5, 4, 3, 2, 1].map((num) => {
                              const count = Number(reviewsDist[num] ?? reviewsDist[String(num)] ?? 0);
                              const pct = reviewsTotal > 0 ? Math.round((count / reviewsTotal) * 100) : 0;
                              return (
                                <div key={num} className="flex items-center gap-2 text-xs">
                                  <span className="w-4 text-right font-bold text-slate-500 dark:text-zinc-400">
                                    {num}
                                  </span>
                                  <Star size={11} className="text-amber-400 fill-amber-400" />
                                  <div className="flex-1 h-2 bg-slate-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-amber-400 rounded-full transition-all duration-500"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <span className="w-7 text-right font-mono text-slate-400 dark:text-zinc-500">
                                    {count}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Individual Review Items */}
                        <div className="space-y-4">
                          {reviews.map((rev, idx) => {
                            const author = typeof rev.author_name === 'string' && rev.author_name
                              ? rev.author_name
                              : typeof rev.author_username === 'string' && rev.author_username
                              ? rev.author_username
                              : 'Product User';
                            const authorUsername = typeof rev.author_username === 'string' ? rev.author_username : '';
                            const feedback = cleanHtmlText(rev.feedback || '');
                            const pros = Array.isArray(rev.pros) ? rev.pros.filter(Boolean) : [];
                            const cons = Array.isArray(rev.cons) ? rev.cons.filter(Boolean) : [];
                            const alts = Array.isArray(rev.alternative_products) ? rev.alternative_products.filter(Boolean) : [];

                            return (
                              <div
                                key={rev.review_id || idx}
                                className="p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2.5"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2.5">
                                    <button
                                      type="button"
                                      onClick={() => authorUsername && onSelectPerson && onSelectPerson(authorUsername)}
                                      className="focus:outline-none shrink-0 group text-left"
                                      title={authorUsername ? `View @${authorUsername}` : author}
                                    >
                                      <Avatar name={author} size={30} />
                                    </button>
                                    <div>
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <button
                                          type="button"
                                          onClick={() => authorUsername && onSelectPerson && onSelectPerson(authorUsername)}
                                          className={`font-bold text-xs text-slate-900 dark:text-zinc-100 ${
                                            authorUsername ? 'hover:text-[#FF6154] cursor-pointer' : ''
                                          } transition text-left`}
                                        >
                                          {author}
                                        </button>
                                        {authorUsername && (
                                          <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
                                            @{authorUsername}
                                          </span>
                                        )}
                                      </div>
                                      <div className="mt-0.5">
                                        <Stars rating={rev.rating || 5} size={11} />
                                      </div>
                                    </div>
                                  </div>
                                  {rev.votes_count > 0 && (
                                    <span className="text-xs font-semibold text-slate-400 dark:text-zinc-500 flex items-center gap-1">
                                      <ArrowUp size={11} className="text-[#FF6154]" />
                                      {rev.votes_count}
                                    </span>
                                  )}
                                </div>

                                {feedback && (
                                  <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                                    {feedback}
                                  </p>
                                )}

                                {(pros.length > 0 || cons.length > 0) && (
                                  <div className="flex gap-4 pt-1 flex-wrap">
                                    {pros.length > 0 && (
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                                          Pros:
                                        </span>
                                        {pros.map((p, i) => {
                                          const tagText = getTagText(p);
                                          if (!tagText) return null;
                                          return (
                                            <Badge key={i} variant="emerald" size="sm">
                                              {tagText}
                                            </Badge>
                                          );
                                        })}
                                      </div>
                                    )}

                                    {cons.length > 0 && (
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">
                                          Cons:
                                        </span>
                                        {cons.map((c, i) => {
                                          const tagText = getTagText(c);
                                          if (!tagText) return null;
                                          return (
                                            <Badge key={i} variant="rose" size="sm">
                                              {tagText}
                                            </Badge>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {alts.length > 0 && (
                                  <div className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-500 dark:text-zinc-400 flex-wrap">
                                    <span className="font-semibold text-slate-400 dark:text-zinc-500">
                                      Alternatives:
                                    </span>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {alts.map((alt, altIdx) => {
                                        const altName = typeof alt === 'object' ? alt.name || alt.slug : String(alt);
                                        if (!altName) return null;
                                        return (
                                          <span
                                            key={altIdx}
                                            className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300"
                                          >
                                            {altName}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* 5. BUILT WITH TAB */}
                {activeTab === 'stack' && (
                  <div className="space-y-4 fade-in">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-zinc-800">
                      Tools & Stack Used
                    </h3>
                    <div className="flex flex-wrap gap-2.5">
                      {builtWith.map((item, idx) => (
                        <div
                          key={idx}
                          className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 text-xs font-semibold border border-slate-200/80 dark:border-zinc-700"
                        >
                          {item.related_product_name || 'Tool'}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </ErrorBoundary>
            )}
          </div>
        </div>

        {/* Right Sidebar Column (1 span) */}
        <div className="space-y-6">
          {/* Launch Performance Card */}
          <div className="card p-6 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles size={16} className="text-[#FF6154]" />
              Launch Performance
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-orange-50/70 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/30">
                <span className="text-[11px] font-semibold text-orange-700 dark:text-orange-400">
                  Upvotes
                </span>
                <p className="text-xl font-extrabold text-[#FF6154] mt-0.5">{score}</p>
              </div>

              <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/30">
                <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400">
                  Daily Rank
                </span>
                <p className="text-xl font-extrabold text-indigo-600 dark:text-indigo-300 mt-0.5">
                  #{rank || '—'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/30">
                <span className="text-[11px] font-semibold text-sky-700 dark:text-sky-400">
                  Comments
                </span>
                <p className="text-xl font-extrabold text-sky-600 dark:text-sky-300 mt-0.5">
                  {commentsTotal}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/30">
                <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                  Reviews Avg
                </span>
                <p className="text-xl font-extrabold text-amber-500 mt-0.5">
                  {reviewsAvg > 0 ? `${reviewsAvg} ★` : '—'}
                </p>
              </div>
            </div>

            {targetDate && (
              <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
                <span className="flex items-center gap-1">
                  <Clock size={12} /> Target Date
                </span>
                <span className="font-mono font-semibold text-slate-800 dark:text-zinc-200">
                  {targetDate}
                </span>
              </div>
            )}
          </div>

          {/* Quick Team Card */}
          {people.length > 0 && (
            <div className="card p-5 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl shadow-xs space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                Makers
              </h3>
              <div className="space-y-2">
                {people.map((m, i) => (
                  <button
                    key={i}
                    onClick={() => m.username && onSelectPerson(m.username)}
                    className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800 text-left transition group"
                  >
                    <Avatar name={m.name || m.username} src={m.avatar_url} size={32} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-zinc-200 group-hover:text-[#FF6154] truncate">
                        {m.name || m.username}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-zinc-500 truncate font-mono">
                        @{m.username}
                      </p>
                    </div>
                    <Badge variant="indigo" size="sm">
                      {m.role || 'Maker'}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Metadata & Verification */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900/50 border border-slate-200/70 dark:border-zinc-800 text-xs text-slate-500 dark:text-zinc-400 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-zinc-200">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>MongoDB Verified Record</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Extracted via GraphQL hash pipeline with complete author normalization and nested comments.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetailPage;
