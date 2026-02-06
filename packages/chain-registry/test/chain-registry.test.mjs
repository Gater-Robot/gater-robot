import assert from "node:assert/strict"
import test from "node:test"
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { SUPPORTED_CHAINS } from "../src/index.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

test("chain registry: has expected chain count", () => {
  assert.equal(SUPPORTED_CHAINS.length, 27)
})

test("chain registry: chain IDs are unique", () => {
  const ids = SUPPORTED_CHAINS.map((c) => c.chainId)
  assert.equal(ids.length, new Set(ids).size)
})

test("chain registry: icon exists for every supported chain", async () => {
  const repoRoot = path.resolve(__dirname, "../../..")
  const iconDir = path.join(repoRoot, "apps/webapp/public/chain_logo")

  await Promise.all(
    SUPPORTED_CHAINS.map(async (chain) => {
      const iconPath = path.join(iconDir, `${chain.chainId}.png`)
      await fs.access(iconPath)
    }),
  )
})
