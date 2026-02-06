import { Link, useSearchParams } from "react-router-dom"
import {
  ChevronRightIcon,
  ShieldCheckIcon,
  UserIcon,
  WalletIcon,
} from "lucide-react"
import { StatusBanner } from "@/components/ui/status-banner"
import { useAccount } from "wagmi"

import { AddressList } from "@/components/addresses/AddressList"
import { EligibilityChecker } from "@/components/eligibility/EligibilityChecker"
import { ENSIdentityCard } from "@/components/ens"
import { ConnectWallet } from "@/components/wallet/ConnectWallet"
import { TelegramLinkVerify } from "@/components/ens/TelegramLinkVerify"
import { SIWEButton } from "@/components/wallet/SIWEButton"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useTelegram } from "@/contexts/TelegramContext"
import { useAddresses } from "@/hooks/useAddresses"

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
      <div className="space-y-4">
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
      <div>
        <h1 className="text-xl font-semibold">
          Hey, {user.firstName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your identity and wallets
        </p>
      </div>

      {/* Status banner */}
      <UserStatusBanner
        hasWallet={hasLinkedAddresses}
        isVerified={hasVerifiedAddress}
      />

      {/* Identity card - compact */}
      <Card className="card-glow overflow-hidden py-0">
        <CardContent className="px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary text-sm font-bold text-primary-foreground">
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
              <Badge variant="outline" size="sm">
                {user.id}
              </Badge>
              {user.isPremium && <Badge variant="ens" size="sm">PRO</Badge>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Primary action - contextual */}
      {!isConnected ? (
        <section className="space-y-1.5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Get Started
          </h2>
          <ConnectWallet />
        </section>
      ) : !hasVerifiedAddress && address ? (
        <section className="space-y-1.5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Verify Wallet
          </h2>
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
        <section className="space-y-1.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Wallets ({addresses.length})
            </h2>
            {isConnected && (
              <ConnectWallet />
            )}
          </div>
          <Card className="card-glow py-0">
            <CardContent className="px-3 py-2">
              <AddressList />
            </CardContent>
          </Card>
        </section>
      )}

      {/* ENS Identity - expandable section */}
      {isConnected && address && (
        <section className="space-y-1.5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            ENS Identity
          </h2>
          <Card className="card-glow py-0">
            <CardContent className="px-3 py-2">
              <ENSIdentityCard address={address} compact />
            </CardContent>
          </Card>
        </section>
      )}

      {/* Channel eligibility */}
      {urlChannelId ? (
        <section className="space-y-1.5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Channel Eligibility
          </h2>
          <EligibilityChecker channelId={urlChannelId as Id<"channels">} compact />
        </section>
      ) : (
        <section>
          <Link
            to="/get-eligible"
            className="card-glow flex items-center justify-between rounded-lg border bg-card px-3 py-2 transition-colors hover:bg-accent"
          >
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="size-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Check Eligibility</p>
                <p className="text-xs text-muted-foreground">
                  See if you qualify for gated channels
                </p>
              </div>
            </div>
            <ChevronRightIcon className="size-4 text-muted-foreground" />
          </Link>
        </section>
      )}
    </div>
  )
}
