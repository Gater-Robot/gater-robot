/**
 * SIWE (Sign-In With Ethereum) Functions
 *
 * Handles nonce generation and signature verification for wallet ownership.
 * Security considerations:
 * - Nonces are tied to specific users and have TTL
 * - Replay protection via nonce invalidation after use
 * - Domain validation in signature verification
 */

import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { verifyMessage, getAddress, isAddress } from 'viem'
import { parseSiweMessage } from 'viem/siwe'
import { requireAuth } from './lib/auth'

function deprecatedInsecureSiweMutation() {
  throw new Error(
    "Deprecated: SIWE mutations are insecure without Telegram HMAC validation. Use `siweActions.generateNonceSecure` / `siweActions.verifySignatureSecure` instead."
  )
}

// Nonce TTL: 15 minutes
const NONCE_TTL_MS = 15 * 60 * 1000

// Allowed domains for SIWE verification
const ALLOWED_DOMAINS = [
  'localhost',
  'localhost:5173',
  'gater.bot',
  'app.gater.bot',
  'gater-dev.agentix.bot',
  'gater-app.agentix.bot',
]

/**
 * Generate a cryptographically secure nonce for SIWE
 * The nonce is stored with the user's address record and has a TTL
 */
export const generateNonce = mutation({
  args: {
    address: v.string(),
    initDataRaw: v.string(),
  },
  handler: async (ctx, args) => {
    deprecatedInsecureSiweMutation()
    const authUser = await requireAuth(ctx, args.initDataRaw)

    // Validate address format
    if (!isAddress(args.address)) {
      throw new Error('Invalid Ethereum address')
    }

    const normalizedAddress = getAddress(args.address)

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

    // Generate nonce: combination of random UUID and timestamp for uniqueness
    const nonce = crypto.randomUUID()
    const now = Date.now()
    const expiresAt = now + NONCE_TTL_MS

    // Check if address already exists for this user
    let addressRecord = await ctx.db
      .query('addresses')
      .withIndex('by_address', (q) => q.eq('address', normalizedAddress))
      .unique()

    if (addressRecord) {
      // Address exists - check ownership
      if (addressRecord.userId !== user._id) {
        throw new Error('Address already linked to another user')
      }

      // Update with new nonce
      await ctx.db.patch(addressRecord._id, {
        siweNonce: nonce,
        updatedAt: now,
      })
    } else {
      // Create new pending address with nonce
      const addressId = await ctx.db.insert('addresses', {
        userId: user._id,
        address: normalizedAddress,
        status: 'pending',
        siweNonce: nonce,
        createdAt: now,
        updatedAt: now,
      })
      addressRecord = await ctx.db.get(addressId)
    }

    // Log nonce generation event
    await ctx.db.insert('events', {
      userId: user._id,
      action: 'siwe_nonce_generated',
      metadata: {
        address: normalizedAddress,
        expiresAt,
      },
      createdAt: now,
    })

    return {
      nonce,
      expiresAt,
      address: normalizedAddress,
      addressId: addressRecord?._id,
    }
  },
})

/**
 * Verify a SIWE signature and bind the wallet to the user
 * This marks the address as verified after signature verification
 */
export const verifySignature = mutation({
  args: {
    address: v.string(),
    message: v.string(),
    signature: v.string(),
    initDataRaw: v.string(),
  },
  handler: async (ctx, args) => {
    deprecatedInsecureSiweMutation()
    const authUser = await requireAuth(ctx, args.initDataRaw)

    // Validate address format
    if (!isAddress(args.address)) {
      throw new Error('Invalid Ethereum address')
    }

    const normalizedAddress = getAddress(args.address)

    // Find user
    const user = await ctx.db
      .query('users')
      .withIndex('by_telegram_id', (q) =>
        q.eq('telegramUserId', authUser.id)
      )
      .unique()

    if (!user) throw new Error('User not found')

    // Find address record
    const addressRecord = await ctx.db
      .query('addresses')
      .withIndex('by_address', (q) => q.eq('address', normalizedAddress))
      .unique()

    if (!addressRecord) {
      throw new Error('Address not found. Generate a nonce first.')
    }

    if (addressRecord.userId !== user._id) {
      throw new Error('Address does not belong to this user')
    }

    // Check if nonce exists and hasn't been used
    if (!addressRecord.siweNonce) {
      throw new Error('No nonce found. Generate a new nonce.')
    }

    // Check nonce expiry (based on updatedAt + TTL)
    const nonceAge = Date.now() - addressRecord.updatedAt
    if (nonceAge > NONCE_TTL_MS) {
      throw new Error('Nonce expired. Please generate a new nonce.')
    }

    // Parse and validate SIWE message
    let parsedMessage
    try {
      parsedMessage = parseSiweMessage(args.message)
    } catch (err) {
      throw new Error(`Invalid SIWE message format: ${err instanceof Error ? err.message : 'unknown error'}`)
    }

    // Validate domain
    if (!parsedMessage.domain || !ALLOWED_DOMAINS.includes(parsedMessage.domain)) {
      throw new Error('Invalid domain in SIWE message')
    }

    // Validate nonce from parsed message (not substring search)
    if (parsedMessage.nonce !== addressRecord.siweNonce) {
      throw new Error('Invalid nonce in message')
    }

    // Validate address matches
    if (!parsedMessage.address) {
      throw new Error('Missing address in SIWE message')
    }
    if (getAddress(parsedMessage.address) !== normalizedAddress) {
      throw new Error('Address mismatch in SIWE message')
    }

    // Verify signature using viem
    const isValid = await verifyMessage({
      address: normalizedAddress,
      message: args.message,
      signature: args.signature as `0x${string}`,
    })

    if (!isValid) {
      // Log failed verification attempt
      await ctx.db.insert('events', {
        userId: user._id,
        action: 'siwe_verification_failed',
        metadata: {
          address: normalizedAddress,
          reason: 'Invalid signature',
        },
        createdAt: Date.now(),
      })
      throw new Error('Invalid signature')
    }

    const now = Date.now()

    // Mark address as verified and clear nonce (prevents replay)
    await ctx.db.patch(addressRecord._id, {
      status: 'verified',
      verifiedAt: now,
      verificationMethod: 'siwe',
      siweMessage: args.message,
      siweSignature: args.signature,
      siweNonce: null, // Clear nonce to prevent replay
      updatedAt: now,
    })

    // Set as default address if user doesn't have one
    if (!user.defaultAddressId) {
      await ctx.db.patch(user._id, {
        defaultAddressId: addressRecord._id,
        lastSeenAt: now,
      })
    }

    // Log successful verification
    await ctx.db.insert('events', {
      userId: user._id,
      action: 'siwe_verification_success',
      metadata: {
        address: normalizedAddress,
        addressId: addressRecord._id,
      },
      createdAt: now,
    })

    return {
      success: true,
      addressId: addressRecord._id,
      verified: true,
    }
  },
})

/**
 * Check if a nonce is still valid for an address
 */
export const checkNonceStatus = query({
  args: {
    address: v.string(),
    initDataRaw: v.string(),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuth(ctx, args.initDataRaw)

    if (!isAddress(args.address)) {
      return { valid: false, reason: 'Invalid address' }
    }

    const normalizedAddress = getAddress(args.address)

    // Find user
    const user = await ctx.db
      .query('users')
      .withIndex('by_telegram_id', (q) =>
        q.eq('telegramUserId', authUser.id)
      )
      .unique()

    if (!user) {
      return { valid: false, reason: 'User not found' }
    }

    // Find address record
    const addressRecord = await ctx.db
      .query('addresses')
      .withIndex('by_address', (q) => q.eq('address', normalizedAddress))
      .unique()

    if (!addressRecord) {
      return { valid: false, reason: 'No nonce generated' }
    }

    if (addressRecord.userId !== user._id) {
      return { valid: false, reason: 'Address belongs to another user' }
    }

    if (!addressRecord.siweNonce) {
      return { valid: false, reason: 'No nonce found' }
    }

    // Check expiry
    const nonceAge = Date.now() - addressRecord.updatedAt
    if (nonceAge > NONCE_TTL_MS) {
      return { valid: false, reason: 'Nonce expired' }
    }

    const remainingMs = NONCE_TTL_MS - nonceAge

    return {
      valid: true,
      nonce: addressRecord.siweNonce,
      expiresIn: remainingMs,
      address: normalizedAddress,
    }
  },
})
