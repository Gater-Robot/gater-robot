// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AccessControlDefaultAdminRules} from "@openzeppelin/contracts/access/extensions/AccessControlDefaultAdminRules.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

contract SubscriptionDaysToken is ERC20, AccessControlDefaultAdminRules {
    uint48 public constant DEFAULT_ADMIN_TRANSFER_DELAY = 1;
    uint256 public constant DECAY_PER_DAY = 1e18;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant DECAY_EXEMPT_ROLE = keccak256("DECAY_EXEMPT_ROLE");

    mapping(address account => uint48 timestamp) private _lastBalanceUpdate;

    error InvalidInitialMinter(address account);
    error InvalidExemptAccount(address account);

    event DecaySettled(
        address indexed account,
        uint256 amountBurned,
        uint48 previousTimestamp,
        uint48 settledTimestamp
    );

    event DecayExemptStatusSet(address indexed account, bool isExempt);

    constructor(
        string memory name_,
        string memory symbol_,
        address initialDefaultAdmin,
        address initialMinter
    )
        ERC20(name_, symbol_)
        AccessControlDefaultAdminRules(DEFAULT_ADMIN_TRANSFER_DELAY, initialDefaultAdmin)
    {
        if (initialMinter == address(0)) {
            revert InvalidInitialMinter(address(0));
        }

        _grantRole(MINTER_ROLE, initialMinter);
    }

    function mint(address to, uint256 value) external onlyRole(MINTER_ROLE) {
        _mint(to, value);
    }

    function burn(uint256 value) external onlyRole(MINTER_ROLE) {
        _burn(msg.sender, value);
    }

    function setDecayExempt(address account, bool isExempt) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (account == address(0)) {
            revert InvalidExemptAccount(account);
        }

        bool currentlyExempt = hasRole(DECAY_EXEMPT_ROLE, account);
        if (currentlyExempt == isExempt) {
            return;
        }

        uint48 currentTimestamp = _currentTimestamp();
        if (isExempt) {
            _settleDecay(account, currentTimestamp);
            _grantRole(DECAY_EXEMPT_ROLE, account);
        } else {
            _revokeRole(DECAY_EXEMPT_ROLE, account);
            _lastBalanceUpdate[account] = currentTimestamp;
        }

        emit DecayExemptStatusSet(account, isExempt);
    }

    function settleDecay(address account) external returns (uint256 amountBurned) {
        amountBurned = _settleDecay(account, _currentTimestamp());
    }

    function pendingDecay(address account) public view returns (uint256) {
        if (hasRole(DECAY_EXEMPT_ROLE, account)) {
            return 0;
        }

        uint256 rawBalance = super.balanceOf(account);
        uint48 lastUpdate = _lastBalanceUpdate[account];

        if (rawBalance == 0 || lastUpdate == 0) {
            return 0;
        }

        uint48 currentTimestamp = _currentTimestamp();
        if (currentTimestamp <= lastUpdate) {
            return 0;
        }

        uint256 elapsed = uint256(currentTimestamp - lastUpdate);
        uint256 decayAmount = Math.mulDiv(elapsed, DECAY_PER_DAY, 1 days);
        return decayAmount > rawBalance ? rawBalance : decayAmount;
    }

    function balanceOf(address account) public view virtual override returns (uint256) {
        uint256 rawBalance = super.balanceOf(account);
        if (rawBalance == 0 || hasRole(DECAY_EXEMPT_ROLE, account)) {
            return rawBalance;
        }

        uint256 decayAmount = pendingDecay(account);
        if (decayAmount >= rawBalance) {
            return 0;
        }

        unchecked {
            return rawBalance - decayAmount;
        }
    }

    function rawBalanceOf(address account) external view returns (uint256) {
        return super.balanceOf(account);
    }

    function lastBalanceUpdate(address account) external view returns (uint48) {
        return _lastBalanceUpdate[account];
    }

    function _update(address from, address to, uint256 value) internal virtual override {
        uint48 currentTimestamp = _currentTimestamp();

        if (from != address(0)) {
            _settleDecay(from, currentTimestamp);
        }

        if (to != address(0) && to != from) {
            _settleDecay(to, currentTimestamp);
        }

        super._update(from, to, value);

        if (to != address(0) && !hasRole(DECAY_EXEMPT_ROLE, to)) {
            _lastBalanceUpdate[to] = currentTimestamp;
        }
    }

    function _settleDecay(address account, uint48 currentTimestamp) internal returns (uint256 amountBurned) {
        if (account == address(0) || hasRole(DECAY_EXEMPT_ROLE, account)) {
            return 0;
        }

        uint48 previousTimestamp = _lastBalanceUpdate[account];
        if (previousTimestamp == 0) {
            _lastBalanceUpdate[account] = currentTimestamp;
            return 0;
        }

        if (currentTimestamp <= previousTimestamp) {
            return 0;
        }

        uint256 rawBalance = super.balanceOf(account);
        if (rawBalance == 0) {
            _lastBalanceUpdate[account] = currentTimestamp;
            return 0;
        }

        uint256 elapsed = uint256(currentTimestamp - previousTimestamp);
        amountBurned = Math.mulDiv(elapsed, DECAY_PER_DAY, 1 days);
        if (amountBurned > rawBalance) {
            amountBurned = rawBalance;
        }

        _lastBalanceUpdate[account] = currentTimestamp;

        if (amountBurned == 0) {
            return 0;
        }

        super._update(account, address(0), amountBurned);
        emit DecaySettled(account, amountBurned, previousTimestamp, currentTimestamp);
    }

    function _currentTimestamp() internal view returns (uint48) {
        return uint48(block.timestamp);
    }
}
