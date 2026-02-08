import { Link, useNavigate } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { useMemo, useState } from 'react'
import { Card, Button, Input, Label } from '../components/ui'
import { appChain } from '../wagmi'
import { loadProducts } from '../lib/storage'

export default function ManageIndexPage() {
  const { address } = useAccount()
  const navigate = useNavigate()
  const [poolId, setPoolId] = useState('')

  const products = useMemo(() => loadProducts(appChain.id, address), [address])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Manage products</h1>
        <p className="mt-1 text-white/70">Edit settings + deposit refund reserves.</p>
      </div>

      <Card>
        <Label>Open by PoolId</Label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Input value={poolId} onChange={(e) => setPoolId(e.target.value)} placeholder="0x… bytes32 poolId" />
          <Button onClick={() => navigate(`/manage/${poolId}`)} disabled={!poolId}>Open</Button>
        </div>
      </Card>

      {products.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {products.map(p => (
            <Card key={p.poolId} className="flex items-start justify-between gap-4">
              <div>
                <div className="font-bold">{p.name ?? 'SUB Product'}</div>
                <div className="mt-1 text-sm text-white/60 font-mono">{p.poolId}</div>
              </div>
              <div className="flex gap-2">
                <Link to={`/manage/${p.poolId}`}><Button variant="ghost">Manage</Button></Link>
                <Link to={`/product/${p.poolId}`}><Button>Storefront</Button></Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
