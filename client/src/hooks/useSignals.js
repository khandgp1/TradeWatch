import { useState, useEffect } from 'react';
export function useSignals() {
    const [signals, setSignals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        async function fetchSignals() {
            try {
                setLoading(true);
                const res = await fetch('/api/signals');
                if (!res.ok) {
                    throw new Error(`Failed to fetch signals: ${res.statusText}`);
                }
                const data = await res.json();
                setSignals(data);
                setError(null);
            }
            catch (err) {
                setError(err.message || 'An unknown error occurred');
            }
            finally {
                setLoading(false);
            }
        }
        fetchSignals();
    }, []);
    return { signals, setSignals, loading, error };
}
