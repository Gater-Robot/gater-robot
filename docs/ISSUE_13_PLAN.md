# Issue #13 Plan — Deploy $BEST token on Base + Arc mainnets

## Goal
Deploy the $BEST ERC-20 token to **Base mainnet** and **Arc mainnet**, include a faucet function, document contract addresses, and provide tooling for future Mini App integration (TypeChain types + ABI export).

## References (latest docs + versions)
- Hardhat v3 docs: https://hardhat.org/docs/getting-started
- Viem docs: https://viem.sh/docs/getting-started
- Wagmi docs: https://wagmi.sh/react/getting-started
- Latest package versions (checked via `npm view`): Hardhat 3.1.6, Viem 2.45.1, Wagmi 3.4.2, TypeChain 8.3.2.

## Deliverables
1. **Contracts package** (`packages/contracts`)
   - Hardhat v3 + Ignition deployment module
   - ERC-20 token with one-time faucet claim
   - TypeChain config and ABI export for future Mini App use
2. **Tests**
   - Hardhat test
   - Foundry test
3. **Deployment workflow**
   - Ignition deploy scripts for Base + Arc
   - Address sync script to record deployments
4. **Documentation**
   - Package README and deployment instructions
   - Updated address registry file

## Plan
1. **Scaffold contracts package**
   - Create `packages/contracts` with Hardhat v3 config, TypeScript, and environment variables.
2. **Implement token contract**
   - ERC-20 token named `Best Token` with symbol `BEST`.
   - Faucet function that mints **2026 BEST** once per wallet.
3. **Add deployment module**
   - Hardhat Ignition module (`ignition/modules/BestToken.ts`).
   - Network config for Base (chainId 8453) and Arc (chainId from `ARC_CHAIN_ID`).
4. **Add tests**
   - Hardhat test using viem plugin.
   - Foundry test using forge-std.
5. **Add Mini App integration artifacts**
   - ABI export in `packages/contracts/src/abi.ts`.
   - TypeChain config (`ethers-v6` target) to generate types on demand.
6. **Deployment address persistence**
   - Keep ignition deployment state to avoid redeploys.
   - Add `scripts/sync-addresses.mjs` to copy addresses into `deployments/addresses.json`.
7. **Documentation**
   - Record how to deploy, test, and sync addresses.

## Deployment checklist (manual)
1. `cp packages/contracts/.env.example packages/contracts/.env`
2. Fill in:
   - `DEPLOYER_PRIVATE_KEY`
   - `BASE_RPC_URL`
   - `ARC_RPC_URL`
   - `ARC_CHAIN_ID`
3. Deploy:
   - `pnpm --filter @gater/contracts deploy:base`
   - `pnpm --filter @gater/contracts deploy:arc`
4. Record addresses:
   - `pnpm --filter @gater/contracts sync:addresses`
5. Commit updated addresses in `packages/contracts/deployments/addresses.json`.
