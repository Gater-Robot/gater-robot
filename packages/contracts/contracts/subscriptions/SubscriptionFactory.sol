// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Create2} from "@openzeppelin/contracts/utils/Create2.sol";

import {SubscriptionDaysToken} from "../SubscriptionDaysToken.sol";
import {SubPricing} from "./SubPricing.sol";
import {SubscriptionHook} from "./SubscriptionHook.sol";

import {Hooks} from "@uniswap/v4-periphery/lib/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-periphery/lib/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-periphery/lib/v4-core/src/types/PoolKey.sol";
import {PoolId} from "@uniswap/v4-periphery/lib/v4-core/src/types/PoolId.sol";
import {Currency} from "@uniswap/v4-periphery/lib/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-periphery/lib/v4-core/src/interfaces/IHooks.sol";

contract SubscriptionFactory {
    error NotTokenOwner();
    error NotFactoryToken();
    error AlreadySetup();
    error BadHookAddressFlags();
    error HookAddressMismatch();
    error ZeroAddress();

    event TokenCreated(address indexed creator, address indexed token, string name, string symbol);
    event PoolSetup(address indexed creator, address indexed token, address hook, PoolId poolId);

    IPoolManager public immutable poolManager;
    address public immutable usdc;

    uint24 public immutable defaultFee;
    int24 public immutable defaultTickSpacing;

    struct PoolInfo {
        address hook;
        PoolKey key;
        bool exists;
    }

    mapping(address => PoolInfo) public poolsByToken;
    mapping(address => bool) public isFactoryToken;

    constructor(IPoolManager _poolManager, address _usdc, uint24 fee_, int24 tickSpacing_) {
        if (address(_poolManager) == address(0) || _usdc == address(0)) revert ZeroAddress();
        poolManager = _poolManager;
        usdc = _usdc;
        defaultFee = fee_;
        defaultTickSpacing = tickSpacing_;
    }

    function createToken(string calldata name, string calldata symbol) external returns (address token) {
        token = address(new SubscriptionDaysToken(name, symbol, msg.sender, msg.sender));
        isFactoryToken[token] = true;
        emit TokenCreated(msg.sender, token, name, symbol);
    }

    struct SetupParams {
        address token;
        address router;
        uint24 fee;
        int24 tickSpacing;
        SubPricing.Config pricing;
        bytes32 hookSalt;
    }

    function setupPool(SetupParams calldata p) external returns (address hook, PoolKey memory key) {
        if (p.token == address(0) || p.router == address(0)) revert ZeroAddress();
        if (!isFactoryToken[p.token]) revert NotFactoryToken();

        PoolInfo storage info = poolsByToken[p.token];
        if (info.exists) revert AlreadySetup();

        SubscriptionDaysToken t = SubscriptionDaysToken(p.token);
        if (t.owner() != msg.sender) revert NotTokenOwner();

        uint24 fee_ = p.fee == 0 ? defaultFee : p.fee;
        int24 ts_ = p.tickSpacing == 0 ? defaultTickSpacing : p.tickSpacing;

        Currency subCurrency = Currency.wrap(p.token);
        Currency usdcCurrency = Currency.wrap(usdc);
        (Currency currency0, Currency currency1) = _sort(subCurrency, usdcCurrency);

        address predicted;
        (hook, predicted) = _deployHook(p, msg.sender, currency0, currency1, fee_, ts_);
        if (hook != predicted) revert HookAddressMismatch();

        key = PoolKey({currency0: currency0, currency1: currency1, fee: fee_, tickSpacing: ts_, hooks: IHooks(hook)});

        uint160 sqrtPriceX96 = uint160(1 << 96);
        poolManager.initialize(key, sqrtPriceX96);

        info.hook = hook;
        info.key = key;
        info.exists = true;

        emit PoolSetup(msg.sender, p.token, hook, key.toId());
    }

    function getPool(address token) external view returns (PoolKey memory key, address hook) {
        PoolInfo storage info = poolsByToken[token];
        require(info.exists, "NO_POOL");
        return (info.key, info.hook);
    }

    function predictHookAddress(
        SetupParams calldata p,
        address hookOwner
    ) external view returns (address predicted, Currency currency0, Currency currency1) {
        uint24 fee_ = p.fee == 0 ? defaultFee : p.fee;
        int24 ts_ = p.tickSpacing == 0 ? defaultTickSpacing : p.tickSpacing;

        Currency subCurrency = Currency.wrap(p.token);
        Currency usdcCurrency = Currency.wrap(usdc);
        (currency0, currency1) = _sort(subCurrency, usdcCurrency);

        predicted = _predictHookAddress(p, hookOwner, currency0, currency1, fee_, ts_);
    }

    function _sort(Currency a, Currency b) internal pure returns (Currency, Currency) {
        return Currency.unwrap(a) < Currency.unwrap(b) ? (a, b) : (b, a);
    }

    function _deployHook(
        SetupParams calldata p,
        address hookOwner,
        Currency currency0,
        Currency currency1,
        uint24 fee_,
        int24 ts_
    ) internal returns (address hook, address predicted) {
        predicted = _predictHookAddress(p, hookOwner, currency0, currency1, fee_, ts_);

        uint160 flags = uint160(
            Hooks.BEFORE_SWAP_FLAG | Hooks.BEFORE_SWAP_RETURNS_DELTA_FLAG | Hooks.BEFORE_ADD_LIQUIDITY_FLAG
                | Hooks.BEFORE_REMOVE_LIQUIDITY_FLAG
        );
        if ((uint160(predicted) & flags) != flags) revert BadHookAddressFlags();

        hook = address(
            new SubscriptionHook{salt: p.hookSalt}(
                poolManager, p.token, usdc, hookOwner, p.router, currency0, currency1, fee_, ts_, p.pricing
            )
        );
    }

    function _predictHookAddress(
        SetupParams calldata p,
        address hookOwner,
        Currency currency0,
        Currency currency1,
        uint24 fee_,
        int24 ts_
    ) internal view returns (address predicted) {
        bytes memory creationCode = abi.encodePacked(
            type(SubscriptionHook).creationCode,
            abi.encode(poolManager, p.token, usdc, hookOwner, p.router, currency0, currency1, fee_, ts_, p.pricing)
        );
        predicted = Create2.computeAddress(p.hookSalt, keccak256(creationCode), address(this));
    }
}
