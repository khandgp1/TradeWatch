import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';
import { ChartCandle } from '../hooks/useCandles';

interface CandlestickChartProps {
  data: ChartCandle[];
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({ data }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Initialize chart with dark theme
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
        mode: 0, // Normal mode
        vertLine: {
          width: 1,
          color: '#758696',
          style: 3, // Dashed
        },
        horzLine: {
          width: 1,
          color: '#758696',
          style: 3, // Dashed
        },
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

    // Add Candlestick Series
    const series = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    seriesRef.current = series;

    // Set Data
    series.setData(data as any);

    // Fit content
    chart.timeScale().fitContent();

    // Resize Observer for responsiveness
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
  }, [data]);

  return (
    <div
      ref={chartContainerRef}
      style={{ width: '100%', height: '100%', position: 'relative' }}
    />
  );
};
