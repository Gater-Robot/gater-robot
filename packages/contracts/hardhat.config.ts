import { config as loadEnv } from "dotenv";
import "@nomicfoundation/hardhat-ignition";
import "@nomicfoundation/hardhat-ignition-viem";
import "@nomicfoundation/hardhat-viem";
import { defineConfig, type HardhatUserConfig } from "hardhat/config";

loadEnv();

const accounts = process.env.DEPLOYER_PRIVATE_KEY
  ? [process.env.DEPLOYER_PRIVATE_KEY]
  : [];

const arcChainId = process.env.ARC_CHAIN_ID
  ? Number(process.env.ARC_CHAIN_ID)
  : undefined;

const networks: HardhatUserConfig["networks"] = {};

if (process.env.BASE_RPC_URL) {
  networks.base = {
    type: "http",
    url: process.env.BASE_RPC_URL,
    chainId: 8453,
    accounts
  };
}

if (process.env.ARC_RPC_URL && arcChainId) {
  networks.arc = {
    type: "http",
    url: process.env.ARC_RPC_URL,
    chainId: arcChainId,
    accounts
  };
}

export default defineConfig({
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks
});
