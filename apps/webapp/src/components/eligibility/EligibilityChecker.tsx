import { useNavigate } from "react-router-dom"
import {
  AlertCircleIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  CoinsIcon,
  RefreshCwIcon,
  ShieldIcon,
  WalletIcon,
  XCircleIcon,
} from "lucide-react"

import { useCheckEligibility } from "@/hooks/useCheckEligibility"
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

type Id<TableName extends string> = string & { __tableName?: TableName }

interface EligibilityCheckerProps {
  channelId: Id<"channels">
  channelName?: string
  compact?: boolean
}

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
    navigate(`/get-eligible?channelId=${channelId}`)
  }

  if (isChecking) {
    return (
      <Card className={compact ? "border-0 py-0 shadow-none" : ""}>
        <CardContent className={compact ? "px-0" : ""}>
          <div className="flex flex-col items-center justify-center space-y-3 py-6">
            <RefreshCwIcon className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Checking on-chain balances…
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card
        className={
          compact
            ? "border-0 bg-transparent py-0 shadow-none"
            : "border-red-200 bg-red-50/50 py-0 dark:bg-red-950/20"
        }
      >
        <CardContent className={compact ? "px-0 pt-4" : ""}>
          <div className="flex flex-col items-center justify-center space-y-3 py-4">
            <AlertCircleIcon className="size-8 text-red-500" />
            <div className="text-center">
              <p className="font-medium text-red-700 dark:text-red-400">
                Error checking eligibility
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
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

  if (!result) {
    return (
      <Card className={compact ? "border-0 py-0 shadow-none" : ""}>
        {!compact && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldIcon className="size-5" />
              Eligibility Check
            </CardTitle>
            {channelName && (
              <CardDescription>
                Check if you meet the requirements for {channelName}
              </CardDescription>
            )}
          </CardHeader>
        )}
        <CardContent className={compact ? "px-0" : ""}>
          <div className="flex flex-col items-center justify-center space-y-4 py-6">
            <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
              <CoinsIcon className="size-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">
                Check your token balance against the gate requirements.
              </p>
            </div>
            <Button onClick={handleCheck} className="mt-2">
              <RefreshCwIcon className="size-4" />
              Check Eligibility
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!result.hasUser) {
    return (
      <Card
        className={
          compact
            ? "border-0 bg-transparent py-0 shadow-none"
            : "border-yellow-200 bg-yellow-50/50 py-0 dark:bg-yellow-950/20"
        }
      >
        <CardContent className={compact ? "px-0 pt-4" : ""}>
          <div className="flex flex-col items-center justify-center space-y-3 py-4">
            <AlertCircleIcon className="size-8 text-yellow-500" />
            <div className="text-center">
              <p className="font-medium">Account Not Found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Link a wallet to your account to check eligibility.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate("/user")}>
              Link Wallet
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!result.hasVerifiedWallet) {
    return (
      <Card
        className={
          compact
            ? "border-0 bg-transparent py-0 shadow-none"
            : "border-yellow-200 bg-yellow-50/50 py-0 dark:bg-yellow-950/20"
        }
      >
        <CardContent className={compact ? "px-0 pt-4" : ""}>
          <div className="flex flex-col items-center justify-center space-y-3 py-4">
            <WalletIcon className="size-8 text-yellow-500" />
            <div className="text-center">
              <p className="font-medium">No Verified Wallet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Connect and verify a wallet to check eligibility.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate("/user")}>
              Verify Wallet
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!result.hasActiveGate) {
    return (
      <Card
        className={
          compact
            ? "border-0 bg-transparent py-0 shadow-none"
            : "border-green-200 bg-green-50/50 py-0 dark:bg-green-950/20"
        }
      >
        <CardContent className={compact ? "px-0 pt-4" : ""}>
          <div className="flex flex-col items-center justify-center space-y-3 py-4 text-center">
            <CheckCircle2Icon className="size-8 text-green-500" />
            <div>
              <Badge variant="success" size="lg">
                Open Access
              </Badge>
              <p className="mt-2 text-sm text-muted-foreground">
                This channel has no token requirements.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleCheck}>
              <RefreshCwIcon className="size-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const isEligible = result.isEligible

  return (
    <Card
      className={
        compact
          ? "border-0 py-0 shadow-none"
          : isEligible
            ? "border-green-200 bg-green-50/50 py-0 dark:bg-green-950/20"
            : "border-orange-200 bg-orange-50/50 py-0 dark:bg-orange-950/20"
      }
    >
      {!compact && (
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              {isEligible ? (
                <CheckCircle2Icon className="size-5 text-green-600" />
              ) : (
                <XCircleIcon className="size-5 text-orange-600" />
              )}
              Eligibility Status
            </CardTitle>
            <Badge variant={isEligible ? "success" : "warning"} size="lg">
              {isEligible ? "Eligible" : "Not Eligible"}
            </Badge>
          </div>
          {channelName && (
            <CardDescription>Requirements for {channelName}</CardDescription>
          )}
        </CardHeader>
      )}

      <CardContent className={compact ? "px-0 pt-2" : ""}>
        {compact && (
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {isEligible ? (
                <CheckCircle2Icon className="size-5 text-green-600" />
              ) : (
                <XCircleIcon className="size-5 text-orange-600" />
              )}
              <span className="font-medium">
                {isEligible ? "Eligible" : "Not Eligible"}
              </span>
            </div>
            <Badge variant={isEligible ? "success" : "warning"}>
              {result.tokenSymbol}
            </Badge>
          </div>
        )}

        <div className="flex items-center justify-between rounded-lg bg-background/50 px-4 py-3">
          <div>
            <p className="text-sm text-muted-foreground">Your Balance</p>
            <p className="text-lg font-semibold">
              {result.formattedBalance} {result.tokenSymbol}
            </p>
          </div>

          <ArrowRightIcon className="mx-4 size-5 text-muted-foreground" />

          <div className="text-right">
            <p className="text-sm text-muted-foreground">Required</p>
            <p className="text-lg font-semibold">
              {result.formattedThreshold} {result.tokenSymbol}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center rounded bg-muted px-2 py-1">
            {result.chainName}
          </span>
          {result.membershipStatus && (
            <span className="inline-flex items-center rounded bg-muted px-2 py-1">
              Status: {result.membershipStatus}
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter className={compact ? "flex gap-2 px-0 pt-4" : "flex gap-2"}>
        <Button variant="outline" size="sm" onClick={handleCheck}>
          <RefreshCwIcon className="size-4" />
          Refresh
        </Button>
        {!isEligible && (
          <Button size="sm" onClick={handleGetEligible}>
            <CoinsIcon className="size-4" />
            Get Eligible
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

