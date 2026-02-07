import * as React from "react"
import { getExplorerTxUrl } from "@gater/chain-registry"
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  RefreshCwIcon,
  XCircleIcon,
} from "lucide-react"
import {
  useAccount,
  useChainId,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi"

import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/api"

import { useTelegram } from "@/contexts/TelegramContext"
import { TransactionStatus } from "@/components/web3/TransactionStatus"
import { Badge } from "@/components/ui/badge"
import { StatPill } from "@/components/ui/stat-pill"

import {
  BEST_TOKEN_SYMBOL,
  BEST_TOKEN_DECIMALS,
  FAUCET_AMOUNT,
  FAUCET_CHAIN_IDS,
  BEST_TOKEN_ADDRESS,
  BEST_TOKEN_ABI,
  formatBalance,
  truncateAddress,
  type ClaimState,
  type GaslessStatus,
} from "./faucet"

import { FaucetHero } from "./faucet/FaucetHero"
import { ClaimButtons } from "./faucet/ClaimButtons"
import { GaslessClaimStatus } from "./faucet/GaslessClaimStatus"
import { ClaimSuccess, ClaimError } from "./faucet/ClaimResult"
import { AboutSection } from "./faucet/AboutSection"

export function FaucetPage() {
  const { address } = useAccount()
  const chainId = useChainId()
  const { user: telegramUser } = useTelegram()

  const [claimState, setClaimState] = React.useState<ClaimState>("idle")
  const [errorMessage, setErrorMessage] = React.useState<string>("")
  const [addedToWallet, setAddedToWallet] = React.useState(false)

  // Convex mutation for gasless claim
  const claimGasless = useMutation(api.faucetMutations.claimFaucetGasless)

  // Subscribe to claim status from Convex (live updates)
  const gaslessClaim = useQuery(
    api.faucetQueries.getClaimByAddress,
    address ? { recipientAddress: address } : "skip",
  )

  // Derive gasless status directly from Convex subscription
  const gaslessStatus: GaslessStatus = (gaslessClaim?.status as GaslessStatus) ?? "idle"

  const isContractConfigured =
    BEST_TOKEN_ADDRESS !== "0x0000000000000000000000000000000000000000"
  const isChainSupported = FAUCET_CHAIN_IDS.includes(chainId)

  const {
    data: hasClaimed,
    refetch: refetchHasClaimed,
    isLoading: isLoadingHasClaimed,
    error: hasClaimedError,
  } = useReadContract({
    address: BEST_TOKEN_ADDRESS,
    abi: BEST_TOKEN_ABI,
    functionName: "hasClaimed",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isContractConfigured,
    },
  })

  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: BEST_TOKEN_ADDRESS,
    abi: BEST_TOKEN_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isContractConfigured,
    },
  })

  const {
    writeContract,
    data: txHash,
    isPending: isWritePending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract()

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmError,
  } = useWaitForTransactionReceipt({ hash: txHash })

  React.useEffect(() => {
    // Only react to wagmi state when in the manual (gas) claim flow
    if (claimState !== "claiming" && claimState !== "idle") return

    if (isWritePending || isConfirming) {
      setClaimState("claiming")
      return
    }

    if (isConfirmed) {
      setClaimState("success")
      void refetchHasClaimed()
      void refetchBalance()
      return
    }

    if (writeError || confirmError) {
      setClaimState("error")
      setErrorMessage(
        writeError?.message || confirmError?.message || "Transaction failed",
      )
    }
  }, [
    claimState,
    confirmError,
    isConfirmed,
    isConfirming,
    isWritePending,
    refetchBalance,
    refetchHasClaimed,
    writeError,
  ])

  React.useEffect(() => {
    setClaimState("idle")
    setErrorMessage("")
    setAddedToWallet(false)
  }, [address, chainId])

  // Sync gasless claim terminal states to local claimState
  React.useEffect(() => {
    if (!gaslessClaim) return

    const status = gaslessClaim.status as GaslessStatus

    if (status === "confirmed") {
      setClaimState("success")
      void refetchHasClaimed()
      void refetchBalance()
    } else if (status === "failed") {
      setClaimState("error")
      setErrorMessage(gaslessClaim.errorMessage ?? "Gasless claim failed")
    }
  }, [gaslessClaim, refetchHasClaimed, refetchBalance])

  const handleClaim = () => {
    setErrorMessage("")
    setClaimState("claiming")

    try {
      writeContract({
        address: BEST_TOKEN_ADDRESS,
        abi: BEST_TOKEN_ABI,
        functionName: "faucet",
      })
    } catch (err) {
      setClaimState("error")
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to initiate transaction",
      )
    }
  }

  const handleGaslessClaim = async () => {
    if (!address) return
    setErrorMessage("")
    setClaimState("gasless-pending")

    try {
      await claimGasless({
        telegramUserId: telegramUser?.id?.toString() ?? "anonymous",
        recipientAddress: address,
        chainId,
      })
    } catch (err) {
      setClaimState("error")
      setErrorMessage(
        err instanceof Error ? err.message : "Gasless claim failed",
      )
    }
  }

  const handleGaslessRetry = () => {
    setClaimState("idle")
    setErrorMessage("")
  }

  const handleReset = () => {
    setClaimState("idle")
    setErrorMessage("")
    resetWrite()
  }

  const handleAddToWallet = async () => {
    if (!window.ethereum) {
      setErrorMessage("No wallet detected")
      return
    }

    try {
      await (window.ethereum as { request: (args: any) => Promise<any> }).request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: BEST_TOKEN_ADDRESS,
            symbol: BEST_TOKEN_SYMBOL,
            decimals: BEST_TOKEN_DECIMALS,
          },
        },
      })
      setAddedToWallet(true)
    } catch {
      setErrorMessage("Could not add token to wallet")
    }
  }

  const txUrl =
    txHash && chainId ? getExplorerTxUrl(chainId, txHash) : undefined

  const formattedBalance = React.useMemo(() => formatBalance(balance), [balance])

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3 fade-up stagger-1">
        <h1 className="text-xl font-bold tracking-tight">
          <span className="text-primary">$BEST</span> Faucet
        </h1>
        <Badge variant="flux" size="sm">ERC-20</Badge>
      </div>

      {/* Hero + claim section */}
      <div className="rounded-xl border border-border bg-[var(--color-surface)] p-6 card-glow fade-up stagger-2">
        {/* Hero amount display */}
        <FaucetHero />

        {/* Contract not configured warning */}
        {!isContractConfigured && (
          <div className="rounded-lg border-l-4 border-l-warning bg-warning-dim p-4 text-sm text-foreground">
            <strong>Note:</strong> Token contract not yet deployed. Set{" "}
            <code className="rounded bg-warning/10 px-1 font-mono">VITE_BEST_TOKEN_ADDRESS</code>.
          </div>
        )}

        {/* Connect wallet prompt */}
        {!address && (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">
              Connect your wallet using the button above to claim tokens.
            </p>
          </div>
        )}

        {address && isContractConfigured && (
          <div className="space-y-6">
            {/* Wrong chain - show switch network prompt */}
            {!isChainSupported && (
              <div className="space-y-4 py-6 text-center fade-up">
                <div className="inline-flex size-16 items-center justify-center rounded-full bg-warning/10">
                  <AlertTriangleIcon className="size-8 text-warning" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Wrong Network</h3>
                  <p className="text-muted-foreground">
                    Switch to Base or Base Sepolia to claim tokens.
                  </p>
                </div>
                <div className="flex justify-center">
                  {/* @ts-ignore - web component */}
                  <appkit-network-button />
                </div>
              </div>
            )}

            {/* Loading state */}
            {isChainSupported && isLoadingHasClaimed && (
              <div className="py-8 text-center fade-up">
                <div className="inline-flex size-12 items-center justify-center">
                  <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Checking claim status...
                </p>
              </div>
            )}

            {/* Query error state */}
            {isChainSupported && !isLoadingHasClaimed && hasClaimedError && (
              <div className="space-y-4 py-6 text-center fade-up">
                <div className="inline-flex size-16 items-center justify-center rounded-full bg-destructive/10">
                  <XCircleIcon className="size-8 text-destructive" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-destructive">
                    Connection Error
                  </h3>
                  <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                    Could not connect to the contract. Check your network connection.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void refetchHasClaimed()}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary/10 text-primary px-4 py-2 text-xs font-mono hover:bg-primary/20 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <RefreshCwIcon className="size-3.5" />
                  Try Again
                </button>
              </div>
            )}

            {/* Already claimed state */}
            {isChainSupported && hasClaimed && claimState !== "success" && (
              <div className="space-y-4 py-6 text-center fade-up">
                <div className="inline-flex size-16 items-center justify-center rounded-full bg-success/10">
                  <CheckCircle2Icon className="size-8 text-success" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Already Claimed</h3>
                  <p className="text-muted-foreground">You have already claimed your tokens.</p>
                </div>
                <div className="grid grid-cols-2 gap-3 fade-up stagger-3">
                  <StatPill label="Balance" value={`${formattedBalance} $BEST`} color="text-primary" />
                  <StatPill label="Status" value="Claimed" color="text-success" />
                </div>
              </div>
            )}

            {/* Eligible to claim state */}
            {isChainSupported &&
              hasClaimed === false &&
              !isLoadingHasClaimed &&
              (claimState === "idle" || claimState === "gasless-pending") && (
                <div className="space-y-4 text-center fade-up stagger-3">
                  {claimState === "idle" && gaslessStatus === "idle" && (
                    <ClaimButtons
                      onGaslessClaim={handleGaslessClaim}
                      onManualClaim={handleClaim}
                    />
                  )}
                  {/* Gasless claim in progress */}
                  {gaslessStatus !== "idle" && gaslessStatus !== "confirmed" && gaslessStatus !== "failed" && (
                    <GaslessClaimStatus
                      status={gaslessStatus}
                      txHash={gaslessClaim?.txHash}
                      chainId={chainId}
                      onRetry={handleGaslessRetry}
                    />
                  )}
                  {/* Gasless claim failed — show retry + manual fallback */}
                  {gaslessStatus === "failed" && (
                    <GaslessClaimStatus
                      status={gaslessStatus}
                      txHash={gaslessClaim?.txHash}
                      chainId={chainId}
                      errorMessage={gaslessClaim?.errorMessage}
                      onRetry={handleGaslessRetry}
                    />
                  )}
                </div>
              )}

            {/* Claiming / transaction in progress */}
            {isChainSupported && claimState === "claiming" && (
              <div className="fade-up">
                <TransactionStatus
                  state={isConfirming ? "pending" : "loading"}
                  hash={txHash}
                  chainId={chainId}
                  title={
                    isConfirming
                      ? "Confirming transaction..."
                      : "Awaiting wallet signature..."
                  }
                  description={
                    isConfirming
                      ? "Waiting for blockchain confirmation."
                      : "Confirm the transaction in your wallet."
                  }
                />
              </div>
            )}

            {/* Success state */}
            {isChainSupported && claimState === "success" && (
              <ClaimSuccess
                formattedBalance={formattedBalance}
                addedToWallet={addedToWallet}
                onAddToWallet={handleAddToWallet}
              />
            )}

            {/* Claim error state */}
            {isChainSupported && claimState === "error" && (
              <ClaimError
                errorMessage={errorMessage}
                onReset={handleReset}
              />
            )}

            {/* Fallback: unknown state - couldn't verify claim status */}
            {isChainSupported &&
              !isLoadingHasClaimed &&
              !hasClaimedError &&
              hasClaimed === undefined &&
              claimState === "idle" && (
                <div className="space-y-4 py-6 text-center fade-up">
                  <div className="inline-flex size-16 items-center justify-center rounded-full bg-warning/10">
                    <AlertTriangleIcon className="size-8 text-warning" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Unable to Verify</h3>
                    <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                      Could not check your claim status. Try refreshing.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void refetchHasClaimed()}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary/10 text-primary px-4 py-2 text-xs font-mono hover:bg-primary/20 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <RefreshCwIcon className="size-3.5" />
                    Refresh
                  </button>
                </div>
              )}
          </div>
        )}

        {address && !isContractConfigured && (
          <div className="py-6 text-center">
            <p className="text-muted-foreground">
              Faucet is not available on this network yet.
            </p>
          </div>
        )}

        {/* Footer: chain info + explorer link */}
        <div className="mt-6 flex flex-col items-center gap-3 border-t border-border/30 pt-4 text-center text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Badge variant="flux" size="sm">Chain {chainId}</Badge>
            {address && (
              <Badge variant="flux" size="sm">
                {truncateAddress(address)}
              </Badge>
            )}
          </div>

          {txHash && txUrl && (
            <a
              href={txUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              View on Explorer
              <ExternalLinkIcon className="size-3" />
            </a>
          )}
        </div>
      </div>

      {/* About section */}
      <AboutSection isContractConfigured={isContractConfigured} />
    </div>
  )
}
