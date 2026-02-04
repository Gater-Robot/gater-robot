# @gater/contracts

BEST token contracts, tests, and deployment tooling.

## Quick start

```bash
pnpm install
pnpm --filter @gater/contracts build
```

## Environment

This package reads from the **monorepo root** `.env` file. Make sure you've set up the root environment:

```bash
# From monorepo root
cp .env.example .env
```

Required variables (in root `.env`):
- `DEPLOYER_PRIVATE_KEY` - Wallet private key with funds for gas
- `BASE_RPC_URL` - Base mainnet RPC endpoint
- `ARC_RPC_URL` - Arc chain RPC endpoint
- `ARC_CHAIN_ID` - Arc chain ID

## Deployments (Hardhat Ignition)

```bash
pnpm --filter @gater/contracts deploy:base
pnpm --filter @gater/contracts deploy:arc
pnpm --filter @gater/contracts sync:addresses
```

Ignition writes deployment state to `ignition/deployments/` and will reuse it unless you pass `--reset`, which helps avoid redeploying unnecessarily.

## Tests

Hardhat tests:

```bash
pnpm --filter @gater/contracts test
```

Foundry tests:

```bash
forge install OpenZeppelin/openzeppelin-contracts
pnpm --filter @gater/contracts test:forge
```

## Typechain

```bash
pnpm --filter @gater/contracts typechain
```

Generated types will be written to `packages/contracts/typechain` for consumption by the Mini App.
