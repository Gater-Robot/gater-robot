// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {SubscriptionDaysToken} from "../contracts/SubscriptionDaysToken.sol";

contract SubscriptionDaysTokenBurnTest is Test {
    SubscriptionDaysToken internal token;
    address internal minter = address(0xBEEF);

    function setUp() public {
        token = new SubscriptionDaysToken("Sub", "SUB", address(this), minter);
    }

    function test_minterCanBurnOwnBalance() public {
        vm.prank(minter);
        token.mint(minter, 5e18);

        vm.prank(minter);
        token.burn(2e18);

        assertEq(token.balanceOf(minter), 3e18);
    }
}
