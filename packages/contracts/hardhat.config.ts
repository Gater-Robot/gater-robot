import { config as loadEnv } from "dotenv";
import "@nomicfoundation/hardhat-ignition";
import "@nomicfoundation/hardhat-ignition-viem";
import "@nomicfoundation/hardhat-viem";
import hardhatVerify from "@nomicfoundation/hardhat-verify";
import { configVariable, defineConfig, type HardhatUserConfig } from "hardhat/config";

loadEnv();

const accounts = process.env.DEPLOYER_PRIVATE_KEY
  ? [process.env.DEPLOYER_PRIVATE_KEY]
  : [];

const networks: HardhatUserConfig["networks"] = {};

if (process.env.BASE_RPC_URL) {
  networks.base = {
    type: "http",
    url: process.env.BASE_RPC_URL,
    chainId: 8453,
    accounts
  };
}

if (process.env.ARC_TESTNET_RPC_URL) {
  networks.arcTestnet = {
    type: "http",
    url: process.env.ARC_TESTNET_RPC_URL,
    chainId: 5042002,
    accounts
  };
}

export default defineConfig({
  plugins: [hardhatVerify],
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks,
  verify: {
    etherscan: {
      apiKey: configVariable("ETHERSCAN_API_KEY"),
    },
  },
});
