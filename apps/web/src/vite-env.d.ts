/// <reference types="vite/client" />

// Type declaration for ethereum-identity-kit CSS import
declare module 'ethereum-identity-kit/css'

interface ImportMetaEnv {
  readonly VITE_WALLET_CONNECT_PROJECT_ID: string
  readonly VITE_ARC_TESTNET_RPC_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
