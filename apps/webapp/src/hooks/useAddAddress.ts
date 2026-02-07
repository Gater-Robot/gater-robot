import { useCallback, useEffect, useRef, useState } from "react"
import { useMutation } from "convex/react"

import { api } from "@/convex/api"
import { useTelegram } from "@/contexts/TelegramContext"
import { useAddresses } from "@/hooks/useAddresses"
import { isValidEvmAddress } from "@/lib/utils"

const DEBOUNCE_MS = 300

export interface UseAddAddressReturn {
  input: string
  setInput: (value: string) => void
  validationError: string | null
  isValid: boolean
  isAdding: boolean
  addAddress: () => Promise<boolean>
  reset: () => void
}

export function useAddAddress(): UseAddAddressReturn {
  const { initDataRaw } = useTelegram()
  const { addresses } = useAddresses()
  const addMutation = useMutation(api.ens.addAddress)

  const [input, setInput] = useState("")
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isValid, setIsValid] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inflightRef = useRef(false)

  // Debounced validation
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const trimmed = input.trim()

    if (!trimmed) {
      setValidationError(null)
      setIsValid(false)
      return
    }

    debounceRef.current = setTimeout(() => {
      if (!isValidEvmAddress(trimmed)) {
        setValidationError("Enter a valid Ethereum address (0x...)")
        setIsValid(false)
        return
      }

      // Client-side dedup check
      const normalized = trimmed.toLowerCase()
      const alreadyLinked = addresses.some(
        (a) => a.address.toLowerCase() === normalized
      )
      if (alreadyLinked) {
        setValidationError("This wallet is already linked")
        setIsValid(false)
        return
      }

      setValidationError(null)
      setIsValid(true)
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [input, addresses])

  const addAddress = useCallback(async (): Promise<boolean> => {
    if (!isValid || inflightRef.current || !initDataRaw) return false

    inflightRef.current = true
    setIsAdding(true)
    try {
      await addMutation({ address: input.trim(), initDataRaw })
      setInput("")
      setValidationError(null)
      setIsValid(false)
      return true
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to add address"
      setValidationError(message)
      return false
    } finally {
      inflightRef.current = false
      setIsAdding(false)
    }
  }, [isValid, initDataRaw, addMutation, input])

  const reset = useCallback(() => {
    setInput("")
    setValidationError(null)
    setIsValid(false)
    setIsAdding(false)
  }, [])

  return { input, setInput, validationError, isValid, isAdding, addAddress, reset }
}
