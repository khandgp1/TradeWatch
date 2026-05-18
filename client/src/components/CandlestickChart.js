import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import { TrendShadingPrimitive } from './chart-plugins/TrendShadingPrimitive';
export const CandlestickChart = ({ data, signals, visibleSignalIds }) => {
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);
    const seriesRef = useRef(null);
    const priceLinesRef = useRef(new Map());
    const shadingPrimitiveRef = useRef(null);
    // 1. Initialize Chart ONCE
    useEffect(() => {
        if (!chartContainerRef.current)
            return;
        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: '#131722' },
                textColor: '#d1d4dc',
            },
            grid: {
                vertLines: { color: '#2a2e39' },
                horzLines: { color: '#2a2e39' },
            },
            crosshair: {
                mode: 0,
                vertLine: { width: 1, color: '#758696', style: 3 },
                horzLine: { width: 1, color: '#758696', style: 3 },
            },
            timeScale: {
                borderColor: '#2a2e39',
                timeVisible: true,
                secondsVisible: false,
            },
            rightPriceScale: {
                borderColor: '#2a2e39',
            },
        });
        chartRef.current = chart;
        const series = chart.addCandlestickSeries({
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        });
        seriesRef.current = series;
        previousDataLengthRef.current = 0;
        // Attach custom shading primitive
        const shadingPrimitive = new TrendShadingPrimitive();
        series.attachPrimitive(shadingPrimitive);
        shadingPrimitiveRef.current = shadingPrimitive;
        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight,
                });
            }
        };
        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(chartContainerRef.current);
        return () => {
            resizeObserver.disconnect();
            chart.remove();
        };
    }, []); // Empty dependency array ensures chart is mounted exactly once
    const previousDataLengthRef = useRef(0);
    // 1b. Update Data separately
    useEffect(() => {
        if (seriesRef.current && data.length > 0) {
            if (previousDataLengthRef.current === 0) {
                seriesRef.current.setData(data);
                chartRef.current?.timeScale().fitContent();
            }
            else {
                const lastCandle = data[data.length - 1];
                seriesRef.current.update(lastCandle);
            }
            previousDataLengthRef.current = data.length;
        }
    }, [data]);
    // 2. Synchronize Overlays (Markers, Price Lines, Shading)
    useEffect(() => {
        const series = seriesRef.current;
        if (!series)
            return;
        const getRuleColor = (rule) => {
            switch (rule) {
                case 'Three Green Candles': return '#64b5f6'; // Light blue
                case 'Close Above Prev High': return '#ffb74d'; // Amber
                case 'Close Above Post-Signal Peak': return '#ba68c8'; // Purple
                default: return '#ffffff';
            }
        };
        const getShadingColor = (rule) => {
            switch (rule) {
                case 'Three Green Candles': return 'rgba(100, 181, 246, 0.15)';
                case 'Close Above Prev High': return 'rgba(255, 183, 77, 0.15)';
                case 'Close Above Post-Signal Peak': return 'rgba(186, 104, 200, 0.15)';
                default: return 'rgba(255, 255, 255, 0.15)';
            }
        };
        const markers = [];
        const currentPriceLines = priceLinesRef.current;
        const shadingItems = [];
        // Diff price lines & build markers + shading
        const activeIds = new Set();
        signals.forEach((sig) => {
            if (!visibleSignalIds.has(sig.id))
                return;
            activeIds.add(sig.id);
            const ruleColor = getRuleColor(sig.rule);
            const startTimestampMs = new Date(sig.start_time.replace(' ', 'T') + ':00Z').getTime();
            const startTimeSec = Math.floor(startTimestampMs / 1000);
            // A. Marker
            markers.push({
                time: startTimeSec,
                position: 'belowBar',
                color: ruleColor,
                shape: 'arrowUp',
                text: sig.rule,
            });
            // B. Price Line
            if (!currentPriceLines.has(sig.id)) {
                const priceLine = series.createPriceLine({
                    price: sig.indicator,
                    color: ruleColor,
                    lineWidth: 2,
                    lineStyle: 3, // Dashed
                    title: sig.rule,
                });
                currentPriceLines.set(sig.id, priceLine);
            }
            // C. Shading
            let endTimeSec = startTimeSec;
            if (sig.status === 'Ongoing') {
                // Use last candle time in data if available
                if (data.length > 0) {
                    endTimeSec = data[data.length - 1].time;
                }
            }
            else {
                const endTimestampMs = new Date(sig.end_time.replace(' ', 'T') + ':00Z').getTime();
                endTimeSec = Math.floor(endTimestampMs / 1000);
            }
            shadingItems.push({
                startTime: startTimeSec,
                endTime: endTimeSec,
                color: getShadingColor(sig.rule),
            });
        });
        // Remove unselected price lines
        currentPriceLines.forEach((priceLine, id) => {
            if (!activeIds.has(id)) {
                series.removePriceLine(priceLine);
                currentPriceLines.delete(id);
            }
        });
        // Apply markers
        series.setMarkers(markers);
        // Apply shading
        if (shadingPrimitiveRef.current) {
            shadingPrimitiveRef.current.setData(shadingItems);
        }
    }, [signals, visibleSignalIds, data]);
    return (_jsx("div", { ref: chartContainerRef, style: { width: '100%', height: '100%', position: 'relative' } }));
};
