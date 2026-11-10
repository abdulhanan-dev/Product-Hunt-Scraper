import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Terminal,
  Play,
  Square,
  CheckCircle2,
  AlertCircle,
  X,
  Shield,
  RefreshCw,
  Copy,
  Check,
  Filter,
  Trash2,
  Radio,
  ArrowDownCircle,
  Server,
  Layers,
  Activity,
  Calendar,
} from 'lucide-react';
import { api } from '../services/api';

export const PIPELINE_STEPS = [
  { id: 1, name: 'Pre-flight & Headless Chrome', desc: 'Validating hash & headless browser' },
  { id: 2, name: 'MongoDB Index Check', desc: 'Verifying compound indexes' },
  { id: 3, name: 'Stage 1: Daily Leaderboard', desc: 'Fetching Pacific date launches' },
  { id: 4, name: 'Stage 2: Product Enrichment', desc: 'Media, built-with & discussions' },
  { id: 5, name: 'Stage 3: People & Finalize', desc: 'Unified person role mapping' },
];

export default function ScraperTerminalModal({ isOpen, onClose }) {
  const [logs, setLogs] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'scraper' | 'backend' | 'frontend' | 'error'
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({ products: 0, people: 0, comments: 0 });
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // 'connected' | 'connecting' | 'disconnected'
  const [isStarting, setIsStarting] = useState(false);

  // Compute yesterday in Pacific Time (Product Hunt leaderboard timezone)
  const pacificYesterday = useMemo(() => {
    try {
      const now = new Date();
      const pacificStr = now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
      const pacificDate = new Date(pacificStr);
      pacificDate.setDate(pacificDate.getDate() - 1);
      const yyyy = pacificDate.getFullYear();
      const mm = String(pacificDate.getMonth() + 1).padStart(2, '0');
      const dd = String(pacificDate.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } catch {
      return '';
    }
  }, []);

  const [selectedDate, setSelectedDate] = useState('');
  const [activeTargetDate, setActiveTargetDate] = useState(null);

  const terminalEndRef = useRef(null);
  const eventSourceRef = useRef(null);
  const terminalContainerRef = useRef(null);

  // Send initial frontend action log when modal opens
  useEffect(() => {
    if (isOpen) {
      api.sendClientLog('INFO', 'Scraper Terminal modal opened');
      checkScraperStatus();
    }
  }, [isOpen]);

  // Connect to SSE real-time log stream
  useEffect(() => {
    if (!isOpen) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    setConnectionStatus('connecting');
    const sseUrl = api.getLogsStreamUrl();
    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.onopen = () => {
      setConnectionStatus('connected');
    };

    es.onmessage = (e) => {
      try {
        if (!e.data || e.data.startsWith(':')) return;
        const entry = JSON.parse(e.data);

        setLogs((prev) => {
          // Deduplicate by id if present
          if (entry.id && prev.some((l) => l.id === entry.id)) {
            return prev;
          }
          return [...prev.slice(-499), entry];
        });

        // Automatically infer pipeline stage from real log messages
        const text = entry.text || '';
        if (entry.source === 'scraper') {
          if (text.includes('[pre-flight]') || text.includes('extract_hashes') || text.includes('Validating')) {
            setCurrentStep(1);
          } else if (text.includes('MongoDB') || text.includes('index') || text.includes('ensure_indexes')) {
            setCurrentStep(2);
          } else if (text.includes('Stage 1:') || text.includes('fetch_daily_leaderboard') || text.includes('Leaderboard page')) {
            setCurrentStep(3);
          } else if (text.includes('Stage 2:') || text.includes('Enriching') || text.includes('Product Details')) {
            setCurrentStep(4);
          } else if (text.includes('Stage 3:') || text.includes('profile') || text.includes('discovered usernames')) {
            setCurrentStep(5);
          } else if (text.includes('completed successfully') || text.includes('Run completed in')) {
            setCurrentStep(6);
            setIsRunning(false);
          }

          // Dynamically detect counts
          const mLaunches = text.match(/(\d+)\s+launches/i) || text.match(/captured\s+(\d+)\s+launches/i);
          if (mLaunches) {
            setStats((s) => ({ ...s, products: parseInt(mLaunches[1], 10) }));
          }
          const mPeople = text.match(/(\d+)\s+associated people/i) || text.match(/profiles\s+(\d+)/i) || text.match(/(\d+)\s+newly discovered usernames/i);
          if (mPeople) {
            setStats((s) => ({ ...s, people: parseInt(mPeople[1], 10) }));
          }
          const mComments = text.match(/(\d+)\s+comments/i);
          if (mComments) {
            setStats((s) => ({ ...s, comments: parseInt(mComments[1], 10) }));
          }
        }
      } catch (err) {
        console.warn('Failed to parse incoming log event:', err);
      }
    };

    es.onerror = () => {
      setConnectionStatus('disconnected');
    };

    // Poll status periodically while modal is open
    const statusInterval = setInterval(checkScraperStatus, 2500);

    return () => {
      clearInterval(statusInterval);
      if (es) es.close();
      eventSourceRef.current = null;
    };
  }, [isOpen]);

  const checkScraperStatus = async () => {
    try {
      const res = await api.getScraperStatus();
      if (res && typeof res.is_running === 'boolean') {
        setIsRunning(res.is_running);
        if (res.target_date) {
          setActiveTargetDate(res.target_date);
        }
      }
    } catch {
      // ignore status check failure
    }
  };

  // Auto-scroll when new logs arrive (if autoScroll is enabled)
  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Handle user manual scrolling to temporarily pause auto-scroll
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 40;
    if (!isAtBottom && autoScroll) {
      setAutoScroll(false);
    } else if (isAtBottom && !autoScroll) {
      setAutoScroll(true);
    }
  };

  // Trigger real pipeline run
  const handleStartPipeline = async () => {
    if (isRunning || isStarting) return;
    setIsStarting(true);
    setCurrentStep(1);

    const dateToRun = selectedDate || pacificYesterday;
    api.sendClientLog(
      'INFO',
      `User triggered scraper pipeline via UI terminal${
        selectedDate ? ` (date: ${selectedDate})` : ` (auto Pacific yesterday: ${pacificYesterday})`
      }`
    );

    try {
      const payload = selectedDate ? { date: selectedDate } : {};
      const res = await api.triggerScraper(payload);
      if (res.status === 'started' || res.status === 'already_running') {
        setIsRunning(true);
        setActiveTargetDate(res.target_date || dateToRun);
      }
    } catch (err) {
      console.error('Failed to trigger scraper:', err);
      setLogs((prev) => [
        ...prev,
        {
          id: Date.now(),
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          source: 'backend',
          level: 'ERROR',
          text: `Failed to start scraper: ${err.message}`,
        },
      ]);
    } finally {
      setIsStarting(false);
    }
  };

  // Stop real pipeline run
  const handleStopPipeline = async () => {
    try {
      api.sendClientLog('WARNING', 'User requested scraper termination from UI terminal');
      await api.stopScraper();
      setIsRunning(false);
    } catch (err) {
      console.error('Failed to stop scraper:', err);
    }
  };

  const handleCopyLogs = () => {
    const text = filteredLogs
      .map((l) => `${l.timestamp || ''} [${(l.source || 'sys').toUpperCase()}] [${l.level || 'INFO'}] ${l.text || ''}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  // Filter logs by tab
  const filteredLogs = useMemo(() => {
    if (activeFilter === 'all') return logs;
    if (activeFilter === 'error') {
      return logs.filter((l) => l.level === 'ERROR' || l.level === 'WARNING');
    }
    return logs.filter((l) => l.source === activeFilter);
  }, [logs, activeFilter]);

  // Log counts for filter badges
  const counts = useMemo(() => {
    return {
      all: logs.length,
      scraper: logs.filter((l) => l.source === 'scraper').length,
      backend: logs.filter((l) => l.source === 'backend').length,
      frontend: logs.filter((l) => l.source === 'frontend').length,
      error: logs.filter((l) => l.level === 'ERROR' || l.level === 'WARNING').length,
    };
  }, [logs]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div
        className="flex flex-col w-full max-w-5xl h-[92vh] max-h-[850px] rounded-3xl border border-slate-700/80 bg-slate-900 text-slate-100 shadow-2xl overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Terminal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/90 px-5 py-3.5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block" />
            </div>

            <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
              <Terminal size={16} className="text-violet-400" />
              <span className="text-xs font-bold tracking-wide text-slate-200">
                Product Hunt Scraper Engine · Live Unified Terminal
              </span>
            </div>

            {/* Live SSE Stream Status */}
            <div className="hidden sm:flex items-center gap-1.5 ml-2">
              {connectionStatus === 'connected' ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Stream Active
                </span>
              ) : connectionStatus === 'connecting' ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400 border border-amber-500/20">
                  <RefreshCw size={10} className="animate-spin" />
                  Connecting...
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-400 border border-rose-500/20">
                  <Radio size={10} /> Disconnected
                </span>
              )}

              {isRunning && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/15 px-2.5 py-0.5 text-[10px] font-bold text-violet-300 border border-violet-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-ping" />
                  Scraper Running
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearLogs}
              title="Clear Terminal Display"
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <Trash2 size={15} />
            </button>

            <button
              onClick={handleCopyLogs}
              title="Copy All Filtered Logs"
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Live Stepper & Counter Bar */}
        <div className="border-b border-slate-800 bg-slate-900/95 px-5 py-3 shrink-0">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {PIPELINE_STEPS.map((step) => {
              const isPast = currentStep > step.id || currentStep === 6;
              const isCurrent = currentStep === step.id;
              return (
                <div key={step.id} className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                        isPast
                          ? 'bg-emerald-500 text-slate-950 font-extrabold'
                          : isCurrent
                          ? 'bg-violet-500 text-white animate-pulse'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {isPast ? '✓' : step.id}
                    </span>
                    <span
                      className={`truncate text-xs font-medium ${
                        isPast ? 'text-slate-200' : isCurrent ? 'text-violet-400 font-bold' : 'text-slate-500'
                      }`}
                    >
                      {step.name}
                    </span>
                  </div>
                  <div
                    className={`mt-1.5 h-1 w-full rounded-full ${
                      isPast ? 'bg-emerald-500' : isCurrent ? 'bg-violet-500 animate-pulse' : 'bg-slate-800'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Quick Metrics Counter during run */}
          <div className="mt-3 flex items-center justify-between border-t border-slate-800/60 pt-2 text-xs text-slate-400">
            <div className="flex items-center gap-4">
              <span>
                Launches: <strong className="text-white font-mono">{stats.products}</strong>
              </span>
              <span>
                People: <strong className="text-white font-mono">{stats.people}</strong>
              </span>
              <span>
                Comments: <strong className="text-white font-mono">{stats.comments}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
              <span>
                Target Date:{' '}
                <strong className="text-violet-400">
                  {activeTargetDate || (selectedDate ? selectedDate : `${pacificYesterday} (Pacific Yesterday)`)}
                </strong>
              </span>
              <span>•</span>
              <span>America/Los_Angeles</span>
              <span>•</span>
              <span>FastAPI Backend :8000</span>
            </div>
          </div>
        </div>

        {/* Filter Navigation Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/60 px-5 py-2 text-xs shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider mr-1 flex items-center gap-1">
              <Filter size={11} /> Filter:
            </span>

            {[
              { id: 'all', label: 'All Logs', count: counts.all, color: 'hover:text-white' },
              { id: 'scraper', label: 'Scraper Script', count: counts.scraper, color: 'text-violet-400' },
              { id: 'backend', label: 'Backend API', count: counts.backend, color: 'text-sky-400' },
              { id: 'frontend', label: 'Frontend', count: counts.frontend, color: 'text-amber-400' },
              { id: 'error', label: 'Warnings & Errors', count: counts.error, color: 'text-rose-400' },
            ].map((tab) => {
              const active = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium text-[11px] transition ${
                    active
                      ? 'bg-slate-800 text-white border border-slate-700 shadow-xs'
                      : 'text-slate-400 hover:bg-slate-900/60'
                  }`}
                >
                  <span className={tab.color}>{tab.label}</span>
                  <span className="rounded-full bg-slate-800/90 px-1.5 py-0.2 text-[10px] font-mono text-slate-400">
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] transition ${
                autoScroll
                  ? 'bg-violet-950/50 text-violet-300 border border-violet-800/40'
                  : 'bg-slate-800/60 text-slate-400 border border-slate-700'
              }`}
            >
              <ArrowDownCircle size={12} className={autoScroll ? 'text-violet-400' : 'text-slate-500'} />
              <span>Auto-scroll {autoScroll ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>

        {/* Console Log Stream */}
        <div
          ref={terminalContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-5 font-mono text-xs leading-relaxed space-y-1.5 bg-slate-950 selection:bg-violet-600/40"
        >
          {filteredLogs.length === 0 ? (
            <div className="py-24 text-center text-slate-500 space-y-2">
              <Terminal size={36} className="mx-auto opacity-30 text-slate-400" />
              <p className="text-xs">
                {activeFilter === 'all'
                  ? 'Waiting for live logs from Scraper, Backend, or Frontend...'
                  : `No logs matching filter "${activeFilter}" yet.`}
              </p>
              <p className="text-[11px] text-slate-600">
                Trigger a run with the button below or make API requests to see live log activity.
              </p>
            </div>
          ) : (
            filteredLogs.map((log, idx) => {
              const isSuccess = log.level === 'SUCCESS';
              const isWarn = log.level === 'WARNING';
              const isErr = log.level === 'ERROR';
              const source = (log.source || 'sys').toLowerCase();

              const sourceBadge =
                source === 'scraper' ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-950/70 text-violet-300 border border-violet-800/40 uppercase tracking-tight">
                    SCRAPER
                  </span>
                ) : source === 'backend' ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-950/70 text-sky-300 border border-sky-800/40 uppercase tracking-tight">
                    BACKEND
                  </span>
                ) : source === 'frontend' ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-800/40 uppercase tracking-tight">
                    FRONTEND
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase tracking-tight">
                    SYSTEM
                  </span>
                );

              return (
                <div key={log.id || idx} className="flex items-start gap-2.5 animate-fade-in hover:bg-slate-900/40 px-1 py-0.5 rounded">
                  <span className="text-slate-600 select-none shrink-0 font-mono text-[11px]">
                    {log.timestamp || '—'}
                  </span>

                  <span className="shrink-0 select-none">{sourceBadge}</span>

                  <span
                    className={`font-semibold shrink-0 select-none text-[11px] ${
                      isSuccess
                        ? 'text-emerald-400'
                        : isWarn
                        ? 'text-amber-400'
                        : isErr
                        ? 'text-rose-400'
                        : 'text-slate-400'
                    }`}
                  >
                    [{log.level || 'INFO'}]
                  </span>

                  <span
                    className={`break-all leading-relaxed ${
                      isSuccess
                        ? 'text-emerald-300'
                        : isWarn
                        ? 'text-amber-300'
                        : isErr
                        ? 'text-rose-300 font-medium'
                        : 'text-slate-200'
                    }`}
                  >
                    {log.text}
                  </span>
                </div>
              );
            })
          )}

          {isRunning && (
            <div className="flex items-center gap-2 text-violet-400 animate-pulse pt-2.5 font-semibold text-xs">
              <RefreshCw size={13} className="animate-spin" />
              <span>Pipeline actively processing on Python background subprocess...</span>
            </div>
          )}

          <div ref={terminalEndRef} />
        </div>

        {/* Terminal Action Bar */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/95 px-5 py-3.5 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Shield size={14} className="text-emerald-400" />
            <span>Anti-bot protection: Headless SeleniumBase UC active</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Scrape Target Date Selector (Defaults automatically to Pacific Yesterday) */}
            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/90 px-2.5 py-1.5 text-xs">
              <Calendar size={13} className="text-violet-400 shrink-0" />
              <span className="text-[11px] text-slate-400">Date:</span>
              <input
                type="date"
                disabled={isRunning || isStarting}
                value={selectedDate || pacificYesterday}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-slate-200 text-xs font-mono focus:outline-none cursor-pointer disabled:opacity-50"
                title="Date to scrape (defaults to Pacific Yesterday)"
              />
              {selectedDate && selectedDate !== pacificYesterday && (
                <button
                  type="button"
                  onClick={() => setSelectedDate('')}
                  title="Reset to Pacific Yesterday"
                  className="ml-1 text-[10px] text-violet-400 hover:text-violet-300 font-semibold underline"
                >
                  Reset
                </button>
              )}
            </div>

            {isRunning ? (
              <button
                onClick={handleStopPipeline}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold bg-rose-600 text-white hover:bg-rose-500 shadow-md shadow-rose-600/30 transition"
              >
                <Square size={13} fill="currentColor" />
                <span>Stop Pipeline</span>
              </button>
            ) : (
              <button
                disabled={isStarting}
                onClick={handleStartPipeline}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold bg-violet-600 text-white hover:bg-violet-500 shadow-md shadow-violet-600/30 transition disabled:opacity-50"
              >
                {isStarting ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <Play size={13} fill="currentColor" />
                )}
                <span>{isStarting ? 'Starting...' : 'Rerun Pipeline'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
