import { Link, useSearchParams } from "react-router-dom"
import {
  ChevronRightIcon,
  ShieldCheckIcon,
  UserIcon,
  WalletIcon,
} from "lucide-react"
import { StatusBanner } from "@/components/ui/status-banner"
import { useAccount } from "wagmi"

import { EligibilityChecker } from "@/components/eligibility/EligibilityChecker"
import { ConnectWallet } from "@/components/wallet/ConnectWallet"
import { TelegramLinkVerify } from "@/components/ens/TelegramLinkVerify"
import { SIWEButton } from "@/components/wallet/SIWEButton"
import { WalletTable } from "@/components/wallet/WalletTable"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { PulseDot } from "@/components/ui/pulse-dot"
import { SectionHeader } from "@/components/ui/section-header"
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
  const { addresses } = useAddresses()
  const hasLinkedAddresses = addresses.length > 0
  const hasVerifiedAddress = addresses.some((a: any) => a.verifiedAt)
  const [searchParams] = useSearchParams()

  const urlChannelId = searchParams.get("channelId")

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
      {/* Page header */}
      <div className="flex items-center gap-3 fade-up stagger-1">
        <PulseDot color="bg-primary" size="sm" />
        <h1 className="text-xl font-bold tracking-tight">
          Hey, <span className="text-primary">{user.firstName}</span>
        </h1>
        <Badge variant="flux" size="sm">
          {hasVerifiedAddress ? "VERIFIED" : "SETUP"}
        </Badge>
      </div>

      {/* Status banner */}
      <div className="fade-up stagger-2">
        <UserStatusBanner
          hasWallet={hasLinkedAddresses}
          isVerified={hasVerifiedAddress}
        />
      </div>

      {/* Identity card - compact */}
      <div className="rounded-xl border border-border bg-[var(--color-surface-alt)] p-4 fade-up stagger-2">
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary text-sm font-bold text-primary-foreground",
            hasVerifiedAddress && "ring-2 ring-primary/20 shadow-[0_0_12px_var(--color-glow)]"
          )}>
            {user.firstName.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">
              {user.firstName}
              {user.lastName ? ` ${user.lastName}` : ""}
            </p>
            {user.username && (
              <p className="truncate text-sm text-muted-foreground">
                @{user.username}
              </p>
            )}
          </div>
          <div className="flex shrink-0 gap-1.5">
            <Badge variant="flux" size="sm">{user.id}</Badge>
            {user.isPremium && <Badge variant="ens" size="sm">PRO</Badge>}
          </div>
        </div>
      </div>

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

      {/* Wallets section — accordion table with add/verify/delete/default */}
      <section className="fade-up stagger-3">
        <WalletTable
          onVerify={() => {
            // Future: scroll to SIWE/ENS verify section
          }}
        />
      </section>

      {/* Channel eligibility */}
      {urlChannelId ? (
        <section className="space-y-1.5 fade-up stagger-5">
          <SectionHeader>Channel Eligibility</SectionHeader>
          <EligibilityChecker channelId={urlChannelId as Id<"channels">} compact />
        </section>
      ) : (
        <section className="fade-up stagger-5">
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
