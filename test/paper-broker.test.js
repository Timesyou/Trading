import test from "node:test";
import assert from "node:assert/strict";
import { PaperBroker } from "../src/paper-broker.js";

test("executes a simulated buy and sell with costs", () => {
  const broker = new PaperBroker({ initialCash: 10000, maxOrderValue: 5000 });
  const buy = broker.placeOrder({ symbol: "RELIANCE", side: "BUY", quantity: 2, price: 100 });
  assert.equal(buy.mode, "PAPER");
  assert.equal(broker.snapshot().positions.RELIANCE, 2);
  broker.placeOrder({ symbol: "RELIANCE", side: "SELL", quantity: 2, price: 110 });
  assert.equal(broker.snapshot().positions.RELIANCE, undefined);
});
test("rejects short selling without mutating cash", () => {
  const broker = new PaperBroker();
  const before = broker.cash;
  assert.throws(() => broker.placeOrder({ symbol: "TCS", side: "SELL", quantity: 1, price: 100 }), /Insufficient position/);
  assert.equal(broker.cash, before);
});
test("kill switch blocks orders", () => {
  const broker = new PaperBroker();
  broker.setKillSwitch(true);
  assert.throws(() => broker.placeOrder({ symbol: "TCS", side: "BUY", quantity: 1, price: 100 }), /kill switch/);
});
test("rejects order over configured limit", () => {
  const broker = new PaperBroker({ maxOrderValue: 100 });
  assert.throws(() => broker.placeOrder({ symbol: "TCS", side: "BUY", quantity: 2, price: 100 }), /maximum order value/);
});
