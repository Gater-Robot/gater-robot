import * as React from "react"

import { cn } from "@/lib/utils"

type OverflowMarqueeProps = {
  text: string
  className?: string
  fadeBg?: string
  pxPerSecond?: number
}

export function OverflowMarquee({
  text,
  className,
  fadeBg = "var(--background)",
  pxPerSecond = 36,
}: OverflowMarqueeProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const innerRef = React.useRef<HTMLSpanElement | null>(null)
  const [marquee, setMarquee] = React.useState<{ enabled: boolean; distancePx: number; durationSec: number }>(
    { enabled: false, distancePx: 0, durationSec: 0 }
  )

  React.useEffect(() => {
    const container = containerRef.current
    const inner = innerRef.current
    if (!container || !inner) return

    const recalc = () => {
      const distancePx = Math.max(0, inner.scrollWidth - container.clientWidth)
      const enabled = distancePx > 2
      const durationSec = enabled ? Math.min(24, Math.max(4, distancePx / pxPerSecond)) : 0
      setMarquee({ enabled, distancePx, durationSec })
    }

    recalc()

    const resizeObserver = new ResizeObserver(() => recalc())
    resizeObserver.observe(container)
    resizeObserver.observe(inner)

    return () => resizeObserver.disconnect()
  }, [pxPerSecond, text])

  return (
    <div
      ref={containerRef}
      data-animate={marquee.enabled ? "true" : "false"}
      className={cn("overflow-marquee", className)}
      style={
        {
          "--marquee-distance": `${marquee.distancePx}px`,
          "--marquee-duration": `${marquee.durationSec}s`,
          "--marquee-fade-bg": fadeBg,
        } as React.CSSProperties
      }
    >
      <span ref={innerRef} className="overflow-marquee__inner">
        {text}
      </span>
    </div>
  )
}

