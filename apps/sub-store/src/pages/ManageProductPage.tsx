import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAccount, usePublicClient, useReadContract, useWriteContract } from 'wagmi'
import { maxUint256 } from 'viem'
import { Button, Card, Hr, Input, Label, Pill } from '../components/ui'
import { erc20Abi } from '../lib/abi'
import {
  contractsConfig,
  SUBSCRIPTION_HOOK_ABI,
  USDC_DECIMALS,
} from '../lib/contracts'
import { getExplorerAddressUrl, getExplorerTxUrl } from '../lib/env'
import { formatUnits, parseUsdcToUnits } from '../lib/format'
import { appChain } from '../wagmi'

export default function ManageProductPage() {
  const { poolId } = useParams()
  const { address, chainId } = useAccount()
  const publicClient = usePublicClient()
  const { writeContractAsync, isPending } = useWriteContract()

  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)

  const [basePrice, setBasePrice] = useState('1.00')
  const [monthlyTokens, setMonthlyTokens] = useState('30')
  const [monthlyPrice, setMonthlyPrice] = useState('20')
  const [yearlyTokens, setYearlyTokens] = useState('365')
  const [yearlyPrice, setYearlyPrice] = useState('200')
  const [refundPrice, setRefundPrice] = useState('0.10')
  const [enforceMinMonthly, setEnforceMinMonthly] = useState(false)
  const [refundsEnabled, setRefundsEnabled] = useState(true)
  const [reserveAmount, setReserveAmount] = useState('')

  if (!contractsConfig) {
    return null
  }

  const { hook, router, usdc, subToken } = contractsConfig
  const wrongChain = !!chainId && chainId !== appChain.id
  const reserveUnits = useMemo(() => parseUsdcToUnits(reserveAmount), [reserveAmount])
  const txUrl = useMemo(() => (txHash ? getExplorerTxUrl(txHash) : undefined), [txHash])

  const { data: hookOwner } = useReadContract({
    address: hook,
    abi: SUBSCRIPTION_HOOK_ABI,
    functionName: 'owner',
  })

  const { data: hookRouter } = useReadContract({
    address: hook,
    abi: SUBSCRIPTION_HOOK_ABI,
    functionName: 'router',
  })

  const { data: reserveUsdc, refetch: refetchReserve } = useReadContract({
    address: hook,
    abi: SUBSCRIPTION_HOOK_ABI,
    functionName: 'refundReserveUsdc',
  })

  const { data: pricingData, refetch: refetchPricing } = useReadContract({
    address: hook,
    abi: SUBSCRIPTION_HOOK_ABI,
    functionName: 'pricing',
  })

  const { data: subSymbol } = useReadContract({
    address: subToken,
    abi: erc20Abi,
    functionName: 'symbol',
  })

  const { data: usdcSymbol } = useReadContract({
    address: usdc,
    abi: erc20Abi,
    functionName: 'symbol',
  })

  const { data: usdcAllowanceToHook, refetch: refetchAllowance } = useReadContract({
    address: usdc,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [address as `0x${string}`, hook],
    query: { enabled: !!address },
  })

  const isOwner =
    !!address && !!hookOwner && address.toLowerCase() === (hookOwner as string).toLowerCase()

  useEffect(() => {
    if (!pricingData) return
    const pricing = pricingData as any
    const base = BigInt(pricing.basePriceUsdc ?? pricing[0] ?? 0)
    const monthlyBundleTokens = Number(pricing.monthlyBundleTokens ?? pricing[1] ?? 30)
    const monthlyBundlePriceUsdc = BigInt(pricing.monthlyBundlePriceUsdc ?? pricing[2] ?? 0)
    const yearlyBundleTokens = Number(pricing.yearlyBundleTokens ?? pricing[3] ?? 365)
    const yearlyBundlePriceUsdc = BigInt(pricing.yearlyBundlePriceUsdc ?? pricing[4] ?? 0)
    const enforceMin = Boolean(pricing.enforceMinMonthly ?? pricing[5] ?? false)
    const refunds = Boolean(pricing.refundsEnabled ?? pricing[6] ?? true)
    const refund = BigInt(pricing.refundPriceUsdc ?? pricing[7] ?? 0)

    setBasePrice(formatUnits(base, USDC_DECIMALS, 6))
    setMonthlyTokens(String(monthlyBundleTokens))
    setMonthlyPrice(formatUnits(monthlyBundlePriceUsdc, USDC_DECIMALS, 6))
    setYearlyTokens(String(yearlyBundleTokens))
    setYearlyPrice(formatUnits(yearlyBundlePriceUsdc, USDC_DECIMALS, 6))
    setEnforceMinMonthly(enforceMin)
    setRefundsEnabled(refunds)
    setRefundPrice(formatUnits(refund, USDC_DECIMALS, 6))
  }, [pricingData])

  async function runWrite(tx: Promise<`0x${string}`>) {
    if (!publicClient) {
      setError('Public client is not ready yet. Try again in a moment.')
      return
    }
    setError(null)
    const hash = await tx
    setTxHash(hash)
    await publicClient.waitForTransactionReceipt({ hash })
    await Promise.all([refetchPricing(), refetchReserve(), refetchAllowance()])
  }

  async function savePricing() {
    if (!address) {
      setError('Connect your wallet first.')
      return
    }
    if (!isOwner) {
      setError('Only hook owner can update pricing.')
      return
    }
    if (wrongChain) {
      setError(`Switch wallet network to ${appChain.name}.`)
      return
    }
    try {
      const cfg = {
        basePriceUsdc: parseUsdcToUnits(basePrice),
        monthlyBundleTokens: Number(monthlyTokens),
        monthlyBundlePriceUsdc: parseUsdcToUnits(monthlyPrice),
        yearlyBundleTokens: Number(yearlyTokens),
        yearlyBundlePriceUsdc: parseUsdcToUnits(yearlyPrice),
        enforceMinMonthly,
        refundsEnabled,
        refundPriceUsdc: parseUsdcToUnits(refundPrice),
      }
      if (cfg.monthlyBundleTokens < 1 || cfg.yearlyBundleTokens < 1) {
        setError('Bundle token counts must be at least 1.')
        return
      }
      await runWrite(
        writeContractAsync({
          address: hook,
          abi: SUBSCRIPTION_HOOK_ABI,
          functionName: 'setPricing',
          args: [cfg],
        })
      )
    } catch (e: any) {
      setError(e?.shortMessage ?? e?.message ?? String(e))
    }
  }

  async function approveUsdcToHook() {
    if (!address) {
      setError('Connect your wallet first.')
      return
    }
    if (wrongChain) {
      setError(`Switch wallet network to ${appChain.name}.`)
      return
    }
    try {
      await runWrite(
        writeContractAsync({
          address: usdc,
          abi: erc20Abi,
          functionName: 'approve',
          args: [hook, reserveUnits > 0n ? reserveUnits : maxUint256],
        })
      )
    } catch (e: any) {
      setError(e?.shortMessage ?? e?.message ?? String(e))
    }
  }

  async function fundReserve() {
    if (!address) {
      setError('Connect your wallet first.')
      return
    }
    if (wrongChain) {
      setError(`Switch wallet network to ${appChain.name}.`)
      return
    }
    if (reserveUnits <= 0n) {
      setError('Enter a positive USDC amount to transfer.')
      return
    }
    try {
      await runWrite(
        writeContractAsync({
          address: usdc,
          abi: erc20Abi,
          functionName: 'transfer',
          args: [hook, reserveUnits],
        })
      )
      setReserveAmount('')
    } catch (e: any) {
      setError(e?.shortMessage ?? e?.message ?? String(e))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Manage product</h1>
          <div className="mt-1 text-white/70">
            {poolId ? 'PoolId route param is ignored in single-product mode.' : 'Single-product mode (Base mainnet).'}
          </div>
        </div>
        <Link to="/product">
          <Button>Open storefront</Button>
        </Link>
      </div>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Pill>SUB: {subSymbol ?? 'SUB'}</Pill>
          <Pill>USDC: {usdcSymbol ?? 'USDC'}</Pill>
          <Pill>Hook owner: {hookOwner ? 'loaded' : 'loading'}</Pill>
          <Pill>Reserve: {formatUnits(reserveUsdc ?? 0n, USDC_DECIMALS, 6)} USDC</Pill>
        </div>

        <div className="grid gap-2 text-xs text-white/60 md:grid-cols-2">
          <div>
            Hook: <a className="underline" href={getExplorerAddressUrl(hook)} target="_blank" rel="noreferrer">{hook}</a>
          </div>
          <div>
            Router in hook: <span className="font-mono">{String(hookRouter ?? 'loading')}</span>
          </div>
          <div>
            Configured router: <span className="font-mono">{router}</span>
          </div>
          <div>
            USDC allowance to hook: <span className="font-mono">{formatUnits(usdcAllowanceToHook ?? 0n, USDC_DECIMALS, 6)}</span>
          </div>
        </div>

        {hookRouter && String(hookRouter).toLowerCase() !== router.toLowerCase() && (
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-100">
            Hook router does not match frontend-configured router. Confirm addresses before transacting.
          </div>
        )}
        {!isOwner && (
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-100">
            Only hook owner can update pricing. You can still fund refund reserve from this wallet.
          </div>
        )}
        {wrongChain && (
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-100">
            Wallet is on chain {chainId}. Switch to {appChain.name} ({appChain.id}) before sending transactions.
          </div>
        )}

        <Hr />

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Base price (USDC)</Label>
            <Input value={basePrice} onChange={(e) => setBasePrice(e.target.value)} />
          </div>
          <div>
            <Label>Refund price (USDC)</Label>
            <Input value={refundPrice} onChange={(e) => setRefundPrice(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Monthly bundle tokens</Label>
            <Input value={monthlyTokens} onChange={(e) => setMonthlyTokens(e.target.value)} />
          </div>
          <div>
            <Label>Monthly bundle price (USDC)</Label>
            <Input value={monthlyPrice} onChange={(e) => setMonthlyPrice(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Yearly bundle tokens</Label>
            <Input value={yearlyTokens} onChange={(e) => setYearlyTokens(e.target.value)} />
          </div>
          <div>
            <Label>Yearly bundle price (USDC)</Label>
            <Input value={yearlyPrice} onChange={(e) => setYearlyPrice(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={enforceMinMonthly}
              onChange={(e) => setEnforceMinMonthly(e.target.checked)}
            />
            <span className="text-sm text-white/70">Enforce minimum monthly purchase</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={refundsEnabled}
              onChange={(e) => setRefundsEnabled(e.target.checked)}
            />
            <span className="text-sm text-white/70">Refunds enabled</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={savePricing} disabled={isPending || !isOwner || wrongChain}>
            {isPending ? 'Saving…' : 'Save pricing'}
          </Button>
          <Button variant="ghost" onClick={() => refetchPricing()} disabled={isPending}>
            Refresh
          </Button>
        </div>

        <Hr />

        <div>
          <div className="font-bold">Refund reserve funding</div>
          <div className="mt-1 text-sm text-white/60">
            Optional approve to hook, then transfer USDC directly to the hook contract.
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-3 sm:items-end">
            <div className="sm:col-span-2">
              <Label>Amount (USDC)</Label>
              <Input value={reserveAmount} onChange={(e) => setReserveAmount(e.target.value)} placeholder="e.g. 100" />
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={approveUsdcToHook} disabled={isPending || !address || wrongChain}>
                Approve
              </Button>
              <Button onClick={fundReserve} disabled={isPending || !address || wrongChain || reserveUnits <= 0n}>
                Transfer
              </Button>
            </div>
          </div>
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

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
            {error}
          </div>
        )}
      </Card>
    </div>
  )
}
