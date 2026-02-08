import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAccount, useReadContract } from 'wagmi'
import { Card, Button, Hr, Input, Label, Pill } from '../components/ui'
import { PricingTier } from '../components/PricingTier'
import { UniswapEmbed } from '../components/UniswapEmbed'
import { mustGetAddress } from '../lib/env'
import { erc20Abi, subHookAbi } from '../lib/abi'
import { formatUnits } from '../lib/format'
import { buildUniswapSwapUrl } from '../lib/uniswap'
import { appChain } from '../wagmi'

const HOOK = mustGetAddress('VITE_HOOK_ADDRESS')
const USDC = mustGetAddress('VITE_USDC_ADDRESS')

function tokens(n: number): bigint {
  return BigInt(n) * 10n ** 18n
}

export default function StorefrontPage() {
  const { poolId = '' } = useParams()
  const { address } = useAccount()

  const [mode, setMode] = useState<'link'|'embed'>('link')
  const [embedUrl, setEmbedUrl] = useState<string | null>(null)

  const { data: cfgData } = useReadContract({
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

  const { data: subBalance, refetch: refetchSubBal } = useReadContract({
    address: subToken,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address as any],
    query: { enabled: !!subToken && !!address, refetchInterval: 15_000 },
  })

  const refundsEnabled = !!cfg?.refundsEnabled
  const min30Only = !!cfg?.minPurchase30Only
  const refundPriceUsdc = BigInt(cfg?.refundPriceUsdc ?? 0)

  // Pricing (frontend computed) — should match your on-chain logic.
  const price7 = '$7'
  const price30 = '$20'
  const price365 = '$200'

  function openOrEmbed(url: string) {
    if (mode === 'link') window.open(url, '_blank', 'noopener,noreferrer')
    else setEmbedUrl(url)
  }

  const buyUrl = (days: number) =>
    buildUniswapSwapUrl({
      inputCurrency: USDC,
      outputCurrency: subToken ?? '0x0000000000000000000000000000000000000000',
      field: 'output',
      value: String(days),
      chainId: appChain.id,
      theme: 'dark',
    })

  const sellUrl = (days: number) =>
    buildUniswapSwapUrl({
      inputCurrency: subToken ?? '0x0000000000000000000000000000000000000000',
      outputCurrency: USDC,
      field: 'input',
      value: String(days),
      chainId: appChain.id,
      theme: 'dark',
    })

  const balanceDays = useMemo(() => {
    if (!subBalance) return null
    // whole tokens only
    const whole = subBalance / (10n ** 18n)
    return whole
  }, [subBalance])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-black">Storefront</h1>
          <div className="mt-1 text-white/70">
            PoolId: <span className="font-mono">{poolId}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Pill>Mode: {mode === 'link' ? 'Open Uniswap tab' : 'Embedded iframe'}</Pill>
          <Button variant="ghost" onClick={() => setMode(mode === 'link' ? 'embed' : 'link')}>
            Toggle mode
          </Button>
          <Button variant="ghost" onClick={() => refetchSubBal()}>
            Refresh balance
          </Button>
        </div>
      </div>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Pill>Token: {subSymbol ?? 'SUB'}</Pill>
          {balanceDays !== null && <Pill>Your balance: {balanceDays.toString()} days</Pill>}
          <Pill>Refunds: {refundsEnabled ? 'enabled' : 'disabled'}</Pill>
          {refundsEnabled && (
            <Pill>Refund price: {formatUnits(refundPriceUsdc, 6, 6)} USDC / day</Pill>
          )}
          <Pill>Min30: {min30Only ? 'yes' : 'no'}</Pill>
        </div>

        <div className="text-sm text-white/60">
          Balance refreshes every 15 seconds.
        </div>
      </Card>

      <div>
        <h2 className="text-xl font-black">Buy subscription</h2>
        <p className="mt-1 text-white/70">
          Click a tier to open Uniswap with the swap pre-filled (or embed it below).
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {!min30Only && (
          <PricingTier
            title="7 days"
            subtitle="Pay as you go"
            price={price7}
            features={['Instant access', 'Good for trials']}
            cta="Buy 7 days"
            onClick={() => openOrEmbed(buyUrl(7))}
            disabled={!subToken}
          />
        )}
        <PricingTier
          title="30 days"
          subtitle="Monthly"
          price={price30}
          features={['Best for most users', 'Discount vs daily']}
          cta="Buy 30 days"
          onClick={() => openOrEmbed(buyUrl(30))}
          disabled={!subToken}
        />
        <PricingTier
          title="365 days"
          subtitle="Annual"
          price={price365}
          badge="Best deal!"
          highlight
          features={['Big discount', 'Set & forget']}
          cta="Buy 1 year"
          onClick={() => openOrEmbed(buyUrl(365))}
          disabled={!subToken}
        />
      </div>

      <Hr />

      <div>
        <h2 className="text-xl font-black">Sell / refund</h2>
        <p className="mt-1 text-white/70">
          Refund swaps SUB → USDC. (Disabled if creator turned refunds off.)
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <PricingTier
          title="Refund 7 days"
          subtitle="Sell back 7 days"
          price={refundsEnabled ? `≈ ${(Number(formatUnits(refundPriceUsdc,6,6)) * 7).toFixed(2)} USDC` : '—'}
          features={['Instant on-chain refund']} 
          cta="Refund 7"
          onClick={() => openOrEmbed(sellUrl(7))}
          disabled={!refundsEnabled || !subToken}
        />
        <PricingTier
          title="Refund 30 days"
          subtitle="Sell back 30 days"
          price={refundsEnabled ? `≈ ${(Number(formatUnits(refundPriceUsdc,6,6)) * 30).toFixed(2)} USDC` : '—'}
          features={['Instant on-chain refund']}
          cta="Refund 30"
          onClick={() => openOrEmbed(sellUrl(30))}
          disabled={!refundsEnabled || !subToken}
        />
        <PricingTier
          title="Refund 365 days"
          subtitle="Sell back 1 year"
          price={refundsEnabled ? `≈ ${(Number(formatUnits(refundPriceUsdc,6,6)) * 365).toFixed(2)} USDC` : '—'}
          features={['Instant on-chain refund']}
          cta="Refund 365"
          onClick={() => openOrEmbed(sellUrl(365))}
          disabled={!refundsEnabled || !subToken}
        />
      </div>

      {mode === 'embed' && embedUrl && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-bold">Embedded Uniswap swap</div>
            <Button variant="ghost" onClick={() => setEmbedUrl(null)}>Close</Button>
          </div>
          <UniswapEmbed url={embedUrl} />
        </div>
      )}

      <Hr />

      <Card className="space-y-3">
        <div className="font-bold">Optional</div>
        <div className="text-sm text-white/70">
          If you want coupons (hookData) and guaranteed routing to your v4 hook pool, add an in-app checkout that calls your `SubRouter` directly.
        </div>
      </Card>
    </div>
  )
}
