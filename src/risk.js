/** Fail-closed pre-trade controls. All monetary values use the same currency unit. */
export function evaluateOrder(order, account, limits) {
  const reject = reason => ({ allowed: false, reason });
  if (account.killSwitch === true) return reject("Emergency kill switch is active");
  if (account.liveTradingEnabled === true) return reject("Live execution is not implemented in this build");
  if (!order || !account || !limits) return reject("Missing order, account, or risk limits");
  const quantity = Number(order.quantity), price = Number(order.price);
  if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price) || price <= 0) return reject("Quantity and price must be positive finite numbers");
  if (!Number.isFinite(account.cash) || account.cash < 0) return reject("Account cash is invalid");
  if (!Number.isFinite(limits.maxOrderValue) || limits.maxOrderValue <= 0) return reject("Maximum order value is not configured");
  const value = quantity * price;
  if (!Number.isFinite(value) || value > limits.maxOrderValue) return reject("Order exceeds maximum order value");
  if (order.side === "BUY" && value > account.cash) return reject("Insufficient paper cash");
  if (order.side !== "BUY" && order.side !== "SELL") return reject("Unsupported order side");
  if (order.side === "SELL" && (Number(account.positions?.[order.symbol] || 0) < quantity)) return reject("Insufficient position; short selling is disabled");
  if (Number(account.dailyLoss || 0) >= Number(limits.maxDailyLoss)) return reject("Daily loss limit reached");
  return { allowed: true, reason: "Paper-trade risk checks passed", orderValue: value };
}
