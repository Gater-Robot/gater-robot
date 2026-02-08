// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";

import {SubscriptionFactory} from "../contracts/subscriptions/SubscriptionFactory.sol";
import {SubPricing} from "../contracts/subscriptions/SubPricing.sol";
import {SubscriptionDaysToken} from "../contracts/SubscriptionDaysToken.sol";

contract CreateSubscriptionProduct is Script {
    error MissingTokenAddress();

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address factoryAddr = vm.envAddress("FACTORY");
        address routerAddr = vm.envAddress("ROUTER");
        address poolManagerAddr = vm.envAddress("POOL_MANAGER");

        vm.startBroadcast(pk);

        SubscriptionFactory factory = SubscriptionFactory(factoryAddr);

        address token = vm.envOr("SUB_TOKEN", address(0));
        if (token == address(0)) {
            string memory name = vm.envString("SUB_NAME");
            string memory symbol = vm.envString("SUB_SYMBOL");
            token = factory.createToken(name, symbol);
            console2.log("Created SUB token:", token);
        } else {
            console2.log("Using existing SUB token:", token);
        }

        if (token == address(0)) revert MissingTokenAddress();

        SubscriptionFactory.SetupParams memory p;
        p.token = token;
        p.router = routerAddr;
        p.fee = uint24(vm.envOr("FEE", uint256(0)));
        p.tickSpacing = int24(int256(vm.envOr("TICK_SPACING", int256(1))));
        p.hookSalt = bytes32(vm.envUint("HOOK_SALT"));

        p.pricing = SubPricing.Config({
            basePriceUsdc: uint64(vm.envOr("BASE_PRICE_USDC", uint256(1_000_000))),
            monthlyBundleTokens: uint32(vm.envOr("MONTHLY_BUNDLE_TOKENS", uint256(30))),
            monthlyBundlePriceUsdc: uint64(vm.envOr("MONTHLY_BUNDLE_PRICE_USDC", uint256(20_000_000))),
            yearlyBundleTokens: uint32(vm.envOr("YEARLY_BUNDLE_TOKENS", uint256(365))),
            yearlyBundlePriceUsdc: uint64(vm.envOr("YEARLY_BUNDLE_PRICE_USDC", uint256(200_000_000))),
            enforceMinMonthly: vm.envOr("ENFORCE_MIN_MONTHLY", false),
            refundsEnabled: vm.envOr("REFUNDS_ENABLED", true),
            refundPriceUsdc: uint64(vm.envOr("REFUND_PRICE_USDC", uint256(100_000)))
        });

        (address hook,) = factory.setupPool(p);
        console2.log("Hook:", hook);

        SubscriptionDaysToken t = SubscriptionDaysToken(token);

        bytes32 minterRole = t.MINTER_ROLE();
        bytes32 decayExemptRole = t.DECAY_EXEMPT_ROLE();

        t.grantRole(minterRole, hook);
        t.grantRole(decayExemptRole, poolManagerAddr);
        t.grantRole(decayExemptRole, hook);

        console2.log("Configured token roles for hook + poolManager");

        vm.stopBroadcast();
    }
}
