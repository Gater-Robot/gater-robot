import { useSearchParams } from 'react-router-dom'

export function GetEligiblePage() {
  const [searchParams] = useSearchParams()

  const channelId = searchParams.get('channelId')
  const token = searchParams.get('token')
  const amount = searchParams.get('amount')
  const chain = searchParams.get('chain')
  const symbol = searchParams.get('symbol')

  const isManualMode = !channelId && Boolean(token && amount && chain && symbol)

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Get Eligible</h1>
        <p className="text-sm text-zinc-600">
          Placeholder route. This will migrate Eligibility status + LiFi “Get Eligible”
          flows from
          <code className="mx-1 rounded bg-zinc-100 px-1 py-0.5 font-mono text-[12px]">apps/web</code>.
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm">
        <div className="font-medium text-zinc-900">Detected mode</div>
        <div className="mt-2 space-y-1 text-zinc-700">
          <div>
            Channel mode (<code className="font-mono">?channelId=...</code>):{' '}
            <span className="font-mono">{channelId ?? '—'}</span>
          </div>
          <div>
            Manual mode:{' '}
            <span className="font-mono">{isManualMode ? 'true' : 'false'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

