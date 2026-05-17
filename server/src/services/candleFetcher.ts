import { db } from '../db/connection';
import { candles } from '../db/schema';
import { config } from '../config';
import { desc } from 'drizzle-orm';

export interface BinanceCandle {
  open_time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function fetchCandlesFromBinance(startMs: number, endMs: number): Promise<BinanceCandle[]> {
  const results: BinanceCandle[] = [];
  let currentStart = startMs;
  const limit = 1000;

  while (currentStart < endMs) {
    const url = `https://api.binance.us/api/v3/klines?symbol=${config.symbol}&interval=${config.interval}&startTime=${currentStart}&endTime=${endMs}&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Binance API error (${res.status}): ${text}`);
    }

    const data = (await res.json()) as any[][];
    if (data.length === 0) {
      break;
    }

    for (const row of data) {
      const openTimeMs = row[0] as number;
      // Skip if beyond endMs
      if (openTimeMs > endMs) continue;

      results.push({
        open_time: msToUtcString(openTimeMs),
        open: parseFloat(row[1]),
        high: parseFloat(row[2]),
        low: parseFloat(row[3]),
        close: parseFloat(row[4]),
        volume: parseFloat(row[5]),
      });
    }

    const lastCandleMs = data[data.length - 1][0] as number;
    // Advance currentStart to next interval (1 hour = 3600000 ms)
    currentStart = lastCandleMs + 3600000;
  }

  return results;
}

export async function backfill(): Promise<{ fetched: number; inserted: number; range: string }> {
  // Determine start time in ms
  let startMs = new Date(config.startTime + 'Z').getTime();

  // Check last candle in DB to avoid re-fetching
  const lastCandle = await db.select().from(candles).orderBy(desc(candles.open_time)).limit(1);
  if (lastCandle.length > 0) {
    const lastOpenTimeMs = new Date(lastCandle[0].open_time + 'Z').getTime();
    if (lastOpenTimeMs >= startMs) {
      startMs = lastOpenTimeMs + 3600000; // start from next hour
    }
  }

  const endMs = Date.now();
  if (startMs > endMs) {
    return { fetched: 0, inserted: 0, range: 'Already up to date' };
  }

  console.log(`Fetching Binance candles from ${msToUtcString(startMs)} to ${msToUtcString(endMs)}...`);
  const binanceCandles = await fetchCandlesFromBinance(startMs, endMs);

  if (binanceCandles.length === 0) {
    return { fetched: 0, inserted: 0, range: 'No new candles found' };
  }

  let insertedCount = 0;
  const createdAt = new Date().toISOString();

  const valuesToInsert = binanceCandles.map((c) => ({
    open_time: c.open_time,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume,
    created_at: createdAt,
  }));

  if (valuesToInsert.length > 0) {
    const res = await db.insert(candles).values(valuesToInsert).onConflictDoNothing().returning({ id: candles.id });
    insertedCount = res.length;
  }

  const range = `${binanceCandles[0].open_time} to ${binanceCandles[binanceCandles.length - 1].open_time}`;
  return {
    fetched: binanceCandles.length,
    inserted: insertedCount,
    range,
  };
}

function msToUtcString(ms: number): string {
  const d = new Date(ms);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}
