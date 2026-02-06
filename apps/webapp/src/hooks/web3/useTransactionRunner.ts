import * as React from "react"
import type { Hash } from "viem"

import { getParsedError } from "@/lib/web3/getParsedError"
import { getPublicClient } from "@/lib/web3/publicClient"

export type TransactionRunnerState = "idle" | "awaiting_signature" | "pending" | "success" | "error"

export function useTransactionRunner() {
  const [state, setState] = React.useState<TransactionRunnerState>("idle")
  const [hash, setHash] = React.useState<Hash | undefined>()
  const [error, setError] = React.useState<string | undefined>()

  const run = React.useCallback(
    async (args: {
      chainId: number
      send: () => Promise<Hash>
      confirmations?: number
    }) => {
      setError(undefined)
      setHash(undefined)
      setState("awaiting_signature")

      try {
        const txHash = await args.send()
        setHash(txHash)
        setState("pending")

        const client = getPublicClient(args.chainId)
        const receipt = await client.waitForTransactionReceipt({
          hash: txHash,
          confirmations: args.confirmations,
        })

        if (receipt.status === "reverted") {
          throw new Error("Transaction reverted")
        }

        setState("success")
        return { hash: txHash, receipt }
      } catch (e) {
        setState("error")
        setError(getParsedError(e))
        throw e
      }
    },
    [],
  )

  const reset = React.useCallback(() => {
    setState("idle")
    setHash(undefined)
    setError(undefined)
  }, [])

  return { run, reset, state, hash, error }
}

