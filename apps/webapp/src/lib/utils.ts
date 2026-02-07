import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function truncateAddress(address: string, prefixLen = 6, suffixLen = 4) {
  if (!address) return ""
  if (address.length <= prefixLen + suffixLen) return address
  return `${address.slice(0, prefixLen)}...${address.slice(-suffixLen)}`
}

const EVM_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/

/**
 * Fast regex check that a string looks like a valid EVM address.
 * Does NOT checksum-validate — use viem's getAddress() for that.
 */
export function isValidEvmAddress(input: string): boolean {
  return EVM_ADDRESS_RE.test(input.trim())
}

export function getHostname(url: string) {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}
