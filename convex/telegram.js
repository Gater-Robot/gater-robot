"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { validateInitData } from "./lib/telegramInitData.js";

export const validateTelegramInitData = action({
  args: {
    initData: v.string(),
  },
  handler: async (_ctx, args) => {
    const botToken = process.env.BOT_TOKEN ?? process.env.TELEGRAM_BOT_TOKEN;
    const maxAgeEnv = process.env.TELEGRAM_INITDATA_MAX_AGE_SECONDS;
    const maxAgeSeconds = maxAgeEnv ? Number(maxAgeEnv) : undefined;

    const result = validateInitData({
      initData: args.initData,
      botToken,
      maxAgeSeconds: Number.isFinite(maxAgeSeconds)
        ? maxAgeSeconds
        : undefined,
    });

    if (!result.isValid) {
      return {
        ok: false,
        reason: result.reason,
      };
    }

    const user = result.user
      ? { ...result.user, id: String(result.user.id) }
      : null;

    return {
      ok: true,
      authDate: result.authDate,
      user,
      data: result.data,
    };
  },
});
