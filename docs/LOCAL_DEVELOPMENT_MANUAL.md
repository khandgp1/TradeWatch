# Local Development Manual

This guide outlines the commands and procedures required to set up and run the TradeWatch application locally.

## Prerequisites
- **Node.js**: Ensure you have Node.js installed (v18+ recommended).
- **Workspaces**: TradeWatch uses npm workspaces (`shared`, `server`, `client`).

---

## 1. Setup & Installation

Install all dependencies for the entire project workspace (including shared library, frontend, and backend packages):
```bash
npm install
```

---

## 2. Database Initialization

Configure and update the local SQLite database schema using Drizzle. This will automatically create or update the database file located at `server/data/alerting.db`:
```bash
npm run db:push -w server
```

### Reset & Re-initialize Database with Backfill
If you need to completely reset the database (deleting the existing database, pushing the schema, and running the backfill script in a single step):
```bash
clear && rm -f server/data/alerting.db && npm run db:push -w server && npm run backfill -w server
```

---

## 3. Running the Application

To develop locally, run both the backend server and frontend client concurrently. It is recommended to run these in separate terminal windows or tabs.

### A. Run the Backend Server
Start the backend Express server with automatic hot-reloading:
```bash
npm run dev -w server
```
*The backend server will run on port `3001`.*

### B. Run the Frontend Client
Start the Vite development server for the React application:
```bash
npm run dev -w client
```
*The client dev server will run on port `5173` and proxy requests to the backend server at `http://localhost:3001`.*

---

## 4. Helper Scripts

### Data Backfill
Fetch and populate historical candle data (BTC/USDT 1h intervals) from Binance into the SQLite database:
```bash
npm run backfill -w server
```

---

## 5. Local Production Build & Test

To verify production builds locally:

1. **Build the Frontend:**
   ```bash
   npm run build
   ```
2. **Start the Production Server:**
   ```bash
   npm start
   ```
