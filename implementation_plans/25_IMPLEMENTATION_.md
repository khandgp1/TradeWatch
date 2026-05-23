# Implementation Plan 25: Deploy TradeWatch to Oracle Cloud (Free Tier)

## Objective

Prepare the TradeWatch monorepo for production deployment on an **Oracle Cloud Always Free** ARM VPS. The Express server will serve the Vite-built React frontend as static files, eliminating the need for a separate frontend host. The app will run 24/7 via PM2 with SQLite persisted on disk.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│              Oracle Cloud VPS (Free)             │
│                                                  │
│  ┌─────────┐     ┌──────────────────────────┐   │
│  │  Nginx  │────▶│  PM2 → Node.js (Express) │   │
│  │ :80/:443│     │        :3001              │   │
│  └─────────┘     │  ┌────────────────────┐   │   │
│                  │  │ Static Files (Vite) │   │   │
│                  │  │ /client/dist        │   │   │
│                  │  └────────────────────┘   │   │
│                  │  ┌────────────────────┐   │   │
│                  │  │ SQLite DB           │   │   │
│                  │  │ /data/alerting.db   │   │   │
│                  │  └────────────────────┘   │   │
│                  │  ┌────────────────────┐   │   │
│                  │  │ node-cron jobs      │   │   │
│                  │  │ socket.io (WS)      │   │   │
│                  │  └────────────────────┘   │   │
│                  └──────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

---

## Phase 1: Make the Codebase Production-Ready (Code Changes)

### Step 1.1 — Express serves the Vite static build

**File:** `server/src/index.ts`

Add static file serving middleware so Express serves the React frontend in production. In development, Vite's dev server proxy handles this instead.

```typescript
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- After all /api routes, before httpServer.listen() ---

// Serve the Vite-built React frontend in production
if (process.env.NODE_ENV === 'production') {
  const clientDistPath = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDistPath));

  // Catch-all: serve index.html for any non-API route (SPA support)
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}
```

### Step 1.2 — Use environment variables for config overrides

**File:** `server/src/config.ts`

Allow production values (port, db path) to be overridden via environment variables so we can configure the server on the VPS without touching code.

```typescript
export const config = {
  startTime: process.env.TW_START_TIME || '2026-05-19 10:00',
  symbol: 'BTCUSDT',
  interval: '1h',
  port: parseInt(process.env.PORT || '3001', 10),
  dbPath: process.env.TW_DB_PATH || './data/alerting.db',
  enableTelegramAlerts: process.env.TW_TELEGRAM_ENABLED === 'true' || false,
} as const;
```

### Step 1.3 — Add a production build script

**File:** `package.json` (root)

Add a single `build` script to the root `package.json` that builds both the client and shared packages.

```json
{
  "name": "tradewatch-root",
  "private": true,
  "workspaces": [
    "shared",
    "server",
    "client"
  ],
  "scripts": {
    "build": "npm run build -w client",
    "start": "NODE_ENV=production node --import tsx server/src/index.ts"
  }
}
```

### Step 1.4 — Add a PM2 ecosystem config

**File:** `ecosystem.config.cjs` (new, in project root)

PM2 configuration for running the app in production with automatic restarts.

```javascript
module.exports = {
  apps: [
    {
      name: 'tradewatch',
      script: 'server/src/index.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        PORT: '3001',
      },
      // Restart if memory usage exceeds 500MB
      max_memory_restart: '500M',
      // Restart on crash with exponential backoff
      exp_backoff_restart_delay: 100,
    },
  ],
};
```

### Step 1.5 — Update `.gitignore`

Ensure build artifacts and environment files are properly ignored but the PM2 config is tracked.

```
# Add to .gitignore
*.db
*.db-wal
*.db-shm
```

### Step 1.6 — Update CORS for production

**File:** `server/src/index.ts`

In production, the frontend is served from the same origin, so we can tighten the CORS configuration.

```typescript
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : '*',
  },
});
```

---

## Phase 2: Oracle Cloud VPS Setup (Manual — Server Side)

### Step 2.1 — Create Oracle Cloud Account & VPS Instance

1. Sign up at [cloud.oracle.com](https://cloud.oracle.com) (credit card required for verification, **never charged** on free tier).
2. Create a **Compute Instance**:
   - Shape: `VM.Standard.A1.Flex` (ARM) — 1 OCPU, 6 GB RAM (free tier allows up to 4 OCPU / 24 GB).
   - Image: **Ubuntu 22.04** (or latest LTS).
   - Download the SSH key pair during creation.
3. In **Networking → Security Lists**, add Ingress Rules to open ports:
   - Port `80` (HTTP)
   - Port `443` (HTTPS)

### Step 2.2 — Initial Server Setup (SSH)

```bash
# SSH into the server
ssh -i ~/path/to/key.pem ubuntu@<server-public-ip>

# Update packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install Git
sudo apt install -y git
```

### Step 2.3 — Clone & Build the App

```bash
# Clone your repo (or scp the code)
cd /home/ubuntu
git clone <your-repo-url> tradewatch
cd tradewatch

# Install dependencies
npm install

# Push the database schema
npm run db:push -w server

# Build the client
npm run build

# Copy .env file for Telegram (if needed)
# nano server/.env
```

### Step 2.4 — Start with PM2

```bash
cd /home/ubuntu/tradewatch

# Start the app
pm2 start ecosystem.config.cjs

# Save the PM2 process list so it auto-starts on reboot
pm2 save

# Generate the startup script (run the command it tells you to)
pm2 startup
```

### Step 2.5 — Configure Nginx Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/tradewatch
```

Paste the following:

```nginx
server {
    listen 80;
    server_name <your-server-ip-or-domain>;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/tradewatch /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test & reload
sudo nginx -t
sudo systemctl reload nginx
```

### Step 2.6 — (Optional) Add HTTPS with Let's Encrypt

If you point a domain at the server:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## Phase 3: Deployment Workflow (Ongoing Updates)

To deploy new changes after the initial setup:

```bash
ssh -i ~/path/to/key.pem ubuntu@<server-public-ip>
cd /home/ubuntu/tradewatch
git pull
npm install
npm run build
pm2 restart tradewatch
```

---

## Progress Checklist

### Phase 1: Code Changes
- [x] **1.1** Express serves Vite static build (`server/src/index.ts`)
- [x] **1.2** Environment variable overrides in config (`server/src/config.ts`)
- [x] **1.3** Root build & start scripts (`package.json`)
- [x] **1.4** PM2 ecosystem config (`ecosystem.config.cjs`)
- [x] **1.5** Update `.gitignore`
- [x] **1.6** Tighten CORS for production (`server/src/index.ts`)

### Phase 2: Server Setup (Manual)
- [x] **2.1** Create Oracle Cloud account & VPS instance
- [x] **2.2** SSH in, install Node.js, PM2, Nginx, Git
- [x] **2.3** Clone repo, install dependencies, build client
- [x] **2.4** Start app with PM2, configure auto-restart
- [x] **2.5** Configure Nginx reverse proxy
- [x] **2.6** (Optional) HTTPS with Let's Encrypt

### Phase 3: Verify
- [x] **3.1** App is accessible via `http://<server-ip>`
- [x] **3.2** WebSocket connections work (chart updates live)
- [x] **3.3** Cron jobs are running (candles fetched hourly)
- [x] **3.4** SQLite database persists across PM2 restarts
