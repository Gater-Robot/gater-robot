import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const deploymentsDir = path.join(rootDir, "ignition", "deployments");
const outputPath = path.join(rootDir, "deployments", "addresses.json");

const baseChainId = 8453;
const arcChainId = process.env.ARC_CHAIN_ID
  ? Number(process.env.ARC_CHAIN_ID)
  : undefined;

const readDeploymentAddress = (chainId) => {
  if (!chainId) {
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
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return data["BestTokenModule#BestToken"] ?? undefined;
};

const existing = fs.existsSync(outputPath)
  ? JSON.parse(fs.readFileSync(outputPath, "utf8"))
  : {};

const now = new Date().toISOString();

const baseAddress = readDeploymentAddress(baseChainId);
const arcAddress = readDeploymentAddress(arcChainId);

const updated = {
  base: {
    chainId: baseChainId,
    address: baseAddress ?? existing?.base?.address ?? "",
    updatedAt: baseAddress ? now : existing?.base?.updatedAt ?? ""
  },
  arc: {
    chainId: arcChainId ?? existing?.arc?.chainId ?? null,
    address: arcAddress ?? existing?.arc?.address ?? "",
    updatedAt: arcAddress ? now : existing?.arc?.updatedAt ?? ""
  }
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(updated, null, 2)}\n`);

console.log("Updated deployments/addresses.json");
