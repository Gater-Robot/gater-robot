import { useSearchParams } from "react-router-dom"

import { CopyButton } from "@/components/CopyButton"
import { OverflowMarquee } from "@/components/OverflowMarquee"
import { Badge } from "@/components/ui/badge"

export function GetEligiblePage() {
  const [searchParams] = useSearchParams()

  const channelId = searchParams.get("channelId")
  const token = searchParams.get("token")
  const amount = searchParams.get("amount")
  const chain = searchParams.get("chain")
  const symbol = searchParams.get("symbol")

  const isManualMode = !channelId && Boolean(token && amount && chain && symbol)

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Get Eligible</h1>
        <div className="rounded-xl border bg-card p-4 text-card-foreground">
          <div className="text-sm text-muted-foreground">
            Placeholder route. This will migrate Eligibility status + LiFi “Get Eligible” flows from{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[12px]">apps/web</code>.
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4 text-card-foreground">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">Detected mode</div>
          <Badge variant={isManualMode ? "default" : "secondary"} className="transition-none">
            {isManualMode ? "manual" : "channel"}
          </Badge>
        </div>

        <div className="mt-4 space-y-3 text-sm">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
            <div className="text-muted-foreground">channelId</div>
            <OverflowMarquee
              text={channelId ?? "—"}
              className="text-foreground"
              fadeBg="var(--card)"
            />
            <CopyButton value={channelId ?? ""} className="transition-none" />
          </div>

          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
            <div className="text-muted-foreground">manual params</div>
            <OverflowMarquee
              text={token && amount && chain && symbol ? `${token} ${amount} ${chain} ${symbol}` : "—"}
              className="text-foreground"
              fadeBg="var(--card)"
            />
            <CopyButton
              value={token && amount && chain && symbol ? `${token} ${amount} ${chain} ${symbol}` : ""}
              className="transition-none"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
