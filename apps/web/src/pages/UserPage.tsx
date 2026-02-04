/**
 * UserPage - User profile and wallet management
 *
 * Shows the current user's profile including:
 * - Telegram identity
 * - Linked wallet addresses
 * - ENS resolution for linked addresses
 * - Default address selection
 * - Eligibility checking for gated channels
 */

import { useTelegram } from '@/contexts/TelegramContext'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Skeleton,
} from '@/components/ui'
import { ConnectWallet, SIWEButton } from '@/components/wallet'
import { ENSIdentityCard } from '@/components/ens'
import { AddressList } from '@/components/addresses'
import { EligibilityChecker } from '@/components/eligibility'
import { useAddresses } from '@/hooks/useAddresses'
import { User, Wallet as WalletIcon, Settings, Shield, ExternalLink } from 'lucide-react'
import { useAccount } from 'wagmi'
import { useSearchParams, Link } from 'react-router-dom'
import { Id } from '../../../../convex/_generated/dataModel'

export function UserPage() {
  const { user, isLoading, isInTelegram, startParam } = useTelegram()
  const { address, isConnected } = useAccount()
  const { addresses } = useAddresses()
  const hasLinkedAddresses = addresses.length > 0
  const [searchParams] = useSearchParams()

  // Get channelId from URL params or Telegram startParam
  // startParam format could be "channel_<channelId>" or just the channelId
  const urlChannelId = searchParams.get('channelId')
  const channelIdFromStartParam = startParam?.startsWith('channel_')
    ? startParam.replace('channel_', '')
    : startParam
  const channelId = urlChannelId || channelIdFromStartParam

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Not Authenticated</h2>
              <p className="text-muted-foreground">
                {isInTelegram
                  ? 'Unable to load user data from Telegram.'
                  : 'Please open this app in Telegram to authenticate.'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className="text-muted-foreground">
            Manage your identity and linked wallets
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </div>

      {/* Telegram Identity Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Telegram Identity
          </CardTitle>
          <CardDescription>
            Your Telegram account information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
              {user.firstName.charAt(0)}
            </div>

            {/* Info */}
            <div className="flex-1 space-y-2">
              <div>
                <h3 className="text-lg font-semibold">
                  {user.firstName}
                  {user.lastName ? ` ${user.lastName}` : ''}
                </h3>
                {user.username && (
                  <p className="text-muted-foreground">@{user.username}</p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">ID: {user.id}</Badge>
                {user.isPremium && <Badge variant="ens">Premium</Badge>}
                {user.languageCode && (
                  <Badge variant="secondary">{user.languageCode.toUpperCase()}</Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Linked Wallets Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <WalletIcon className="h-5 w-5" />
                Linked Wallets
              </CardTitle>
              <CardDescription>
                Wallet addresses linked to your account
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Show linked addresses if any exist */}
          {hasLinkedAddresses && (
            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-3">
                Select a default address for eligibility checks:
              </p>
              <AddressList />
            </div>
          )}

          {/* Wallet connection and verification section */}
          {isConnected && address ? (
            <div className="space-y-4">
              {hasLinkedAddresses && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-2">Add another wallet</p>
                </div>
              )}
              <ConnectWallet />
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground mb-3">
                  Sign a message to verify wallet ownership and link it to your Telegram account.
                </p>
                <SIWEButton
                  onSuccess={() => {
                    console.log('Wallet verified successfully!')
                  }}
                  onError={(error) => {
                    console.error('Wallet verification failed:', error)
                  }}
                />
              </div>
            </div>
          ) : !hasLinkedAddresses ? (
            <div className="text-center py-8 text-muted-foreground">
              <WalletIcon className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p className="mb-4">No wallets linked yet</p>
              <ConnectWallet />
            </div>
          ) : (
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-2">Add another wallet</p>
              <ConnectWallet />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ENS Identity Card */}
      <Card>
        <CardHeader>
          <CardTitle>ENS Identity</CardTitle>
          <CardDescription>
            Your Ethereum Name Service identity
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isConnected && address ? (
            <ENSIdentityCard address={address} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Connect a wallet to view your ENS identity</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Eligibility Check Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Channel Eligibility
          </CardTitle>
          <CardDescription>
            Check your eligibility for token-gated channels
          </CardDescription>
        </CardHeader>
        <CardContent>
          {channelId ? (
            // Show eligibility checker if we have a channelId
            <EligibilityChecker
              channelId={channelId as Id<'channels'>}
              compact
            />
          ) : (
            // Show guidance when no channelId is provided
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Check Eligibility</h3>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                Visit a token-gated channel to check if your wallet balances meet the requirements.
              </p>
              <Link to="/get-eligible">
                <Button variant="outline">
                  <ExternalLink className="h-4 w-4 mr-2" />
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
