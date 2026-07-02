import {
  ema,
  atr,
  supertrend,
  vwap,
  rsi,
  macd,
  alligator,
  detectBOS,
  detectCHoCH,
  findOrderBlock,
  findFVG,
  algoAlphaCloud,
  sniperBias,
  volumeSpike,
  detectCandlePattern,
} from './indicators';

// candles: confirmed closed candles only, oldest -> newest.
// Returns null if there isn't enough history to score reliably.
export function runAnalysis(pair, timeframe, candles) {
  if (!candles || candles.length < 60) return null;

  const closes = candles.map((c) => c.close);
  const last = candles[candles.length - 1];

  let riseVotes = 0;
  let fallVotes = 0;
  const breakdown = [];

  function vote(name, direction) {
    if (direction === 'RISE') riseVotes++;
    else if (direction === 'FALL') fallVotes++;
    breakdown.push({ name, direction: direction || 'SKIP' });
  }

  // 1. EMA Alignment
  const ema20 = ema(closes, 20).at(-1);
  const ema50 = ema(closes, 50).at(-1);
  const ema200 = ema(closes, Math.min(200, closes.length - 1)).at(-1);
  vote('EMA Alignment', ema20 > ema50 && ema50 > ema200 ? 'RISE' : ema20 < ema50 && ema50 < ema200 ? 'FALL' : null);

  // 2. Supertrend
  const st = supertrend(candles, 10, 3).at(-1);
  vote('Supertrend', st.trend === 1 ? 'RISE' : 'FALL');

  // 3. VWAP
  const vwapVal = vwap(candles).at(-1);
  vote('VWAP', last.close > vwapVal ? 'RISE' : 'FALL');

  // 4. BOS
  vote('BOS', detectBOS(candles));

  // 5. CHoCH
  vote('CHoCH', detectCHoCH(candles));

  // 6. Order Block — checked in the direction the majority so far favors
  const leaningDir = riseVotes >= fallVotes ? 'RISE' : 'FALL';
  vote('Order Block', findOrderBlock(candles, leaningDir) ? leaningDir : null);

  // 7. Fair Value Gap
  vote('Fair Value Gap', findFVG(candles, leaningDir) ? leaningDir : null);

  // 8. AlgoAlpha Cloud
  const cloud = algoAlphaCloud(closes);
  vote('AlgoAlpha Cloud', cloud.expanding ? cloud.direction : null);

  // 9. Sniper Bias
  vote('Sniper Bias', sniperBias(candles, closes));

  // 10. RSI
  const rsiVal = rsi(closes, 14).at(-1);
  vote('RSI', rsiVal > 50 ? 'RISE' : 'FALL');

  // 11. MACD
  const { histogram } = macd(closes);
  const hNow = histogram.at(-1);
  const hPrev = histogram.at(-2);
  vote('MACD', hPrev <= 0 && hNow > 0 ? 'RISE' : hPrev >= 0 && hNow < 0 ? 'FALL' : hNow > 0 ? 'RISE' : hNow < 0 ? 'FALL' : null);

  // 12. Alligator
  const gator = alligator(candles);
  const lips = gator.lips.at(-1);
  const teeth = gator.teeth.at(-1);
  const jaw = gator.jaw.at(-1);
  if (lips != null && teeth != null && jaw != null) {
    if (lips > teeth && teeth > jaw) vote('Alligator', 'RISE');
    else if (lips < teeth && teeth < jaw) vote('Alligator', 'FALL');
    else vote('Alligator', null); // tangled = skip
  } else {
    vote('Alligator', null);
  }

  // 13. Volume
  const volSpike = volumeSpike(candles, 20);
  vote('Volume', volSpike ? leaningDir : null);

  // 14. Candlestick Pattern
  const candlePattern = detectCandlePattern(candles);
  vote('Candlestick Pattern', candlePattern ? candlePattern.direction : null);

  const direction = riseVotes >= fallVotes ? 'RISE' : 'FALL';
  const score = direction === 'RISE' ? riseVotes : fallVotes;

  let tier = 'NONE';
  if (score >= 11) tier = 'ELITE';
  else if (score >= 8) tier = 'STRONG';
  else if (score >= 6) tier = 'WEAK';

  const fires = score >= 8;

  // Risk levels
  const atrVal = atr(candles, 10).at(-1);
  const entry = last.close;
  const stopLoss = direction === 'RISE' ? entry - atrVal * 1.5 : entry + atrVal * 1.5;
  const tp1 = direction === 'RISE' ? entry + atrVal * 2 : entry - atrVal * 2;
  const tp2 = direction === 'RISE' ? entry + atrVal * 4 : entry - atrVal * 4;
  const risk = Math.abs(entry - stopLoss);
  const reward1 = Math.abs(tp1 - entry);
  const rrRatio = risk > 0 ? +(reward1 / risk).toFixed(2) : null;

  // Next-3-candle probability projection: base confidence scaled by score,
  // decaying slightly each candle out since certainty naturally fades further out.
  const baseConfidence = 50 + (score / 14) * 40; // 50-90% range
  const candleProjection = [1, 2, 3].map((n) => {
    const decay = (n - 1) * 6;
    const p = Math.max(50, Math.round(baseConfidence - decay));
    return direction === 'RISE'
      ? { candle: n, rise: p, fall: 100 - p }
      : { candle: n, rise: 100 - p, fall: p };
  });

  return {
    pair,
    timeframe,
    direction,
    score,
    maxScore: 14,
    tier,
    fires,
    breakdown,
    entry,
    stopLoss,
    tp1,
    tp2,
    rrRatio,
    riskPercentSuggested: [1, 3],
    candleProjection,
    generatedAt: new Date().toISOString(),
  };
}
