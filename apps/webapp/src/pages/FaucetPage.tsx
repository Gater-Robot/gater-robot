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

import { GoldMedalIcon } from "@/components/icons/GoldMedalIcon"
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
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">$BEST Faucet</h1>
        <p className="text-sm text-muted-foreground">Claim your free tokens.</p>
      </div>

      <Card className="py-0">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <GoldMedalIcon size={80} />
          </div>
          <CardTitle className="text-2xl">Claim {FAUCET_AMOUNT} $BEST</CardTitle>
          <CardDescription>
            Each address can claim once. Connect a wallet to get started.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {!isContractConfigured && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-300">
              <strong>Note:</strong> Token contract not yet deployed. Set{" "}
              <code className="rounded bg-yellow-100 px-1 dark:bg-yellow-900">
                VITE_BEST_TOKEN_ADDRESS
              </code>
              .
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
                <div className="space-y-4 py-6 text-center">
                  <div className="inline-flex size-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                    <CheckCircle2Icon className="size-8 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Already Claimed</h3>
                    <p className="text-muted-foreground">
                      You have already claimed your tokens.
                    </p>
                  </div>
                  <Badge variant="outline" size="lg">
                    Balance: {formatBalance(balance)} $BEST
                  </Badge>
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
                    <Button type="button" size="lg" onClick={handleClaim} className="w-full sm:w-auto">
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
                  <div className="inline-flex size-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                    <CheckCircle2Icon className="size-8 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">
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
                    <p className="flex items-center justify-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2Icon className="size-4" />
                      Token added to wallet
                    </p>
                  )}
                </div>
              )}

              {claimState === "error" && (
                <div className="space-y-4 py-6 text-center">
                  <div className="inline-flex size-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                    <XCircleIcon className="size-8 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">
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

      <Card className="py-0">
        <CardHeader>
          <CardTitle className="text-lg">About $BEST</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>$BEST</strong> (Best Token) is the utility token for Gater Robot,
            used for token-gating Telegram groups and premium features.
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>Faucet amount: {FAUCET_AMOUNT} tokens per address</li>
            <li>Token standard: ERC-20</li>
            <li>Network: Base / Base Sepolia</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
