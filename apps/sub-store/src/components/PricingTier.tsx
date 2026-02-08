import { Card, Button, Pill } from './ui'
import clsx from 'clsx'

export function PricingTier(props: {
  title: string
  subtitle?: string
  price: string
  badge?: string
  features: string[]
  cta: string
  onClick: () => void
  disabled?: boolean
  highlight?: boolean
}) {
  return (
    <Card className={clsx(
      'flex flex-col gap-4',
      props.highlight && 'border-white/25 bg-white/7'
    )}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-bold">{props.title}</div>
          {props.subtitle && <div className="text-sm text-white/60">{props.subtitle}</div>}
        </div>
        {props.badge && <Pill className="bg-white text-black">{props.badge}</Pill>}
      </div>

      <div className="text-3xl font-black">{props.price}</div>

      <ul className="space-y-2 text-sm text-white/70">
        {props.features.map((f) => (
          <li key={f} className="flex gap-2">
            <span className="text-white/40">•</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto">
        <Button onClick={props.onClick} disabled={props.disabled} className="w-full">
          {props.cta}
        </Button>
      </div>
    </Card>
  )
}
