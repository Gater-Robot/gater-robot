import { useEffect, useRef } from "react"
import { useAccount } from "wagmi"
import { useMutation } from "convex/react"
import { toast } from "sonner"

import { api } from "@/convex/api"
import { useTelegram } from "@/contexts/TelegramContext"
import { useAddresses } from "@/hooks/useAddresses"

export function useAutoAddAddress() {
  const { address, isConnected } = useAccount()
  const { initDataRaw, isInitialized, user } = useTelegram()
  const { addresses, isLoading: addressesLoading } = useAddresses()
  const addAddress = useMutation(api.ens.addAddress)
  const lastAddedRef = useRef<string | null>(null)
  const wasConnectedRef = useRef(false)

  // Clear ref on disconnect so reconnecting the same wallet works
  useEffect(() => {
    if (isConnected) {
      wasConnectedRef.current = true
    } else if (wasConnectedRef.current) {
      wasConnectedRef.current = false
      lastAddedRef.current = null
      toast.info("Wallet disconnected", {
        description: "Your linked addresses are still saved.",
      })
    }
  }, [isConnected])

  useEffect(() => {
    if (!isInitialized || !isConnected || !address || !initDataRaw || !user) return

    // Wait for addresses query to load before checking duplicates
    if (addressesLoading) return

    // Don't re-add if we already added this address in this session
    if (lastAddedRef.current === address) return

    // Don't add if address already exists in the user's address list
    const normalized = address.toLowerCase()
    const alreadyExists = addresses.some(
      (a) => a.address.toLowerCase() === normalized
    )
    if (alreadyExists) return

    lastAddedRef.current = address

    void addAddress({ address, initDataRaw }).catch((err) => {
      // "Address already linked" is expected if it exists — not an error
      if (err?.message?.includes("already linked")) return
      console.error("[gater] Failed to auto-add address:", err)
      lastAddedRef.current = null // Allow retry
    })
  }, [isInitialized, isConnected, address, initDataRaw, user, addressesLoading, addresses, addAddress])
}
