# @gater/contracts

BEST token contracts, tests, and deployment tooling.

## Quick start

```bash
pnpm install
pnpm --filter @gater/contracts build
```

## Environment

Copy the example env file and fill in keys:

```bash
cp .env.example .env
```

Required variables:
- `DEPLOYER_PRIVATE_KEY`
- `BASE_RPC_URL`
- `ARC_RPC_URL`
- `ARC_CHAIN_ID`

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
forge install foundry-rs/forge-std
forge install OpenZeppelin/openzeppelin-contracts
pnpm --filter @gater/contracts test:forge
```
