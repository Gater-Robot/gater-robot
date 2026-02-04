import { Link, useSearchParams } from "react-router-dom"
import { ExternalLinkIcon, SettingsIcon, ShieldIcon, UserIcon, WalletIcon } from "lucide-react"
import { useAccount } from "wagmi"

import { AddressList } from "@/components/addresses/AddressList"
import { EligibilityChecker } from "@/components/eligibility/EligibilityChecker"
import { ENSIdentityCard } from "@/components/ens"
import { ConnectWallet } from "@/components/wallet/ConnectWallet"
import { SIWEButton } from "@/components/wallet/SIWEButton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useTelegram } from "@/contexts/TelegramContext"
import { useAddresses } from "@/hooks/useAddresses"

type Id<TableName extends string> = string & { __tableName?: TableName }

export function UserPage() {
  const { user, isLoading, isInTelegram, startParam } = useTelegram()
  const { address, isConnected } = useAccount()
  const { addresses } = useAddresses()
  const hasLinkedAddresses = addresses.length > 0
  const [searchParams] = useSearchParams()

  const urlChannelId = searchParams.get("channelId")
  const channelIdFromStartParam = startParam?.startsWith("channel_")
    ? startParam.replace("channel_", "")
    : startParam
  const channelId = urlChannelId || channelIdFromStartParam

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!user) {
    return (
      <Card className="py-0">
        <CardContent className="pt-6">
          <div className="py-8 text-center">
            <UserIcon className="mx-auto mb-4 size-12 text-muted-foreground" />
            <h2 className="mb-2 text-xl font-semibold">Not Authenticated</h2>
            <p className="text-muted-foreground">
              {isInTelegram
                ? "Unable to load user data from Telegram."
                : "Please open this app in Telegram to authenticate."}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className="text-muted-foreground">
            Manage your identity and linked wallets.
          </p>
        </div>
        <Button variant="outline" size="sm" disabled>
          <SettingsIcon className="size-4" />
          Settings
        </Button>
      </div>

      <Card className="py-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="size-5" />
            Telegram Identity
          </CardTitle>
          <CardDescription>Your Telegram account information.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            <div className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-2xl font-bold text-white">
              {user.firstName.charAt(0)}
            </div>

            <div className="flex-1 space-y-2">
              <div>
                <h3 className="text-lg font-semibold">
                  {user.firstName}
                  {user.lastName ? ` ${user.lastName}` : ""}
                </h3>
                {user.username && (
                  <p className="text-muted-foreground">@{user.username}</p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">ID: {user.id}</Badge>
                {user.isPremium && <Badge variant="ens">Premium</Badge>}
                {user.languageCode && (
                  <Badge variant="secondary">
                    {user.languageCode.toUpperCase()}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <WalletIcon className="size-5" />
            Linked Wallets
          </CardTitle>
          <CardDescription>
            Wallet addresses linked to your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasLinkedAddresses && (
            <div className="mb-6">
              <p className="mb-3 text-sm text-muted-foreground">
                Select a default address for eligibility checks:
              </p>
              <AddressList />
            </div>
          )}

          {isConnected && address ? (
            <div className="space-y-4">
              {hasLinkedAddresses && (
                <div className="border-t pt-4">
                  <p className="mb-2 text-sm font-medium">Add another wallet</p>
                </div>
              )}
              <ConnectWallet />
              <div className="border-t pt-4">
                <p className="mb-3 text-sm text-muted-foreground">
                  Sign a message to verify wallet ownership and link it to your
                  Telegram account.
                </p>
                <SIWEButton />
              </div>
            </div>
          ) : !hasLinkedAddresses ? (
            <div className="py-8 text-center text-muted-foreground">
              <WalletIcon className="mx-auto mb-3 size-8 opacity-50" />
              <p className="mb-4">No wallets linked yet.</p>
              <ConnectWallet />
            </div>
          ) : (
            <div className="border-t pt-4">
              <p className="mb-2 text-sm font-medium">Add another wallet</p>
              <ConnectWallet />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardHeader>
          <CardTitle>ENS Identity</CardTitle>
          <CardDescription>Your Ethereum Name Service identity.</CardDescription>
        </CardHeader>
        <CardContent>
          {isConnected && address ? (
            <ENSIdentityCard address={address} />
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <p>Connect a wallet to view your ENS identity.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldIcon className="size-5" />
            Channel Eligibility
          </CardTitle>
          <CardDescription>
            Check your eligibility for token-gated channels.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {channelId ? (
            <EligibilityChecker channelId={channelId as Id<"channels">} compact />
          ) : (
            <div className="py-8 text-center">
              <ShieldIcon className="mx-auto mb-4 size-12 text-muted-foreground/60" />
              <h3 className="mb-2 text-lg font-medium">Check Eligibility</h3>
              <p className="mx-auto mb-4 max-w-md text-muted-foreground">
                Visit a token-gated channel to check if your wallet balances
                meet the requirements.
              </p>
              <Link to="/get-eligible">
                <Button variant="outline">
                  <ExternalLinkIcon className="size-4" />
                  View Eligibility Requirements
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
