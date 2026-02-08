# Subscriptions v4: Judge Brief

This project implements a Uniswap v4 hook-powered subscription system with:
- decaying `SUB` balances
- exact-output buys (`buyExactOut`)
- exact-input refunds (`refundExactIn`, `refundAll`, `refundUpTo`)
- deterministic deploy scripts for local, testnet, and mainnet

## Why this is interesting
- Pricing and refund logic are enforced on-chain in the hook.
- Refund UX is protected against stale balance issues via `refundAll` (live balance read in transaction).
- Deployment flow is reproducible with scripts and clear promotion gates (Local -> Base Sepolia -> Base mainnet).

## 1) Deployment and validation flow

```mermaid
flowchart TD
    A[Pre-flight: compile + Hardhat tests + Forge tests] --> B[Local Hardhat deploy]
    B --> C[UI smoke test on local chain]
    C --> D[Base Sepolia dry run]
    D --> E{Checklist passed?}
    E -- No --> B
    E -- Yes --> F[Base mainnet deploy]
    F --> G[Publish addresses + verify contracts]
```

## 2) Hook timing/sequence (readable view)

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Router as SubscriptionRouter
    participant PM as Uniswap v4 PoolManager
    participant Hook as SubscriptionHook
    participant SUB as SubscriptionDaysToken
    participant USDC as USDC

    Note over User,USDC: BUY path (exact output SUB)
    User->>Router: buyExactOut(subOut, maxUsdcIn)
    Router->>Hook: quoteBuyExactOut(subOut)
    Router->>PM: prepay USDC (sync + settle)
    Router->>PM: swap exact output SUB
    PM->>Hook: beforeSwap
    Hook->>PM: pull USDC to hook reserve
    Hook->>SUB: mint SUB to PoolManager
    Hook-->>PM: return custom delta
    PM-->>Router: swap complete
    Router->>PM: take SUB to user
```

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Router as SubscriptionRouter
    participant PM as Uniswap v4 PoolManager
    participant Hook as SubscriptionHook
    participant SUB as SubscriptionDaysToken
    participant USDC as USDC

    Note over User,USDC: REFUND path (exact input SUB)
    User->>Router: refundExactIn(...) or refundAll(...)
    Note over Router: refundAll reads live balance in-tx
    Router->>Hook: quoteRefundExactIn(subIn)
    Router->>PM: prepay SUB (sync + settle)
    Router->>PM: swap exact input SUB
    PM->>Hook: beforeSwap
    Hook->>Hook: check USDC reserves
    Hook->>PM: fund USDC payout (sync + settle)
    Hook->>PM: take SUB from PoolManager
    Hook->>SUB: burn SUB
    Hook-->>PM: return custom delta
    PM-->>Router: swap complete
    Router->>PM: take USDC to user
```

## Judge reproduction (minimal)

### Local (Hardhat)
```bash
pnpm --filter @gater/contracts node:hardhat
pnpm --filter @gater/contracts deploy:subs:local:stack
pnpm --filter @gater/contracts deploy:subs:create-token:local
pnpm --filter @gater/contracts mine:hook-salt
pnpm --filter @gater/contracts deploy:subs:create:local
pnpm --filter @gater/contracts deploy:subs:demo:local
```

### Promotion gates
1. Local flow passes end-to-end.
2. Repeat on Base Sepolia.
3. Deploy same flow to Base mainnet.

## Key scripts
- `packages/contracts/script/DeployLocalSubscriptionsStack.s.sol`
- `packages/contracts/script/CreateSubscriptionToken.s.sol`
- `packages/contracts/script/MineHookSalt.s.sol`
- `packages/contracts/script/CreateSubscriptionProduct.s.sol`
- `packages/contracts/script/DemoBuyRefund.s.sol`
