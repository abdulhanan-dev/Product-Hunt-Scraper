import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle, Copy, Check, Clock, Calendar, ShieldCheck, Terminal } from 'lucide-react';

export default function RunDetailModal({ run, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!run) return null;

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(run.logs.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isSuccess = run.status === 'Completed';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div
        className="flex flex-col w-full max-w-3xl max-h-[90vh] rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-2xl overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/80">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-2.5 w-2.5 rounded-full ${
                isSuccess ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            />
            <span className="font-mono text-xs font-semibold text-slate-700">{run.id}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                isSuccess ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}
            >
              {run.status}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Run Summary Grid */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Scraping Execution Report</h2>
              <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar size={13} /> {run.date}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock size={13} /> Duration: {run.duration}
                </span>
                <span>•</span>
                <span>Target: {run.targetDate}</span>
              </div>
            </div>

            <button
              onClick={handleCopyLogs}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              <span>{copied ? 'Logs Copied' : 'Copy Logs'}</span>
            </button>
          </div>

          {/* Stats Bar */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl bg-slate-50 p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Launches Saved</span>
              <p className="mt-1 text-lg font-bold text-slate-900">{run.launchesSaved}</p>
              <span className="text-[10px] text-slate-400">+{run.newProducts} new</span>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">People Resolved</span>
              <p className="mt-1 text-lg font-bold text-violet-700">{run.peopleDiscovered}</p>
              <span className="text-[10px] text-slate-400">+{run.newProfilesSaved} new</span>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Comments Saved</span>
              <p className="mt-1 text-lg font-bold text-blue-700">{run.commentsSaved}</p>
              <span className="text-[10px] text-slate-400">nested threads</span>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Media & Tech</span>
              <p className="mt-1 text-lg font-bold text-emerald-700">{run.mediaSaved}</p>
              <span className="text-[10px] text-slate-400">{run.builtWithSaved} built-with</span>
            </div>
          </div>
        </div>

        {/* Logs Viewer */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Terminal size={14} />
              <span>Full Run Execution Log</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">{run.logs.length} lines</span>
          </div>

          <div className="rounded-2xl bg-slate-950 p-4 font-mono text-xs text-slate-300 leading-relaxed space-y-1.5 selection:bg-violet-600">
            {run.logs.map((log, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-slate-600 select-none">{i + 1}</span>
                <span
                  className={
                    log.includes('[ERROR]')
                      ? 'text-rose-400 font-bold'
                      : log.includes('[WARNING]')
                      ? 'text-amber-400'
                      : log.includes('completed') || log.includes('verified')
                      ? 'text-emerald-400'
                      : 'text-slate-300'
                  }
                >
                  {log}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-6 py-3.5 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>MongoDB transaction verified & idempotent</span>
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
