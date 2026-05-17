import { useState, useEffect } from 'react';
import { Candle } from '@tradewatch/shared';

export interface ChartCandle {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  originalTime: string;
}

export function useCandles() {
  const [candles, setCandles] = useState<ChartCandle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCandles() {
      try {
        setLoading(true);
        const res = await fetch('/api/candles');
        if (!res.ok) {
          throw new Error(`Failed to fetch candles: ${res.statusText}`);
        }
        const data: Candle[] = await res.json();

        const formatted: ChartCandle[] = data.map((c) => {
          // Parse YYYY-MM-DD HH:MM as UTC
          const timestampMs = new Date(c.open_time + ':00Z').getTime();
          return {
            time: Math.floor(timestampMs / 1000),
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            originalTime: c.open_time,
          };
        });

        setCandles(formatted);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchCandles();
  }, []);

  return { candles, loading, error };
}
