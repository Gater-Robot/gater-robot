import { strict as assert } from "node:assert";
import { beforeEach, describe, it } from "mocha";
import hre from "hardhat";
import { parseEther } from "viem";

const TOKEN_NAME = "Gater Private Group: Subscription Days Remaining";
const TOKEN_SYMBOL = "GATER-days";
const DAY_SECONDS = 24 * 60 * 60;
const ONE_SECOND_DECAY = parseEther("1") / BigInt(DAY_SECONDS);
const DECAY_TOLERANCE = ONE_SECOND_DECAY * 2n;

type ConnectedNetwork = Awaited<ReturnType<typeof hre.network.connect>>;

let network: ConnectedNetwork;

function getViem() {
  return network.viem;
}

async function increaseTime(seconds: number) {
  await network.networkHelpers.time.increase(seconds);
}

function assertBigIntClose(actual: bigint, expected: bigint, tolerance = DECAY_TOLERANCE) {
  const diff = actual >= expected ? actual - expected : expected - actual;
  assert.ok(
    diff <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}, diff=${diff}`
  );
}

describe("SubscriptionDaysToken", () => {
  beforeEach(async () => {
    network = await hre.network.connect();
  });

  it("deploys with expected metadata, roles, and default admin delay", async () => {
    const viem = await getViem();
    const [admin, minter] = await viem.getWalletClients();

    const contract = await viem.deployContract(
      "SubscriptionDaysToken",
      [TOKEN_NAME, TOKEN_SYMBOL, admin.account.address, minter.account.address],
      { account: admin.account }
    );

    assert.equal(await contract.read.name(), TOKEN_NAME);
    assert.equal(await contract.read.symbol(), TOKEN_SYMBOL);
    assert.equal(Number(await contract.read.defaultAdminDelay()), 1);

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
    const viem = await getViem();
    const [admin, minter, alice] = await viem.getWalletClients();

    const contract = await viem.deployContract(
      "SubscriptionDaysToken",
      [TOKEN_NAME, TOKEN_SYMBOL, admin.account.address, minter.account.address],
      { account: admin.account }
    );

    await contract.write.mint([alice.account.address, parseEther("10")], {
      account: minter.account
    });

    await increaseTime(Math.floor(DAY_SECONDS * 1.5));

    const decayedBalance = await contract.read.balanceOf([alice.account.address]);
    assertBigIntClose(decayedBalance, parseEther("8.5"));
  });

  it("saturates at zero and can settle burned decay into supply", async () => {
    const viem = await getViem();
    const [admin, minter, alice, caller] = await viem.getWalletClients();

    const contract = await viem.deployContract(
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
    const viem = await getViem();
    const [admin, minter, alice, bob] = await viem.getWalletClients();

    const contract = await viem.deployContract(
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

    assertBigIntClose(
      await contract.read.balanceOf([alice.account.address]),
      parseEther("2")
    );
    assertBigIntClose(
      await contract.read.balanceOf([bob.account.address]),
      parseEther("2")
    );

    await increaseTime(DAY_SECONDS - 1);

    assertBigIntClose(
      await contract.read.balanceOf([alice.account.address]),
      parseEther("1")
    );
    assertBigIntClose(
      await contract.read.balanceOf([bob.account.address]),
      parseEther("1")
    );
  });

  it("settles before exempting and restarts decay from revoke time", async () => {
    const viem = await getViem();
    const [admin, minter, alice] = await viem.getWalletClients();

    const contract = await viem.deployContract(
      "SubscriptionDaysToken",
      [TOKEN_NAME, TOKEN_SYMBOL, admin.account.address, minter.account.address],
      { account: admin.account }
    );

    await contract.write.mint([alice.account.address, parseEther("5")], {
      account: minter.account
    });

    await increaseTime(DAY_SECONDS - 1);

    await contract.write.setDecayExempt([alice.account.address, true], {
      account: admin.account
    });

    assertBigIntClose(
      await contract.read.balanceOf([alice.account.address]),
      parseEther("4")
    );

    await increaseTime(DAY_SECONDS * 2);

    assertBigIntClose(
      await contract.read.balanceOf([alice.account.address]),
      parseEther("4")
    );

    await contract.write.setDecayExempt([alice.account.address, false], {
      account: admin.account
    });

    await increaseTime(DAY_SECONDS);

    assertBigIntClose(
      await contract.read.balanceOf([alice.account.address]),
      parseEther("3")
    );
  });

  it("allows minter role holder to burn from its own balance", async () => {
    const viem = await getViem();
    const [admin, minter] = await viem.getWalletClients();

    const contract = await viem.deployContract(
      "SubscriptionDaysToken",
      [TOKEN_NAME, TOKEN_SYMBOL, admin.account.address, minter.account.address],
      { account: admin.account }
    );

    await contract.write.setDecayExempt([minter.account.address, true], {
      account: admin.account
    });

    await contract.write.mint([minter.account.address, parseEther("5")], {
      account: minter.account
    });

    await contract.write.burn([parseEther("2")], {
      account: minter.account
    });

    assert.equal(
      await contract.read.balanceOf([minter.account.address]),
      parseEther("3")
    );
  });
});
