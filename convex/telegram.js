import { action } from "./_generated/server";
import { v } from "convex/values";
import { validateInitData } from "./lib/telegram.js";

export const validateInitDataAction = action({
  args: {
    initData: v.string(),
  },
  handler: async (_ctx, args) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      throw new Error("Missing TELEGRAM_BOT_TOKEN env var");
    }

    const result = validateInitData({
      initData: args.initData,
      botToken,
    });

    if (!result.ok) {
      throw new Error(`Invalid initData: ${result.reason}`);
    }

    return {
      authDate: result.authDate,
      user: result.user,
      data: result.data,
    };
  },
});
