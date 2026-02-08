// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

library SubPricing {
    uint256 internal constant SUB_UNIT = 1e18;

    error ZeroAmount();
    error MinPurchaseNotMet(uint256 minAmount);

    struct Config {
        // Buy pricing (USDC micro units per SUB token)
        uint64 basePriceUsdc;
        uint32 monthlyBundleTokens;
        uint64 monthlyBundlePriceUsdc;
        uint32 yearlyBundleTokens;
        uint64 yearlyBundlePriceUsdc;

        // Controls
        bool enforceMinMonthly;
        bool refundsEnabled;

        // Refund pricing (USDC micro units per SUB token)
        uint64 refundPriceUsdc;
    }

    function tokensToSubAmount(uint32 tokens) internal pure returns (uint256) {
        return uint256(tokens) * SUB_UNIT;
    }

    function buyCostUsdc(Config memory cfg, uint256 subOutAmount) internal pure returns (uint256 usdcIn) {
        if (subOutAmount == 0) revert ZeroAmount();

        uint256 minSub = tokensToSubAmount(cfg.monthlyBundleTokens);
        if (cfg.enforceMinMonthly && subOutAmount < minSub) {
            revert MinPurchaseNotMet(minSub);
        }

        if (subOutAmount == minSub) return uint256(cfg.monthlyBundlePriceUsdc);
        if (subOutAmount == tokensToSubAmount(cfg.yearlyBundleTokens)) return uint256(cfg.yearlyBundlePriceUsdc);

        // exact output buy: round up the payer's USDC requirement.
        return Math.mulDiv(subOutAmount, uint256(cfg.basePriceUsdc), SUB_UNIT, Math.Rounding.Ceil);
    }

    function refundPayoutUsdc(Config memory cfg, uint256 subInAmount) internal pure returns (uint256 usdcOut) {
        if (subInAmount == 0) revert ZeroAmount();
        // exact input refund: round down the payout to avoid over-distribution.
        return Math.mulDiv(subInAmount, uint256(cfg.refundPriceUsdc), SUB_UNIT);
    }
}
