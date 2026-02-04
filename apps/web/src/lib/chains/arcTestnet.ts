/**
 * Arc Testnet Chain Definition
 *
 * Arc is a blockchain that uses USDC as its native gas token.
 * The gas token uses 18 decimals internally for gas calculations,
 * while the ERC-20 USDC interface uses 6 decimals.
 */

import { defineChain } from 'viem'

export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: {
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://5042002.rpc.thirdweb.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'ArcScan',
      url: 'https://testnet.arcscan.app',
    },
  },
  testnet: true,
})
