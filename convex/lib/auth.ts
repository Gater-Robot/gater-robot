import { api } from '../_generated/api'
import type { MutationCtx, QueryCtx } from '../_generated/server'

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

type ConvexCtx = MutationCtx | QueryCtx

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
