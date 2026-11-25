import { evaluateOrder } from "./risk.js";

/** In-memory long-only paper broker. Not connected to any exchange or broker. */
export class PaperBroker {
  constructor({ initialCash = 100000, maxOrderValue = 20000, maxDailyLoss = 2000, feeRate = 0.001, slippageBps = 5 } = {}) {
    if (![initialCash, maxOrderValue, maxDailyLoss, feeRate, slippageBps].every(Number.isFinite) ||
        initialCash < 0 || maxOrderValue <= 0 || maxDailyLoss <= 0 || feeRate < 0 || slippageBps < 0 || slippageBps >= 10000) {
      throw new Error("Invalid paper-broker configuration");
    }
    this.cash = initialCash; this.positions = {}; this.averageCost = {};
    this.maxOrderValue = maxOrderValue; this.maxDailyLoss = maxDailyLoss;
    this.feeRate = feeRate; this.slippageBps = slippageBps;
    this.realizedPnL = 0; this.dailyLoss = 0; this.killSwitch = false;
    this.liveTradingEnabled = false; this.audit = [];
  }
  placeOrder({ symbol, side, quantity, price }) {
    if (typeof symbol !== "string" || !/^[A-Z0-9._-]{1,24}$/.test(symbol)) throw new Error("Invalid symbol");
    quantity = Number(quantity); price = Number(price);
    const check = evaluateOrder({ symbol, side, quantity, price }, this, { maxOrderValue: this.maxOrderValue, maxDailyLoss: this.maxDailyLoss });
    if (!check.allowed) throw new Error(check.reason);
    const slip = this.slippageBps / 10000;
    const fillPrice = price * (side === "BUY" ? 1 + slip : 1 - slip);
    const gross = quantity * fillPrice, fee = gross * this.feeRate, total = gross + fee;
    if (side === "BUY" && total > this.cash) throw new Error("Insufficient paper cash after fees and slippage");
    const current = this.positions[symbol] || 0;
    if (side === "SELL" && current < quantity) throw new Error("Insufficient position");
    let realized = 0;
    if (side === "BUY") {
      const oldCost = this.averageCost[symbol] || 0;
      this.averageCost[symbol] = ((current * oldCost) + total) / (current + quantity);
    } else {
      realized = (fillPrice - this.averageCost[symbol]) * quantity - fee;
      this.realizedPnL += realized; this.dailyLoss = Math.max(0, -this.realizedPnL);
      if (quantity === current) delete this.averageCost[symbol];
    }
    this.cash += side === "SELL" ? gross - fee : -total;
    this.positions[symbol] = current + (side === "BUY" ? quantity : -quantity);
    if (this.positions[symbol] === 0) delete this.positions[symbol];
    const fill = { id: this.audit.length + 1, symbol, side, quantity, requestedPrice: price, fillPrice, fee, realizedPnL: realized, timestamp: new Date().toISOString(), mode: "PAPER" };
    this.audit.push(fill); return structuredClone(fill);
  }
  resetDailyRisk() {
    this.realizedPnL = 0; this.dailyLoss = 0;
    this.audit.push({ event: "DAILY_RISK_RESET", timestamp: new Date().toISOString() });
  }
  setKillSwitch(active) {
    this.killSwitch = Boolean(active);
    this.audit.push({ event: "KILL_SWITCH", active: this.killSwitch, timestamp: new Date().toISOString() });
  }
  snapshot() {
    return structuredClone({ cash: this.cash, positions: this.positions, averageCost: this.averageCost, realizedPnL: this.realizedPnL, dailyLoss: this.dailyLoss, killSwitch: this.killSwitch, liveTradingEnabled: false, audit: this.audit });
  }
}