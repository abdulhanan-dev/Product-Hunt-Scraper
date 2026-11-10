# Product Hunt Scraper — Vercel Deployment & Frontend Scraper Execution Guide

This guide explains how to deploy the **Product Hunt Scraper** frontend to **Vercel** and connect it to your backend so you can run the scraper directly from the frontend UI with live real-time terminal streaming.

---

## 1. Architecture Overview

```
┌─────────────────────────────────┐           ┌─────────────────────────────────┐
│     Vercel (Global Edge CDN)    │           │  Backend Host (Contabo VPS,     │
│                                 │           │  Render, Railway, or Dedicated) │
│  • React 19 + Vite Dashboard    │           │  • FastAPI Backend (api.py)     │
│  • Scraper Terminal UI Modal    │  HTTPS    │  • Headless Chrome + SeleniumBase│
│  • Live Log Viewer (SSE)        │──────────▶│  • Python Pipeline (main.py)    │
│  • Product / Maker Explorer     │  REST/SSE │  • MongoDB Database             │
└─────────────────────────────────┘           └─────────────────────────────────┘
```

### Why this 2-Tier Architecture is Essential:
1. **Scraper Execution Time**: Scraping Product Hunt daily launches, makers, and comments takes **3 to 10+ minutes**. Vercel Serverless Functions have a hard timeout limit of 10–60 seconds.
2. **Headless Chrome & Anti-Bot**: The scraper runs **SeleniumBase UC** with headless Chromium to bypass Cloudflare and extract build hashes. This requires persistent Linux libraries and disk space exceeding serverless limits.
3. **Background Subprocesses & SSE**: The backend manages persistent Python subprocesses and broadcasts real-time stdout logs over Server-Sent Events (SSE).

---

## 2. Deploying the Frontend to Vercel

### Option A: Via GitHub (Recommended — Automatic CI/CD)

1. Push your repository to GitHub (or GitLab/Bitbucket).
2. Go to [vercel.com](https://vercel.com) and log in.
3. Click **"Add New..."** ➔ **"Project"**.
4. Import your `Product-Hunt-Scraper` repository.
5. In the **Configure Project** screen:
   - **Framework Preset**: Vite
   - **Root Directory**: Leave as `./` (the root `vercel.json` will automatically build `frontend/`), OR select `frontend`.
   - **Build Command**: `cd frontend && npm install && npm run build` (detected automatically from `vercel.json`).
   - **Output Directory**: `frontend/dist` (or `dist` if Root Directory is `frontend`).
6. Expand **Environment Variables** and add:
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: `https://api.yourdomain.com` (your backend server URL — see Section 3 below).
7. Click **Deploy**.

---

### Option B: Via Vercel CLI

```bash
# Install Vercel CLI globally
npm i -g vercel

# Login to your Vercel account
vercel login

# Deploy from project root
vercel --prod
```

When prompted, choose the default options. The included `vercel.json` will configure Vite build and SPA routing automatically.

---

## 3. Setting Up the Backend to Power the "Run Scraper" Button

Your FastAPI backend (`api.py`) runs the scraper process and streams logs to the frontend.

### Running Backend on Contabo VPS / Any Linux Server

```bash
# 1. SSH into your server
ssh root@<your-server-ip>

# 2. Clone and enter repo
git clone https://github.com/your-username/Product-Hunt-Scraper.git
cd Product-Hunt-Scraper

# 3. Create virtualenv and install dependencies
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 4. Install Chromium dependencies for headless scraping
sudo apt update && sudo apt install -y \
  wget curl unzip chromium-browser libnss3 libgconf-2-4 \
  libasound2 libatk1.0-0 libcups2 libxcomposite1 \
  libxdamage1 libxrandr2 libgbm1

# 5. Configure .env with your MongoDB Atlas URI
cat <<EOF > .env
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/product_hunt_scraper?retryWrites=true&w=majority
MONGODB_DATABASE=product_hunt_scraper
HEADLESS=true
EOF

# 6. Start FastAPI backend with PM2 or Uvicorn
pip install uvicorn
pm2 start "uvicorn api:app --host 0.0.0.0 --port 8000" --name "ph-scraper-api"
pm2 save
pm2 startup
```

---

## 4. Avoiding Mixed Content (HTTPS ➔ HTTP)

If your frontend is on HTTPS (`https://your-app.vercel.app`), modern browsers will block plain HTTP calls (`http://<ip>:8000`).

To avoid this, choose one of these two solutions:

### Solution 1: Nginx with Free SSL (Let's Encrypt Certbot) — Recommended
In Nginx on your VPS:
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_buffering off; # Required for real-time SSE log streaming
        proxy_cache off;
    }
}
```
Obtain free SSL certificate:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

Then in Vercel:
Set `VITE_API_BASE_URL=https://api.yourdomain.com`.

---

### Solution 2: Vercel Proxy Rewrites (No Domain Required)
If your VPS only has an IP address (e.g. `http://161.97.142.88:8000`), update `vercel.json`:
```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "http://161.97.142.88:8000/api/:path*"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```
Vercel's server will proxy the requests over HTTPS to your backend IP.

---

## 5. How to Run the Scraper from the Frontend

1. Open your Vercel deployment URL (`https://your-project.vercel.app`).
2. Click the **"Run Scraper"** button in the **Sidebar** or **Topbar** (Terminal icon).
3. The **Unified Live Terminal** modal will open.
4. Click **"Rerun Pipeline"** (purple button):
   - **Stage 1**: Pre-flight validation & Headless Chrome hash extraction.
   - **Stage 2**: MongoDB compound index check.
   - **Stage 3**: Stage 1 Daily Leaderboard query.
   - **Stage 4**: Stage 2 Product Enrichment (media, topics, comments, tech stack).
   - **Stage 5**: Stage 3 Maker & Commenter People profile extraction.
5. Watch the real-time terminal output, stage progress bars, and live counts.
6. You can cancel or stop the scraper at any time by clicking **"Stop Pipeline"**.
