import * as React from "react"
import { getExplorerTxUrl } from "@gater/chain-registry"
import {
  CheckCircle2Icon,
  DropletsIcon,
  ExternalLinkIcon,
  PlusIcon,
  XCircleIcon,
} from "lucide-react"
import { formatUnits, type Address } from "viem"
import {
  useAccount,
  useChainId,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi"

import { ConnectWallet } from "@/components/wallet/ConnectWallet"
import { TransactionStatus } from "@/components/web3/TransactionStatus"
import { Badge } from "@/components/ui/badge"
import { SectionHeader } from "@/components/ui/section-header"
import { StatPill } from "@/components/ui/stat-pill"

const BEST_TOKEN_SYMBOL = "BEST"
const BEST_TOKEN_DECIMALS = 18
const FAUCET_AMOUNT = "2026"

const BEST_TOKEN_ADDRESS = (import.meta.env.VITE_BEST_TOKEN_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as Address

const BEST_TOKEN_ABI = [
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

type ClaimState = "idle" | "claiming" | "success" | "error"

function formatBalance(value: bigint | undefined): string {
  if (!value) return "0"
  return parseFloat(formatUnits(value, BEST_TOKEN_DECIMALS)).toLocaleString(
    undefined,
    { maximumFractionDigits: 2 },
  )
}

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export function FaucetPage() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()

  const [claimState, setClaimState] = React.useState<ClaimState>("idle")
  const [errorMessage, setErrorMessage] = React.useState<string>("")
  const [addedToWallet, setAddedToWallet] = React.useState(false)

  const isContractConfigured =
    BEST_TOKEN_ADDRESS !== "0x0000000000000000000000000000000000000000"

  const {
    data: hasClaimed,
    refetch: refetchHasClaimed,
    isLoading: isLoadingHasClaimed,
  } = useReadContract({
    address: BEST_TOKEN_ADDRESS,
    abi: BEST_TOKEN_ABI,
    functionName: "hasClaimed",
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address && isContractConfigured,
    },
  })

  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: BEST_TOKEN_ADDRESS,
    abi: BEST_TOKEN_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address && isContractConfigured,
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
      // best-effort
    }
  }

  const txUrl =
    txHash && chainId ? getExplorerTxUrl(chainId, txHash) : undefined

  const formattedBalance = formatBalance(balance)

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
        <div className="text-center py-6">
          <span className="font-mono text-5xl font-bold text-primary drop-shadow-[0_0_12px_var(--color-glow)]">
            {FAUCET_AMOUNT}
          </span>
          <div className="font-mono text-lg text-muted-foreground mt-1">$BEST</div>
          <p className="text-sm text-muted-foreground mt-2">
            Each address can claim once. Connect a wallet to get started.
          </p>
        </div>

        {/* Contract not configured warning */}
        {!isContractConfigured && (
          <div className="rounded-lg border-l-4 border-l-warning bg-warning-dim p-4 text-sm text-foreground">
            <strong>Note:</strong> Token contract not yet deployed. Set{" "}
            <code className="rounded bg-warning/10 px-1 font-mono">VITE_BEST_TOKEN_ADDRESS</code>.
          </div>
        )}

        {/* Connect wallet prompt */}
        {!isConnected && (
          <div className="py-8 text-center">
            <p className="mb-4 text-muted-foreground">
              Connect your wallet to claim tokens.
            </p>
            <div className="flex justify-center">
              <ConnectWallet />
            </div>
          </div>
        )}

        {isConnected && isContractConfigured && (
          <div className="space-y-6">
            {/* Already claimed state */}
            {hasClaimed && claimState !== "success" && (
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
            {hasClaimed === false &&
              !isLoadingHasClaimed &&
              claimState === "idle" && (
                <div className="space-y-4 text-center fade-up stagger-3">
                  <p className="text-muted-foreground">
                    You are eligible to claim <strong>{FAUCET_AMOUNT} $BEST</strong>{" "}
                    tokens.
                  </p>
                  <button
                    type="button"
                    onClick={handleClaim}
                    className="w-full rounded-xl bg-primary text-primary-foreground px-6 py-4 font-sans text-base font-semibold hover:shadow-[0_0_30px_var(--color-glow)] active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <span className="inline-flex items-center gap-2">
                      <DropletsIcon className="size-5" />
                      Claim Tokens
                    </span>
                  </button>
                </div>
              )}

            {/* Claiming / transaction in progress */}
            {claimState === "claiming" && (
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
            {claimState === "success" && (
              <div className="space-y-4 py-6 text-center fade-up">
                <div className="inline-flex size-16 items-center justify-center rounded-full bg-success/10">
                  <CheckCircle2Icon className="size-8 text-success" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-success">
                    Tokens Claimed!
                  </h3>
                  <p className="text-muted-foreground">
                    You received {FAUCET_AMOUNT} $BEST tokens.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 fade-up stagger-3">
                  <StatPill label="Balance" value={`${formattedBalance} $BEST`} color="text-primary" />
                  <StatPill label="Status" value="Claimed" color="text-success" />
                </div>

                {!addedToWallet ? (
                  <button
                    type="button"
                    onClick={handleAddToWallet}
                    className="rounded-lg bg-primary/10 text-primary px-4 py-2 text-xs font-mono hover:bg-primary/20 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <PlusIcon className="size-3.5" />
                      Add $BEST to Wallet
                    </span>
                  </button>
                ) : (
                  <p className="flex items-center justify-center gap-1 text-sm text-success">
                    <CheckCircle2Icon className="size-4" />
                    Token added to wallet
                  </p>
                )}
              </div>
            )}

            {/* Error state */}
            {claimState === "error" && (
              <div className="space-y-4 py-6 text-center fade-up">
                <div className="inline-flex size-16 items-center justify-center rounded-full bg-destructive/10">
                  <XCircleIcon className="size-8 text-destructive" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-destructive">
                    Claim Failed
                  </h3>
                  <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                    {errorMessage || "Something went wrong. Please try again."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-lg bg-primary/10 text-primary px-4 py-2 text-xs font-mono hover:bg-primary/20 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        )}

        {isConnected && !isContractConfigured && (
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
      <div className="space-y-3 fade-up stagger-4">
        <SectionHeader>About $BEST</SectionHeader>

        <div className="rounded-xl border border-border bg-[var(--color-surface-alt)] p-4">
          <p className="text-sm text-muted-foreground mb-4">
            <strong className="text-foreground">$BEST</strong> (Best Token) is the utility token for Gater Robot,
            used for token-gating Telegram groups and premium features.
          </p>

          <div className="space-y-0">
            <div className="flex justify-between py-2 border-b border-border/30">
              <span className="text-sm text-muted-foreground">Faucet amount</span>
              <span className="font-mono text-sm text-foreground">{FAUCET_AMOUNT} tokens</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/30">
              <span className="text-sm text-muted-foreground">Standard</span>
              <span className="font-mono text-sm text-foreground">ERC-20</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/30">
              <span className="text-sm text-muted-foreground">Network</span>
              <span className="font-mono text-sm text-foreground">Base / Base Sepolia</span>
            </div>
            <div className="flex justify-between py-2 last:border-0">
              <span className="text-sm text-muted-foreground">Contract</span>
              <span className="font-mono text-sm text-foreground">
                {isContractConfigured ? truncateAddress(BEST_TOKEN_ADDRESS) : "Not deployed"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
