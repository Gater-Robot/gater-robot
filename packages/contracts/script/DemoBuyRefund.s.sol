// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";

import {SubscriptionFactory} from "../contracts/subscriptions/SubscriptionFactory.sol";
import {SubscriptionRouter} from "../contracts/subscriptions/SubscriptionRouter.sol";
import {SubscriptionHook} from "../contracts/subscriptions/SubscriptionHook.sol";
import {MockUSDC} from "../contracts/subscriptions/MockUSDC.sol";
import {SubscriptionDaysToken} from "../contracts/SubscriptionDaysToken.sol";

contract DemoBuyRefund is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");

        address factoryAddr = vm.envAddress("FACTORY");
        address routerAddr = vm.envAddress("ROUTER");
        address token = vm.envAddress("SUB_TOKEN");
        address user = vm.addr(pk);

        vm.startBroadcast(pk);

        SubscriptionFactory factory = SubscriptionFactory(factoryAddr);
        SubscriptionRouter router = SubscriptionRouter(routerAddr);

        (, address hookAddr) = factory.getPool(token);

        address usdc = factory.usdc();

        uint256 usdcFunding = vm.envOr("DEMO_USDC_FUND", uint256(500_000_000));
        uint256 buyAmount = vm.envOr("DEMO_BUY_SUB", uint256(30e18));

        MockUSDC(usdc).mint(user, usdcFunding);
        MockUSDC(usdc).mint(hookAddr, usdcFunding);

        MockUSDC(usdc).approve(routerAddr, type(uint256).max);
        SubscriptionDaysToken(token).approve(routerAddr, type(uint256).max);

        uint256 buyQuote = SubscriptionHook(hookAddr).quoteBuyExactOut(buyAmount);
        router.buyExactOut(token, buyAmount, buyQuote, user, block.timestamp + 1 hours, bytes(""));

        router.refundAll(token, 0, user, block.timestamp + 1 hours, bytes(""));

        console2.log("Demo buy + refundAll complete for user", user);

        vm.stopBroadcast();
    }
}
