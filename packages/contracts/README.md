# @gater/contracts

Contracts, tests, and deployment tooling for:
- existing BEST token flows (Hardhat + Ignition)
- new v4 subscription protocol (Foundry-first scripts, shared package exports)

## Quick Start
```bash
pnpm install
pnpm --filter @gater/contracts build
pnpm --filter @gater/contracts test
```

## Environment
Copy and configure:
```bash
cp packages/contracts/.env.example packages/contracts/.env
```

Core vars for legacy Hardhat deploys:
- `DEPLOYER_PRIVATE_KEY`
- `BASE_RPC_URL`
- `ARC_CHAIN_ID`
- `ARC_TESTNET_RPC_URL`

Core vars for subscription v4 scripts:
- `PRIVATE_KEY`
- `POOL_MANAGER`
- `USDC`
- `FACTORY`
- `ROUTER`
- `HOOK_SALT`

## Legacy Deployments (Hardhat Ignition)
```bash
pnpm --filter @gater/contracts deploy:base
pnpm --filter @gater/contracts deploy:arc
pnpm --filter @gater/contracts sync:addresses
```

## Subscription v4 Deploy Flow (Foundry)
Install Foundry + forge-std first:
```bash
cd packages/contracts
forge install foundry-rs/forge-std
```

### Local Hardhat Chain (recommended if you prefer Hardhat over Anvil)
Start local chain:
```bash
pnpm --filter @gater/contracts node:hardhat
```

Use the first Hardhat dev account private key as `PRIVATE_KEY`, then deploy local stack (PoolManager + MockUSDC + Factory + Router):
```bash
pnpm --filter @gater/contracts deploy:subs:local:stack
```

If you want a standalone fake USDC deployment on any network:
```bash
pnpm --filter @gater/contracts deploy:subs:mock-usdc
```

Then continue with normal product setup scripts using the emitted addresses.

### Existing Network Flow (Base / Base Sepolia / custom RPC)
Mine hook salt:
```bash
pnpm --filter @gater/contracts mine:hook-salt
```

Deploy factory/router infra:
```bash
pnpm --filter @gater/contracts deploy:subs:infra
```

Create token + setup pool + wire token roles:
```bash
pnpm --filter @gater/contracts deploy:subs:create
```

Run end-to-end demo (buy + refundAll):
```bash
pnpm --filter @gater/contracts deploy:subs:demo
```

Sync subscription addresses artifact:
```bash
pnpm --filter @gater/contracts sync:subs:addresses
```

## Tests
Hardhat:
```bash
pnpm --filter @gater/contracts test
```

Foundry:
```bash
pnpm --filter @gater/contracts test:forge
```

## Pre-Flight Checklist
- [ ] `pnpm --filter @gater/contracts build` passes.
- [ ] `pnpm --filter @gater/contracts node:hardhat` works if using local chain.
- [ ] Uniswap v4 dependencies are installed and imports resolve.
- [ ] `SubscriptionDaysToken` includes role-gated `burn(uint256)`.
- [ ] Router uses directional `sqrtPriceLimitX96` bounds (`MIN+1` / `MAX-1`).
- [ ] Hook rejects add/remove liquidity attempts.
- [ ] Scripts exist for mine/deploy/create/demo.
- [ ] `deployments/subscriptions.json` is present and writable.
- [ ] Base Sepolia RPC + funded deployer wallet are configured.

## UAT Checklist
- [ ] Token creation + pool setup script succeeds.
- [ ] Buy exact out works at 7, 30, 365 token amounts.
- [ ] Bundle pricing applies only at exact 30/365 amounts.
- [ ] Refund exact in supports fractional token amounts.
- [ ] `refundAll` succeeds after waiting for decay progression.
- [ ] `refundUpTo` clamps to live balance.
- [ ] Refund fails clearly if hook USDC reserve is insufficient.
- [ ] Unauthorized swap sender to hook is rejected.
- [ ] Liquidity modification attempts are rejected by hook.
- [ ] Existing BEST token compile/test behavior is unchanged.
