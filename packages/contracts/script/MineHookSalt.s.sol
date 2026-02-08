// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";

import {Hooks} from "@uniswap/v4-periphery/lib/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-periphery/lib/v4-core/src/interfaces/IPoolManager.sol";
import {Currency} from "@uniswap/v4-periphery/lib/v4-core/src/types/Currency.sol";

import {SubscriptionHook} from "../contracts/subscriptions/SubscriptionHook.sol";
import {SubPricing} from "../contracts/subscriptions/SubPricing.sol";

contract MineHookSalt is Script {
    function run() external {
        address deployer = vm.envAddress("DEPLOYER");
        address poolManager = vm.envAddress("POOL_MANAGER");
        address subToken = vm.envAddress("SUB_TOKEN");
        address usdc = vm.envAddress("USDC");
        address owner = vm.envAddress("OWNER");
        address router = vm.envAddress("ROUTER");

        uint24 fee = uint24(vm.envUint("FEE"));
        int24 tickSpacing = int24(int256(vm.envInt("TICK_SPACING")));

        Currency subCurrency = Currency.wrap(subToken);
        Currency usdcCurrency = Currency.wrap(usdc);
        (Currency c0, Currency c1) = Currency.unwrap(subCurrency) < Currency.unwrap(usdcCurrency)
            ? (subCurrency, usdcCurrency)
            : (usdcCurrency, subCurrency);

        SubPricing.Config memory cfg = SubPricing.Config({
            basePriceUsdc: 1_000_000,
            monthlyBundleTokens: 30,
            monthlyBundlePriceUsdc: 20_000_000,
            yearlyBundleTokens: 365,
            yearlyBundlePriceUsdc: 200_000_000,
            enforceMinMonthly: false,
            refundsEnabled: true,
            refundPriceUsdc: 100_000
        });

        bytes memory initCode = abi.encodePacked(
            type(SubscriptionHook).creationCode,
            abi.encode(IPoolManager(poolManager), subToken, usdc, owner, router, c0, c1, fee, tickSpacing, cfg)
        );

        bytes32 initCodeHash = keccak256(initCode);

        uint160 required = uint160(
            Hooks.BEFORE_SWAP_FLAG | Hooks.BEFORE_SWAP_RETURNS_DELTA_FLAG | Hooks.BEFORE_ADD_LIQUIDITY_FLAG
                | Hooks.BEFORE_REMOVE_LIQUIDITY_FLAG
        );

        for (uint256 i = 0; i < 8_000_000; i++) {
            bytes32 salt = bytes32(i);
            address predicted = computeCreate2(deployer, salt, initCodeHash);
            if ((uint160(predicted) & required) == required) {
                console2.log("FOUND salt:", uint256(salt));
                console2.log("Predicted hook:", predicted);
                return;
            }
        }

        revert("salt not found in range");
    }

    function computeCreate2(address deployer, bytes32 salt, bytes32 initCodeHash) internal pure returns (address) {
        bytes32 h = keccak256(abi.encodePacked(bytes1(0xff), deployer, salt, initCodeHash));
        return address(uint160(uint256(h)));
    }
}
