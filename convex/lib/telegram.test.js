import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDataCheckString,
  computeInitDataHash,
  validateInitData,
} from "./telegram.js";

const BOT_TOKEN = "123456:TEST_TOKEN";

const buildInitData = ({ authDate, userOverrides = {}, extra = {} } = {}) => {
  const now = authDate ?? Math.floor(Date.now() / 1000);
  const params = new URLSearchParams({
    auth_date: String(now),
    query_id: "AAEAAAE",
    user: JSON.stringify({ id: 42, username: "alice", ...userOverrides }),
    ...extra,
  });

  const dataCheckString = buildDataCheckString(params);
  const hash = computeInitDataHash(dataCheckString, BOT_TOKEN);
  params.set("hash", hash);

  return params.toString();
};

test("validateInitData accepts valid initData", () => {
  const initData = buildInitData();
  const result = validateInitData({ initData, botToken: BOT_TOKEN });

  assert.equal(result.ok, true);
  assert.equal(result.user?.username, "alice");
});

test("validateInitData rejects invalid hash", () => {
  const initData = buildInitData();
  const params = new URLSearchParams(initData);
  params.set("hash", "deadbeef");
  const tampered = params.toString();
  const result = validateInitData({ initData: tampered, botToken: BOT_TOKEN });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "invalid_hash");
});

test("validateInitData rejects expired auth_date", () => {
  const expiredAuthDate = Math.floor(Date.now() / 1000) - 10_000;
  const initData = buildInitData({ authDate: expiredAuthDate });
  const result = validateInitData({
    initData,
    botToken: BOT_TOKEN,
    maxAgeSeconds: 60,
    now: Math.floor(Date.now() / 1000),
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "expired");
});
