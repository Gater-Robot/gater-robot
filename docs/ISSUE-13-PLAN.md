# Issue #13 Plan: Deploy $BEST token on Base + Arc mainnets

## Goal
Deploy an ERC-20 demo token ($BEST) on Base and Arc mainnets with a faucet function for claiming. Provide TypeChain types for the mini app, and automate deployment with Hardhat Ignition while persisting deployment addresses to avoid unnecessary redeployments.

## Inputs from decision
- Hardhat v3 with Ignition deployment modules.
- TypeChain types for use in the mini app.
- Foundry tests and Hardhat tests.
- Deploy via Ignition (scripted).
- Save deployment addresses to avoid redeploying unnecessarily.
- Use the latest Hardhat, viem, and wagmi packages.

## Research notes (latest docs + versions)
- Hardhat getting started docs reviewed (Hardhat v3 era).
- Wagmi docs reviewed.
- Viem docs reviewed.
- Latest package versions checked via npm:
  - `hardhat`: 3.1.6
  - `wagmi`: 3.4.2
  - `viem`: 2.45.1

## Planned work breakdown

### 1) Workspace + tooling setup
- Add a new `contracts/` workspace package.
- Add Hardhat v3 config with Ignition, TypeChain, and Ethers v6 plugins.
- Configure network definitions for Base and Arc using environment variables.
- Add Foundry config (`foundry.toml`) for solidity testing.

### 2) Token contract
- Implement `BestToken.sol`:
  - ERC-20 token with name + symbol.
  - `claim()` faucet function that allows a one-time claim per address.
  - Fixed `claimAmount` (2026 tokens with 18 decimals).
  - `hasClaimed` mapping to enforce one claim per wallet.

### 3) Tests
- Hardhat tests for:
  - Initial supply and name/symbol correctness.
  - Faucet claim behavior (mint amount, one-time restriction).
- Foundry tests for:
  - Same scenarios as Hardhat to ensure parity.

### 4) Ignition deployment + address persistence
- Create Ignition module `BestToken.ts` that:
  - Deploys a new token when no existing address is provided.
  - Reuses an existing deployment via `contractAt` when an address is already stored.
- Add a deployment script that:
  - Reads/writes `contracts/deployments/addresses.json`.
  - Passes existing address into Ignition parameters to avoid redeploying.
  - Updates the addresses file post-deploy.

### 5) TypeChain output for mini app
- Configure TypeChain output (e.g., `typechain-types/`).
- Export the TypeChain types via the contracts package so `apps/web` can import them later.

### 6) Documentation
- Document environment variables and deployment commands.
- Document where addresses are stored and how to update them.

## Commands to run (post-implementation)
```bash
# from repo root
pnpm install

# compile + generate types
pnpm --filter @gater/contracts hardhat compile

# run hardhat tests
pnpm --filter @gater/contracts hardhat test

# run foundry tests (if forge installed)
cd contracts && forge test

# deploy with ignition
pnpm --filter @gater/contracts hardhat run scripts/deploy.ts --network base
pnpm --filter @gater/contracts hardhat run scripts/deploy.ts --network arc
```

## Environment variables
Add to `.env` (or CI secrets) for deployment:
- `DEPLOYER_PRIVATE_KEY`
- `BASE_RPC_URL`
- `ARC_RPC_URL`
- `ARC_CHAIN_ID`

## Success criteria mapping
- **ERC-20 on Base + Arc**: Ignition deploy script supports both networks.
- **Faucet function**: `claim()` function in token with one-claim enforcement.
- **Token addresses documented**: `contracts/deployments/addresses.json` + docs update.
- **TypeChain types**: TypeChain configured and exported for mini app usage.

