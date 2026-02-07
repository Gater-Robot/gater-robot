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

  it("faucetFor emits FaucetClaimed event", async () => {
    const [deployer, alice] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();

    const contract = await hre.viem.deployContract(
      "BestEthGlobal2026Token",
      [TOKEN_NAME, TOKEN_SYMBOL, deployer.account.address],
      { account: deployer.account }
    );

    const hash = await contract.write.faucetFor([alice.account.address], {
      account: deployer.account,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    assert.ok(receipt.logs.length > 0, "Expected at least one log");
    const eventLog = receipt.logs.find(
      (log) =>
        log.topics[0] ===
        "0xba1c1e36520441e56e69b83b76e57eed5b6f1f55a5e1de88f10e446efb928a18"
    );
    assert.ok(eventLog, "Expected FaucetClaimed event to be emitted");
  });

  it("faucetFor allows multiple different beneficiaries", async () => {
    const [deployer, alice, bob] = await hre.viem.getWalletClients();

    const contract = await hre.viem.deployContract(
      "BestEthGlobal2026Token",
      [TOKEN_NAME, TOKEN_SYMBOL, deployer.account.address],
      { account: deployer.account }
    );

    await contract.write.faucetFor([alice.account.address], {
      account: deployer.account,
    });
    await contract.write.faucetFor([bob.account.address], {
      account: deployer.account,
    });

    const aliceBalance = await contract.read.balanceOf([
      alice.account.address,
    ]);
    const bobBalance = await contract.read.balanceOf([bob.account.address]);
    assert.equal(aliceBalance, parseEther("2026"));
    assert.equal(bobBalance, parseEther("2026"));
  });

  it("hasClaimed returns true after faucetFor", async () => {
    const [deployer, alice] = await hre.viem.getWalletClients();

    const contract = await hre.viem.deployContract(
      "BestEthGlobal2026Token",
      [TOKEN_NAME, TOKEN_SYMBOL, deployer.account.address],
      { account: deployer.account }
    );

    await contract.write.faucetFor([alice.account.address], {
      account: deployer.account,
    });

    const claimed = await contract.read.hasClaimed([alice.account.address]);
    assert.equal(claimed, true);
  });

  it("hasClaimed returns false before any claim", async () => {
    const [deployer, alice] = await hre.viem.getWalletClients();

    const contract = await hre.viem.deployContract(
      "BestEthGlobal2026Token",
      [TOKEN_NAME, TOKEN_SYMBOL, deployer.account.address],
      { account: deployer.account }
    );

    const claimed = await contract.read.hasClaimed([alice.account.address]);
    assert.equal(claimed, false);
  });
});
