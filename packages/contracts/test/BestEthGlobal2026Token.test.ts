import { strict as assert } from "node:assert";
import { describe, it } from "mocha";
import hre from "hardhat";
import { parseEther } from "viem";

const TOKEN_NAME = "Best Token";
const TOKEN_SYMBOL = "BEST";

describe("BestEthGlobal2026Token", () => {
  it("allows a one-time faucet claim", async () => {
    const [deployer, alice] = await hre.viem.getWalletClients();

    const contract = await hre.viem.deployContract(
      "BestEthGlobal2026Token",
      [TOKEN_NAME, TOKEN_SYMBOL, deployer.account.address],
      { account: deployer.account }
    );

    await contract.write.faucet({ account: alice.account });

    const balance = await contract.read.balanceOf([alice.account.address]);
    assert.equal(balance, parseEther("2026"));
  });

  it("rejects duplicate faucet claims", async () => {
    const [deployer, alice] = await hre.viem.getWalletClients();

    const contract = await hre.viem.deployContract(
      "BestEthGlobal2026Token",
      [TOKEN_NAME, TOKEN_SYMBOL, deployer.account.address],
      { account: deployer.account }
    );

    await contract.write.faucet({ account: alice.account });

    await assert.rejects(
      contract.write.faucet({ account: alice.account }),
      /Faucet already claimed/
    );
  });

  it("allows owner to claim via faucetFor on behalf of another address", async () => {
    const [deployer, alice] = await hre.viem.getWalletClients();

    const contract = await hre.viem.deployContract(
      "BestEthGlobal2026Token",
      [TOKEN_NAME, TOKEN_SYMBOL, deployer.account.address],
      { account: deployer.account }
    );

    await contract.write.faucetFor([alice.account.address], {
      account: deployer.account,
    });

    const balance = await contract.read.balanceOf([alice.account.address]);
    assert.equal(balance, parseEther("2026"));
  });

  it("rejects faucetFor from non-owner", async () => {
    const [deployer, alice] = await hre.viem.getWalletClients();

    const contract = await hre.viem.deployContract(
      "BestEthGlobal2026Token",
      [TOKEN_NAME, TOKEN_SYMBOL, deployer.account.address],
      { account: deployer.account }
    );

    await assert.rejects(
      contract.write.faucetFor([alice.account.address], {
        account: alice.account,
      }),
      /OwnableUnauthorizedAccount/
    );
  });

  it("rejects faucetFor for already claimed address", async () => {
    const [deployer, alice] = await hre.viem.getWalletClients();

    const contract = await hre.viem.deployContract(
      "BestEthGlobal2026Token",
      [TOKEN_NAME, TOKEN_SYMBOL, deployer.account.address],
      { account: deployer.account }
    );

    await contract.write.faucet({ account: alice.account });

    await assert.rejects(
      contract.write.faucetFor([alice.account.address], {
        account: deployer.account,
      }),
      /Faucet already claimed/
    );
  });

  it("faucetFor and faucet share hasClaimed mapping", async () => {
    const [deployer, alice] = await hre.viem.getWalletClients();

    const contract = await hre.viem.deployContract(
      "BestEthGlobal2026Token",
      [TOKEN_NAME, TOKEN_SYMBOL, deployer.account.address],
      { account: deployer.account }
    );

    await contract.write.faucetFor([alice.account.address], {
      account: deployer.account,
    });

    await assert.rejects(
      contract.write.faucet({ account: alice.account }),
      /Faucet already claimed/
    );
  });
});
