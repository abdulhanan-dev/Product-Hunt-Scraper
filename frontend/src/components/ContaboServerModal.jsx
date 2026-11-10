import React, { useState } from 'react';
import {
  X,
  Server,
  Cpu,
  HardDrive,
  Database,
  Shield,
  Terminal,
  Copy,
  Check,
  Clock,
  Radio,
  CheckCircle2,
  ChevronRight,
  Globe,
} from 'lucide-react';
import { serverSystemStats } from '../data/mockData';

export default function ContaboServerModal({ isOpen, onClose }) {
  const [copiedKey, setCopiedKey] = useState(null);

  if (!isOpen) return null;

  const copySnippet = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const nginxSnippet = `server {
    listen 80;
    server_name your-domain.com 161.97.142.88;

    # React Frontend (Vite dist / preview)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}`;

  const pm2Snippet = `# 1. In Contabo Linux terminal:
cd /var/www/Product-Hunt-Scraper/frontend
npm install
npm run build

# 2. Run with PM2 background process manager:
npm install -g pm2
pm2 start "npm run preview" --name "ph-scraper-frontend"
pm2 save
pm2 startup`;

  const cronSnippet = `# Edit Contabo crontab: crontab -e
# Run daily at 06:00 AM America/Los_Angeles (14:00 UTC)
0 14 * * * cd /var/www/Product-Hunt-Scraper && /var/www/Product-Hunt-Scraper/.venv/bin/python3 main.py >> /var/log/ph_scraper.log 2>&1`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-md fade-in overflow-y-auto">
      <div
        className="flex flex-col w-full max-w-3xl max-h-[90vh] rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-2xl overflow-hidden scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 px-6 py-4 bg-slate-50/80 dark:bg-zinc-950/80">
          <div className="flex items-center gap-2">
            <Server size={18} className="text-emerald-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Contabo Linux Server Deployment
            </h2>
            <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800/40">
              Online & Optimized
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Server Spec Overview */}
          <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-800/40 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  Target Host Environment
                </p>
                <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                  {serverSystemStats.host}
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono mt-0.5">
                  {serverSystemStats.os}
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 px-3 py-2 text-xs font-mono text-slate-700 dark:text-zinc-300 shadow-xs">
                <Globe size={13} className="text-emerald-500" />
                <span>{serverSystemStats.ip}</span>
              </div>
            </div>

            {/* Hardware Resource Usage Bars */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl bg-white dark:bg-zinc-900 p-3.5 border border-slate-200/80 dark:border-zinc-800 shadow-xs">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="flex items-center gap-1.5 text-slate-500 dark:text-zinc-400">
                    <Cpu size={14} className="text-violet-500" /> CPU Load
                  </span>
                  <span className="font-bold text-slate-800 dark:text-zinc-200">
                    {serverSystemStats.cpu.usagePercent}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-600 rounded-full"
                    style={{ width: `${serverSystemStats.cpu.usagePercent}%` }}
                  />
                </div>
                <span className="mt-1.5 block text-[10px] text-slate-400 dark:text-zinc-500">
                  {serverSystemStats.cpu.cores} vCPU Cores
                </span>
              </div>

              <div className="rounded-xl bg-white dark:bg-zinc-900 p-3.5 border border-slate-200/80 dark:border-zinc-800 shadow-xs">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="flex items-center gap-1.5 text-slate-500 dark:text-zinc-400">
                    <Radio size={14} className="text-emerald-500" /> RAM Usage
                  </span>
                  <span className="font-bold text-slate-800 dark:text-zinc-200">
                    {serverSystemStats.ram.usedGB} / {serverSystemStats.ram.totalGB} GB
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${serverSystemStats.ram.usagePercent}%` }}
                  />
                </div>
                <span className="mt-1.5 block text-[10px] text-slate-400 dark:text-zinc-500">
                  {serverSystemStats.ram.usagePercent}% allocated
                </span>
              </div>

              <div className="rounded-xl bg-white dark:bg-zinc-900 p-3.5 border border-slate-200/80 dark:border-zinc-800 shadow-xs">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="flex items-center gap-1.5 text-slate-500 dark:text-zinc-400">
                    <HardDrive size={14} className="text-amber-500" /> SSD NVMe
                  </span>
                  <span className="font-bold text-slate-800 dark:text-zinc-200">
                    {serverSystemStats.storage.usedGB} / {serverSystemStats.storage.totalGB} GB
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${serverSystemStats.storage.usagePercent}%` }}
                  />
                </div>
                <span className="mt-1.5 block text-[10px] text-slate-400 dark:text-zinc-500">
                  {serverSystemStats.storage.usagePercent}% NVMe used
                </span>
              </div>
            </div>
          </div>

          {/* Configuration Snippets */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              Server Run Configuration
            </h4>

            {/* PM2 snippet */}
            <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden bg-slate-900 text-slate-100">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800 text-xs">
                <span className="font-mono text-emerald-400">PM2 Daemon Startup</span>
                <button
                  onClick={() => copySnippet('pm2', pm2Snippet)}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white"
                >
                  {copiedKey === 'pm2' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copiedKey === 'pm2' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-4 text-[11px] font-mono leading-relaxed overflow-x-auto text-slate-300">
                {pm2Snippet}
              </pre>
            </div>

            {/* Cron snippet */}
            <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden bg-slate-900 text-slate-100">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800 text-xs">
                <span className="font-mono text-amber-400">Daily Cron (06:00 PT)</span>
                <button
                  onClick={() => copySnippet('cron', cronSnippet)}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white"
                >
                  {copiedKey === 'cron' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copiedKey === 'cron' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-4 text-[11px] font-mono leading-relaxed overflow-x-auto text-slate-300">
                {cronSnippet}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
