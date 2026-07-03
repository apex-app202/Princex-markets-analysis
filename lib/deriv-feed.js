// Minimal Deriv WebSocket client for fetching historical candles and
// subscribing to live ticks, scoped to what the dashboard needs.

const DERIV_WS_URL = 'wss://ws.binaryws.com/websockets/v3?app_id=101506';

const TIMEFRAME_SECONDS = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1h': 3600,
};

export function fetchCandles(symbol, timeframe, count = 200) {
  return new Promise((resolve, reject) => {
    const granularity = TIMEFRAME_SECONDS[timeframe] || 60;
    const ws = new WebSocket(DERIV_WS_URL);

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Deriv feed timeout'));
    }, 10000);

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          ticks_history: symbol,
          adjust_start_time: 1,
          count,
          end: 'latest',
          granularity,
          style: 'candles',
        })
      );
    };

    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);

      if (data.error) {
        clearTimeout(timeout);
        ws.close();
        reject(new Error(data.error.message));
        return;
      }

      if (data.msg_type === 'candles') {
        clearTimeout(timeout);
        const candles = data.candles.map((c) => ({
          epoch: c.epoch,
          open: parseFloat(c.open),
          high: parseFloat(c.high),
          low: parseFloat(c.low),
          close: parseFloat(c.close),
          volume: 0, // Deriv synthetic indices don't provide real volume
        }));
        // Drop the last candle — it may still be forming (unconfirmed).
        // Stability rule: score only on confirmed closed candles.
        candles.pop();
        ws.close();
        resolve(candles);
      }
    };

    ws.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Deriv WebSocket connection error'));
    };
  });
}

export const VOLATILITY_PAIRS = [
  { id: 'R_10', label: 'V10' },
  { id: 'R_25', label: 'V25' },
  { id: 'R_50', label: 'V50' },
  { id: 'R_75', label: 'V75' },
  { id: 'R_100', label: 'V100' },
  { id: '1HZ10V', label: 'V10s' },
  { id: '1HZ25V', label: 'V25s' },
  { id: '1HZ50V', label: 'V50s' },
  { id: '1HZ75V', label: 'V75s' },
  { id: '1HZ100V', label: 'V100s' },
];

// Subscribes to live ticks for a symbol. Calls onTick(price, epoch) on each
// tick. Returns an unsubscribe function. Caller is responsible for throttling
// UI updates (stability rule: minimum 500ms between price feed renders).
export function subscribeTicks(symbol, onTick) {
  const ws = new WebSocket(DERIV_WS_URL);
  let subscriptionId = null;

  ws.onopen = () => {
    ws.send(JSON.stringify({ ticks: symbol, subscribe: 1 }));
  };

  ws.onmessage = (msg) => {
    const data = JSON.parse(msg.data);
    if (data.msg_type === 'tick' && data.tick) {
      subscriptionId = data.tick.id;
      onTick(parseFloat(data.tick.quote), data.tick.epoch);
    }
  };

  return function unsubscribe() {
    try {
      if (subscriptionId) {
        ws.send(JSON.stringify({ forget: subscriptionId }));
      }
      ws.close();
    } catch (e) {
      // socket may already be closed
    }
  };
}
