# Phase 1 — Project Scaffolding

> **Scope:** Initialize the npm workspace monorepo with `server/` and `client/` packages, configure TypeScript across all layers, set up Vite + React for the frontend, Express + ts-node for the backend, and create the shared type definitions that both packages will consume.

> **Reference:** [KICKSTART_IMPLEMENTATION_PLAN.md](../KICKSTART_IMPLEMENTATION_PLAN.md) — Phase 1 (lines 395–401) + Project Structure (lines 96–154) + Tech Stack (lines 20–35)

---

## Context

This is the very first phase of the TradeWatch project — a real-time BTC alerting web application. Nothing exists yet beyond the three blueprint documents (`KICKSTART_IMPLEMENTATION_PLAN.md`, `strategy.md`, `decision_tree.md`). This phase establishes the foundational project structure, build tooling, and shared type contracts that all subsequent phases will build upon.

### Tech Stack (Phase 1 relevant)

| Component | Technology | Version Target |
|---|---|---|
| Runtime | Node.js | v24.14.1 (installed) |
| Package Manager | npm | v11.11.0 (installed) |
| Language | TypeScript | 5.x |
| Frontend | React 18+ via Vite | Latest stable |
| Backend | Express + ts-node | Latest stable |
| Monorepo | npm workspaces | Built-in |

### Target Directory Structure (Phase 1 output)

```
TradeWatch/
├── KICKSTART_IMPLEMENTATION_PLAN.md
├── strategy.md
├── decision_tree.md
├── implementation_plans/
│   └── 00_IMPLEMENTATION_.md          ← this file
│
├── package.json                       ← root workspace config
├── tsconfig.base.json                 ← shared TS config
│
├── shared/
│   └── types.ts                       ← Candle, Signal, EngineState interfaces
│
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       └── index.ts                   ← Express server entry (placeholder)
│
└── client/
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── index.html
    └── src/
        ├── main.tsx                   ← React entry
        ├── App.tsx                    ← Root component (placeholder)
        └── index.css                  ← Global styles + design tokens
```

---

## Implementation Checklist

### 1. Root Workspace Setup
- [x] Create root `package.json` with npm workspaces configured for `shared/`, `server/`, and `client/`
- [x] Create `tsconfig.base.json` with shared TypeScript compiler options (strict mode, ES2022 target, ESM module resolution)

### 2. Shared Types Package
- [x] Create `shared/package.json` (name: `@tradewatch/shared`)
- [x] Create `shared/tsconfig.json` extending `tsconfig.base.json`
- [x] Create `shared/types.ts` with the following interfaces:
  - [x] `Candle` — matches the `candles` DB table schema (id, open_time, open, high, low, close, volume, created_at)
  - [x] `Signal` — matches the `signals` DB table schema (id, start_time, end_time, rule, indicator, indicator_candle_time, status, created_at, updated_at)
  - [x] `EngineState` — matches the `engine_state` DB table schema (id, last_processed_time, rule1_green_streak, rule1_streak_start_index, last_accepted_end, state_json)
  - [x] `SignalRule` — union type: `'Three Green Candles' | 'Close Above Prev High' | 'Close Above Post-Signal Peak'`
  - [x] `SignalStatus` — union type: `'Ongoing' | 'Broken'`
  - [x] Socket.IO event payload types: `NewCandleEvent`, `NewSignalEvent`, `SignalUpdatedEvent`, `EngineStatusEvent`

### 3. Server Package Setup
- [x] Create `server/package.json` (name: `@tradewatch/server`) with dependencies: `express`, `socket.io`, `better-sqlite3`, `drizzle-orm`, `node-cron`
- [x] Create `server/tsconfig.json` extending `tsconfig.base.json` (Node-specific settings)
- [x] Add dev dependencies: `typescript`, `tsx`, `@types/express`, `@types/better-sqlite3`, `@types/node-cron`, `@types/node`
- [x] Create `server/src/index.ts` — minimal Express + Socket.IO server that starts on port 3001 and logs a startup message
- [x] Add `dev` script in `server/package.json` using `tsx watch`

### 4. Client Package Setup
- [x] Initialize Vite + React + TypeScript project in `client/` (non-interactive)
- [x] Configure `vite.config.ts` with dev server proxy to `localhost:3001` for `/api` and `/socket.io` routes
- [x] Add `lightweight-charts` and `socket.io-client` dependencies
- [x] Create `client/src/index.css` with design token foundation (CSS custom properties for dark theme, colors, spacing, typography)
- [x] Create `client/src/App.tsx` — minimal placeholder component that renders the app title
- [x] Verify Vite dev server starts on port 5173

### 5. Install & Verify
- [x] Run `npm install` from root (installs all workspace dependencies)
- [x] Verify server starts: `npm run dev -w server` → Express listening on 3001
- [x] Verify client starts: `npm run dev -w client` → Vite serving on 5173
- [x] Verify shared types are importable from both server and client
- [x] Fix the `decision_tree.md` typo: change `strategy_new.md` → `strategy.md` (line 4)

---

## Acceptance Criteria

1. `npm install` from root succeeds with zero errors
2. `npm run dev -w server` starts Express on port 3001 and logs `Server running on port 3001`
3. `npm run dev -w client` starts Vite on port 5173 and renders a basic page
4. Both `server/` and `client/` can import types from `shared/types.ts` without compilation errors
5. TypeScript strict mode is enabled across all packages with no type errors
6. The `index.css` design token system is in place for dark-theme development in Phase 5+

---

## Notes

- **No database, no API routes, no signal engine** in this phase — those come in Phases 2–3.
- The server `index.ts` is intentionally minimal (health check only). It exists to validate the toolchain.
- The client `App.tsx` is a styled placeholder to validate Vite + React + CSS custom properties work end-to-end.
- The Vite proxy config is set up now so that frontend API calls will work seamlessly once backend routes are added in Phase 4.
