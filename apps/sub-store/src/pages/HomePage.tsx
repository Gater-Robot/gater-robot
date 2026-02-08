import { Link, useNavigate } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { Card, Button, Input, Label, Hr } from '../components/ui'
import { loadProducts } from '../lib/storage'
import { formatAddress } from '../lib/format'
import { appChain } from '../wagmi'
import { useMemo, useState } from 'react'

export default function HomePage() {
  const { address } = useAccount()
  const navigate = useNavigate()
  const [poolId, setPoolId] = useState('')

  const products = useMemo(() => loadProducts(appChain.id, address), [address])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Your products</h1>
        <p className="mt-1 text-white/70">
          Quick links to manage and view storefronts. Saved in localStorage per wallet + chain.
        </p>
      </div>

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label>Open an existing product by PoolId</Label>
            <Input value={poolId} onChange={(e) => setPoolId(e.target.value)} placeholder="0x… bytes32 poolId" />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate(`/manage/${poolId}`)} disabled={!poolId}>
              Manage
            </Button>
            <Button onClick={() => navigate(`/product/${poolId}`)} disabled={!poolId}>
              Storefront
            </Button>
          </div>
        </div>
      </Card>

      <Hr />

      {products.length === 0 ? (
        <Card>
          <div className="text-white/70">No saved products yet.</div>
          <div className="mt-4">
            <Link to="/create">
              <Button>Create one →</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {products.map((p) => (
            <Card key={p.poolId}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-bold">
                    {p.name ? `${p.name} (${p.symbol ?? ''})` : 'SUB Product'}
                  </div>
                  <div className="mt-1 text-sm text-white/60">
                    PoolId: <span className="font-mono">{formatAddress(p.poolId, 6)}</span>
                  </div>
                  <div className="mt-1 text-sm text-white/60">
                    SUB: <span className="font-mono">{formatAddress(p.subToken, 6)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link to={`/manage/${p.poolId}`}>
                    <Button variant="ghost">Manage</Button>
                  </Link>
                  <Link to={`/product/${p.poolId}`}>
                    <Button>Storefront</Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Hr />

      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-bold">Need to deploy a new token?</div>
            <div className="text-sm text-white/60">You’ll do it via the SubFactory contract.</div>
          </div>
          <Link to="/create">
            <Button>Create product</Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
