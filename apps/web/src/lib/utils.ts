import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function truncateAddress(address: string): string {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function formatAddress(address: string): string {
  return address.toLowerCase()
}

/**
 * Safely extract hostname from a URL string
 * Returns the original string if URL parsing fails
 */
export function getHostname(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}
