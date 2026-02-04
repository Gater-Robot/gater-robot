import crypto from "node:crypto";
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDataCheckString,
  validateInitData,
} from "../lib/telegramInitData.js";

const buildInitData = ({ botToken, params }) => {
  const searchParams = new URLSearchParams(params);
  const dataCheckString = buildDataCheckString(searchParams);
  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();
  const hash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");
  searchParams.set("hash", hash);
  return searchParams.toString();
};

test("validateInitData accepts a valid payload", () => {
  const botToken = "test-bot-token";
  const nowSeconds = Math.floor(Date.now() / 1000);
  const initData = buildInitData({
    botToken,
    params: {
      auth_date: String(nowSeconds),
      query_id: "AAEAAQ",
      user: JSON.stringify({ id: 123, username: "tester" }),
    },
  });

  const result = validateInitData({
    initData,
    botToken,
    nowSeconds,
  });

  assert.equal(result.isValid, true);
  assert.equal(result.user.username, "tester");
});

test("validateInitData rejects invalid hashes", () => {
  const botToken = "test-bot-token";
  const nowSeconds = Math.floor(Date.now() / 1000);
  const initData = new URLSearchParams({
    auth_date: String(nowSeconds),
    query_id: "AAEAAQ",
    user: JSON.stringify({ id: 456, username: "bad" }),
    hash: "deadbeef",
  }).toString();

  const result = validateInitData({
    initData,
    botToken,
    nowSeconds,
  });

  assert.equal(result.isValid, false);
  assert.equal(result.reason, "invalid_hash");
});

test("validateInitData rejects expired payloads", () => {
  const botToken = "test-bot-token";
  const nowSeconds = Math.floor(Date.now() / 1000);
  const authDate = nowSeconds - 60;
  const initData = buildInitData({
    botToken,
    params: {
      auth_date: String(authDate),
      query_id: "AAEAAQ",
      user: JSON.stringify({ id: 789, username: "expired" }),
    },
  });

  const result = validateInitData({
    initData,
    botToken,
    nowSeconds,
    maxAgeSeconds: 30,
  });

  assert.equal(result.isValid, false);
  assert.equal(result.reason, "expired");
});
