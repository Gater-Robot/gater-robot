import { getChainLabel, getExplorerTxUrl } from "@gater/chain-registry"
import { CheckCircle2Icon, Loader2Icon, XCircleIcon } from "lucide-react"

import { CopyButton } from "@/components/CopyButton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type TransactionState = "pending" | "loading" | "success" | "error"

type TransactionStatusProps = {
  state: TransactionState
  hash?: string
  chainId?: number
  title?: string
  description?: string
  error?: string
  compact?: boolean
  className?: string
}

function formatHash(hash: string, length = 10) {
  if (hash.length <= length + 2) return hash
  return `${hash.slice(0, length)}...${hash.slice(-6)}`
}

function getStateDefaults(state: TransactionState) {
  switch (state) {
    case "pending":
      return {
        label: "Confirming",
        icon: <Loader2Icon className="size-4 animate-spin" />,
        variant: "secondary" as const,
        title: "Transaction pending",
      }
    case "loading":
      return {
        label: "Processing",
        icon: <Loader2Icon className="size-4 animate-spin" />,
        variant: "secondary" as const,
        title: "Processing transaction",
      }
    case "success":
      return {
        label: "Success",
        icon: <CheckCircle2Icon className="size-4" />,
        variant: "default" as const,
        title: "Transaction confirmed",
      }
    case "error":
      return {
        label: "Error",
        icon: <XCircleIcon className="size-4" />,
        variant: "destructive" as const,
        title: "Transaction failed",
      }
  }
}

export function TransactionStatus({
  state,
  hash,
  chainId,
  title,
  description,
  error,
  compact = false,
  className,
}: TransactionStatusProps) {
  const defaults = getStateDefaults(state)
  const displayTitle = title ?? defaults.title
  const displayDescription = state === "error" ? error ?? description : description

  const explorerUrl =
    hash && chainId != null ? getExplorerTxUrl(chainId, hash) : ""

  const chainLabel = chainId != null ? getChainLabel(chainId) : undefined

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm",
          className,
        )}
      >
        <span className="text-muted-foreground">{defaults.icon}</span>
        <span className="font-medium">{displayTitle}</span>
        <Badge variant={defaults.variant} className="ml-auto">
          {defaults.label}
        </Badge>
      </div>
    )
  }

  return (
    <Alert
      className={cn(
        "flex flex-col gap-3",
        state === "error" ? "border-destructive/40" : undefined,
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-muted-foreground">{defaults.icon}</span>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <AlertTitle className="mb-0">{displayTitle}</AlertTitle>
            <Badge variant={defaults.variant}>{defaults.label}</Badge>
            {chainLabel && (
              <span className="text-muted-foreground text-xs">{chainLabel}</span>
            )}
          </div>
          {displayDescription && (
            <AlertDescription className="mt-1 whitespace-pre-line">
              {displayDescription}
            </AlertDescription>
          )}
        </div>
      </div>

      {hash && (
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded bg-muted px-2 py-1 font-mono text-xs">
            {formatHash(hash)}
          </code>
          <CopyButton value={hash} label="Transaction hash copied" />
          {explorerUrl.length > 0 && (
            <Button asChild variant="secondary" size="sm">
              <a href={explorerUrl} target="_blank" rel="noreferrer">
                View on explorer
              </a>
            </Button>
          )}
        </div>
      )}
    </Alert>
  )
}

