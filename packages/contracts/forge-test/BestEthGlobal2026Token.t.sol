// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
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

    function testFaucetForClaim() public {
        token.faucetFor(alice);
        assertEq(token.balanceOf(alice), token.FAUCET_AMOUNT());
    }

    function testFaucetForRevertsNonOwner() public {
        address bob = address(0x2);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, bob));
        vm.prank(bob);
        token.faucetFor(alice);
    }

    function testFaucetForRevertsAlreadyClaimed() public {
        vm.prank(alice);
        token.faucet();

        vm.expectRevert("Faucet already claimed");
        token.faucetFor(alice);
    }

    function testFaucetForSharesHasClaimed() public {
        token.faucetFor(alice);

        vm.expectRevert("Faucet already claimed");
        vm.prank(alice);
        token.faucet();
    }

    function testFaucetForEmitsEvent() public {
        vm.expectEmit(true, false, false, true);
        emit BestEthGlobal2026Token.FaucetClaimed(alice, token.FAUCET_AMOUNT());
        token.faucetFor(alice);
    }

    function testFaucetForMultipleBeneficiaries() public {
        address bob = address(0x2);
        token.faucetFor(alice);
        token.faucetFor(bob);
        assertEq(token.balanceOf(alice), token.FAUCET_AMOUNT());
        assertEq(token.balanceOf(bob), token.FAUCET_AMOUNT());
    }

    function testHasClaimedTrueAfterFaucetFor() public {
        token.faucetFor(alice);
        assertTrue(token.hasClaimed(alice));
    }

    function testHasClaimedFalseBeforeClaim() public view {
        assertFalse(token.hasClaimed(alice));
    }
}
