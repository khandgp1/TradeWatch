import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import cron from 'node-cron';
import { config } from './config';
import { db } from './db/connection';
import { candles, signals, engineState } from './db/schema';
import { appEvents } from './services/events';
import { fetchLatestCandles } from './services/candleFetcher';
import { asc, desc, eq, gte, lte, and } from 'drizzle-orm';
import { broadcastSignal } from './services/telegram';


const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : '*',
  },
});

app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// REST API: GET /api/candles
app.get('/api/candles', async (req, res) => {
  try {
    const { from, to } = req.query;
    let conditions = [];
    if (typeof from === 'string') {
      conditions.push(gte(candles.open_time, from));
    }
    if (typeof to === 'string') {
      conditions.push(lte(candles.open_time, to));
    }

    const query = conditions.length > 0 
      ? db.select().from(candles).where(and(...conditions)).orderBy(asc(candles.open_time))
      : db.select().from(candles).orderBy(asc(candles.open_time));

    const results = await query;
    res.json(results);
  } catch (err) {
    console.error('Error fetching candles:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// REST API: GET /api/candles/latest
app.get('/api/candles/latest', async (req, res) => {
  try {
    const limitParam = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const limit = isNaN(limitParam) ? 100 : limitParam;

    const results = await db.select().from(candles).orderBy(desc(candles.open_time)).limit(limit);
    // Reverse to return in chronological order
    res.json(results.reverse());
  } catch (err) {
    console.error('Error fetching latest candles:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// REST API: GET /api/signals
app.get('/api/signals', async (req, res) => {
  try {
    const { status } = req.query;
    const query = typeof status === 'string'
      ? db.select().from(signals).where(eq(signals.status, status as any)).orderBy(asc(signals.start_time))
      : db.select().from(signals).orderBy(asc(signals.start_time));

    const results = await query;
    res.json(results);
  } catch (err) {
    console.error('Error fetching signals:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Socket.IO Wiring
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Bridge appEvents to Socket.IO
appEvents.on('new-candle', (payload) => {
  io.emit('new-candle', payload);
});

appEvents.on('new-signal', (payload) => {
  io.emit('new-signal', payload);
  broadcastSignal(payload.signal);
});

appEvents.on('signal-updated', (payload) => {
  io.emit('signal-updated', payload);
});

// Heartbeat interval for engine-status
setInterval(async () => {
  try {
    const stateRes = await db.select().from(engineState).where(eq(engineState.id, 1));
    const lastProcessed = stateRes.length > 0 ? stateRes[0].last_processed_time : null;

    // Calculate next fetch time (5 seconds past next hour)
    const now = new Date();
    const nextFetchDate = new Date(now);
    nextFetchDate.setHours(now.getHours() + 1, 0, 5, 0);

    io.emit('engine-status', {
      lastProcessed,
      nextFetch: nextFetchDate.toISOString(),
    });
  } catch (err) {
    console.error('Error emitting engine-status:', err);
  }
}, 30000);

// Initialize node-cron for live fetching at 5 seconds past every hour
cron.schedule('5 0 * * * *', () => {
  console.log('Cron triggered: fetching latest candles...');
  fetchLatestCandles();
});

// Serve the Vite-built React frontend in production
if (process.env.NODE_ENV === 'production') {
  const clientDistPath = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDistPath));

  // Catch-all: serve index.html for any non-API route (SPA support)
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

httpServer.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});
