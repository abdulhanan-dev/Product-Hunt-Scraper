import React, { useState } from 'react';
import {
  X, ExternalLink, ArrowUpRight, MessageCircle, Users, Sparkles,
  Layers, Star, Calendar, ShieldCheck, ChevronRight, Heart, Share2, Globe, Tag
} from 'lucide-react';

export default function ProductDetailModal({ product, onClose, onSelectPerson }) {
  const [activeTab, setActiveTab] = useState('Overview');
  const [liked, setLiked] = useState(false);

  if (!product) return null;

  const tabs = ['Overview', 'Discussion', 'Makers', 'Built With', 'Reviews'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div
        className="flex flex-col w-full max-w-4xl max-h-[92vh] rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-2xl overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Topbar */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/80">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span>Product Detail</span>
            <span>•</span>
            <span className="text-violet-600">ID: {product.sourceId || product.id}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLiked(!liked)}
              className={`rounded-xl p-2 transition ${
                liked ? 'bg-rose-50 text-rose-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
              }`}
              title="Bookmark product"
            >
              <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Product Hero Section */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
            <div className="flex items-start gap-4">
              <div
                className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${product.color} text-xl font-bold text-white shadow-md shadow-violet-500/15`}
              >
                {product.initials}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">{product.name}</h1>
                  <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700 border border-violet-100">
                    {product.category}
                  </span>
                  {product.rank && (
                    <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-100">
                      #{product.rank} Daily
                    </span>
                  )}
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                    Scraped
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium text-slate-500">{product.tagline}</p>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1 font-semibold text-slate-700">
                    <ArrowUpRight size={14} className="text-violet-600" />
                    {product.upvotes} Upvotes
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle size={14} className="text-slate-400" />
                    {product.comments} Comments
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={14} className="text-slate-400" />
                    {product.makers?.length || 0} Makers
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={14} className="text-slate-400" />
                    Launched {product.date}
                  </span>
                </div>
              </div>
            </div>

            {/* Outbound Action Buttons */}
            <div className="flex sm:flex-col items-center gap-2 shrink-0">
              {product.websiteUrl && (
                <a
                  href={product.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition"
                >
                  <Globe size={13} />
                  <span>Visit Website</span>
                  <ExternalLink size={12} className="opacity-70" />
                </a>
              )}
              {product.sourceUrl && (
                <a
                  href={product.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  <span>Product Hunt Post</span>
                  <ExternalLink size={12} className="text-slate-400" />
                </a>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-6 flex gap-6 overflow-x-auto border-b border-slate-100">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative whitespace-nowrap pb-3 text-xs font-semibold transition ${
                  activeTab === tab
                    ? 'text-violet-700'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-violet-600 animate-fade-in" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'Overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">About Product</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-700 whitespace-pre-line">
                  {product.description}
                </p>
              </div>

              {/* Topics / Tags */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Topics & Categories</h3>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {product.topics?.map((topic) => (
                    <span
                      key={topic}
                      className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700 transition"
                    >
                      <Tag size={12} className="text-slate-400" />
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              {/* Media Screenshots */}
              {product.media && product.media.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Media & Product Previews</h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {product.media.map((item, idx) => (
                      <div
                        key={idx}
                        className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-xs"
                      >
                        <img
                          src={item.url}
                          alt={item.title}
                          className="h-40 w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-transparent p-3 text-white">
                          <p className="text-xs font-semibold">{item.title}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scrape Metadata Box */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 text-xs text-slate-600">
                <div className="flex items-center gap-2 font-semibold text-slate-800 mb-2">
                  <ShieldCheck size={16} className="text-violet-600" />
                  <span>Scraper Collection Details</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Pricing Tier</span>
                    <p className="font-semibold text-slate-800">{product.pricing || 'Free / Paid'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Scrape Run Date</span>
                    <p className="font-semibold text-slate-800">{product.scrapeDate}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Product Slug</span>
                    <p className="font-semibold text-slate-800">{product.slug}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Collection Status</span>
                    <p className="font-semibold text-emerald-600">Enriched & Normalized</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DISCUSSION / COMMENTS */}
          {activeTab === 'Discussion' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">Discussion & Community Feedback</h3>
                  <p className="text-xs text-slate-500">Captured from Product Hunt public thread</p>
                </div>
                <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
                  {product.commentsList?.length || 0} Top Discussions
                </span>
              </div>

              <div className="space-y-3">
                {product.commentsList?.map((comment) => (
                  <div key={comment.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                          {comment.avatar}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900">{comment.author}</span>
                            <span className="text-xs text-slate-400">{comment.handle}</span>
                            <span
                              className={`rounded-md px-1.5 py-0.2 text-[10px] font-semibold ${
                                comment.role === 'Maker'
                                  ? 'bg-violet-100 text-violet-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {comment.role}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">{comment.time}</span>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-slate-500">▲ {comment.upvotes}</span>
                    </div>

                    <p className="mt-3 text-sm leading-relaxed text-slate-700 pl-10">
                      {comment.text}
                    </p>

                    {/* Nested Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="mt-3 ml-10 space-y-2 border-l-2 border-violet-100 pl-4 pt-1">
                        {comment.replies.map((reply) => (
                          <div key={reply.id} className="rounded-xl bg-slate-50 p-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">{reply.author}</span>
                              <span className="rounded bg-violet-100 px-1.5 py-0.2 text-[10px] font-bold text-violet-700">
                                {reply.role}
                              </span>
                              <span className="text-[10px] text-slate-400">{reply.time}</span>
                            </div>
                            <p className="mt-1 text-xs text-slate-700 leading-normal">{reply.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: MAKERS */}
          {activeTab === 'Makers' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-slate-900">Makers & Contributors</h3>
                <p className="text-xs text-slate-500">Click any maker to view their unified person profile</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {product.makers?.map((maker) => (
                  <button
                    key={maker.name}
                    onClick={() => {
                      onSelectPerson(maker);
                      onClose();
                    }}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xs hover:border-violet-300 hover:shadow-md transition group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 font-bold text-white shadow-xs">
                        {maker.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 group-hover:text-violet-700 transition">
                          {maker.name}
                        </p>
                        <p className="text-xs text-slate-400">{maker.handle}</p>
                        <p className="mt-0.5 text-xs font-medium text-slate-500">{maker.title || 'Product Maker'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold text-violet-600">
                      <span>Profile</span>
                      <ChevronRight size={14} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: BUILT WITH */}
          {activeTab === 'Built With' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-slate-900">Detected Tech Stack</h3>
                <p className="text-xs text-slate-500">Technologies and third-party tools discovered by scraper</p>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3">
                {product.builtWith?.map((tech) => (
                  <div
                    key={tech.name}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{tech.name}</p>
                      <p className="text-[11px] text-slate-400">{tech.category}</p>
                    </div>
                    <span className="rounded-lg bg-white px-2 py-0.5 text-[10px] font-bold text-violet-700 border border-slate-200/80">
                      Detected
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: REVIEWS */}
          {activeTab === 'Reviews' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-amber-50/60 border border-amber-200/60 p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500 text-white font-bold text-xl shadow-sm">
                    {product.reviews?.average || '4.9'}
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={16} fill="currentColor" />
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-amber-900 font-medium">
                      Based on {product.reviews?.total || 38} verified community reviews
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-amber-800 border border-amber-200">
                  98% Positive Sentiment
                </span>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Review Highlights</h3>
                <div className="space-y-2">
                  {product.reviews?.highlights?.map((hl, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>"{hl}"</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-6 py-3.5 text-xs text-slate-500">
          <span>Collected via Product Hunt Scraper engine</span>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
