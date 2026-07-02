// All functions take an array of candles: { open, high, low, close, volume, epoch }
// ordered oldest -> newest, and use only confirmed closed candles (caller must
// exclude the currently-forming candle before passing data in here).

export function ema(values, period) {
  const k = 2 / (period + 1);
  const out = [];
  let prev;
  values.forEach((v, i) => {
    if (i === 0) {
      prev = v;
    } else {
      prev = v * k + prev * (1 - k);
    }
    out.push(prev);
  });
  return out;
}

export function sma(values, period) {
  const out = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    const slice = values.slice(i - period + 1, i + 1);
    out.push(slice.reduce((a, b) => a + b, 0) / period);
  }
  return out;
}

export function atr(candles, period = 10) {
  const trs = candles.map((c, i) => {
    if (i === 0) return c.high - c.low;
    const prevClose = candles[i - 1].close;
    return Math.max(
      c.high - c.low,
      Math.abs(c.high - prevClose),
      Math.abs(c.low - prevClose)
    );
  });
  return ema(trs, period);
}

export function supertrend(candles, period = 10, multiplier = 3) {
  const atrVals = atr(candles, period);
  const out = [];
  let prevUpper, prevLower, prevTrend = 1;

  candles.forEach((c, i) => {
    const mid = (c.high + c.low) / 2;
    const basicUpper = mid + multiplier * atrVals[i];
    const basicLower = mid - multiplier * atrVals[i];

    let upper = basicUpper;
    let lower = basicLower;

    if (i > 0) {
      upper =
        basicUpper < prevUpper || candles[i - 1].close > prevUpper
          ? basicUpper
          : prevUpper;
      lower =
        basicLower > prevLower || candles[i - 1].close < prevLower
          ? basicLower
          : prevLower;
    }

    let trend = prevTrend;
    if (c.close > upper) trend = 1;
    else if (c.close < lower) trend = -1;

    out.push({ value: trend === 1 ? lower : upper, trend });

    prevUpper = upper;
    prevLower = lower;
    prevTrend = trend;
  });

  return out;
}

export function vwap(candles) {
  let cumPV = 0;
  let cumVol = 0;
  return candles.map((c) => {
    const typical = (c.high + c.low + c.close) / 3;
    cumPV += typical * (c.volume || 0);
    cumVol += c.volume || 0;
    return cumVol === 0 ? typical : cumPV / cumVol;
  });
}

export function rsi(closes, period = 14) {
  const out = [null];
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    if (i <= period) {
      avgGain += gain;
      avgLoss += loss;
      if (i === period) {
        avgGain /= period;
        avgLoss /= period;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        out.push(100 - 100 / (1 + rs));
      } else {
        out.push(null);
      }
      continue;
    }

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    out.push(100 - 100 / (1 + rs));
  }

  return out;
}

export function macd(closes, fast = 12, slow = 26, signalPeriod = 9) {
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);
  const macdLine = closes.map((_, i) => emaFast[i] - emaSlow[i]);
  const signalLine = ema(macdLine, signalPeriod);
  const histogram = macdLine.map((v, i) => v - signalLine[i]);
  return { macdLine, signalLine, histogram };
}

// Williams Alligator: Jaw (13,8), Teeth (8,5), Lips (5,3) — smoothed moving averages
export function alligator(candles) {
  const median = candles.map((c) => (c.high + c.low) / 2);
  const jaw = smma(median, 13, 8);
  const teeth = smma(median, 8, 5);
  const lips = smma(median, 5, 3);
  return { jaw, teeth, lips };
}

function smma(values, period, offset) {
  const out = new Array(values.length).fill(null);
  let prevSmma;
  for (let i = 0; i < values.length; i++) {
    const idx = i + offset;
    if (idx >= values.length) break;
    if (i === 0) {
      const seed = values.slice(0, period);
      if (seed.length < period) continue;
      prevSmma = seed.reduce((a, b) => a + b, 0) / period;
    } else {
      prevSmma = (prevSmma * (period - 1) + values[i + period - 1]) / period;
    }
    out[idx + period - 1] = prevSmma;
  }
  return out;
}

// Structure: swing highs/lows for BOS / CHoCH detection
export function findSwings(candles, lookback = 3) {
  const swingHighs = [];
  const swingLows = [];

  for (let i = lookback; i < candles.length - lookback; i++) {
    const window = candles.slice(i - lookback, i + lookback + 1);
    const isHigh = window.every((c) => candles[i].high >= c.high);
    const isLow = window.every((c) => candles[i].low <= c.low);
    if (isHigh) swingHighs.push({ index: i, price: candles[i].high });
    if (isLow) swingLows.push({ index: i, price: candles[i].low });
  }

  return { swingHighs, swingLows };
}

// BOS: price closes beyond the most recent swing high/low in trend direction
export function detectBOS(candles, lookback = 3) {
  const { swingHighs, swingLows } = findSwings(candles, lookback);
  const lastClose = candles[candles.length - 1].close;

  const lastSwingHigh = swingHighs[swingHighs.length - 1];
  const lastSwingLow = swingLows[swingLows.length - 1];

  if (lastSwingHigh && lastClose > lastSwingHigh.price) return 'RISE';
  if (lastSwingLow && lastClose < lastSwingLow.price) return 'FALL';
  return null;
}

// CHoCH: a break of structure in the OPPOSITE direction of the prior trend
export function detectCHoCH(candles, lookback = 3) {
  const { swingHighs, swingLows } = findSwings(candles, lookback);
  if (swingHighs.length < 2 || swingLows.length < 2) return null;

  const priorTrendUp =
    swingHighs[swingHighs.length - 1].price > swingHighs[swingHighs.length - 2].price &&
    swingLows[swingLows.length - 1].price > swingLows[swingLows.length - 2].price;

  const priorTrendDown =
    swingHighs[swingHighs.length - 1].price < swingHighs[swingHighs.length - 2].price &&
    swingLows[swingLows.length - 1].price < swingLows[swingLows.length - 2].price;

  const lastClose = candles[candles.length - 1].close;
  const lastSwingLow = swingLows[swingLows.length - 1];
  const lastSwingHigh = swingHighs[swingHighs.length - 1];

  if (priorTrendUp && lastSwingLow && lastClose < lastSwingLow.price) return 'FALL';
  if (priorTrendDown && lastSwingHigh && lastClose > lastSwingHigh.price) return 'RISE';
  return null;
}

// Order Block: last opposite-colored candle before a strong impulse move
export function findOrderBlock(candles, direction, impulseThresholdATR = 1.2) {
  const atrVals = atr(candles, 10);
  for (let i = candles.length - 2; i > candles.length - 15 && i > 0; i--) {
    const c = candles[i];
    const next = candles[i + 1];
    const move = Math.abs(next.close - next.open);
    const isImpulse = move > atrVals[i] * impulseThresholdATR;

    if (direction === 'RISE' && isImpulse && next.close > next.open) {
      if (c.close < c.open) {
        const price = candles[candles.length - 1].close;
        if (price >= c.low && price <= c.high) return true;
      }
    }
    if (direction === 'FALL' && isImpulse && next.close < next.open) {
      if (c.close > c.open) {
        const price = candles[candles.length - 1].close;
        if (price >= c.low && price <= c.high) return true;
      }
    }
  }
  return false;
}

// Fair Value Gap: 3-candle imbalance, unfilled by subsequent price action
export function findFVG(candles, direction) {
  for (let i = candles.length - 3; i >= Math.max(0, candles.length - 15); i--) {
    const a = candles[i];
    const b = candles[i + 1];
    const c = candles[i + 2];

    if (direction === 'RISE' && a.high < c.low) {
      const filled = candles.slice(i + 3).some((k) => k.low <= a.high);
      if (!filled) return true;
    }
    if (direction === 'FALL' && a.low > c.high) {
      const filled = candles.slice(i + 3).some((k) => k.high >= a.low);
      if (!filled) return true;
    }
  }
  return false;
}

// AlgoAlpha-style trend cloud: fast/slow EMA band, "expanding" if the gap is widening
export function algoAlphaCloud(closes) {
  const fast = ema(closes, 9);
  const slow = ema(closes, 21);
  const gapNow = fast[fast.length - 1] - slow[slow.length - 1];
  const gapPrev = fast[fast.length - 2] - slow[slow.length - 2];
  const expanding = Math.abs(gapNow) > Math.abs(gapPrev);
  const direction = gapNow > 0 ? 'RISE' : 'FALL';
  return { direction, expanding };
}

// Sniper Bias: composite of short EMA slope + RSI momentum + candle body ratio
export function sniperBias(candles, closes) {
  const shortEma = ema(closes, 8);
  const slope = shortEma[shortEma.length - 1] - shortEma[shortEma.length - 5];
  const rsiVals = rsi(closes, 14);
  const lastRsi = rsiVals[rsiVals.length - 1];
  const last = candles[candles.length - 1];
  const body = last.close - last.open;

  let bullScore = 0;
  let bearScore = 0;
  if (slope > 0) bullScore++; else bearScore++;
  if (lastRsi > 50) bullScore++; else bearScore++;
  if (body > 0) bullScore++; else bearScore++;

  if (bullScore > bearScore) return 'RISE';
  if (bearScore > bullScore) return 'FALL';
  return null;
}

export function volumeSpike(candles, period = 20) {
  const vols = candles.map((c) => c.volume || 0);
  const avg = vols.slice(-period - 1, -1).reduce((a, b) => a + b, 0) / period;
  const last = vols[vols.length - 1];
  return avg > 0 && last > avg;
}

// Candlestick patterns on the last 1-3 candles
export function detectCandlePattern(candles) {
  const c1 = candles[candles.length - 1];
  const c2 = candles[candles.length - 2];
  const c3 = candles[candles.length - 3];

  const bodyC1 = Math.abs(c1.close - c1.open);
  const rangeC1 = c1.high - c1.low || 1e-9;

  // Bullish engulfing
  if (c2.close < c2.open && c1.close > c1.open && c1.close > c2.open && c1.open < c2.close) {
    return { pattern: 'Bullish Engulfing', direction: 'RISE' };
  }
  // Bearish engulfing
  if (c2.close > c2.open && c1.close < c1.open && c1.close < c2.open && c1.open > c2.close) {
    return { pattern: 'Bearish Engulfing', direction: 'FALL' };
  }
  // Bullish pin bar (hammer): small body near top, long lower wick
  const lowerWick = Math.min(c1.open, c1.close) - c1.low;
  const upperWick = c1.high - Math.max(c1.open, c1.close);
  if (lowerWick > bodyC1 * 2 && bodyC1 / rangeC1 < 0.35 && upperWick < bodyC1) {
    return { pattern: 'Bullish Pin Bar', direction: 'RISE' };
  }
  // Bearish pin bar (shooting star)
  if (upperWick > bodyC1 * 2 && bodyC1 / rangeC1 < 0.35 && lowerWick < bodyC1) {
    return { pattern: 'Bearish Pin Bar', direction: 'FALL' };
  }
  // Morning star: down, small indecision, strong up closing above midpoint of c3
  if (
    c3.close < c3.open &&
    Math.abs(c2.close - c2.open) < Math.abs(c3.close - c3.open) * 0.4 &&
    c1.close > c1.open &&
    c1.close > (c3.open + c3.close) / 2
  ) {
    return { pattern: 'Morning Star', direction: 'RISE' };
  }
  // Evening star
  if (
    c3.close > c3.open &&
    Math.abs(c2.close - c2.open) < Math.abs(c3.close - c3.open) * 0.4 &&
    c1.close < c1.open &&
    c1.close < (c3.open + c3.close) / 2
  ) {
    return { pattern: 'Evening Star', direction: 'FALL' };
  }

  return null;
}
