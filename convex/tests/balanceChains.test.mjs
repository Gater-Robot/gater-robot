import assert from "node:assert/strict"
import test from "node:test"

import { getChainClient, getSupportedChains, isSupportedChain } from "../.test-dist/lib/balance.js"

test("convex balance: supported chains include 25+ networks", () => {
  const chains = getSupportedChains()
  assert.ok(chains.length >= 25)
})

test("convex balance: isSupportedChain is true for every supported chain id", () => {
  for (const chainId of getSupportedChains()) {
    assert.equal(isSupportedChain(chainId), true, `expected supported chainId ${chainId}`)
  }
})

test("convex balance: getChainClient does not throw for supported chain ids", () => {
  for (const chainId of getSupportedChains()) {
    assert.doesNotThrow(() => getChainClient(chainId), `expected getChainClient(${chainId}) to not throw`)
  }
})

