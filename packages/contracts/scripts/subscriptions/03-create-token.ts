import hre from "hardhat";
import { decodeEventLog, getAddress, type Address } from "viem";

import { envAddress, envString } from "./_env.js";
import {
  readSubscriptionsDeployments,
  requireNetworkKey,
  updateSubscriptionDeployment,
} from "./_deploymentState.js";

async function main() {
  const connection = await hre.network.connect();
  const networkKey = requireNetworkKey(connection.networkName);
  const existing = readSubscriptionsDeployments()[networkKey];

  const factoryAddress = envAddress("FACTORY", existing.factory);
  const tokenName = envString("SUB_NAME", "Gater Subscription Days");
  const tokenSymbol = envString("SUB_SYMBOL", "subDAYS-GATER");

  const { viem } = connection;
  const publicClient = await viem.getPublicClient();
  const chainId = Number(await publicClient.getChainId());
  const factory = await viem.getContractAt("SubscriptionFactory", factoryAddress);

  console.log(`Network: ${connection.networkName} (${chainId})`);
  console.log(`Factory: ${factoryAddress}`);
  console.log(`Creating token: ${tokenName} (${tokenSymbol})`);

  const txHash = await factory.write.createToken([tokenName, tokenSymbol]);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  let tokenAddress: Address | undefined;
  for (const log of receipt.logs) {
    if (getAddress(log.address) !== factoryAddress) continue;
    try {
      const decoded = decodeEventLog({
        abi: factory.abi,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === "TokenCreated") {
        tokenAddress = (decoded as { args: { token: Address } }).args.token;
        break;
      }
    } catch {
      // Ignore unrelated logs.
    }
  }

  if (!tokenAddress) {
    throw new Error("Failed to decode TokenCreated event. Check transaction logs manually.");
  }

  console.log(`SUB token deployed: ${tokenAddress}`);

  updateSubscriptionDeployment(networkKey, (record) => ({
    ...record,
    chainId,
    factory: factoryAddress,
    sampleToken: tokenAddress,
  }));

  console.log(`Updated deployments/subscriptions.json -> ${networkKey}.sampleToken`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
