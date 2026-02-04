import { api } from "../_generated/api";

export const requireAuth = async (ctx, initDataRaw) => {
  const result = await ctx.runAction(api.telegram.validateTelegramInitData, {
    initData: initDataRaw,
  });

  if (!result?.ok || !result.user?.id) {
    throw new Error("Unauthorized");
  }

  return result.user;
};
