'use client';

import { useEffect, useRef, useState } from 'react';
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  ColorType,
} from 'lightweight-charts';
import { ema, supertrend, vwap, rsi, macd } from '@/lib/indicators';

const OVERLAY_COLORS = {
  ema20: '#38bdf8',
  ema50: '#facc15',
  ema200: '#f472b6',
  supertrend: '#00C853',
  vwap: '#a78bfa',
};

export default function TradingChart({ candles, signal, activeOverlays, showRsi, showMacd }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const overlaySeriesRef = useRef({});
  const rsiSeriesRef = useRef(null);
  const macdLineRef = useRef(null);
  const macdSignalRef = useRef(null);
  const macdHistRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0a0a0a' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.05)' },
        horzLines: { color: 'rgba(255,255,255,0.05)' },
      },
      width: containerRef.current.clientWidth,
      height: 420,
      timeScale: { timeVisible: true, secondsVisible: false },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#00C853',
      downColor: '#FF3B30',
      borderVisible: false,
      wickUpColor: '#00C853',
      wickDownColor: '#FF3B30',
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      overlaySeriesRef.current = {};
      rsiSeriesRef.current = null;
      macdLineRef.current = null;
      macdSignalRef.current = null;
      macdHistRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!candleSeriesRef.current || !candles || candles.length === 0) return;

    const chartData = candles.map((c) => ({
      time: c.epoch,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    candleSeriesRef.current.setData(chartData);

    const closes = candles.map((c) => c.close);

    const overlayDefs = {
      ema20: () => ema(closes, 20),
      ema50: () => ema(closes, 50),
      ema200: () => ema(closes, Math.min(200, closes.length - 1)),
      supertrend: () => supertrend(candles, 10, 3).map((s) => s.value),
      vwap: () => vwap(candles),
    };

    Object.entries(overlayDefs).forEach(([key, computeFn]) => {
      const shouldShow = activeOverlays.includes(key);
      let series = overlaySeriesRef.current[key];

      if (shouldShow && !series) {
        series = chartRef.current.addSeries(LineSeries, {
          color: OVERLAY_COLORS[key],
          lineWidth: 2,
          priceLineVisible: false,
        });
        overlaySeriesRef.current[key] = series;
      }

      if (shouldShow && series) {
        const values = computeFn();
        const lineData = candles
          .map((c, i) => ({ time: c.epoch, value: values[i] }))
          .filter((d) => d.value != null && !isNaN(d.value));
        series.setData(lineData);
      }

      if (!shouldShow && series) {
        chartRef.current.removeSeries(series);
        delete overlaySeriesRef.current[key];
      }
    });

    if (showRsi) {
      if (!rsiSeriesRef.current) {
        rsiSeriesRef.current = chartRef.current.addSeries(
          LineSeries,
          { color: '#38bdf8', lineWidth: 2, priceLineVisible: false },
          1
        );
      }
      const rsiVals = rsi(closes, 14);
      const rsiData = candles
        .map((c, i) => ({ time: c.epoch, value: rsiVals[i] }))
        .filter((d) => d.value != null);
      rsiSeriesRef.current.setData(rsiData);
    } else if (rsiSeriesRef.current) {
      chartRef.current.removeSeries(rsiSeriesRef.current);
      rsiSeriesRef.current = null;
    }

    if (showMacd) {
      const { macdLine, signalLine, histogram } = macd(closes);

      if (!macdHistRef.current) {
        macdHistRef.current = chartRef.current.addSeries(
          HistogramSeries,
          { color: '#4b5563' },
          showRsi ? 2 : 1
        );
      }
      if (!macdLineRef.current) {
        macdLineRef.current = chartRef.current.addSeries(
          LineSeries,
          { color: '#00C853', lineWidth: 1, priceLineVisible: false },
          showRsi ? 2 : 1
        );
      }
      if (!macdSignalRef.current) {
        macdSignalRef.current = chartRef.current.addSeries(
          LineSeries,
          { color: '#FF3B30', lineWidth: 1, priceLineVisible: false },
          showRsi ? 2 : 1
        );
      }

      macdHistRef.current.setData(
        candles
          .map((c, i) => ({
            time: c.epoch,
            value: histogram[i],
            color: histogram[i] >= 0 ? '#0f5132' : '#5c1a1a',
          }))
          .filter((d) => d.value != null && !isNaN(d.value))
      );
      macdLineRef.current.setData(
        candles
          .map((c, i) => ({ time: c.epoch, value: macdLine[i] }))
          .filter((d) => d.value != null && !isNaN(d.value))
      );
      macdSignalRef.current.setData(
        candles
          .map((c, i) => ({ time: c.epoch, value: signalLine[i] }))
          .filter((d) => d.value != null && !isNaN(d.value))
      );
    } else {
      [macdHistRef, macdLineRef, macdSignalRef].forEach((ref) => {
        if (ref.current) {
          chartRef.current.removeSeries(ref.current);
          ref.current = null;
        }
      });
    }
  }, [candles, activeOverlays, showRsi, showMacd]);

  useEffect(() => {
    if (!candleSeriesRef.current || !signal || !candles || candles.length === 0) return;

    const lastCandle = candles[candles.length - 1];
    candleSeriesRef.current.setMarkers([
      {
        time: lastCandle.epoch,
        position: signal.direction === 'RISE' ? 'belowBar' : 'aboveBar',
        color: signal.direction === 'RISE' ? '#00C853' : '#FF3B30',
        shape: signal.direction === 'RISE' ? 'arrowUp' : 'arrowDown',
        text: `${signal.direction} ${signal.score}/14`,
      },
    ]);
  }, [signal, candles]);

  return <div ref={containerRef} className="w-full rounded-xl overflow-hidden border border-white/10" />;
}
