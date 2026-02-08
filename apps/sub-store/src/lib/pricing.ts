export type HookPricing = {
  basePriceUsdc: bigint
  monthlyBundleTokens: number
  monthlyBundlePriceUsdc: bigint
  yearlyBundleTokens: number
  yearlyBundlePriceUsdc: bigint
  enforceMinMonthly: boolean
  refundsEnabled: boolean
  refundPriceUsdc: bigint
}

const DEFAULT_PRICING: HookPricing = {
  basePriceUsdc: 1_000_000n,
  monthlyBundleTokens: 30,
  monthlyBundlePriceUsdc: 20_000_000n,
  yearlyBundleTokens: 365,
  yearlyBundlePriceUsdc: 200_000_000n,
  enforceMinMonthly: false,
  refundsEnabled: true,
  refundPriceUsdc: 100_000n,
}

type NamedKey = keyof HookPricing

const INDEX_KEYS: Record<number, NamedKey> = {
  0: 'basePriceUsdc',
  1: 'monthlyBundleTokens',
  2: 'monthlyBundlePriceUsdc',
  3: 'yearlyBundleTokens',
  4: 'yearlyBundlePriceUsdc',
  5: 'enforceMinMonthly',
  6: 'refundsEnabled',
  7: 'refundPriceUsdc',
}

function toObject(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null) return value as Record<string, unknown>
  return {}
}

function getRaw(value: unknown, key: NamedKey): unknown {
  const obj = toObject(value)
  if (key in obj) return obj[key]

  const entry = Object.entries(INDEX_KEYS).find(([, mapped]) => mapped === key)
  if (!entry) return undefined
  const index = Number(entry[0])
  if (Array.isArray(value) && index < value.length) return value[index]
  if (String(index) in obj) return obj[String(index)]

  return undefined
}

function asBigInt(raw: unknown, fallback: bigint): bigint {
  if (typeof raw === 'bigint') return raw
  if (typeof raw === 'number' && Number.isFinite(raw)) return BigInt(Math.trunc(raw))
  if (typeof raw === 'string' && raw.trim().length > 0) {
    try {
      return BigInt(raw)
    } catch {
      return fallback
    }
  }
  return fallback
}

function asNumber(raw: unknown, fallback: number): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.trunc(raw)
  if (typeof raw === 'bigint') return Number(raw)
  if (typeof raw === 'string' && raw.trim().length > 0) {
    const parsed = Number(raw)
    if (Number.isFinite(parsed)) return Math.trunc(parsed)
  }
  return fallback
}

function asBoolean(raw: unknown, fallback: boolean): boolean {
  if (typeof raw === 'boolean') return raw
  if (typeof raw === 'number') return raw !== 0
  if (typeof raw === 'bigint') return raw !== 0n
  if (typeof raw === 'string') {
    const lowered = raw.trim().toLowerCase()
    if (lowered === 'true' || lowered === '1') return true
    if (lowered === 'false' || lowered === '0') return false
  }
  return fallback
}

export function parseHookPricing(value: unknown): HookPricing {
  return {
    basePriceUsdc: asBigInt(getRaw(value, 'basePriceUsdc'), DEFAULT_PRICING.basePriceUsdc),
    monthlyBundleTokens: asNumber(getRaw(value, 'monthlyBundleTokens'), DEFAULT_PRICING.monthlyBundleTokens),
    monthlyBundlePriceUsdc: asBigInt(getRaw(value, 'monthlyBundlePriceUsdc'), DEFAULT_PRICING.monthlyBundlePriceUsdc),
    yearlyBundleTokens: asNumber(getRaw(value, 'yearlyBundleTokens'), DEFAULT_PRICING.yearlyBundleTokens),
    yearlyBundlePriceUsdc: asBigInt(getRaw(value, 'yearlyBundlePriceUsdc'), DEFAULT_PRICING.yearlyBundlePriceUsdc),
    enforceMinMonthly: asBoolean(getRaw(value, 'enforceMinMonthly'), DEFAULT_PRICING.enforceMinMonthly),
    refundsEnabled: asBoolean(getRaw(value, 'refundsEnabled'), DEFAULT_PRICING.refundsEnabled),
    refundPriceUsdc: asBigInt(getRaw(value, 'refundPriceUsdc'), DEFAULT_PRICING.refundPriceUsdc),
  }
}
