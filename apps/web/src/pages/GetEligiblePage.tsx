/**
 * GetEligiblePage - Token swap to become eligible for gated channels
 *
 * Allows users to:
 * - See their current token balance vs required threshold
 * - Swap tokens via LiFi to meet requirements
 * - Re-check eligibility after swap completion
 * - Track eligibility status for specific channels
 *
 * Supports two modes:
 * 1. Channel mode: ?channelId=xxx - fetches gate config from Convex
 * 2. Manual mode: ?token=0x...&amount=100&chain=8453&symbol=TOKEN
 *    - Used for bot deep links to skip Convex lookup
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useTelegram } from '@/contexts/TelegramContext'
import { useCheckEligibility } from '@/hooks/useCheckEligibility'
import {
  LiFiWidgetWrapper,
  type GateConfig,
} from '@/components/LiFiWidgetWrapper'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Skeleton,
} from '@/components/ui'
import {
  Coins,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  User,
  ExternalLink,
  PartyPopper,
  Wallet,
  Link as LinkIcon,
} from 'lucide-react'
type Id<TableName extends string> = string & { __tableName?: TableName }

type SwapState = 'idle' | 'swapping' | 'success' | 'error'

/**
 * Manual gate configuration from URL params
 * Used when bot links directly to this page without a channelId
 */
interface ManualGateParams {
  token: string      // Token contract address (0x...)
  amount: string     // Human-readable amount needed
  chain: number      // Chain ID (e.g., 8453 for Base)
  symbol: string     // Token symbol for display
  decimals?: number  // Token decimals (defaults to 18)
}

/**
 * Parse manual gate params from URL search params
 * Returns null if required params are missing
 */
function parseManualGateParams(searchParams: URLSearchParams): ManualGateParams | null {
  const token = searchParams.get('token')
  const amount = searchParams.get('amount')
  const chainStr = searchParams.get('chain')
  const symbol = searchParams.get('symbol')
  const decimalsStr = searchParams.get('decimals')

  // All required params must be present
  if (!token || !amount || !chainStr || !symbol) {
    return null
  }

  // Validate token address format
  if (!token.startsWith('0x') || token.length !== 42) {
    return null
  }

  // Validate chain is a number
  const chain = parseInt(chainStr, 10)
  if (isNaN(chain) || chain <= 0) {
    return null
  }

  // Parse optional decimals (default to 18)
  const decimals = decimalsStr ? parseInt(decimalsStr, 10) : 18

  return {
    token,
    amount,
    chain,
    symbol,
    decimals: isNaN(decimals) ? 18 : decimals,
  }
}

export function GetEligiblePage() {
  const { user, isLoading: telegramLoading, isInTelegram } = useTelegram()
  const [searchParams] = useSearchParams()
  const channelIdParam = searchParams.get('channelId')

  // Parse manual gate params from URL (for bot deep links)
  const manualGateParams = useMemo(
    () => parseManualGateParams(searchParams),
    [searchParams]
  )

  // Determine if we're in manual mode (no channelId but have manual params)
  const isManualMode = !channelIdParam && manualGateParams !== null

  // Eligibility hook
  const { check, result, isChecking, error, reset } = useCheckEligibility()

  // Swap state tracking
  const [swapState, setSwapState] = useState<SwapState>('idle')
  const [swapTxHash, setSwapTxHash] = useState<string | null>(null)
  const [swapDetails, setSwapDetails] = useState<{
    toToken: string
    toAmount: string
  } | null>(null)

  // Check eligibility on mount when we have channelId and user
  useEffect(() => {
    if (channelIdParam && user && !telegramLoading && !result && !isChecking) {
      check(channelIdParam as Id<'channels'>)
    }
  }, [channelIdParam, user, telegramLoading, result, isChecking, check])

  // Handle swap success callback
  const handleSwapSuccess = useCallback(
    (txHash: string, toToken: string, toAmount: string) => {
      setSwapState('success')
      setSwapTxHash(txHash)
      setSwapDetails({ toToken, toAmount })
    },
    []
  )

  // Handle swap error callback
  const handleSwapError = useCallback((_error: Error) => {
    setSwapState('error')
  }, [])

  // Handle swap start callback
  const handleSwapStart = useCallback(() => {
    setSwapState('swapping')
  }, [])

  // Re-check eligibility after swap
  const handleRecheck = useCallback(async () => {
    if (!channelIdParam) return
    setSwapState('idle')
    reset()
    await check(channelIdParam as Id<'channels'>)
  }, [channelIdParam, check, reset])

  // Calculate deficit with 10% buffer for the LiFi widget
  // Handles both channel mode (from result) and manual mode (from URL params)
  const gateConfig = useMemo((): GateConfig | undefined => {
    // Manual mode: use URL params directly
    if (isManualMode && manualGateParams) {
      // Add 10% buffer for slippage/fees
      const amountNum = parseFloat(manualGateParams.amount)
      const amountWithBuffer = isNaN(amountNum) ? manualGateParams.amount : (amountNum * 1.1).toFixed(4)

      return {
        gateName: `${manualGateParams.symbol} Token`,
        tokenAddress: manualGateParams.token,
        chainId: manualGateParams.chain,
        amountNeeded: amountWithBuffer,
        decimals: manualGateParams.decimals || 18,
      }
    }

    // Channel mode: use eligibility result
    if (!result || !result.hasActiveGate || result.isEligible) {
      return undefined
    }

    const balanceBigInt = BigInt(result.balance || '0')
    const thresholdBigInt = BigInt(result.threshold || '0')

    // Calculate deficit: threshold - balance
    const deficit =
      thresholdBigInt > balanceBigInt ? thresholdBigInt - balanceBigInt : BigInt(0)

    // Add 10% buffer to account for slippage and fees
    const buffer = deficit / BigInt(10)
    const amountNeededBigInt = deficit + buffer

    // Convert to human-readable format
    const decimals = result.decimals || 18
    const amountNeeded = formatFromWei(amountNeededBigInt.toString(), decimals)

    return {
      gateName: result.channelTitle || 'Channel',
      tokenAddress: result.tokenAddress,
      chainId: result.chainId,
      amountNeeded,
      decimals,
    }
  }, [result, isManualMode, manualGateParams])

  // Loading state
  if (telegramLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  // No channelId and no manual params - show error
  if (!channelIdParam && !isManualMode) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <h2 className="text-xl font-semibold mb-2">Missing Parameters</h2>
              <p className="text-muted-foreground mb-4">
                No channel or token specified. Please access this page from a channel invite link.
              </p>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  Channel mode: <code className="bg-muted px-2 py-1 rounded">?channelId=xxx</code>
                </p>
                <p>
                  Direct mode: <code className="bg-muted px-2 py-1 rounded">?token=0x...&amp;amount=100&amp;chain=8453&amp;symbol=TOKEN</code>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Manual mode - show LiFi widget directly without eligibility check
  if (isManualMode && manualGateParams) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold">Get Tokens</h1>
          <p className="text-muted-foreground">
            Swap to acquire {manualGateParams.symbol} tokens
          </p>
        </div>

        {/* Manual Mode Info Card */}
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="h-5 w-5 text-blue-600" />
                  Direct Swap Mode
                </CardTitle>
                <CardDescription>
                  Pre-configured to swap to {manualGateParams.symbol}
                </CardDescription>
              </div>
              <Badge variant="secondary">{getChainName(manualGateParams.chain)}</Badge>
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
                <p className="font-mono text-xs break-all">{manualGateParams.token}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Swap Success State */}
        {swapState === 'success' && swapDetails && (
          <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
            <CardContent className="pt-6">
              <div className="text-center py-4">
                <PartyPopper className="h-12 w-12 mx-auto text-green-600 mb-4" />
                <h2 className="text-xl font-bold mb-2">Swap Successful!</h2>
                <p className="text-muted-foreground mb-2">
                  You received {swapDetails.toToken} tokens.
                </p>
                {swapTxHash && (
                  <p className="text-xs text-muted-foreground">
                    Tx:{' '}
                    <code className="bg-muted px-2 py-1 rounded">
                      {swapTxHash.slice(0, 10)}...{swapTxHash.slice(-8)}
                    </code>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* LiFi Widget */}
        {swapState !== 'success' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5" />
                Swap Tokens
              </CardTitle>
              <CardDescription>
                Swap any token from any chain to {manualGateParams.symbol} on{' '}
                {getChainName(manualGateParams.chain)}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {swapState === 'swapping' && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Swap in progress...
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

        {/* Help Card */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">How it works</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>This page was pre-configured to help you acquire {manualGateParams.symbol}</li>
              <li>Connect your wallet and select a source token to swap from</li>
              <li>The LiFi widget will find the best route across chains</li>
              <li>Complete the swap to receive your {manualGateParams.symbol} tokens</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Coins className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
              <p className="text-muted-foreground">
                {isInTelegram
                  ? 'Unable to load user data from Telegram.'
                  : 'Please open this app in Telegram to check eligibility.'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <h2 className="text-xl font-semibold mb-2">Error Checking Eligibility</h2>
              <p className="text-muted-foreground mb-4">{error.message}</p>
              <Button onClick={() => check(channelIdParam as Id<'channels'>)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Loading eligibility
  if (isChecking || !result) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  // No user in system - link to profile
  if (!result.hasUser) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Account Setup Required</h2>
              <p className="text-muted-foreground mb-6">
                Please set up your profile first to check channel eligibility.
              </p>
              <Link to="/user">
                <Button>
                  <User className="h-4 w-4 mr-2" />
                  Go to Profile
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // No verified wallets - link to profile
  if (!result.hasVerifiedWallet) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Wallet Required</h2>
              <p className="text-muted-foreground mb-4">
                You need to link and verify a wallet to check eligibility for gated channels.
              </p>
              {result.hasActiveGate && (
                <div className="mb-6 p-4 bg-muted rounded-lg inline-block">
                  <p className="text-sm">
                    This channel requires holding{' '}
                    <span className="font-semibold">
                      {result.formattedThreshold} {result.tokenSymbol}
                    </span>{' '}
                    on {result.chainName}.
                  </p>
                </div>
              )}
              <Link to="/user">
                <Button>
                  <Wallet className="h-4 w-4 mr-2" />
                  Link Wallet
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // No active gates - channel is open access
  if (!result.hasActiveGate) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-600 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Open Access Channel</h2>
              <p className="text-muted-foreground mb-4">
                This channel has no token requirements. You can join freely!
              </p>
              <Badge variant="default" className="bg-green-600">
                No Gate Required
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Swap success state with re-check option
  if (swapState === 'success' && swapDetails) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Success Card */}
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <PartyPopper className="h-16 w-16 mx-auto text-green-600 mb-4" />
              <h2 className="text-2xl font-bold mb-2">Swap Successful!</h2>
              <p className="text-muted-foreground mb-4">
                You received {swapDetails.toToken} tokens.
              </p>
              {swapTxHash && (
                <p className="text-xs text-muted-foreground mb-6">
                  Transaction:{' '}
                  <code className="bg-muted px-2 py-1 rounded">
                    {swapTxHash.slice(0, 10)}...{swapTxHash.slice(-8)}
                  </code>
                </p>
              )}

              <div className="space-y-3">
                <Button onClick={handleRecheck} size="lg" className="w-full max-w-xs">
                  <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
                  Re-check Eligibility
                </Button>
                <p className="text-sm text-muted-foreground">
                  Click above to verify your new balance meets the threshold.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main eligibility view
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Get Eligible</h1>
          <p className="text-muted-foreground">
            {result.channelTitle || 'Channel'} token requirements
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => check(channelIdParam as Id<'channels'>)}
          disabled={isChecking}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Eligibility Status Card */}
      <Card
        className={
          result.isEligible
            ? 'border-green-200 bg-green-50/50 dark:bg-green-950/20'
            : 'border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20'
        }
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {result.isEligible ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                )}
                {result.channelTitle || 'Channel'}
              </CardTitle>
              <CardDescription>
                Requires {result.formattedThreshold} {result.tokenSymbol} on {result.chainName}
              </CardDescription>
            </div>
            <Badge variant={result.isEligible ? 'default' : 'secondary'}>
              {result.isEligible ? 'Eligible' : 'Not Eligible'}
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

            <ArrowRight className="h-5 w-5 text-muted-foreground" />

            <div className="text-right">
              <p className="text-sm text-muted-foreground">Required</p>
              <p className="text-xl font-semibold">
                {result.formattedThreshold} {result.tokenSymbol}
              </p>
            </div>
          </div>

          {/* Deficit indicator */}
          {!result.isEligible && (
            <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                You need{' '}
                {formatDeficit(result.balance, result.threshold, result.decimals)}{' '}
                more {result.tokenSymbol} to become eligible.
              </p>
            </div>
          )}

          {/* Already eligible */}
          {result.isEligible && (
            <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                You meet the token threshold for this channel!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* LiFi Widget - Only show if not eligible */}
      {!result.isEligible && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              Swap to Become Eligible
            </CardTitle>
            <CardDescription>
              Use LiFi to swap any token on any chain to {result.tokenSymbol} on{' '}
              {result.chainName}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {swapState === 'swapping' && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Swap in progress...
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

      {/* Already Eligible - Return CTA */}
      {result.isEligible && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
          <CardContent className="pt-6">
            <div className="text-center py-4">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2">You're All Set!</h3>
              <p className="text-muted-foreground mb-4">
                You have enough {result.tokenSymbol} to access this channel.
              </p>
              <Button
                variant="outline"
                onClick={() => window.history.back()}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Return to Channel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-2">How it works</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Your verified wallets are checked for {result.tokenSymbol} balance</li>
            <li>The threshold is {result.formattedThreshold} {result.tokenSymbol} on {result.chainName}</li>
            <li>If you don't have enough, use the LiFi widget above to swap from any chain</li>
            <li>After swapping, click "Re-check Eligibility" to verify your new balance</li>
            <li>Once eligible, you can access the gated channel</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Format BigInt balance from wei to human readable
 */
function formatFromWei(balance: string, decimals: number): string {
  const value = BigInt(balance)
  const divisor = BigInt(10) ** BigInt(decimals)
  const wholePart = value / divisor
  const fractionalPart = value % divisor

  // Format fractional part with leading zeros
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0')
  const trimmedFractional = fractionalStr.slice(0, 4)

  if (trimmedFractional === '0000') {
    return wholePart.toString()
  }
  return `${wholePart}.${trimmedFractional}`
}

/**
 * Calculate and format the deficit amount
 */
function formatDeficit(balance: string, threshold: string, decimals: number): string {
  const balanceBigInt = BigInt(balance || '0')
  const thresholdBigInt = BigInt(threshold || '0')

  if (thresholdBigInt <= balanceBigInt) {
    return '0'
  }

  const deficit = thresholdBigInt - balanceBigInt
  return formatFromWei(deficit.toString(), decimals)
}

/**
 * Get human-readable chain name from chain ID
 */
function getChainName(chainId: number): string {
  const chainNames: Record<number, string> = {
    1: 'Ethereum',
    10: 'Optimism',
    56: 'BNB Chain',
    100: 'Gnosis',
    137: 'Polygon',
    250: 'Fantom',
    324: 'zkSync Era',
    8453: 'Base',
    42161: 'Arbitrum',
    43114: 'Avalanche',
    59144: 'Linea',
    534352: 'Scroll',
    7777777: 'Zora',
    11155111: 'Sepolia',
  }
  return chainNames[chainId] || `Chain ${chainId}`
}
