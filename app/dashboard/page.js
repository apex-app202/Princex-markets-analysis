'use client';
export const dynamic = 'force-dynamic';


import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { fetchCandles, VOLATILITY_PAIRS } from '@/lib/deriv-feed';
import { runAnalysis } from '@/lib/scoring-engine';

const TIMEFRAMES = ['1m', '5m', '15m', '1h'];

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState(null);
  const [pair, setPair] = useState('R_10');
  const [timeframe, setTimeframe] = useState('5m');
  const [signal, setSignal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoScan, setAutoScan] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.push('/login');
        return;
      }
      const { data: userRow } = await supabase
        .from('users')
        .select('role, is_active, subscription_plan, subscription_end')
        .eq('id', data.user.id)
        .single();

      if (!userRow || (!userRow.is_active && userRow.role !== 'admin')) {
        router.push('/pricing');
        return;
      }
      setProfile(userRow);
    });
  }, []);

  function logSignal(result) {
    if (!result.fires) return;
    fetch('/api/signals/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pair: result.pair,
        direction: result.direction,
        score: result.score,
        tier: result.tier,
        fires: result.fires,
      }),
    }).catch(() => {}); // non-blocking — don't break the UI if logging fails
  }

  // Stability rule: signal card locks once shown, only replaced when the
  // user explicitly requests a new one — no re-render mid-scoring.
  const getSignal = useCallback(async (symbol, tf) => {
    setLoading(true);
    setError('');
    try {
      const candles = await fetchCandles(symbol, tf, 200);
      const result = runAnalysis(symbol, tf, candles);
      if (!result) {
        setError('Not enough candle history to score this pair yet.');
        setLoading(false);
        return null;
      }
      logSignal(result);
      setLoading(false);
      return result;
    } catch (err) {
      setError(err.message || 'Failed to fetch market data');
      setLoading(false);
      return null;
    }
  }, []);

  async function handleGetSignal() {
    const result = await getSignal(pair, timeframe);
    if (result) setSignal(result);
  }

  async function handleAutoScan() {
    setAutoScan(true);
    setScanProgress(0);
    setError('');

    let best = null;
    for (let i = 0; i < VOLATILITY_PAIRS.length; i++) {
      const p = VOLATILITY_PAIRS[i];
      setScanProgress(Math.round(((i + 1) / VOLATILITY_PAIRS.length) * 100));

      const result = await getSignal(p.id, timeframe);
      if (result && result.fires) {
        if (!best || result.score > best.score) best = result;
      }
      // 3-second minimum gap per pair, per stability rules
      await new Promise((r) => setTimeout(r, 3000));
    }

    setAutoScan(false);
    if (best) {
      setSignal(best);
    } else {
      setError('No signal at score 8+ found across scanned pairs.');
    }
  }

  return (
    <main className="min-h-screen px-4 py-6 pb-24 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold">Princex Markets</h1>
        {profile && (
          <div className="text-right text-xs text-white/60">
            {profile.role === 'admin' ? (
              <span className="text-accent">Admin Access</span>
            ) : (
              <>
                <div className="capitalize">{profile.subscription_plan} plan</div>
                <div>
                  Expires{' '}
                  {profile.subscription_end
                    ? new Date(profile.subscription_end).toLocaleDateString()
                    : '—'}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <select
          value={pair}
          onChange={(e) => setPair(e.target.value)}
          disabled={autoScan || loading}
          className="bg-[#111] border border-white/20 rounded-lg px-3 py-2"
        >
          {VOLATILITY_PAIRS.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>

        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          disabled={autoScan || loading}
          className="bg-[#111] border border-white/20 rounded-lg px-3 py-2"
        >
          {TIMEFRAMES.map((tf) => (
            <option key={tf} value={tf}>{tf}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-3 mb-6">
        <button
          onClick={handleGetSignal}
          disabled={loading || autoScan}
          className="flex-1 bg-accent text-black font-bold py-3 rounded-lg disabled:opacity-50"
        >
          {loading ? 'Scanning...' : 'GET SIGNAL'}
        </button>
        <button
          onClick={handleAutoScan}
          disabled={loading || autoScan}
          className="flex-1 border border-accent text-accent font-bold py-3 rounded-lg disabled:opacity-50"
        >
          {autoScan ? `AUTO ${scanProgress}%` : 'AUTO SCAN'}
        </button>
      </div>

      {autoScan && (
        <div className="w-full h-1 bg-white/10 rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${scanProgress}%` }}
          />
        </div>
      )}

      {error && <p className="text-fall text-sm mb-4">{error}</p>}

      <div className="min-h-[420px]">
        {signal && (
          <div
            className={`border-2 rounded-xl p-5 ${
              signal.tier === 'ELITE'
                ? 'border-gold'
                : signal.direction === 'RISE'
                ? 'border-rise'
                : 'border-fall'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="text-xs text-white/50">
                  {VOLATILITY_PAIRS.find((p) => p.id === signal.pair)?.label || signal.pair} · {signal.timeframe}
                </div>
                <div
                  className={`text-3xl font-black ${
                    signal.direction === 'RISE' ? 'text-rise' : 'text-fall'
                  }`}
                >
                  TRADE {signal.direction}
                </div>
              </div>
              {signal.tier === 'ELITE' && (
                <span className="bg-gold text-black text-xs font-bold px-2 py-1 rounded">
                  ELITE
                </span>
              )}
            </div>

            <div className="text-sm text-white/70 mb-4">
              Score: <span className="font-bold text-white">{signal.score}/14</span> · Tier: {signal.tier}
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs mb-4">
              <div className="bg-black/40 rounded p-2">
                <div className="text-white/50">Entry</div>
                <div className="font-bold">{signal.entry.toFixed(4)}</div>
              </div>
              <div className="bg-black/40 rounded p-2">
                <div className="text-white/50">Stop</div>
                <div className="font-bold">{signal.stopLoss.toFixed(4)}</div>
              </div>
              <div className="bg-black/40 rounded p-2">
                <div className="text-white/50">R:R</div>
                <div className="font-bold">{signal.rrRatio ?? '—'}</div>
              </div>
            </div>

            <div className="text-xs text-white/50 mb-1">
              Next 3 candle projection (illustrative — synthetic indices are RNG-driven, not predictable)
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {signal.candleProjection.map((c) => (
                <div key={c.candle} className="bg-black/40 rounded p-2 text-xs text-center">
                  <div className="text-white/50">Candle {c.candle}</div>
                  <div className="text-rise">Rise {c.rise}%</div>
                  <div className="text-fall">Fall {c.fall}%</div>
                </div>
              ))}
            </div>

            <details className="mb-4">
              <summary className="text-xs text-accent cursor-pointer">
                Score breakdown (14 indicators)
              </summary>
              <div className="grid grid-cols-2 gap-1 mt-2 text-xs">
                {signal.breakdown.map((b) => (
                  <div key={b.name} className="flex justify-between bg-black/30 rounded px-2 py-1">
                    <span className="text-white/60">{b.name}</span>
                    <span
                      className={
                        b.direction === 'RISE'
                          ? 'text-rise'
                          : b.direction === 'FALL'
                          ? 'text-fall'
                          : 'text-white/30'
                      }
                    >
                      {b.direction}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-white/40 mt-2">
                Note: Volume indicator always reads SKIP — Deriv synthetic indices have no real trade volume.
              </p>
            </details>

            <a
              href="https://dtrader.deriv.com"
              target="_blank"
              rel="noopener noreferrer"
              className={`block text-center font-bold py-3 rounded-lg ${
                signal.direction === 'RISE' ? 'bg-rise text-black' : 'bg-fall text-white'
              }`}
            >
              OPEN TRADE ON DERIV
            </a>
          </div>
        )}

        {!signal && !loading && !error && (
          <div className="flex items-center justify-center h-[420px] text-white/30 text-sm">
            Select a pair and tap GET SIGNAL
          </div>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-[#111] border-t border-white/10 flex justify-around py-3">
        <a href="/dashboard" className="text-accent text-xs">Analysis</a>
        <a href="/dashboard" className="text-white/50 text-xs">Home</a>
        <a href="/dashboard" className="text-white/50 text-xs">History</a>
        <a href="/dashboard" className="text-white/50 text-xs">Account</a>
      </nav>
    </main>
  );
}
