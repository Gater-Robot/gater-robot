import { strict as assert } from "node:assert";
import { describe, it } from "mocha";

import {
  SUBSCRIPTION_FACTORY_ABI,
  SUBSCRIPTION_HOOK_ABI,
  SUBSCRIPTION_ROUTER_ABI,
} from "../src/subscriptions-abi";

type AbiItem = {
  type: string;
  name?: string;
  stateMutability?: string;
  inputs?: Array<{ name?: string; type: string; components?: Array<{ name?: string; type: string }> }>;
  outputs?: Array<{ name?: string; type: string }>;
};

function findAbiItem(abi: readonly unknown[], type: string, name: string): AbiItem | undefined {
  return (abi as AbiItem[]).find((item) => item.type === type && item.name === name);
}

describe("subscriptions ABI exports", () => {
  it("factory ABI exposes createToken/setupPool/getPool and PoolSetup", () => {
    const createToken = findAbiItem(SUBSCRIPTION_FACTORY_ABI, "function", "createToken");
    const setupPool = findAbiItem(SUBSCRIPTION_FACTORY_ABI, "function", "setupPool");
    const getPool = findAbiItem(SUBSCRIPTION_FACTORY_ABI, "function", "getPool");
    const poolSetupEvent = findAbiItem(SUBSCRIPTION_FACTORY_ABI, "event", "PoolSetup");

    assert.ok(createToken);
    assert.ok(setupPool);
    assert.ok(getPool);
    assert.ok(poolSetupEvent);

    assert.equal(createToken?.stateMutability, "nonpayable");
    assert.equal(setupPool?.stateMutability, "nonpayable");
    assert.equal(getPool?.stateMutability, "view");

    assert.equal(createToken?.inputs?.length, 2);
    assert.equal(createToken?.inputs?.[0]?.type, "string");
    assert.equal(createToken?.inputs?.[1]?.type, "string");
  });

  it("router ABI exposes buy/refund functions with expected argument counts", () => {
    const buyExactOut = findAbiItem(SUBSCRIPTION_ROUTER_ABI, "function", "buyExactOut");
    const refundExactIn = findAbiItem(SUBSCRIPTION_ROUTER_ABI, "function", "refundExactIn");
    const refundAll = findAbiItem(SUBSCRIPTION_ROUTER_ABI, "function", "refundAll");
    const refundUpTo = findAbiItem(SUBSCRIPTION_ROUTER_ABI, "function", "refundUpTo");

    assert.ok(buyExactOut);
    assert.ok(refundExactIn);
    assert.ok(refundAll);
    assert.ok(refundUpTo);

    assert.equal(buyExactOut?.inputs?.length, 6);
    assert.equal(refundExactIn?.inputs?.length, 6);
    assert.equal(refundAll?.inputs?.length, 5);
    assert.equal(refundUpTo?.inputs?.length, 6);
  });

  it("hook ABI includes frontend-critical read methods and pricing tuple shape", () => {
    const requiredReadMethods = [
      "owner",
      "router",
      "subToken",
      "usdcToken",
      "pricing",
      "quoteBuyExactOut",
      "quoteRefundExactIn",
      "refundReserveUsdc",
    ];

    for (const methodName of requiredReadMethods) {
      const item = findAbiItem(SUBSCRIPTION_HOOK_ABI, "function", methodName);
      assert.ok(item, `missing ${methodName} in SUBSCRIPTION_HOOK_ABI`);
      assert.equal(item?.stateMutability, "view");
    }

    const pricing = findAbiItem(SUBSCRIPTION_HOOK_ABI, "function", "pricing");
    assert.ok(pricing);
    assert.equal(pricing?.outputs?.length, 8);
    assert.deepEqual(
      pricing?.outputs?.map((o) => o.name),
      [
        "basePriceUsdc",
        "monthlyBundleTokens",
        "monthlyBundlePriceUsdc",
        "yearlyBundleTokens",
        "yearlyBundlePriceUsdc",
        "enforceMinMonthly",
        "refundsEnabled",
        "refundPriceUsdc",
      ]
    );

    const setPricing = findAbiItem(SUBSCRIPTION_HOOK_ABI, "function", "setPricing");
    assert.ok(setPricing);
    assert.equal(setPricing?.stateMutability, "nonpayable");
    assert.equal(setPricing?.inputs?.length, 1);
    assert.equal(setPricing?.inputs?.[0]?.type, "tuple");
    assert.equal(setPricing?.inputs?.[0]?.components?.length, 8);
  });
});
