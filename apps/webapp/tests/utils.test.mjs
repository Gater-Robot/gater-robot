import test from "node:test"
import assert from "node:assert/strict"

import { isValidEvmAddress, truncateAddress } from "../.test-dist/src/lib/utils.js"

// ─── isValidEvmAddress ────────────────────────────────────────────────

test("isValidEvmAddress: accepts a valid checksummed address", () => {
  assert.equal(
    isValidEvmAddress("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"),
    true
  )
})

test("isValidEvmAddress: accepts a valid lowercase address", () => {
  assert.equal(
    isValidEvmAddress("0xd8da6bf26964af9d7eed9e03e53415d37aa96045"),
    true
  )
})

test("isValidEvmAddress: accepts a valid uppercase address", () => {
  assert.equal(
    isValidEvmAddress("0xD8DA6BF26964AF9D7EED9E03E53415D37AA96045"),
    true
  )
})

test("isValidEvmAddress: trims whitespace before validating", () => {
  assert.equal(
    isValidEvmAddress("  0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045  "),
    true
  )
})

test("isValidEvmAddress: rejects empty string", () => {
  assert.equal(isValidEvmAddress(""), false)
})

test("isValidEvmAddress: rejects whitespace-only string", () => {
  assert.equal(isValidEvmAddress("   "), false)
})

test("isValidEvmAddress: rejects address without 0x prefix", () => {
  assert.equal(
    isValidEvmAddress("d8dA6BF26964aF9D7eEd9e03E53415D37aA96045"),
    false
  )
})

test("isValidEvmAddress: rejects address that is too short", () => {
  assert.equal(isValidEvmAddress("0x1234"), false)
})

test("isValidEvmAddress: rejects address that is too long (41 hex chars)", () => {
  assert.equal(
    isValidEvmAddress("0x" + "a".repeat(41)),
    false
  )
})

test("isValidEvmAddress: rejects address with non-hex characters", () => {
  assert.equal(
    isValidEvmAddress("0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG"),
    false
  )
})

test("isValidEvmAddress: rejects ENS name", () => {
  assert.equal(isValidEvmAddress("vitalik.eth"), false)
})

test("isValidEvmAddress: rejects random text", () => {
  assert.equal(isValidEvmAddress("hello world"), false)
})

test("isValidEvmAddress: rejects 0x prefix alone", () => {
  assert.equal(isValidEvmAddress("0x"), false)
})

test("isValidEvmAddress: accepts the zero address", () => {
  assert.equal(
    isValidEvmAddress("0x0000000000000000000000000000000000000000"),
    true
  )
})

// ─── truncateAddress ──────────────────────────────────────────────────

test("truncateAddress: truncates a standard address", () => {
  assert.equal(
    truncateAddress("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"),
    "0xd8dA...6045"
  )
})

test("truncateAddress: returns empty string for empty input", () => {
  assert.equal(truncateAddress(""), "")
})

test("truncateAddress: returns short address unchanged", () => {
  assert.equal(truncateAddress("0x1234"), "0x1234")
})

test("truncateAddress: respects custom prefix and suffix lengths", () => {
  assert.equal(
    truncateAddress("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", 4, 6),
    "0xd8...A96045"
  )
})
