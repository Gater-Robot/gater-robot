import { config as loadEnv } from "dotenv";
import "@nomicfoundation/hardhat-ignition";
import "@nomicfoundation/hardhat-ignition-viem";
import "@nomicfoundation/hardhat-viem";
import "@typechain/hardhat";
import { defineConfig } from "hardhat/config";

loadEnv();

const accounts = process.env.DEPLOYER_PRIVATE_KEY
  ? [process.env.DEPLOYER_PRIVATE_KEY]
  : [];

const arcChainId = process.env.ARC_CHAIN_ID
  ? Number(process.env.ARC_CHAIN_ID)
  : undefined;

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
  typechain: {
    outDir: "typechain",
    target: "ethers-v6"
  },
  networks: {
    base: {
      url: process.env.BASE_RPC_URL ?? "",
      chainId: 8453,
      accounts
    },
    arc: {
      url: process.env.ARC_RPC_URL ?? "",
      chainId: arcChainId,
      accounts
    }
  }
});
