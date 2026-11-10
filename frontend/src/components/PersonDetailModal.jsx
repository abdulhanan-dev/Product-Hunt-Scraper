import React from 'react';
import { X, ExternalLink, Package, MessageCircle, Calendar, ShieldCheck, ChevronRight, UserCheck } from 'lucide-react';

export default function PersonDetailModal({ person, onClose, onSelectProduct }) {
  if (!person) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div
        className="flex flex-col w-full max-w-3xl max-h-[90vh] rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-2xl overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/80">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span>Person Profile</span>
            <span>•</span>
            <span className="text-violet-600">Unified Entity</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Person Hero */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div
                className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${person.avatarBg || 'from-violet-600 to-indigo-600'} text-xl font-bold text-white shadow-md`}
              >
                {person.avatar || person.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">{person.name}</h1>
                  <span className="text-sm font-medium text-slate-400">{person.handle}</span>
                </div>
                <p className="mt-1.5 text-sm text-slate-600 max-w-xl leading-relaxed">{person.bio}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {person.makers > 0 && (
                    <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700 border border-violet-100">
                      Maker ({person.makers})
                    </span>
                  )}
                  {person.commenters > 0 && (
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-100">
                      Commenter ({person.commenters})
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">
                    <Calendar size={12} />
                    Active: {person.firstSeenAt} - {person.lastSeenAt}
                  </span>
                </div>
              </div>
            </div>

            {person.link && (
              <a
                href={person.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shrink-0 transition"
              >
                <span>Product Hunt Profile</span>
                <ExternalLink size={12} className="text-slate-400" />
              </a>
            )}
          </div>

          {/* Quick Metrics */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-slate-50 p-3.5 text-center">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Associated Products</span>
              <p className="mt-1 text-xl font-bold text-slate-900">{person.products?.length || 0}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3.5 text-center">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Maker Roles</span>
              <p className="mt-1 text-xl font-bold text-violet-700">{person.makers || 0}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3.5 text-center">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Comments Logged</span>
              <p className="mt-1 text-xl font-bold text-blue-700">{person.commentsHistory?.length || person.commenters || 0}</p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Product Relationships */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-slate-900">Product Relationships</h3>
                <p className="text-xs text-slate-500">Roles mapped per-product relationship (Maker vs Commenter)</p>
              </div>
              <span className="text-xs font-medium text-slate-400">{person.products?.length || 0} links</span>
            </div>

            <div className="space-y-2.5">
              {person.products?.map((rel, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 hover:bg-white hover:border-violet-200 hover:shadow-xs transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-xs">
                      {rel.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{rel.name}</span>
                        <span
                          className={`rounded px-1.5 py-0.2 text-[10px] font-bold ${
                            rel.role === 'Maker'
                              ? 'bg-violet-100 text-violet-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {rel.role}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        {rel.role === 'Maker'
                          ? 'Created / published this product on Product Hunt'
                          : 'Participated in community launch discussion'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onSelectProduct(rel);
                      onClose();
                    }}
                    className="flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 border border-slate-200 hover:bg-violet-50 transition"
                  >
                    <span>View Product</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Comments History */}
          {person.commentsHistory && person.commentsHistory.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-900">Comments History</h3>
                <span className="text-xs text-slate-400">Captured public remarks</span>
              </div>
              <div className="space-y-2.5">
                {person.commentsHistory.map((c, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 bg-white p-3.5 text-xs">
                    <div className="flex items-center justify-between text-slate-500 mb-1.5">
                      <span className="font-semibold text-slate-800">On {c.product}</span>
                      <span>{c.time}</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed italic">"{c.text}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-6 py-3.5 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <UserCheck size={14} className="text-violet-600" />
            <span>Normalized person record in MongoDB</span>
          </div>
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
