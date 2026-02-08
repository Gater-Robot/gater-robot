Below is a **complete “Option A” implementation** that matches what you described *and* avoids the “decay breaks exact-in when selling all” issue by providing a `refundAll()` / `refundUpTo()` flow where the router computes the **current** decayed balance at execution time.

This design is:

* **Buy = exact output (SUB specified)**
  User chooses how many “days” they want (e.g. `30e18` or `365e18`). Hook computes required USDC per your pricing rules.
* **Refund = exact input (SUB specified)**
  User sells back `SUB` and gets `refundPrice` per token. For “sell all”, router reads `balanceOf()` inside the tx and uses that exact value.

Coupons are left as a **clean optional extension point** (`hookData`) but **not required** for core functionality.

---

## Repo layout

```
src/
  utils/Ownable.sol
  libraries/SafeTransferLib.sol
  libraries/SubPricing.sol
  tokens/DecayingSubscriptionToken.sol
  hooks/SubscriptionHook.sol
  factory/SubscriptionFactory.sol
  router/SubscriptionRouter.sol
  mocks/MockUSDC.sol

script/
  DeploySystem.s.sol
  MineHookSalt.s.sol
  DemoBuyRefund.s.sol
```

You’ll need typical Uniswap v4 deps installed (v4-core + v4-periphery) so these imports resolve:

* `v4-core/...`
* `v4-periphery/...`

---

# Contracts

## `src/utils/Ownable.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

abstract contract Ownable {
    error NotOwner();
    error ZeroAddress();

    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);

    address public owner;

    constructor(address initialOwner) {
        if (initialOwner == address(0)) revert ZeroAddress();
        owner = initialOwner;
        emit OwnershipTransferred(address(0), initialOwner);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
```

---

## `src/libraries/SafeTransferLib.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

library SafeTransferLib {
    error TransferFailed();
    error TransferFromFailed();
    error ApproveFailed();

    function safeTransfer(address token, address to, uint256 amount) internal {
        (bool ok, bytes memory data) =
            token.call(abi.encodeWithSelector(bytes4(keccak256("transfer(address,uint256)")), to, amount));
        if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) revert TransferFailed();
    }

    function safeTransferFrom(address token, address from, address to, uint256 amount) internal {
        (bool ok, bytes memory data) = token.call(
            abi.encodeWithSelector(bytes4(keccak256("transferFrom(address,address,uint256)")), from, to, amount)
        );
        if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) revert TransferFromFailed();
    }

    function safeApprove(address token, address spender, uint256 amount) internal {
        (bool ok, bytes memory data) =
            token.call(abi.encodeWithSelector(bytes4(keccak256("approve(address,uint256)")), spender, amount));
        if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) revert ApproveFailed();
    }
}
```

---

## `src/libraries/SubPricing.sol`

This is the shared logic for:

* base: **$1 per token**
* monthly bundle: **30 tokens for $20**
* yearly bundle: **365 tokens for $200**
* optional enforce min 30
* refund price: **default $0.10 per token**

All prices are in **USDC “micro” (6 decimals)**.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

library SubPricing {
    uint256 internal constant SUB_UNIT = 1e18;

    error NonWholeTokenAmount(uint256 amount);

    struct Config {
        // Buy pricing (USDC micro units per SUB token)
        uint32 basePriceUsdc;           // default: 1_000_000 ($1.00)
        uint32 monthlyBundleTokens;     // default: 30
        uint32 monthlyBundlePriceUsdc;  // default: 20_000_000 ($20.00)
        uint32 yearlyBundleTokens;      // default: 365
        uint32 yearlyBundlePriceUsdc;   // default: 200_000_000 ($200.00)

        // Controls
        bool enforceMinMonthly;         // if true, require tokens >= monthlyBundleTokens
        bool refundsEnabled;

        // Refund pricing (USDC micro units per SUB token)
        uint32 refundPriceUsdc;         // default: 100_000 ($0.10)
    }

    function tokensFromAmount(uint256 subAmount) internal pure returns (uint256 tokens) {
        if (subAmount % SUB_UNIT != 0) revert NonWholeTokenAmount(subAmount);
        tokens = subAmount / SUB_UNIT;
    }

    function buyCostUsdc(Config memory cfg, uint256 subOutAmount) internal pure returns (uint256 usdcIn) {
        uint256 tokens = tokensFromAmount(subOutAmount);

        if (cfg.enforceMinMonthly && tokens < uint256(cfg.monthlyBundleTokens)) {
            // handled by caller with custom error if desired
            return type(uint256).max;
        }

        if (tokens == uint256(cfg.monthlyBundleTokens)) return uint256(cfg.monthlyBundlePriceUsdc);
        if (tokens == uint256(cfg.yearlyBundleTokens)) return uint256(cfg.yearlyBundlePriceUsdc);

        return tokens * uint256(cfg.basePriceUsdc);
    }

    function refundPayoutUsdc(Config memory cfg, uint256 subInAmount) internal pure returns (uint256 usdcOut) {
        uint256 tokens = tokensFromAmount(subInAmount);
        return tokens * uint256(cfg.refundPriceUsdc);
    }
}
```

---

## `src/tokens/DecayingSubscriptionToken.sol`

Key properties:

* **Balances decay by exactly `1 token/day`** (i.e. `1e18` units per day) for non-exempt addresses.
* `poolManager` and `hook` should be marked `decayExempt` to avoid pool/accounting issues.
* Includes `mint` and `burn` controlled by minters (your hook will be a minter).

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Ownable} from "../utils/Ownable.sol";

contract DecayingSubscriptionToken is Ownable {
    error InsufficientBalance();
    error InsufficientAllowance();
    error NotMinter();
    error NotOwnerOrFactory();

    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event DecayAccrued(address indexed account, uint256 burnedAmount, uint40 newLastUpdate);
    event DecayExemptSet(address indexed account, bool exempt);
    event MinterSet(address indexed minter, bool allowed);

    string public name;
    string public symbol;
    uint8 public constant decimals = 18;

    uint256 public totalSupply;

    address public immutable factory;

    mapping(address => uint256) internal _stored;
    mapping(address => uint40) internal _lastUpdate;
    mapping(address => mapping(address => uint256)) public allowance;

    mapping(address => bool) public isDecayExempt;
    mapping(address => bool) public isMinter;

    uint256 internal constant UNIT = 1e18;
    uint256 internal constant DAY = 1 days;

    modifier onlyOwnerOrFactory() {
        if (msg.sender != owner && msg.sender != factory) revert NotOwnerOrFactory();
        _;
    }

    constructor(
        string memory name_,
        string memory symbol_,
        address owner_,
        address factory_
    ) Ownable(owner_) {
        name = name_;
        symbol = symbol_;
        factory = factory_;
    }

    function storedBalanceOf(address account) external view returns (uint256) {
        return _stored[account];
    }

    function lastUpdate(address account) external view returns (uint40) {
        return _lastUpdate[account];
    }

    function balanceOf(address account) public view returns (uint256) {
        if (isDecayExempt[account]) return _stored[account];

        uint40 last = _lastUpdate[account];
        if (last == 0) return _stored[account];

        uint256 elapsedDays = (block.timestamp - uint256(last)) / DAY;
        if (elapsedDays == 0) return _stored[account];

        uint256 burnAmt = elapsedDays * UNIT;
        uint256 bal = _stored[account];
        if (burnAmt >= bal) return 0;
        return bal - burnAmt;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            if (allowed < value) revert InsufficientAllowance();
            allowance[from][msg.sender] = allowed - value;
            emit Approval(from, msg.sender, allowance[from][msg.sender]);
        }
        _transfer(from, to, value);
        return true;
    }

    function accrueDecay(address account) external {
        _accrueDecay(account);
    }

    function setDecayExempt(address account, bool exempt) external onlyOwnerOrFactory {
        // realize any outstanding decay first to avoid “freezing” old balance
        _accrueDecay(account);
        isDecayExempt[account] = exempt;

        // reset lastUpdate baseline if turning decay on
        if (!exempt) _lastUpdate[account] = uint40(block.timestamp);

        emit DecayExemptSet(account, exempt);
    }

    function setMinter(address minter, bool allowed) external onlyOwnerOrFactory {
        isMinter[minter] = allowed;
        emit MinterSet(minter, allowed);
    }

    function mint(address to, uint256 amount) external {
        if (!isMinter[msg.sender]) revert NotMinter();
        _accrueDecay(to);

        totalSupply += amount;
        _stored[to] += amount;

        if (_lastUpdate[to] == 0) _lastUpdate[to] = uint40(block.timestamp);

        emit Transfer(address(0), to, amount);
    }

    function burn(uint256 amount) external {
        if (!isMinter[msg.sender]) revert NotMinter();
        _accrueDecay(msg.sender);

        if (_stored[msg.sender] < amount) revert InsufficientBalance();
        _stored[msg.sender] -= amount;
        totalSupply -= amount;

        emit Transfer(msg.sender, address(0), amount);
    }

    function _transfer(address from, address to, uint256 value) internal {
        _accrueDecay(from);
        _accrueDecay(to);

        if (_stored[from] < value) revert InsufficientBalance();

        _stored[from] -= value;
        _stored[to] += value;

        if (_lastUpdate[from] == 0) _lastUpdate[from] = uint40(block.timestamp);
        if (_lastUpdate[to] == 0) _lastUpdate[to] = uint40(block.timestamp);

        emit Transfer(from, to, value);
    }

    function _accrueDecay(address account) internal {
        if (isDecayExempt[account]) {
            if (_lastUpdate[account] == 0) _lastUpdate[account] = uint40(block.timestamp);
            return;
        }

        uint40 last = _lastUpdate[account];
        if (last == 0) {
            _lastUpdate[account] = uint40(block.timestamp);
            return;
        }

        uint256 elapsedDays = (block.timestamp - uint256(last)) / DAY;
        if (elapsedDays == 0) return;

        uint256 burnAmt = elapsedDays * UNIT;
        uint256 bal = _stored[account];

        uint256 actualBurn = burnAmt >= bal ? bal : burnAmt;
        if (actualBurn != 0) {
            _stored[account] = bal - actualBurn;
            totalSupply -= actualBurn;
            emit Transfer(account, address(0), actualBurn);
        }

        uint40 newLast = uint40(uint256(last) + elapsedDays * DAY);
        _lastUpdate[account] = newLast;

        emit DecayAccrued(account, actualBurn, newLast);
    }
}
```

---

## `src/hooks/SubscriptionHook.sol`

This is the heart of Option A:

* Uses **beforeSwap + beforeSwapReturnDelta**
* Forces swaps to only be:

  * **buy**: exact output of SUB
  * **refund**: exact input of SUB
* Uses `hookData` but does nothing with it (future coupon module)

Important: this hook assumes the user is swapping via **your `SubscriptionRouter`** (so you have consistent behavior). If you want it “permissionless”, you can loosen the sender check, but then you also need to handle payment plumbing more carefully.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Ownable} from "../utils/Ownable.sol";
import {SafeTransferLib} from "../libraries/SafeTransferLib.sol";
import {SubPricing} from "../libraries/SubPricing.sol";
import {DecayingSubscriptionToken} from "../tokens/DecayingSubscriptionToken.sol";

import {BaseHook} from "v4-periphery/src/utils/BaseHook.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {BeforeSwapDelta, toBeforeSwapDelta} from "v4-core/src/types/BeforeSwapDelta.sol";

contract SubscriptionHook is BaseHook, Ownable {
    using SafeTransferLib for address;
    using SubPricing for SubPricing.Config;

    // ----- Errors -----
    error InvalidPoolKey();
    error UnauthorizedSender(address sender);
    error ZeroAmount();
    error SpecifiedCurrencyMustBeSUB();
    error MustUseExactOutputForBuy();
    error MustUseExactInputForRefund();
    error MinPurchaseNotMet(uint256 minTokens);
    error RefundsDisabled();
    error InsufficientRefundReserves(uint256 have, uint256 need);

    // ----- Config / immutables -----
    address public immutable subToken;
    address public immutable usdcToken;

    Currency public immutable subCurrency;
    Currency public immutable usdcCurrency;

    Currency public immutable currency0;
    Currency public immutable currency1;
    uint24 public immutable fee;
    int24 public immutable tickSpacing;

    // Router that should call swaps
    address public router;

    // Pricing config
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
    )
        BaseHook(_poolManager)
        Ownable(_owner)
    {
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

    // ---- Admin ----
    function setRouter(address newRouter) external onlyOwner {
        router = newRouter;
        emit RouterSet(newRouter);
    }

    function setPricing(SubPricing.Config calldata cfg) external onlyOwner {
        pricing = cfg;
        emit PricingUpdated(cfg);
    }

    /// @notice Withdraw ERC20 from hook reserves (USDC proceeds). Keep enough if you want refunds to succeed.
    function withdraw(address token, address to, uint256 amount) external onlyOwner {
        token.safeTransfer(to, amount);
        emit Withdrawn(token, to, amount);
    }

    // ---- Quotes for your UI (and router pre-checks) ----
    function quoteBuyExactOut(uint256 subOutAmount) external view returns (uint256 usdcIn) {
        SubPricing.Config memory cfg = pricing;
        uint256 tokens = SubPricing.tokensFromAmount(subOutAmount);

        if (cfg.enforceMinMonthly && tokens < uint256(cfg.monthlyBundleTokens)) {
            revert MinPurchaseNotMet(uint256(cfg.monthlyBundleTokens));
        }

        usdcIn = cfg.buyCostUsdc(subOutAmount);
    }

    function quoteRefundExactIn(uint256 subInAmount) external view returns (uint256 usdcOut) {
        SubPricing.Config memory cfg = pricing;
        if (!cfg.refundsEnabled) revert RefundsDisabled();
        usdcOut = cfg.refundPayoutUsdc(subInAmount);
    }

    // ---- Hook permissions ----
    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: false,
            beforeRemoveLiquidity: false,
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

    // ---- Core: beforeSwap custom accounting ----
    function _beforeSwap(
        address sender,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata params,
        bytes calldata /*hookData*/
    )
        internal
        override
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        // lock to the intended pool (prevents someone reusing this hook on other pools)
        if (
            key.fee != fee ||
            key.tickSpacing != tickSpacing ||
            key.currency0 != currency0 ||
            key.currency1 != currency1 ||
            address(key.hooks) != address(this)
        ) revert InvalidPoolKey();

        if (router != address(0) && sender != router) revert UnauthorizedSender(sender);

        if (params.amountSpecified == 0) revert ZeroAmount();

        bool exactInput = params.amountSpecified < 0;
        bool exactOutput = params.amountSpecified > 0;

        // Determine specified currency for this swap:
        // - exact input: specified is the input currency
        // - exact output: specified is the output currency
        Currency specified = exactInput
            ? (params.zeroForOne ? key.currency0 : key.currency1)
            : (params.zeroForOne ? key.currency1 : key.currency0);

        if (specified != subCurrency) revert SpecifiedCurrencyMustBeSUB();

        uint256 subAmount = exactInput ? uint256(-params.amountSpecified) : uint256(params.amountSpecified);

        // Enforce whole-day units
        uint256 tokens = SubPricing.tokensFromAmount(subAmount);

        SubPricing.Config memory cfg = pricing;

        if (exactOutput) {
            // BUY: exact output SUB
            // user receives subAmount; pays USDC computed by pricing rules
            if (cfg.enforceMinMonthly && tokens < uint256(cfg.monthlyBundleTokens)) {
                revert MinPurchaseNotMet(uint256(cfg.monthlyBundleTokens));
            }

            uint256 usdcIn = cfg.buyCostUsdc(subAmount);

            // Take USDC out of PoolManager into this hook (this is the “payment”)
            poolManager.take(usdcCurrency, address(this), usdcIn);

            // Provide SUB into PoolManager so the router can take it out
            poolManager.sync(subCurrency);
            DecayingSubscriptionToken(subToken).mint(address(poolManager), subAmount);
            poolManager.settle();

            // No-op the pool swap and define deltas:
            // specified delta = -subAmount makes amountToSwap = amountSpecified + (-amountSpecified) = 0
            // unspecified delta = +usdcIn so router owes USDC
            BeforeSwapDelta delta = toBeforeSwapDelta(
                _toInt128(-int256(subAmount)),
                _toInt128(int256(usdcIn))
            );
            return (BaseHook.beforeSwap.selector, delta, 0);
        } else {
            // REFUND: exact input SUB
            if (!cfg.refundsEnabled) revert RefundsDisabled();

            uint256 usdcOut = cfg.refundPayoutUsdc(subAmount);

            // Ensure we have USDC reserves to pay
            uint256 have = _balanceOf(usdcToken, address(this));
            if (have < usdcOut) revert InsufficientRefundReserves(have, usdcOut);

            // Push USDC into PoolManager so router can take it out to the user
            poolManager.sync(usdcCurrency);
            usdcToken.safeTransfer(address(poolManager), usdcOut);
            poolManager.settle();

            // Pull SUB out of PoolManager and burn it
            poolManager.take(subCurrency, address(this), subAmount);
            DecayingSubscriptionToken(subToken).burn(subAmount);

            // specified delta = +subAmount (because amountSpecified is negative) => amountToSwap becomes 0
            // unspecified delta = -usdcOut => router is owed USDC
            BeforeSwapDelta delta = toBeforeSwapDelta(
                _toInt128(int256(subAmount)),
                _toInt128(-int256(usdcOut))
            );
            return (BaseHook.beforeSwap.selector, delta, 0);
        }
    }

    function _balanceOf(address token, address a) internal view returns (uint256) {
        (bool ok, bytes memory data) = token.staticcall(abi.encodeWithSelector(bytes4(keccak256("balanceOf(address)")), a));
        require(ok && data.length >= 32, "BAL_FAIL");
        return abi.decode(data, (uint256));
    }

    function _toInt128(int256 x) internal pure returns (int128) {
        require(x >= type(int128).min && x <= type(int128).max, "I128_OOB");
        return int128(x);
    }
}
```

---

## `src/factory/SubscriptionFactory.sol`

This creates the token and sets up the pool + hook.

It also enforces the hook address contains the **required hook flags** in its address bits.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {DecayingSubscriptionToken} from "../tokens/DecayingSubscriptionToken.sol";
import {SubPricing} from "../libraries/SubPricing.sol";
import {SubscriptionHook} from "../hooks/SubscriptionHook.sol";

import {Hooks} from "v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";

contract SubscriptionFactory {
    error NotTokenOwner();
    error AlreadySetup();
    error BadHookAddressFlags();
    error ZeroAddress();

    event TokenCreated(address indexed creator, address indexed token, string name, string symbol);
    event PoolSetup(address indexed creator, address indexed token, address hook);

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

    constructor(IPoolManager _poolManager, address _usdc, uint24 fee_, int24 tickSpacing_) {
        if (address(_poolManager) == address(0) || _usdc == address(0)) revert ZeroAddress();
        poolManager = _poolManager;
        usdc = _usdc;
        defaultFee = fee_;
        defaultTickSpacing = tickSpacing_;
    }

    function createToken(string calldata name, string calldata symbol) external returns (address token) {
        token = address(new DecayingSubscriptionToken(name, symbol, msg.sender, address(this)));
        emit TokenCreated(msg.sender, token, name, symbol);
    }

    struct SetupParams {
        address token;
        address router;

        // Optional overrides (or use defaults)
        uint24 fee;
        int24 tickSpacing;

        // Pricing config
        SubPricing.Config pricing;

        // CREATE2 salt mined offchain (or via script below)
        bytes32 hookSalt;
    }

    function setupPool(SetupParams calldata p) external returns (address hook, PoolKey memory key) {
        if (p.token == address(0) || p.router == address(0)) revert ZeroAddress();

        PoolInfo storage info = poolsByToken[p.token];
        if (info.exists) revert AlreadySetup();

        // token owner must be msg.sender
        DecayingSubscriptionToken t = DecayingSubscriptionToken(p.token);
        if (t.owner() != msg.sender) revert NotTokenOwner();

        uint24 fee_ = p.fee == 0 ? defaultFee : p.fee;
        int24 ts_ = p.tickSpacing == 0 ? defaultTickSpacing : p.tickSpacing;

        // sort currencies
        Currency subCurrency = Currency.wrap(p.token);
        Currency usdcCurrency = Currency.wrap(usdc);

        (Currency currency0, Currency currency1) = _sort(subCurrency, usdcCurrency);

        // deploy hook (needs correct permission bits in address)
        hook = address(
            new SubscriptionHook{salt: p.hookSalt}(
                poolManager,
                p.token,
                usdc,
                msg.sender,      // hook owner = creator
                p.router,
                currency0,
                currency1,
                fee_,
                ts_,
                p.pricing
            )
        );

        // Enforce address includes required flags
        uint160 flags = uint160(Hooks.BEFORE_SWAP_FLAG | Hooks.BEFORE_SWAP_RETURNS_DELTA_FLAG);
        if ((uint160(hook) & flags) != flags) revert BadHookAddressFlags();

        // configure token
        t.setMinter(hook, true);
        t.setDecayExempt(address(poolManager), true);
        t.setDecayExempt(hook, true);

        key = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: fee_,
            tickSpacing: ts_,
            hooks: IHooks(hook)
        });

        // initialize pool at ~1:1 (not used for pricing, but required for pool init)
        uint160 sqrtPriceX96 = uint160(1 << 96);
        poolManager.initialize(key, sqrtPriceX96, bytes(""));

        info.hook = hook;
        info.key = key;
        info.exists = true;

        emit PoolSetup(msg.sender, p.token, hook);
    }

    function getPool(address token) external view returns (PoolKey memory key, address hook) {
        PoolInfo storage info = poolsByToken[token];
        require(info.exists, "NO_POOL");
        return (info.key, info.hook);
    }

    function _sort(Currency a, Currency b) internal pure returns (Currency, Currency) {
        return Currency.unwrap(a) < Currency.unwrap(b) ? (a, b) : (b, a);
    }
}
```

---

## `src/router/SubscriptionRouter.sol`

This:

* Implements `unlockCallback` via `SafeCallback`
* Provides:

  * `buyExactOut()`
  * `refundExactIn()`
  * `refundAll()`
  * `refundUpTo()`

Crucially: `refundAll()` reads `balanceOf(msg.sender)` during execution so decay timing no longer breaks you.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {SafeTransferLib} from "../libraries/SafeTransferLib.sol";
import {DecayingSubscriptionToken} from "../tokens/DecayingSubscriptionToken.sol";
import {SubscriptionFactory} from "../factory/SubscriptionFactory.sol";
import {SubscriptionHook} from "../hooks/SubscriptionHook.sol";

import {SafeCallback} from "v4-periphery/src/base/SafeCallback.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {BalanceDelta} from "v4-core/src/types/BalanceDelta.sol";

contract SubscriptionRouter is SafeCallback {
    using SafeTransferLib for address;

    error DeadlineExpired();
    error MaxInputExceeded(uint256 need, uint256 max);
    error MinOutputNotMet(uint256 out, uint256 min);
    error ZeroAmount();
    error InvalidRecipient();

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
        uint256 subAmount;   // subOut for buy, subIn for refund
        uint256 usdcAmount;  // usdcIn (buy) or usdcOut (refund)
        bytes hookData;
    }

    constructor(IPoolManager _pm, SubscriptionFactory _factory) SafeCallback(_pm) {
        factory = _factory;
    }

    // ---- BUY ----
    function buyExactOut(
        address token,
        uint256 subOutAmount,
        uint256 maxUsdcIn,
        address recipient,
        uint256 deadline,
        bytes calldata hookData
    )
        external
        returns (uint256 usdcIn)
    {
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

    // ---- REFUND exact in ----
    function refundExactIn(
        address token,
        uint256 subInAmount,
        uint256 minUsdcOut,
        address recipient,
        uint256 deadline,
        bytes calldata hookData
    )
        external
        returns (uint256 usdcOut)
    {
        if (block.timestamp > deadline) revert DeadlineExpired();
        if (recipient == address(0)) revert InvalidRecipient();
        if (subInAmount == 0) revert ZeroAmount();

        (, address hookAddr) = factory.getPool(token);
        usdcOut = SubscriptionHook(hookAddr).quoteRefundExactIn(subInAmount);
        if (usdcOut < minUsdcOut) revert MinOutputNotMet(usdcOut, minUsdcOut);

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

    // ---- REFUND all (solves decay timing issue) ----
    function refundAll(
        address token,
        uint256 minUsdcOut,
        address recipient,
        uint256 deadline,
        bytes calldata hookData
    )
        external
        returns (uint256 subInUsed, uint256 usdcOut)
    {
        if (block.timestamp > deadline) revert DeadlineExpired();
        if (recipient == address(0)) revert InvalidRecipient();

        // read effective decayed balance at execution time
        subInUsed = DecayingSubscriptionToken(token).balanceOf(msg.sender);
        if (subInUsed == 0) revert ZeroAmount();

        (, address hookAddr) = factory.getPool(token);
        usdcOut = SubscriptionHook(hookAddr).quoteRefundExactIn(subInUsed);
        if (usdcOut < minUsdcOut) revert MinOutputNotMet(usdcOut, minUsdcOut);

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

    /// @notice refund up to a max amount; uses min(balance, maxSubIn) to avoid “signed too high” failures
    function refundUpTo(
        address token,
        uint256 maxSubIn,
        uint256 minUsdcOut,
        address recipient,
        uint256 deadline,
        bytes calldata hookData
    )
        external
        returns (uint256 subInUsed, uint256 usdcOut)
    {
        if (block.timestamp > deadline) revert DeadlineExpired();
        if (recipient == address(0)) revert InvalidRecipient();

        uint256 bal = DecayingSubscriptionToken(token).balanceOf(msg.sender);
        subInUsed = bal < maxSubIn ? bal : maxSubIn;
        if (subInUsed == 0) revert ZeroAmount();

        (, address hookAddr) = factory.getPool(token);
        usdcOut = SubscriptionHook(hookAddr).quoteRefundExactIn(subInUsed);
        if (usdcOut < minUsdcOut) revert MinOutputNotMet(usdcOut, minUsdcOut);

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

    // ---- PoolManager callback ----
    function _unlockCallback(bytes calldata raw) internal override returns (bytes memory) {
        CallbackData memory d = abi.decode(raw, (CallbackData));

        (PoolKey memory key, address hookAddr) = factory.getPool(d.token);

        Currency subCurrency = Currency.wrap(d.token);
        Currency usdcCurrency = Currency.wrap(factory.usdc());

        if (d.action == Action.BUY_EXACT_OUT) {
            // Pre-pay USDC into PoolManager and settle (creates +delta for router)
            poolManager.sync(usdcCurrency);
            address(Currency.unwrap(usdcCurrency)).safeTransferFrom(d.payer, address(poolManager), d.usdcAmount);
            poolManager.settle();

            // Swap exact output SUB (amountSpecified positive), direction depends on token ordering
            bool zeroForOne = (key.currency0 == usdcCurrency);
            IPoolManager.SwapParams memory params = IPoolManager.SwapParams({
                zeroForOne: zeroForOne,
                amountSpecified: int256(d.subAmount),
                sqrtPriceLimitX96: 0
            });

            BalanceDelta _ = poolManager.swap(key, params, d.hookData);

            // Take SUB out to recipient (resolves +delta)
            poolManager.take(subCurrency, d.recipient, d.subAmount);

            return bytes("");
        } else {
            // REFUND exact input SUB

            // Pre-pay SUB into PoolManager and settle (creates +delta for router)
            poolManager.sync(subCurrency);
            address(Currency.unwrap(subCurrency)).safeTransferFrom(d.payer, address(poolManager), d.subAmount);
            poolManager.settle();

            // Swap exact input SUB (amountSpecified negative)
            bool zeroForOne = (key.currency0 == subCurrency);
            IPoolManager.SwapParams memory params = IPoolManager.SwapParams({
                zeroForOne: zeroForOne,
                amountSpecified: -int256(d.subAmount),
                sqrtPriceLimitX96: 0
            });

            BalanceDelta _ = poolManager.swap(key, params, d.hookData);

            // Take USDC out to recipient
            poolManager.take(usdcCurrency, d.recipient, d.usdcAmount);

            return bytes("");
        }
    }
}
```

---

## `src/mocks/MockUSDC.sol`

Useful for local testing.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract MockUSDC {
    string public name = "Mock USDC";
    string public symbol = "mUSDC";
    uint8 public constant decimals = 6;

    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 amount);
    event Approval(address indexed owner, address indexed spender, uint256 amount);

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "bal");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 a = allowance[from][msg.sender];
        require(a >= amount, "allow");
        if (a != type(uint256).max) allowance[from][msg.sender] = a - amount;

        require(balanceOf[from] >= amount, "bal");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
}
```

---

# Scripts

These are Foundry-style scripts (`forge script ...`). They assume you provide a valid `POOL_MANAGER` address for your environment.

## `script/MineHookSalt.s.sol`

Mines a CREATE2 salt so the deployed hook address includes required v4 hook flags.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";

import {Hooks} from "v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {Currency} from "v4-core/src/types/Currency.sol";

import {SubscriptionHook} from "../src/hooks/SubscriptionHook.sol";
import {SubPricing} from "../src/libraries/SubPricing.sol";

contract MineHookSalt is Script {
    function run() external {
        // Inputs
        address deployer = vm.envAddress("DEPLOYER"); // the factory address that will do CREATE2
        address poolManager = vm.envAddress("POOL_MANAGER");
        address subToken = vm.envAddress("SUB_TOKEN");
        address usdc = vm.envAddress("USDC");
        address owner = vm.envAddress("OWNER");
        address router = vm.envAddress("ROUTER");

        uint24 fee = uint24(vm.envUint("FEE"));                // e.g. 0 or 3000
        int24 tickSpacing = int24(int256(vm.envInt("TICK_SPACING"))); // e.g. 1

        Currency subCurrency = Currency.wrap(subToken);
        Currency usdcCurrency = Currency.wrap(usdc);
        (Currency c0, Currency c1) = Currency.unwrap(subCurrency) < Currency.unwrap(usdcCurrency)
            ? (subCurrency, usdcCurrency)
            : (usdcCurrency, subCurrency);

        SubPricing.Config memory cfg = SubPricing.Config({
            basePriceUsdc: 1_000_000,
            monthlyBundleTokens: 30,
            monthlyBundlePriceUsdc: 20_000_000,
            yearlyBundleTokens: 365,
            yearlyBundlePriceUsdc: 200_000_000,
            enforceMinMonthly: false,
            refundsEnabled: true,
            refundPriceUsdc: 100_000
        });

        bytes memory initCode = abi.encodePacked(
            type(SubscriptionHook).creationCode,
            abi.encode(
                IPoolManager(poolManager),
                subToken,
                usdc,
                owner,
                router,
                c0,
                c1,
                fee,
                tickSpacing,
                cfg
            )
        );

        bytes32 initCodeHash = keccak256(initCode);

        uint160 required = uint160(Hooks.BEFORE_SWAP_FLAG | Hooks.BEFORE_SWAP_RETURNS_DELTA_FLAG);

        // brute force salts (fast offchain)
        for (uint256 i = 0; i < 5_000_000; i++) {
            bytes32 salt = bytes32(i);
            address predicted = computeCreate2(deployer, salt, initCodeHash);
            if ((uint160(predicted) & required) == required) {
                console2.log("FOUND salt:", uint256(salt));
                console2.log("Predicted hook:", predicted);
                return;
            }
        }

        revert("salt not found in range");
    }

    function computeCreate2(address deployer, bytes32 salt, bytes32 initCodeHash) internal pure returns (address) {
        bytes32 h = keccak256(abi.encodePacked(bytes1(0xff), deployer, salt, initCodeHash));
        return address(uint160(uint256(h)));
    }
}
```

---

## `script/DeploySystem.s.sol`

Deploys factory + router and creates a pool + token.
You still need a POOL_MANAGER address available.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";

import {SubscriptionFactory} from "../src/factory/SubscriptionFactory.sol";
import {SubscriptionRouter} from "../src/router/SubscriptionRouter.sol";
import {SubPricing} from "../src/libraries/SubPricing.sol";

contract DeploySystem is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address poolManager = vm.envAddress("POOL_MANAGER");
        address usdc = vm.envAddress("USDC");

        vm.startBroadcast(pk);

        // Choose defaults for pools
        uint24 defaultFee = 0;
        int24 defaultTickSpacing = 1;

        SubscriptionFactory factory = new SubscriptionFactory(
            IPoolManager(poolManager),
            usdc,
            defaultFee,
            defaultTickSpacing
        );

        SubscriptionRouter router = new SubscriptionRouter(
            IPoolManager(poolManager),
            factory
        );

        console2.log("Factory:", address(factory));
        console2.log("Router :", address(router));

        vm.stopBroadcast();
    }
}

import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
```

---

## `script/DemoBuyRefund.s.sol`

End-to-end example (assumes you already deployed poolManager, factory, router, token, pool).

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {SubscriptionFactory} from "../src/factory/SubscriptionFactory.sol";
import {SubscriptionRouter} from "../src/router/SubscriptionRouter.sol";
import {MockUSDC} from "../src/mocks/MockUSDC.sol";
import {DecayingSubscriptionToken} from "../src/tokens/DecayingSubscriptionToken.sol";

contract DemoBuyRefund is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");

        address factoryAddr = vm.envAddress("FACTORY");
        address routerAddr = vm.envAddress("ROUTER");

        vm.startBroadcast(pk);

        SubscriptionFactory factory = SubscriptionFactory(factoryAddr);
        SubscriptionRouter router = SubscriptionRouter(routerAddr);

        // 1) creator creates token
        address token = factory.createToken("Creator SUB", "CSUB");
        console2.log("SUB token:", token);

        // 2) creator sets up pool (must provide a mined salt!)
        bytes32 salt = bytes32(vm.envUint("HOOK_SALT"));

        SubscriptionFactory.SetupParams memory p;
        p.token = token;
        p.router = address(router);
        p.fee = 0;
        p.tickSpacing = 1;
        p.hookSalt = salt;

        p.pricing = SubPricing.Config({
            basePriceUsdc: 1_000_000,
            monthlyBundleTokens: 30,
            monthlyBundlePriceUsdc: 20_000_000,
            yearlyBundleTokens: 365,
            yearlyBundlePriceUsdc: 200_000_000,
            enforceMinMonthly: true,
            refundsEnabled: true,
            refundPriceUsdc: 100_000
        });

        (address hook, ) = factory.setupPool(p);
        console2.log("Hook:", hook);

        vm.stopBroadcast();
    }
}
```

---

# How the “decay breaks exact-in” risk is solved

You were right about the UX failure mode: if someone tries to “sell full balance” by signing a tx that uses a precomputed amount, decay can make the amount invalid by the time it executes.

In this system:

* **Users do NOT need to precompute “sell all” offchain**.
* They call:

  * `refundAll(token, minOut, recipient, deadline, hookData)`
    which reads `balanceOf(msg.sender)` *inside the tx* and uses that exact amount.

Or:

* `refundUpTo(token, maxSubIn, minOut, ...)`
  which uses `min(balance, maxSubIn)` so even if their offchain UI is stale, the tx still succeeds.

---

# Where coupons plug in later

* Both router and hook already accept `bytes hookData`
* In v4, `hookData` is passed into the hook via `swap(..., hookData)` (and quoters also accept hookData), so you can later encode:

  * coupon hash
  * signature
  * discount bps
  * “refund boost”
  * allowlist proofs
  * etc.

For hackathon speed, keep it `bytes("")` now.

---

# Codex review notes (appendix)

This “Option A” design makes sense: you’re using a v4 hook to zero out the pool swap via `beforeSwapReturnDelta` and instead do fixed-price mint/burn + USDC cashflows, while the router owns UX (notably `refundAll()` reading `balanceOf()` at execution time to avoid decay timing failures).

## Concrete bugs / sharp edges

* **Missing import in `DemoBuyRefund.s.sol`:** the script uses `SubPricing.Config` but doesn’t import `SubPricing`.
* **`sqrtPriceLimitX96: 0` risk in router swaps:** you set `sqrtPriceLimitX96` to `0` for both buy/refund swaps. Depending on PoolManager validation order, that can revert even if your hook makes the computed swap amount effectively `0`. Safer is setting an explicit min/max bound appropriate to the direction.
* **Liquidity access:** your hook doesn’t gate `addLiquidity`/`removeLiquidity` (permissions are `false`, so the hook won’t run, but the pool may still allow LP actions). If you don’t want third parties interacting with a pool whose “price” is enforced by the hook (not the pool), consider explicitly reverting liquidity actions (or otherwise preventing LP activity).
* **Unused errors in `SubscriptionHook`:** `MustUseExactOutputForBuy` / `MustUseExactInputForRefund` are declared but never used; either enforce them or remove them.

## Improvements to consider

* **Refund solvency UX:** add a router precheck for refund reserve sufficiency (read hook USDC balance) so users fail before entering `unlock` when refunds are underfunded.
* **Coupons later:** once `hookData` affects pricing, your `quote*` functions should accept `hookData` (otherwise UI quotes can diverge from execution).
* **Transferability:** decide whether `SUB` should be transferable. If “days” shouldn’t be tradable, restrict transfers or constrain them to intended flows.
* **Document settlement/delta invariants:** add a short note/tests capturing the intended v4 flow (`sync`/`settle`, hook deltas, and why the swap is effectively no-op) to make audits/reviews easier.

---

# Audit Findings (12 issues)

## Critical

### 1. `sqrtPriceLimitX96 = 0` will REVERT half of all swaps

**Contract:** `SubscriptionRouter.sol` — `_unlockCallback` (both BUY and REFUND paths)

```solidity
sqrtPriceLimitX96: 0  // BUG
```

Uniswap v4's `Pool.sol` checks:
```solidity
if (params.zeroForOne) {
    if (params.sqrtPriceLimitX96 <= TickMath.MIN_SQRT_PRICE) revert PriceLimitOutOfBounds();
}
```

`MIN_SQRT_PRICE = 4295128739`, so `0 <= 4295128739` is true → revert. Depending on whether SUB or USDC has the lower address, **either all buys or all refunds will always revert**.

**Fix:**
```solidity
sqrtPriceLimitX96: zeroForOne
    ? TickMath.MIN_SQRT_PRICE + 1
    : TickMath.MAX_SQRT_PRICE - 1
```

### 2. `DeploySystem.s.sol` won't compile — import after closing brace

```solidity
    vm.stopBroadcast();
  }
}

import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";  // after contract!
```

**Fix:** Move the import to the top of the file with the other imports.

---

## High

### 3. No `beforeAddLiquidity` hook protection

The hook only enables `beforeSwap` and `beforeSwapReturnDelta`. Anyone can call `addLiquidity` on this pool, locking tokens in a non-functional AMM with no way to recover them.

**Fix:** Add `beforeAddLiquidity: true` to `getHookPermissions()` and override `_beforeAddLiquidity` to revert unconditionally.

### 4. `refundAll`/`refundUpTo` should validate whole-token balance

If `balanceOf()` ever returns a non-1e18-aligned amount, `SubPricing.tokensFromAmount()` reverts with `NonWholeTokenAmount` — a confusing error. Adding a floor-to-nearest-token would be more robust as defense in depth.

---

## Medium

### 5. `totalSupply` is stale until decay is settled

`balanceOf()` computes virtual decayed balances, but `totalSupply` only decrements when `accrueDecay()` is explicitly called per account. Any contract or UI reading `totalSupply` will see an overstated number.

### 6. `SubPricing.buyCostUsdc` returns `type(uint256).max` as sentinel

When `enforceMinMonthly` is true and tokens < minimum, it returns max uint256 instead of reverting. The hook handles this separately, but direct callers of `buyCostUsdc` get a nonsensical price. Should revert instead.

### 7. v4-periphery version dependency

The `_beforeSwap` internal override pattern (underscore prefix) is specific to the current v4-periphery `BaseHook.sol`. Older versions used `beforeSwap` directly. Pin the dependency version in foundry.toml/remappings.

---

## Low / Informational

### 8. Redundant `_lastUpdate` reset in `_transfer`

After `_accrueDecay(from)` and `_accrueDecay(to)`, both accounts already have `_lastUpdate` set. The `if (_lastUpdate[from] == 0)` checks on lines 333-334 are unreachable. Harmless but unnecessary.

### 9. `burn()` only burns from `msg.sender`

Works for the current hook flow (hook receives tokens via `take`, then burns from its own balance). But a `burnFrom(address, uint256)` would be more flexible for future admin or migration flows.

### 10. No pool ID in `PoolSetup` event

The factory emits `PoolSetup(creator, token, hook)` but doesn't include the pool ID or initial sqrtPriceX96. Makes off-chain indexing harder.

### 11. `SafeTransferLib` uses string-based selector computation

`bytes4(keccak256("transfer(address,uint256)"))` works but `IERC20.transfer.selector` is cleaner and eliminates typo risk.

### 12. Initial `sqrtPriceX96 = 1 << 96` sets misleading 1:1 ratio

Irrelevant since the hook no-ops the AMM, but combined with the missing liquidity guard (#3), a user adding liquidity at this price (1 SUB-wei = 1 USDC-wei, i.e. 1e12 SUB = 1 USDC) could lose funds.

---

## BeforeSwapDelta Math: Verified Correct

The delta signs for both BUY and REFUND were traced through the v4 PoolManager and confirmed correct:

- **BUY:** `specifiedDelta = -subAmount` cancels `amountSpecified` → `amountToSwap = 0`. `unspecifiedDelta = +usdcIn` makes caller owe USDC. Hook's take/settle + hookDelta net to zero. Router's pre-settle + callerDelta + post-take net to zero.
- **REFUND:** `specifiedDelta = +subAmount` cancels negative `amountSpecified` → `amountToSwap = 0`. `unspecifiedDelta = -usdcOut` makes caller receive USDC. Same balanced accounting.

---

# Audit Findings GPT-5.2

## Codex review notes (appended)

This “Option A” design makes sense: you’re using a v4 hook to zero out the pool swap via `beforeSwapReturnDelta` and instead do fixed-price mint/burn + USDC cashflows, while the router owns UX (notably `refundAll()` reading `balanceOf()` at execution time to avoid decay timing failures).

### Concrete bugs / sharp edges

* **Missing import in `DemoBuyRefund.s.sol`:** the script uses `SubPricing.Config` but doesn’t import `SubPricing`.
* **`sqrtPriceLimitX96: 0` risk in router swaps:** you set `sqrtPriceLimitX96` to `0` for both buy/refund swaps. Depending on PoolManager validation order, that can revert even if your hook makes the computed swap amount effectively `0`. Safer is setting an explicit min/max bound appropriate to the direction.
* **Liquidity access:** your hook doesn’t gate `addLiquidity`/`removeLiquidity` (permissions are `false`, so the hook won’t run, but the pool may still allow LP actions). If you don’t want third parties interacting with a pool whose “price” is enforced by the hook (not the pool), consider explicitly reverting liquidity actions (or otherwise preventing LP activity).
* **Unused errors in `SubscriptionHook`:** `MustUseExactOutputForBuy` / `MustUseExactInputForRefund` are declared but never used; either enforce them or remove them.

### Improvements to consider

* **Refund solvency UX:** add a router precheck for refund reserve sufficiency (read hook USDC balance) so users fail before entering `unlock` when refunds are underfunded.
* **Coupons later:** once `hookData` affects pricing, your `quote*` functions should accept `hookData` (otherwise UI quotes can diverge from execution).
* **Transferability:** decide whether `SUB` should be transferable. If “days” shouldn’t be tradable, restrict transfers or constrain them to intended flows.
* **Document settlement/delta invariants:** add a short note/tests capturing the intended v4 flow (`sync`/`settle`, hook deltas, and why the swap is effectively no-op) to make audits/reviews easier.
