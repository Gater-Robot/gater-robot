// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract BestToken is ERC20 {
    uint256 public immutable claimAmount;
    mapping(address => bool) public hasClaimed;

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 claimAmount_
    ) ERC20(name_, symbol_) {
        claimAmount = claimAmount_;
    }

    function claim() external {
        require(!hasClaimed[msg.sender], "BEST: already claimed");
        hasClaimed[msg.sender] = true;
        _mint(msg.sender, claimAmount);
    }
}
