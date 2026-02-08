import * as React from "react"
import {
  LiFiWidget,
  type RouteExecutionUpdate,
  type WidgetConfig,
  useWidgetEvents,
  WidgetEvent,
} from "@lifi/widget"
import type { Route } from "@lifi/sdk"
import { AlertCircleIcon, RefreshCwIcon, WalletIcon } from "lucide-react"
import { useAccount } from "wagmi"

import { createGateWidgetConfig, DEFAULT_WIDGET_CONFIG } from "@/lib/lifi-config"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ConnectWallet } from "@/components/wallet/ConnectWallet"
import { cn } from "@/lib/utils"

export interface GateConfig {
  gateName: string
  tokenAddress: string
  chainId: number
  amountNeeded: string
  decimals: number
}

export interface LiFiWidgetWrapperProps {
  gateConfig?: GateConfig
  onSwapSuccess?: (txHash: string, toToken: string, toAmount: string) => void
  onSwapError?: (error: Error) => void
  onSwapStart?: () => void
  className?: string
}

export function LiFiWidgetWrapper({
  gateConfig,
  onSwapSuccess,
  onSwapError,
  onSwapStart,
  className,
}: LiFiWidgetWrapperProps) {
  const { isConnected } = useAccount()
  const widgetEvents = useWidgetEvents()
  const [widgetError, setWidgetError] = React.useState<Error | null>(null)
  const [isWidgetLoading, setIsWidgetLoading] = React.useState(true)

  const widgetConfig: WidgetConfig = React.useMemo(() => {
    if (gateConfig) {
      return createGateWidgetConfig(
        gateConfig.gateName,
        gateConfig.tokenAddress,
        gateConfig.chainId,
        gateConfig.amountNeeded,
        gateConfig.decimals,
      )
    }
    return DEFAULT_WIDGET_CONFIG
  }, [gateConfig])

  React.useEffect(() => {
    const handleRouteExecutionStarted = (_route: Route) => {
      setWidgetError(null)
      setIsWidgetLoading(false)
      onSwapStart?.()
    }

    const handleRouteExecutionUpdated = (update: RouteExecutionUpdate) => {
      const { route, process } = update

      if (process.status === "DONE" && process.txHash) {
        const toToken = route.toToken?.symbol || "Unknown"
        const toAmount = route.toAmount || "0"
        onSwapSuccess?.(process.txHash, toToken, toAmount)
      } else if (process.status === "FAILED") {
        const error = new Error(process.message || "Swap failed")
        setWidgetError(error)
        onSwapError?.(error)
      }
    }

    const handleRouteExecutionFailed = (update: RouteExecutionUpdate) => {
      const error = new Error(update.process.message || "Swap failed")
      setWidgetError(error)
      onSwapError?.(error)
    }

    widgetEvents.on(WidgetEvent.RouteExecutionStarted, handleRouteExecutionStarted)
    widgetEvents.on(WidgetEvent.RouteExecutionUpdated, handleRouteExecutionUpdated)
    widgetEvents.on(WidgetEvent.RouteExecutionFailed, handleRouteExecutionFailed)
    setIsWidgetLoading(false)

    return () => {
      widgetEvents.off(WidgetEvent.RouteExecutionStarted, handleRouteExecutionStarted)
      widgetEvents.off(WidgetEvent.RouteExecutionUpdated, handleRouteExecutionUpdated)
      widgetEvents.off(WidgetEvent.RouteExecutionFailed, handleRouteExecutionFailed)
    }
  }, [widgetEvents, onSwapError, onSwapStart, onSwapSuccess])

  if (!isConnected) {
    return (
      <Card className={cn("p-6", className)}>
        <div className="text-center">
          <WalletIcon className="text-muted-foreground mx-auto mb-4 size-12" />
          <h3 className="text-lg font-semibold">Connect your wallet</h3>
          <p className="text-muted-foreground mt-2 text-sm">
            Connect your wallet to swap tokens and become eligible.
          </p>
          <div className="mt-6 flex justify-center">
            <ConnectWallet />
          </div>
        </div>
      </Card>
    )
  }

  if (widgetError) {
    return (
      <Card className={cn("border-destructive/40 p-6", className)}>
        <div className="text-center">
          <AlertCircleIcon className="text-destructive mx-auto mb-4 size-12" />
          <h3 className="text-lg font-semibold">Swap failed</h3>
          <p className="text-muted-foreground mt-2 text-sm">{widgetError.message}</p>
          <Button
            type="button"
            className="mt-6"
            variant="secondary"
            onClick={() => setWidgetError(null)}
          >
            <RefreshCwIcon className="mr-2 size-4" />
            Try again
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className={cn("relative", className)}>
      {isWidgetLoading && (
        <div className="bg-background absolute inset-0 z-10 p-4">
          <Skeleton className="mb-4 h-12 w-full" />
          <Skeleton className="mb-4 h-32 w-full" />
          <Skeleton className="mb-4 h-32 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}

      {gateConfig && (
        <div className="bg-muted mb-4 rounded-lg p-4">
          <p className="text-muted-foreground text-sm">
            Swapping to become eligible for{" "}
            <span className="text-foreground font-semibold">
              {gateConfig.gateName}
            </span>
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            Target: {gateConfig.amountNeeded} tokens on chain {gateConfig.chainId}
          </p>
        </div>
      )}

      <LiFiWidget integrator="gater-robot" config={widgetConfig} />
    </div>
  )
}

