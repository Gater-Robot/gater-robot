import * as React from "react"
import { SUPPORTED_CHAINS } from "@gater/chain-registry"

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { Field, FieldContent, FieldDescription, FieldTitle } from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

type ChainSelectProps = {
  value: number | null
  onChange: (chainId: number | null) => void
  disabled?: boolean
  className?: string
  label?: string
  description?: string
  showTestnetToggle?: boolean
}

export function ChainSelect({
  value,
  onChange,
  disabled = false,
  className,
  label = "Chain",
  description = "Select the chain where the token is deployed.",
  showTestnetToggle = import.meta.env.DEV,
}: ChainSelectProps) {
  const [showTestnets, setShowTestnets] = React.useState(false)

  const options = React.useMemo(() => {
    return SUPPORTED_CHAINS.filter((c) => showTestnets || !c.testnet)
  }, [showTestnets])

  const selected = React.useMemo(() => {
    if (value == null) return null
    return SUPPORTED_CHAINS.find((c) => c.chainId === value) ?? null
  }, [value])

  return (
    <Field className={cn(className)}>
      <FieldTitle>{label}</FieldTitle>
      <FieldContent>
        <div className="flex flex-col gap-3">
          <Combobox
            value={selected ? String(selected.chainId) : null}
            onValueChange={(next) => {
              if (!next) {
                onChange(null)
                return
              }
              onChange(Number(next))
            }}
            disabled={disabled}
          >
            <ComboboxInput
              placeholder="Search by chain name or ID…"
              showClear
            />
            <ComboboxContent>
              <ComboboxEmpty>No chains found.</ComboboxEmpty>
              <ComboboxList>
                {options.map((chain) => (
                  <ComboboxItem
                    key={chain.chainId}
                    value={String(chain.chainId)}
                    className="gap-3"
                  >
                    <img
                      src={chain.iconPath}
                      alt=""
                      className="size-5 rounded-sm"
                      loading="lazy"
                    />
                    <span className="flex flex-1 items-center justify-between gap-3">
                      <span className="truncate">
                        {chain.label}
                        <span className="sr-only"> {chain.chainId}</span>
                      </span>
                      <span className="text-muted-foreground font-mono text-xs">
                        {chain.chainId}
                      </span>
                    </span>
                  </ComboboxItem>
                ))}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>

          {showTestnetToggle && (
            <div className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2">
              <div className="flex flex-col">
                <span className="text-sm font-medium">Show testnets</span>
                <span className="text-muted-foreground text-xs">
                  Includes Sepolia and Base Sepolia.
                </span>
              </div>
              <Switch
                checked={showTestnets}
                onCheckedChange={setShowTestnets}
              />
            </div>
          )}
        </div>

        {description && <FieldDescription>{description}</FieldDescription>}
      </FieldContent>
    </Field>
  )
}
