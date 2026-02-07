import { useEffect, useState, useMemo } from "react"
import { isAddress, getAddress } from "viem"
import type { UserAddress } from "./useAddresses"

export function useWalletValidation(
  value: string,
  existingAddresses: UserAddress[],
) {
  const [debouncedValue, setDebouncedValue] = useState("")

  // Debounce input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value.trim())
    }, 300)
    return () => clearTimeout(timer)
  }, [value])

  // Compute isValidating based on whether input differs from debounced value
  const isValidating = value.trim() !== debouncedValue

  // Validate debounced value using useMemo to avoid cascading setState
  const result = useMemo(() => {
    if (!debouncedValue) {
      return { isValid: false, error: null, isDuplicate: false }
    }

    // Validate format
    if (!isAddress(debouncedValue)) {
      return {
        isValid: false,
        error: "Invalid Ethereum address",
        isDuplicate: false,
      }
    }

    // Check duplicates
    const normalized = getAddress(debouncedValue)
    const isDuplicate = existingAddresses.some(
      (a) => getAddress(a.address) === normalized,
    )

    if (isDuplicate) {
      return {
        isValid: false,
        error: "Wallet already linked",
        isDuplicate: true,
      }
    }

    return {
      isValid: true,
      error: null,
      isDuplicate: false,
    }
  }, [debouncedValue, existingAddresses])

  return { ...result, isValidating }
}
