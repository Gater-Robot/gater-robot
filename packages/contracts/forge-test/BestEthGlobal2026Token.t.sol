// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {BestEthGlobal2026Token} from "../contracts/BestEthGlobal2026Token.sol";

contract BestEthGlobal2026TokenTest is Test {
    BestEthGlobal2026Token private token;
    address private alice = address(0x1);

    function setUp() public {
        token = new BestEthGlobal2026Token("Best Token", "BEST", address(this));
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
