// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {SubscriptionDaysToken} from "../SubscriptionDaysToken.sol";
import {SafeTransferLib} from "./SafeTransferLib.sol";
import {SubPricing} from "./SubPricing.sol";

import {BaseHook} from "@uniswap/v4-periphery/src/utils/BaseHook.sol";
import {Hooks} from "@uniswap/v4-periphery/lib/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-periphery/lib/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-periphery/lib/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-periphery/lib/v4-core/src/types/Currency.sol";
import {BeforeSwapDelta, toBeforeSwapDelta} from "@uniswap/v4-periphery/lib/v4-core/src/types/BeforeSwapDelta.sol";
import {ModifyLiquidityParams, SwapParams} from "@uniswap/v4-periphery/lib/v4-core/src/types/PoolOperation.sol";

contract SubscriptionHook is BaseHook, Ownable {
    using SafeTransferLib for address;

    error InvalidPoolKey();
    error UnauthorizedSender(address sender);
    error RefundsDisabled();
    error SpecifiedCurrencyMustBeSUB();
    error InsufficientRefundReserves(uint256 have, uint256 need);
    error LiquidityDisabled();
    error Int128OutOfBounds();

    address public immutable subToken;
    address public immutable usdcToken;

    Currency public immutable subCurrency;
    Currency public immutable usdcCurrency;

    Currency public immutable currency0;
    Currency public immutable currency1;
    uint24 public immutable fee;
    int24 public immutable tickSpacing;

    address public router;

    SubPricing.Config public pricing;

    event RouterSet(address indexed newRouter);
    event PricingUpdated(SubPricing.Config cfg);
    event Withdrawn(address indexed token, address indexed to, uint256 amount);

    constructor(
        IPoolManager _poolManager,
        address _subToken,
        address _usdcToken,
        address _owner,
        address _router,
        Currency _currency0,
        Currency _currency1,
        uint24 _fee,
        int24 _tickSpacing,
        SubPricing.Config memory _pricing
    ) BaseHook(_poolManager) Ownable(_owner) {
        subToken = _subToken;
        usdcToken = _usdcToken;
        router = _router;

        subCurrency = Currency.wrap(_subToken);
        usdcCurrency = Currency.wrap(_usdcToken);

        currency0 = _currency0;
        currency1 = _currency1;
        fee = _fee;
        tickSpacing = _tickSpacing;

        pricing = _pricing;
        emit PricingUpdated(_pricing);
    }

    function setRouter(address newRouter) external onlyOwner {
        router = newRouter;
        emit RouterSet(newRouter);
    }

    function setPricing(SubPricing.Config calldata cfg) external onlyOwner {
        pricing = cfg;
        emit PricingUpdated(cfg);
    }

    function withdraw(address token, address to, uint256 amount) external onlyOwner {
        token.safeTransfer(to, amount);
        emit Withdrawn(token, to, amount);
    }

    function quoteBuyExactOut(uint256 subOutAmount) external view returns (uint256 usdcIn) {
        usdcIn = SubPricing.buyCostUsdc(pricing, subOutAmount);
    }

    function quoteRefundExactIn(uint256 subInAmount) external view returns (uint256 usdcOut) {
        if (!pricing.refundsEnabled) revert RefundsDisabled();
        usdcOut = SubPricing.refundPayoutUsdc(pricing, subInAmount);
    }

    function refundReserveUsdc() external view returns (uint256) {
        return IERC20(usdcToken).balanceOf(address(this));
    }

    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: true,
            beforeRemoveLiquidity: true,
            afterAddLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: true,
            afterSwap: false,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: true,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    function _beforeAddLiquidity(address, PoolKey calldata, ModifyLiquidityParams calldata, bytes calldata)
        internal
        pure
        override
        returns (bytes4)
    {
        revert LiquidityDisabled();
    }

    function _beforeRemoveLiquidity(address, PoolKey calldata, ModifyLiquidityParams calldata, bytes calldata)
        internal
        pure
        override
        returns (bytes4)
    {
        revert LiquidityDisabled();
    }

    function _beforeSwap(address sender, PoolKey calldata key, SwapParams calldata params, bytes calldata)
        internal
        override
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        bool badPoolKey = key.fee != fee || key.tickSpacing != tickSpacing || !(key.currency0 == currency0)
            || !(key.currency1 == currency1) || address(key.hooks) != address(this);
        if (badPoolKey) revert InvalidPoolKey();

        if (router != address(0) && sender != router) revert UnauthorizedSender(sender);

        if (params.amountSpecified == 0) revert SubPricing.ZeroAmount();

        bool exactInput = params.amountSpecified < 0;

        Currency specified = exactInput
            ? (params.zeroForOne ? key.currency0 : key.currency1)
            : (params.zeroForOne ? key.currency1 : key.currency0);

        if (!(specified == subCurrency)) revert SpecifiedCurrencyMustBeSUB();

        uint256 subAmount = exactInput ? uint256(-params.amountSpecified) : uint256(params.amountSpecified);

        if (!exactInput) {
            uint256 usdcIn = SubPricing.buyCostUsdc(pricing, subAmount);

            poolManager.take(usdcCurrency, address(this), usdcIn);

            poolManager.sync(subCurrency);
            SubscriptionDaysToken(subToken).mint(address(poolManager), subAmount);
            poolManager.settle();

            BeforeSwapDelta buyDelta = toBeforeSwapDelta(-_toInt128(int256(subAmount)), _toInt128(int256(usdcIn)));
            return (BaseHook.beforeSwap.selector, buyDelta, 0);
        }

        if (!pricing.refundsEnabled) revert RefundsDisabled();

        uint256 usdcOut = SubPricing.refundPayoutUsdc(pricing, subAmount);
        uint256 have = IERC20(usdcToken).balanceOf(address(this));
        if (have < usdcOut) revert InsufficientRefundReserves(have, usdcOut);

        poolManager.sync(usdcCurrency);
        usdcToken.safeTransfer(address(poolManager), usdcOut);
        poolManager.settle();

        poolManager.take(subCurrency, address(this), subAmount);
        SubscriptionDaysToken(subToken).burn(subAmount);

        BeforeSwapDelta refundDelta = toBeforeSwapDelta(_toInt128(int256(subAmount)), -_toInt128(int256(usdcOut)));
        return (BaseHook.beforeSwap.selector, refundDelta, 0);
    }

    function _toInt128(int256 x) internal pure returns (int128) {
        if (x < type(int128).min || x > type(int128).max) revert Int128OutOfBounds();
        return int128(x);
    }
}
