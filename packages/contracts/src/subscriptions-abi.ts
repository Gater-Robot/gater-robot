export const SUBSCRIPTION_FACTORY_ABI = [
  {
    type: "function",
    name: "createToken",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name", type: "string" },
      { name: "symbol", type: "string" }
    ],
    outputs: [{ name: "token", type: "address" }]
  },
  {
    type: "function",
    name: "setupPool",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "p",
        type: "tuple",
        components: [
          { name: "token", type: "address" },
          { name: "router", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "tickSpacing", type: "int24" },
          {
            name: "pricing",
            type: "tuple",
            components: [
              { name: "basePriceUsdc", type: "uint64" },
              { name: "monthlyBundleTokens", type: "uint32" },
              { name: "monthlyBundlePriceUsdc", type: "uint64" },
              { name: "yearlyBundleTokens", type: "uint32" },
              { name: "yearlyBundlePriceUsdc", type: "uint64" },
              { name: "enforceMinMonthly", type: "bool" },
              { name: "refundsEnabled", type: "bool" },
              { name: "refundPriceUsdc", type: "uint64" }
            ]
          },
          { name: "hookSalt", type: "bytes32" }
        ]
      }
    ],
    outputs: [
      { name: "hook", type: "address" },
      {
        name: "key",
        type: "tuple",
        components: [
          { name: "currency0", type: "address" },
          { name: "currency1", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "tickSpacing", type: "int24" },
          { name: "hooks", type: "address" }
        ]
      }
    ]
  },
  {
    type: "function",
    name: "getPool",
    stateMutability: "view",
    inputs: [{ name: "token", type: "address" }],
    outputs: [
      {
        name: "key",
        type: "tuple",
        components: [
          { name: "currency0", type: "address" },
          { name: "currency1", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "tickSpacing", type: "int24" },
          { name: "hooks", type: "address" }
        ]
      },
      { name: "hook", type: "address" }
    ]
  },
  {
    type: "event",
    name: "PoolSetup",
    inputs: [
      { indexed: true, name: "creator", type: "address" },
      { indexed: true, name: "token", type: "address" },
      { indexed: false, name: "hook", type: "address" },
      { indexed: false, name: "poolId", type: "bytes32" }
    ],
    anonymous: false
  }
] as const;

export const SUBSCRIPTION_ROUTER_ABI = [
  {
    type: "function",
    name: "buyExactOut",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "subOutAmount", type: "uint256" },
      { name: "maxUsdcIn", type: "uint256" },
      { name: "recipient", type: "address" },
      { name: "deadline", type: "uint256" },
      { name: "hookData", type: "bytes" }
    ],
    outputs: [{ name: "usdcIn", type: "uint256" }]
  },
  {
    type: "function",
    name: "refundExactIn",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "subInAmount", type: "uint256" },
      { name: "minUsdcOut", type: "uint256" },
      { name: "recipient", type: "address" },
      { name: "deadline", type: "uint256" },
      { name: "hookData", type: "bytes" }
    ],
    outputs: [{ name: "usdcOut", type: "uint256" }]
  },
  {
    type: "function",
    name: "refundAll",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "minUsdcOut", type: "uint256" },
      { name: "recipient", type: "address" },
      { name: "deadline", type: "uint256" },
      { name: "hookData", type: "bytes" }
    ],
    outputs: [
      { name: "subInUsed", type: "uint256" },
      { name: "usdcOut", type: "uint256" }
    ]
  },
  {
    type: "function",
    name: "refundUpTo",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "maxSubIn", type: "uint256" },
      { name: "minUsdcOut", type: "uint256" },
      { name: "recipient", type: "address" },
      { name: "deadline", type: "uint256" },
      { name: "hookData", type: "bytes" }
    ],
    outputs: [
      { name: "subInUsed", type: "uint256" },
      { name: "usdcOut", type: "uint256" }
    ]
  }
] as const;

export const SUBSCRIPTION_HOOK_ABI = [
  {
    type: "function",
    name: "quoteBuyExactOut",
    stateMutability: "view",
    inputs: [{ name: "subOutAmount", type: "uint256" }],
    outputs: [{ name: "usdcIn", type: "uint256" }]
  },
  {
    type: "function",
    name: "quoteRefundExactIn",
    stateMutability: "view",
    inputs: [{ name: "subInAmount", type: "uint256" }],
    outputs: [{ name: "usdcOut", type: "uint256" }]
  },
  {
    type: "function",
    name: "refundReserveUsdc",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "setPricing",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "cfg",
        type: "tuple",
        components: [
          { name: "basePriceUsdc", type: "uint64" },
          { name: "monthlyBundleTokens", type: "uint32" },
          { name: "monthlyBundlePriceUsdc", type: "uint64" },
          { name: "yearlyBundleTokens", type: "uint32" },
          { name: "yearlyBundlePriceUsdc", type: "uint64" },
          { name: "enforceMinMonthly", type: "bool" },
          { name: "refundsEnabled", type: "bool" },
          { name: "refundPriceUsdc", type: "uint64" }
        ]
      }
    ],
    outputs: []
  }
] as const;
