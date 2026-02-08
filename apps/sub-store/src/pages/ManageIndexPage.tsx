import { Link } from 'react-router-dom'
import { Button, Card, Pill } from '../components/ui'
import { contractsConfig, getContractsConfigSummary } from '../lib/contracts'

export default function ManageIndexPage() {
  if (!contractsConfig) {
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Manage products</h1>
        <p className="mt-1 text-white/70">
          Single-product mode. Use the direct manage page for pricing and reserve operations.
        </p>
      </div>

      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <Pill>Chain: {contractsConfig.chainId}</Pill>
          <Pill>Router: {contractsConfig.router}</Pill>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/manage">
            <Button>Open Manage</Button>
          </Link>
          <Link to="/product">
            <Button variant="ghost">Open Storefront</Button>
          </Link>
        </div>
      </Card>

      <Card>
        <div className="font-bold">Address summary</div>
        <div className="mt-3 grid gap-2 text-sm text-white/70">
          {getContractsConfigSummary().map((row) => (
            <div key={row.label} className="font-mono">
              {row.label}: {row.address} ({row.source})
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
