/**
 * UserPage - User profile and wallet management
 *
 * Shows the current user's profile including:
 * - Telegram identity
 * - Linked wallet addresses
 * - ENS resolution for linked addresses
 * - Default address selection
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
import { User, Wallet, Plus, Settings } from 'lucide-react'

export function UserPage() {
  const { user, isLoading, isInTelegram } = useTelegram()

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
                <Wallet className="h-5 w-5" />
                Linked Wallets
              </CardTitle>
              <CardDescription>
                Wallet addresses linked to your account
              </CardDescription>
            </div>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Link Wallet
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Placeholder for wallet list */}
          <div className="text-center py-8 text-muted-foreground">
            <Wallet className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p>No wallets linked yet</p>
            <p className="text-sm">
              Connect a wallet to verify your on-chain identity
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ENS Identity Card - Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>ENS Identity</CardTitle>
          <CardDescription>
            Your Ethereum Name Service identity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Link a wallet to view your ENS identity</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
