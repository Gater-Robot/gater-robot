# SUB Storefront Frontend (React + Vite)

This is a hackathon-friendly React frontend for your SUB token storefront system.

## Pages
- **Create**: `/create` – deploy a new SUB product (via `SubFactory.createProduct`)
- **Manage**: `/manage/:poolId` – view/edit product settings + deposit refund reserve (via `SubHook`)
- **Storefront**: `/product/:poolId` – SaaS pricing cards (7 / 30 / 365 days), buy/sell links + embedded Uniswap iframe, plus live SUB balance refresh every 15s.
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

3) Run
```bash
npm run dev
```

## Notes / gotchas
- The Uniswap embed/link uses `app.uniswap.org/#/swap?...` URL query parameters.
- For Option A (custom accounting hooks), Uniswap's interface may or may not discover/route to your v4 pool depending on how they index v4 pools and custom hooks.
  For a guaranteed UX (especially for coupons via hookData), you’ll likely want an **in-app checkout** that calls your `SubRouter` directly.
- This app assumes:
  - SUB has 18 decimals
  - USDC has 6 decimals
  - Pool ordering is SUB = currency0, USDC = currency1
- Optional env:
  - `VITE_SUB_TOKEN_ADDRESS` pre-fills the SUB token in `/tokens`.

## Where to edit contract ABIs
- `src/lib/abi.ts`

## Where to edit Uniswap link generation
- `src/lib/uniswap.ts`
