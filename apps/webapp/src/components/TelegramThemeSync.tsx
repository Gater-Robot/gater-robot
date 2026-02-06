import * as React from "react"
import { useTheme } from "next-themes"

type TelegramWebApp = {
  colorScheme?: "light" | "dark"
  onEvent?: (eventType: string, callback: () => void) => void
  offEvent?: (eventType: string, callback: () => void) => void
}

function getTelegramWebApp(): TelegramWebApp | undefined {
  if (typeof window === "undefined") return undefined
  return (window as any)?.Telegram?.WebApp as TelegramWebApp | undefined
}

/**
 * TelegramThemeSync - Syncs ONLY light/dark mode from Telegram.
 *
 * We keep our own color palette (teal accent, warm whites, navy dark)
 * and only respect Telegram's light vs dark mode preference.
 */
export function TelegramThemeSync() {
  const { setTheme } = useTheme()

  React.useEffect(() => {
    const tg = getTelegramWebApp()
    if (!tg) return

    const apply = () => {
      const scheme = tg.colorScheme === "dark" ? "dark" : "light"
      setTheme(scheme)
    }

    apply()

    tg.onEvent?.("themeChanged", apply)
    return () => tg.offEvent?.("themeChanged", apply)
  }, [setTheme])

  return null
}
