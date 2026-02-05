"use node"

import { action } from "./_generated/server"
import { v } from "convex/values"
import { anyApi } from "convex/server"
import { getAddress, isAddress, verifyMessage } from "viem"
import { parseSiweMessage } from "viem/siwe"

const api = anyApi as any
const internal = anyApi as any

// Allowed domains for SIWE verification
const ALLOWED_DOMAINS = [
  "localhost",
  "localhost:5173",
  "gater.bot",
  "app.gater.bot",
  "gater-dev.agentix.bot",
  "gater-app.agentix.bot",
]

function parseInitDataUserId(initDataRaw: string): string | null {
  try {
    const params = new URLSearchParams(initDataRaw)
    const userStr = params.get("user")
    if (!userStr) return null
    const user = JSON.parse(userStr)
    if (!user?.id) return null
    return String(user.id)
  } catch {
    return null
  }
}

async function requireValidatedTelegramUserId(ctx: any, initDataRaw: string): Promise<string> {
  const allowMock = process.env.ALLOW_MOCK_INITDATA === "true"
  const hash = new URLSearchParams(initDataRaw).get("hash")
  if (allowMock && hash === "mock") {
    const userId = parseInitDataUserId(initDataRaw)
    if (!userId) throw new Error("Unauthorized: Could not parse user from initData")
    return userId
  }

  const result = await ctx.runAction(api.telegram.validateTelegramInitData, {
    initData: initDataRaw,
  })

  if (!result?.ok || !result.user?.id) {
    throw new Error(`Unauthorized: ${result?.ok === false ? result.reason : "validation failed"}`)
  }

  return String(result.user.id)
}

export const generateNonceSecure = action({
  args: {
    address: v.string(),
    initDataRaw: v.string(),
  },
  handler: async (ctx, args) => {
    const telegramUserId = await requireValidatedTelegramUserId(ctx, args.initDataRaw)

    if (!isAddress(args.address)) {
      throw new Error("Invalid Ethereum address")
    }
    const normalizedAddress = getAddress(args.address)

    const nonce = crypto.randomUUID()
    const now = Date.now()

    return await ctx.runMutation(internal.siweMutations.generateNonceInternal, {
      telegramUserId,
      address: normalizedAddress,
      nonce,
      now,
    })
  },
})

export const verifySignatureSecure = action({
  args: {
    address: v.string(),
    message: v.string(),
    signature: v.string(),
    initDataRaw: v.string(),
  },
  handler: async (ctx, args) => {
    const telegramUserId = await requireValidatedTelegramUserId(ctx, args.initDataRaw)

    if (!isAddress(args.address)) {
      throw new Error("Invalid Ethereum address")
    }
    const normalizedAddress = getAddress(args.address)

    let parsedMessage: ReturnType<typeof parseSiweMessage>
    try {
      parsedMessage = parseSiweMessage(args.message)
    } catch (err) {
      const now = Date.now()
      await ctx.runMutation(internal.siweMutations.logSiweFailureInternal, {
        telegramUserId,
        address: normalizedAddress,
        reason: `Invalid SIWE message format: ${err instanceof Error ? err.message : "unknown error"}`,
        now,
      })
      throw new Error(
        `Invalid SIWE message format: ${err instanceof Error ? err.message : "unknown error"}`,
      )
    }

    if (!parsedMessage.domain || !ALLOWED_DOMAINS.includes(parsedMessage.domain)) {
      const now = Date.now()
      await ctx.runMutation(internal.siweMutations.logSiweFailureInternal, {
        telegramUserId,
        address: normalizedAddress,
        reason: "Invalid domain in SIWE message",
        now,
      })
      throw new Error("Invalid domain in SIWE message")
    }

    if (!parsedMessage.nonce) {
      const now = Date.now()
      await ctx.runMutation(internal.siweMutations.logSiweFailureInternal, {
        telegramUserId,
        address: normalizedAddress,
        reason: "Missing nonce in SIWE message",
        now,
      })
      throw new Error("Missing nonce in SIWE message")
    }

    if (!parsedMessage.address) {
      const now = Date.now()
      await ctx.runMutation(internal.siweMutations.logSiweFailureInternal, {
        telegramUserId,
        address: normalizedAddress,
        reason: "Missing address in SIWE message",
        now,
      })
      throw new Error("Missing address in SIWE message")
    }

    if (getAddress(parsedMessage.address) !== normalizedAddress) {
      const now = Date.now()
      await ctx.runMutation(internal.siweMutations.logSiweFailureInternal, {
        telegramUserId,
        address: normalizedAddress,
        reason: "Address mismatch in SIWE message",
        now,
      })
      throw new Error("Address mismatch in SIWE message")
    }

    const isValid = await verifyMessage({
      address: normalizedAddress,
      message: args.message,
      signature: args.signature as `0x${string}`,
    })

    if (!isValid) {
      const now = Date.now()
      await ctx.runMutation(internal.siweMutations.logSiweFailureInternal, {
        telegramUserId,
        address: normalizedAddress,
        reason: "Invalid signature",
        now,
      })
      throw new Error("Invalid signature")
    }

    const now = Date.now()
    return await ctx.runMutation(internal.siweMutations.verifySignatureInternal, {
      telegramUserId,
      address: normalizedAddress,
      nonce: parsedMessage.nonce,
      message: args.message,
      signature: args.signature,
      now,
    })
  },
})

