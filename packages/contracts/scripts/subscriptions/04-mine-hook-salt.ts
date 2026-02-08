import hre from "hardhat";
import {
  concatHex,
  encodeAbiParameters,
  getAddress,
  getCreate2Address,
  keccak256,
  padHex,
  parseAbiParameters,
  toHex,
  type Address,
  type Hex,
} from "viem";

import { envAddress, envAddressOptional, envNumber } from "./_env.js";
import { readSubscriptionsDeployments, requireNetworkKey } from "./_deploymentState.js";
import { loadPricingFromEnv, sortCurrencies } from "./_pricing.js";

// Uniswap v4 hook flags required by SubscriptionHook.getHookPermissions()
const REQUIRED_HOOK_FLAGS =
  (1n << 11n) | // BEFORE_ADD_LIQUIDITY_FLAG
  (1n << 9n) | // BEFORE_REMOVE_LIQUIDITY_FLAG
  (1n << 7n) | // BEFORE_SWAP_FLAG
  (1n << 3n); // BEFORE_SWAP_RETURNS_DELTA_FLAG
const ALL_HOOK_MASK = (1n << 14n) - 1n; // Hooks.ALL_HOOK_MASK

async function main() {
  const connection = await hre.network.connect();
  const networkKey = requireNetworkKey(connection.networkName);
  const existing = readSubscriptionsDeployments()[networkKey];

  const factoryAddress = envAddress("FACTORY", existing.factory);
  const poolManager = envAddress("POOL_MANAGER", existing.poolManager);
  const usdc = envAddress("USDC", existing.usdc);
  const subToken = envAddress("SUB_TOKEN", existing.sampleToken);
  const router = envAddress("ROUTER", existing.router);
  const fee = envNumber("FEE", 0);
  const tickSpacing = envNumber("TICK_SPACING", 1);
  // Align with Uniswap's HookMiner.MAX_LOOP by default
  const maxSearch = envNumber("SALT_SEARCH_MAX", 160_444);
  const pricing = loadPricingFromEnv();

  const { viem } = connection;
  const publicClient = await viem.getPublicClient();
  const [deployer] = await viem.getWalletClients();
  const owner = envAddressOptional("OWNER") ?? getAddress(deployer.account.address);
  const artifact = await hre.artifacts.readArtifact("SubscriptionHook");
  const bytecode = artifact.bytecode as Hex;

  if (!bytecode || bytecode === "0x") {
    throw new Error("SubscriptionHook bytecode missing. Run `pnpm --filter @gater/contracts build` first.");
  }

  const [currency0, currency1] = sortCurrencies(subToken, usdc);
  const constructorArgs = encodeAbiParameters(
    parseAbiParameters(
      "address poolManager,address subToken,address usdc,address owner,address router,address currency0,address currency1,uint24 fee,int24 tickSpacing,(uint64,uint32,uint64,uint32,uint64,bool,bool,uint64) pricing"
    ),
    [
      poolManager,
      subToken,
      usdc,
      owner,
      router,
      currency0,
      currency1,
      fee,
      tickSpacing,
      [
        pricing.basePriceUsdc,
        pricing.monthlyBundleTokens,
        pricing.monthlyBundlePriceUsdc,
        pricing.yearlyBundleTokens,
        pricing.yearlyBundlePriceUsdc,
        pricing.enforceMinMonthly,
        pricing.refundsEnabled,
        pricing.refundPriceUsdc,
      ],
    ]
  );

  const initCode = concatHex([bytecode, constructorArgs]);
  const initCodeHash = keccak256(initCode);

  console.log(`Network: ${connection.networkName}`);
  console.log(`Factory: ${factoryAddress}`);
  console.log(`Owner: ${owner}`);
  console.log(`Required flags (masked): 0x${(REQUIRED_HOOK_FLAGS & ALL_HOOK_MASK).toString(16)}`);
  console.log(`Searching salts up to: ${maxSearch}`);

  for (let i = 0; i < maxSearch; i += 1) {
    const salt = padHex(toHex(i), { size: 32 });
    const predictedHook = getCreate2Address({
      from: factoryAddress,
      salt,
      bytecodeHash: initCodeHash,
    });

    // Match Uniswap HookMiner exactly:
    // 1) exact masked flags equality (not subset)
    // 2) predicted address must not already have bytecode
    const flagsMatch = (BigInt(predictedHook) & ALL_HOOK_MASK) === (REQUIRED_HOOK_FLAGS & ALL_HOOK_MASK);
    if (!flagsMatch) continue;

    const code = await publicClient.getCode({ address: predictedHook });
    if (code && code !== "0x") {
      continue;
    }

    if (flagsMatch) {
      console.log(`FOUND_SALT_DEC=${i}`);
      console.log(`FOUND_SALT_HEX=${salt}`);
      console.log(`PREDICTED_HOOK=${predictedHook}`);
      console.log(`PREDICTED_FLAGS=0x${(BigInt(predictedHook) & ALL_HOOK_MASK).toString(16)}`);
      return;
    }
  }

  throw new Error(`No valid salt found in range [0, ${maxSearch}). Increase SALT_SEARCH_MAX.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
