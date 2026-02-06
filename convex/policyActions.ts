"use node"

import { action } from "./_generated/server"

function parseAdminIdsEnv(raw: string | undefined): string[] {
  if (!raw) return []
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  return ids.length > 0 ? ids : []
}

export const getPolicy = action({
  args: {},
  handler: async () => {
    const adminIds = parseAdminIdsEnv(process.env.ADMIN_IDS)

    return {
      timestampMs: Date.now(),
      adminIds: {
        enforced: adminIds.length > 0,
        count: adminIds.length,
      },
      flags: {
        allowMockInitData: process.env.ALLOW_MOCK_INITDATA === "true",
        disableInsecureMutations: process.env.DISABLE_INSECURE_MUTATIONS === "true",
      },
      integrations: {
        botTokenConfigured: Boolean(process.env.BOT_TOKEN ?? process.env.TELEGRAM_BOT_TOKEN),
        alchemyApiKeyConfigured: Boolean(process.env.ALCHEMY_API_KEY),
      },
    }
  },
})

