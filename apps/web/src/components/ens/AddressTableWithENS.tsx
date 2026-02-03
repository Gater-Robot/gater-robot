/**
 * AddressTableWithENS - Multi-Address Table with ENS Identity
 *
 * Displays a user's linked wallet addresses with:
 * - ENS identity for each address
 * - Verification status (verified/pending)
 * - Default address selection
 * - Actions for verification
 *
 * This implements the demo requirement:
 * "3 addresses table: 2 verified, 1 pending"
 */

import { useState } from 'react'
import { ENSIdentityCard } from './ENSIdentityCard'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@/components/ui'
import { Check, Clock, Star } from 'lucide-react'

export interface AddressData {
  id: string
  address: `0x${string}`
  status: 'verified' | 'pending'
  isDefault: boolean
  ensName?: string | null
  ensTelegram?: string | null
  verificationMethod?: 'siwe' | 'ens_telegram_match'
}

export interface AddressTableWithENSProps {
  /** List of addresses to display */
  addresses: AddressData[]
  /** Callback when user sets a new default address */
  onSetDefault?: (addressId: string) => void
  /** Callback when user wants to verify an address */
  onVerify?: (addressId: string) => void
  /** Current Telegram username for matching */
  telegramUsername?: string | null
}

export function AddressTableWithENS({
  addresses,
  onSetDefault,
  onVerify,
  telegramUsername: _telegramUsername,
}: AddressTableWithENSProps) {
  // Note: telegramUsername reserved for future ENS telegram matching in table
  void _telegramUsername
  const [selectedDefault, setSelectedDefault] = useState<string>(
    addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id
  )

  const handleSetDefault = (addressId: string) => {
    const address = addresses.find((a) => a.id === addressId)
    if (address?.status !== 'verified') return
    setSelectedDefault(addressId)
    onSetDefault?.(addressId)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
          Linked Wallets
        </CardTitle>
        <CardDescription>
          Manage your connected wallet addresses. Select a default identity to use
          across the platform.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className={`flex items-center gap-4 py-4 first:pt-0 last:pb-0 ${
                addr.isDefault ? 'bg-primary/5 -mx-4 px-4 rounded-lg' : ''
              }`}
            >
              {/* Default selection radio */}
              <button
                onClick={() => handleSetDefault(addr.id)}
                disabled={addr.status !== 'verified'}
                className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  selectedDefault === addr.id
                    ? 'border-primary bg-primary'
                    : addr.status === 'verified'
                    ? 'border-muted-foreground/40 hover:border-primary/60'
                    : 'border-muted-foreground/20 cursor-not-allowed'
                }`}
                title={
                  addr.status !== 'verified'
                    ? 'Verify this address to set as default'
                    : 'Set as default identity'
                }
              >
                {selectedDefault === addr.id && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </button>

              {/* ENS Identity */}
              <div className="flex-1 min-w-0">
                <ENSIdentityCard
                  address={addr.address}
                  isVerified={addr.status === 'verified'}
                  isDefault={selectedDefault === addr.id}
                  telegramMatched={addr.verificationMethod === 'ens_telegram_match'}
                  compact
                />
              </div>

              {/* Status & Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {addr.status === 'verified' ? (
                  <Badge variant="success" className="gap-1">
                    <Check className="h-3 w-3" />
                    Verified
                    {addr.verificationMethod === 'ens_telegram_match' && (
                      <span className="text-[10px] opacity-75">(ENS)</span>
                    )}
                  </Badge>
                ) : (
                  <>
                    <Badge variant="outline" className="gap-1">
                      <Clock className="h-3 w-3" />
                      Pending
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onVerify?.(addr.id)}
                    >
                      Verify
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {addresses.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No wallets connected yet.</p>
            <p className="text-sm mt-1">
              Connect a wallet to get started with ENS identity.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Demo data for showcasing the component
 * Uses known ENS addresses for realistic display
 */
export const DEMO_ADDRESSES: AddressData[] = [
  {
    id: '1',
    address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', // vitalik.eth
    status: 'verified',
    isDefault: true,
    ensName: 'vitalik.eth',
    verificationMethod: 'siwe',
  },
  {
    id: '2',
    address: '0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5', // nick.eth
    status: 'verified',
    isDefault: false,
    ensName: 'nick.eth',
    verificationMethod: 'ens_telegram_match',
  },
  {
    id: '3',
    address: '0x983110309620D911731Ac0932219af06091b6744', // random address
    status: 'pending',
    isDefault: false,
    ensName: null,
  },
]
