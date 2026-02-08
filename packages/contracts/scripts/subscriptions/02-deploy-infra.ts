import hre from "hardhat";

import { envAddress, envNumber } from "./_env.js";
import {
  readSubscriptionsDeployments,
  requireNetworkKey,
  updateSubscriptionDeployment,
} from "./_deploymentState.js";

async function main() {
  const connection = await hre.network.connect();
  const networkKey = requireNetworkKey(connection.networkName);
  const existing = readSubscriptionsDeployments()[networkKey];

  const poolManager = envAddress("POOL_MANAGER", existing.poolManager);
  const usdc = envAddress("USDC", existing.usdc);
  const defaultFee = envNumber("DEFAULT_FEE", 0);
  const defaultTickSpacing = envNumber("DEFAULT_TICK_SPACING", 1);

  const { viem } = connection;
  const [deployer] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();
  const chainId = Number(await publicClient.getChainId());

  console.log(`Network: ${connection.networkName} (${chainId})`);
  console.log(`Deployer: ${deployer.account.address}`);
  console.log(`PoolManager: ${poolManager}`);
  console.log(`USDC: ${usdc}`);

  const factory = await viem.deployContract("SubscriptionFactory", [
    poolManager,
    usdc,
    defaultFee,
    defaultTickSpacing,
  ]);
  const router = await viem.deployContract("SubscriptionRouter", [poolManager, factory.address]);

  console.log(`Factory deployed: ${factory.address}`);
  console.log(`Router deployed: ${router.address}`);

  updateSubscriptionDeployment(networkKey, (record) => ({
    ...record,
    chainId,
    poolManager,
    usdc,
    factory: factory.address,
    router: router.address,
  }));

  console.log(`Updated deployments/subscriptions.json -> ${networkKey}.factory/.router`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
