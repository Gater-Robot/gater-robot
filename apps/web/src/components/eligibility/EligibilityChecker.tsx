/**
 * EligibilityChecker - Component to check and display eligibility status
 *
 * Features:
 * - "Check Eligibility" button to trigger on-chain balance check
 * - Displays eligibility result with balance vs threshold comparison
 * - Shows eligible (green) or not eligible (orange) badge
 * - Handles edge cases: no wallets, no gates, errors, loading
 * - Navigation to /get-eligible for users who need more tokens
 */

import { useNavigate } from 'react-router-dom'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Badge,
} from '@/components/ui'
import { useCheckEligibility } from '@/hooks/useCheckEligibility'
import { Id } from '../../../../../convex/_generated/dataModel'
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Wallet,
  Coins,
  ArrowRight,
  Shield,
} from 'lucide-react'

/**
 * Props for EligibilityChecker component
 */
interface EligibilityCheckerProps {
  /** Channel ID to check eligibility for */
  channelId: Id<'channels'>
  /** Optional channel name for display */
  channelName?: string
  /** Whether to show a compact version */
  compact?: boolean
}

/**
 * EligibilityChecker component
 *
 * @example
 * ```tsx
 * <EligibilityChecker
 *   channelId={channelId}
 *   channelName="Premium Alpha Group"
 * />
 * ```
 */
export function EligibilityChecker({
  channelId,
  channelName,
  compact = false,
}: EligibilityCheckerProps) {
  const navigate = useNavigate()
  const { check, result, isChecking, error, reset } = useCheckEligibility()

  const handleCheck = async () => {
    await check(channelId)
  }

  const handleGetEligible = () => {
    // Navigate to get-eligible page with channel context
    navigate(`/get-eligible?channelId=${channelId}`)
  }

  // Loading state
  if (isChecking) {
    return (
      <Card className={compact ? 'border-0 shadow-none' : ''}>
        <CardContent className={compact ? 'p-0' : 'pt-6'}>
          <div className="flex flex-col items-center justify-center py-6 space-y-3">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Checking on-chain balances...
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className={`${compact ? 'border-0 shadow-none' : ''} border-red-200 bg-red-50/50 dark:bg-red-950/20`}>
        <CardContent className={compact ? 'p-0 pt-4' : 'pt-6'}>
          <div className="flex flex-col items-center justify-center py-4 space-y-3">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <div className="text-center">
              <p className="font-medium text-red-700 dark:text-red-400">
                Error checking eligibility
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {error.message}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={reset}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Initial state - no result yet
  if (!result) {
    return (
      <Card className={compact ? 'border-0 shadow-none' : ''}>
        {!compact && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Eligibility Check
            </CardTitle>
            {channelName && (
              <CardDescription>
                Check if you meet the requirements for {channelName}
              </CardDescription>
            )}
          </CardHeader>
        )}
        <CardContent className={compact ? 'p-0' : ''}>
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Coins className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">
                Check your token balance against the gate requirements
              </p>
            </div>
            <Button onClick={handleCheck} className="mt-2">
              <RefreshCw className="h-4 w-4 mr-2" />
              Check Eligibility
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // No user in system
  if (!result.hasUser) {
    return (
      <Card className={`${compact ? 'border-0 shadow-none' : ''} border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20`}>
        <CardContent className={compact ? 'p-0 pt-4' : 'pt-6'}>
          <div className="flex flex-col items-center justify-center py-4 space-y-3">
            <AlertCircle className="h-8 w-8 text-yellow-500" />
            <div className="text-center">
              <p className="font-medium">Account Not Found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Please connect and verify a wallet to set up your account.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // No verified wallet
  if (!result.hasVerifiedWallet) {
    return (
      <Card className={`${compact ? 'border-0 shadow-none' : ''} border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20`}>
        <CardContent className={compact ? 'p-0 pt-4' : 'pt-6'}>
          <div className="flex flex-col items-center justify-center py-4 space-y-3">
            <Wallet className="h-8 w-8 text-yellow-500" />
            <div className="text-center">
              <p className="font-medium">No Verified Wallet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Connect and verify a wallet to check eligibility.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/user')}>
              Link Wallet
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // No active gate (everyone is eligible)
  if (!result.hasActiveGate) {
    return (
      <Card className={`${compact ? 'border-0 shadow-none' : ''} border-green-200 bg-green-50/50 dark:bg-green-950/20`}>
        <CardContent className={compact ? 'p-0 pt-4' : 'pt-6'}>
          <div className="flex flex-col items-center justify-center py-4 space-y-3">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <div className="text-center">
              <Badge variant="success" size="lg">
                Open Access
              </Badge>
              <p className="text-sm text-muted-foreground mt-2">
                This channel has no token requirements.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleCheck}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Result with gate - eligible or not
  const isEligible = result.isEligible

  return (
    <Card
      className={`${compact ? 'border-0 shadow-none' : ''} ${
        isEligible
          ? 'border-green-200 bg-green-50/50 dark:bg-green-950/20'
          : 'border-orange-200 bg-orange-50/50 dark:bg-orange-950/20'
      }`}
    >
      {!compact && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {isEligible ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-orange-600" />
              )}
              Eligibility Status
            </CardTitle>
            <Badge variant={isEligible ? 'success' : 'warning'} size="lg">
              {isEligible ? 'Eligible' : 'Not Eligible'}
            </Badge>
          </div>
          {channelName && (
            <CardDescription>
              Requirements for {channelName}
            </CardDescription>
          )}
        </CardHeader>
      )}

      <CardContent className={compact ? 'p-0 pt-2' : ''}>
        {compact && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {isEligible ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-orange-600" />
              )}
              <span className="font-medium">
                {isEligible ? 'Eligible' : 'Not Eligible'}
              </span>
            </div>
            <Badge variant={isEligible ? 'success' : 'warning'}>
              {result.tokenSymbol}
            </Badge>
          </div>
        )}

        {/* Balance comparison */}
        <div className="flex items-center justify-between py-3 px-4 bg-background/50 rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Your Balance</p>
            <p className="text-lg font-semibold">
              {result.formattedBalance} {result.tokenSymbol}
            </p>
          </div>

          <ArrowRight className="h-5 w-5 text-muted-foreground mx-4" />

          <div className="text-right">
            <p className="text-sm text-muted-foreground">Required</p>
            <p className="text-lg font-semibold">
              {result.formattedThreshold} {result.tokenSymbol}
            </p>
          </div>
        </div>

        {/* Chain info */}
        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center px-2 py-1 rounded bg-muted">
            {result.chainName}
          </span>
          {result.membershipStatus && (
            <span className="inline-flex items-center px-2 py-1 rounded bg-muted">
              Status: {result.membershipStatus}
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter className={`${compact ? 'p-0 pt-4' : ''} flex gap-2`}>
        <Button variant="outline" size="sm" onClick={handleCheck}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
        {!isEligible && (
          <Button size="sm" onClick={handleGetEligible}>
            <Coins className="h-4 w-4 mr-2" />
            Get Eligible
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
