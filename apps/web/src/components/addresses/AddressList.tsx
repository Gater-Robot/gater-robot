/**
 * AddressList - Component for displaying and managing linked wallet addresses
 *
 * Displays a list of user's linked wallet addresses with:
 * - Radio button selection for setting default address
 * - ENS name display when available
 * - Verification status badge
 * - Default badge for selected address
 *
 * Only verified addresses can be selected as default.
 */

import { useAddresses, type UserAddress } from '@/hooks/useAddresses'
import { RadioGroup, RadioGroupItem, Badge, Skeleton } from '@/components/ui'
import { truncateAddress } from '@/lib/utils'
import { Check, Clock, Loader2, Star } from 'lucide-react'
type Id<TableName extends string> = string & { __tableName?: TableName }

export interface AddressListProps {
  /** Optional className for styling */
  className?: string
  /** Called when default address changes */
  onDefaultChange?: (addressId: Id<'addresses'>) => void
}

/**
 * AddressList component for displaying user's linked wallet addresses
 *
 * @example
 * ```tsx
 * <AddressList onDefaultChange={(id) => console.log('New default:', id)} />
 * ```
 */
export function AddressList({ className, onDefaultChange }: AddressListProps) {
  const { addresses, isLoading, setDefault, isSettingDefault, setDefaultError } =
    useAddresses()

  const handleValueChange = async (value: string) => {
    const address = addresses.find(a => a._id === value)
    if (!address) return

    try {
      await setDefault(address._id)
      onDefaultChange?.(address._id)
    } catch {
      // Error handled in hook
    }
  }

  if (isLoading) {
    return <AddressListSkeleton />
  }

  if (addresses.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <p>No wallet addresses linked yet.</p>
        <p className="text-sm mt-1">Connect a wallet to get started.</p>
      </div>
    )
  }

  const defaultAddress = addresses.find((a) => a.isDefault)

  return (
    <div className={className}>
      {setDefaultError && (
        <div className="mb-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md">
          {setDefaultError.message}
        </div>
      )}

      <RadioGroup
        value={defaultAddress?._id}
        onValueChange={handleValueChange}
        disabled={isSettingDefault}
        className="space-y-3"
      >
        {addresses.map((address) => (
          <AddressItem
            key={address._id}
            address={address}
            isSettingDefault={isSettingDefault}
          />
        ))}
      </RadioGroup>
    </div>
  )
}

interface AddressItemProps {
  address: UserAddress
  isSettingDefault: boolean
}

function AddressItem({ address, isSettingDefault }: AddressItemProps) {
  const isVerified = address.status === 'verified'
  const displayName = address.ensName || truncateAddress(address.address)

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
        address.isDefault
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-muted-foreground/50'
      } ${!isVerified ? 'opacity-60' : ''}`}
    >
      {/* Radio button - disabled for unverified addresses */}
      <div className="flex items-center">
        {isSettingDefault && address.isDefault ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <RadioGroupItem
            value={address._id}
            id={address._id}
            disabled={!isVerified}
            aria-label={`Select ${displayName} as default`}
          />
        )}
      </div>

      {/* Address info */}
      <label
        htmlFor={address._id}
        className={`flex-1 min-w-0 ${isVerified ? 'cursor-pointer' : 'cursor-not-allowed'}`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          {/* ENS name or truncated address */}
          <span className={`font-medium ${address.ensName ? '' : 'font-mono'}`}>
            {displayName}
          </span>

          {/* ENS badge if has ENS name */}
          {address.ensName && (
            <Badge variant="ens" size="sm">
              ENS
            </Badge>
          )}
        </div>

        {/* Show full truncated address if ENS name is displayed */}
        {address.ensName && (
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            {truncateAddress(address.address)}
          </p>
        )}
      </label>

      {/* Status badges */}
      <div className="flex items-center gap-2">
        {/* Verification status */}
        {isVerified ? (
          <Badge variant="success" size="sm">
            <Check className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        ) : (
          <Badge variant="outline" size="sm">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        )}

        {/* Default indicator */}
        {address.isDefault && (
          <Badge variant="default" size="sm">
            <Star className="h-3 w-3 mr-1" />
            Default
          </Badge>
        )}
      </div>
    </div>
  )
}

function AddressListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 rounded-lg border border-border"
        >
          <Skeleton className="h-4 w-4 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-32 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
  )
}

export { AddressListSkeleton }
