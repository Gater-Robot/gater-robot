export type StoredProduct = {
  poolId: `0x${string}`
  subToken: `0x${string}`
  name?: string
  symbol?: string
  createdAt: number
}

function key(chainId: number, owner?: string) {
  const who = (owner ?? 'global').toLowerCase()
  return `sub-products:${chainId}:${who}`
}

export function loadProducts(chainId: number, owner?: string): StoredProduct[] {
  try {
    const raw = localStorage.getItem(key(chainId, owner))
    if (!raw) return []
    const parsed = JSON.parse(raw) as StoredProduct[]
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

export function saveProducts(chainId: number, owner: string | undefined, products: StoredProduct[]) {
  localStorage.setItem(key(chainId, owner), JSON.stringify(products))
}

export function upsertProduct(chainId: number, owner: string | undefined, p: StoredProduct) {
  const list = loadProducts(chainId, owner)
  const i = list.findIndex(x => x.poolId.toLowerCase() === p.poolId.toLowerCase())
  if (i >= 0) list[i] = { ...list[i], ...p }
  else list.unshift(p)
  saveProducts(chainId, owner, list)
}
