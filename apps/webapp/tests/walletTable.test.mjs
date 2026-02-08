import test from "node:test"
import assert from "node:assert/strict"

// ─── Wallet sorting logic (extracted from WalletTable) ────────────────

/**
 * Pure sorting function matching WalletTable's useMemo sort.
 * Extracted here for unit testing without React.
 */
function sortWallets(addresses) {
  return [...addresses].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1
    if (!a.isDefault && b.isDefault) return 1
    if (a.status === "verified" && b.status !== "verified") return -1
    if (a.status !== "verified" && b.status === "verified") return 1
    return b._creationTime - a._creationTime
  })
}

const addr = (id, status, isDefault, creationTime) => ({
  _id: id,
  status,
  isDefault,
  _creationTime: creationTime,
})

test("sort: default address comes first", () => {
  const wallets = [
    addr("a", "verified", false, 100),
    addr("b", "verified", true, 50),
  ]
  const sorted = sortWallets(wallets)
  assert.equal(sorted[0]._id, "b")
})

test("sort: verified before pending", () => {
  const wallets = [
    addr("pending1", "pending", false, 200),
    addr("verified1", "verified", false, 100),
  ]
  const sorted = sortWallets(wallets)
  assert.equal(sorted[0]._id, "verified1")
  assert.equal(sorted[1]._id, "pending1")
})

test("sort: within same status, newer first", () => {
  const wallets = [
    addr("old", "verified", false, 100),
    addr("new", "verified", false, 200),
  ]
  const sorted = sortWallets(wallets)
  assert.equal(sorted[0]._id, "new")
  assert.equal(sorted[1]._id, "old")
})

test("sort: full ordering — default > verified > pending, then by time", () => {
  const wallets = [
    addr("pending-old", "pending", false, 50),
    addr("verified-old", "verified", false, 100),
    addr("pending-new", "pending", false, 300),
    addr("default", "verified", true, 10),
    addr("verified-new", "verified", false, 200),
  ]
  const sorted = sortWallets(wallets)
  assert.deepEqual(
    sorted.map((w) => w._id),
    ["default", "verified-new", "verified-old", "pending-new", "pending-old"]
  )
})

test("sort: empty array returns empty array", () => {
  assert.deepEqual(sortWallets([]), [])
})

test("sort: single address returns same array", () => {
  const wallets = [addr("only", "pending", false, 100)]
  const sorted = sortWallets(wallets)
  assert.equal(sorted.length, 1)
  assert.equal(sorted[0]._id, "only")
})

test("sort: does not mutate original array", () => {
  const wallets = [
    addr("b", "pending", false, 200),
    addr("a", "verified", false, 100),
  ]
  const original = [...wallets]
  sortWallets(wallets)
  assert.equal(wallets[0]._id, original[0]._id)
  assert.equal(wallets[1]._id, original[1]._id)
})

// ─── Delete confirmation state machine ────────────────────────────────

/**
 * Pure state machine for the two-tap delete confirmation pattern.
 * Mirrors the handleDelete logic in WalletTable.
 */
function deleteStateMachine(confirmDeleteId, addressId) {
  if (confirmDeleteId !== addressId) {
    return { action: "confirm", newConfirmId: addressId }
  }
  return { action: "delete", newConfirmId: null }
}

test("delete confirmation: first tap sets confirm state", () => {
  const result = deleteStateMachine(null, "addr-1")
  assert.equal(result.action, "confirm")
  assert.equal(result.newConfirmId, "addr-1")
})

test("delete confirmation: second tap on same address triggers delete", () => {
  const result = deleteStateMachine("addr-1", "addr-1")
  assert.equal(result.action, "delete")
  assert.equal(result.newConfirmId, null)
})

test("delete confirmation: tapping different address resets to new confirm", () => {
  const result = deleteStateMachine("addr-1", "addr-2")
  assert.equal(result.action, "confirm")
  assert.equal(result.newConfirmId, "addr-2")
})

test("delete confirmation: tapping when no previous confirm sets confirm", () => {
  const result = deleteStateMachine(null, "addr-5")
  assert.equal(result.action, "confirm")
  assert.equal(result.newConfirmId, "addr-5")
})

// ─── EVM address dedup logic (client-side) ────────────────────────────

function isAlreadyLinked(input, addresses) {
  const normalized = input.trim().toLowerCase()
  return addresses.some((a) => a.address.toLowerCase() === normalized)
}

test("dedup: detects exact match", () => {
  const addresses = [{ address: "0xAbCd" }]
  assert.equal(isAlreadyLinked("0xAbCd", addresses), true)
})

test("dedup: detects case-insensitive match", () => {
  const addresses = [{ address: "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12" }]
  assert.equal(
    isAlreadyLinked("0xabcdef1234567890abcdef1234567890abcdef12", addresses),
    true
  )
})

test("dedup: trims whitespace before comparing", () => {
  const addresses = [{ address: "0xAbCd" }]
  assert.equal(isAlreadyLinked("  0xAbCd  ", addresses), true)
})

test("dedup: returns false for unlinked address", () => {
  const addresses = [{ address: "0xAbCd" }]
  assert.equal(isAlreadyLinked("0x1234", addresses), false)
})

test("dedup: returns false for empty address list", () => {
  assert.equal(isAlreadyLinked("0xAbCd", []), false)
})
