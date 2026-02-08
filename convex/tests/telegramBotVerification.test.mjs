import assert from "node:assert/strict"
import test from "node:test"

import { getBotAdminVerification } from "../.test-dist/lib/telegramBotVerification.js"

test("telegram bot verification: creator counts as admin", () => {
  const result = getBotAdminVerification({ status: "creator" })
  assert.equal(result.botIsAdmin, true)
  assert.equal(result.hasRestrictMembers, true)
})

test("telegram bot verification: administrator must have can_restrict_members", () => {
  const ok = getBotAdminVerification({ status: "administrator", can_restrict_members: true })
  assert.equal(ok.botIsAdmin, true)

  const missing = getBotAdminVerification({ status: "administrator", can_restrict_members: false })
  assert.equal(missing.botIsAdmin, false)
  assert.equal(missing.hasRestrictMembers, false)
  assert.ok(missing.reason)
})

test("telegram bot verification: member is not admin", () => {
  const result = getBotAdminVerification({ status: "member" })
  assert.equal(result.botIsAdmin, false)
})

test("telegram bot verification: invalid response is handled", () => {
  const result = getBotAdminVerification(null)
  assert.equal(result.botIsAdmin, false)
  assert.ok(result.reason)
})

