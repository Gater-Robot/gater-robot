# Phase 5 — UAT & Cutover Readiness (apps/webapp)

This doc is the “do we ship?” checklist for the `apps/webapp` migration.

## Goals

- Confirm **feature parity** vs `apps/web` for the mini-app routes.
- Confirm **security posture** for Telegram auth + SIWE.
- Confirm **prod readiness** on the real Telegram Mini App URLs.

## Quick links

- Dev URL: `https://gater-dev.agentix.bot`
- Prod URL: `https://gater-app.agentix.bot`
- Diagnostics page: `/health` (dev or Telegram admin mode)

## Environment sanity

1. Confirm `VITE_CONVEX_URL` points at the correct Convex deployment.
2. Confirm `VITE_WALLET_CONNECT_PROJECT_ID` set (if WalletConnect is required).
3. Confirm `VITE_ALCHEMY_API_KEY` set (recommended for consistent RPC).
4. Confirm server env has `BOT_TOKEN` (or `TELEGRAM_BOT_TOKEN`) for bot admin verification.
5. If `ADMIN_IDS` is set, expect admin actions to be restricted and the app to log a warning on startup.
6. Recommended in prod: set `DISABLE_INSECURE_MUTATIONS=true` to prevent legacy admin mutations.

## UAT scenarios (mini-app)

### 1) `/user` — profile + wallet + SIWE

- Open `/user` in Telegram.
- Connect wallet (Injected / WalletConnect).
- Run SIWE flow and confirm it succeeds.
- Link multiple addresses, switch “favorite”.
- ENS resolution renders and updates.

### 2) `/faucet` — BEST faucet

- Connect wallet.
- Read current token balance.
- Request faucet token (contract write) and confirm success state.
- Use “Add token to wallet” (if supported).

### 3) `/get-eligible` — eligibility + LI.FI

Channel mode:
- Open a channel deep-link that routes to `/get-eligible?channelId=...`
- Confirm eligibility check runs automatically.
- If ineligible, LI.FI widget renders and swap flow starts.
- After swap, “Recheck eligibility” succeeds and the UI updates.

Manual mode:
- Open `/get-eligible?token=0x...&amount=...&chain=...&symbol=...`
- Confirm direct swap mode renders and swap success shows a tx hash.

### 4) `/orgs` + `/admin` — org/channel/gate management

- Enter admin mode (Telegram `startParam=admin`).
- Create org.
- Create channel under org.
- Verify bot admin status (Telegram API verification).
- Register a gate (chain + token + threshold).
- Confirm the token address field resolves metadata and gives helpful errors.

### 5) `/ens-eth-id` — ENS demo

- Ensure page loads and UX is stable in production.

## Cutover checks

- Verify Telegram Mini App points to the correct URL (dev/prod).
- Validate SIWE on the production domain (domain allowlist on backend must match).
- Validate `DISABLE_INSECURE_MUTATIONS=true` and core secure admin actions still work.

