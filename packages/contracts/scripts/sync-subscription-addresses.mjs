import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

loadEnv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const filePath = path.join(__dirname, "..", "deployments", "subscriptions.json");

const network = process.env.SUBS_NETWORK || "baseSepolia";
const valid = new Set(["base", "baseSepolia", "arcTestnet"]);
if (!valid.has(network)) {
  throw new Error(`SUBS_NETWORK must be one of ${Array.from(valid).join(", ")}`);
}

const raw = fs.readFileSync(filePath, "utf8");
const data = JSON.parse(raw);

const existing = data[network] ?? {};

data[network] = {
  chainId: existing.chainId ?? null,
  factory: process.env.SUBS_FACTORY_ADDRESS ?? existing.factory ?? "",
  router: process.env.SUBS_ROUTER_ADDRESS ?? existing.router ?? "",
  poolManager: process.env.SUBS_POOL_MANAGER_ADDRESS ?? existing.poolManager ?? "",
  usdc: process.env.SUBS_USDC_ADDRESS ?? existing.usdc ?? "",
  sampleToken: process.env.SUBS_SAMPLE_TOKEN_ADDRESS ?? existing.sampleToken ?? "",
  sampleHook: process.env.SUBS_SAMPLE_HOOK_ADDRESS ?? existing.sampleHook ?? "",
  updatedAt: new Date().toISOString(),
};

fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Updated ${filePath} for ${network}`);
