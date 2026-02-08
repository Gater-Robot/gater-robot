import { createConfig, http } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { defineChain } from 'viem'

const chainId = Number(import.meta.env.VITE_CHAIN_ID || 11155111)
const chainName = String(import.meta.env.VITE_CHAIN_NAME || 'Hackathon')
const rpcUrl = String(import.meta.env.VITE_RPC_URL || 'https://rpc.sepolia.org')
const explorerUrl = String(import.meta.env.VITE_EXPLORER_URL || 'https://sepolia.etherscan.io')

export const appChain = defineChain({
  id: chainId,
  name: chainName,
  network: chainName.toLowerCase().replace(/\s+/g, '-'),
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } },
  blockExplorers: { default: { name: 'Explorer', url: explorerUrl } },
})

export const wagmiConfig = createConfig({
  chains: [appChain],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [appChain.id]: http(rpcUrl),
  },
})
