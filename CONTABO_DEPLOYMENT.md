# Product Hunt Scraper — Contabo Linux Server Deployment Guide

This guide details how to run the **Product Hunt Scraper** frontend and headless Python pipeline on your **Contabo Linux VPS** (Ubuntu 22.04 / 24.04 LTS).

---

## 1. Quick Start on Contabo Linux VPS

### Prerequisites
On your Contabo server, ensure Node.js (v18+) and Python 3.10+ are installed:

```bash
# Update package lists
sudo apt update && sudo apt install -y curl git nginx python3-pip python3-venv

# Install Node.js (v20 or v22 LTS)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

---

## 2. Running the React Frontend

The frontend is built with **Vite + React 19 + Tailwind CSS** and is pre-configured to bind to `0.0.0.0:3000` (listening on all network interfaces).

### Option A: Using PM2 (Recommended for 24/7 background uptime)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Navigate to frontend and build production bundle
cd /path/to/Product-Hunt-Scraper/frontend
npm install
npm run build

# Start persistent production preview server on port 3000
pm2 start "npm run preview" --name "ph-scraper-frontend"

# Ensure PM2 restarts automatically on server reboot
pm2 save
pm2 startup
```

### Option B: Quick Development Mode

```bash
cd /path/to/Product-Hunt-Scraper/frontend
npm run dev
# Accessible at http://<your-contabo-vps-ip>:3000
```

---

## 3. Nginx Reverse Proxy Setup (Optional: Serve on Port 80 / 443)

To access your frontend directly via domain or server IP without appending `:3000`:

1. Create a new Nginx site configuration:
   ```bash
   sudo nano /etc/nginx/sites-available/product-hunt-scraper
   ```

2. Paste the configuration:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com 161.97.142.88; # Replace with your domain or Contabo IP

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. Enable the site and restart Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/product-hunt-scraper /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

---

## 4. Headless Python Scraper Execution on Contabo

The Python scraper uses **SeleniumBase UC in headless mode** (`headless=True`), meaning no display or X11 screen is needed on your headless Linux VPS.

```bash
cd /path/to/Product-Hunt-Scraper
source .venv/bin/activate
python3 main.py
```

### Scheduled Daily Scraper (Crontab)
To run automatically every day at 06:00 AM America/Los_Angeles (14:00 UTC):

```bash
crontab -e
```

Add the following line:
```cron
0 14 * * * cd /path/to/Product-Hunt-Scraper && /path/to/Product-Hunt-Scraper/.venv/bin/python3 main.py >> /var/log/ph_scraper.log 2>&1
```

---

## 5. Summary of Frontend Features

- **Brand Name:** Product Hunt Scraper
- **Custom Brand Logo:** Dynamic vector radar-prism emblem with violet/indigo gradient and electric cyan target scan
- **Command Palette:** Press `Cmd+K` / `Ctrl+K` for instant global keyboard search across products, people, and actions
- **Live Terminal Simulator:** Interactive execution drawer showing real-time log output and progress bar
- **Product Detail Modal:** 5 tabs (Overview, Discussions with nested replies, Makers with direct profile links, Built With tech stack, and Community Reviews)
- **Unified Person Profile:** Displays relationship-level roles (e.g. Maker on product A, Commenter on product B)
- **Scraping History:** Audit log with run metrics and full log inspection drawer
- **Contabo Server Hub:** Live hardware status and instant-copy production deployment commands
