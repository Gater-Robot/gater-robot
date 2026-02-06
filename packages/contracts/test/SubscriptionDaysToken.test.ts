import { strict as assert } from "node:assert";
import { describe, it } from "mocha";
import hre from "hardhat";
import { parseEther } from "viem";

const TOKEN_NAME = "Gater Private Group: Subscription Days Remaining";
const TOKEN_SYMBOL = "GATER-days";
const DAY_SECONDS = 24 * 60 * 60;

async function increaseTime(seconds: number) {
  await hre.network.provider.send("evm_increaseTime", [seconds]);
  await hre.network.provider.send("evm_mine");
}

describe("SubscriptionDaysToken", () => {
  it("deploys with expected metadata, roles, and default admin delay", async () => {
    const [admin, minter] = await hre.viem.getWalletClients();

    const contract = await hre.viem.deployContract(
      "SubscriptionDaysToken",
      [TOKEN_NAME, TOKEN_SYMBOL, admin.account.address, minter.account.address],
      { account: admin.account }
    );

    assert.equal(await contract.read.name(), TOKEN_NAME);
    assert.equal(await contract.read.symbol(), TOKEN_SYMBOL);
    assert.equal(await contract.read.defaultAdminDelay(), 1n);

    const minterRole = await contract.read.MINTER_ROLE();
    const defaultAdminRole = await contract.read.DEFAULT_ADMIN_ROLE();

    assert.equal(
      await contract.read.hasRole([minterRole, minter.account.address]),
      true
    );
    assert.equal(
      await contract.read.hasRole([defaultAdminRole, admin.account.address]),
      true
    );
  });

  it("applies linear per-second decay to balanceOf", async () => {
    const [admin, minter, alice] = await hre.viem.getWalletClients();

    const contract = await hre.viem.deployContract(
      "SubscriptionDaysToken",
      [TOKEN_NAME, TOKEN_SYMBOL, admin.account.address, minter.account.address],
      { account: admin.account }
    );

    await contract.write.mint([alice.account.address, parseEther("10")], {
      account: minter.account
    });

    await increaseTime(Math.floor(DAY_SECONDS * 1.5));

    const decayedBalance = await contract.read.balanceOf([alice.account.address]);
    assert.equal(decayedBalance, parseEther("8.5"));
  });

  it("saturates at zero and can settle burned decay into supply", async () => {
    const [admin, minter, alice, caller] = await hre.viem.getWalletClients();

    const contract = await hre.viem.deployContract(
      "SubscriptionDaysToken",
      [TOKEN_NAME, TOKEN_SYMBOL, admin.account.address, minter.account.address],
      { account: admin.account }
    );

    await contract.write.mint([alice.account.address, parseEther("2")], {
      account: minter.account
    });

    await increaseTime(DAY_SECONDS * 3);

    const visibleBalanceBeforeSettle = await contract.read.balanceOf([
      alice.account.address
    ]);
    const rawBalanceBeforeSettle = await contract.read.rawBalanceOf([
      alice.account.address
    ]);
    assert.equal(visibleBalanceBeforeSettle, 0n);
    assert.equal(rawBalanceBeforeSettle, parseEther("2"));

    await contract.write.settleDecay([alice.account.address], {
      account: caller.account
    });

    const rawBalanceAfterSettle = await contract.read.rawBalanceOf([
      alice.account.address
    ]);
    const totalSupplyAfterSettle = await contract.read.totalSupply();

    assert.equal(rawBalanceAfterSettle, 0n);
    assert.equal(totalSupplyAfterSettle, 0n);
  });

  it("settles sender and recipient before transfer accounting", async () => {
    const [admin, minter, alice, bob] = await hre.viem.getWalletClients();

    const contract = await hre.viem.deployContract(
      "SubscriptionDaysToken",
      [TOKEN_NAME, TOKEN_SYMBOL, admin.account.address, minter.account.address],
      { account: admin.account }
    );

    await contract.write.mint([alice.account.address, parseEther("5")], {
      account: minter.account
    });

    await increaseTime(DAY_SECONDS);

    await contract.write.transfer([bob.account.address, parseEther("2")], {
      account: alice.account
    });

    assert.equal(
      await contract.read.balanceOf([alice.account.address]),
      parseEther("2")
    );
    assert.equal(
      await contract.read.balanceOf([bob.account.address]),
      parseEther("2")
    );

    await increaseTime(DAY_SECONDS);

    assert.equal(
      await contract.read.balanceOf([alice.account.address]),
      parseEther("1")
    );
    assert.equal(
      await contract.read.balanceOf([bob.account.address]),
      parseEther("1")
    );
  });

  it("settles before exempting and restarts decay from revoke time", async () => {
    const [admin, minter, alice] = await hre.viem.getWalletClients();

    const contract = await hre.viem.deployContract(
      "SubscriptionDaysToken",
      [TOKEN_NAME, TOKEN_SYMBOL, admin.account.address, minter.account.address],
      { account: admin.account }
    );

    await contract.write.mint([alice.account.address, parseEther("5")], {
      account: minter.account
    });

    await increaseTime(DAY_SECONDS);

    await contract.write.setDecayExempt([alice.account.address, true], {
      account: admin.account
    });

    assert.equal(
      await contract.read.balanceOf([alice.account.address]),
      parseEther("4")
    );

    await increaseTime(DAY_SECONDS * 2);

    assert.equal(
      await contract.read.balanceOf([alice.account.address]),
      parseEther("4")
    );

    await contract.write.setDecayExempt([alice.account.address, false], {
      account: admin.account
    });

    await increaseTime(DAY_SECONDS);

    assert.equal(
      await contract.read.balanceOf([alice.account.address]),
      parseEther("3")
    );
  });
});
