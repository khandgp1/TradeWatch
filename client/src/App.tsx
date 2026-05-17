import React from 'react';
import { Candle } from '@tradewatch/shared';

const App: React.FC = () => {
  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.75rem', color: '#fff' }}>TradeWatch</h1>
        <p style={{ margin: '0.5rem 0 0', color: 'var(--text-secondary)' }}>
          Real-Time BTC Alerting & Candlestick Charting System
        </p>
      </header>
      <main style={{ backgroundColor: 'var(--bg-secondary)', padding: '2rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.25rem', color: '#fff' }}>System Scaffolding Complete</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Frontend client, Express backend server, and shared TypeScript types have been successfully initialized.
        </p>
      </main>
    </div>
  );
};

export default App;
