import { internalQuery } from "./_generated/server"
import { v } from "convex/values"
import { Doc } from "./_generated/dataModel"

export const getChannelAndOrg = internalQuery({
  args: {
    channelId: v.id("channels"),
  },
  handler: async (ctx, args): Promise<{
    channel: Doc<"channels"> | null
    org: Doc<"orgs"> | null
  }> => {
    const channel = await ctx.db.get(args.channelId)
    if (!channel) return { channel: null, org: null }
    const org = await ctx.db.get(channel.orgId)
    return { channel, org: org ?? null }
  },
})

