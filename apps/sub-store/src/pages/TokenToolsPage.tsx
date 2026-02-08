import { useEffect, useMemo, useState } from 'react'
import { isAddress } from 'viem'
import { useAccount, useReadContract } from 'wagmi'
import { Button, Card, Input, Label, Pill } from '../components/ui'
import { erc20Abi } from '../lib/abi'
import { contractsConfig } from '../lib/contracts'
import { loadProducts } from '../lib/storage'
import { appChain } from '../wagmi'
import { SUB_ICON_DATA_URI, USDC_ICON_DATA_URI } from '../lib/tokenIcons'

type WatchAsset = {
  address: `0x${string}`
  symbol: string
  decimals: number
  image: string
}

async function watchAssetInWallet(asset: WatchAsset) {
  const provider = (window as any).ethereum
  if (!provider?.request) {
    throw new Error('No injected wallet found. Install MetaMask (or another injected wallet).')
  }

  const withImage = {
    type: 'ERC20',
    options: asset,
  } as const

  try {
    return await provider.request({
      method: 'wallet_watchAsset',
      params: withImage,
    })
  } catch {
    // Some wallets reject data-URI token images; retry without image.
    return await provider.request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC20',
        options: {
          address: asset.address,
          symbol: asset.symbol,
          decimals: asset.decimals,
        },
      },
    })
  }
}

export default function TokenToolsPage() {
  if (!contractsConfig) {
    return null
  }

  const USDC = contractsConfig.usdc
  const DEFAULT_SUB = contractsConfig.subToken
  const { address, isConnected } = useAccount()
  const [subTokenInput, setSubTokenInput] = useState<string>(DEFAULT_SUB ?? '')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const products = useMemo(() => {
    const mine = loadProducts(appChain.id, address)
    const global = loadProducts(appChain.id, undefined)
    const merged = [...mine, ...global]
    const dedup = new Map<string, typeof merged[number]>()
    for (const p of merged) {
      dedup.set(p.subToken.toLowerCase(), p)
    }
    return [...dedup.values()]
  }, [address])

  useEffect(() => {
    if (subTokenInput || !products.length) return
    setSubTokenInput(products[0].subToken)
  }, [products, subTokenInput])

  const subToken = isAddress(subTokenInput) ? (subTokenInput as `0x${string}`) : undefined

  const { data: subSymbol } = useReadContract({
    address: subToken,
    abi: erc20Abi,
    functionName: 'symbol',
    query: { enabled: !!subToken },
  })

  const { data: subDecimals } = useReadContract({
    address: subToken,
    abi: erc20Abi,
    functionName: 'decimals',
    query: { enabled: !!subToken },
  })

  const { data: usdcSymbol } = useReadContract({
    address: USDC,
    abi: erc20Abi,
    functionName: 'symbol',
  })

  const { data: usdcDecimals } = useReadContract({
    address: USDC,
    abi: erc20Abi,
    functionName: 'decimals',
  })

  async function addSubToken() {
    setStatus(null)
    setError(null)

    if (!subToken) {
      setError('Enter a valid SUB token address first.')
      return
    }

    try {
      const ok = await watchAssetInWallet({
        address: subToken,
        symbol: (subSymbol as string | undefined) ?? 'SUB',
        decimals: Number(subDecimals ?? 18),
        image: SUB_ICON_DATA_URI,
      })

      setStatus(ok ? 'SUB token added to wallet.' : 'Wallet dismissed the add-token prompt.')
    } catch (e: any) {
      setError(e?.shortMessage ?? e?.message ?? String(e))
    }
  }

  async function addUsdcToken() {
    setStatus(null)
    setError(null)

    try {
      const ok = await watchAssetInWallet({
        address: USDC,
        symbol: (usdcSymbol as string | undefined) ?? 'mUSDC',
        decimals: Number(usdcDecimals ?? 6),
        image: USDC_ICON_DATA_URI,
      })

      setStatus(ok ? 'USDC token added to wallet.' : 'Wallet dismissed the add-token prompt.')
    } catch (e: any) {
      setError(e?.shortMessage ?? e?.message ?? String(e))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Token tools</h1>
        <p className="mt-1 text-white/70">
          Add your SUB token and your fake USDC token to MetaMask with one click.
        </p>
      </div>

      <Card className="space-y-4">
        <div className="flex items-center gap-2">
          <Pill>Chain: {appChain.name}</Pill>
          <Pill>Wallet: {isConnected ? 'Connected' : 'Not connected'}</Pill>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="mb-3 flex items-center gap-3">
              <img src={SUB_ICON_DATA_URI} alt="SUB token logo" className="h-10 w-10 rounded-full" />
              <div className="font-bold">SUB token (+1 coin)</div>
            </div>

            <Label>SUB token address</Label>
            <Input
              value={subTokenInput}
              onChange={(e) => setSubTokenInput(e.target.value)}
              placeholder="0x..."
            />

            {products.length > 0 && (
              <div className="mt-3">
                <Label>Use token from your local products</Label>
                <select
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                  value={subTokenInput}
                  onChange={(e) => setSubTokenInput(e.target.value)}
                >
                  {products.map((p) => (
                    <option key={p.subToken} value={p.subToken}>
                      {p.symbol ?? 'SUB'} • {p.subToken}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="mt-3 text-xs text-white/60">
              Symbol: {(subSymbol as string | undefined) ?? 'SUB'} | Decimals: {Number(subDecimals ?? 18)}
            </div>

            <Button className="mt-4 w-full" onClick={addSubToken} disabled={!isConnected || !subToken}>
              Add SUB to MetaMask
            </Button>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="mb-3 flex items-center gap-3">
              <img src={USDC_ICON_DATA_URI} alt="USDC token logo" className="h-10 w-10 rounded-full" />
              <div className="font-bold">Fake USDC token</div>
            </div>

            <div className="text-xs text-white/60">Address</div>
            <div className="mt-1 break-all rounded-lg border border-white/10 bg-black/30 p-2 font-mono text-xs">
              {USDC}
            </div>

            <div className="mt-3 text-xs text-white/60">
              Symbol: {(usdcSymbol as string | undefined) ?? 'mUSDC'} | Decimals: {Number(usdcDecimals ?? 6)}
            </div>

            <Button className="mt-4 w-full" onClick={addUsdcToken} disabled={!isConnected}>
              Add USDC to MetaMask
            </Button>
          </div>
        </div>

        {status && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-100">
            {status}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
            {error}
          </div>
        )}
      </Card>
    </div>
  )
}
