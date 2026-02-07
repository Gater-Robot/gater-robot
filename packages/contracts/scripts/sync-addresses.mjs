import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

loadEnv();

const rootDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const deploymentsDir = path.join(rootDir, "ignition", "deployments");
const outputPath = path.join(rootDir, "deployments", "addresses.json");

const baseChainId = 8453;
const baseSepoliaChainId = 84532;
const arcChainIdEnv = process.env.ARC_CHAIN_ID;
const arcChainId = arcChainIdEnv ? Number(arcChainIdEnv) : undefined;
const hasArcChainId = Number.isFinite(arcChainId);

const readDeploymentAddress = (chainId) => {
  if (chainId === null || chainId === undefined) {
    return undefined;
  }
  const filePath = path.join(
    deploymentsDir,
    `chain-${chainId}`,
    "deployed_addresses.json"
  );
  if (!fs.existsSync(filePath)) {
    return undefined;
  }
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return data["BestEthGlobal2026TokenModule#BestEthGlobal2026Token"] ?? undefined;
  } catch (error) {
    console.error(`Error parsing deployment file for chain ${chainId}: ${error.message}`);
    return undefined;
  }
};

let existing = {};
if (fs.existsSync(outputPath)) {
  try {
    existing = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  } catch (error) {
    console.error(`Error parsing existing addresses.json: ${error.message}. Starting fresh.`);
  }
}

const now = new Date().toISOString();

const baseAddress = readDeploymentAddress(baseChainId);
const baseSepoliaAddress = readDeploymentAddress(baseSepoliaChainId);
const arcAddress = readDeploymentAddress(hasArcChainId ? arcChainId : undefined);

const updated = {
  base: {
    chainId: baseChainId,
    address: baseAddress ?? existing?.base?.address ?? "",
    updatedAt: baseAddress ? now : existing?.base?.updatedAt ?? ""
  },
  baseSepolia: {
    chainId: baseSepoliaChainId,
    address: baseSepoliaAddress ?? existing?.baseSepolia?.address ?? "",
    updatedAt: baseSepoliaAddress ? now : existing?.baseSepolia?.updatedAt ?? ""
  },
  arc: {
    chainId: hasArcChainId ? arcChainId : existing?.arc?.chainId ?? null,
    address: arcAddress ?? existing?.arc?.address ?? "",
    updatedAt: arcAddress ? now : existing?.arc?.updatedAt ?? ""
  }
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(updated, null, 2)}\n`);

console.log("Updated deployments/addresses.json");
