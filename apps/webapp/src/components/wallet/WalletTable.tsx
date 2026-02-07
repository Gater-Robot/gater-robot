import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  CheckIcon,
  ChevronDownIcon,
  ClockIcon,
  ExternalLinkIcon,
  Loader2Icon,
  PlusIcon,
  ShieldCheckIcon,
  StarIcon,
  Trash2Icon,
} from "lucide-react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { ENSIdentityCard } from "@/components/ens"
import { SectionHeader } from "@/components/ui/section-header"
import { useAddAddress } from "@/hooks/useAddAddress"
import { useAddresses, type UserAddress } from "@/hooks/useAddresses"
import { useDeleteAddress } from "@/hooks/useDeleteAddress"
import { cn, truncateAddress } from "@/lib/utils"

type Id<TableName extends string> = string & { __tableName?: TableName }

// ─── ENS CTA ──────────────────────────────────────────────────────────
function ENSCallToAction() {
  return (
    <p className="px-1 pt-3 text-center text-xs leading-relaxed text-muted-foreground">
      Gater Communities are more powerful with an ENS name.{" "}
      <a
        href="https://app.ens.domains"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
      >
        Get one now
        <ExternalLinkIcon className="size-3" />
      </a>
    </p>
  )
}

// ─── Add Wallet Input ─────────────────────────────────────────────────
function AddWalletInput({ onAdded }: { onAdded?: () => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const { input, setInput, validationError, isValid, isAdding, addAddress, reset } =
    useAddAddress()

  const handleAdd = async () => {
    const ok = await addAddress()
    if (ok) {
      setIsOpen(false)
      onAdded?.()
    }
  }

  const handleCancel = () => {
    reset()
    setIsOpen(false)
  }

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="w-full border border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
        onClick={() => setIsOpen(true)}
      >
        <PlusIcon className="size-4" />
        Add Wallet
      </Button>
    )
  }

  return (
    <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="0x..."
          inputMode="text"
          autoFocus
          className={cn(
            "h-10 font-mono text-sm",
            isValid && "border-success focus-visible:border-success focus-visible:ring-success/30",
            validationError && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30"
          )}
          onKeyDown={(e) => {
            if (e.key === "Enter" && isValid && !isAdding) handleAdd()
            if (e.key === "Escape") handleCancel()
          }}
        />
        <Button
          size="sm"
          disabled={!isValid || isAdding}
          onClick={handleAdd}
          className="h-10 shrink-0 px-4"
        >
          {isAdding ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            "Add"
          )}
        </Button>
      </div>

      {validationError && (
        <p className="text-xs text-destructive">{validationError}</p>
      )}

      {!validationError && input.trim() && !isValid && (
        <p className="text-xs text-muted-foreground">Validating...</p>
      )}

      {/* F3: Cancel button with proper touch target */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleCancel}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        Cancel
      </Button>
    </div>
  )
}

// ─── Wallet Row (Accordion item) ──────────────────────────────────────
function WalletRow({
  address,
  onVerify,
  onDelete,
  onSetDefault,
  isSettingDefault,
  isDeleting,
  isConfirmingDelete,
}: {
  address: UserAddress
  onVerify?: (address: UserAddress) => void
  onDelete?: (addressId: Id<"addresses">) => void
  onSetDefault?: (addressId: Id<"addresses">) => void
  isSettingDefault: boolean
  isDeleting: boolean
  isConfirmingDelete: boolean
}) {
  const isVerified = address.status === "verified"
  const isPending = address.status === "pending"
  const displayName = address.ensName || truncateAddress(address.address)

  return (
    <AccordionItem
      value={address._id}
      className={cn(
        "overflow-hidden rounded-lg border transition-all",
        isVerified && address.isDefault
          ? "border-primary/30 bg-primary/5"
          : isVerified
            ? "border-success/20 bg-success/[0.03]"
            : "border-border bg-card",
        isPending && "opacity-75"
      )}
    >
      {/* Trigger — the visible row */}
      <AccordionTrigger className="px-3 py-3 hover:no-underline [&>svg]:hidden">
        <div className="flex w-full items-center gap-3">
          {/* F8: Status dot with aria-label */}
          <div
            role="img"
            aria-label={isVerified ? "Verified" : "Pending verification"}
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold",
              isVerified
                ? "bg-success/15 text-success"
                : "bg-muted text-muted-foreground"
            )}
          >
            {isVerified ? (
              <CheckIcon className="size-4" />
            ) : (
              <ClockIcon className="size-4" />
            )}
          </div>

          {/* Name + address */}
          <div className="min-w-0 flex-1 text-left">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "truncate text-sm font-medium",
                  !address.ensName && "font-mono"
                )}
              >
                {displayName}
              </span>
              {address.ensName && (
                <Badge variant="ens" size="sm">
                  ENS
                </Badge>
              )}
              {address.isDefault && (
                <StarIcon className="size-3 shrink-0 fill-primary text-primary" />
              )}
            </div>
            {address.ensName && (
              <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                {truncateAddress(address.address)}
              </p>
            )}
          </div>

          {/* Status badge */}
          <div className="flex shrink-0 items-center gap-1.5">
            {isVerified ? (
              <Badge variant="success" size="sm">
                <ShieldCheckIcon className="size-3" />
                Verified
              </Badge>
            ) : (
              <Badge variant="outline" size="sm" className="text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-600/40">
                <ClockIcon className="size-3" />
                Pending
              </Badge>
            )}
            <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
          </div>
        </div>
      </AccordionTrigger>

      {/* Expanded content — action buttons */}
      <AccordionContent className="px-3 pb-3">
        <div className="flex flex-wrap gap-2 border-t border-border/50 pt-3">
          {isPending && onVerify && (
            <Button
              size="sm"
              variant="default"
              onClick={() => onVerify(address)}
            >
              <ShieldCheckIcon className="size-3.5" />
              Verify
            </Button>
          )}

          {/* F5: per-row isSettingDefault */}
          {isVerified && !address.isDefault && onSetDefault && (
            <Button
              size="sm"
              variant="outline"
              disabled={isSettingDefault}
              onClick={() => onSetDefault(address._id)}
            >
              {isSettingDefault ? (
                <Loader2Icon className="size-3.5 animate-spin" />
              ) : (
                <StarIcon className="size-3.5" />
              )}
              Set as Default
            </Button>
          )}

          {address.isDefault && (
            <Badge variant="flux" size="lg" className="pointer-events-none">
              <StarIcon className="size-3 fill-primary" />
              Default Wallet
            </Badge>
          )}

          {/* F1: Delete with visual confirmation state */}
          {onDelete && (
            <Button
              size="sm"
              variant={isConfirmingDelete ? "destructive" : "ghost"}
              className={cn(
                "ml-auto",
                !isConfirmingDelete && "text-destructive hover:bg-destructive/10 hover:text-destructive"
              )}
              disabled={isDeleting}
              onClick={() => onDelete(address._id)}
            >
              {isDeleting ? (
                <Loader2Icon className="size-3.5 animate-spin" />
              ) : (
                <Trash2Icon className="size-3.5" />
              )}
              {isConfirmingDelete ? "Tap again to remove" : "Remove"}
            </Button>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────────────
function WalletTableSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
          <Skeleton className="size-9 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  )
}

// ─── Main WalletTable ─────────────────────────────────────────────────
export interface WalletTableProps {
  className?: string
  onVerify?: (address: UserAddress) => void
}

export function WalletTable({ className, onVerify }: WalletTableProps) {
  const {
    addresses,
    isLoading,
    error,
    setDefault,
    isSettingDefault,
  } = useAddresses()
  const { deleteAddress, deletingId } = useDeleteAddress()
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null)

  // F2: Clean up delete confirmation timer on unmount
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current)
    }
  }, [])

  // F7: Memoize derived data
  const defaultAddress = useMemo(
    () => addresses.find((a) => a.isDefault),
    [addresses]
  )
  const sortedAddresses = useMemo(
    () =>
      [...addresses].sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1
        if (!a.isDefault && b.isDefault) return 1
        if (a.status === "verified" && b.status !== "verified") return -1
        if (a.status !== "verified" && b.status === "verified") return 1
        return b._creationTime - a._creationTime
      }),
    [addresses]
  )

  // F5: Track which address is being set as default
  const handleSetDefault = useCallback(
    async (addressId: Id<"addresses">) => {
      setSettingDefaultId(addressId)
      try {
        await setDefault(addressId)
      } catch {
        // error surfaced via hook state
      } finally {
        setSettingDefaultId(null)
      }
    },
    [setDefault]
  )

  // F1 + F2: Delete with visual confirmation + timer cleanup
  const handleDelete = useCallback(
    async (addressId: Id<"addresses">) => {
      if (confirmDeleteId !== addressId) {
        setConfirmDeleteId(addressId)
        if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current)
        deleteTimerRef.current = setTimeout(() => setConfirmDeleteId(null), 3000)
        return
      }
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current)
      await deleteAddress(addressId)
      setConfirmDeleteId(null)
    },
    [confirmDeleteId, deleteAddress]
  )

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <SectionHeader>Wallets</SectionHeader>
        <WalletTableSkeleton />
      </div>
    )
  }

  // F9: Error state
  if (error) {
    return (
      <div className={cn("space-y-3", className)}>
        <SectionHeader>Wallets</SectionHeader>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center">
          <p className="text-sm text-destructive">Failed to load wallets</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Please try refreshing the app.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Section header */}
      <div className="flex items-center justify-between">
        <SectionHeader count={addresses.length}>Wallets</SectionHeader>
      </div>

      {/* ENS Identity Card for default address */}
      {defaultAddress && (
        <ENSIdentityCard
          address={defaultAddress.address as `0x${string}`}
          isVerified={defaultAddress.status === "verified"}
          isDefault
          compact
        />
      )}

      {/* Address rows */}
      {sortedAddresses.length > 0 ? (
        <Accordion type="single" collapsible className="space-y-2">
          {sortedAddresses.map((addr) => (
            <WalletRow
              key={addr._id}
              address={addr}
              onVerify={onVerify}
              onDelete={handleDelete}
              onSetDefault={handleSetDefault}
              isSettingDefault={isSettingDefault && settingDefaultId === addr._id}
              isDeleting={deletingId === addr._id}
              isConfirmingDelete={confirmDeleteId === addr._id}
            />
          ))}
        </Accordion>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card/50 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No wallets linked yet.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add a wallet address to get started.
          </p>
        </div>
      )}

      {/* Add wallet input */}
      <AddWalletInput />

      {/* ENS CTA */}
      {addresses.length > 0 && <ENSCallToAction />}
    </div>
  )
}
