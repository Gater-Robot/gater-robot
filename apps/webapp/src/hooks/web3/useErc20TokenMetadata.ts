import { getChainLabel } from "@gater/chain-registry"
import { useQuery } from "@tanstack/react-query"
import { erc20Abi, formatUnits, isAddress, type Address } from "viem"

import { getPublicClient } from "@/lib/web3/publicClient"
import { getParsedError } from "@/lib/web3/getParsedError"

export type Erc20TokenMetadata = {
  address: Address
  name: string
  symbol: string
  decimals: number
  balance?: string
}

export function useErc20TokenMetadata(args: {
  chainId: number | null | undefined
  tokenAddress: string
  account?: Address | null
}) {
  const chainId = args.chainId ?? null
  const normalized = args.tokenAddress.trim()
  const normalizedLower = normalized.toLowerCase()
  const validAddress = isAddress(normalized, { strict: false })

  return useQuery({
    queryKey: ["erc20TokenMetadata", chainId, normalizedLower, args.account ?? null],
    enabled: chainId != null && validAddress,
    queryFn: async (): Promise<Erc20TokenMetadata> => {
      if (chainId == null) throw new Error("Missing chain")
      if (!validAddress) throw new Error("Invalid address")

      const publicClient = getPublicClient(chainId)
      const address = normalized as Address

      const bytecode = await publicClient.getBytecode({ address })
      if (bytecode == null || bytecode === "0x") {
        throw new Error(`No contract deployed at this address on ${getChainLabel(chainId)}.`)
      }

      const [nameRes, symbolRes, decimalsRes] = await Promise.allSettled([
        publicClient.readContract({ address, abi: erc20Abi, functionName: "name" }),
        publicClient.readContract({ address, abi: erc20Abi, functionName: "symbol" }),
        publicClient.readContract({ address, abi: erc20Abi, functionName: "decimals" }),
      ])

      const allFailed =
        nameRes.status === "rejected" &&
        symbolRes.status === "rejected" &&
        decimalsRes.status === "rejected"

      if (allFailed) {
        const base = `Token not found on ${getChainLabel(chainId)}.`
        const details = getParsedError(nameRes.reason)
        throw new Error(`${base} ${details}`)
      }

      const decimals =
        decimalsRes.status === "fulfilled" ? Number(decimalsRes.value) : 18

      const name =
        nameRes.status === "fulfilled" && typeof nameRes.value === "string"
          ? nameRes.value
          : "Unknown Token"

      const symbol =
        symbolRes.status === "fulfilled" && typeof symbolRes.value === "string"
          ? symbolRes.value
          : "UNKNOWN"

      let balance: string | undefined
      if (args.account && isAddress(args.account)) {
        const balanceRes = await publicClient
          .readContract({
            address,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [args.account],
          })
          .catch(() => undefined)
        if (typeof balanceRes === "bigint") {
          balance = Number(formatUnits(balanceRes, decimals)).toFixed(6)
        }
      }

      return { address, name, symbol, decimals, balance }
    },
    retry: false,
  })
}

