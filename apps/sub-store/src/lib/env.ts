import { isAddress } from 'viem'

export function mustGetAddress(key: string): `0x${string}` {
  const v = (import.meta.env as any)[key] as string | undefined
  if (!v || !isAddress(v)) throw new Error(`Missing/invalid env ${key}: ${v}`)
  return v
}

export function getOptionalAddress(key: string): `0x${string}` | undefined {
  const v = (import.meta.env as any)[key] as string | undefined
  if (!v) return undefined
  if (!isAddress(v)) return undefined
  return v
}

export function getExplorerTxUrl(txHash: string): string | undefined {
  const base = (import.meta.env as any).VITE_EXPLORER_URL as string | undefined
  if (!base) return undefined
  return `${base.replace(/\/$/, '')}/tx/${txHash}`
}

export function getExplorerAddressUrl(addr: string): string | undefined {
  const base = (import.meta.env as any).VITE_EXPLORER_URL as string | undefined
  if (!base) return undefined
  return `${base.replace(/\/$/, '')}/address/${addr}`
}
