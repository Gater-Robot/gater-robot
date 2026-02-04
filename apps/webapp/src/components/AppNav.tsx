import * as React from "react"
import {
  DropletIcon,
  FingerprintIcon,
  LayoutGridIcon,
  MenuIcon,
  SettingsIcon,
  ShieldIcon,
  UserCircleIcon,
} from "lucide-react"
import { Link, useLocation } from "react-router-dom"

import { cn } from "@/lib/utils"

type NavItem = {
  to: string
  label: string
  Icon: React.ComponentType<{ className?: string }>
}

const NAV_ITEMS: NavItem[] = [
  { to: "/user", label: "User", Icon: UserCircleIcon },
  { to: "/get-eligible", label: "Get Eligible", Icon: FingerprintIcon },
  { to: "/faucet", label: "Faucet", Icon: DropletIcon },
  { to: "/orgs", label: "Orgs", Icon: LayoutGridIcon },
  { to: "/admin", label: "Admin", Icon: ShieldIcon },
  { to: "/ens-eth-id", label: "ENS Demo", Icon: SettingsIcon },
]

type TelegramWebApp = {
  isExpanded?: boolean
  onEvent?: (eventType: string, callback: () => void) => void
  offEvent?: (eventType: string, callback: () => void) => void
}

function getTelegramWebApp(): TelegramWebApp | undefined {
  if (typeof window === "undefined") return undefined
  return (window as any)?.Telegram?.WebApp as TelegramWebApp | undefined
}

function getIsFullscreen() {
  if (typeof window === "undefined") return false

  const tg = getTelegramWebApp()
  if (typeof tg?.isExpanded === "boolean") return tg.isExpanded

  const sw = window.screen?.width
  const sh = window.screen?.height
  if (sw && sh) {
    const widthRatio = window.innerWidth / sw
    const heightRatio = window.innerHeight / sh
    if (widthRatio > 0.92 && heightRatio > 0.92) return true
  }

  return window.matchMedia("(max-width: 640px)").matches
}

export function AppNav() {
  const location = useLocation()
  const [isOpen, setIsOpen] = React.useState(false)
  const [isFullscreen, setIsFullscreen] = React.useState(getIsFullscreen)

  React.useEffect(() => {
    setIsOpen(false)
  }, [location.pathname])

  React.useEffect(() => {
    const update = () => setIsFullscreen(getIsFullscreen())
    update()

    window.addEventListener("resize", update, { passive: true })
    const tg = getTelegramWebApp()
    tg?.onEvent?.("viewportChanged", update)

    return () => {
      window.removeEventListener("resize", update)
      tg?.offEvent?.("viewportChanged", update)
    }
  }, [])

  React.useEffect(() => {
    if (!isOpen) return

    const close = () => setIsOpen(false)
    window.addEventListener("scroll", close, { passive: true, capture: true })
    window.addEventListener("wheel", close, { passive: true, capture: true })
    window.addEventListener("touchmove", close, { passive: true, capture: true })

    return () => {
      window.removeEventListener("scroll", close, true)
      window.removeEventListener("wheel", close, true)
      window.removeEventListener("touchmove", close, true)
    }
  }, [isOpen])

  if (!isFullscreen) {
    return (
      <nav
        aria-label="Primary"
        className={cn(
          "fixed right-3 top-3 z-50 flex w-14 flex-col gap-2 rounded-2xl border bg-background/90 p-2 shadow-sm",
          "supports-[backdrop-filter]:bg-background/70 supports-[backdrop-filter]:backdrop-blur"
        )}
      >
        <div className="flex h-10 items-center justify-center rounded-xl bg-muted text-sm font-semibold text-foreground">
          G
        </div>

        <div className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ to, label, Icon }) => {
            const isActive = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl border text-muted-foreground",
                  isActive
                    ? "border-border bg-muted text-foreground"
                    : "border-transparent bg-transparent"
                )}
              >
                <Icon className="size-5" />
                <span className="sr-only">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    )
  }

  return (
    <>
      <button
        type="button"
        aria-label="Menu"
        aria-expanded={isOpen}
        className={cn(
          "fixed right-3 top-3 z-50 flex h-12 w-12 items-center justify-center rounded-2xl border bg-background/90 text-foreground shadow-sm",
          "supports-[backdrop-filter]:bg-background/70 supports-[backdrop-filter]:backdrop-blur",
          "transition-none"
        )}
        onClick={() => setIsOpen((v) => !v)}
      >
        <MenuIcon className="size-5" />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onPointerDown={() => setIsOpen(false)}
        >
          <div
            className={cn(
              "fixed right-3 top-3 bottom-3 z-50 w-[min(18rem,80vw)] rounded-2xl border bg-background/95 p-2 shadow-sm",
              "supports-[backdrop-filter]:bg-background/80 supports-[backdrop-filter]:backdrop-blur"
            )}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="flex h-12 items-center justify-between gap-2 rounded-xl bg-muted px-3 text-sm font-semibold text-foreground">
              <div>Gater</div>
              <div className="text-xs font-normal text-muted-foreground">menu</div>
            </div>

            <div className="mt-2 flex flex-col gap-1">
              {NAV_ITEMS.map(({ to, label, Icon }) => {
                const isActive = location.pathname === to
                return (
                  <Link
                    key={to}
                    to={to}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-3 py-2 text-sm",
                      isActive
                        ? "border-border bg-muted text-foreground"
                        : "border-transparent bg-transparent text-muted-foreground"
                    )}
                    onClick={() => setIsOpen(false)}
                  >
                    <Icon className="size-5" />
                    <span className="truncate">{label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

