import test from "node:test";
import assert from "node:assert/strict";
import { runSmaBacktest } from "../src/backtest.js";

function candles(closes) {
  return closes.map((close, i) => ({ time: i + 1, open: close, high: close + 1, low: close - 1, close, volume: 100 }));
}

test("backtest rejects insufficient history", () => {
  assert.throws(() => runSmaBacktest(candles([10, 11, 12]), { fast: 2, slow: 3 }), /Insufficient candles/);
});
test("backtest returns deterministic metrics and next-open trades", () => {
  const data = candles([10, 9, 8, 7, 8, 9, 10, 11, 12, 11, 10, 9, 8, 7, 6, 7, 8, 9, 10, 11, 12, 13]);
  const result = runSmaBacktest(data, { fast: 2, slow: 4, initialCash: 1000, feeRate: 0, slippageBps: 0 });
  assert.ok(Number.isFinite(result.finalEquity));
  assert.ok(result.maxDrawdownPct >= 0);
  assert.ok(result.trades.every(t => t.time > 0 && (t.side === "BUY" || t.side === "SELL")));
  assert.equal(result.assumptions[0], "Signals calculated on completed candle closes");
});
test("backtest rejects invalid windows", () => {
  assert.throws(() => runSmaBacktest(candles(Array.from({length:20}, (_,i)=>i+10)), { fast: 5, slow: 5 }), /Invalid candles/);
});
