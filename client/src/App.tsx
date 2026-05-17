import React from 'react';
import { useCandles } from './hooks/useCandles';
import { useSignals } from './hooks/useSignals';
import { CandlestickChart } from './components/CandlestickChart';

const App: React.FC = () => {
  const { candles, loading: candlesLoading, error: candlesError } = useCandles();
  const { signals, loading: signalsLoading, error: signalsError } = useSignals();

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
              backgroundColor: error ? 'var(--color-broken)' : loading ? '#ffb300' : 'var(--color-ongoing)' 
            }} />
            <span style={{ color: 'var(--text-secondary)' }}>
              {error ? 'Error' : loading ? 'Loading Data...' : 'System Online'}
            </span>
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>
            Signals Loaded: <span style={{ color: '#fff', fontWeight: 500 }}>{signals.length}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, position: 'relative', width: '100%', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
            Loading Candlestick Chart...
          </div>
        ) : error ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-broken)' }}>
            Error: {error}
          </div>
        ) : (
          <CandlestickChart data={candles} />
        )}
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
        <div>Data Source: Binance Official API</div>
        <div>Total Candles: <span style={{ color: '#fff' }}>{candles.length}</span></div>
        <div>Press and drag to pan • Scroll to zoom</div>
      </footer>
    </div>
  );
};

export default App;
