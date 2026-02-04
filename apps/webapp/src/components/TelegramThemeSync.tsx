import * as React from "react"
import { useTheme } from "next-themes"

type TelegramWebApp = {
  colorScheme?: "light" | "dark"
  themeParams?: Record<string, string | undefined>
  onEvent?: (eventType: string, callback: () => void) => void
  offEvent?: (eventType: string, callback: () => void) => void
}

function getTelegramWebApp(): TelegramWebApp | undefined {
  if (typeof window === "undefined") return undefined
  return (window as any)?.Telegram?.WebApp as TelegramWebApp | undefined
}

function setIfPresent(name: string, value: string | undefined) {
  if (!value) return
  document.documentElement.style.setProperty(name, value)
}

export function TelegramThemeSync() {
  const { setTheme } = useTheme()

  React.useEffect(() => {
    const tg = getTelegramWebApp()
    if (!tg) return

    const apply = () => {
      const scheme = tg.colorScheme === "dark" ? "dark" : "light"
      setTheme(scheme)

      const params = tg.themeParams ?? {}
      setIfPresent("--background", params.bg_color)
      setIfPresent("--foreground", params.text_color)
      setIfPresent("--muted", params.secondary_bg_color ?? params.bg_color)
      setIfPresent("--card", params.secondary_bg_color ?? params.bg_color)
      setIfPresent("--popover", params.secondary_bg_color ?? params.bg_color)
      setIfPresent("--primary", params.button_color)
      setIfPresent("--primary-foreground", params.button_text_color)
      setIfPresent("--muted-foreground", params.hint_color)
      setIfPresent("--ring", params.link_color)
    }

    apply()

    tg.onEvent?.("themeChanged", apply)
    return () => tg.offEvent?.("themeChanged", apply)
  }, [setTheme])

  return null
}

