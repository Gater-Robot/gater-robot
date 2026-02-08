import hre from "hardhat";
import { decodeEventLog, getAddress, padHex, toHex, type Address, type Hex } from "viem";

import { envAddress, envNumber, envString } from "./_env.js";
import {
  readSubscriptionsDeployments,
  requireNetworkKey,
  updateSubscriptionDeployment,
} from "./_deploymentState.js";
import { loadPricingFromEnv } from "./_pricing.js";

const REQUIRED_HOOK_FLAGS =
  (1n << 11n) | // BEFORE_ADD_LIQUIDITY_FLAG
  (1n << 9n) | // BEFORE_REMOVE_LIQUIDITY_FLAG
  (1n << 7n) | // BEFORE_SWAP_FLAG
  (1n << 3n); // BEFORE_SWAP_RETURNS_DELTA_FLAG
const ALL_HOOK_MASK = (1n << 14n) - 1n; // Hooks.ALL_HOOK_MASK

function parseHookSalt(raw: string): Hex {
  const value = raw.trim();
  if (value.startsWith("0x")) {
    return padHex(value as Hex, { size: 32 });
  }
  return padHex(toHex(BigInt(value)), { size: 32 });
}

async function main() {
  const connection = await hre.network.connect();
  const networkKey = requireNetworkKey(connection.networkName);
  const existing = readSubscriptionsDeployments()[networkKey];

  const factoryAddress = envAddress("FACTORY", existing.factory);
  const router = envAddress("ROUTER", existing.router);
  const poolManager = envAddress("POOL_MANAGER", existing.poolManager);
  const subToken = envAddress("SUB_TOKEN", existing.sampleToken);
  const fee = envNumber("FEE", 0);
  const tickSpacing = envNumber("TICK_SPACING", 1);
  const hookSalt = parseHookSalt(envString("HOOK_SALT"));
  const pricing = loadPricingFromEnv();

  const { viem } = connection;
  const publicClient = await viem.getPublicClient();
  const [deployer] = await viem.getWalletClients();
  const chainId = Number(await publicClient.getChainId());

  const factory = await viem.getContractAt("SubscriptionFactory", factoryAddress);
  const token = await viem.getContractAt("SubscriptionDaysToken", subToken);

  console.log(`Network: ${connection.networkName} (${chainId})`);
  console.log(`Factory: ${factoryAddress}`);
  console.log(`Router: ${router}`);
  console.log(`SUB token: ${subToken}`);
  console.log(`Hook salt: ${hookSalt}`);

  const setupParams = {
    token: subToken,
    router,
    fee,
    tickSpacing,
    hookSalt,
    pricing: {
      basePriceUsdc: pricing.basePriceUsdc,
      monthlyBundleTokens: pricing.monthlyBundleTokens,
      monthlyBundlePriceUsdc: pricing.monthlyBundlePriceUsdc,
      yearlyBundleTokens: pricing.yearlyBundleTokens,
      yearlyBundlePriceUsdc: pricing.yearlyBundlePriceUsdc,
      enforceMinMonthly: pricing.enforceMinMonthly,
      refundsEnabled: pricing.refundsEnabled,
      refundPriceUsdc: pricing.refundPriceUsdc,
    },
  } as const;

  // Preflight: check this salt will pass Uniswap BaseHook permission validation.
  const predicted = (await factory.read.predictHookAddress([
    setupParams,
    deployer.account.address,
  ])) as [Address, Address, Address];
  const predictedHook = predicted[0];
  const predictedFlags = BigInt(predictedHook) & ALL_HOOK_MASK;
  const requiredFlags = REQUIRED_HOOK_FLAGS & ALL_HOOK_MASK;

  console.log(`Predicted hook: ${predictedHook}`);
  console.log(`Predicted flags: 0x${predictedFlags.toString(16)}`);
  console.log(`Required flags: 0x${requiredFlags.toString(16)}`);

  if (predictedFlags !== requiredFlags) {
    throw new Error(
      `HOOK_SALT is invalid for this config. Predicted flags 0x${predictedFlags.toString(16)} != required 0x${requiredFlags.toString(16)}. Rerun step 4 and update HOOK_SALT.`
    );
  }

  const predictedCode = await publicClient.getCode({ address: predictedHook });
  if (predictedCode && predictedCode !== "0x") {
    throw new Error(
      `Predicted hook address already has code (${predictedHook}). Rerun step 4 to mine a different HOOK_SALT.`
    );
  }

  const setupTxHash = await factory.write.setupPool([setupParams]);
  const setupReceipt = await publicClient.waitForTransactionReceipt({ hash: setupTxHash });

  let hookAddress: Address | undefined;
  for (const log of setupReceipt.logs) {
    if (getAddress(log.address) !== factoryAddress) continue;
    try {
      const decoded = decodeEventLog({
        abi: factory.abi,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === "PoolSetup") {
        hookAddress = (decoded as { args: { hook: Address } }).args.hook;
        break;
      }
    } catch {
      // Ignore unrelated logs.
    }
  }

  if (!hookAddress) {
    const pool = (await factory.read.getPool([subToken])) as [unknown, Address];
    hookAddress = pool[1];
  }

  const minterRole = await token.read.MINTER_ROLE();
  const decayExemptRole = await token.read.DECAY_EXEMPT_ROLE();

  await token.write.grantRole([minterRole, hookAddress]);
  await token.write.grantRole([decayExemptRole, poolManager]);
  await token.write.grantRole([decayExemptRole, hookAddress]);

  console.log(`Hook deployed: ${hookAddress}`);
  console.log("Configured MINTER_ROLE + DECAY_EXEMPT_ROLE grants");

  updateSubscriptionDeployment(networkKey, (record) => ({
    ...record,
    chainId,
    factory: factoryAddress,
    router,
    poolManager,
    sampleToken: subToken,
    sampleHook: hookAddress,
  }));

  console.log(`Updated deployments/subscriptions.json -> ${networkKey}.sampleHook`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
