// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract BestToken is ERC20, Ownable {
    uint256 public constant FAUCET_AMOUNT = 2026 * 10 ** 18;

    mapping(address => bool) public hasClaimed;

    event FaucetClaimed(address indexed account, uint256 amount);

    constructor(string memory name_, string memory symbol_, address initialOwner)
        ERC20(name_, symbol_)
        Ownable(initialOwner)
    {}

    function faucet() external {
        require(!hasClaimed[msg.sender], "Faucet already claimed");
        hasClaimed[msg.sender] = true;
        _mint(msg.sender, FAUCET_AMOUNT);
        emit FaucetClaimed(msg.sender, FAUCET_AMOUNT);
    }
}
