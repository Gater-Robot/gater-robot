# Web Mini-App → Webapp Migration Plan & Tracker

**Status:** Completed (historical)  
**Owners:** TBD  
**Last updated:** 2026-02-08

> Note: `apps/web` has been removed from the repository. This document is kept as migration history.

## Context

We have two Vite apps:

- **Current mini-app:** `apps/web` (feature-complete reference implementation)
- **New scaffold:** `apps/webapp` (new UI framework baseline; target app)

Goal: systematically migrate functionality from `apps/web` into `apps/webapp`, while improving UI polish and developer experience.

---

## Definition of “Parity”

### Functional parity (must-have)
A slice is **parity-complete** when, compared to `apps/web`, it:

1. **Matches behavior** for the happy path and key edge cases (same screens, same routing, same user outcomes).
2. **Uses the same data contracts** (Convex queries/mutations/actions) and produces equivalent DB effects.
3. **Works in Telegram and locally**
   - In Telegram: real `initDataRaw` + `startParam` flows work
   - Local dev: mock-user mode works (no Telegram required)
4. **Has equivalent UX states** (loading, error, empty, success).
5. **Meets baseline quality**: no runtime errors in console, no broken navigation, basic a11y (labels/roles/focus).

### Visual parity (not required)
Pixel-perfect matching is **not required**. The target UI should be **better** (shadcn + Tailwind 4), but must not change the meaning of flows or break usability.

### Non-goals (explicitly out of scope unless we choose otherwise)
- Rewriting Convex schema or changing backend API shapes
- Redesigning eligibility logic or token-gate semantics
- Adding brand-new features unrelated to migration

---

## Parity Inventory (Source of Truth = `apps/web`)

### Routes to migrate
- `/` → redirect to `/user`
- `/user` Profile: Telegram identity + linked wallets + SIWE verification + default address + eligibility entrypoint
- `/get-eligible` Eligibility view + “Get Eligible” (LiFi) flow
  - Channel mode: `?channelId=<id>`
  - Manual/deep-link mode: `?token=0x...&amount=...&chain=...&symbol=...(&decimals=...)`
- `/faucet` BEST token faucet (claim + add-to-wallet)
- `/orgs` Organizations page (currently UI-first placeholder)
- `/admin` Admin dashboard (currently UI-first placeholder)
- `/ens-eth-id` ENS demo page (**decision needed**: keep prod vs dev-only)

### Cross-cutting platform layers
- Telegram Mini App SDK wrapper + context/provider (includes dev mock user)
- Convex client + generated API usage
- wagmi wallet connection + SIWE flow
- ENS resolution (wagmi ENS hooks)
- LiFi widget integration (wrapper + config + events)
- Shared UI primitives (Button/Card/Badge/Skeleton/etc.)
- Diagnostics drawer (dev-only)

---

## Migration Strategy

### Recommended approach: “platform first, then vertical slices”
1. **Baseline plumbing** in `apps/webapp` (deps, env, Vite config, theme, providers)
2. **Migrate one route at a time** end-to-end (UI + hooks + Convex calls + edge states)
3. Keep `apps/web` **unchanged** as the reference until cutover.

### Optional: reduce duplication via shared packages
If duplication becomes painful, consider extracting:
- `packages/web-core` (Telegram context, wagmi config, Convex client, shared hooks)
- `packages/ui` (shadcn primitives + theme tokens)

This is not required for initial parity.

---

## Tracker: Phases & Deliverables

> Update checkboxes as work progresses. Keep this doc as the living tracker.

### Phase 0 — Pre-flight (parity agreement)
- [x] Confirm Tailwind v4 is the target (migrate directly onto `apps/webapp`)
- [x] Decide status of `/ens-eth-id` (keep dev-only until after parity)
- [x] Confirm deployment hostnames for SIWE domain allowlists (frontend + Convex)
  - Dev: `gater-dev.agentix.bot`
  - Prod: `gater-app.agentix.bot`
  - Local: `localhost` / `localhost:5173`
- [x] Create a “Parity QA” workflow (manual UAT list, plus quick smoke steps)

**Done when:** everyone agrees what “parity” means and what is allowed to change.

### Phase 1 — `apps/webapp` baseline parity (can compile/run)
- [x] Add required dependencies to match `apps/web` functionality (router, Convex, wagmi/viem, query, Telegram SDK, LiFi, etc.)
- [x] Add Vite config parity where needed
  - [x] `@` alias
  - [x] Buffer polyfill + `global` define as needed by web3 deps
  - [x] `server.allowedHosts` (dev tunnel domains)
  - [x] `ssr.noExternal` for any problematic deps (e.g. `ethereum-identity-kit`)
- [x] Add required env vars + documentation
  - [x] `VITE_CONVEX_URL`
  - [x] `VITE_WALLET_CONNECT_PROJECT_ID`
  - [x] `VITE_BEST_TOKEN_ADDRESS`
- [x] Copy/port any required `public/` assets (e.g., chain logos if LiFi/UX depends on them)

**Done when:** `pnpm --filter @gater/webapp dev` runs and renders a basic shell with routing.

### Phase 2 — Design system + UI primitives (shadcn baseline)
- [ ] Decide whether to:
  - [ ] Port existing `apps/web/src/components/ui/*` as a starting point, **or**
  - [ ] Initialize “fresh” shadcn/ui components via CLI and map styles
- [ ] Add theme tokens (CSS variables) compatible with Tailwind 4 + shadcn
- [ ] Standardize `cn()` util, typography, layout containers, and common UI patterns

**Done when:** we can build feature pages without ad-hoc styling and everything looks coherent.

### Phase 3 — Port platform layers (no pages yet)
- [ ] Telegram context/provider + SDK wrapper
- [ ] Convex client setup
- [ ] wagmi config + wallet connection components
- [ ] SIWE hook + verify button flow
- [ ] Addresses hook + default selection UI
- [ ] ENS hooks + identity card
- [ ] Eligibility hook + LiFi wrapper + config
- [ ] Diagnostics drawer (dev-only)

**Done when:** feature pages are mostly composition, not “plumbing”.

### Phase 4 — Vertical slice migrations (route-by-route)

> Suggested order: `/faucet` → `/user` → `/get-eligible` → `/orgs`/`/admin` → `/ens-eth-id` (optional).

#### `/faucet`
- [ ] Contract reads: `hasClaimed`, `balance`, metadata (optional)
- [ ] Claim write + receipt confirmation + error handling
- [ ] “Add token to wallet” (EIP-747)

#### `/user`
- [ ] Telegram identity card (real + mock)
- [ ] Wallet connect/disconnect UX
- [ ] SIWE verification (nonce → sign → verify)
- [ ] Address list + default selection
- [ ] ENS identity card
- [ ] Eligibility checker entrypoint (channel-aware)

#### `/get-eligible`
- [ ] Channel mode: `?channelId=<id>`
- [ ] Manual mode: `?token=...&amount=...&chain=...&symbol=...(&decimals=...)`
- [ ] Eligibility status UI + refresh
- [ ] LiFi widget flow + swap success → re-check eligibility

#### `/orgs` + `/admin`
- [ ] UI parity (existing pages are placeholder; match current functionality)
- [ ] (Optional) Wire to Convex if/when backend is ready

#### `/ens-eth-id` (optional)
- [ ] Decide: keep as a public route, dev-only route, or remove
- [ ] If kept: ensure it works with the new providers/theme

**Done when:** each route matches the `apps/web` behavior per the parity definition.

### Phase 5 — Cutover + hardening
- [ ] Run full “Parity QA” checklist
- [ ] Verify SIWE works on production hostname(s)
- [ ] Verify Telegram deep links + `startParam` flows
- [ ] Switch bot/Telegram Mini App URL to `apps/webapp` deployment
- [ ] Keep `apps/web` deployable for rollback (time-boxed)

### Phase 6 — Cleanup
- [ ] Remove dead code and unused deps from `apps/webapp`
- [ ] Decide the long-term fate of `apps/web` (archive vs delete)
- [ ] Update README/dev instructions to use `apps/webapp` by default

---

## Parity QA (Manual UAT Checklist)

> Keep this short and repeatable. Expand only when we find real regressions.

### Environment sanity
- [ ] `VITE_CONVEX_URL` set and points to the intended deployment
- [ ] WalletConnect project ID set (or explicitly using a dev fallback)
- [ ] No obvious console errors on load

### In Telegram
- [ ] Opening the app shows the Telegram user (or a clear error)
- [ ] `startParam`-driven flows behave as expected

### Wallet + SIWE
- [ ] Connect wallet (injected + WalletConnect)
- [ ] Verify via SIWE (nonce → sign → verified state)
- [ ] Linked address appears as verified and can be set default

### Eligibility + Get Eligible
- [ ] Channel mode: eligibility check runs and renders correctly
- [ ] Manual mode: LiFi widget renders with the expected target token/chain/amount
- [ ] Swap success state renders and re-check works

### Faucet
- [ ] Reads state correctly, handles “not configured” gracefully
- [ ] Claim flow works end-to-end on a supported network
- [ ] Add-to-wallet prompt works (where supported)

---

## Open Questions / Decisions Needed
- **Locked decisions**
  - Tailwind v4 is the target (no Tailwind v3 intermediate step).
  - `/ens-eth-id` stays dev-only until parity is complete.
  - SIWE domain allowlists must include: `gater-dev.agentix.bot`, `gater-app.agentix.bot`, `localhost`, `localhost:5173`.
- **Still open**
  - `apps/web` UI primitives: port as-is first, or rebuild via shadcn CLI?
