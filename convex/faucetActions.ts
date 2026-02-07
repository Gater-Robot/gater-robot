"use node"

import { internalAction } from "./_generated/server"
import { internal } from "./_generated/api"
import { v } from "convex/values"
import { type Hex } from "viem"

import { getChainClient } from "./lib/balance"
import { getSponsorWalletClient } from "./lib/sponsor"
import { isRetryableError, FAUCET_RETRY_CONFIG } from "./lib/faucetUtils.js"

const FAUCET_FOR_ABI = [
  {
    type: "function" as const,
    name: "faucetFor",
    inputs: [{ name: "beneficiary", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable" as const,
  },
  {
    type: "function" as const,
    name: "hasClaimed",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view" as const,
  },
] as const

function getFaucetContractAddress(): Hex {
  const addr = process.env.FAUCET_CONTRACT_ADDRESS
  if (!addr) throw new Error("FAUCET_CONTRACT_ADDRESS is not configured")
  return addr as Hex
}

const { MAX_RETRIES, RETRY_BASE_MS } = FAUCET_RETRY_CONFIG

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Process a gasless faucet claim.
 *
 * This internal action is scheduled by the claimFaucetGasless mutation.
 * It sends the faucetFor() transaction from the sponsor wallet, waits for
 * confirmation, and updates the claim status at each step.
 */
export const processClaim = internalAction({
  args: {
    claimId: v.id("faucetClaims"),
  },
  handler: async (ctx, args) => {
    // Load the claim
    const claim = await ctx.runQuery(internal.faucetQueries.getClaimById, {
      claimId: args.claimId,
    })
    if (!claim) {
      console.error(`[faucet] Claim ${args.claimId} not found`)
      return
    }
    if (claim.status !== "pending") {
      console.warn(`[faucet] Claim ${args.claimId} is ${claim.status}, skipping`)
      return
    }

    const contractAddress = getFaucetContractAddress()
    const publicClient = getChainClient(claim.chainId)

    // Mark as submitting
    await ctx.runMutation(internal.faucetMutations.updateClaimStatus, {
      claimId: args.claimId,
      status: "submitting",
    })

    // Check on-chain if already claimed (defensive)
    try {
      const alreadyClaimed = await publicClient.readContract({
        address: contractAddress,
        abi: FAUCET_FOR_ABI,
        functionName: "hasClaimed",
        args: [claim.recipientAddress as `0x${string}`],
      })
      if (alreadyClaimed) {
        await ctx.runMutation(internal.faucetMutations.updateClaimStatus, {
          claimId: args.claimId,
          status: "failed",
          errorMessage: "Address has already claimed on-chain",
        })
        return
      }
    } catch (err) {
      // If we can't verify on-chain, fail the claim to avoid wasting gas
      const message = err instanceof Error ? err.message : "RPC error"
      console.error(`[faucet] Could not check hasClaimed on-chain, failing claim:`, message)
      await ctx.runMutation(internal.faucetMutations.updateClaimStatus, {
        claimId: args.claimId,
        status: "failed",
        errorMessage: `Could not verify eligibility on-chain: ${message}`,
      })
      return
    }

    // Send the transaction with retry logic
    let txHash: Hex | undefined
    let lastError: Error | undefined

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const walletClient = getSponsorWalletClient(claim.chainId)
        txHash = await walletClient.writeContract({
          address: contractAddress,
          abi: FAUCET_FOR_ABI,
          functionName: "faucetFor",
          args: [claim.recipientAddress as `0x${string}`],
        })
        break // success
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))

        // Don't retry on deterministic failures
        if (!isRetryableError(lastError.message)) {
          break
        }

        // Retry on transient failures (RPC timeout, nonce issues)
        if (attempt < MAX_RETRIES - 1) {
          const delay = RETRY_BASE_MS * Math.pow(2, attempt)
          console.warn(`[faucet] Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, lastError.message)
          await sleep(delay)
        }
      }
    }

    if (!txHash) {
      await ctx.runMutation(internal.faucetMutations.updateClaimStatus, {
        claimId: args.claimId,
        status: "failed",
        errorMessage: lastError?.message ?? "Failed to send transaction",
      })
      return
    }

    // Transaction submitted — record hash
    await ctx.runMutation(internal.faucetMutations.updateClaimStatus, {
      claimId: args.claimId,
      status: "submitted",
      txHash,
    })

    // Wait for confirmation
    try {
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        timeout: 60_000,
      })

      if (receipt.status === "success") {
        await ctx.runMutation(internal.faucetMutations.updateClaimStatus, {
          claimId: args.claimId,
          status: "confirmed",
          txHash,
        })
        console.log(`[faucet] Claim ${args.claimId} confirmed: ${txHash}`)
      } else {
        await ctx.runMutation(internal.faucetMutations.updateClaimStatus, {
          claimId: args.claimId,
          status: "failed",
          txHash,
          errorMessage: "Transaction reverted on-chain",
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Receipt timeout"
      console.error(`[faucet] Failed to get receipt for ${txHash}:`, message)
      // Leave as "submitted" — the sweeper cron will reconcile
      // Don't mark failed since the tx might still confirm
    }
  },
})

/**
 * Sweep stale faucet claims that are stuck in transient states.
 * Called periodically by the cron job.
 */
export const sweepStaleClaims = internalAction({
  args: {},
  handler: async (ctx) => {
    const staleClaims = await ctx.runQuery(
      internal.faucetQueries.getStaleClaims,
      { cutoffMs: 120_000 }
    )

    if (staleClaims.length === 0) return

    console.log(`[faucet-sweeper] Found ${staleClaims.length} stale claim(s)`)

    for (const claim of staleClaims) {
      // For "submitted" claims with a txHash, check on-chain before failing
      if (claim.status === "submitted" && claim.txHash) {
        try {
          const contractAddr = getFaucetContractAddress()
          if (contractAddr) {
            const publicClient = getChainClient(claim.chainId)
            const receipt = await publicClient.getTransactionReceipt({
              hash: claim.txHash as `0x${string}`,
            })
            if (receipt && receipt.status === "success") {
              // Tx actually succeeded — mark confirmed
              await ctx.runMutation(internal.faucetMutations.updateClaimStatus, {
                claimId: claim._id,
                status: "confirmed",
                txHash: claim.txHash,
              })
              console.log(`[faucet-sweeper] Recovered confirmed claim ${claim._id}: ${claim.txHash}`)
              continue
            }
          }
        } catch (err) {
          // Can't verify — fall through to mark failed
          console.warn(`[faucet-sweeper] Could not verify tx ${claim.txHash}:`, err)
        }
      }

      await ctx.runMutation(internal.faucetMutations.markStaleFailed, {
        claimId: claim._id,
        errorMessage: "Claim timed out — please try again",
      })
      console.log(`[faucet-sweeper] Marked stale claim ${claim._id} as failed (was ${claim.status})`)
    }
  },
})
