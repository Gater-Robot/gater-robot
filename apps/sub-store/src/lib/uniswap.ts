export type UniswapField = 'input' | 'output'

export function buildUniswapSwapUrl(args: {
  inputCurrency: string
  outputCurrency: string
  field: UniswapField
  value: string
  theme?: 'dark' | 'light'
  chainId?: number
}): string {
  const base = 'https://app.uniswap.org/#/swap'
  const params = new URLSearchParams()
  params.set('theme', args.theme ?? 'dark')
  params.set('inputCurrency', args.inputCurrency)
  params.set('outputCurrency', args.outputCurrency)
  params.set('field', args.field)
  params.set('value', args.value)

  // Not in the public query-param docs, but some versions of the interface used ?chain=.
  // If this param is ignored by the UI, no harm done.
  if (args.chainId) params.set('chain', String(args.chainId))

  return `${base}?${params.toString()}`
}
