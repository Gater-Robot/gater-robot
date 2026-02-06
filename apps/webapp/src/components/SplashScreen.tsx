import { useCallback, useEffect, useRef, useState } from "react"

interface SplashScreenProps {
  /** Minimum display time in ms */
  minDuration?: number
  /** Maximum display time in ms (safety valve) */
  maxDuration?: number
  /** Called when splash is ready to dismiss */
  onReady?: () => void
}

export function SplashScreen({
  minDuration = 1000,
  maxDuration = 3000,
  onReady,
}: SplashScreenProps) {
  const [isFadingOut, setIsFadingOut] = useState(false)
  const dismissedRef = useRef(false)
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const dismiss = useCallback(() => {
    if (dismissedRef.current) return
    dismissedRef.current = true
    setIsFadingOut(true)
    fadeTimerRef.current = setTimeout(() => onReady?.(), 300)
  }, [onReady])

  useEffect(() => {
    const minTimer = setTimeout(() => {
      document.fonts.ready.then(() => dismiss())
    }, minDuration)

    // Safety valve: force dismiss after maxDuration
    const maxTimer = setTimeout(() => dismiss(), maxDuration)

    return () => {
      clearTimeout(minTimer)
      clearTimeout(maxTimer)
      clearTimeout(fadeTimerRef.current)
    }
  }, [minDuration, maxDuration, dismiss])

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[oklch(0.985_0.002_240)] dark:bg-[oklch(0.16_0.02_260)] ${
        isFadingOut ? "splash-fade-out" : ""
      }`}
      style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
    >
      {/* Logo / Brand mark */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-[oklch(0.55_0.15_175)] text-white shadow-lg">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 8V4H8" />
            <rect width="16" height="12" x="4" y="8" rx="2" />
            <path d="M2 14h2" />
            <path d="M20 14h2" />
            <path d="M15 13v2" />
            <path d="M9 13v2" />
          </svg>
        </div>
      </div>

      <h1
        className="mb-2 text-2xl font-semibold tracking-tight text-[oklch(0.205_0.015_255)] dark:text-[oklch(0.93_0.005_240)]"
      >
        Gater Robot
      </h1>

      <p className="mb-8 text-sm text-[oklch(0.55_0.015_250)] dark:text-[oklch(0.60_0.015_250)]">
        Token-gated communities
      </p>

      {/* Loading indicator - three pulsing dots */}
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="size-2 rounded-full bg-[oklch(0.55_0.15_175)]"
            style={{
              animation: "splash-pulse 1.4s ease-in-out infinite",
              animationDelay: `${i * 0.16}s`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
