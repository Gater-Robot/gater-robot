# Implementation Plan: v4 Subscription System in `packages/contracts` with Manual Runbook + Checklists

## Summary
Build the full subscription protocol in `packages/contracts` using Foundry-first workflows, reusing your existing fractional, per-second decaying `SubscriptionDaysToken` model.
Keep strict ERC20 behavior, implement router-driven `refundAll/refundUpTo` for stale-balance-safe sells, and expose both direct router checkout and Uniswap links in sub-store (equal prominence).
Add hardening fixes identified in review (`sqrtPriceLimitX96`, LP lockout, compile hygiene, version pinning).

## Public API / Interface Changes
1. `SubscriptionDaysToken.sol`
- Add `burn(uint256 amount)` restricted to `MINTER_ROLE`.
- Keep existing transfer/approve/transferFrom strict and unchanged semantically.

2. New contracts in `packages/contracts/contracts/subscriptions/`
- `SubPricing.sol`
- `SafeTransferLib.sol`
- `SubscriptionHook.sol`
- `SubscriptionFactory.sol`
- `SubscriptionRouter.sol`
- `MockUSDC.sol` (local/dev only)

3. Router external methods
- `buyExactOut(token, subOutAmount, maxUsdcIn, recipient, deadline, hookData)`
- `refundExactIn(token, subInAmount, minUsdcOut, recipient, deadline, hookData)`
- `refundAll(token, minUsdcOut, recipient, deadline, hookData)`
- `refundUpTo(token, maxSubIn, minUsdcOut, recipient, deadline, hookData)`

4. Hook external methods
- `quoteBuyExactOut(subOutAmount)`
- `quoteRefundExactIn(subInAmount)`
- admin setters for pricing/router + reserve withdraw

5. Factory external methods
- `createToken(name, symbol)`
- `setupPool(params)`
- `getPool(token)`

6. `packages/contracts/src` exports
- Add ABI/address exports for subscription contracts while preserving current BEST exports.

## Implementation Phases
1. Dependency and toolchain setup
- Pin Uniswap v4 core/periphery versions compatible with `BaseHook` override signatures.
- Update `foundry.toml` remappings and compiler for subscription contracts.
- Keep existing Hardhat configs and legacy token scripts/tests intact.

2. Core contract implementation
- Implement pricing library with fractional-safe math.
- Reuse `SubscriptionDaysToken` behavior; add only burn-by-minter.
- Implement hook custom accounting with router authorization and pool-key pinning.
- Implement factory deployment and hook-flag enforcement.
- Implement router unlock callback flows for buy/refund/refundAll/refundUpTo.

3. Security and correctness hardening
- Replace `sqrtPriceLimitX96: 0` with directional bounds.
- Explicitly block add/remove liquidity through hook permissions + revert callbacks.
- Remove sentinel return patterns in pricing; use explicit reverts.
- Add reserve precheck for refund UX before unlock.

4. Scripts and operational flow
- Add Foundry scripts:
`MineHookSalt.s.sol`, `DeploySubscriptionsInfra.s.sol`, `CreateSubscriptionProduct.s.sol`, `DemoBuyRefund.s.sol`.
- Scripted product flow is canonical for milestone 1 (salt mining not done in browser).

5. Testing
- Add Foundry unit + integration tests for all paths and edge cases.
- Keep and run current Hardhat tests for existing contracts to avoid regressions.

6. Local sub-store integration (non-tracked files)
- Replace old ABI assumptions locally in `apps/sub-store`.
- Wire create/manage/storefront UX to new factory/hook/router addresses and methods.
- Show direct router and Uniswap actions side-by-side.

## Manual Instructions (Step-by-Step Runbook)
1. Install deps from repo root:
`pnpm install`

2. Prepare contracts env:
- Copy `packages/contracts/.env.example` to `packages/contracts/.env`.
- Fill `DEPLOYER_PRIVATE_KEY`, `BASE_RPC_URL`, optional Arc vars, and verifier key.

3. Install Foundry libs inside `packages/contracts`:
- Install OpenZeppelin (if missing).
- Install pinned Uniswap v4 core/periphery versions.
- Ensure remappings in `packages/contracts/foundry.toml` resolve all imports.

4. Compile and test contracts:
- Hardhat legacy compile/test:
`pnpm --filter @gater/contracts build`
`pnpm --filter @gater/contracts test`
- Foundry tests:
`pnpm --filter @gater/contracts test:forge`

5. Local end-to-end (Anvil):
- Start anvil.
- Deploy mock USDC + infra script.
- Create token and mine hook salt.
- Run setupPool script.
- Run demo buy/refund script including `refundAll`.

6. Base Sepolia flow:
- Set Base Sepolia RPC/private key in `packages/contracts/.env`.
- Run infra deploy script.
- Run create/setup scripts for one product.
- Save addresses to deployment artifact JSON used by consumers.

7. Local sub-store verification (because app is git-ignored):
- Update local `.env` in `apps/sub-store` with deployed addresses.
- Run `pnpm --filter @gater/sub-store dev`.
- Validate direct router actions and Uniswap-link actions against deployed contracts.

## Pre-Flight Checklist
- [ ] `packages/contracts` compiles with both Hardhat and Foundry.
- [ ] Uniswap v4 dependencies are pinned and remappings resolve.
- [ ] `SubscriptionDaysToken` includes `burn` role-gated path.
- [ ] Router uses directional `sqrtPriceLimitX96` bounds, never `0`.
- [ ] Hook blocks add/remove liquidity.
- [ ] Factory, router, hook, token role wiring scripts are present.
- [ ] `deployments` schema includes subscription contract addresses.
- [ ] Base Sepolia RPC and funded deployer are ready.
- [ ] `apps/sub-store` local env can point to new addresses.
- [ ] `ntfy_send` binary is installed and in PATH for final notification.

## UAT Checklist
- [ ] Create token and setup pool completes successfully via scripts.
- [ ] Buy exact output for 7, 30, 365 token amounts settles correctly.
- [ ] Bundle pricing applies exactly to 30 and 365; non-bundle fractional amounts price correctly.
- [ ] Refund exact input works for fractional amounts.
- [ ] `refundAll` succeeds after intentional delay where balance decays between quote intent and submission.
- [ ] `refundUpTo` clamps to current balance and succeeds.
- [ ] Refunds fail with clear error when reserve is insufficient.
- [ ] Unauthorized sender cannot call hook swap path.
- [ ] Any add/remove liquidity attempt reverts.
- [ ] Direct router checkout in sub-store succeeds.
- [ ] Uniswap link path behavior is clearly labeled and non-canonical for decaying max-sell.
- [ ] No regressions in existing BEST token tests/tooling.

## Completion Notification Procedure
1. After implementation and all checklist items pass, run:
`ntfy_send "gater-robot subscriptions implementation complete: pre-flight + UAT passed"`
2. If `ntfy_send` fails at runtime, log failure in final report and include full checklist status in chat.

## Test Cases and Scenarios (Minimum Required)
1. Unit math tests
- Fractional buy math rounding.
- Fractional refund math rounding.
- Bundle-edge behavior.
- min-purchase enforcement (if enabled).

2. Integration tests
- Buy flow accounting with hook deltas.
- Refund flow accounting with hook deltas.
- `refundAll` and `refundUpTo` against decayed balances.
- Reserve insufficiency and revert reasons.
- Invalid pool key and unauthorized router sender reverts.

3. Regression tests
- Existing `SubscriptionDaysToken` decay behavior unchanged except added burn.
- Existing BEST token suite remains green.

## Assumptions and Defaults
1. Coupons are deferred; `hookData` is pass-through only.
2. SUB remains transferable.
3. Fractional buy/refund is supported and preferred.
4. Product creation is script-driven in milestone 1.
5. `apps/sub-store` remains git-ignored; integration changes there are local-only unless ignore policy changes.
6. Notification relies on `ntfy_send` being available by implementation completion time.
