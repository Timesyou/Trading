import test from "node:test";
import assert from "node:assert/strict";
import { validateCandles, fetchWithFallback } from "../src/market-data.js";

const now = Date.UTC(2026, 0, 3);
const valid = [{ time: now - 86400000, open: 10, high: 12, low: 9, close: 11, volume: 100 }];

test("accepts valid ordered OHLCV", () => assert.equal(validateCandles(valid, { now }).length, 1));
test("rejects malformed OHLCV", () => assert.throws(() => validateCandles([{ ...valid[0], high: 8 }], { now }), /Invalid OHLCV/));
test("rejects stale data", () => assert.throws(() => validateCandles(valid, { now, maxAgeMs: 1000 }), /stale/));
test("fails over only after validation failure", async () => {
  const result = await fetchWithFallback([
    { name: "primary", fetchCandles: async () => ({ candles: [{ ...valid[0], high: 8 }] }) },
    { name: "secondary", fetchCandles: async () => ({ provider: "secondary", candles: valid }) }
  ], {}, { now });
  assert.equal(result.provider, "secondary");
  assert.equal(result.fallbackUsed, true);
});
test("fails closed when all providers fail", async () => {
  await assert.rejects(() => fetchWithFallback([{ name: "offline", fetchCandles: async () => { throw new Error("offline"); } }], {}, { now }), /All market-data providers failed/);
});
