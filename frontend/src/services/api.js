/**
 * API Service for Product Hunt Scraper Backend
 */

const getApiBase = () => {
  // 1. Explicit environment variable (set in Vercel Project Settings)
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 2. Browser runtime detection
  if (typeof window !== 'undefined') {
    // Local dev server with Vite proxy (:3000) or FastAPI serving frontend (:8000)
    if (window.location.port === '3000' || window.location.port === '8000') {
      return '';
    }
    // Standard HTTPS / HTTP ports (Vercel with vercel.json rewrites or Nginx reverse proxy)
    if (!window.location.port) {
      return '';
    }
  }

  // 3. Local standalone fallback
  return 'http://localhost:8000';
};

const API_BASE = getApiBase();

async function request(path, options = {}) {
  try {
    const url = `${API_BASE}${path}`;
    const headers = {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    };
    const res = await fetch(url, {
      ...options,
      headers,
    });
    if (!res.ok) {
      throw new Error(`API error ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.warn(`Request to ${path} failed:`, err.message);
    throw err;
  }
}

export const api = {
  getStats: () => request('/api/stats'),
  getDates: () => request('/api/dates'),
  getProducts: ({ date = '', sort = 'rank', limit = 100, skip = 0 } = {}) => {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (sort) params.append('sort', sort);
    if (limit) params.append('limit', limit);
    if (skip) params.append('skip', skip);
    return request(`/api/products?${params.toString()}`);
  },
  getProductDetail: (slug) => request(`/api/products/${encodeURIComponent(slug)}`),
  getProfiles: ({ limit = 100, skip = 0, search = '' } = {}) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit);
    if (skip) params.append('skip', skip);
    if (search) params.append('search', search);
    return request(`/api/profiles?${params.toString()}`);
  },
  getProfile: (username) => request(`/api/profiles/${encodeURIComponent(username)}`),
  getRuns: ({ limit = 50 } = {}) => request(`/api/runs?limit=${limit}`),
  getRunDetail: (runId) => request(`/api/runs/${encodeURIComponent(runId)}`),
  health: () => request('/api/health'),

  // Real-time Scraper & Live Logs
  triggerScraper: (payload = {}) =>
    request('/api/scraper/trigger', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  stopScraper: () =>
    request('/api/scraper/stop', {
      method: 'POST',
    }),
  getScraperStatus: () => request('/api/scraper/status'),
  sendClientLog: (level, text, meta = {}) =>
    request('/api/logs/client', {
      method: 'POST',
      body: JSON.stringify({ level, text, meta }),
    }).catch(() => {}),
  getLogsStreamUrl: () => `${API_BASE}/api/logs/stream`,
};

export default api;
