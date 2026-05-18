import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export const SignalPanel = ({ signals, visibleSignalIds, onToggleVisibility, onSelectFocus, }) => {
    const [filter, setFilter] = useState('All');
    const [focusedSignalId, setFocusedSignalId] = useState(null);
    const handleTabChange = (tab) => {
        setFilter(tab);
        setFocusedSignalId(null);
    };
    const filteredSignals = signals
        .filter((sig) => {
        if (filter === 'Ongoing')
            return sig.status === 'Ongoing';
        if (filter === 'Broken')
            return sig.status === 'Broken';
        return true;
    })
        .sort((a, b) => b.start_time.localeCompare(a.start_time));
    const handleNext = () => {
        if (filteredSignals.length === 0)
            return;
        if (focusedSignalId === null) {
            const oldestSig = filteredSignals[filteredSignals.length - 1];
            onSelectFocus(null, oldestSig.id);
            setFocusedSignalId(oldestSig.id);
        }
        else {
            const currentIndex = filteredSignals.findIndex((s) => s.id === focusedSignalId);
            if (currentIndex === -1) {
                const oldestSig = filteredSignals[filteredSignals.length - 1];
                onSelectFocus(null, oldestSig.id);
                setFocusedSignalId(oldestSig.id);
            }
            else if (currentIndex > 0) {
                const nextSig = filteredSignals[currentIndex - 1];
                onSelectFocus(focusedSignalId, nextSig.id);
                setFocusedSignalId(nextSig.id);
            }
        }
    };
    const isNextDisabled = filteredSignals.length === 0 ||
        (focusedSignalId !== null && filteredSignals.findIndex(s => s.id === focusedSignalId) === 0);
    const getRuleColor = (rule) => {
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
    return (_jsxs("div", { style: {
            width: '380px',
            height: '100%',
            backgroundColor: 'var(--bg-secondary)',
            borderLeft: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            overflow: 'hidden',
        }, children: [_jsxs("div", { style: {
                    padding: '1rem',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsx("h2", { style: { margin: 0, fontSize: '1.125rem', color: '#fff', fontWeight: 600 }, children: "Detected Signals" }), _jsx("button", { onClick: handleNext, disabled: isNextDisabled, style: {
                                    padding: '0.375rem 0.75rem',
                                    backgroundColor: isNextDisabled ? 'var(--bg-primary)' : 'var(--color-ongoing)',
                                    color: isNextDisabled ? 'var(--text-secondary)' : '#fff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: '0.8125rem',
                                    fontWeight: 600,
                                    cursor: isNextDisabled ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                    opacity: isNextDisabled ? 0.6 : 1,
                                }, children: "Next" })] }), _jsx("div", { style: { display: 'flex', gap: '0.5rem', backgroundColor: 'var(--bg-primary)', padding: '0.25rem', borderRadius: '6px' }, children: ['All', 'Ongoing', 'Broken'].map((tab) => (_jsxs("button", { onClick: () => handleTabChange(tab), style: {
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
                            }, children: [tab, " (", signals.filter(s => tab === 'All' ? true : s.status === tab).length, ")"] }, tab))) })] }), _jsx("div", { style: {
                    flex: 1,
                    overflowY: 'auto',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                }, children: filteredSignals.length === 0 ? (_jsx("div", { style: { textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0', fontSize: '0.875rem' }, children: "No signals match the selected filter." })) : (filteredSignals.map((sig) => {
                    const isVisible = visibleSignalIds.has(sig.id);
                    const isFocused = sig.id === focusedSignalId;
                    const ruleColor = getRuleColor(sig.rule);
                    return (_jsxs("div", { onClick: () => {
                            onToggleVisibility(sig.id);
                            if (isVisible) {
                                if (isFocused) {
                                    setFocusedSignalId(null);
                                }
                            }
                            else {
                                setFocusedSignalId(sig.id);
                            }
                        }, style: {
                            backgroundColor: isFocused ? 'rgba(255, 255, 255, 0.08)' : 'var(--bg-card)',
                            borderRadius: '6px',
                            padding: '0.875rem',
                            border: `1px solid ${isVisible ? ruleColor : 'var(--border-color)'}`,
                            boxShadow: isFocused ? '0 0 0 2px var(--color-ongoing)' : 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem',
                            position: 'relative',
                        }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '0.5rem' }, children: [_jsx("input", { type: "checkbox", checked: isVisible, onChange: () => { }, style: { cursor: 'pointer' } }), _jsx("span", { style: { color: ruleColor, fontWeight: 600, fontSize: '0.875rem' }, children: sig.rule })] }), _jsx("span", { style: {
                                            padding: '0.125rem 0.5rem',
                                            borderRadius: '12px',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            backgroundColor: sig.status === 'Ongoing' ? 'rgba(0, 200, 83, 0.15)' : 'rgba(255, 61, 0, 0.15)',
                                            color: sig.status === 'Ongoing' ? 'var(--color-ongoing)' : 'var(--color-broken)',
                                        }, children: sig.status })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8125rem' }, children: [_jsx("span", { style: { color: 'var(--text-secondary)' }, children: "Indicator Level:" }), _jsxs("span", { style: { color: '#fff', fontWeight: 600 }, children: ["$", sig.indicator.toFixed(2)] })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }, children: [_jsxs("span", { children: ["Start: ", sig.start_time] }), _jsxs("span", { children: ["End: ", sig.status === 'Ongoing' ? 'Active' : sig.end_time] })] })] }, sig.id));
                })) }), _jsxs("div", { style: {
                    padding: '0.75rem 1rem',
                    borderTop: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    justifyContent: 'space-between',
                }, children: [_jsxs("span", { children: ["Showing ", filteredSignals.length, " of ", signals.length, " signals"] }), _jsxs("span", { children: [visibleSignalIds.size, " Overlays Active"] })] })] }));
};
