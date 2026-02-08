# @gater/contracts

Contracts, tests, and deployment tooling for:
- existing BEST token flows (Hardhat + Ignition)
- new v4 subscription protocol (Foundry + Hardhat step-by-step scripts, shared package exports)

## Quick Start
```bash
pnpm install
pnpm --filter @gater/contracts build
pnpm --filter @gater/contracts test
```

Frontend imports can use:
- ABIs + addresses from `@gater/contracts`
- Typed viem contract helper types from `@gater/contracts` (`BestTokenContract`, `SubscriptionFactoryContract`, etc.)

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

Core vars for subscription v4 Foundry scripts:
- `PRIVATE_KEY`
- `POOL_MANAGER`
- `USDC`
- `FACTORY`
- `ROUTER`
- `HOOK_SALT`

Core vars for subscription v4 Hardhat numbered scripts:
- `DEPLOYER_PRIVATE_KEY`
- `BASE_RPC_URL` (or target network RPC)
- `POOL_MANAGER`
- `USDC` (if skipping step 1)
- `FACTORY` (if skipping step 2)
- `ROUTER` (if skipping step 2)
- `SUB_TOKEN` (if skipping step 3)
- `HOOK_SALT` (step 5)

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

Then continue with local product setup and demo scripts:
```bash
# 1) Create token first (prints SUB token address)
pnpm --filter @gater/contracts deploy:subs:create-token:local

# 2) Set SUB_TOKEN from previous step, then mine salt
pnpm --filter @gater/contracts mine:hook-salt

# 3) Setup pool + hook (uses SUB_TOKEN + HOOK_SALT)
pnpm --filter @gater/contracts deploy:subs:create:local

# 4) Buy/refund demo
pnpm --filter @gater/contracts deploy:subs:demo:local
```

`mine:hook-salt` supports two modes:
- safest: set `SUB_TOKEN` to your real created token address
- convenience: omit `SUB_TOKEN` and set `FACTORY`; script predicts next token address from factory nonce

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

## Subscription v4 Deploy Flow (Hardhat, numbered)
Run each step with `--network base` (or use the `:base:*` commands):

```bash
# 1) Deploy MockUSDC and save as deployments/subscriptions.json -> network.usdc
pnpm --filter @gater/contracts deploy:subs:base:01

# 2) Deploy factory + router and save addresses
pnpm --filter @gater/contracts deploy:subs:base:02

# 3) Create SUB token and save sampleToken
pnpm --filter @gater/contracts deploy:subs:base:03

# 4) Mine HOOK_SALT offline (copy FOUND_SALT_HEX into HOOK_SALT in .env)
pnpm --filter @gater/contracts deploy:subs:base:04

# 5) Setup pool + hook + role grants, save sampleHook
pnpm --filter @gater/contracts deploy:subs:base:05

# 6) Verify deployed contracts on Basescan
pnpm --filter @gater/contracts deploy:subs:base:06
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
