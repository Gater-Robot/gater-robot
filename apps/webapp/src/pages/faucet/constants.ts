import { formatUnits, type Address } from "viem"

export const BEST_TOKEN_SYMBOL = "BEST"
export const BEST_TOKEN_DECIMALS = 18
export const FAUCET_AMOUNT = "2026"
export const FAUCET_CHAIN_IDS = [84532, 8453] // Base Sepolia, Base

export const BEST_TOKEN_ADDRESS = (import.meta.env.VITE_BEST_TOKEN_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as Address

export const BEST_TOKEN_ABI = [
  {
    type: "function",
    name: "faucet",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "hasClaimed",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const

export type ClaimState = "idle" | "claiming" | "gasless-pending" | "success" | "error"

export type GaslessStatus = "idle" | "pending" | "submitting" | "submitted" | "confirmed" | "failed"

export function formatBalance(value: bigint | undefined): string {
  if (value === undefined) return "0"
  return parseFloat(formatUnits(value, BEST_TOKEN_DECIMALS)).toLocaleString(
    undefined,
    { maximumFractionDigits: 2 },
  )
}

export function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}
