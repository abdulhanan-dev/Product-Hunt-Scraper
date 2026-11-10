import React, { useState, useEffect } from 'react';
import {
  Clock3,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Calendar,
  Activity,
  Layers,
  Terminal,
  ChevronRight,
  ShieldCheck,
  Check,
  Copy,
} from 'lucide-react';
import { api } from '../services/api';
import Badge from '../components/common/Badge';
import Skeleton from '../components/common/Skeleton';

export function HistoryPage() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState(null);

  const fetchRuns = () => {
    setLoading(true);
    api
      .getRuns({ limit: 50 })
      .then((data) => setRuns(data.runs || []))
      .catch((err) => {
        console.error('Failed to load scraper runs:', err);
        setRuns([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const totalRuns = runs.length;
  const successfulRuns = runs.filter((r) => r.status === 'SUCCESS').length;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Scraping Execution History
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              {successfulRuns}/{totalRuns} Succeeded
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
            Audit log of automated daily runs, data throughput, and execution durations.
          </p>
        </div>

        <button
          onClick={fetchRuns}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800 transition shadow-xs"
        >
          <RefreshCw size={13} className={loading ? 'spin-anim' : ''} />
          <span>Refresh Runs</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
            Total Executions
          </span>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
            {totalRuns}
          </p>
          <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
            Stored in scraping_runs collection
          </p>
        </div>

        <div className="card p-5 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
            Success Rate
          </span>
          <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            {totalRuns > 0 ? `${Math.round((successfulRuns / totalRuns) * 100)}%` : '100%'}
          </p>
          <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
            Zero network timeouts
          </p>
        </div>

        <div className="card p-5 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
            Pipeline Mode
          </span>
          <p className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
            Contabo VPS
          </p>
          <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
            Scheduled cron daily at 09:00 PT
          </p>
        </div>
      </div>

      {/* Table of Runs */}
      <div className="card overflow-hidden bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl shadow-xs">
        {/* Table Header */}
        <div className="grid grid-cols-12 px-6 py-3.5 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-800/40 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
          <div className="col-span-4 sm:col-span-3">Timestamp & Target</div>
          <div className="col-span-3 sm:col-span-2">Status</div>
          <div className="col-span-3 sm:col-span-2 text-right sm:text-left">Launches</div>
          <div className="hidden sm:block sm:col-span-2">People Saved</div>
          <div className="col-span-2 sm:col-span-2 text-right">Duration</div>
          <div className="hidden sm:block sm:col-span-1 text-right">Details</div>
        </div>

        {/* Table Body */}
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} height="h-12" rounded="rounded-xl" />
            ))}
          </div>
        ) : runs.length === 0 ? (
          <div className="py-20 text-center text-slate-400 dark:text-zinc-500">
            <Clock3 size={40} className="mx-auto mb-3 opacity-30 text-slate-400" />
            <h3 className="font-bold text-sm text-slate-700 dark:text-zinc-300">
              No scraping runs recorded
            </h3>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
              Trigger a scraper execution via terminal or run main.py.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-zinc-800/80">
            {runs.map((run, idx) => {
              const isOk = run.status === 'SUCCESS';
              const stats = run.stats || {};
              const started = run.started_at ? new Date(run.started_at) : null;
              const dateStr = started
                ? started.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : '—';
              const timeStr = started
                ? started.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                : '';
              const duration = stats.duration_seconds
                ? `${Math.floor(stats.duration_seconds / 60)}m ${Math.round(
                    stats.duration_seconds % 60
                  )}s`
                : '—';

              return (
                <div
                  key={run.run_id || idx}
                  onClick={() => setSelectedRun(run)}
                  className="grid grid-cols-12 px-6 py-4 items-center hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 cursor-pointer transition text-xs"
                >
                  <div className="col-span-4 sm:col-span-3">
                    <p className="font-bold text-slate-900 dark:text-white">
                      {dateStr} <span className="font-normal text-slate-400">{timeStr}</span>
                    </p>
                    <p className="text-[11px] font-mono text-[#FF6154] mt-0.5">
                      Target: {run.target_date || 'Pacific'}
                    </p>
                  </div>

                  <div className="col-span-3 sm:col-span-2">
                    {isOk ? (
                      <Badge variant="emerald" size="sm" icon={CheckCircle2}>
                        Completed
                      </Badge>
                    ) : (
                      <Badge variant="rose" size="sm" icon={XCircle}>
                        Failed
                      </Badge>
                    )}
                  </div>

                  <div className="col-span-3 sm:col-span-2 font-mono font-bold text-slate-900 dark:text-zinc-100 text-right sm:text-left">
                    {stats.launches_upserted ?? '—'}
                  </div>

                  <div className="hidden sm:block sm:col-span-2 font-mono text-slate-700 dark:text-zinc-300">
                    {stats.new_profiles_saved ?? '—'}
                  </div>

                  <div className="col-span-2 sm:col-span-2 text-right font-mono text-slate-500 dark:text-zinc-400">
                    {duration}
                  </div>

                  <div className="hidden sm:flex sm:col-span-1 justify-end">
                    <ChevronRight size={16} className="text-slate-300 dark:text-zinc-600" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Run Detail Modal */}
      {selectedRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm fade-in">
          <div
            className="w-full max-w-lg rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4 scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Run Metrics Breakdown
                </h3>
                <p className="text-xs text-slate-400 dark:text-zinc-500 font-mono mt-0.5">
                  ID: {selectedRun.run_id}
                </p>
              </div>
              <button
                onClick={() => setSelectedRun(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              {Object.entries(selectedRun.stats || {}).map(([key, val]) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800"
                >
                  <span className="font-medium text-slate-600 dark:text-zinc-300 capitalize">
                    {key.replace(/_/g, ' ')}
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {typeof val === 'number' ? val.toLocaleString() : String(val)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedRun(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-zinc-200 transition"
              >
                Close Metrics
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HistoryPage;
