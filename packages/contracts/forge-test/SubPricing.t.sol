// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {SubPricing} from "../contracts/subscriptions/SubPricing.sol";

contract SubPricingTest is Test {
    function _cfg() internal pure returns (SubPricing.Config memory cfg) {
        cfg = SubPricing.Config({
            basePriceUsdc: 1_000_000,
            monthlyBundleTokens: 30,
            monthlyBundlePriceUsdc: 20_000_000,
            yearlyBundleTokens: 365,
            yearlyBundlePriceUsdc: 200_000_000,
            enforceMinMonthly: false,
            refundsEnabled: true,
            refundPriceUsdc: 100_000
        });
    }

    function test_buyCost_bundleMonthly() public {
        uint256 out = SubPricing.buyCostUsdc(_cfg(), 30e18);
        assertEq(out, 20_000_000);
    }

    function test_buyCost_fractionalCeil() public {
        SubPricing.Config memory cfg = _cfg();
        cfg.basePriceUsdc = 333_333;
        uint256 out = SubPricing.buyCostUsdc(cfg, 0.5e18);
        assertEq(out, 166_667);
    }

    function test_refund_floor() public {
        SubPricing.Config memory cfg = _cfg();
        cfg.refundPriceUsdc = 333_333;
        uint256 out = SubPricing.refundPayoutUsdc(cfg, 0.5e18);
        assertEq(out, 166_666);
    }
}
