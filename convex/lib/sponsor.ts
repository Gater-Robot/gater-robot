/**
 * Sponsor wallet client for gasless faucet transactions.
 *
 * Creates a viem WalletClient using the FAUCET_SPONSOR_PRIVATE_KEY env var.
 * Reuses the RPC URL resolution logic from balance.ts.
 */

import { getViemChain } from '@gater/chain-registry'
import {
  createWalletClient,
  http,
  type WalletClient,
  type Chain,
  type Transport,
  type Account,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

import { getRpcUrl } from './rpc.js'

export function getSponsorAccount() {
  const privateKey = process.env.FAUCET_SPONSOR_PRIVATE_KEY
  if (!privateKey) {
    throw new Error("FAUCET_SPONSOR_PRIVATE_KEY is not configured")
  }
  return privateKeyToAccount(privateKey as `0x${string}`)
}

export function getSponsorWalletClient(
  chainId: number
): WalletClient<Transport, Chain, Account> {
  const chain = getViemChain(chainId)
  const rpcUrl = getRpcUrl(chainId)

  if (!chain || !rpcUrl) {
    throw new Error(`Unsupported chain for faucet: ${chainId}`)
  }

  const account = getSponsorAccount()

  return createWalletClient({
    account,
    chain,
    transport: http(rpcUrl, {
      timeout: 15_000,
      retryCount: 0, // We handle retries ourselves
    }),
  }) as WalletClient<Transport, Chain, Account>
}
