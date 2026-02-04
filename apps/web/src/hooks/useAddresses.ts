/**
 * useAddresses - Hook for managing user wallet addresses
 *
 * Provides functionality to:
 * - Fetch all linked addresses for the current user
 * - Set the default address preference
 * - Track loading and error states
 *
 * Uses Convex for data persistence and real-time updates.
 */

import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { Id } from '../../../../convex/_generated/dataModel'
import { useTelegram } from '@/contexts/TelegramContext'
import { useCallback, useState } from 'react'

/**
 * Address data structure returned from Convex
 */
export interface UserAddress {
  _id: Id<'addresses'>
  _creationTime: number
  userId: Id<'users'>
  address: string
  status: 'pending' | 'verified'
  verifiedAt?: number
  verificationMethod?: 'siwe' | 'ens_telegram_match'
  siweNonce?: string
  siweMessage?: string
  siweSignature?: string
  ensName?: string
  ensAvatar?: string
  ensTelegram?: string
  ensTwitter?: string
  ensGithub?: string
  ensUrl?: string
  ensDescription?: string
  ensUpdatedAt?: number
  createdAt: number
  updatedAt: number
  isDefault: boolean
}

/**
 * Return type for useAddresses hook
 */
export interface UseAddressesResult {
  /** List of user's addresses with isDefault flag */
  addresses: UserAddress[]
  /** Whether addresses are loading */
  isLoading: boolean
  /** Error from query if any */
  error: Error | null
  /** Function to set an address as default */
  setDefault: (addressId: Id<'addresses'>) => Promise<void>
  /** Whether setDefault mutation is in progress */
  isSettingDefault: boolean
  /** Error from setDefault mutation if any */
  setDefaultError: Error | null
}

/**
 * Hook to manage user's linked wallet addresses
 *
 * @returns UseAddressesResult with addresses and setDefault function
 *
 * @example
 * ```tsx
 * function AddressList() {
 *   const { addresses, isLoading, setDefault, isSettingDefault } = useAddresses()
 *
 *   if (isLoading) return <Skeleton />
 *
 *   return (
 *     <RadioGroup
 *       value={addresses.find(a => a.isDefault)?._id}
 *       onValueChange={(id) => setDefault(id)}
 *     >
 *       {addresses.map(addr => (
 *         <RadioGroupItem key={addr._id} value={addr._id} />
 *       ))}
 *     </RadioGroup>
 *   )
 * }
 * ```
 */
export function useAddresses(): UseAddressesResult {
  const { initDataRaw, isLoading: telegramLoading } = useTelegram()
  const [setDefaultError, setSetDefaultError] = useState<Error | null>(null)
  const [isSettingDefault, setIsSettingDefault] = useState(false)

  // Query user's addresses
  const addresses = useQuery(
    api.ens.getUserAddresses,
    initDataRaw ? { initDataRaw } : 'skip'
  )

  // Mutation to set default address
  const setDefaultMutation = useMutation(api.ens.setDefaultAddress)

  const setDefault = useCallback(
    async (addressId: Id<'addresses'>) => {
      if (!initDataRaw) {
        setSetDefaultError(new Error('Not authenticated'))
        return
      }

      setIsSettingDefault(true)
      setSetDefaultError(null)

      try {
        await setDefaultMutation({ addressId, initDataRaw })
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to set default address')
        setSetDefaultError(error)
        throw error
      } finally {
        setIsSettingDefault(false)
      }
    },
    [initDataRaw, setDefaultMutation]
  )

  // Determine loading state
  const isLoading = telegramLoading || addresses === undefined

  return {
    addresses: addresses ?? [],
    isLoading,
    error: null, // Convex handles errors differently - they throw
    setDefault,
    isSettingDefault,
    setDefaultError,
  }
}
