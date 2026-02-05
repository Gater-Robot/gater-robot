import * as React from "react"
import { RefreshCwIcon, ShieldCheckIcon, TriangleAlertIcon } from "lucide-react"
import { useAction } from "convex/react"

import { CopyButton } from "@/components/CopyButton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/convex/api"
import { useTelegram } from "@/contexts/TelegramContext"

type PolicyResult = {
  timestampMs: number
  adminIds: { enforced: boolean; count: number }
  flags: { allowMockInitData: boolean; disableInsecureMutations: boolean }
  integrations: { botTokenConfigured: boolean; alchemyApiKeyConfigured: boolean }
}

function boolBadge(value: boolean) {
  return <Badge variant={value ? "default" : "secondary"}>{value ? "ON" : "OFF"}</Badge>
}

export function HealthPage() {
  const telegram = useTelegram()
  const canView = import.meta.env.DEV || (telegram.isInTelegram && telegram.startParam === "admin")

  const getPolicy = useAction(api.policyActions.getPolicy)
  const [policy, setPolicy] = React.useState<PolicyResult | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)

  const refresh = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = (await getPolicy({})) as PolicyResult
      setPolicy(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load policy")
      setPolicy(null)
    } finally {
      setIsLoading(false)
    }
  }, [getPolicy])

  React.useEffect(() => {
    if (!canView) return
    void refresh()
  }, [canView, refresh])

  if (!canView) {
    return (
      <Card className="border-destructive py-0">
        <CardContent className="pt-6">
          <div className="py-8 text-center">
            <TriangleAlertIcon className="mx-auto mb-4 size-12 text-destructive" />
            <h1 className="mb-2 text-xl font-semibold">Diagnostics Unavailable</h1>
            <p className="text-sm text-muted-foreground">
              This page is only available in development or in Telegram admin mode.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const diagnostics = {
    client: {
      mode: import.meta.env.MODE,
      dev: import.meta.env.DEV,
      origin: typeof window !== "undefined" ? window.location.origin : null,
      convexUrl: (import.meta.env.VITE_CONVEX_URL as string | undefined) ?? null,
    },
    telegram: {
      isInTelegram: telegram.isInTelegram,
      startParam: telegram.startParam ?? null,
      platform: telegram.platform,
      version: telegram.version,
      user: telegram.user
        ? {
            id: telegram.user.id,
            username: telegram.user.username ?? null,
            firstName: telegram.user.firstName ?? null,
            lastName: telegram.user.lastName ?? null,
          }
        : null,
    },
    server: policy,
  }

  const json = JSON.stringify(diagnostics, null, 2)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Health & Diagnostics</h1>
          <p className="text-sm text-muted-foreground">
            Quick visibility into policy flags and runtime context (no secrets).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <CopyButton value={json} label="Diagnostics copied" />
          <Button
            type="button"
            variant="secondary"
            onClick={() => void refresh()}
            disabled={isLoading}
          >
            <RefreshCwIcon className="mr-2 size-4" />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive py-0">
          <CardHeader>
            <CardTitle className="text-base">Policy fetch failed</CardTitle>
            <CardDescription className="text-destructive">{error}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="py-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheckIcon className="size-4" />
              Server Policy
            </CardTitle>
            <CardDescription>From Convex node action.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {isLoading && !policy ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-4 w-52" />
              </div>
            ) : policy ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-muted-foreground">ADMIN_IDS enforced</div>
                  {boolBadge(policy.adminIds.enforced)}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-muted-foreground">ADMIN_IDS count</div>
                  <div className="font-mono">{policy.adminIds.count}</div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-muted-foreground">ALLOW_MOCK_INITDATA</div>
                  {boolBadge(policy.flags.allowMockInitData)}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-muted-foreground">DISABLE_INSECURE_MUTATIONS</div>
                  {boolBadge(policy.flags.disableInsecureMutations)}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-muted-foreground">BOT_TOKEN configured</div>
                  {boolBadge(policy.integrations.botTokenConfigured)}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-muted-foreground">ALCHEMY_API_KEY configured</div>
                  {boolBadge(policy.integrations.alchemyApiKeyConfigured)}
                </div>
              </>
            ) : (
              <div className="text-muted-foreground">No policy loaded.</div>
            )}
          </CardContent>
        </Card>

        <Card className="py-0">
          <CardHeader>
            <CardTitle className="text-base">Telegram Context</CardTitle>
            <CardDescription>Client-side view.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="text-muted-foreground">In Telegram</div>
              {boolBadge(telegram.isInTelegram)}
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-muted-foreground">startParam</div>
              <div className="font-mono">{telegram.startParam ?? "—"}</div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-muted-foreground">platform</div>
              <div className="font-mono">{telegram.platform ?? "—"}</div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-muted-foreground">version</div>
              <div className="font-mono">{telegram.version ?? "—"}</div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-muted-foreground">user id</div>
              <div className="font-mono">{telegram.user?.id ?? "—"}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="py-0">
        <CardHeader>
          <CardTitle className="text-base">Raw JSON</CardTitle>
          <CardDescription>Safe to paste into PRs/issues (no secrets).</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="max-h-96 overflow-auto rounded-lg border bg-muted p-3 text-xs leading-relaxed">
            {json}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}

