import hre from "hardhat";

import { requireNetworkKey, updateSubscriptionDeployment } from "./_deploymentState.js";

async function main() {
  const connection = await hre.network.connect();
  const networkKey = requireNetworkKey(connection.networkName);
  const { viem } = connection;
  const [deployer] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();
  const chainId = Number(await publicClient.getChainId());

  console.log(`Network: ${connection.networkName} (${chainId})`);
  console.log(`Deployer: ${deployer.account.address}`);

  const mockUsdc = await viem.deployContract("MockUSDC", []);
  console.log(`MockUSDC deployed: ${mockUsdc.address}`);

  updateSubscriptionDeployment(networkKey, (record) => ({
    ...record,
    chainId,
    usdc: mockUsdc.address,
  }));

  console.log(`Updated deployments/subscriptions.json -> ${networkKey}.usdc`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
