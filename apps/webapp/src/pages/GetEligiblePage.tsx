import * as React from "react"
import { getChainLabel } from "@gater/chain-registry"
import { Link, useSearchParams } from "react-router-dom"
import {
  AlertCircleIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  CoinsIcon,
  ExternalLinkIcon,
  LinkIcon,
  PartyPopperIcon,
  RefreshCwIcon,
  UserIcon,
  WalletIcon,
} from "lucide-react"

import { LiFiWidgetWrapper, type GateConfig } from "@/components/LiFiWidgetWrapper"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useTelegram } from "@/contexts/TelegramContext"
import { useCheckEligibility } from "@/hooks/useCheckEligibility"

type SwapState = "idle" | "swapping" | "success" | "error"

interface ManualGateParams {
  token: string
  amount: string
  chain: number
  symbol: string
  decimals?: number
}

function parseManualGateParams(searchParams: URLSearchParams): ManualGateParams | null {
  const token = searchParams.get("token")
  const amount = searchParams.get("amount")
  const chainStr = searchParams.get("chain")
  const symbol = searchParams.get("symbol")
  const decimalsStr = searchParams.get("decimals")

  if (!token || !amount || !chainStr || !symbol) return null
  if (!token.startsWith("0x") || token.length !== 42) return null

  const chain = Number.parseInt(chainStr, 10)
  if (Number.isNaN(chain) || chain <= 0) return null

  const decimals = decimalsStr ? Number.parseInt(decimalsStr, 10) : 18

  return {
    token,
    amount,
    chain,
    symbol,
    decimals: Number.isNaN(decimals) ? 18 : decimals,
  }
}

type Id<TableName extends string> = string & { __tableName?: TableName }

export function GetEligiblePage() {
  const { user, isLoading: telegramLoading, isInTelegram } = useTelegram()
  const [searchParams] = useSearchParams()
  const channelIdParam = searchParams.get("channelId")

  const manualGateParams = React.useMemo(
    () => parseManualGateParams(searchParams),
    [searchParams],
  )

  const isManualMode = !channelIdParam && manualGateParams !== null

  const { check, result, isChecking, error, reset } = useCheckEligibility()

  const [swapState, setSwapState] = React.useState<SwapState>("idle")
  const [swapTxHash, setSwapTxHash] = React.useState<string | null>(null)
  const [swapDetails, setSwapDetails] = React.useState<{
    toToken: string
    toAmount: string
  } | null>(null)

  React.useEffect(() => {
    if (channelIdParam && user && !telegramLoading && !result && !isChecking) {
      void check(channelIdParam as Id<"channels">)
    }
  }, [channelIdParam, user, telegramLoading, result, isChecking, check])

  const handleSwapSuccess = React.useCallback(
    (txHash: string, toToken: string, toAmount: string) => {
      setSwapState("success")
      setSwapTxHash(txHash)
      setSwapDetails({ toToken, toAmount })
    },
    [],
  )

  const handleSwapError = React.useCallback((_error: Error) => {
    setSwapState("error")
  }, [])

  const handleSwapStart = React.useCallback(() => {
    setSwapState("swapping")
  }, [])

  const handleRecheck = React.useCallback(async () => {
    if (!channelIdParam) return
    setSwapState("idle")
    reset()
    await check(channelIdParam as Id<"channels">)
  }, [channelIdParam, check, reset])

  const gateConfig = React.useMemo((): GateConfig | undefined => {
    if (isManualMode && manualGateParams) {
      const amountNum = Number.parseFloat(manualGateParams.amount)
      const amountWithBuffer = Number.isNaN(amountNum)
        ? manualGateParams.amount
        : (amountNum * 1.1).toFixed(4)

      return {
        gateName: `${manualGateParams.symbol} Token`,
        tokenAddress: manualGateParams.token,
        chainId: manualGateParams.chain,
        amountNeeded: amountWithBuffer,
        decimals: manualGateParams.decimals || 18,
      }
    }

    if (!result || !result.hasActiveGate || result.isEligible) return undefined

    const balanceBigInt = BigInt(result.balance || "0")
    const thresholdBigInt = BigInt(result.threshold || "0")

    const deficit =
      thresholdBigInt > balanceBigInt ? thresholdBigInt - balanceBigInt : BigInt(0)
    const buffer = deficit / BigInt(10)
    const amountNeededBigInt = deficit + buffer

    const decimals = result.decimals || 18
    const amountNeeded = formatFromWei(amountNeededBigInt.toString(), decimals)

    return {
      gateName: result.channelTitle || "Channel",
      tokenAddress: result.tokenAddress,
      chainId: result.chainId,
      amountNeeded,
      decimals,
    }
  }, [isManualMode, manualGateParams, result])

  if (telegramLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!channelIdParam && !isManualMode) {
    return (
      <Card className="border-destructive py-0">
        <CardContent className="pt-6">
          <div className="py-8 text-center">
            <AlertCircleIcon className="mx-auto mb-4 size-12 text-destructive" />
            <h2 className="mb-2 text-xl font-semibold">Missing Parameters</h2>
            <p className="mb-4 text-muted-foreground">
              No channel or token specified. Please access this page from a channel invite link.
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Channel mode:{" "}
                <code className="rounded bg-muted px-2 py-1">?channelId=xxx</code>
              </p>
              <p>
                Direct mode:{" "}
                <code className="rounded bg-muted px-2 py-1">
                  ?token=0x...&amp;amount=100&amp;chain=8453&amp;symbol=TOKEN
                </code>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isManualMode && manualGateParams) {
    const chainName = getChainLabel(manualGateParams.chain)

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Get Tokens</h1>
          <p className="text-muted-foreground">
            Swap to acquire {manualGateParams.symbol} tokens.
          </p>
        </div>

        <Card className="border-blue-200 bg-blue-50/50 py-0 dark:bg-blue-950/20">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="size-5 text-blue-600" />
                  Direct Swap Mode
                </CardTitle>
                <CardDescription>
                  Pre-configured to swap to {manualGateParams.symbol}.
                </CardDescription>
              </div>
              <Badge variant="secondary">{chainName}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Token</p>
                <p className="font-medium">{manualGateParams.symbol}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Target Amount</p>
                <p className="font-medium">{manualGateParams.amount}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">Contract</p>
                <p className="break-all font-mono text-xs">{manualGateParams.token}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {swapState === "success" && swapDetails && (
          <Card className="border-green-200 bg-green-50/50 py-0 dark:bg-green-950/20">
            <CardContent className="pt-6">
              <div className="py-4 text-center">
                <PartyPopperIcon className="mx-auto mb-4 size-12 text-green-600" />
                <h2 className="mb-2 text-xl font-bold">Swap Successful!</h2>
                <p className="mb-2 text-muted-foreground">
                  You received {swapDetails.toToken} tokens.
                </p>
                {swapTxHash && (
                  <p className="text-xs text-muted-foreground">
                    Tx:{" "}
                    <code className="rounded bg-muted px-2 py-1">
                      {swapTxHash.slice(0, 10)}...{swapTxHash.slice(-8)}
                    </code>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {swapState !== "success" && (
          <Card className="py-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CoinsIcon className="size-5" />
                Swap Tokens
              </CardTitle>
              <CardDescription>
                Swap any token from any chain to {manualGateParams.symbol} on {chainName}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {swapState === "swapping" && (
                <div className="mb-4 flex items-center gap-2 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/30">
                  <RefreshCwIcon className="size-4 animate-spin text-blue-600" />
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Swap in progress…
                  </p>
                </div>
              )}
              <LiFiWidgetWrapper
                gateConfig={gateConfig}
                onSwapSuccess={handleSwapSuccess}
                onSwapError={handleSwapError}
                onSwapStart={handleSwapStart}
              />
            </CardContent>
          </Card>
        )}

        <Card className="bg-muted/50 py-0">
          <CardContent className="pt-6">
            <h3 className="mb-2 font-semibold">How it works</h3>
            <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
              <li>This page was pre-configured to help you acquire {manualGateParams.symbol}.</li>
              <li>Connect your wallet and select a source token to swap from.</li>
              <li>The LiFi widget will find the best route across chains.</li>
              <li>Complete the swap to receive your {manualGateParams.symbol} tokens.</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user) {
    return (
      <Card className="py-0">
        <CardContent className="pt-6">
          <div className="py-8 text-center">
            <CoinsIcon className="mx-auto mb-4 size-12 text-muted-foreground" />
            <h2 className="mb-2 text-xl font-semibold">Authentication Required</h2>
            <p className="text-muted-foreground">
              {isInTelegram
                ? "Unable to load user data from Telegram."
                : "Please open this app in Telegram to check eligibility."}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive py-0">
        <CardContent className="pt-6">
          <div className="py-8 text-center">
            <AlertCircleIcon className="mx-auto mb-4 size-12 text-destructive" />
            <h2 className="mb-2 text-xl font-semibold">Error Checking Eligibility</h2>
            <p className="mb-4 text-muted-foreground">{error.message}</p>
            <Button type="button" onClick={() => check(channelIdParam as Id<"channels">)}>
              <RefreshCwIcon className="size-4" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isChecking || !result) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!result.hasUser) {
    return (
      <Card className="py-0">
        <CardContent className="pt-6">
          <div className="py-8 text-center">
            <UserIcon className="mx-auto mb-4 size-12 text-muted-foreground" />
            <h2 className="mb-2 text-xl font-semibold">Account Setup Required</h2>
            <p className="mb-6 text-muted-foreground">
              Please set up your profile first to check channel eligibility.
            </p>
            <Link to="/user">
              <Button type="button">
                <UserIcon className="size-4" />
                Go to Profile
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!result.hasVerifiedWallet) {
    return (
      <Card className="py-0">
        <CardContent className="pt-6">
          <div className="py-8 text-center">
            <WalletIcon className="mx-auto mb-4 size-12 text-muted-foreground" />
            <h2 className="mb-2 text-xl font-semibold">Wallet Required</h2>
            <p className="mb-4 text-muted-foreground">
              You need to link and verify a wallet to check eligibility for gated channels.
            </p>
            {result.hasActiveGate && (
              <div className="mb-6 inline-block rounded-lg bg-muted p-4 text-sm">
                This channel requires holding{" "}
                <span className="font-semibold">
                  {result.formattedThreshold} {result.tokenSymbol}
                </span>{" "}
                on {result.chainName}.
              </div>
            )}
            <Link to="/user">
              <Button type="button">
                <WalletIcon className="size-4" />
                Link Wallet
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!result.hasActiveGate) {
    return (
      <Card className="border-green-200 bg-green-50/50 py-0 dark:bg-green-950/20">
        <CardContent className="pt-6">
          <div className="py-8 text-center">
            <CheckCircle2Icon className="mx-auto mb-4 size-12 text-green-600" />
            <h2 className="mb-2 text-xl font-semibold">Open Access</h2>
            <p className="text-muted-foreground">
              This channel has no token requirements — you are eligible!
            </p>
            <div className="mt-4">
              <Badge variant="success">No Gate Required</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (swapState === "success" && swapDetails) {
    return (
      <Card className="border-green-200 bg-green-50/50 py-0 dark:bg-green-950/20">
        <CardContent className="pt-6">
          <div className="py-8 text-center">
            <PartyPopperIcon className="mx-auto mb-4 size-16 text-green-600" />
            <h2 className="mb-2 text-2xl font-bold">Swap Successful!</h2>
            <p className="mb-4 text-muted-foreground">
              You received {swapDetails.toToken} tokens.
            </p>
            {swapTxHash && (
              <p className="mb-6 text-xs text-muted-foreground">
                Transaction:{" "}
                <code className="rounded bg-muted px-2 py-1">
                  {swapTxHash.slice(0, 10)}...{swapTxHash.slice(-8)}
                </code>
              </p>
            )}
            <div className="space-y-3">
              <Button type="button" onClick={handleRecheck} size="lg" className="w-full max-w-xs">
                <RefreshCwIcon className={isChecking ? "size-4 animate-spin" : "size-4"} />
                Re-check Eligibility
              </Button>
              <p className="text-sm text-muted-foreground">
                Click above to verify your new balance meets the threshold.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Get Eligible</h1>
          <p className="text-muted-foreground">
            {result.channelTitle || "Channel"} token requirements.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => check(channelIdParam as Id<"channels">)}
          disabled={isChecking}
        >
          <RefreshCwIcon className={isChecking ? "size-4 animate-spin" : "size-4"} />
          Refresh
        </Button>
      </div>

      <Card
        className={
          result.isEligible
            ? "border-green-200 bg-green-50/50 py-0 dark:bg-green-950/20"
            : "border-yellow-200 bg-yellow-50/50 py-0 dark:bg-yellow-950/20"
        }
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                {result.isEligible ? (
                  <CheckCircle2Icon className="size-5 text-green-600" />
                ) : (
                  <AlertCircleIcon className="size-5 text-yellow-600" />
                )}
                {result.channelTitle || "Channel"}
              </CardTitle>
              <CardDescription>
                Requires {result.formattedThreshold} {result.tokenSymbol} on{" "}
                {result.chainName}
              </CardDescription>
            </div>
            <Badge variant={result.isEligible ? "success" : "warning"}>
              {result.isEligible ? "Eligible" : "Not Eligible"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Your Balance</p>
              <p className="text-xl font-semibold">
                {result.formattedBalance} {result.tokenSymbol}
              </p>
            </div>

            <ArrowRightIcon className="size-5 text-muted-foreground" />

            <div className="text-right">
              <p className="text-sm text-muted-foreground">Required</p>
              <p className="text-xl font-semibold">
                {result.formattedThreshold} {result.tokenSymbol}
              </p>
            </div>
          </div>

          {!result.isEligible && (
            <div className="mt-4 rounded-lg bg-yellow-100 p-3 dark:bg-yellow-900/30">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                You need{" "}
                {formatDeficit(result.balance, result.threshold, result.decimals)} more{" "}
                {result.tokenSymbol} to become eligible.
              </p>
            </div>
          )}

          {result.isEligible && (
            <div className="mt-4 rounded-lg bg-green-100 p-3 dark:bg-green-900/30">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                You meet the token threshold for this channel!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {!result.isEligible && (
        <Card className="py-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CoinsIcon className="size-5" />
              Swap to Become Eligible
            </CardTitle>
            <CardDescription>
              Use LiFi to swap any token on any chain to {result.tokenSymbol} on{" "}
              {result.chainName}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {swapState === "swapping" && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/30">
                <RefreshCwIcon className="size-4 animate-spin text-blue-600" />
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Swap in progress…
                </p>
              </div>
            )}
            <LiFiWidgetWrapper
              gateConfig={gateConfig}
              onSwapSuccess={handleSwapSuccess}
              onSwapError={handleSwapError}
              onSwapStart={handleSwapStart}
            />
          </CardContent>
        </Card>
      )}

      {result.isEligible && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 py-0 dark:from-green-950/20 dark:to-emerald-950/20">
          <CardContent className="pt-6">
            <div className="py-4 text-center">
              <CheckCircle2Icon className="mx-auto mb-4 size-12 text-green-600" />
              <h3 className="mb-2 text-lg font-semibold">You're All Set!</h3>
              <p className="mb-4 text-muted-foreground">
                You have enough {result.tokenSymbol} to access this channel.
              </p>
              <Button type="button" variant="outline" onClick={() => window.history.back()}>
                <ExternalLinkIcon className="size-4" />
                Return to Channel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-muted/50 py-0">
        <CardContent className="pt-6">
          <h3 className="mb-2 font-semibold">How it works</h3>
          <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
            <li>Your verified wallets are checked for {result.tokenSymbol} balance.</li>
            <li>
              The threshold is {result.formattedThreshold} {result.tokenSymbol} on{" "}
              {result.chainName}.
            </li>
            <li>
              If you don't have enough, use the LiFi widget above to swap from any chain.
            </li>
            <li>After swapping, click &quot;Re-check Eligibility&quot; to verify your new balance.</li>
            <li>Once eligible, you can access the gated channel.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}

function formatFromWei(balance: string, decimals: number): string {
  const value = BigInt(balance)
  const divisor = BigInt(10) ** BigInt(decimals)
  const wholePart = value / divisor
  const fractionalPart = value % divisor
  const fractionalStr = fractionalPart.toString().padStart(decimals, "0")
  const trimmedFractional = fractionalStr.slice(0, 4)

  if (trimmedFractional === "0000") return wholePart.toString()
  return `${wholePart}.${trimmedFractional}`
}

function formatDeficit(balance: string, threshold: string, decimals: number): string {
  const balanceBigInt = BigInt(balance || "0")
  const thresholdBigInt = BigInt(threshold || "0")

  if (thresholdBigInt <= balanceBigInt) return "0"

  const deficit = thresholdBigInt - balanceBigInt
  return formatFromWei(deficit.toString(), decimals)
}
