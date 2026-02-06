// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {BestToken} from "../contracts/BestToken.sol";

contract BestTokenTest is Test {
    BestToken private token;
    address private alice = address(0x1);

    function setUp() public {
        token = new BestToken("Best Token", "BEST", address(this));
    }

    function testFaucetClaim() public {
        vm.prank(alice);
        token.faucet();
        assertEq(token.balanceOf(alice), token.FAUCET_AMOUNT());
    }

    function testFaucetOnlyOnce() public {
        vm.prank(alice);
        token.faucet();

        vm.expectRevert("Faucet already claimed");
        vm.prank(alice);
        token.faucet();
    }
}
