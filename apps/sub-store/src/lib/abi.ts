// NOTE: Update these ABIs to match your deployed contracts exactly.

export const erc20Abi = [
  { type: 'function', name: 'name', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
] as const

export const subFactoryAbi = [
  {
    type: 'function',
    name: 'createProduct',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'p',
        type: 'tuple',
        components: [
          { name: 'name', type: 'string' },
          { name: 'symbol', type: 'string' },
          { name: 'treasury', type: 'address' },
          { name: 'minPurchase30Only', type: 'bool' },
          { name: 'refundsEnabled', type: 'bool' },
          { name: 'refundPriceUsdc', type: 'uint64' },
        ],
      },
    ],
    outputs: [
      { name: 'subToken', type: 'address' },
      { name: 'poolId', type: 'bytes32' },
    ],
  },
  // Optional event - add to your contract for easier UI parsing
  {
    type: 'event',
    name: 'ProductCreated',
    inputs: [
      { indexed: true, name: 'creator', type: 'address' },
      { indexed: false, name: 'subToken', type: 'address' },
      { indexed: false, name: 'poolId', type: 'bytes32' },
      { indexed: false, name: 'name', type: 'string' },
      { indexed: false, name: 'symbol', type: 'string' },
    ],
    anonymous: false,
  },
] as const

export const subHookAbi = [
  {
    type: 'function',
    name: 'configureProduct',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'poolId', type: 'bytes32' },
      {
        name: 'cfg',
        type: 'tuple',
        components: [
          { name: 'creator', type: 'address' },
          { name: 'treasury', type: 'address' },
          { name: 'subToken', type: 'address' },
          { name: 'usdcToken', type: 'address' },
          { name: 'minPurchase30Only', type: 'bool' },
          { name: 'refundsEnabled', type: 'bool' },
          { name: 'refundPriceUsdc', type: 'uint64' },
          { name: 'couponRegistry', type: 'address' },
        ],
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getProduct',
    stateMutability: 'view',
    inputs: [{ name: 'poolId', type: 'bytes32' }],
    outputs: [
      {
        name: 'cfg',
        type: 'tuple',
        components: [
          { name: 'creator', type: 'address' },
          { name: 'treasury', type: 'address' },
          { name: 'subToken', type: 'address' },
          { name: 'usdcToken', type: 'address' },
          { name: 'minPurchase30Only', type: 'bool' },
          { name: 'refundsEnabled', type: 'bool' },
          { name: 'refundPriceUsdc', type: 'uint64' },
          { name: 'couponRegistry', type: 'address' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'depositRefundReserve',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'poolId', type: 'bytes32' }, { name: 'usdcAmount', type: 'uint64' }],
    outputs: [],
  },
] as const
