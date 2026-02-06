import { useCallback, useEffect, useState } from "react"
import { useMutation } from "convex/react"
import { createSiweMessage } from "viem/siwe"
import { useAccount, useChainId, useSignMessage } from "wagmi"

import { api } from "@/convex/api"
import { useTelegram } from "@/contexts/TelegramContext"

export type SIWEStatus =
  | "idle"
  | "generating_nonce"
  | "awaiting_signature"
  | "verifying"
  | "success"
  | "error"

export function useSIWE() {
  const [status, setStatus] = useState<SIWEStatus>("idle")
  const [error, setError] = useState<string | null>(null)

  const { address, isConnected } = useAccount()

  // Reset SIWE state when wallet disconnects mid-flow
  useEffect(() => {
    if (!isConnected && status !== "idle" && status !== "success") {
      setStatus("idle")
      setError(null)
    }
  }, [isConnected, status])

  const chainId = useChainId()
  const { signMessageAsync } = useSignMessage()

  const { getInitData } = useTelegram()

  const generateNonce = useMutation(api.siwe.generateNonce)
  const verifySignature = useMutation(api.siwe.verifySignature)

  const reset = useCallback(() => {
    setStatus("idle")
    setError(null)
  }, [])

  const verify = useCallback(async () => {
    setError(null)

    if (!address) {
      setError("No wallet connected")
      setStatus("error")
      return
    }

    const initDataRaw = getInitData()
    if (!initDataRaw) {
      setError("Not authenticated with Telegram")
      setStatus("error")
      return
    }

    try {
      setStatus("generating_nonce")
      const nonceResult = await generateNonce({ address, initDataRaw })

      const message = createSiweMessage({
        domain: window.location.host,
        address,
        statement: "Sign in to Gater Robot to verify wallet ownership.",
        uri: window.location.origin,
        version: "1",
        chainId,
        nonce: nonceResult.nonce,
      })

      setStatus("awaiting_signature")
      const signature = await signMessageAsync({ message })

      setStatus("verifying")
      const verifyResult = await verifySignature({
        address,
        message,
        signature,
        initDataRaw,
      })

      if (verifyResult.success) {
        setStatus("success")
      } else {
        setError("Verification failed")
        setStatus("error")
      }
    } catch (err) {
      console.error('[gater] SIWE verification failed:', err)
      if (err instanceof Error) {
        if (err.message.toLowerCase().includes("user rejected")) {
          setError("Signature request was cancelled")
        } else {
          setError(err.message)
        }
      } else {
        setError("An unexpected error occurred")
      }
      setStatus("error")
    }
  }, [
    address,
    chainId,
    generateNonce,
    getInitData,
    signMessageAsync,
    verifySignature,
  ])

  return {
    status,
    error,
    verify,
    reset,
    isVerifying:
      status === "generating_nonce" ||
      status === "awaiting_signature" ||
      status === "verifying",
    isSuccess: status === "success",
    isError: status === "error",
  }
}
