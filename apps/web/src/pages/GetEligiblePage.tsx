/**
 * GetEligiblePage - Token swap to become eligible for gated channels
 *
 * Allows users to:
 * - See their current token balance vs required threshold
 * - Swap tokens via LiFi to meet requirements
 * - Track eligibility status for specific channels
 */

import { useState } from 'react'
import { useTelegram } from '@/contexts/TelegramContext'
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
  ExternalLink,
} from 'lucide-react'

// Placeholder types
interface GateRequirement {
  channelName: string
  channelId: string
  tokenSymbol: string
  tokenAddress: string
  chainId: number
  threshold: string
  thresholdFormatted: string
  currentBalance: string
  currentBalanceFormatted: string
  isEligible: boolean
}

export function GetEligiblePage() {
  const { user, isLoading, isInTelegram } = useTelegram()
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Placeholder gate requirements - will be replaced with Convex query
  const requirements: GateRequirement[] = []

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // TODO: Implement balance refresh
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsRefreshing(false)
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

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

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Get Eligible</h1>
          <p className="text-muted-foreground">
            Check and meet token requirements for gated channels
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Eligibility Status</h3>
              <p className="text-muted-foreground">
                {requirements.filter((r) => r.isEligible).length} of{' '}
                {requirements.length} channels eligible
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">
                {requirements.length > 0
                  ? Math.round(
                      (requirements.filter((r) => r.isEligible).length /
                        requirements.length) *
                        100
                    )
                  : 0}
                %
              </div>
              <p className="text-sm text-muted-foreground">Eligible</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requirements List */}
      {requirements.length > 0 ? (
        <div className="space-y-4">
          {requirements.map((req) => (
            <Card
              key={req.channelId}
              className={
                req.isEligible
                  ? 'border-green-200 bg-green-50/50 dark:bg-green-950/20'
                  : 'border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20'
              }
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {req.isEligible ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-yellow-600" />
                      )}
                      {req.channelName}
                    </CardTitle>
                    <CardDescription>
                      Requires {req.thresholdFormatted} {req.tokenSymbol}
                    </CardDescription>
                  </div>
                  <Badge variant={req.isEligible ? 'default' : 'secondary'}>
                    {req.isEligible ? 'Eligible' : 'Not Eligible'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Your Balance</p>
                    <p className="text-lg font-semibold">
                      {req.currentBalanceFormatted} {req.tokenSymbol}
                    </p>
                  </div>

                  <ArrowRight className="h-5 w-5 text-muted-foreground" />

                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Required</p>
                    <p className="text-lg font-semibold">
                      {req.thresholdFormatted} {req.tokenSymbol}
                    </p>
                  </div>

                  {!req.isEligible && (
                    <Button className="ml-4">
                      <Coins className="h-4 w-4 mr-2" />
                      Get Tokens
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12 text-muted-foreground">
              <Coins className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No requirements to check</p>
              <p className="text-sm mb-4">
                Link a wallet and join gated channels to see token requirements
              </p>
              <Button variant="outline">
                <ExternalLink className="h-4 w-4 mr-2" />
                Browse Channels
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* LiFi Integration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Get Tokens with LiFi
          </CardTitle>
          <CardDescription>
            Swap any token on any chain to meet requirements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground mb-4">
              LiFi integration enables cross-chain token swaps, allowing you to use
              tokens from any supported chain to become eligible for gated channels.
            </p>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Cross-chain swaps</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Best rate aggregation</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Multiple DEXs supported</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Help Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-2">How it works</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Connect your wallet to check your token balances</li>
            <li>View the token requirements for each gated channel</li>
            <li>If you don't have enough tokens, use LiFi to swap from any chain</li>
            <li>Once you meet the threshold, you'll automatically become eligible</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
