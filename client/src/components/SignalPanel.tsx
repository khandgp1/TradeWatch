import React, { useState } from 'react';
import { Signal } from '@tradewatch/shared';

interface SignalPanelProps {
  signals: Signal[];
  visibleSignalIds: Set<number>;
  onToggleVisibility: (id: number) => void;
  onToggleAll: (show: boolean) => void;
}

export const SignalPanel: React.FC<SignalPanelProps> = ({
  signals,
  visibleSignalIds,
  onToggleVisibility,
  onToggleAll,
}) => {
  const [filter, setFilter] = useState<'All' | 'Ongoing' | 'Broken'>('All');

  const filteredSignals = signals.filter((sig) => {
    if (filter === 'Ongoing') return sig.status === 'Ongoing';
    if (filter === 'Broken') return sig.status === 'Broken';
    return true;
  });

  const allVisible = signals.length > 0 && signals.every((sig) => visibleSignalIds.has(sig.id));

  const getRuleColor = (rule: string) => {
    switch (rule) {
      case 'Three Green Candles':
        return 'var(--color-rule1)';
      case 'Close Above Prev High':
        return 'var(--color-rule2)';
      case 'Close Above Post-Signal Peak':
        return 'var(--color-rule3)';
      default:
        return '#fff';
    }
  };

  return (
    <div style={{
      width: '380px',
      height: '100%',
      backgroundColor: 'var(--bg-secondary)',
      borderLeft: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      overflow: 'hidden',
    }}>
      {/* Panel Header */}
      <div style={{
        padding: '1rem',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: '1.125rem', color: '#fff', fontWeight: 600 }}>Detected Signals</h2>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
            <input
              type="checkbox"
              checked={allVisible}
              onChange={(e) => onToggleAll(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Toggle All Overlays
          </label>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: 'var(--bg-primary)', padding: '0.25rem', borderRadius: '6px' }}>
          {(['All', 'Ongoing', 'Broken'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              style={{
                flex: 1,
                padding: '0.375rem 0',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: filter === tab ? 'var(--bg-card)' : 'transparent',
                color: filter === tab ? '#fff' : 'var(--text-secondary)',
                fontSize: '0.8125rem',
                fontWeight: filter === tab ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {tab} ({signals.filter(s => tab === 'All' ? true : s.status === tab).length})
            </button>
          ))}
        </div>
      </div>

      {/* Signals List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}>
        {filteredSignals.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0', fontSize: '0.875rem' }}>
            No signals match the selected filter.
          </div>
        ) : (
          filteredSignals.map((sig) => {
            const isVisible = visibleSignalIds.has(sig.id);
            const ruleColor = getRuleColor(sig.rule);

            return (
              <div
                key={sig.id}
                onClick={() => onToggleVisibility(sig.id)}
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: '6px',
                  padding: '0.875rem',
                  border: `1px solid ${isVisible ? ruleColor : 'var(--border-color)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={isVisible}
                      onChange={() => {}} // handled by parent div onClick
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ color: ruleColor, fontWeight: 600, fontSize: '0.875rem' }}>
                      {sig.rule}
                    </span>
                  </div>
                  <span style={{
                    padding: '0.125rem 0.5rem',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    backgroundColor: sig.status === 'Ongoing' ? 'rgba(0, 200, 83, 0.15)' : 'rgba(255, 61, 0, 0.15)',
                    color: sig.status === 'Ongoing' ? 'var(--color-ongoing)' : 'var(--color-broken)',
                  }}>
                    {sig.status}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Indicator Level:</span>
                  <span style={{ color: '#fff', fontWeight: 600 }}>${sig.indicator.toFixed(2)}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <span>Start: {sig.start_time}</span>
                  <span>End: {sig.status === 'Ongoing' ? 'Active' : sig.end_time}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Summary Footer */}
      <div style={{
        padding: '0.75rem 1rem',
        borderTop: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-primary)',
        fontSize: '0.75rem',
        color: 'var(--text-secondary)',
        display: 'flex',
        justifyContent: 'space-between',
      }}>
        <span>Showing {filteredSignals.length} of {signals.length} signals</span>
        <span>{visibleSignalIds.size} Overlays Active</span>
      </div>
    </div>
  );
};
