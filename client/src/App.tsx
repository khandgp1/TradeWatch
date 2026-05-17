import React, { useState, useEffect } from 'react';
import { useCandles, ChartCandle } from './hooks/useCandles';
import { useSignals } from './hooks/useSignals';
import { useSocket } from './hooks/useSocket';
import { CandlestickChart } from './components/CandlestickChart';
import { SignalPanel } from './components/SignalPanel';
import { Candle, Signal } from '@tradewatch/shared';

const App: React.FC = () => {
  const { candles, setCandles, loading: candlesLoading, error: candlesError } = useCandles();
  const { signals, setSignals, loading: signalsLoading, error: signalsError } = useSignals();
  const { socket, isConnected } = useSocket();

  // Active overlays state
  const [visibleSignalIds, setVisibleSignalIds] = useState<Set<number>>(new Set());
  const [countdown, setCountdown] = useState<string>('');

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
    if (!socket) return;

    const handleNewCandle = (candle: Candle) => {
      const timestampMs = new Date(candle.open_time.replace(' ', 'T') + ':00Z').getTime();
      const newChartCandle: ChartCandle = {
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

    const handleNewSignal = (signal: Signal) => {
      setSignals((prev) => {
        if (prev.some((s) => s.id === signal.id)) return prev;
        return [...prev, signal];
      });

      // Auto-enable overlay for new signal
      setVisibleSignalIds((prev) => new Set(prev).add(signal.id));
    };

    const handleSignalUpdated = (updatedSignal: Signal) => {
      setSignals((prev) =>
        prev.map((s) => (s.id === updatedSignal.id ? updatedSignal : s))
      );
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

  const toggleSignal = (id: number) => {
    setVisibleSignalIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAllSignals = (show: boolean) => {
    if (show) {
      setVisibleSignalIds(new Set(signals.map(s => s.id)));
    } else {
      setVisibleSignalIds(new Set());
    }
  };

  const loading = candlesLoading || signalsLoading;
  const error = candlesError || signalsError;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <header style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '0.75rem 1.5rem', 
        backgroundColor: 'var(--bg-secondary)', 
        borderBottom: '1px solid var(--border-color)',
        flexShrink: 0 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.25rem', color: '#fff', fontWeight: 600 }}>TradeWatch</h1>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>|</span>
          <span style={{ color: 'var(--text-primary)', fontSize: '0.875rem' }}>BTCUSDT (1h)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.875rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              backgroundColor: error ? 'var(--color-broken)' : !isConnected ? '#ffb300' : 'var(--color-ongoing)' 
            }} />
            <span style={{ color: 'var(--text-secondary)' }}>
              {error ? 'Error' : !isConnected ? 'Connecting Live Stream...' : 'Live Stream Active'}
            </span>
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>
            Signals Loaded: <span style={{ color: '#fff', fontWeight: 500 }}>{signals.length}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area (Flex row with Chart on left and Panel on right) */}
      <main style={{ flex: 1, display: 'flex', width: '100%', overflow: 'hidden' }}>
        {/* Left: Candlestick Chart */}
        <div style={{ flex: 1, position: 'relative', height: '100%', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
              Loading Candlestick Chart...
            </div>
          ) : error ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-broken)' }}>
              Error: {error}
            </div>
          ) : (
            <CandlestickChart 
              data={candles} 
              signals={signals} 
              visibleSignalIds={visibleSignalIds} 
            />
          )}
        </div>

        {/* Right: Signal Panel */}
        <SignalPanel 
          signals={signals}
          visibleSignalIds={visibleSignalIds}
          onToggleVisibility={toggleSignal}
          onToggleAll={toggleAllSignals}
        />
      </main>

      {/* Footer */}
      <footer style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '0.5rem 1.5rem', 
        backgroundColor: 'var(--bg-secondary)', 
        borderTop: '1px solid var(--border-color)',
        fontSize: '0.75rem',
        color: 'var(--text-secondary)',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <span>Data Source: Binance Official API</span>
          <span>Total Candles: <span style={{ color: '#fff' }}>{candles.length}</span></span>
        </div>
        <div>Press and drag to pan • Scroll to zoom • Select signals on the right to toggle overlays</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ 
            width: '6px', 
            height: '6px', 
            borderRadius: '50%', 
            backgroundColor: isConnected ? 'var(--color-ongoing)' : '#ffb300' 
          }} />
          <span>Next Hourly Fetch in: <span style={{ color: '#fff', fontWeight: 500 }}>{countdown}</span></span>
        </div>
      </footer>
    </div>
  );
};

export default App;
