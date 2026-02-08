// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {SafeTransferLib} from "./SafeTransferLib.sol";
import {SubscriptionDaysToken} from "../SubscriptionDaysToken.sol";
import {SubscriptionFactory} from "./SubscriptionFactory.sol";
import {SubscriptionHook} from "./SubscriptionHook.sol";

import {SafeCallback} from "@uniswap/v4-periphery/src/base/SafeCallback.sol";
import {IPoolManager} from "@uniswap/v4-periphery/lib/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-periphery/lib/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-periphery/lib/v4-core/src/types/Currency.sol";
import {SwapParams} from "@uniswap/v4-periphery/lib/v4-core/src/types/PoolOperation.sol";
import {TickMath} from "@uniswap/v4-periphery/lib/v4-core/src/libraries/TickMath.sol";

contract SubscriptionRouter is SafeCallback {
    using SafeTransferLib for address;

    error DeadlineExpired();
    error MaxInputExceeded(uint256 need, uint256 max);
    error MinOutputNotMet(uint256 out, uint256 min);
    error ZeroAmount();
    error InvalidRecipient();
    error InsufficientRefundReserve(uint256 have, uint256 need);

    SubscriptionFactory public immutable factory;

    event Bought(address indexed buyer, address indexed token, uint256 subOut, uint256 usdcIn, address indexed recipient);
    event Refunded(address indexed seller, address indexed token, uint256 subIn, uint256 usdcOut, address indexed recipient);

    enum Action {
        BUY_EXACT_OUT,
        REFUND_EXACT_IN
    }

    struct CallbackData {
        Action action;
        address payer;
        address token;
        address recipient;
        uint256 subAmount;
        uint256 usdcAmount;
        bytes hookData;
    }

    constructor(IPoolManager _poolManager, SubscriptionFactory _factory) SafeCallback(_poolManager) {
        factory = _factory;
    }

    function buyExactOut(
        address token,
        uint256 subOutAmount,
        uint256 maxUsdcIn,
        address recipient,
        uint256 deadline,
        bytes calldata hookData
    ) external returns (uint256 usdcIn) {
        if (block.timestamp > deadline) revert DeadlineExpired();
        if (recipient == address(0)) revert InvalidRecipient();
        if (subOutAmount == 0) revert ZeroAmount();

        (, address hookAddr) = factory.getPool(token);
        usdcIn = SubscriptionHook(hookAddr).quoteBuyExactOut(subOutAmount);
        if (usdcIn > maxUsdcIn) revert MaxInputExceeded(usdcIn, maxUsdcIn);

        poolManager.unlock(
            abi.encode(
                CallbackData({
                    action: Action.BUY_EXACT_OUT,
                    payer: msg.sender,
                    token: token,
                    recipient: recipient,
                    subAmount: subOutAmount,
                    usdcAmount: usdcIn,
                    hookData: hookData
                })
            )
        );

        emit Bought(msg.sender, token, subOutAmount, usdcIn, recipient);
    }

    function refundExactIn(
        address token,
        uint256 subInAmount,
        uint256 minUsdcOut,
        address recipient,
        uint256 deadline,
        bytes calldata hookData
    ) external returns (uint256 usdcOut) {
        if (block.timestamp > deadline) revert DeadlineExpired();
        if (recipient == address(0)) revert InvalidRecipient();
        if (subInAmount == 0) revert ZeroAmount();

        (, address hookAddr) = factory.getPool(token);
        usdcOut = SubscriptionHook(hookAddr).quoteRefundExactIn(subInAmount);
        if (usdcOut < minUsdcOut) revert MinOutputNotMet(usdcOut, minUsdcOut);

        uint256 reserve = IERC20(factory.usdc()).balanceOf(hookAddr);
        if (reserve < usdcOut) revert InsufficientRefundReserve(reserve, usdcOut);

        poolManager.unlock(
            abi.encode(
                CallbackData({
                    action: Action.REFUND_EXACT_IN,
                    payer: msg.sender,
                    token: token,
                    recipient: recipient,
                    subAmount: subInAmount,
                    usdcAmount: usdcOut,
                    hookData: hookData
                })
            )
        );

        emit Refunded(msg.sender, token, subInAmount, usdcOut, recipient);
    }

    function refundAll(
        address token,
        uint256 minUsdcOut,
        address recipient,
        uint256 deadline,
        bytes calldata hookData
    ) external returns (uint256 subInUsed, uint256 usdcOut) {
        if (block.timestamp > deadline) revert DeadlineExpired();
        if (recipient == address(0)) revert InvalidRecipient();

        (, address hookAddr) = factory.getPool(token);

        subInUsed = SubscriptionDaysToken(token).balanceOf(msg.sender);
        if (subInUsed == 0) revert ZeroAmount();

        usdcOut = SubscriptionHook(hookAddr).quoteRefundExactIn(subInUsed);
        if (usdcOut < minUsdcOut) revert MinOutputNotMet(usdcOut, minUsdcOut);

        uint256 reserve = IERC20(factory.usdc()).balanceOf(hookAddr);
        if (reserve < usdcOut) revert InsufficientRefundReserve(reserve, usdcOut);

        poolManager.unlock(
            abi.encode(
                CallbackData({
                    action: Action.REFUND_EXACT_IN,
                    payer: msg.sender,
                    token: token,
                    recipient: recipient,
                    subAmount: subInUsed,
                    usdcAmount: usdcOut,
                    hookData: hookData
                })
            )
        );

        emit Refunded(msg.sender, token, subInUsed, usdcOut, recipient);
    }

    function refundUpTo(
        address token,
        uint256 maxSubIn,
        uint256 minUsdcOut,
        address recipient,
        uint256 deadline,
        bytes calldata hookData
    ) external returns (uint256 subInUsed, uint256 usdcOut) {
        if (block.timestamp > deadline) revert DeadlineExpired();
        if (recipient == address(0)) revert InvalidRecipient();

        (, address hookAddr) = factory.getPool(token);

        uint256 bal = SubscriptionDaysToken(token).balanceOf(msg.sender);
        subInUsed = bal < maxSubIn ? bal : maxSubIn;
        if (subInUsed == 0) revert ZeroAmount();

        usdcOut = SubscriptionHook(hookAddr).quoteRefundExactIn(subInUsed);
        if (usdcOut < minUsdcOut) revert MinOutputNotMet(usdcOut, minUsdcOut);

        uint256 reserve = IERC20(factory.usdc()).balanceOf(hookAddr);
        if (reserve < usdcOut) revert InsufficientRefundReserve(reserve, usdcOut);

        poolManager.unlock(
            abi.encode(
                CallbackData({
                    action: Action.REFUND_EXACT_IN,
                    payer: msg.sender,
                    token: token,
                    recipient: recipient,
                    subAmount: subInUsed,
                    usdcAmount: usdcOut,
                    hookData: hookData
                })
            )
        );

        emit Refunded(msg.sender, token, subInUsed, usdcOut, recipient);
    }

    function _unlockCallback(bytes calldata raw) internal override returns (bytes memory) {
        CallbackData memory d = abi.decode(raw, (CallbackData));

        (PoolKey memory key,) = factory.getPool(d.token);

        Currency subCurrency = Currency.wrap(d.token);
        Currency usdcCurrency = Currency.wrap(factory.usdc());

        if (d.action == Action.BUY_EXACT_OUT) {
            poolManager.sync(usdcCurrency);
            address(Currency.unwrap(usdcCurrency)).safeTransferFrom(d.payer, address(poolManager), d.usdcAmount);
            poolManager.settle();

            bool buyZeroForOne = (key.currency0 == usdcCurrency);
            SwapParams memory buyParams = SwapParams({
                zeroForOne: buyZeroForOne,
                amountSpecified: int256(d.subAmount),
                sqrtPriceLimitX96: buyZeroForOne ? TickMath.MIN_SQRT_PRICE + 1 : TickMath.MAX_SQRT_PRICE - 1
            });

            poolManager.swap(key, buyParams, d.hookData);

            poolManager.take(subCurrency, d.recipient, d.subAmount);
            return bytes("");
        }

        poolManager.sync(subCurrency);
        address(Currency.unwrap(subCurrency)).safeTransferFrom(d.payer, address(poolManager), d.subAmount);
        poolManager.settle();

        bool refundZeroForOne = (key.currency0 == subCurrency);
        SwapParams memory refundParams = SwapParams({
            zeroForOne: refundZeroForOne,
            amountSpecified: -int256(d.subAmount),
            sqrtPriceLimitX96: refundZeroForOne ? TickMath.MIN_SQRT_PRICE + 1 : TickMath.MAX_SQRT_PRICE - 1
        });

        poolManager.swap(key, refundParams, d.hookData);

        poolManager.take(usdcCurrency, d.recipient, d.usdcAmount);
        return bytes("");
    }
}
