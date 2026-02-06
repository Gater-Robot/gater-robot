import * as React from "react"
import {
  DropletIcon,
  FlaskConicalIcon,
  HomeIcon,
  LayoutGridIcon,
  ShieldCheckIcon,
} from "lucide-react"
import { Link, useLocation, useSearchParams } from "react-router-dom"

import { cn } from "@/lib/utils"
import { useTelegram } from "@/contexts/TelegramContext"
import { getIsAdminMode } from "@/lib/adminMode"

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

export function AppNav() {
  const location = useLocation()
  const telegram = useTelegram()
  const [searchParams] = useSearchParams()

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

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "border-t bg-background/95",
        "supports-[backdrop-filter]:bg-background/80 supports-[backdrop-filter]:backdrop-blur-lg",
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-auto flex h-14 max-w-lg items-stretch justify-around">
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
              className={cn(
                "flex min-w-[3rem] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className={cn("size-5", isActive && "stroke-[2.5]")} />
              <span className="leading-none">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
