// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BestToken} from "../contracts/BestToken.sol";

contract BestTokenTest {
    uint256 private constant CLAIM_AMOUNT = 2026e18;

    BestToken private token;

    function setUp() public {
        token = new BestToken("Best Token", "BEST", CLAIM_AMOUNT);
    }

    function testClaimOnce() public {
        token.claim();
        assert(token.balanceOf(address(this)) == CLAIM_AMOUNT);

        bool reverted = false;
        try token.claim() {
            reverted = false;
        } catch {
            reverted = true;
        }

        assert(reverted);
    }
}
