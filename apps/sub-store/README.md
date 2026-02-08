# SUB Storefront Frontend (React + Vite)

This is a hackathon-friendly React frontend for your SUB token storefront system.

## Pages
- **Create**: `/create` – script-driven deployment assistant (steps `03..06`).
- **Manage**: `/manage` (or `/manage/:poolId`) – edit hook pricing + fund refund reserve.
- **Storefront**: `/product` (or `/product/:poolId`) – direct router checkout (buy/refund/refundAll) plus fallback Uniswap links/embed.
- **Tokens**: `/tokens` – add SUB + fake USDC to MetaMask via `wallet_watchAsset` using embedded base64 icons.

## Setup

1) Install
```bash
npm install
```

2) Create `.env` from `.env.example` and fill in addresses / RPC.
```bash
cp .env.example .env
```

Address resolution is env-first and deployments fallback:
- App uses `VITE_*` address when valid.
- If missing, app falls back to `@gater/contracts` `SUBSCRIPTION_ADDRESSES` for the current chain.
- App fails startup only if both are missing/invalid.

3) Run
```bash
npm run dev
```

## Notes / gotchas
- Direct router checkout is the primary flow.
- Uniswap link/embed is kept as a fallback flow.
- This app assumes:
  - SUB has 18 decimals
  - USDC has 6 decimals
  - Chain defaults to Base mainnet
