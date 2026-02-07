import * as React from "react"
import { Link, useSearchParams } from "react-router-dom"
import {
  AlertTriangleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ShieldCheckIcon,
  UserIcon,
  WalletIcon,
} from "lucide-react"
import { StatusBanner } from "@/components/ui/status-banner"
import { useAccount } from "wagmi"

import { WalletTable } from "@/components/addresses/WalletTable"
import { EligibilityChecker } from "@/components/eligibility/EligibilityChecker"
import { IdentityCard } from "@/components/ens"
import { ConnectWallet } from "@/components/wallet/ConnectWallet"
import { TelegramLinkVerify } from "@/components/ens/TelegramLinkVerify"
import { SIWEButton } from "@/components/wallet/SIWEButton"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { PulseDot } from "@/components/ui/pulse-dot"
import { SectionHeader } from "@/components/ui/section-header"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useTelegram } from "@/contexts/TelegramContext"
import { useAddresses } from "@/hooks/useAddresses"
import { cn } from "@/lib/utils"

type Id<TableName extends string> = string & { __tableName?: TableName }

function UserStatusBanner({
  hasWallet,
  isVerified,
}: {
  hasWallet: boolean
  isVerified: boolean
}) {
  if (!hasWallet) {
    return (
      <StatusBanner
        variant="warning"
        icon={<WalletIcon className="size-4" />}
        title="Connect a wallet"
        description="Link a wallet to check channel eligibility"
      />
    )
  }

  if (!isVerified) {
    return (
      <StatusBanner
        variant="warning"
        icon={<ShieldCheckIcon className="size-4" />}
        title="Verify your wallet"
        description="Sign a message to prove ownership"
      />
    )
  }

  return (
    <StatusBanner
      variant="success"
      icon={<ShieldCheckIcon className="size-4" />}
      title="You're all set"
      description="Wallet linked and verified"
    />
  )
}

export function UserPage() {
  const { user, isLoading, isInTelegram } = useTelegram()
  const { address, isConnected } = useAccount()
  const { addresses, isLoading: isLoadingAddresses } = useAddresses()
  const hasLinkedAddresses = addresses.length > 0
  const hasVerifiedAddress = addresses.some((a: any) => a.verifiedAt)
  const defaultAddress = addresses.find((a) => a.isDefault) || addresses[0]
  const [searchParams] = useSearchParams()

  const urlChannelId = searchParams.get("channelId")

  // Collapsible status banner state
  const [isStatusOpen, setIsStatusOpen] = React.useState(false)
  const isHealthy = hasLinkedAddresses && hasVerifiedAddress

  if (isLoading) {
    return (
      <div className="space-y-4 fade-up">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted">
          <UserIcon className="size-8 text-muted-foreground" />
        </div>
        <h2 className="mb-2 text-xl font-semibold">Not Authenticated</h2>
        <p className="max-w-xs text-sm text-muted-foreground">
          {isInTelegram
            ? "Unable to load user data from Telegram."
            : "Please open this app in Telegram to authenticate."}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Page header with collapsible status */}
      <Collapsible open={isStatusOpen} onOpenChange={setIsStatusOpen}>
        <div className="flex items-center justify-between gap-3 fade-up stagger-1">
          {/* Left side: user greeting */}
          <div className="flex items-center gap-3">
            <PulseDot color="bg-primary" size="sm" />
            <h1 className="text-xl font-bold tracking-tight">
              Hey, <span className="text-primary">{user.username ? `@${user.username}` : user.firstName}</span>
            </h1>
            <Badge variant="flux" size="sm">
              {hasVerifiedAddress ? "VERIFIED" : "SETUP"}
            </Badge>
          </div>

          {/* Right side: health status toggle */}
          <CollapsibleTrigger asChild>
            <button
              type="button"
              aria-label={isHealthy
                ? "Health status: All systems operational"
                : "Health status: Action required"}
              className={cn(
                "flex items-center gap-1.5",
                "rounded-lg p-1.5",
                "transition-all",
                "hover:bg-accent",
                "active:scale-[0.98]",
                "focus-visible:border-ring",
                "focus-visible:ring-ring/50",
                "focus-visible:ring-[3px]",
                "outline-none",
                "[&[data-state=open]>svg]:rotate-180"
              )}
            >
              {isHealthy ? (
                <ShieldCheckIcon className="size-5 text-success" />
              ) : (
                <AlertTriangleIcon className="size-5 text-warning" />
              )}
              <ChevronDownIcon className="size-4 text-muted-foreground transition-transform duration-200" />
            </button>
          </CollapsibleTrigger>
        </div>

        {/* Collapsible status banner */}
        <CollapsibleContent className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden">
          <div className="pt-3 fade-up stagger-2">
            <UserStatusBanner
              hasWallet={hasLinkedAddresses}
              isVerified={hasVerifiedAddress}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Identity card - ENS profile or Telegram fallback */}
      <IdentityCard
        className="fade-up stagger-2"
        telegramUser={user}
        defaultAddress={defaultAddress?.address as `0x${string}` | undefined}
        isLoadingAddresses={isLoadingAddresses}
        hasVerifiedAddress={hasVerifiedAddress}
      />

      {/* Primary action - contextual */}
      {!isConnected ? (
        <section className="space-y-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 fade-up stagger-3">
          <SectionHeader>Get Started</SectionHeader>
          <p className="text-sm text-muted-foreground">Connect your wallet to unlock token-gated channels.</p>
          <ConnectWallet />
        </section>
      ) : !hasVerifiedAddress && address ? (
        <section className="space-y-1.5 fade-up stagger-3">
          <SectionHeader>Verify Wallet</SectionHeader>
          <TelegramLinkVerify
            address={address}
            telegramUsername={user?.username ?? null}
          />
          <p className="text-xs text-muted-foreground">
            Or sign a message to prove you own this address.
          </p>
          <SIWEButton />
        </section>
      ) : null}

      {/* Wallets section */}
      {hasLinkedAddresses && (
        <section className="space-y-1.5 fade-up stagger-3">
          <div className="flex items-center justify-between">
            <SectionHeader count={addresses.length}>Wallets</SectionHeader>
            {isConnected && (
              <ConnectWallet />
            )}
          </div>
          <div className="rounded-xl border border-border bg-[var(--color-surface-alt)] p-3">
            <WalletTable />
          </div>
        </section>
      )}

      {/* Channel eligibility */}
      {urlChannelId ? (
        <section className="space-y-1.5 fade-up stagger-4">
          <SectionHeader>Channel Eligibility</SectionHeader>
          <EligibilityChecker channelId={urlChannelId as Id<"channels">} compact />
        </section>
      ) : (
        <section className="fade-up stagger-4">
          <Link
            to="/get-eligible"
            className="group flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-[0_0_16px_var(--color-glow)]"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <ShieldCheckIcon className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Check Eligibility</p>
                <p className="text-xs text-muted-foreground">See if you qualify for gated channels</p>
              </div>
            </div>
            <ChevronRightIcon className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
          </Link>
        </section>
      )}
    </div>
  )
}
