# Contracts

## BestToken ($BEST)

The demo token is an ERC-20 with a one-time faucet claim per wallet. Deployments are handled through Hardhat Ignition and persisted to avoid unnecessary redeployments.

### Deployment workflow
1. Set environment variables in `.env` (see `.env.example`).
2. Run the Ignition deploy script for each network:
   ```bash
   pnpm --filter @gater/contracts hardhat run scripts/deploy.ts --network base
   pnpm --filter @gater/contracts hardhat run scripts/deploy.ts --network arc
   ```
3. The script updates `contracts/deployments/addresses.json` with the latest addresses.

### Address registry
`contracts/deployments/addresses.json` is the source of truth for deployed addresses. Update this file after each deploy.

### TypeChain usage
Compile to generate TypeChain types:
```bash
pnpm --filter @gater/contracts hardhat compile
```
TypeChain outputs to `contracts/typechain-types/` and can be imported by the mini app once the package is linked.

