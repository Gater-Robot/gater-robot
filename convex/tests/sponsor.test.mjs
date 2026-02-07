import assert from "node:assert/strict"
import test from "node:test"

import { getSponsorAccount, getSponsorWalletClient } from "../.test-dist/lib/sponsor.js"

test("convex sponsor: getSponsorAccount throws when FAUCET_SPONSOR_PRIVATE_KEY is not set", () => {
  const original = process.env.FAUCET_SPONSOR_PRIVATE_KEY
  try {
    delete process.env.FAUCET_SPONSOR_PRIVATE_KEY
    assert.throws(
      () => getSponsorAccount(),
      { message: "FAUCET_SPONSOR_PRIVATE_KEY is not configured" }
    )
  } finally {
    if (original === undefined) {
      delete process.env.FAUCET_SPONSOR_PRIVATE_KEY
    } else {
      process.env.FAUCET_SPONSOR_PRIVATE_KEY = original
    }
  }
})

test("convex sponsor: getSponsorAccount returns a valid account for a known private key", () => {
  const original = process.env.FAUCET_SPONSOR_PRIVATE_KEY
  try {
    process.env.FAUCET_SPONSOR_PRIVATE_KEY =
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    const account = getSponsorAccount()
    assert.ok(account.address, "account should have an address property")
    assert.ok(
      typeof account.address === "string" && account.address.startsWith("0x"),
      "address should be a hex string starting with 0x"
    )
  } finally {
    if (original === undefined) {
      delete process.env.FAUCET_SPONSOR_PRIVATE_KEY
    } else {
      process.env.FAUCET_SPONSOR_PRIVATE_KEY = original
    }
  }
})

test("convex sponsor: getSponsorWalletClient throws on unsupported chain id", () => {
  const original = process.env.FAUCET_SPONSOR_PRIVATE_KEY
  try {
    process.env.FAUCET_SPONSOR_PRIVATE_KEY =
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    assert.throws(
      () => getSponsorWalletClient(999999),
      { message: "Unsupported chain for faucet: 999999" }
    )
  } finally {
    if (original === undefined) {
      delete process.env.FAUCET_SPONSOR_PRIVATE_KEY
    } else {
      process.env.FAUCET_SPONSOR_PRIVATE_KEY = original
    }
  }
})

test("convex sponsor: getSponsorWalletClient returns a client for Base (8453)", () => {
  const original = process.env.FAUCET_SPONSOR_PRIVATE_KEY
  try {
    process.env.FAUCET_SPONSOR_PRIVATE_KEY =
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    const client = getSponsorWalletClient(8453)
    assert.ok(client, "client should be truthy")
    assert.equal(typeof client.writeContract, "function", "client should have writeContract method")
  } finally {
    if (original === undefined) {
      delete process.env.FAUCET_SPONSOR_PRIVATE_KEY
    } else {
      process.env.FAUCET_SPONSOR_PRIVATE_KEY = original
    }
  }
})

test("convex sponsor: getSponsorWalletClient throws when private key is missing", () => {
  const original = process.env.FAUCET_SPONSOR_PRIVATE_KEY
  try {
    delete process.env.FAUCET_SPONSOR_PRIVATE_KEY
    assert.throws(
      () => getSponsorWalletClient(8453),
      { message: "FAUCET_SPONSOR_PRIVATE_KEY is not configured" }
    )
  } finally {
    if (original === undefined) {
      delete process.env.FAUCET_SPONSOR_PRIVATE_KEY
    } else {
      process.env.FAUCET_SPONSOR_PRIVATE_KEY = original
    }
  }
})
