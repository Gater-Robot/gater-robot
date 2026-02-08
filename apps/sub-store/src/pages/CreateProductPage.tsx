import { useMemo, useState } from 'react'
import { useAccount, usePublicClient, useWriteContract } from 'wagmi'
import { Card, Button, Input, Label, Hr, Pill } from '../components/ui'
import { mustGetAddress, getExplorerTxUrl } from '../lib/env'
import { subFactoryAbi } from '../lib/abi'
import { upsertProduct } from '../lib/storage'
import { appChain } from '../wagmi'
import { parseUsdcToUnits } from '../lib/format'
import { decodeEventLog } from 'viem'

const FACTORY = mustGetAddress('VITE_FACTORY_ADDRESS')

export default function CreateProductPage() {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const { writeContractAsync, isPending } = useWriteContract()

  const [name, setName] = useState('My Subscription')
  const [symbol, setSymbol] = useState('SUB')
  const [treasury, setTreasury] = useState(address ?? '')
  const [refundsEnabled, setRefundsEnabled] = useState(true)
  const [refundPrice, setRefundPrice] = useState('0.10') // USDC
  const [minPurchase30Only, setMinPurchase30Only] = useState(false)

  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)
  const [result, setResult] = useState<{ subToken: `0x${string}`; poolId: `0x${string}` } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const txUrl = useMemo(() => (txHash ? getExplorerTxUrl(txHash) : undefined), [txHash])

  async function onCreate() {
    setError(null)
    setResult(null)
    setTxHash(null)

    if (!address) {
      setError('Connect your wallet first.')
      return
    }
    if (!treasury) {
      setError('Treasury address is required.')
      return
    }

    try {
      const refundPriceUsdc = parseUsdcToUnits(refundPrice) // 6 decimals
      const hash = await writeContractAsync({
        address: FACTORY,
        abi: subFactoryAbi,
        functionName: 'createProduct',
        args: [{
          name,
          symbol,
          treasury: treasury as any,
          minPurchase30Only,
          refundsEnabled,
          refundPriceUsdc: BigInt(refundPriceUsdc),
        } as any],
      })
      setTxHash(hash)

      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      // Parse ProductCreated event if present
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: subFactoryAbi,
            data: log.data,
            topics: log.topics,
          })
          if (decoded.eventName === 'ProductCreated') {
            const args = decoded.args as any
            const subToken = args.subToken as `0x${string}`
            const poolId = args.poolId as `0x${string}`
            setResult({ subToken, poolId })
            upsertProduct(appChain.id, address, { poolId, subToken, name, symbol, createdAt: Date.now() })
            break
          }
        } catch {
          // ignore non-matching logs
        }
      }

      if (!result) {
        // Not fatal; contract might not emit ProductCreated event
        // User can copy poolId from their own logs or from a separate read method.
      }
    } catch (e: any) {
      setError(e?.shortMessage ?? e?.message ?? String(e))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Create a SUB product</h1>
        <p className="mt-1 text-white/70">
          Deploy a new decaying SUB token + create its v4 pool via your SubFactory.
        </p>
      </div>

      <Card className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Symbol</Label>
            <Input value={symbol} onChange={(e) => setSymbol(e.target.value)} />
          </div>
        </div>

        <div>
          <Label>Treasury address</Label>
          <Input value={treasury} onChange={(e) => setTreasury(e.target.value)} placeholder="0x…" />
          <div className="mt-1 text-xs text-white/50">
            Defaults to your connected wallet. This address will receive fee/spread proceeds (depending on your contracts).
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label>Refunds enabled</Label>
            <div className="mt-2 flex items-center gap-2">
              <input type="checkbox" checked={refundsEnabled} onChange={(e) => setRefundsEnabled(e.target.checked)} />
              <span className="text-sm text-white/70">Allow sell/refund</span>
            </div>
          </div>
          <div>
            <Label>Refund price (USDC per token)</Label>
            <Input value={refundPrice} onChange={(e) => setRefundPrice(e.target.value)} />
          </div>
          <div>
            <Label>Min purchase 30-only</Label>
            <div className="mt-2 flex items-center gap-2">
              <input type="checkbox" checked={minPurchase30Only} onChange={(e) => setMinPurchase30Only(e.target.checked)} />
              <span className="text-sm text-white/70">Disable 1-day tier</span>
            </div>
          </div>
        </div>

        <Hr />

        <div className="flex items-center gap-3">
          <Button onClick={onCreate} disabled={isPending}>
            {isPending ? 'Deploying…' : 'Deploy product'}
          </Button>
          <Pill className="font-mono">Factory: {FACTORY}</Pill>
        </div>

        {txHash && (
          <div className="text-sm">
            Tx: <span className="font-mono">{txHash}</span>
            {txUrl && (
              <a className="ml-2 underline text-white/80" href={txUrl} target="_blank" rel="noreferrer">
                View on explorer
              </a>
            )}
          </div>
        )}

        {result && (
          <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm">
            <div className="font-bold">Created!</div>
            <div className="mt-2 space-y-1 font-mono">
              <div>subToken: {result.subToken}</div>
              <div>poolId: {result.poolId}</div>
            </div>
            <div className="mt-3 text-white/70">
              Next: go to <a className="underline" href={`/manage/${result.poolId}`}>Manage</a> or{' '}
              <a className="underline" href={`/product/${result.poolId}`}>Storefront</a>.
            </div>
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
