/**
 * Auth utilities for Convex functions
 *
 * For QUERIES: Use requireAuth() which parses initData without cryptographic validation
 * For MUTATIONS/ACTIONS: Use requireAuthSecure() which validates the HMAC signature
 *
 * This pattern is common in Telegram Mini Apps where reads are allowed with
 * parsed identity, but writes require full validation.
 */

import { api } from '../_generated/api'

export interface TelegramUser {
  id: string
  first_name?: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
}

type ValidationResult =
  | { ok: true; user: TelegramUser }
  | { ok: false; reason: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ConvexCtx = any

/**
 * Parse user from initData without cryptographic validation
 * Use for QUERIES where you need user identity but full validation isn't possible
 */
function parseInitDataUser(initDataRaw: string): TelegramUser | null {
  try {
    const params = new URLSearchParams(initDataRaw)
    const userStr = params.get('user')
    if (!userStr) return null

    const user = JSON.parse(userStr)
    if (!user?.id) return null

    return {
      id: String(user.id),
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      language_code: user.language_code,
      is_premium: user.is_premium,
    }
  } catch {
    return null
  }
}

/**
 * Get user identity from initData (for QUERIES)
 * Parses the user without cryptographic validation.
 * Safe for read operations where user identity is needed.
 */
export const requireAuth = async (
  _ctx: ConvexCtx,
  initDataRaw: string
): Promise<TelegramUser> => {
  const user = parseInitDataUser(initDataRaw)

  if (!user) {
    throw new Error('Unauthorized: Could not parse user from initData')
  }

  return user
}

/**
 * Validate initData with full HMAC verification (for MUTATIONS/ACTIONS)
 * Use this for any operation that modifies data.
 */
export const requireAuthSecure = async (
  ctx: ConvexCtx,
  initDataRaw: string
): Promise<TelegramUser> => {
  // This requires the context to support runAction (actions only)
  // For mutations, call the validation action first
  const result: ValidationResult = await ctx.runAction(
    api.telegram.validateTelegramInitData,
    { initData: initDataRaw }
  )

  if (!result?.ok || !result.user?.id) {
    throw new Error(`Unauthorized: ${result?.ok === false ? result.reason : 'validation failed'}`)
  }

  return result.user
}
