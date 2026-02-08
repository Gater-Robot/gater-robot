export function formatAddress(addr?: string, chars = 4): string {
  if (!addr) return ''
  return `${addr.slice(0, 2 + chars)}…${addr.slice(-chars)}`
}

export function formatUnits(value: bigint, decimals: number, maxFrac = 4): string {
  const neg = value < 0n
  const v = neg ? -value : value
  const base = 10n ** BigInt(decimals)
  const whole = v / base
  const frac = v % base
  const fracStr = frac.toString().padStart(decimals, '0').slice(0, maxFrac).replace(/0+$/, '')
  return (neg ? '-' : '') + (fracStr ? `${whole.toString()}.${fracStr}` : whole.toString())
}

export function parseUsdcToUnits(usdc: string): bigint {
  // USDC 6 decimals
  const s = usdc.trim()
  if (!s) return 0n
  const [a, b = ''] = s.split('.')
  const whole = BigInt(a || '0') * 1_000_000n
  const frac = BigInt((b + '000000').slice(0, 6))
  return whole + frac
}
