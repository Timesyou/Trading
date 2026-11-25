/**
 * Provider-independent market data with strict validation and ordered failover.
 * Provider adapters must return { provider, candles }.
 */
export function validateCandles(candles, { now = Date.now(), maxAgeMs = 7 * 24 * 60 * 60 * 1000 } = {}) {
  if (!Array.isArray(candles) || candles.length === 0) throw new Error("No candles returned");
  let previous = -Infinity;
  const clean = candles.map((c, index) => {
    const time = typeof c.time === "number" ? c.time : Date.parse(c.time);
    const values = [c.open, c.high, c.low, c.close, c.volume].map(Number);
    if (!Number.isFinite(time) || values.some(v => !Number.isFinite(v))) throw new Error(`Invalid candle at index ${index}`);
    const [open, high, low, close, volume] = values;
    if (time <= previous) throw new Error("Candles must be strictly time-ordered");
    if (time > now + 60_000) throw new Error("Candle timestamp is in the future");
    if (high < Math.max(open, close, low) || low > Math.min(open, close, high) || volume < 0 || Math.min(open, high, low, close) <= 0) {
      throw new Error(`Invalid OHLCV values at index ${index}`);
    }
    previous = time;
    return { time, open, high, low, close, volume };
  });
  if (now - clean.at(-1).time > maxAgeMs) throw new Error("Latest candle is stale");
  return clean;
}

export async function fetchWithFallback(providers, request, options = {}) {
  if (!Array.isArray(providers) || providers.length === 0) throw new Error("No market-data providers configured");
  const failures = [];
  for (const provider of providers) {
    try {
      const result = await provider.fetchCandles(request);
      const candles = validateCandles(result?.candles, options);
      return { provider: result.provider || provider.name || "unnamed", candles, fallbackUsed: failures.length > 0 };
    } catch (error) {
      failures.push({ provider: provider.name || "unnamed", reason: error.message });
    }
  }
  const error = new Error("All market-data providers failed validation or retrieval");
  error.failures = failures;
  throw error;
}
