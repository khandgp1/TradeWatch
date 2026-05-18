import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, IPriceLine, SeriesMarker, Time } from 'lightweight-charts';
import { ChartCandle } from '../hooks/useCandles';
import { Signal } from '@tradewatch/shared';
import { TrendShadingPrimitive, ShadingItem } from './chart-plugins/TrendShadingPrimitive';

interface CandlestickChartProps {
  data: ChartCandle[];
  signals: Signal[];
  visibleSignalIds: Set<number>;
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({ data, signals, visibleSignalIds }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const priceLinesRef = useRef<Map<number, IPriceLine>>(new Map());
  const shadingPrimitiveRef = useRef<TrendShadingPrimitive | null>(null);

  // 1. Initialize Chart ONCE
  useEffect(() => {
    if (!chartContainerRef.current) return;

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

  const previousDataLengthRef = useRef<number>(0);

  // 1b. Update Data separately
  useEffect(() => {
    if (seriesRef.current && data.length > 0) {
      if (previousDataLengthRef.current === 0) {
        seriesRef.current.setData(data as any);
        chartRef.current?.timeScale().fitContent();
      } else {
        const lastCandle = data[data.length - 1];
        seriesRef.current.update(lastCandle as any);
      }
      previousDataLengthRef.current = data.length;
    }
  }, [data]);

  // 2. Synchronize Overlays (Markers, Price Lines, Shading)
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;

    const getRuleColor = (rule: string) => {
      switch (rule) {
        case 'Three Green Candles': return 'rgba(100, 181, 246, 0.25)'; // Light blue
        case 'Close Above Prev High': return 'rgba(255, 183, 77, 0.25)'; // Amber
        case 'Close Above Post-Signal Peak': return 'rgba(186, 104, 200, 0.25)'; // Purple
        default: return 'rgba(255, 255, 255, 0.25)';
      }
    };

    const getShadingColor = (rule: string) => {
      switch (rule) {
        case 'Three Green Candles': return 'rgba(100, 181, 246, 0.15)';
        case 'Close Above Prev High': return 'rgba(255, 183, 77, 0.15)';
        case 'Close Above Post-Signal Peak': return 'rgba(186, 104, 200, 0.15)';
        default: return 'rgba(255, 255, 255, 0.15)';
      }
    };

    const markers: SeriesMarker<Time>[] = [];
    const currentPriceLines = priceLinesRef.current;
    const shadingItems: ShadingItem[] = [];

    // Diff price lines & build markers + shading
    const activeIds = new Set<number>();

    signals.forEach((sig) => {
      if (!visibleSignalIds.has(sig.id)) return;
      activeIds.add(sig.id);

      const ruleColor = getRuleColor(sig.rule);
      const startTimestampMs = new Date(sig.start_time.replace(' ', 'T') + ':00Z').getTime();
      const startTimeSec = Math.floor(startTimestampMs / 1000);

      // A. Marker
      markers.push({
        time: startTimeSec as Time,
        position: 'belowBar',
        color: ruleColor,
        shape: 'arrowUp',
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
      } else {
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

  return (
    <div
      ref={chartContainerRef}
      style={{ width: '100%', height: '100%', position: 'relative' }}
    />
  );
};
