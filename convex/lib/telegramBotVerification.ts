export type TelegramChatMember = {
  status?: string
  can_restrict_members?: boolean
}

export type BotAdminVerification = {
  botIsAdmin: boolean
  status: string | null
  hasRestrictMembers: boolean
  reason?: string
}

export function getBotAdminVerification(member: unknown): BotAdminVerification {
  if (!member || typeof member !== "object") {
    return {
      botIsAdmin: false,
      status: null,
      hasRestrictMembers: false,
      reason: "Invalid Telegram response",
    }
  }

  const chatMember = member as TelegramChatMember
  const status = typeof chatMember.status === "string" ? chatMember.status : null

  if (status === "creator") {
    return {
      botIsAdmin: true,
      status,
      hasRestrictMembers: true,
    }
  }

  if (status === "administrator") {
    const hasRestrictMembers = chatMember.can_restrict_members === true
    return {
      botIsAdmin: hasRestrictMembers,
      status,
      hasRestrictMembers,
      reason: hasRestrictMembers
        ? undefined
        : "Bot is an admin but is missing the can_restrict_members permission",
    }
  }

  return {
    botIsAdmin: false,
    status,
    hasRestrictMembers: false,
    reason: "Bot is not an admin in this chat",
  }
}

