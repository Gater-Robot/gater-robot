import { Buffer } from 'buffer'

// Some web3 dependencies still rely on Node globals like `Buffer`.
// Vite doesn't polyfill these automatically, so we provide a minimal shim.
if (typeof window !== 'undefined') {
  ;(globalThis as any).Buffer = Buffer
}

