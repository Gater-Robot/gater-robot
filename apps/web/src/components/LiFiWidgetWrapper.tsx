/**
 * LiFiWidgetWrapper - Wrapper component for LiFi Widget
 *
 * Provides token swap functionality with:
 * - Wallet connection state handling
 * - Success/error callbacks for swap events
 * - Loading states and error handling
 * - Integration with existing wagmi configuration
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import { LiFiWidget, useWidgetEvents, WidgetEvent, type WidgetConfig, type RouteExecutionUpdate } from '@lifi/widget'
import type { Route } from '@lifi/sdk'
import { useAccount } from 'wagmi'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, Wallet, RefreshCw } from 'lucide-react'
import { DEFAULT_WIDGET_CONFIG, createGateWidgetConfig } from '@/lib/lifi-config'
import { ConnectWallet } from '@/components/wallet/ConnectWallet'

export interface GateConfig {
  gateName: string
  tokenAddress: string
  chainId: number
  amountNeeded: string
  decimals: number
}

export interface LiFiWidgetWrapperProps {
  /** Gate configuration for pre-filling destination token */
  gateConfig?: GateConfig
  /** Callback when swap is successfully completed */
  onSwapSuccess?: (txHash: string, toToken: string, toAmount: string) => void
  /** Callback when swap fails */
  onSwapError?: (error: Error) => void
  /** Callback when route execution starts */
  onSwapStart?: () => void
  /** Additional class names for the container */
  className?: string
}

export function LiFiWidgetWrapper({
  gateConfig,
  onSwapSuccess,
  onSwapError,
  onSwapStart,
  className = '',
}: LiFiWidgetWrapperProps) {
  const { isConnected } = useAccount()
  const widgetEvents = useWidgetEvents()
  const [widgetError, setWidgetError] = useState<Error | null>(null)
  const [isWidgetLoading, setIsWidgetLoading] = useState(true)

  // Build widget configuration based on gate config
  const widgetConfig: WidgetConfig = useMemo(() => {
    if (gateConfig) {
      return createGateWidgetConfig(
        gateConfig.gateName,
        gateConfig.tokenAddress,
        gateConfig.chainId,
        gateConfig.amountNeeded,
        gateConfig.decimals
      )
    }
    return DEFAULT_WIDGET_CONFIG
  }, [gateConfig])

  // Subscribe to widget events
  useEffect(() => {
    // Handle route execution start
    const handleRouteExecutionStarted = (_route: Route) => {
      setWidgetError(null)
      setIsWidgetLoading(false)
      onSwapStart?.()
    }

    // Handle route execution updates
    const handleRouteExecutionUpdated = (update: RouteExecutionUpdate) => {
      const { route, process } = update

      // Check if the process is complete
      if (process.status === 'DONE' && process.txHash) {
        const toToken = route.toToken?.symbol || 'Unknown'
        const toAmount = route.toAmount || '0'
        onSwapSuccess?.(process.txHash, toToken, toAmount)
      } else if (process.status === 'FAILED') {
        const error = new Error(process.message || 'Swap failed')
        setWidgetError(error)
        onSwapError?.(error)
      }
    }

    // Handle route execution completed
    // Note: We don't call onSwapSuccess here because the RouteExecutionUpdated
    // event already captures the successful completion with the txHash.
    // Calling it here would result in a duplicate callback with empty txHash.
    const handleRouteExecutionCompleted = (_route: Route) => {
      // Final confirmation that route completed successfully
      // Success already reported via RouteExecutionUpdated event
      console.log('LiFi route execution completed')
    }

    // Handle route execution failed
    const handleRouteExecutionFailed = (update: RouteExecutionUpdate) => {
      const error = new Error(update.process.message || 'Swap failed')
      setWidgetError(error)
      onSwapError?.(error)
    }

    // Subscribe to events
    widgetEvents.on(WidgetEvent.RouteExecutionStarted, handleRouteExecutionStarted)
    widgetEvents.on(WidgetEvent.RouteExecutionUpdated, handleRouteExecutionUpdated)
    widgetEvents.on(WidgetEvent.RouteExecutionCompleted, handleRouteExecutionCompleted)
    widgetEvents.on(WidgetEvent.RouteExecutionFailed, handleRouteExecutionFailed)

    // Widget rendered - hide loading state
    setIsWidgetLoading(false)

    // Cleanup subscriptions
    return () => {
      widgetEvents.off(WidgetEvent.RouteExecutionStarted, handleRouteExecutionStarted)
      widgetEvents.off(WidgetEvent.RouteExecutionUpdated, handleRouteExecutionUpdated)
      widgetEvents.off(WidgetEvent.RouteExecutionCompleted, handleRouteExecutionCompleted)
      widgetEvents.off(WidgetEvent.RouteExecutionFailed, handleRouteExecutionFailed)
    }
  }, [widgetEvents, onSwapSuccess, onSwapError, onSwapStart])

  // Reset error state
  const handleRetry = useCallback(() => {
    setWidgetError(null)
  }, [])

  // Show wallet connection prompt if not connected
  if (!isConnected) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
            <p className="text-muted-foreground mb-6">
              Connect your wallet to swap tokens and become eligible for gated channels.
            </p>
            <ConnectWallet />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show error state with retry option
  if (widgetError) {
    return (
      <Card className={`border-destructive ${className}`}>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h3 className="text-lg font-semibold mb-2">Swap Failed</h3>
            <p className="text-muted-foreground mb-4">{widgetError.message}</p>
            <Button onClick={handleRetry} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {/* Loading skeleton while widget initializes */}
      {isWidgetLoading && (
        <div className="absolute inset-0 bg-background z-10 p-4">
          <Skeleton className="h-12 w-full mb-4" />
          <Skeleton className="h-32 w-full mb-4" />
          <Skeleton className="h-32 w-full mb-4" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}

      {/* Gate info header when gate is configured */}
      {gateConfig && (
        <div className="mb-4 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            Swapping to become eligible for:{' '}
            <span className="font-semibold text-foreground">{gateConfig.gateName}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Target: {gateConfig.amountNeeded} tokens on chain {gateConfig.chainId}
          </p>
        </div>
      )}

      {/* LiFi Widget */}
      <LiFiWidget
        integrator="gater-robot"
        config={widgetConfig}
      />
    </div>
  )
}

/**
 * Simplified widget for use in modals or compact spaces
 */
export function LiFiWidgetCompact(props: LiFiWidgetWrapperProps) {
  return (
    <LiFiWidgetWrapper
      {...props}
      className={`max-w-md mx-auto ${props.className || ''}`}
    />
  )
}
