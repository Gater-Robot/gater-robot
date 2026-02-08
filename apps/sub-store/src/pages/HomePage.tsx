import { Link } from 'react-router-dom'
import { Button, Card, Hr, Pill } from '../components/ui'
import { contractsConfig, getContractsConfigSummary } from '../lib/contracts'
import { getExplorerAddressUrl } from '../lib/env'

export default function HomePage() {
  if (!contractsConfig) {
    return null
  }

  const rows = getContractsConfigSummary()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">SUB Storefront</h1>
        <p className="mt-1 text-white/70">
          Single-product mode on Base. Router checkout is primary; Uniswap links are fallback.
        </p>
      </div>

      <Card>
        <div className="flex flex-wrap gap-2">
          <Pill>Network: {contractsConfig.networkKey}</Pill>
          <Pill>Chain ID: {contractsConfig.chainId}</Pill>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Link to="/product">
            <Button className="w-full">Open Storefront</Button>
          </Link>
          <Link to="/manage">
            <Button variant="ghost" className="w-full">Open Manage</Button>
          </Link>
        </div>
      </Card>

      <Hr />

      <Card className="space-y-3">
        <div className="font-bold">Active contracts</div>
        {rows.map((row) => (
          <div key={row.label} className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold">{row.label}</span>
              <Pill>{row.source}</Pill>
            </div>
            <div className="mt-2 break-all font-mono text-xs">{row.address}</div>
            {row.address.startsWith('0x') && (
              <a
                className="mt-2 inline-block text-xs underline text-white/70"
                href={getExplorerAddressUrl(row.address)}
                target="_blank"
                rel="noreferrer"
              >
                View on explorer
              </a>
            )}
          </div>
        ))}
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-bold">Deploy a new product</div>
            <div className="text-sm text-white/60">Use the numbered hardhat flow and verification helper.</div>
          </div>
          <Link to="/create">
            <Button>Create / Deploy Guide</Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
