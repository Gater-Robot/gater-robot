/**
 * Auth utilities for Convex functions
 *
 * requireAuth()       - Used by ALL queries and mutations. Parses the Telegram
 *                       user from initData without cryptographic validation and
 *                       rejects expired auth_date values.
 * requireAuthSecure() - Currently has zero callers. Delegates to a Convex action
 *                       that validates the HMAC signature (requires action context).
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
 * Parse user from initData without cryptographic validation.
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
  } catch (e) {
    console.error('[gater] parseInitDataUser failed:', e)
    return null
  }
}

const MAX_AUTH_AGE_SECONDS = 86400 // 24 hours

/**
 * Parse and return the Telegram user from initData.
 * No cryptographic (HMAC) validation -- used by every query and mutation.
 * Rejects requests whose auth_date is older than MAX_AUTH_AGE_SECONDS,
 * or that are missing / have an invalid auth_date (unless hash === 'mock').
 */
export async function requireAuth(
  _ctx: ConvexCtx,
  initDataRaw: string
): Promise<TelegramUser> {
  const user = parseInitDataUser(initDataRaw)

  if (!user) {
    throw new Error('Unauthorized: Could not parse user from initData')
  }

  // Validate auth_date to reject stale initData (skip for mock data in dev)
  const params = new URLSearchParams(initDataRaw)
  const hash = params.get('hash')
  if (hash !== 'mock') {
    const authDateStr = params.get('auth_date')
    if (!authDateStr) {
      throw new Error('Unauthorized: initData missing auth_date')
    }
    const authDate = Number(authDateStr)
    if (Number.isNaN(authDate)) {
      throw new Error('Unauthorized: initData has invalid auth_date')
    }
    const now = Math.floor(Date.now() / 1000)
    if (now - authDate > MAX_AUTH_AGE_SECONDS) {
      throw new Error('Unauthorized: initData has expired')
    }
  }

  return user
}

/**
 * Validate initData with full HMAC verification via a Convex action.
 * Currently has zero callers. Requires action-capable context (ctx.runAction).
 */
export async function requireAuthSecure(
  ctx: ConvexCtx,
  initDataRaw: string
): Promise<TelegramUser> {
  const result: ValidationResult = await ctx.runAction(
    api.telegram.validateTelegramInitData,
    { initData: initDataRaw }
  )

  if (!result?.ok || !result.user?.id) {
    throw new Error(`Unauthorized: ${result?.ok === false ? result.reason : 'validation failed'}`)
  }

  return result.user
}
