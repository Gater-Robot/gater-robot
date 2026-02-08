// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";

import {MockUSDC} from "../contracts/subscriptions/MockUSDC.sol";

contract DeployMockUSDC is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);

        address mintTo = vm.envOr("MOCK_USDC_MINT_TO", deployer);
        uint256 mintAmount = vm.envOr("MOCK_USDC_MINT_AMOUNT", uint256(1_000_000_000_000));

        vm.startBroadcast(pk);

        MockUSDC usdc = new MockUSDC();
        usdc.mint(mintTo, mintAmount);

        console2.log("MockUSDC:", address(usdc));
        console2.log("Minted to:", mintTo);
        console2.log("Mint amount:", mintAmount);

        vm.stopBroadcast();
    }
}
