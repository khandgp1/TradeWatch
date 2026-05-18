import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useCandles } from './hooks/useCandles';
import { useSignals } from './hooks/useSignals';
import { useSocket } from './hooks/useSocket';
import { CandlestickChart } from './components/CandlestickChart';
import { SignalPanel } from './components/SignalPanel';
const App = () => {
    const { candles, setCandles, loading: candlesLoading, error: candlesError } = useCandles();
    const { signals, setSignals, loading: signalsLoading, error: signalsError } = useSignals();
    const { socket, isConnected } = useSocket();
    // Active overlays state
    const [visibleSignalIds, setVisibleSignalIds] = useState(new Set());
    const [countdown, setCountdown] = useState('');
    // Timer for next hourly update
    useEffect(() => {
        const updateCountdown = () => {
            const now = new Date();
            const nextHour = new Date();
            nextHour.setHours(now.getHours() + 1, 0, 0, 0);
            const diffMs = nextHour.getTime() - now.getTime();
            const minutes = Math.floor(diffMs / (1000 * 60));
            const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
            setCountdown(`${minutes}m ${seconds}s`);
        };
        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, []);
    // Socket event listeners
    useEffect(() => {
        if (!socket)
            return;
        const handleNewCandle = (event) => {
            const { candle } = event;
            const timestampMs = new Date(candle.open_time.replace(' ', 'T') + ':00Z').getTime();
            const newChartCandle = {
                time: Math.floor(timestampMs / 1000),
                open: candle.open,
                high: candle.high,
                low: candle.low,
                close: candle.close,
                originalTime: candle.open_time,
            };
            setCandles((prev) => {
                const filtered = prev.filter((c) => c.time !== newChartCandle.time);
                return [...filtered, newChartCandle];
            });
        };
        const handleNewSignal = (event) => {
            const { signal } = event;
            setSignals((prev) => {
                if (prev.some((s) => s.id === signal.id))
                    return prev;
                return [...prev, signal];
            });
            // Auto-enable overlay for new signal
            setVisibleSignalIds((prev) => new Set(prev).add(signal.id));
        };
        const handleSignalUpdated = (event) => {
            setSignals((prev) => prev.map((s) => (s.id === event.id ? { ...s, status: event.status, end_time: event.end_time } : s)));
        };
        socket.on('new-candle', handleNewCandle);
        socket.on('new-signal', handleNewSignal);
        socket.on('signal-updated', handleSignalUpdated);
        return () => {
            socket.off('new-candle', handleNewCandle);
            socket.off('new-signal', handleNewSignal);
            socket.off('signal-updated', handleSignalUpdated);
        };
    }, [socket, setCandles, setSignals]);
    const toggleSignal = (id) => {
        setVisibleSignalIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            }
            else {
                next.add(id);
            }
            return next;
        });
    };
    const selectFocusSignal = (oldId, newId) => {
        setVisibleSignalIds((prev) => {
            const next = new Set(prev);
            if (oldId !== null) {
                next.delete(oldId);
            }
            next.add(newId);
            return next;
        });
    };
    const loading = candlesLoading || signalsLoading;
    const error = candlesError || signalsError;
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', backgroundColor: 'var(--bg-primary)' }, children: [_jsxs("header", { style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1.5rem',
                    backgroundColor: 'var(--bg-secondary)',
                    borderBottom: '1px solid var(--border-color)',
                    flexShrink: 0
                }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '1rem' }, children: [_jsx("h1", { style: { margin: 0, fontSize: '1.25rem', color: '#fff', fontWeight: 600 }, children: "TradeWatch" }), _jsx("span", { style: { color: 'var(--text-secondary)', fontSize: '0.875rem' }, children: "|" }), _jsx("span", { style: { color: 'var(--text-primary)', fontSize: '0.875rem' }, children: "BTCUSDT (1h)" })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.875rem' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '0.5rem' }, children: [_jsx("span", { style: {
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            backgroundColor: error ? 'var(--color-broken)' : !isConnected ? '#ffb300' : 'var(--color-ongoing)'
                                        } }), _jsx("span", { style: { color: 'var(--text-secondary)' }, children: error ? 'Error' : !isConnected ? 'Connecting Live Stream...' : 'Live Stream Active' })] }), _jsxs("div", { style: { color: 'var(--text-secondary)' }, children: ["Signals Loaded: ", _jsx("span", { style: { color: '#fff', fontWeight: 500 }, children: signals.length })] })] })] }), _jsxs("main", { style: { flex: 1, display: 'flex', width: '100%', overflow: 'hidden' }, children: [_jsx("div", { style: { flex: 1, position: 'relative', height: '100%', overflow: 'hidden' }, children: loading ? (_jsx("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }, children: "Loading Candlestick Chart..." })) : error ? (_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-broken)' }, children: ["Error: ", error] })) : (_jsx(CandlestickChart, { data: candles, signals: signals, visibleSignalIds: visibleSignalIds })) }), _jsx(SignalPanel, { signals: signals, visibleSignalIds: visibleSignalIds, onToggleVisibility: toggleSignal, onSelectFocus: selectFocusSignal })] }), _jsxs("footer", { style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 1.5rem',
                    backgroundColor: 'var(--bg-secondary)',
                    borderTop: '1px solid var(--border-color)',
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    flexShrink: 0
                }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '1.5rem' }, children: [_jsx("span", { children: "Data Source: Binance Official API" }), _jsxs("span", { children: ["Total Candles: ", _jsx("span", { style: { color: '#fff' }, children: candles.length })] })] }), _jsx("div", { children: "Press and drag to pan \u2022 Scroll to zoom \u2022 Select signals on the right to toggle overlays" }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '0.5rem' }, children: [_jsx("span", { style: {
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    backgroundColor: isConnected ? 'var(--color-ongoing)' : '#ffb300'
                                } }), _jsxs("span", { children: ["Next Hourly Fetch in: ", _jsx("span", { style: { color: '#fff', fontWeight: 500 }, children: countdown })] })] })] })] }));
};
export default App;
