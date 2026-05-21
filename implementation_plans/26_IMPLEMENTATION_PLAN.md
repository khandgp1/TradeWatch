# Implementation Plan 26: Production Code Changes (Phase 1)

## Objective

This plan focuses exclusively on preparing the TradeWatch monorepo codebase for production deployment. These changes will enable the Express server to serve the React frontend statically, handle environment variables for configuration, and set up process management (PM2) and build scripts.

## Step-by-Step Instructions

### Step 1: Express static file serving & CORS (server/src/index.ts)

We need to update the Express server to serve the compiled Vite frontend when running in production, and tighten the CORS policy.

1.  **Import Path Utilities**:
    At the top of the file, add imports for `path` and `fileURLToPath`:
    ```typescript
    import path from 'node:path';
    import { fileURLToPath } from 'node:url';

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    ```

2.  **Update CORS Policy**:
    Modify the `Server` initialization to disable wildcard CORS in production:
    ```typescript
    const io = new Server(httpServer, {
      cors: {
        origin: process.env.NODE_ENV === 'production' ? false : '*',
      },
    });
    ```

3.  **Serve Static Files**:
    Just before `httpServer.listen(...)` at the bottom of the file, add the static serving logic:
    ```typescript
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

### Step 2: Environment Variables in Config (server/src/config.ts)

Allow configuration values to be overridden by environment variables so they don't have to be hardcoded on the VPS.

1.  Update the `config` object:
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

### Step 3: Root Build and Start Scripts (package.json)

Add scripts to the root `package.json` to make building and running the app in production easy.

1.  Update the `"scripts"` block in the root `/package.json`:
    ```json
    "scripts": {
      "build": "npm run build -w client",
      "start": "NODE_ENV=production node --import tsx server/src/index.ts"
    }
    ```

### Step 4: PM2 Ecosystem Config (ecosystem.config.cjs)

Create the PM2 configuration file in the project root to manage the background process on the server.

1.  Create `ecosystem.config.cjs` in the root directory:
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

### Step 5: .gitignore Update (.gitignore)

Ensure that temporary SQLite files are not committed to source control.

1.  Add the following lines to `.gitignore`:
    ```
    *.db
    *.db-wal
    *.db-shm
    ```

---

## Progress Checklist

- [ ] **Step 1:** Update `server/src/index.ts` with static serving logic and tighter CORS.
- [ ] **Step 2:** Update `server/src/config.ts` to use environment variables.
- [ ] **Step 3:** Add `build` and `start` scripts to root `package.json`.
- [ ] **Step 4:** Create `ecosystem.config.cjs` in the root folder.
- [ ] **Step 5:** Add SQLite temp files to `.gitignore`.
