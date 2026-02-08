// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";

import {SubscriptionFactory} from "../contracts/subscriptions/SubscriptionFactory.sol";

contract CreateSubscriptionToken is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address factoryAddr = vm.envAddress("FACTORY");
        string memory name = vm.envString("SUB_NAME");
        string memory symbol = vm.envString("SUB_SYMBOL");

        vm.startBroadcast(pk);

        address token = SubscriptionFactory(factoryAddr).createToken(name, symbol);
        console2.log("SUB token:", token);

        vm.stopBroadcast();
    }
}
