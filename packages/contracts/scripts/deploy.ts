import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

import hre from "hardhat";
import bestTokenModule from "../ignition/modules/BestToken.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type NetworkRecord = {
  chainId: number | null;
  address: string;
  updatedAt: string;
};

type DeploymentsFile = {
  base: NetworkRecord;
  arc: NetworkRecord;
};

const deploymentsPath = path.join(__dirname, "..", "deployments", "addresses.json");

const readDeployments = async (): Promise<DeploymentsFile> => {
  try {
    const raw = await fs.readFile(deploymentsPath, "utf8");
    return JSON.parse(raw) as DeploymentsFile;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {
        base: { chainId: 8453, address: "", updatedAt: "" },
        arc: { chainId: null, address: "", updatedAt: "" },
      };
    }
    throw error;
  }
};

const writeDeployments = async (data: DeploymentsFile) => {
  await fs.mkdir(path.dirname(deploymentsPath), { recursive: true });
  await fs.writeFile(deploymentsPath, JSON.stringify(data, null, 2) + "\n");
};

const getNetworkKey = (networkName: string): "base" | "arc" | null => {
  if (networkName === "base" || networkName === "baseSepolia") return "base";
  if (networkName === "arc" || networkName === "arcTestnet") return "arc";
  return null;
};

const main = async () => {
  const deployments = await readDeployments();
  const networkName = hre.network.name;
  const networkKey = getNetworkKey(networkName);
  const chainId = hre.network.config.chainId ?? null;

  console.log(`Deploying BestToken to ${networkName} (chainId: ${chainId})...`);

  const { bestToken } = await hre.ignition.deploy(bestTokenModule);

  const deployedAddress = await bestToken.getAddress();
  const now = new Date().toISOString();

  if (networkKey) {
    deployments[networkKey] = {
      chainId,
      address: deployedAddress,
      updatedAt: now,
    };
    await writeDeployments(deployments);
    console.log(`Updated deployments/addresses.json`);
  }

  console.log(`BestToken deployed on ${networkName}: ${deployedAddress}`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
