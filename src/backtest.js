/**
 * Transparent SMA crossover research backtest.
 * Signals use completed closes; fills occur at the following candle open.
 * This is a teaching/research simulator, not a profitability claim.
 */
export function runSmaBacktest(candles, { fast = 10, slow = 30, initialCash = 100000, feeRate = 0.001, slippageBps = 5 } = {}) {
  if (!Array.isArray(candles) || !Number.isInteger(fast) || !Number.isInteger(slow) || fast < 2 || slow <= fast) throw new Error("Invalid candles or SMA windows");
  if (![initialCash, feeRate, slippageBps].every(Number.isFinite) || initialCash <= 0 || feeRate < 0 || slippageBps < 0 || slippageBps >= 10000) throw new Error("Invalid backtest configuration");
  if (candles.length < slow + 2) throw new Error("Insufficient candles for requested windows and next-open fills");
  let prevSignal = 0, cash = initialCash, units = 0, peak = initialCash, maxDrawdown = 0;
  const trades = [], equityCurve = [];
  const mean = (end, count) => candles.slice(end - count + 1, end + 1).reduce((s, c) => s + c.close, 0) / count;
  for (let i = slow - 1; i < candles.length - 1; i++) {
    const c = candles[i], next = candles[i + 1];
    for (const x of [c.close, next.open, next.close]) if (!Number.isFinite(Number(x)) || Number(x) <= 0) throw new Error("Invalid candle price");
    const signal = mean(i, fast) > mean(i, slow) ? 1 : -1;
    if (signal !== prevSignal && i >= slow - 1) {
      if (signal === 1 && units === 0) {
        const fill = next.open * (1 + slippageBps / 10000), fee = fill * feeRate;
        if (cash >= fill + fee) { cash -= fill + fee; units = 1; trades.push({ side: "BUY", time: next.time, price: fill, fee }); }
      } else if (signal === -1 && units === 1) {
        const fill = next.open * (1 - slippageBps / 10000), fee = fill * feeRate;
        cash += fill - fee; units = 0; trades.push({ side: "SELL", time: next.time, price: fill, fee });
      }
    }
    prevSignal = signal;
    const equity = cash + units * next.close;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, (peak - equity) / peak);
    equityCurve.push({ time: next.time, equity });
  }
  const finalEquity = cash + units * Number(candles.at(-1).close);
  const returnPct = (finalEquity / initialCash - 1) * 100;
  return { strategy: "SMA_CROSSOVER_LONG_ONLY", fast, slow, initialCash, finalEquity, returnPct, maxDrawdownPct: maxDrawdown * 100, openPosition: units, trades, equityCurve, assumptions: ["Signals calculated on completed candle closes", "Orders filled at next candle open", "One share maximum; long-only; no leverage", "Fees and slippage are configurable", "No taxes, market impact, dividends, or partial fills modeled"] };
}
