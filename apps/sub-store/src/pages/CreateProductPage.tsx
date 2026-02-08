import { useMemo, useState } from 'react'
import { Button, Card, Hr, Label, Pill } from '../components/ui'
import { contractsConfig, getContractsConfigSummary } from '../lib/contracts'

const DEPLOY_COMMANDS = [
  'pnpm --filter @gater/contracts deploy:subs:base:03',
  'pnpm --filter @gater/contracts deploy:subs:base:04',
  'pnpm --filter @gater/contracts deploy:subs:base:05',
  'pnpm --filter @gater/contracts deploy:subs:base:06',
]

const REQUIRED_ENV = [
  'FACTORY=0x... # optional if in deployments/subscriptions.json',
  'ROUTER=0x... # optional if in deployments/subscriptions.json',
  'SUB_TOKEN=0x... # optional if step 3 wrote sampleToken',
  'HOOK_SALT=0x... # required for step 5',
]

const PRICING_ENV = [
  'BASE_PRICE_USDC=1000000',
  'MONTHLY_BUNDLE_TOKENS=30',
  'MONTHLY_BUNDLE_PRICE_USDC=20000000',
  'YEARLY_BUNDLE_TOKENS=365',
  'YEARLY_BUNDLE_PRICE_USDC=200000000',
  'ENFORCE_MIN_MONTHLY=false',
  'REFUNDS_ENABLED=true',
  'REFUND_PRICE_USDC=100000',
]

export default function CreateProductPage() {
  const [refreshedAt, setRefreshedAt] = useState(Date.now())

  const summary = useMemo(() => getContractsConfigSummary(), [refreshedAt])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Create a SUB product</h1>
        <p className="mt-1 text-white/70">
          Creation is script-driven for Base mainnet. Run the numbered deployment commands below in order.
        </p>
      </div>

      <Card className="space-y-4">
        <div className="font-bold">1. Run these commands</div>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-white/80">
          {DEPLOY_COMMANDS.map((command) => (
            <li key={command}>
              <code className="rounded bg-black/30 px-2 py-1 font-mono">{command}</code>
            </li>
          ))}
        </ol>

        <Hr />

        <div className="font-bold">2. Required env for deployment scripts</div>
        <div className="rounded-xl border border-white/10 bg-black/30 p-3">
          <Label>Required</Label>
          <pre className="mt-2 overflow-auto text-xs text-white/80">{REQUIRED_ENV.join('\n')}</pre>
          <Label className="mt-3 block">Pricing (example values)</Label>
          <pre className="mt-2 overflow-auto text-xs text-white/80">{PRICING_ENV.join('\n')}</pre>
        </div>

        <Hr />

        <div className="flex items-center justify-between gap-3">
          <div className="font-bold">3. Active frontend addresses</div>
          <Button variant="ghost" onClick={() => setRefreshedAt(Date.now())}>
            Refresh from deployed addresses
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {summary.map((row) => (
            <div key={row.label} className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold">{row.label}</span>
                <Pill>{row.source}</Pill>
              </div>
              <div className="mt-2 break-all font-mono text-xs text-white/80">{row.address}</div>
            </div>
          ))}
        </div>

        {contractsConfig && (
          <div className="text-sm text-white/60">
            Active network: <span className="font-mono">{contractsConfig.networkKey}</span> (
            <span className="font-mono">{contractsConfig.chainId}</span>)
          </div>
        )}
      </Card>
    </div>
  )
}
