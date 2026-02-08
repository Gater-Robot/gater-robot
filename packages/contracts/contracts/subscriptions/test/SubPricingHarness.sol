// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {SubPricing} from "../SubPricing.sol";

contract SubPricingHarness {
    function buyCost(SubPricing.Config calldata cfg, uint256 subOutAmount) external pure returns (uint256) {
        return SubPricing.buyCostUsdc(cfg, subOutAmount);
    }

    function refundPayout(SubPricing.Config calldata cfg, uint256 subInAmount) external pure returns (uint256) {
        return SubPricing.refundPayoutUsdc(cfg, subInAmount);
    }
}
