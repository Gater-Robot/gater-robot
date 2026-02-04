import crypto from "node:crypto";

export const DEFAULT_MAX_AGE_SECONDS = 24 * 60 * 60;

const parseAuthDate = (value) => {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const safeCompare = (a, b) => {
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
};

export const buildDataCheckString = (params) => {
  const pairs = [];
  const keys = Array.from(params.keys()).filter((key) => key !== "hash");
  keys.sort();
  for (const key of keys) {
    const value = params.get(key);
    pairs.push(`${key}=${value ?? ""}`);
  }
  return pairs.join("\n");
};

export const validateInitData = ({
  initData,
  botToken,
  maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS,
  nowSeconds = Math.floor(Date.now() / 1000),
}) => {
  if (!initData) {
    return { isValid: false, reason: "missing_init_data" };
  }

  if (!botToken) {
    return { isValid: false, reason: "missing_bot_token" };
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) {
    return { isValid: false, reason: "missing_hash" };
  }

  const authDate = parseAuthDate(params.get("auth_date"));
  if (authDate === null) {
    return { isValid: false, reason: "invalid_auth_date" };
  }

  if (maxAgeSeconds !== null && nowSeconds - authDate > maxAgeSeconds) {
    return { isValid: false, reason: "expired" };
  }

  const dataCheckString = buildDataCheckString(params);
  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();
  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  const isValid = safeCompare(
    Buffer.from(computedHash),
    Buffer.from(hash),
  );
  if (!isValid) {
    return { isValid: false, reason: "invalid_hash" };
  }

  let user = null;
  const userRaw = params.get("user");
  if (userRaw) {
    try {
      user = JSON.parse(userRaw);
    } catch (error) {
      return { isValid: false, reason: "invalid_user_json" };
    }
  }

  return {
    isValid: true,
    authDate,
    user,
    data: Object.fromEntries(params.entries()),
  };
};
