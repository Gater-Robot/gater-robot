/**
 * DiagnosticsDrawer - Debug panel for Telegram Mini App
 *
 * Shows useful debugging information including:
 * - Telegram user data
 * - Init data
 * - Platform/version info
 * - Theme parameters
 * - Network status
 * - Convex connection status
 */

import { useState } from 'react'
import { useTelegram } from '@/contexts/TelegramContext'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bug, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DiagnosticsDrawerProps {
  /** Additional diagnostic data to display */
  additionalData?: Record<string, unknown>
  /** Whether the drawer starts open */
  defaultOpen?: boolean
  /** Custom class name */
  className?: string
}

export function DiagnosticsDrawer({
  additionalData,
  defaultOpen = false,
  className,
}: DiagnosticsDrawerProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [copied, setCopied] = useState(false)
  const telegram = useTelegram()

  const handleCopyDiagnostics = async () => {
    const diagnostics = {
      telegram: {
        isInTelegram: telegram.isInTelegram,
        isInitialized: telegram.isInitialized,
        platform: telegram.platform,
        version: telegram.version,
        user: telegram.user,
        themeParams: telegram.themeParams,
        startParam: telegram.startParam,
        initDataRaw: telegram.initDataRaw ? '[REDACTED]' : null,
      },
      browser: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        online: navigator.onLine,
        url: window.location.href,
      },
      timestamp: new Date().toISOString(),
      additionalData,
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy diagnostics:', error)
    }
  }

  return (
    <div className={cn('fixed bottom-4 right-4 z-50', className)}>
      {/* Toggle button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="mb-2 ml-auto flex gap-2"
        aria-label={isOpen ? 'Close diagnostics' : 'Open diagnostics'}
        aria-expanded={isOpen}
      >
        <Bug className="h-4 w-4" />
        Debug
        {isOpen ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </Button>

      {/* Drawer content */}
      {isOpen && (
        <Card className="w-80 max-h-96 overflow-auto shadow-lg">
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bug className="h-4 w-4" />
                Diagnostics
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyDiagnostics}
                className="h-7 px-2"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="py-2 space-y-4 text-xs">
            {/* Telegram Status */}
            <section>
              <h4 className="font-semibold mb-2 text-muted-foreground uppercase tracking-wider">
                Telegram
              </h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">In Telegram:</span>
                  <Badge variant={telegram.isInTelegram ? 'default' : 'secondary'}>
                    {telegram.isInTelegram ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Initialized:</span>
                  <Badge variant={telegram.isInitialized ? 'default' : 'secondary'}>
                    {telegram.isInitialized ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform:</span>
                  <span className="font-mono">{telegram.platform ?? 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Version:</span>
                  <span className="font-mono">{telegram.version ?? 'N/A'}</span>
                </div>
              </div>
            </section>

            {/* User Info */}
            {telegram.user && (
              <section>
                <h4 className="font-semibold mb-2 text-muted-foreground uppercase tracking-wider">
                  User
                </h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ID:</span>
                    <span className="font-mono">{telegram.user.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span>
                      {telegram.user.firstName}
                      {telegram.user.lastName ? ` ${telegram.user.lastName}` : ''}
                    </span>
                  </div>
                  {telegram.user.username && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Username:</span>
                      <span className="font-mono">@{telegram.user.username}</span>
                    </div>
                  )}
                  {telegram.user.isPremium && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Premium:</span>
                      <Badge variant="ens">Yes</Badge>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Theme Params */}
            {telegram.themeParams && (
              <section>
                <h4 className="font-semibold mb-2 text-muted-foreground uppercase tracking-wider">
                  Theme
                </h4>
                <div className="space-y-1">
                  {telegram.themeParams.bgColor && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Background:</span>
                      <div className="flex items-center gap-1">
                        <div
                          className="h-4 w-4 rounded border"
                          style={{ backgroundColor: telegram.themeParams.bgColor }}
                        />
                        <span className="font-mono text-[10px]">
                          {telegram.themeParams.bgColor}
                        </span>
                      </div>
                    </div>
                  )}
                  {telegram.themeParams.textColor && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Text:</span>
                      <div className="flex items-center gap-1">
                        <div
                          className="h-4 w-4 rounded border"
                          style={{ backgroundColor: telegram.themeParams.textColor }}
                        />
                        <span className="font-mono text-[10px]">
                          {telegram.themeParams.textColor}
                        </span>
                      </div>
                    </div>
                  )}
                  {telegram.themeParams.buttonColor && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Button:</span>
                      <div className="flex items-center gap-1">
                        <div
                          className="h-4 w-4 rounded border"
                          style={{ backgroundColor: telegram.themeParams.buttonColor }}
                        />
                        <span className="font-mono text-[10px]">
                          {telegram.themeParams.buttonColor}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Init Data */}
            <section>
              <h4 className="font-semibold mb-2 text-muted-foreground uppercase tracking-wider">
                Init Data
              </h4>
              <div className="bg-muted p-2 rounded font-mono text-[10px] break-all max-h-20 overflow-auto">
                {telegram.initDataRaw
                  ? `${telegram.initDataRaw.substring(0, 100)}...`
                  : 'Not available'}
              </div>
            </section>

            {/* Start Param */}
            {telegram.startParam && (
              <section>
                <h4 className="font-semibold mb-2 text-muted-foreground uppercase tracking-wider">
                  Start Param
                </h4>
                <div className="bg-muted p-2 rounded font-mono text-[10px]">
                  {telegram.startParam}
                </div>
              </section>
            )}

            {/* Additional Data */}
            {additionalData && Object.keys(additionalData).length > 0 && (
              <section>
                <h4 className="font-semibold mb-2 text-muted-foreground uppercase tracking-wider">
                  Additional
                </h4>
                <div className="bg-muted p-2 rounded font-mono text-[10px] break-all max-h-20 overflow-auto">
                  {JSON.stringify(additionalData, null, 2)}
                </div>
              </section>
            )}

            {/* Error */}
            {telegram.error && (
              <section>
                <h4 className="font-semibold mb-2 text-red-500 uppercase tracking-wider">
                  Error
                </h4>
                <div className="bg-red-50 dark:bg-red-950/20 p-2 rounded text-red-600 dark:text-red-400">
                  {telegram.error.message}
                </div>
              </section>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
