import crypto from "node:crypto";

export const DEFAULT_MAX_AGE_SECONDS = 24 * 60 * 60;

export const buildDataCheckString = (params) => {
  const entries = Array.from(params.entries())
    .filter(([key]) => key !== "hash")
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));

  return entries.map(([key, value]) => `${key}=${value}`).join("\n");
};

export const computeInitDataHash = (dataCheckString, botToken) => {
  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  return crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");
};

const timingSafeEqualHex = (aHex, bHex) => {
  if (typeof aHex !== "string" || typeof bHex !== "string") {
    return false;
  }

  const aBuffer = Buffer.from(aHex, "hex");
  const bBuffer = Buffer.from(bHex, "hex");

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
};

export const validateInitData = ({
  initData,
  botToken,
  maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS,
  now = Math.floor(Date.now() / 1000),
}) => {
  if (!initData) {
    return { ok: false, reason: "missing_init_data" };
  }

  const params = new URLSearchParams(initData);
  const providedHash = params.get("hash");

  if (!providedHash) {
    return { ok: false, reason: "missing_hash" };
  }

  const authDateRaw = params.get("auth_date");
  const authDate = authDateRaw ? Number(authDateRaw) : NaN;

  if (!Number.isFinite(authDate)) {
    return { ok: false, reason: "missing_auth_date" };
  }

  if (maxAgeSeconds !== null && now - authDate > maxAgeSeconds) {
    return { ok: false, reason: "expired" };
  }

  const dataCheckString = buildDataCheckString(params);
  const expectedHash = computeInitDataHash(dataCheckString, botToken);

  if (!timingSafeEqualHex(expectedHash, providedHash)) {
    return { ok: false, reason: "invalid_hash" };
  }

  const data = Object.fromEntries(params.entries());
  let user;

  if (data.user) {
    try {
      user = JSON.parse(data.user);
    } catch (error) {
      return { ok: false, reason: "invalid_user_json" };
    }
  }

  return {
    ok: true,
    authDate,
    data,
    user,
  };
};
