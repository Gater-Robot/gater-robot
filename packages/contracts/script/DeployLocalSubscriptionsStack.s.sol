// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";

import {PoolManager} from "@uniswap/v4-periphery/lib/v4-core/src/PoolManager.sol";
import {IPoolManager} from "@uniswap/v4-periphery/lib/v4-core/src/interfaces/IPoolManager.sol";

import {MockUSDC} from "../contracts/subscriptions/MockUSDC.sol";
import {SubscriptionFactory} from "../contracts/subscriptions/SubscriptionFactory.sol";
import {SubscriptionRouter} from "../contracts/subscriptions/SubscriptionRouter.sol";

contract DeployLocalSubscriptionsStack is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);

        uint24 defaultFee = uint24(vm.envOr("DEFAULT_FEE", uint256(0)));
        int24 defaultTickSpacing = int24(int256(vm.envOr("DEFAULT_TICK_SPACING", int256(1))));
        uint256 localUsdcMint = vm.envOr("LOCAL_USDC_MINT", uint256(2_000_000_000_000));

        vm.startBroadcast(pk);

        PoolManager poolManager = new PoolManager(deployer);
        MockUSDC usdc = new MockUSDC();
        usdc.mint(deployer, localUsdcMint);

        SubscriptionFactory factory = new SubscriptionFactory(
            IPoolManager(address(poolManager)),
            address(usdc),
            defaultFee,
            defaultTickSpacing
        );
        SubscriptionRouter router = new SubscriptionRouter(IPoolManager(address(poolManager)), factory);

        console2.log("PoolManager:", address(poolManager));
        console2.log("MockUSDC   :", address(usdc));
        console2.log("Factory    :", address(factory));
        console2.log("Router     :", address(router));
        console2.log("Minted mock USDC to deployer:", localUsdcMint);

        vm.stopBroadcast();
    }
}
