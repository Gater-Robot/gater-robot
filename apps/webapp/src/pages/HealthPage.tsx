import * as React from "react"
import { RefreshCwIcon, TriangleAlertIcon } from "lucide-react"
import { useAction } from "convex/react"

import { CopyButton } from "@/components/CopyButton"
import { Badge } from "@/components/ui/badge"
import { PulseDot } from "@/components/ui/pulse-dot"
import { SectionHeader } from "@/components/ui/section-header"
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
  return (
    <Badge variant={value ? "success" : "secondary"} size="sm">
      <span className="font-mono">{value ? "ON" : "OFF"}</span>
    </Badge>
  )
}

export function HealthPage() {
  const telegram = useTelegram()
  const urlParams = new URLSearchParams(window.location.search)
  const hasAccessParam = urlParams.get("access") === "admin"
  const canView =
    import.meta.env.DEV ||
    (telegram.isInTelegram && telegram.startParam === "admin") ||
    hasAccessParam

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
      <div className="rounded-xl border border-destructive bg-[var(--color-surface)] p-6">
        <div className="py-8 text-center">
          <TriangleAlertIcon className="mx-auto mb-4 size-12 text-destructive" />
          <h1 className="mb-2 text-xl font-semibold">Diagnostics Unavailable</h1>
          <p className="text-sm text-muted-foreground">
            This page is only available in development or in Telegram admin mode.
          </p>
        </div>
      </div>
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
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-3 fade-up stagger-1">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <PulseDot color={error ? "bg-destructive" : "bg-success"} size="sm" />
            <h1 className="text-xl font-bold tracking-tight">Health & Diagnostics</h1>
            <Badge variant="flux" size="sm">
              {error ? "ERROR" : isLoading ? "LOADING" : "SYSTEMS OK"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Quick visibility into policy flags and runtime context (no secrets).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <CopyButton value={json} label="Diagnostics copied" />
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={isLoading}
            className="inline-flex items-center rounded-lg bg-primary/10 text-primary px-4 py-2 font-mono text-xs font-medium hover:bg-primary/20 hover:shadow-[0_0_12px_var(--color-glow)] active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCwIcon className="mr-2 size-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive-dim p-4 fade-up">
          <h3 className="text-base font-semibold text-foreground">Policy fetch failed</h3>
          <p className="text-sm text-destructive mt-1">{error}</p>
        </div>
      )}

      {/* Policy + Telegram cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Security Policy */}
        <div className="space-y-3 fade-up stagger-2">
          <SectionHeader>Security Policy</SectionHeader>
          <div className="rounded-xl border border-border bg-[var(--color-surface-alt)] p-4">
            {isLoading && !policy ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-4 w-52" />
              </div>
            ) : policy ? (
              <div className="space-y-0">
                <div className="flex items-center justify-between py-2 border-b border-border/30">
                  <span className="text-sm text-muted-foreground">ADMIN_IDS enforced</span>
                  {boolBadge(policy.adminIds.enforced)}
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/30">
                  <span className="text-sm text-muted-foreground">ADMIN_IDS count</span>
                  <span className="font-mono text-sm text-foreground">{policy.adminIds.count}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/30">
                  <span className="text-sm text-muted-foreground">ALLOW_MOCK_INITDATA</span>
                  {boolBadge(policy.flags.allowMockInitData)}
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/30">
                  <span className="text-sm text-muted-foreground">DISABLE_INSECURE_MUTATIONS</span>
                  {boolBadge(policy.flags.disableInsecureMutations)}
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/30">
                  <span className="text-sm text-muted-foreground">BOT_TOKEN configured</span>
                  {boolBadge(policy.integrations.botTokenConfigured)}
                </div>
                <div className="flex items-center justify-between py-2 last:border-0">
                  <span className="text-sm text-muted-foreground">ALCHEMY_API_KEY configured</span>
                  {boolBadge(policy.integrations.alchemyApiKeyConfigured)}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No policy loaded.</p>
            )}
          </div>
        </div>

        {/* Telegram Context */}
        <div className="space-y-3 fade-up stagger-3">
          <SectionHeader>Telegram Context</SectionHeader>
          <div className="rounded-xl border border-border bg-[var(--color-surface-alt)] p-4">
            <div className="space-y-0">
              <div className="flex items-center justify-between py-2 border-b border-border/30">
                <span className="text-sm text-muted-foreground">In Telegram</span>
                {boolBadge(telegram.isInTelegram)}
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/30">
                <span className="text-sm text-muted-foreground">startParam</span>
                <span className="font-mono text-sm text-foreground">{telegram.startParam ?? "\u2014"}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/30">
                <span className="text-sm text-muted-foreground">platform</span>
                <span className="font-mono text-sm text-foreground">{telegram.platform ?? "\u2014"}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/30">
                <span className="text-sm text-muted-foreground">version</span>
                <span className="font-mono text-sm text-foreground">{telegram.version ?? "\u2014"}</span>
              </div>
              <div className="flex items-center justify-between py-2 last:border-0">
                <span className="text-sm text-muted-foreground">user id</span>
                <span className="font-mono text-sm text-foreground">{telegram.user?.id ?? "\u2014"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Raw JSON */}
      <div className="space-y-3 fade-up stagger-4">
        <SectionHeader>Raw Response</SectionHeader>
        <pre className="flux-scrollbar max-h-96 overflow-auto rounded-xl border border-border bg-[var(--color-surface)] p-4 font-mono text-xs leading-relaxed">
          {json}
        </pre>
      </div>
    </div>
  )
}
