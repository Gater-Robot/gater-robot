import dotenv from "dotenv";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-ignition";
import "@nomicfoundation/hardhat-ignition-ethers";
import "@nomicfoundation/hardhat-network-helpers";
import "@typechain/hardhat";

dotenv.config({ path: "../.env" });

type NetworkConfig = {
  url: string;
  accounts: string[];
  chainId?: number;
};

const buildNetwork = (url: string | undefined, chainId?: number): NetworkConfig => ({
  url: url ?? "",
  chainId,
  accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
});

const arcChainId = process.env.ARC_CHAIN_ID ? Number(process.env.ARC_CHAIN_ID) : undefined;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    base: buildNetwork(process.env.BASE_RPC_URL, 8453),
    arc: buildNetwork(process.env.ARC_RPC_URL, arcChainId),
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
};

export default config;
