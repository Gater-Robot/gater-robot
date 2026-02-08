import { strict as assert } from "node:assert";
import { describe, it } from "mocha";
import hre from "hardhat";

const SUB_UNIT = 10n ** 18n;

async function getViem() {
  const { viem } = await hre.network.connect();
  return viem;
}

function defaultCfg(overrides: Partial<any> = {}) {
  return {
    basePriceUsdc: 1_000_000,
    monthlyBundleTokens: 30,
    monthlyBundlePriceUsdc: 20_000_000,
    yearlyBundleTokens: 365,
    yearlyBundlePriceUsdc: 200_000_000,
    enforceMinMonthly: false,
    refundsEnabled: true,
    refundPriceUsdc: 100_000,
    ...overrides,
  };
}

describe("SubPricing", () => {
  it("applies monthly and yearly bundle pricing at exact bundle amounts", async () => {
    const viem = await getViem();
    const [deployer] = await viem.getWalletClients();
    const harness = await viem.deployContract("SubPricingHarness", [], {
      account: deployer.account,
    });

    const cfg = defaultCfg();

    const monthly = await harness.read.buyCost([cfg, 30n * SUB_UNIT]);
    const yearly = await harness.read.buyCost([cfg, 365n * SUB_UNIT]);

    assert.equal(monthly, 20_000_000n);
    assert.equal(yearly, 200_000_000n);
  });

  it("uses ceil rounding for exact output buy on fractional amounts", async () => {
    const viem = await getViem();
    const [deployer] = await viem.getWalletClients();
    const harness = await viem.deployContract("SubPricingHarness", [], {
      account: deployer.account,
    });

    const cfg = defaultCfg({ basePriceUsdc: 333_333 });

    const halfToken = await harness.read.buyCost([cfg, SUB_UNIT / 2n]);
    const oneWeiSub = await harness.read.buyCost([cfg, 1n]);

    assert.equal(halfToken, 166_667n);
    assert.equal(oneWeiSub, 1n);
  });

  it("uses floor rounding for refunds on fractional amounts", async () => {
    const viem = await getViem();
    const [deployer] = await viem.getWalletClients();
    const harness = await viem.deployContract("SubPricingHarness", [], {
      account: deployer.account,
    });

    const cfg = defaultCfg({ refundPriceUsdc: 333_333 });

    const halfToken = await harness.read.refundPayout([cfg, SUB_UNIT / 2n]);
    const oneWeiSub = await harness.read.refundPayout([cfg, 1n]);

    assert.equal(halfToken, 166_666n);
    assert.equal(oneWeiSub, 0n);
  });

  it("reverts below monthly minimum when enforceMinMonthly is enabled", async () => {
    const viem = await getViem();
    const [deployer] = await viem.getWalletClients();
    const harness = await viem.deployContract("SubPricingHarness", [], {
      account: deployer.account,
    });

    const cfg = defaultCfg({ enforceMinMonthly: true });

    await assert.rejects(
      harness.read.buyCost([cfg, 29n * SUB_UNIT])
    );
  });
});
