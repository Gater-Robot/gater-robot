import hre from "hardhat";
import { getAddress, isAddress, type Address } from "viem";
import { verifyContract as hardhatVerifyContract } from "@nomicfoundation/hardhat-verify/verify";

import { envNumber, envString } from "./_env.js";
import {
  readSubscriptionsDeployments,
  requireNetworkKey,
  updateSubscriptionDeployment,
} from "./_deploymentState.js";
import { loadPricingFromEnv, sortCurrencies } from "./_pricing.js";

function shouldVerify(address: string | undefined): address is string {
  return Boolean(address && isAddress(address) && BigInt(address) !== 0n);
}

async function verifyContract(address: string, constructorArguments: readonly unknown[]) {
  await hardhatVerifyContract(
    {
      address,
      constructorArgs: [...constructorArguments],
      provider: "etherscan",
    },
    hre
  );
}

async function main() {
  const connection = await hre.network.connect();
  const networkKey = requireNetworkKey(connection.networkName);
  const deployment = readSubscriptionsDeployments()[networkKey];
  const pricing = loadPricingFromEnv();
  const subName = envString("SUB_NAME", "Gater Subscription Days");
  const subSymbol = envString("SUB_SYMBOL", "subDAYS-GATER");
  const defaultFee = envNumber("DEFAULT_FEE", 0);
  const defaultTickSpacing = envNumber("DEFAULT_TICK_SPACING", 1);
  const fee = envNumber("FEE", 0);
  const tickSpacing = envNumber("TICK_SPACING", 1);

  const { viem } = connection;
  const [deployer] = await viem.getWalletClients();
  const owner = getAddress(deployer.account.address);

  const usdc = deployment.usdc;
  const poolManager = deployment.poolManager;
  const factory = deployment.factory;
  const router = deployment.router;
  const subToken = deployment.sampleToken;
  let hook = deployment.sampleHook;

  if (!shouldVerify(poolManager)) throw new Error("Missing poolManager in deployments/subscriptions.json");
  if (!shouldVerify(usdc)) throw new Error("Missing usdc in deployments/subscriptions.json");
  if (!shouldVerify(factory)) throw new Error("Missing factory in deployments/subscriptions.json");
  if (!shouldVerify(router)) throw new Error("Missing router in deployments/subscriptions.json");
  if (!shouldVerify(subToken)) throw new Error("Missing sampleToken in deployments/subscriptions.json");

  if (!shouldVerify(hook)) {
    console.log("sampleHook missing in deployments/subscriptions.json, discovering via factory.getPool(sampleToken)...");
    const factoryContract = await viem.getContractAt("SubscriptionFactory", getAddress(factory));
    const pool = (await factoryContract.read.getPool([getAddress(subToken)])) as [unknown, Address];
    hook = getAddress(pool[1]);
    updateSubscriptionDeployment(networkKey, (record) => ({
      ...record,
      sampleHook: hook,
    }));
    console.log(`Discovered and saved sampleHook: ${hook}`);
  }

  const [currency0, currency1] = sortCurrencies(getAddress(subToken), getAddress(usdc));

  console.log(`Verifying contracts for ${networkKey}...`);

  await verifyContract(usdc, []);
  await verifyContract(factory, [poolManager, usdc, defaultFee, defaultTickSpacing]);
  await verifyContract(router, [poolManager, factory]);
  await verifyContract(subToken, [subName, subSymbol, owner, owner]);
  await verifyContract(hook, [
    poolManager,
    subToken,
    usdc,
    owner,
    router,
    currency0,
    currency1,
    fee,
    tickSpacing,
    {
      basePriceUsdc: pricing.basePriceUsdc,
      monthlyBundleTokens: pricing.monthlyBundleTokens,
      monthlyBundlePriceUsdc: pricing.monthlyBundlePriceUsdc,
      yearlyBundleTokens: pricing.yearlyBundleTokens,
      yearlyBundlePriceUsdc: pricing.yearlyBundlePriceUsdc,
      enforceMinMonthly: pricing.enforceMinMonthly,
      refundsEnabled: pricing.refundsEnabled,
      refundPriceUsdc: pricing.refundPriceUsdc,
    },
  ]);

  console.log("Verification complete.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
