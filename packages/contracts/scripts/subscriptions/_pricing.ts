import { type Address } from "viem";

import { envBoolean, envNumber } from "./_env.js";

export type PricingConfig = {
  basePriceUsdc: bigint;
  monthlyBundleTokens: number;
  monthlyBundlePriceUsdc: bigint;
  yearlyBundleTokens: number;
  yearlyBundlePriceUsdc: bigint;
  enforceMinMonthly: boolean;
  refundsEnabled: boolean;
  refundPriceUsdc: bigint;
};

export function loadPricingFromEnv(): PricingConfig {
  return {
    basePriceUsdc: BigInt(envNumber("BASE_PRICE_USDC", 1_000_000)),
    monthlyBundleTokens: envNumber("MONTHLY_BUNDLE_TOKENS", 30),
    monthlyBundlePriceUsdc: BigInt(envNumber("MONTHLY_BUNDLE_PRICE_USDC", 20_000_000)),
    yearlyBundleTokens: envNumber("YEARLY_BUNDLE_TOKENS", 365),
    yearlyBundlePriceUsdc: BigInt(envNumber("YEARLY_BUNDLE_PRICE_USDC", 200_000_000)),
    enforceMinMonthly: envBoolean("ENFORCE_MIN_MONTHLY", false),
    refundsEnabled: envBoolean("REFUNDS_ENABLED", true),
    refundPriceUsdc: BigInt(envNumber("REFUND_PRICE_USDC", 100_000)),
  };
}

export function sortCurrencies(a: Address, b: Address): [Address, Address] {
  return BigInt(a) < BigInt(b) ? [a, b] : [b, a];
}
