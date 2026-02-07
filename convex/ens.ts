/**
 * ENS Mutations and Queries for Gater Robot
 *
 * Handles ENS data caching, auto-verification via org.telegram,
 * and address management.
 */

import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { createPublicClient, getAddress, http, isAddress } from 'viem'
import { mainnet } from 'viem/chains'
import { requireAuth } from './lib/auth'

const ENS_RPC_URL = process.env.MAINNET_RPC_URL || 'https://cloudflare-eth.com'

const ensClient = createPublicClient({
  chain: mainnet,
  transport: http(ENS_RPC_URL),
})

const normalizeAddress = (address: string) => {
  if (!isAddress(address)) {
    throw new Error('Invalid address')
  }
  return getAddress(address)
}

const normalizeUsername = (value: string) =>
  value.trim().replace(/^@/, '').toLowerCase()

const resolveEnsTelegram = async (ensName: string) => {
  const [resolvedAddress, ensTelegram] = await Promise.all([
    ensClient.getEnsAddress({ name: ensName }),
    ensClient.getEnsText({ name: ensName, key: 'org.telegram' }),
  ])

  return {
    resolvedAddress,
    ensTelegram: ensTelegram ? normalizeUsername(ensTelegram) : null,
  }
}

/**
 * Auto-verify a wallet based on ENS org.telegram match
 *
 * This is the "wow feature" - if a user's ENS org.telegram matches
 * their Telegram username, we can verify their wallet ownership
 * without requiring a SIWE signature!
 */
export const autoVerifyTelegramLink = mutation({
  args: {
    initDataRaw: v.string(),
    address: v.string(),
    ensName: v.string(),
    ensTelegram: v.string(),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuth(ctx, args.initDataRaw)
    // Find or create user
    let user = await ctx.db
      .query('users')
      .withIndex('by_telegram_id', (q) =>
        q.eq('telegramUserId', authUser.id)
      )
      .unique()

    if (!user) {
      const userId = await ctx.db.insert('users', {
        telegramUserId: authUser.id,
        createdAt: Date.now(),
        lastSeenAt: Date.now(),
      })
      user = await ctx.db.get(userId)
    }

    if (!user) throw new Error('Failed to create user')

    // Normalize address
    const normalizedAddress = normalizeAddress(args.address)
    const normalizedTelegram = normalizeUsername(args.ensTelegram)
    const { resolvedAddress, ensTelegram } = await resolveEnsTelegram(args.ensName)

    if (!resolvedAddress || normalizeAddress(resolvedAddress) !== normalizedAddress) {
      throw new Error('ENS name does not resolve to the provided address')
    }

    if (!ensTelegram || ensTelegram !== normalizedTelegram) {
      throw new Error('ENS org.telegram does not match the provided Telegram username')
    }

    // Check if address already exists
    let addressRecord = await ctx.db
      .query('addresses')
      .withIndex('by_address', (q) => q.eq('address', normalizedAddress))
      .unique()

    const now = Date.now()

    if (addressRecord) {
      if (addressRecord.userId !== user._id) {
        throw new Error('Address already linked to another user')
      }
      // Update existing address
      await ctx.db.patch(addressRecord._id, {
        status: 'verified',
        verifiedAt: now,
        verificationMethod: 'ens_telegram_match',
        ensName: args.ensName,
        ensTelegram: ensTelegram,
        ensUpdatedAt: now,
        updatedAt: now,
      })
    } else {
      // Create new verified address
      const addressId = await ctx.db.insert('addresses', {
        userId: user._id,
        address: normalizedAddress,
        status: 'verified',
        verifiedAt: now,
        verificationMethod: 'ens_telegram_match',
        ensName: args.ensName,
        ensTelegram: ensTelegram,
        ensUpdatedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      addressRecord = await ctx.db.get(addressId)
    }

    // Update user's primary ENS if not set
    if (!user.primaryEnsName && addressRecord) {
      await ctx.db.patch(user._id, {
        primaryEnsName: args.ensName,
        defaultAddressId: addressRecord._id,
        lastSeenAt: now,
      })
    }

    // Log the event
    await ctx.db.insert('events', {
      userId: user._id,
      action: 'ens_telegram_auto_verify',
      metadata: {
        address: normalizedAddress,
        ensName: args.ensName,
        ensTelegram: args.ensTelegram,
      },
      createdAt: now,
    })

    return { success: true, addressId: addressRecord?._id }
  },
})

/**
 * Update ENS data for an address
 * Called after fetching ENS data from mainnet
 */
export const updateAddressEns = mutation({
  args: {
    addressId: v.id('addresses'),
    ensName: v.optional(v.string()),
    ensAvatar: v.optional(v.string()),
    ensTelegram: v.optional(v.string()),
    ensTwitter: v.optional(v.string()),
    ensGithub: v.optional(v.string()),
    ensUrl: v.optional(v.string()),
    ensDescription: v.optional(v.string()),
    initDataRaw: v.string(),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuth(ctx, args.initDataRaw)
    const { addressId, initDataRaw: _initDataRaw, ...ensData } = args

    const addressRecord = await ctx.db.get(addressId)
    if (!addressRecord) {
      throw new Error('Address not found')
    }

    const user = await ctx.db.get(addressRecord.userId)
    if (!user || user.telegramUserId !== authUser.id) {
      throw new Error('Not authorized to update this address')
    }

    if (ensData.ensTelegram && !ensData.ensName) {
      throw new Error('ENS name is required when providing telegram record')
    }

    if (ensData.ensName) {
      const { resolvedAddress, ensTelegram } = await resolveEnsTelegram(ensData.ensName)
      if (!resolvedAddress) {
        throw new Error('ENS name does not resolve to an address')
      }
      if (normalizeAddress(resolvedAddress) !== normalizeAddress(addressRecord.address)) {
        throw new Error('ENS name does not match this address')
      }
      if (ensData.ensTelegram && ensTelegram !== normalizeUsername(ensData.ensTelegram)) {
        throw new Error('ENS telegram record does not match')
      }
    }

    await ctx.db.patch(addressId, {
      ...ensData,
      ensUpdatedAt: Date.now(),
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Add a new address (pending verification)
 */
export const addAddress = mutation({
  args: {
    address: v.string(),
    initDataRaw: v.string(),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuth(ctx, args.initDataRaw)
    // Find user
    const user = await ctx.db
      .query('users')
      .withIndex('by_telegram_id', (q) =>
        q.eq('telegramUserId', authUser.id)
      )
      .unique()

    if (!user) throw new Error('User not found')

    const normalizedAddress = normalizeAddress(args.address)
    const now = Date.now()

    // Check if already exists
    const existing = await ctx.db
      .query('addresses')
      .withIndex('by_address', (q) => q.eq('address', normalizedAddress))
      .unique()

    if (existing) {
      if (existing.userId !== user._id) {
        throw new Error('Address already linked to another user')
      }
      throw new Error('Address already linked')
    }

    // Create pending address
    const addressId = await ctx.db.insert('addresses', {
      userId: user._id,
      address: normalizedAddress,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    })

    return { success: true, addressId }
  },
})

/**
 * Set user's default address
 */
export const setDefaultAddress = mutation({
  args: {
    addressId: v.id('addresses'),
    initDataRaw: v.string(),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuth(ctx, args.initDataRaw)
    const user = await ctx.db
      .query('users')
      .withIndex('by_telegram_id', (q) =>
        q.eq('telegramUserId', authUser.id)
      )
      .unique()

    if (!user) throw new Error('User not found')

    const address = await ctx.db.get(args.addressId)
    if (!address) throw new Error('Address not found')
    if (address.userId !== user._id) throw new Error('Address does not belong to user')
    if (address.status !== 'verified') throw new Error('Address must be verified')

    await ctx.db.patch(user._id, {
      defaultAddressId: args.addressId,
      ...(address.ensName ? { primaryEnsName: address.ensName } : {}),
      lastSeenAt: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Get all addresses for a user
 */
export const getUserAddresses = query({
  args: {
    initDataRaw: v.string(),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuth(ctx, args.initDataRaw)
    const user = await ctx.db
      .query('users')
      .withIndex('by_telegram_id', (q) =>
        q.eq('telegramUserId', authUser.id)
      )
      .unique()

    if (!user) return []

    const addresses = await ctx.db
      .query('addresses')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect()

    return addresses.map((addr) => ({
      ...addr,
      isDefault: user.defaultAddressId === addr._id,
    }))
  },
})

/**
 * Delete an address
 * Handles cleanup of defaultAddressId if the deleted address was the default
 */
export const deleteAddress = mutation({
  args: {
    addressId: v.id('addresses'),
    initDataRaw: v.string(),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuth(ctx, args.initDataRaw)
    const user = await ctx.db
      .query('users')
      .withIndex('by_telegram_id', (q) =>
        q.eq('telegramUserId', authUser.id)
      )
      .unique()

    if (!user) throw new Error('User not found')

    const address = await ctx.db.get(args.addressId)
    if (!address) throw new Error('Address not found')
    if (address.userId !== user._id) throw new Error('Address does not belong to user')

    const now = Date.now()

    // If deleting the default address, try to reassign to another verified address
    if (user.defaultAddressId === args.addressId) {
      const otherAddresses = await ctx.db
        .query('addresses')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .collect()

      const nextDefault = otherAddresses.find(
        (a) => a._id !== args.addressId && a.status === 'verified'
      )

      await ctx.db.patch(user._id, {
        defaultAddressId: nextDefault?._id ?? undefined,
        primaryEnsName: nextDefault?.ensName ?? undefined,
        lastSeenAt: now,
      })
    }

    // Delete the address
    await ctx.db.delete(args.addressId)

    // Log the event
    await ctx.db.insert('events', {
      userId: user._id,
      action: 'address_deleted',
      metadata: {
        address: address.address,
        status: address.status,
      },
      createdAt: now,
    })

    return { success: true }
  },
})

/**
 * Get user with their default address and ENS
 */
export const getUserWithEns = query({
  args: {
    initDataRaw: v.string(),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuth(ctx, args.initDataRaw)
    const user = await ctx.db
      .query('users')
      .withIndex('by_telegram_id', (q) =>
        q.eq('telegramUserId', authUser.id)
      )
      .unique()

    if (!user) return null

    let defaultAddress = null
    if (user.defaultAddressId) {
      defaultAddress = await ctx.db.get(user.defaultAddressId)
    }

    return {
      ...user,
      defaultAddress,
    }
  },
})

