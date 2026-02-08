/// <reference types="vite/client" />

// Type declaration for ethereum-identity-kit CSS import.
declare module 'ethereum-identity-kit/css'

interface ImportMetaEnv {
  readonly VITE_CONVEX_URL?: string
  readonly VITE_WALLET_CONNECT_PROJECT_ID?: string
  readonly VITE_BEST_TOKEN_ADDRESS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// EIP-1193 Provider type for window.ethereum
interface EthereumProvider {
  request: (args: { method: string; params?: unknown }) => Promise<unknown>
  on?: (event: string, handler: (...args: unknown[]) => void) => void
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void
}

declare global {
  interface Window {
    ethereum?: EthereumProvider
  }
}
