import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { parseUnits } from "ethers";
import hre from "hardhat";
import bestTokenModule from "../ignition/modules/BestToken.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type DeploymentRecord = {
  chainId?: number;
  bestToken?: string;
};

type DeploymentsFile = Record<string, DeploymentRecord>;

const deploymentsPath = path.join(__dirname, "..", "deployments", "addresses.json");

const readDeployments = async (): Promise<DeploymentsFile> => {
  try {
    const raw = await fs.readFile(deploymentsPath, "utf8");
    return JSON.parse(raw) as DeploymentsFile;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }
    throw error;
  }
};

const writeDeployments = async (data: DeploymentsFile) => {
  await fs.mkdir(path.dirname(deploymentsPath), { recursive: true });
  await fs.writeFile(deploymentsPath, JSON.stringify(data, null, 2));
};

const main = async () => {
  const deployments = await readDeployments();
  const networkName = hre.network.name;
  const existingAddress = deployments[networkName]?.bestToken ?? "";
  const chainId = hre.network.config.chainId;

  const { bestToken } = await hre.ignition.deploy(bestTokenModule, {
    parameters: {
      BestTokenModule: {
        existingAddress,
        name: "Best Token",
        symbol: "BEST",
        claimAmount: parseUnits("2026", 18),
      },
    },
  });

  const deployedAddress = await bestToken.getAddress();

  deployments[networkName] = {
    chainId,
    bestToken: deployedAddress,
  };

  await writeDeployments(deployments);

  console.log(`BestToken deployed on ${networkName}: ${deployedAddress}`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
