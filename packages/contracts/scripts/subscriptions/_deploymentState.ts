import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type NetworkKey = "base" | "baseSepolia" | "arcTestnet";

export type SubscriptionDeploymentRecord = {
  chainId: number | null;
  factory: string;
  router: string;
  poolManager: string;
  usdc: string;
  sampleToken: string;
  sampleHook: string;
  updatedAt: string;
};

type SubscriptionDeployments = Record<NetworkKey, SubscriptionDeploymentRecord>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const deploymentsPath = path.join(__dirname, "..", "..", "deployments", "subscriptions.json");

const EMPTY_RECORD = (): SubscriptionDeploymentRecord => ({
  chainId: null,
  factory: "",
  router: "",
  poolManager: "",
  usdc: "",
  sampleToken: "",
  sampleHook: "",
  updatedAt: "",
});

function createEmptyDeployments(): SubscriptionDeployments {
  return {
    base: EMPTY_RECORD(),
    baseSepolia: EMPTY_RECORD(),
    arcTestnet: EMPTY_RECORD(),
  };
}

export function getNetworkKey(networkName: string): NetworkKey | null {
  if (networkName === "base") return "base";
  if (networkName === "baseSepolia") return "baseSepolia";
  if (networkName === "arcTestnet") return "arcTestnet";
  return null;
}

export function requireNetworkKey(networkName: string): NetworkKey {
  const key = getNetworkKey(networkName);
  if (!key) {
    throw new Error(
      `Unsupported network "${networkName}". Use one of: base, baseSepolia, arcTestnet`
    );
  }
  return key;
}

export function readSubscriptionsDeployments(): SubscriptionDeployments {
  if (!fs.existsSync(deploymentsPath)) {
    return createEmptyDeployments();
  }

  const raw = fs.readFileSync(deploymentsPath, "utf8");
  const parsed = JSON.parse(raw) as Partial<SubscriptionDeployments>;

  return {
    base: { ...EMPTY_RECORD(), ...parsed.base },
    baseSepolia: { ...EMPTY_RECORD(), ...parsed.baseSepolia },
    arcTestnet: { ...EMPTY_RECORD(), ...parsed.arcTestnet },
  };
}

export function updateSubscriptionDeployment(
  network: NetworkKey,
  updater: (record: SubscriptionDeploymentRecord) => SubscriptionDeploymentRecord
) {
  const current = readSubscriptionsDeployments();
  const nextRecord = updater(current[network]);
  current[network] = {
    ...nextRecord,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(deploymentsPath, `${JSON.stringify(current, null, 2)}\n`);
}
