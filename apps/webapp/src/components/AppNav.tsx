import * as React from "react"
import {
  DropletIcon,
  FlaskConicalIcon,
  HomeIcon,
  LayoutGridIcon,
  MenuIcon,
  ShieldCheckIcon,
  XIcon,
} from "lucide-react"
import { Link, useLocation, useSearchParams } from "react-router-dom"

import { cn } from "@/lib/utils"
import { useTelegram } from "@/contexts/TelegramContext"
import { getIsAdminMode } from "@/lib/adminMode"
import { Badge } from "@/components/ui/badge"

type NavItem = {
  to: string
  label: string
  Icon: React.ComponentType<{ className?: string }>
  adminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: "/user", label: "Home", Icon: HomeIcon },
  { to: "/get-eligible", label: "Check", Icon: ShieldCheckIcon },
  { to: "/faucet", label: "Faucet", Icon: DropletIcon },
  { to: "/ens-eth-id", label: "Workshop", Icon: FlaskConicalIcon },
  { to: "/orgs", label: "Manage", Icon: LayoutGridIcon, adminOnly: true },
]

type TelegramWebApp = {
  isExpanded?: boolean
  onEvent?: (eventType: string, callback: () => void) => void
  offEvent?: (eventType: string, callback: () => void) => void
}

function getTelegramWebApp(): TelegramWebApp | undefined {
  if (typeof window === "undefined") return undefined
  const w = window as unknown as Record<string, unknown>
  const tg = w.Telegram as { WebApp?: TelegramWebApp } | undefined
  return tg?.WebApp
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
  const telegram = useTelegram()
  const [searchParams] = useSearchParams()
  const [isOpen, setIsOpen] = React.useState(false)
  const [isFullscreen, setIsFullscreen] = React.useState(getIsFullscreen)

  const isAdminMode = getIsAdminMode({
    startParam: telegram.startParam,
    pathname: location.pathname,
    searchParams,
    dev: import.meta.env.DEV,
  })

  const items = React.useMemo(() => {
    if (isAdminMode) return NAV_ITEMS
    return NAV_ITEMS.filter((item) => !item.adminOnly)
  }, [isAdminMode])

  // Close drawer on navigation
  React.useEffect(() => {
    setIsOpen(false)
  }, [location.pathname])

  // Track fullscreen state
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

  // Close drawer on scroll/touch/escape
  React.useEffect(() => {
    if (!isOpen) return

    const close = () => setIsOpen(false)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false)
    }
    window.addEventListener("scroll", close, { passive: true, capture: true })
    window.addEventListener("wheel", close, { passive: true, capture: true })
    window.addEventListener("touchmove", close, { passive: true, capture: true })
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("scroll", close, true)
      window.removeEventListener("wheel", close, true)
      window.removeEventListener("touchmove", close, true)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  // ─── Non-fullscreen: vertical icon strip on right ───
  if (!isFullscreen) {
    return (
      <nav
        aria-label="Primary"
        className="fixed right-3 top-3 z-50 flex w-[3.75rem] flex-col gap-1.5 rounded-2xl border border-border/60 bg-[color:var(--color-surface)]/95 p-1.5 shadow-lg shadow-glow/5 supports-[backdrop-filter]:bg-[color:var(--color-surface)]/80 supports-[backdrop-filter]:backdrop-blur-xl"
      >
        {/* Brand mark */}
        <div className="flex h-11 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-[0_0_12px_var(--color-glow)] transition-shadow hover:shadow-[0_0_20px_var(--color-glow)]">
          G
        </div>

        <div className="my-0.5 h-px bg-border/60" />

        <div className="flex flex-col gap-1">
          {items.map(({ to, label, Icon }) => {
            const isActive =
              location.pathname === to ||
              (to === "/user" && location.pathname === "/") ||
              (to === "/orgs" && location.pathname.startsWith("/orgs"))

            return (
              <Link
                key={to}
                to={to}
                aria-current={isActive ? "page" : undefined}
                aria-label={label}
                className={cn(
                  "flex size-11 items-center justify-center rounded-xl transition-all",
                  isActive
                    ? "bg-primary/15 text-primary glow-pulse"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground hover:shadow-[0_0_8px_var(--color-glow)]",
                )}
              >
                <Icon className={cn("size-5", isActive && "stroke-[2.5]")} />
              </Link>
            )
          })}
        </div>
      </nav>
    )
  }

  // ─── Fullscreen: hamburger → slide-out drawer ───
  return (
    <>
      <button
        type="button"
        aria-label="Menu"
        aria-expanded={isOpen}
        className={cn(
          "fixed right-3 top-3 z-50 flex size-12 items-center justify-center rounded-2xl border border-border/60 bg-[color:var(--color-surface)]/95 text-foreground shadow-lg transition-colors",
          "supports-[backdrop-filter]:bg-[color:var(--color-surface)]/80 supports-[backdrop-filter]:backdrop-blur-xl",
          isOpen && "bg-primary/10 text-primary shadow-[0_0_12px_var(--color-glow)]",
        )}
        onClick={() => setIsOpen((v) => !v)}
      >
        {isOpen ? <XIcon className="size-5" /> : <MenuIcon className="size-5" />}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 supports-[backdrop-filter]:backdrop-blur-sm"
          onPointerDown={() => setIsOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="fixed bottom-3 right-3 top-3 z-50 flex w-[min(16rem,75vw)] flex-col rounded-2xl border border-border/60 bg-[var(--color-surface)] bg-dots p-2 shadow-2xl supports-[backdrop-filter]:backdrop-blur-xl"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {/* Drawer header */}
            <div className="flex items-center gap-3 rounded-xl bg-primary/10 px-3 py-3">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-[0_0_12px_var(--color-glow)]">
                G
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-sans text-lg font-bold">
                    <span className="text-foreground">Gater</span>{" "}
                    <span className="text-primary">Robot</span>
                  </span>
                  <Badge variant="flux">MINI APP</Badge>
                </div>
                <div className="text-muted-foreground text-xs">
                  Token-gated communities
                </div>
              </div>
            </div>

            {/* Nav items */}
            <div className="mt-2 flex flex-col gap-0.5">
              {items.map(({ to, label, Icon }, index) => {
                const isActive =
                  location.pathname === to ||
                  (to === "/user" && location.pathname === "/") ||
                  (to === "/orgs" && location.pathname.startsWith("/orgs"))

                return (
                  <Link
                    key={to}
                    to={to}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all",
                      isActive
                        ? "bg-primary/10 border-l-2 border-primary text-primary shadow-[inset_0_0_12px_var(--color-glow)] rounded-lg"
                        : "text-muted-foreground hover:bg-primary/5 hover:text-foreground",
                      "fade-up",
                      index === 0 && "stagger-1",
                      index === 1 && "stagger-2",
                      index === 2 && "stagger-3",
                      index === 3 && "stagger-4",
                      index === 4 && "stagger-5",
                    )}
                    onClick={() => setIsOpen(false)}
                  >
                    <Icon
                      className={cn(
                        "size-5",
                        isActive ? "text-primary stroke-[2.5]" : "",
                      )}
                    />
                    <span className="truncate">{label}</span>
                  </Link>
                )
              })}
            </div>

            {/* Spacer + bottom info */}
            <div className="flex-1" />
            <div className="rounded-lg border border-border p-3 text-center">
              <span className="block text-xs text-muted-foreground">
                Token-gated access for Telegram
              </span>
              <span className="block mt-1 font-mono text-[10px] text-muted-foreground/60">
                v0.1.0
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
