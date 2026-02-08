import * as React from "react"
import { Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom"

import { AppNav } from "@/components/AppNav"
import { TelegramThemeSync } from "@/components/TelegramThemeSync"
import { Toaster } from "@/components/ui/sonner"
import { useTelegram } from "@/contexts/TelegramContext"
import { getAdminStartParamRedirect } from "@/lib/adminMode"

function getPageKey(pathname: string) {
  if (pathname.startsWith("/user")) return "user"
  if (pathname.startsWith("/get-eligible")) return "get-eligible"
  if (pathname.startsWith("/faucet")) return "faucet"
  if (pathname.startsWith("/orgs")) return "orgs"
  if (pathname.startsWith("/admin")) return "admin"
  if (pathname.startsWith("/health")) return "health"
  if (pathname.startsWith("/ens-eth-id")) return "ens-eth-id"
  return "not-found"
}

export function RootLayout() {
  const location = useLocation()
  const pageKey = getPageKey(location.pathname)
  const navigate = useNavigate()
  const telegram = useTelegram()
  const [searchParams] = useSearchParams()

  React.useEffect(() => {
    // Redirect only from the default landing pages; avoid clobbering explicit deep-links.
    if (location.pathname !== "/" && location.pathname !== "/user") return

    // Preserve user-channel deep-links like /user?channelId=...
    if (searchParams.get("channelId")) return

    const redirectTo = getAdminStartParamRedirect(telegram.startParam)
    if (!redirectTo) return

    navigate(redirectTo, { replace: true })
  }, [location.pathname, navigate, searchParams, telegram.startParam])

  return (
    <div
      data-page={pageKey}
      className="flex min-h-[100svh] flex-col bg-background text-foreground"
    >
      {/* Main content area - mobile-first, centered, with bottom padding for tab bar */}
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-20 pt-6">
        <Outlet />
      </main>

      <AppNav />
      <Toaster />
      <TelegramThemeSync />
    </div>
  )
}
