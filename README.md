# ATI — AI Trading Intelligence

ATI is being built as a broker-neutral research and paper-trading system. This repository is the independent source of truth; it does not depend on a hosted app builder.

## Current status

This first commit establishes a small, dependency-free Node.js foundation:
- Market-data contract with OHLCV validation and ordered provider failover.
- Fail-closed behavior when providers return stale, malformed, or unavailable data.
- Long-only paper broker with fees, slippage, order-value limits, audit events, and an emergency kill switch.
- Automated Node.js tests and GitHub Actions CI.

**Not implemented:** AI predictions, strategy research, backtesting, exchange/broker adapters, real-time feeds, web dashboard, persistence, authentication, deployment, or live order execution. No profitability or prediction-accuracy claim is made.

## Requirements

- Node.js 20 or newer
- No third-party runtime dependencies

## Run locally

```bash
npm run check
npm test
```

## Safety boundaries

- All fills are simulations in an in-memory paper ledger.
- Live trading is explicitly disabled; there is no broker connection or order-routing code.
- Market-data providers must be added as separate adapters and their output must pass validation. Failover does not mean stale cache data is acceptable.
- Never commit API keys, passwords, OTPs, broker tokens, or personal KYC documents. Use environment secrets only after a secure deployment design is reviewed.

## Architecture direction

Provider adapters → normalized and freshness-checked market data → research/backtest engine → independent risk gate → paper broker. Broker execution will be a separate adapter behind the same risk boundary and will remain disabled until separately reviewed and explicitly authorized.

## License

No license has been granted yet. All original code in this repository is provided without an open-source reuse grant unless a license file is added later.
