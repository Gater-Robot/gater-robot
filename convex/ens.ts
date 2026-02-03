/**
 * ENS Mutations and Queries for Gater Robot
 *
 * Handles ENS data caching, auto-verification via org.telegram,
 * and address management.
 */

import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

/**
 * Auto-verify a wallet based on ENS org.telegram match
 *
 * This is the "wow feature" - if a user's ENS org.telegram matches
 * their Telegram username, we can verify their wallet ownership
 * without requiring a SIWE signature!
 */
export const autoVerifyTelegramLink = mutation({
  args: {
    telegramUserId: v.string(),
    address: v.string(),
    ensName: v.string(),
    ensTelegram: v.string(),
  },
  handler: async (ctx, args) => {
    // Find or create user
    let user = await ctx.db
      .query('users')
      .withIndex('by_telegram_id', (q) =>
        q.eq('telegramUserId', args.telegramUserId)
      )
      .unique()

    if (!user) {
      const userId = await ctx.db.insert('users', {
        telegramUserId: args.telegramUserId,
        createdAt: Date.now(),
        lastSeenAt: Date.now(),
      })
      user = await ctx.db.get(userId)
    }

    if (!user) throw new Error('Failed to create user')

    // Normalize address
    const normalizedAddress = args.address.toLowerCase()

    // Check if address already exists
    let addressRecord = await ctx.db
      .query('addresses')
      .withIndex('by_address', (q) => q.eq('address', normalizedAddress))
      .unique()

    const now = Date.now()

    if (addressRecord) {
      // Update existing address
      await ctx.db.patch(addressRecord._id, {
        status: 'verified',
        verifiedAt: now,
        verificationMethod: 'ens_telegram_match',
        ensName: args.ensName,
        ensTelegram: args.ensTelegram,
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
        ensTelegram: args.ensTelegram,
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
  },
  handler: async (ctx, args) => {
    const { addressId, ...ensData } = args

    await ctx.db.patch(addressId, {
      ...ensData,
      ensTelegram: ensData.ensTelegram,
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
    telegramUserId: v.string(),
    address: v.string(),
  },
  handler: async (ctx, args) => {
    // Find user
    const user = await ctx.db
      .query('users')
      .withIndex('by_telegram_id', (q) =>
        q.eq('telegramUserId', args.telegramUserId)
      )
      .unique()

    if (!user) throw new Error('User not found')

    const normalizedAddress = args.address.toLowerCase()
    const now = Date.now()

    // Check if already exists
    const existing = await ctx.db
      .query('addresses')
      .withIndex('by_address', (q) => q.eq('address', normalizedAddress))
      .unique()

    if (existing) {
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
    telegramUserId: v.string(),
    addressId: v.id('addresses'),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_telegram_id', (q) =>
        q.eq('telegramUserId', args.telegramUserId)
      )
      .unique()

    if (!user) throw new Error('User not found')

    const address = await ctx.db.get(args.addressId)
    if (!address) throw new Error('Address not found')
    if (address.userId !== user._id) throw new Error('Address does not belong to user')
    if (address.status !== 'verified') throw new Error('Address must be verified')

    await ctx.db.patch(user._id, {
      defaultAddressId: args.addressId,
      primaryEnsName: address.ensName ?? null,
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
    telegramUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_telegram_id', (q) =>
        q.eq('telegramUserId', args.telegramUserId)
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
 * Get user with their default address and ENS
 */
export const getUserWithEns = query({
  args: {
    telegramUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_telegram_id', (q) =>
        q.eq('telegramUserId', args.telegramUserId)
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

/**
 * Create or update user from Telegram
 */
export const upsertUser = mutation({
  args: {
    telegramUserId: v.string(),
    telegramUsername: v.optional(v.string()),
    telegramFirstName: v.optional(v.string()),
    telegramLastName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('users')
      .withIndex('by_telegram_id', (q) =>
        q.eq('telegramUserId', args.telegramUserId)
      )
      .unique()

    const now = Date.now()

    if (existing) {
      await ctx.db.patch(existing._id, {
        telegramUsername: args.telegramUsername,
        telegramFirstName: args.telegramFirstName,
        telegramLastName: args.telegramLastName,
        lastSeenAt: now,
      })
      return { userId: existing._id, isNew: false }
    }

    const userId = await ctx.db.insert('users', {
      telegramUserId: args.telegramUserId,
      telegramUsername: args.telegramUsername,
      telegramFirstName: args.telegramFirstName,
      telegramLastName: args.telegramLastName,
      createdAt: now,
      lastSeenAt: now,
    })

    return { userId, isNew: true }
  },
})
