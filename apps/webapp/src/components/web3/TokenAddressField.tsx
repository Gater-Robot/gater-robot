import * as React from "react"
import { getChainLabel, getExplorerAddressUrl } from "@gater/chain-registry"
import { ExternalLinkIcon } from "lucide-react"
import { isAddress, type Address } from "viem"

import type { Erc20TokenMetadata } from "@/hooks/web3/useErc20TokenMetadata"
import { useErc20TokenMetadata } from "@/hooks/web3/useErc20TokenMetadata"
import { CopyButton } from "@/components/CopyButton"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type TokenAddressFieldProps = {
  chainId: number | null
  value: string
  onChange: (value: string) => void
  account?: Address | null
  label?: string
  description?: string
  className?: string
  onTokenResolved?: (token: Erc20TokenMetadata) => void
  allowWatchAsset?: boolean
}

export function TokenAddressField({
  chainId,
  value,
  onChange,
  account,
  label = "Token address",
  description = "Enter a valid ERC-20 token address on the selected chain.",
  className,
  onTokenResolved,
  allowWatchAsset = true,
}: TokenAddressFieldProps) {
  const trimmed = value.trim()
  const validAddress = trimmed.length === 0 ? true : isAddress(trimmed, { strict: false })

  const query = useErc20TokenMetadata({
    chainId,
    tokenAddress: trimmed,
    account: account ?? undefined,
  })

  React.useEffect(() => {
    if (query.data && onTokenResolved) {
      onTokenResolved(query.data)
    }
  }, [query.data, onTokenResolved])

  const inlineError =
    chainId == null
      ? "Select a chain first."
      : !validAddress
        ? "Enter a valid EVM address (0x…)."
        : query.isError
          ? (query.error as Error)?.message ?? "Token lookup failed."
          : null

  const token = query.data ?? null
  const explorerUrl =
    token && chainId != null
      ? getExplorerAddressUrl(chainId, token.address)
      : ""

  return (
    <Field className={cn(className)} data-disabled={chainId == null}>
      <FieldTitle>{label}</FieldTitle>
      <FieldContent>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={chainId ? "0x…" : "Select a chain first"}
          disabled={chainId == null}
          className={cn(
            "font-mono",
            !validAddress || query.isError ? "border-destructive/60" : undefined,
          )}
        />

        {description && <FieldDescription>{description}</FieldDescription>}

        {query.isFetching && validAddress && trimmed.length > 0 && chainId != null && (
          <div className="text-muted-foreground text-sm">
            Checking token on {getChainLabel(chainId)}…
          </div>
        )}

        {token && (
          <Card className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-medium">
                    {token.name}{" "}
                    <span className="text-muted-foreground font-mono">
                      ({token.symbol})
                    </span>
                  </div>
                </div>
                <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono">{token.address}</span>
                  <CopyButton value={token.address} label="Token address copied" />
                  {explorerUrl.length > 0 && (
                    <Button asChild variant="secondary" size="sm">
                      <a href={explorerUrl} target="_blank" rel="noreferrer">
                        <ExternalLinkIcon className="mr-2 size-4" />
                        Explorer
                      </a>
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="text-muted-foreground text-xs">
                  Decimals: <span className="font-mono">{token.decimals}</span>
                </div>
                {token.balance != null && (
                  <div className="text-muted-foreground text-xs">
                    Balance:{" "}
                    <span className="font-mono">
                      {token.balance} {token.symbol}
                    </span>
                  </div>
                )}
                {allowWatchAsset && token && typeof window !== "undefined" && (window as any).ethereum && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      try {
                        await (window as any).ethereum.request?.({
                          method: "wallet_watchAsset",
                          params: {
                            type: "ERC20",
                            options: {
                              address: token.address,
                              symbol: token.symbol?.slice(0, 11) || "TOKEN",
                              decimals: token.decimals,
                            },
                          },
                        })
                      } catch {
                        // Token add UX is best-effort; callers can provide their own toast if desired.
                      }
                    }}
                  >
                    Add token to wallet
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )}

        {inlineError && (
          <FieldError errors={[{ message: inlineError }]} />
        )}
      </FieldContent>
    </Field>
  )
}

