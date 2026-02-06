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
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 fade-up stagger-1">
        <h1 className="text-xl font-bold tracking-tight">
          $<span className="text-primary">BEST</span> Faucet
        </h1>
        <Badge variant="flux" size="sm">ERC-20</Badge>
      </div>

      <Card className="card-glow py-0 fade-up stagger-2">
        <CardHeader className="text-center">
          <div className="mb-4 flex flex-col items-center gap-2">
            <span className="font-mono text-5xl font-bold text-primary" style={{ textShadow: "0 0 20px var(--color-glow)" }}>
              {FAUCET_AMOUNT}
            </span>
            <span className="font-mono text-lg text-muted-foreground">$BEST</span>
          </div>
          <CardDescription>
            Each address can claim once. Connect a wallet to get started.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {!isContractConfigured && (
            <div className="rounded-lg border-l-4 border-l-warning bg-warning-dim p-4 text-sm text-foreground">
              <strong>Note:</strong> Token contract not yet deployed. Set{" "}
              <code className="rounded bg-warning/10 px-1 font-mono">VITE_BEST_TOKEN_ADDRESS</code>.
            </div>
          )}

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
            <>
              {hasClaimed && claimState !== "success" && (
                <div className="space-y-4 py-6 text-center fade-up">
                  <div className="inline-flex size-16 items-center justify-center rounded-full bg-success/10">
                    <CheckCircle2Icon className="size-8 text-success" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Already Claimed</h3>
                    <p className="text-muted-foreground">You have already claimed your tokens.</p>
                  </div>
                  <div className="flex justify-center">
                    <StatPill label="Balance" value={`${formatBalance(balance)} $BEST`} color="var(--color-primary)" />
                  </div>
                </div>
              )}

              {hasClaimed === false &&
                !isLoadingHasClaimed &&
                claimState === "idle" && (
                  <div className="space-y-4 py-6 text-center">
                    <p className="text-muted-foreground">
                      You are eligible to claim <strong>{FAUCET_AMOUNT} $BEST</strong>{" "}
                      tokens.
                    </p>
                    <Button type="button" size="lg" onClick={handleClaim} className="w-full hover:shadow-[0_0_30px_var(--color-glow)]">
                      <DropletsIcon className="size-5" />
                      Claim Tokens
                    </Button>
                  </div>
                )}

              {claimState === "claiming" && (
                <TransactionStatus
                  state={isConfirming ? "pending" : "loading"}
                  hash={txHash}
                  chainId={chainId}
                  title={
                    isConfirming
                      ? "Confirming transaction…"
                      : "Awaiting wallet signature…"
                  }
                  description={
                    isConfirming
                      ? "Waiting for blockchain confirmation."
                      : "Confirm the transaction in your wallet."
                  }
                />
              )}

              {claimState === "success" && (
                <div className="space-y-4 py-6 text-center">
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
                  <Badge variant="ens" size="lg">
                    Balance: {formatBalance(balance)} $BEST
                  </Badge>

                  {!addedToWallet ? (
                    <Button type="button" variant="outline" onClick={handleAddToWallet}>
                      <PlusIcon className="size-4" />
                      Add $BEST to Wallet
                    </Button>
                  ) : (
                    <p className="flex items-center justify-center gap-1 text-sm text-success">
                      <CheckCircle2Icon className="size-4" />
                      Token added to wallet
                    </p>
                  )}
                </div>
              )}

              {claimState === "error" && (
                <div className="space-y-4 py-6 text-center">
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
                  <Button type="button" onClick={handleReset} variant="outline">
                    Try Again
                  </Button>
                </div>
              )}
            </>
          )}

          {isConnected && !isContractConfigured && (
            <div className="py-6 text-center">
              <p className="text-muted-foreground">
                Faucet is not available on this network yet.
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex-col gap-4 border-t py-4 text-center text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Badge variant="outline">Chain ID: {chainId}</Badge>
            {address && (
              <Badge variant="outline" className="font-mono">
                {address.slice(0, 6)}...{address.slice(-4)}
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
        </CardFooter>
      </Card>

      <Card className="card-glow py-0 fade-up stagger-3">
        <CardHeader>
          <CardTitle className="text-lg">About $BEST</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            <strong className="text-foreground">$BEST</strong> (Best Token) is the utility token for Gater Robot,
            used for token-gating Telegram groups and premium features.
          </p>
          <div className="space-y-2 rounded-lg border border-border bg-surface-alt p-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Faucet amount</span>
              <span className="font-mono text-foreground">{FAUCET_AMOUNT} tokens</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Standard</span>
              <span className="font-mono text-foreground">ERC-20</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Network</span>
              <span className="font-mono text-foreground">Base / Base Sepolia</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
