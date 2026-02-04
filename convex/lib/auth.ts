import { api } from '../_generated/api'

interface TelegramUser {
  id: string
  first_name?: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
}

interface ValidationResult {
  ok: boolean
  user?: TelegramUser
  reason?: string
}

// Convex context type - using `any` because runAction is a runtime method
// that isn't fully typed in Convex's type definitions. This function is called
// from both queries and mutations, and runAction works at runtime.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ConvexCtx = any

export const requireAuth = async (
  ctx: ConvexCtx,
  initDataRaw: string
): Promise<TelegramUser> => {
  const result: ValidationResult = await ctx.runAction(
    api.telegram.validateTelegramInitData,
    { initData: initDataRaw }
  )

  if (!result?.ok || !result.user?.id) {
    throw new Error('Unauthorized')
  }

  return result.user
}
