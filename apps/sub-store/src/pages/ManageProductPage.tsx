import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAccount, useReadContract, usePublicClient, useWriteContract } from 'wagmi'
import { Card, Button, Input, Label, Hr, Pill } from '../components/ui'
import { mustGetAddress, getExplorerTxUrl, getExplorerAddressUrl } from '../lib/env'
import { erc20Abi, subHookAbi } from '../lib/abi'
import { parseUsdcToUnits, formatUnits } from '../lib/format'

const HOOK = mustGetAddress('VITE_HOOK_ADDRESS')
const USDC = mustGetAddress('VITE_USDC_ADDRESS')

export default function ManageProductPage() {
  const { poolId = '' } = useParams()
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const { writeContractAsync, isPending } = useWriteContract()

  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)

  const { data: cfgData, refetch } = useReadContract({
    address: HOOK,
    abi: subHookAbi,
    functionName: 'getProduct',
    args: [poolId as any],
    query: { enabled: poolId.length > 0 },
  })

  const cfg = (cfgData as any)?.cfg ?? (cfgData as any)
  const subToken = cfg?.subToken as `0x${string}` | undefined

  const { data: subSymbol } = useReadContract({
    address: subToken,
    abi: erc20Abi,
    functionName: 'symbol',
    query: { enabled: !!subToken },
  })

  const { data: usdcSymbol } = useReadContract({
    address: USDC,
    abi: erc20Abi,
    functionName: 'symbol',
  })

  const [treasury, setTreasury] = useState<string>('')
  const [refundsEnabled, setRefundsEnabled] = useState<boolean>(true)
  const [refundPrice, setRefundPrice] = useState<string>('0.10')
  const [minPurchase30Only, setMinPurchase30Only] = useState<boolean>(false)

  // Initialize form when cfg loads
  useMemo(() => {
    if (!cfg) return
    setTreasury(cfg.treasury ?? '')
    setRefundsEnabled(!!cfg.refundsEnabled)
    setMinPurchase30Only(!!cfg.minPurchase30Only)
    const refundPriceUsdc = BigInt(cfg.refundPriceUsdc ?? 0)
    setRefundPrice(formatUnits(refundPriceUsdc, 6, 6))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg?.treasury, cfg?.refundsEnabled, cfg?.refundPriceUsdc, cfg?.minPurchase30Only])

  const txUrl = useMemo(() => (txHash ? getExplorerTxUrl(txHash) : undefined), [txHash])

  async function onSave() {
    setError(null)
    setTxHash(null)
    if (!cfg) { setError('Product not configured or poolId invalid.'); return }
    if (!address) { setError('Connect your wallet.'); return }

    try {
      const refundPriceUsdc = parseUsdcToUnits(refundPrice)

      const newCfg = {
        creator: cfg.creator,
        treasury,
        subToken: cfg.subToken,
        usdcToken: cfg.usdcToken,
        minPurchase30Only,
        refundsEnabled,
        refundPriceUsdc: BigInt(refundPriceUsdc),
        couponRegistry: cfg.couponRegistry,
      }

      const hash = await writeContractAsync({
        address: HOOK,
        abi: subHookAbi,
        functionName: 'configureProduct',
        args: [poolId as any, newCfg as any],
      })
      setTxHash(hash)
      await publicClient.waitForTransactionReceipt({ hash })
      await refetch()
    } catch (e: any) {
      setError(e?.shortMessage ?? e?.message ?? String(e))
    }
  }

  // Refund reserve deposit
  const [depositAmt, setDepositAmt] = useState('')
  const depositUnits = useMemo(() => parseUsdcToUnits(depositAmt), [depositAmt])

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [address as any, HOOK],
    query: { enabled: !!address },
  })

  async function onApprove() {
    setError(null); setTxHash(null)
    try {
      const hash = await writeContractAsync({
        address: USDC,
        abi: erc20Abi,
        functionName: 'approve',
        args: [HOOK, depositUnits],
      })
      setTxHash(hash)
      await publicClient.waitForTransactionReceipt({ hash })
      await refetchAllowance()
    } catch (e: any) {
      setError(e?.shortMessage ?? e?.message ?? String(e))
    }
  }

  async function onDeposit() {
    setError(null); setTxHash(null)
    try {
      const hash = await writeContractAsync({
        address: HOOK,
        abi: subHookAbi,
        functionName: 'depositRefundReserve',
        args: [poolId as any, BigInt(depositUnits)],
      })
      setTxHash(hash)
      await publicClient.waitForTransactionReceipt({ hash })
    } catch (e: any) {
      setError(e?.shortMessage ?? e?.message ?? String(e))
    }
  }

  const needsApprove = (allowance ?? 0n) < depositUnits

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Manage product</h1>
          <div className="mt-1 text-white/70">
            PoolId: <span className="font-mono">{poolId}</span>
          </div>
        </div>
        <Link to={`/product/${poolId}`}>
          <Button>Open storefront</Button>
        </Link>
      </div>

      <Card className="space-y-4">
        {!cfg ? (
          <div className="text-white/70">Loading config (or poolId not configured)…</div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Pill>SUB: {subSymbol ?? 'SUB'} {subToken ? <a className="underline ml-1" href={getExplorerAddressUrl(subToken)} target="_blank" rel="noreferrer">explorer</a> : null}</Pill>
              <Pill>USDC: {usdcSymbol ?? 'USDC'} {USDC ? <a className="underline ml-1" href={getExplorerAddressUrl(USDC)} target="_blank" rel="noreferrer">explorer</a> : null}</Pill>
              <Pill>Hook: {HOOK}</Pill>
            </div>

            <Hr />

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Treasury</Label>
                <Input value={treasury} onChange={(e) => setTreasury(e.target.value)} />
              </div>
              <div>
                <Label>Refund price (USDC / token)</Label>
                <Input value={refundPrice} onChange={(e) => setRefundPrice(e.target.value)} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={refundsEnabled} onChange={(e) => setRefundsEnabled(e.target.checked)} />
                <span className="text-sm text-white/70">Refunds enabled</span>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={minPurchase30Only} onChange={(e) => setMinPurchase30Only(e.target.checked)} />
                <span className="text-sm text-white/70">Min purchase 30-only</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={onSave} disabled={isPending}>
                {isPending ? 'Saving…' : 'Save settings'}
              </Button>
              <Button variant="ghost" onClick={() => refetch()}>Refresh</Button>
            </div>

            <Hr />

            <div>
              <div className="font-bold">Refund reserve</div>
              <div className="mt-1 text-sm text-white/60">
                Deposit USDC so refunds can be paid. This UI assumes the hook uses `transferFrom` on USDC.
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-3 sm:items-end">
                <div className="sm:col-span-2">
                  <Label>Deposit amount (USDC)</Label>
                  <Input value={depositAmt} onChange={(e) => setDepositAmt(e.target.value)} placeholder="e.g. 100" />
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={onApprove} disabled={!depositAmt || !needsApprove}>
                    Approve
                  </Button>
                  <Button onClick={onDeposit} disabled={!depositAmt || needsApprove}>
                    Deposit
                  </Button>
                </div>
              </div>

              <div className="mt-2 text-xs text-white/50">
                Allowance: <span className="font-mono">{(allowance ?? 0n).toString()}</span> (raw USDC units)
              </div>
            </div>
          </>
        )}

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

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
            {error}
          </div>
        )}
      </Card>
    </div>
  )
}
