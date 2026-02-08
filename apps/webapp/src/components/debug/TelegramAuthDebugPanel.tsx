import { useState } from "react"
import { ChevronDownIcon, CopyIcon, CheckIcon } from "lucide-react"

import { useTelegram } from "@/contexts/TelegramContext"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

export function TelegramAuthDebugPanel() {
  const {
    user,
    initDataRaw,
    isInTelegram,
    platform,
    version,
    diagnostics,
  } = useTelegram()

  const [copied, setCopied] = useState(false)

  const diagJson = JSON.stringify(
    {
      user: user ? { id: user.id, username: user.username } : null,
      hasInitDataRaw: initDataRaw != null,
      isInTelegram,
      platform,
      version,
      diagnostics,
    },
    null,
    2,
  )

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(diagJson)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API may not be available in all contexts
    }
  }

  return (
    <Collapsible className="mt-4">
      <CollapsibleTrigger className="flex w-full items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
        <ChevronDownIcon className="size-3 transition-transform [[data-state=open]>&]:rotate-180" />
        Debug info
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 space-y-2 rounded-md border bg-muted/30 p-3 text-xs">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" size="sm">
              {isInTelegram ? "In Telegram" : "Not Telegram"}
            </Badge>
            {diagnostics && (
              <Badge
                variant={diagnostics.reconstructed ? "warning" : "success"}
                size="sm"
              >
                {diagnostics.source}
              </Badge>
            )}
            {platform && (
              <Badge variant="secondary" size="sm">
                {platform}
              </Badge>
            )}
            {version && (
              <Badge variant="secondary" size="sm">
                v{version}
              </Badge>
            )}
          </div>

          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-muted-foreground">
            <dt className="font-medium text-foreground">User</dt>
            <dd className="truncate font-mono">
              {user ? `${user.username ?? user.firstName} (${user.id})` : "none"}
            </dd>

            <dt className="font-medium text-foreground">initDataRaw</dt>
            <dd className="truncate font-mono">
              {initDataRaw ? `${initDataRaw.slice(0, 40)}...` : "null"}
            </dd>

            {diagnostics && (
              <>
                <dt className="font-medium text-foreground">Had auth_date</dt>
                <dd>{diagnostics.hadAuthDate ? "yes" : "no (synthesized)"}</dd>

                <dt className="font-medium text-foreground">Unsafe keys</dt>
                <dd className="truncate font-mono">
                  {diagnostics.initDataUnsafeKeys.join(", ") || "none"}
                </dd>
              </>
            )}
          </dl>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {copied ? (
              <>
                <CheckIcon className="size-3" />
                Copied
              </>
            ) : (
              <>
                <CopyIcon className="size-3" />
                Copy diagnostics JSON
              </>
            )}
          </button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
