import { useState, useEffect } from 'react';
import { Signal } from '@tradewatch/shared';

export function useSignals() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSignals() {
      try {
        setLoading(true);
        const res = await fetch('/api/signals');
        if (!res.ok) {
          throw new Error(`Failed to fetch signals: ${res.statusText}`);
        }
        const data: Signal[] = await res.json();
        setSignals(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchSignals();
  }, []);

  return { signals, setSignals, loading, error };
}
