# TODO

## In Progress
- [ ] Send completion notification via `ntfy_send`

## Done
- [x] Add dedicated deploy workflow doc for local Hardhat, Sepolia, and mainnet
- [x] Ignore Foundry generated deployment artifacts (`packages/contracts/broadcast/`)
- [x] Fix hook salt workflow (predict from factory nonce or use explicit SUB token)
- [x] Fix Foundry/Uniswap local deploy compiler mismatch (`PoolManager.sol` =0.8.26)
- [x] Add Hardhat-local subscription stack deployment support (PoolManager + MockUSDC + Factory + Router)
- [x] Add standalone mock USDC deployment script for local/Base demo networks
- [x] Add local sub-store token tools page for MetaMask add-token buttons (SUB + fake USDC)
- [x] Install/configure Foundry and run Forge test suite
- [x] Enable Hardhat JS/TS test runner and make existing tests execute in CI
- [x] Perform local `apps/sub-store` integration pass for direct router checkout + equal Uniswap links
- [x] Re-run end-to-end validation after follow-up changes
- [x] Save implementation plan doc
- [x] Create and maintain `worklog.md`
- [x] Add v4 dependency/tooling support in `packages/contracts`
- [x] Implement subscription contracts under `packages/contracts/contracts/subscriptions`
- [x] Add `burn` to `SubscriptionDaysToken`
- [x] Add Foundry scripts for deploy/setup/demo
- [x] Add tests (unit/integration/regression updates)
- [x] Update package exports + deployment address schema
- [x] Update docs/runbook/checklists with final commands
- [x] Run validation (build/tests) and capture results
