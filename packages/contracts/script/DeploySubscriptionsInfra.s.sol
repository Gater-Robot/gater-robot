// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";

import {IPoolManager} from "@uniswap/v4-periphery/lib/v4-core/src/interfaces/IPoolManager.sol";
import {SubscriptionFactory} from "../contracts/subscriptions/SubscriptionFactory.sol";
import {SubscriptionRouter} from "../contracts/subscriptions/SubscriptionRouter.sol";

contract DeploySubscriptionsInfra is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address poolManager = vm.envAddress("POOL_MANAGER");
        address usdc = vm.envAddress("USDC");

        vm.startBroadcast(pk);

        uint24 defaultFee = uint24(vm.envOr("DEFAULT_FEE", uint256(0)));
        int24 defaultTickSpacing = int24(int256(vm.envOr("DEFAULT_TICK_SPACING", int256(1))));

        SubscriptionFactory factory = new SubscriptionFactory(
            IPoolManager(poolManager),
            usdc,
            defaultFee,
            defaultTickSpacing
        );

        SubscriptionRouter router = new SubscriptionRouter(IPoolManager(poolManager), factory);

        console2.log("Factory:", address(factory));
        console2.log("Router :", address(router));

        vm.stopBroadcast();
    }
}
