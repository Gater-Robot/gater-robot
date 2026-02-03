/**
 * Convex Schema for Gater Robot
 *
 * Defines the database schema for users, addresses, and ENS data.
 * Supports multi-wallet linking with ENS identity.
 */

import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  /**
   * Users table - Telegram users
   * Each user can link multiple wallet addresses
   */
  users: defineTable({
    // Telegram identity
    telegramUserId: v.string(),
    telegramUsername: v.optional(v.string()),
    telegramFirstName: v.optional(v.string()),
    telegramLastName: v.optional(v.string()),

    // ENS identity (from default address)
    primaryEnsName: v.optional(v.string()),
    defaultAddressId: v.optional(v.id('addresses')),

    // Timestamps
    createdAt: v.number(),
    lastSeenAt: v.number(),
  })
    .index('by_telegram_id', ['telegramUserId'])
    .index('by_telegram_username', ['telegramUsername']),

  /**
   * Addresses table - Linked wallet addresses
   * Each address can have ENS data cached
   */
  addresses: defineTable({
    // Relationship
    userId: v.id('users'),

    // Wallet data
    address: v.string(), // Checksummed EVM address

    // Verification status
    status: v.union(v.literal('pending'), v.literal('verified')),
    verifiedAt: v.optional(v.number()),
    verificationMethod: v.optional(
      v.union(v.literal('siwe'), v.literal('ens_telegram_match'))
    ),

    // SIWE data (for siwe verification)
    siweNonce: v.optional(v.string()),
    siweMessage: v.optional(v.string()),
    siweSignature: v.optional(v.string()),

    // ENS data (cached from mainnet)
    ensName: v.optional(v.string()),
    ensAvatar: v.optional(v.string()),
    ensTelegramUsername: v.optional(v.string()),
    ensTwitter: v.optional(v.string()),
    ensGithub: v.optional(v.string()),
    ensUrl: v.optional(v.string()),
    ensDescription: v.optional(v.string()),
    ensUpdatedAt: v.optional(v.number()),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_address', ['address'])
    .index('by_user', ['userId'])
    .index('by_user_and_status', ['userId', 'status']),

  /**
   * Organizations table - Telegram group owners
   */
  orgs: defineTable({
    ownerTelegramUserId: v.string(),
    name: v.string(),
    createdAt: v.number(),
  }).index('by_owner', ['ownerTelegramUserId']),

  /**
   * Channels table - Telegram groups/channels
   */
  channels: defineTable({
    orgId: v.id('orgs'),
    telegramChatId: v.string(),
    title: v.optional(v.string()),
    type: v.union(v.literal('public'), v.literal('private')),
    botIsAdmin: v.boolean(),
    verifiedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_telegram_chat_id', ['telegramChatId'])
    .index('by_org', ['orgId']),

  /**
   * Gates table - Token gate rules
   */
  gates: defineTable({
    orgId: v.id('orgs'),
    channelId: v.id('channels'),

    // Token configuration
    chainId: v.number(),
    tokenAddress: v.string(),
    tokenSymbol: v.optional(v.string()),
    tokenDecimals: v.optional(v.number()),
    tokenName: v.optional(v.string()),

    // Threshold
    threshold: v.string(), // BigInt as string
    thresholdFormatted: v.optional(v.string()), // Human readable

    // Status
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_channel', ['channelId'])
    .index('by_org', ['orgId'])
    .index('by_channel_active', ['channelId', 'active']),

  /**
   * Memberships table - User membership in gated channels
   */
  memberships: defineTable({
    channelId: v.id('channels'),
    userId: v.id('users'),

    // Status
    status: v.union(
      v.literal('eligible'),
      v.literal('warned'),
      v.literal('kicked'),
      v.literal('pending')
    ),

    // Balance tracking
    lastKnownBalance: v.optional(v.string()),
    lastCheckedAt: v.optional(v.number()),
    nextCheckAt: v.optional(v.number()),

    // History
    joinedAt: v.optional(v.number()),
    warnedAt: v.optional(v.number()),
    kickedAt: v.optional(v.number()),
  })
    .index('by_channel', ['channelId'])
    .index('by_user', ['userId'])
    .index('by_channel_and_user', ['channelId', 'userId'])
    .index('by_status', ['status']),

  /**
   * Events table - Audit log
   */
  events: defineTable({
    userId: v.optional(v.id('users')),
    orgId: v.optional(v.id('orgs')),
    channelId: v.optional(v.id('channels')),

    action: v.string(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_org', ['orgId'])
    .index('by_channel', ['channelId'])
    .index('by_action', ['action']),
})
