'use client';

import { useEffect, useRef } from 'react';
import { createChart, CandlestickSeries, LineSeries, HistogramSeries, ColorType } from 'lightweight-charts';
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
    let chart;
    try {
      chart = createChart(containerRef.current, {
        layout: { background: { type: ColorType.Solid, color: '#0a0a0a' }, textColor: '#9ca3af' },
        grid: {
          vertLines: { color: 'rgba(255,255,255,0.05)' },
          horzLines: { color: 'rgba(255,255,255,0.05)' },
        },
        width: containerRef.current.clientWidth || 320,
        height: 420,
        timeScale: { timeVisible: true, secondsVisible: false },
        rightPriceScale: { scaleMargins: { top: 0.1, bottom: 0.35 } },
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
    } catch (e) {
      console.error('Chart init failed:', e);
      return;
    }

    const handleResize = () => {
      try {
        if (containerRef.current && chartRef.current) {
          chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
        }
      } catch (e) {}
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      try {
        chart.remove();
      } catch (e) {}
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

    try {
      const chartData = candles.map((c) => ({
        time: c.epoch, open: c.open, high: c.high, low: c.low, close: c.close,
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
            color: OVERLAY_COLORS[key], lineWidth: 2, priceLineVisible: false,
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

      // RSI on its own scale, pinned to bottom band of the same pane
      if (showRsi) {
        if (!rsiSeriesRef.current) {
          rsiSeriesRef.current = chartRef.current.addSeries(LineSeries, {
            color: '#38bdf8', lineWidth: 2, priceLineVisible: false,
            priceScaleId: 'rsi',
          });
          chartRef.current.priceScale('rsi').applyOptions({
            scaleMargins: { top: 0.75, bottom: 0.15 },
          });
        }
        const rsiVals = rsi(closes, 14);
        rsiSeriesRef.current.setData(
          candles.map((c, i) => ({ time: c.epoch, value: rsiVals[i] })).filter((d) => d.value != null)
        );
      } else if (rsiSeriesRef.current) {
        chartRef.current.removeSeries(rsiSeriesRef.current);
        rsiSeriesRef.current = null;
      }

      // MACD on its own scale, pinned even lower
      if (showMacd) {
        const { macdLine, signalLine, histogram } = macd(closes);

        if (!macdHistRef.current) {
          macdHistRef.current = chartRef.current.addSeries(HistogramSeries, {
            color: '#4b5563', priceScaleId: 'macd',
          });
          chartRef.current.priceScale('macd').applyOptions({
            scaleMargins: { top: 0.92, bottom: 0 },
          });
        }
        if (!macdLineRef.current) {
          macdLineRef.current = chartRef.current.addSeries(LineSeries, {
            color: '#00C853', lineWidth: 1, priceLineVisible: false, priceScaleId: 'macd',
          });
        }
        if (!macdSignalRef.current) {
          macdSignalRef.current = chartRef.current.addSeries(LineSeries, {
            color: '#FF3B30', lineWidth: 1, priceLineVisible: false, priceScaleId: 'macd',
          });
        }

        macdHistRef.current.setData(
          candles.map((c, i) => ({
            time: c.epoch, value: histogram[i],
            color: histogram[i] >= 0 ? '#0f5132' : '#5c1a1a',
          })).filter((d) => d.value != null && !isNaN(d.value))
        );
        macdLineRef.current.setData(
          candles.map((c, i) => ({ time: c.epoch, value: macdLine[i] })).filter((d) => d.value != null && !isNaN(d.value))
        );
        macdSignalRef.current.setData(
          candles.map((c, i) => ({ time: c.epoch, value: signalLine[i] })).filter((d) => d.value != null && !isNaN(d.value))
        );
      } else {
        [macdHistRef, macdLineRef, macdSignalRef].forEach((ref) => {
          if (ref.current) {
            chartRef.current.removeSeries(ref.current);
            ref.current = null;
          }
        });
      }
    } catch (e) {
      console.error('Chart data update failed:', e);
    }
  }, [candles, activeOverlays, showRsi, showMacd]);

  useEffect(() => {
    if (!candleSeriesRef.current || !signal || !candles || candles.length === 0) return;
    try {
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
    } catch (e) {
      console.error('Marker set failed:', e);
    }
  }, [signal, candles]);

  return <div ref={containerRef} className="w-full rounded-xl overflow-hidden border border-white/10" />;
}
