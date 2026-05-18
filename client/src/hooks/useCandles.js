import { useState, useEffect } from 'react';
export function useCandles() {
    const [candles, setCandles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        async function fetchCandles() {
            try {
                setLoading(true);
                const res = await fetch('/api/candles');
                if (!res.ok) {
                    throw new Error(`Failed to fetch candles: ${res.statusText}`);
                }
                const data = await res.json();
                const formatted = data.map((c) => {
                    // Parse YYYY-MM-DD HH:MM as UTC with T separator for Safari
                    const timestampMs = new Date(c.open_time.replace(' ', 'T') + ':00Z').getTime();
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
            }
            catch (err) {
                setError(err.message || 'An unknown error occurred');
            }
            finally {
                setLoading(false);
            }
        }
        fetchCandles();
    }, []);
    return { candles, setCandles, loading, error };
}
