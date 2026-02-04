/// <reference types="vite/client" />

// Type declaration for ethereum-identity-kit CSS import
declare module 'ethereum-identity-kit/css'

interface ImportMetaEnv {
  readonly VITE_WALLET_CONNECT_PROJECT_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
