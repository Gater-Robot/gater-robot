import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { maxUint256 } from 'viem'
import { useAccount, usePublicClient, useReadContract, useWriteContract } from 'wagmi'
import { PricingTier } from '../components/PricingTier'
import { UniswapEmbed } from '../components/UniswapEmbed'
import { Button, Card, Hr, Pill } from '../components/ui'
import { erc20Abi } from '../lib/abi'
import {
  contractsConfig,
  DEFAULT_BUY_SLIPPAGE_BPS,
  DEFAULT_DEADLINE_SECONDS,
  DEFAULT_REFUND_SLIPPAGE_BPS,
  SUBSCRIPTION_HOOK_ABI,
  SUBSCRIPTION_ROUTER_ABI,
  SUB_DECIMALS,
  USDC_DECIMALS,
} from '../lib/contracts'
import { getExplorerTxUrl } from '../lib/env'
import { formatUnits } from '../lib/format'
import { parseHookPricing } from '../lib/pricing'
import { buildUniswapSwapUrl } from '../lib/uniswap'
import { appChain } from '../wagmi'

function toSubUnits(days: number): bigint {
  return BigInt(days) * 10n ** BigInt(SUB_DECIMALS)
}

function applyBpsUp(value: bigint, bps: number): bigint {
  return value + (value * BigInt(bps) + 9999n) / 10000n
}

function applyBpsDown(value: bigint, bps: number): bigint {
  return value - (value * BigInt(bps)) / 10000n
}

const BUY_TIERS = [7, 30, 365] as const

export default function StorefrontPage() {
  const { poolId } = useParams()
  const { address, chainId } = useAccount()
  const publicClient = usePublicClient()
  const { writeContractAsync, isPending } = useWriteContract()

  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)
  const [mode, setMode] = useState<'link' | 'embed'>('link')
  const [embedUrl, setEmbedUrl] = useState<string | null>(null)

  if (!contractsConfig) {
    return null
  }

  const { hook, router, usdc, subToken } = contractsConfig
  const wrongChain = !!chainId && chainId !== appChain.id

  const { data: subSymbol } = useReadContract({
    address: subToken,
    abi: erc20Abi,
    functionName: 'symbol',
  })

  const { data: subBalance, refetch: refetchSubBal } = useReadContract({
    address: subToken,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    query: { enabled: !!address, refetchInterval: 15_000 },
  })

  const { data: usdcAllowance, refetch: refetchUsdcAllowance } = useReadContract({
    address: usdc,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [address as `0x${string}`, router],
    query: { enabled: !!address },
  })

  const { data: subAllowance, refetch: refetchSubAllowance } = useReadContract({
    address: subToken,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [address as `0x${string}`, router],
    query: { enabled: !!address },
  })

  const { data: pricingData, refetch: refetchPricing } = useReadContract({
    address: hook,
    abi: SUBSCRIPTION_HOOK_ABI,
    functionName: 'pricing',
  })
  const parsedPricing = useMemo(() => parseHookPricing(pricingData), [pricingData])
  const refundsEnabledFromPricing = parsedPricing.refundsEnabled

  const { data: reserveUsdc, refetch: refetchReserve } = useReadContract({
    address: hook,
    abi: SUBSCRIPTION_HOOK_ABI,
    functionName: 'refundReserveUsdc',
  })

  const { data: buyQuote7, refetch: refetchBuy7 } = useReadContract({
    address: hook,
    abi: SUBSCRIPTION_HOOK_ABI,
    functionName: 'quoteBuyExactOut',
    args: [toSubUnits(7)],
  })
  const { data: buyQuote30, refetch: refetchBuy30 } = useReadContract({
    address: hook,
    abi: SUBSCRIPTION_HOOK_ABI,
    functionName: 'quoteBuyExactOut',
    args: [toSubUnits(30)],
  })
  const { data: buyQuote365, refetch: refetchBuy365 } = useReadContract({
    address: hook,
    abi: SUBSCRIPTION_HOOK_ABI,
    functionName: 'quoteBuyExactOut',
    args: [toSubUnits(365)],
  })

  const { data: refundQuote7, refetch: refetchRefund7 } = useReadContract({
    address: hook,
    abi: SUBSCRIPTION_HOOK_ABI,
    functionName: 'quoteRefundExactIn',
    args: [toSubUnits(7)],
    query: { enabled: refundsEnabledFromPricing },
  })
  const { data: refundQuote30, refetch: refetchRefund30 } = useReadContract({
    address: hook,
    abi: SUBSCRIPTION_HOOK_ABI,
    functionName: 'quoteRefundExactIn',
    args: [toSubUnits(30)],
    query: { enabled: refundsEnabledFromPricing },
  })
  const { data: refundQuote365, refetch: refetchRefund365 } = useReadContract({
    address: hook,
    abi: SUBSCRIPTION_HOOK_ABI,
    functionName: 'quoteRefundExactIn',
    args: [toSubUnits(365)],
    query: { enabled: refundsEnabledFromPricing },
  })

  const refundsEnabled = refundsEnabledFromPricing
  const enforceMinMonthly = parsedPricing.enforceMinMonthly
  const buyTiers = enforceMinMonthly ? [30, 365] : [...BUY_TIERS]

  const buyQuotes: Record<number, bigint> = {
    7: buyQuote7 ?? 0n,
    30: buyQuote30 ?? 0n,
    365: buyQuote365 ?? 0n,
  }
  const refundQuotes: Record<number, bigint> = {
    7: refundQuote7 ?? 0n,
    30: refundQuote30 ?? 0n,
    365: refundQuote365 ?? 0n,
  }

  const txUrl = useMemo(() => (txHash ? getExplorerTxUrl(txHash) : undefined), [txHash])

  const balanceDays = useMemo(() => {
    if (!subBalance) return 0n
    return subBalance / 10n ** BigInt(SUB_DECIMALS)
  }, [subBalance])

  function fallbackBuyUrl(days: number): string {
    return buildUniswapSwapUrl({
      inputCurrency: usdc,
      outputCurrency: subToken,
      field: 'output',
      value: String(days),
      chainId: appChain.id,
      theme: 'dark',
    })
  }

  function fallbackRefundUrl(days: number): string {
    return buildUniswapSwapUrl({
      inputCurrency: subToken,
      outputCurrency: usdc,
      field: 'input',
      value: String(days),
      chainId: appChain.id,
      theme: 'dark',
    })
  }

  function openOrEmbed(url: string) {
    if (mode === 'link') {
      window.open(url, '_blank', 'noopener,noreferrer')
    } else {
      setEmbedUrl(url)
    }
  }

  async function runWrite(tx: Promise<`0x${string}`>) {
    if (!publicClient) {
      setError('Public client is not ready yet. Try again in a moment.')
      return
    }
    setError(null)
    const hash = await tx
    setTxHash(hash)
    await publicClient.waitForTransactionReceipt({ hash })
    await Promise.all([
      refetchSubBal(),
      refetchUsdcAllowance(),
      refetchSubAllowance(),
      refetchPricing(),
      refetchReserve(),
      refetchBuy7(),
      refetchBuy30(),
      refetchBuy365(),
      refetchRefund7(),
      refetchRefund30(),
      refetchRefund365(),
    ])
  }

  async function approveUsdc() {
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
          args: [router, maxUint256],
        })
      )
    } catch (e: any) {
      setError(e?.shortMessage ?? e?.message ?? String(e))
    }
  }

  async function approveSub() {
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
          address: subToken,
          abi: erc20Abi,
          functionName: 'approve',
          args: [router, maxUint256],
        })
      )
    } catch (e: any) {
      setError(e?.shortMessage ?? e?.message ?? String(e))
    }
  }

  async function buyTier(days: number) {
    if (!address) {
      setError('Connect your wallet first.')
      return
    }
    if (wrongChain) {
      setError(`Switch wallet network to ${appChain.name}.`)
      return
    }
    try {
      if (!publicClient) {
        setError('Public client is not ready yet. Try again in a moment.')
        return
      }
      const subOut = toSubUnits(days)
      const quote = (await publicClient.readContract({
        address: hook,
        abi: SUBSCRIPTION_HOOK_ABI,
        functionName: 'quoteBuyExactOut',
        args: [subOut],
      })) as bigint
      const maxUsdcIn = applyBpsUp(quote, DEFAULT_BUY_SLIPPAGE_BPS)
      if ((usdcAllowance ?? 0n) < maxUsdcIn) {
        setError(`Approve USDC first. Required: ${formatUnits(maxUsdcIn, USDC_DECIMALS, 6)} USDC`)
        return
      }
      const deadline = BigInt(Math.floor(Date.now() / 1000) + DEFAULT_DEADLINE_SECONDS)
      await runWrite(
        writeContractAsync({
          address: router,
          abi: SUBSCRIPTION_ROUTER_ABI,
          functionName: 'buyExactOut',
          args: [subToken, subOut, maxUsdcIn, address, deadline, '0x'],
        })
      )
    } catch (e: any) {
      setError(e?.shortMessage ?? e?.message ?? String(e))
    }
  }

  async function refundTier(days: number) {
    if (!address) {
      setError('Connect your wallet first.')
      return
    }
    if (wrongChain) {
      setError(`Switch wallet network to ${appChain.name}.`)
      return
    }
    try {
      if (!publicClient) {
        setError('Public client is not ready yet. Try again in a moment.')
        return
      }
      const subIn = toSubUnits(days)
      const quote = (await publicClient.readContract({
        address: hook,
        abi: SUBSCRIPTION_HOOK_ABI,
        functionName: 'quoteRefundExactIn',
        args: [subIn],
      })) as bigint
      const minUsdcOut = applyBpsDown(quote, DEFAULT_REFUND_SLIPPAGE_BPS)
      if ((subAllowance ?? 0n) < subIn) {
        setError(`Approve SUB first. Required: ${formatUnits(subIn, SUB_DECIMALS, 0)} days`)
        return
      }
      const deadline = BigInt(Math.floor(Date.now() / 1000) + DEFAULT_DEADLINE_SECONDS)
      await runWrite(
        writeContractAsync({
          address: router,
          abi: SUBSCRIPTION_ROUTER_ABI,
          functionName: 'refundExactIn',
          args: [subToken, subIn, minUsdcOut, address, deadline, '0x'],
        })
      )
    } catch (e: any) {
      setError(e?.shortMessage ?? e?.message ?? String(e))
    }
  }

  async function refundAll() {
    if (!address) {
      setError('Connect your wallet first.')
      return
    }
    if (wrongChain) {
      setError(`Switch wallet network to ${appChain.name}.`)
      return
    }
    try {
      if (!publicClient) {
        setError('Public client is not ready yet. Try again in a moment.')
        return
      }
      const liveSubBalance = (await publicClient.readContract({
        address: subToken,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address],
      })) as bigint

      if (liveSubBalance <= 0n) {
        setError('No SUB balance available to refund.')
        return
      }
      if ((subAllowance ?? 0n) < liveSubBalance) {
        setError('Approve SUB first for refundAll.')
        return
      }
      const quote = (await publicClient.readContract({
        address: hook,
        abi: SUBSCRIPTION_HOOK_ABI,
        functionName: 'quoteRefundExactIn',
        args: [liveSubBalance],
      })) as bigint
      const minUsdcOut = applyBpsDown(quote, DEFAULT_REFUND_SLIPPAGE_BPS)
      const deadline = BigInt(Math.floor(Date.now() / 1000) + DEFAULT_DEADLINE_SECONDS)
      await runWrite(
        writeContractAsync({
          address: router,
          abi: SUBSCRIPTION_ROUTER_ABI,
          functionName: 'refundAll',
          args: [subToken, minUsdcOut, address, deadline, '0x'],
        })
      )
    } catch (e: any) {
      setError(e?.shortMessage ?? e?.message ?? String(e))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-black">Storefront</h1>
          <div className="mt-1 text-white/70">
            Primary flow uses `SubscriptionRouter` directly. {poolId ? 'PoolId route param is ignored in single-product mode.' : ''}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Pill>Token: {subSymbol ?? 'SUB'}</Pill>
          <Pill>Balance: {balanceDays.toString()} days</Pill>
          <Pill>Refunds: {refundsEnabled ? 'enabled' : 'disabled'}</Pill>
          <Pill>Min monthly: {enforceMinMonthly ? 'enabled' : 'disabled'}</Pill>
        </div>
      </div>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Pill>USDC allowance to router: {formatUnits(usdcAllowance ?? 0n, USDC_DECIMALS, 4)}</Pill>
          <Pill>SUB allowance to router: {formatUnits(subAllowance ?? 0n, SUB_DECIMALS, 0)}</Pill>
          <Pill>Hook reserve: {formatUnits(reserveUsdc ?? 0n, USDC_DECIMALS, 4)} USDC</Pill>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={approveUsdc} disabled={isPending || !address || wrongChain}>
            Approve USDC
          </Button>
          <Button variant="ghost" onClick={approveSub} disabled={isPending || !address || wrongChain}>
            Approve SUB
          </Button>
          <Button variant="ghost" onClick={() => refetchSubBal()} disabled={isPending}>
            Refresh balances
          </Button>
          <Button onClick={refundAll} disabled={isPending || !address || wrongChain || !refundsEnabled}>
            Refund all
          </Button>
        </div>
        {wrongChain && (
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-100">
            Wallet is on chain {chainId}. Switch to {appChain.name} ({appChain.id}) before sending transactions.
          </div>
        )}
      </Card>

      <div>
        <h2 className="text-xl font-black">Direct checkout (router)</h2>
        <p className="mt-1 text-white/70">
          Prices and refunds are quoted from your deployed hook, then submitted through `buyExactOut` and `refundExactIn`.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {buyTiers.map((days) => (
          <PricingTier
            key={`buy-${days}`}
            title={`${days} days`}
            subtitle={days === 30 ? 'Monthly bundle' : days === 365 ? 'Yearly bundle' : 'Pay as you go'}
            price={`${formatUnits(buyQuotes[days], USDC_DECIMALS, 6)} USDC`}
            features={[`Max input uses +${DEFAULT_BUY_SLIPPAGE_BPS / 100}% slippage guard`]}
            cta={`Buy ${days} days`}
            onClick={() => buyTier(days)}
            disabled={isPending || !address || wrongChain}
            highlight={days === 365}
            badge={days === 365 ? 'Best deal' : undefined}
          />
        ))}
      </div>

      <Hr />

      <div>
        <h2 className="text-xl font-black">Refunds (router)</h2>
        <p className="mt-1 text-white/70">Refunds are sent with `refundExactIn` and a {DEFAULT_REFUND_SLIPPAGE_BPS / 100}% min-out guard.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {BUY_TIERS.map((days) => (
          <PricingTier
            key={`refund-${days}`}
            title={`Refund ${days} days`}
            subtitle="SUB to USDC"
            price={refundsEnabled ? `${formatUnits(refundQuotes[days], USDC_DECIMALS, 6)} USDC` : 'Refunds disabled'}
            features={['Requires SUB approval to router']}
            cta={`Refund ${days}`}
            onClick={() => refundTier(days)}
            disabled={isPending || !address || wrongChain || !refundsEnabled}
          />
        ))}
      </div>

      <Hr />

      <Card className="space-y-3">
        <div className="font-bold">Fallback: Uniswap UI</div>
        <div className="text-sm text-white/70">
          These are secondary links. Primary flow is direct router checkout above.
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Pill>Mode: {mode === 'link' ? 'Open tab' : 'Embedded iframe'}</Pill>
          <Button variant="ghost" onClick={() => setMode(mode === 'link' ? 'embed' : 'link')}>
            Toggle fallback mode
          </Button>
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          {buyTiers.map((days) => (
            <div key={`fallback-${days}`} className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm">
              <div className="font-bold">{days} days</div>
              <div className="mt-2 flex gap-2">
                <Button variant="ghost" onClick={() => openOrEmbed(fallbackBuyUrl(days))}>
                  Buy fallback
                </Button>
                <Button variant="ghost" onClick={() => openOrEmbed(fallbackRefundUrl(days))}>
                  Refund fallback
                </Button>
              </div>
            </div>
          ))}
        </div>

        {mode === 'embed' && embedUrl && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-bold">Embedded Uniswap swap</div>
              <Button variant="ghost" onClick={() => setEmbedUrl(null)}>
                Close
              </Button>
            </div>
            <UniswapEmbed url={embedUrl} />
          </div>
        )}
      </Card>

      {txHash && (
        <Card>
          <div className="text-sm">
            Last tx: <span className="font-mono">{txHash}</span>
            {txUrl && (
              <a className="ml-2 underline text-white/80" href={txUrl} target="_blank" rel="noreferrer">
                View on explorer
              </a>
            )}
          </div>
        </Card>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
          {error}
        </div>
      )}
    </div>
  )
}
