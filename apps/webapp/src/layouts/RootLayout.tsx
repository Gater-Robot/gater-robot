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
  const { isInitialized, isInTelegram, setBackButton, startParam } = useTelegram()
  const [searchParams] = useSearchParams()

  // Telegram native back button: show on sub-pages, hide on root pages
  React.useEffect(() => {
    if (!isInitialized || !isInTelegram) return

    const isRootPage =
      location.pathname === "/" || location.pathname === "/user"

    if (isRootPage) {
      setBackButton({ isVisible: false })
      return
    }

    const removeClickListener = setBackButton({
      isVisible: true,
      onClick: () => navigate(-1),
    })

    return () => {
      removeClickListener?.()
    }
  }, [location.pathname, navigate, isInitialized, isInTelegram, setBackButton])

  React.useEffect(() => {
    // Redirect only from the default landing pages; avoid clobbering explicit deep-links.
    if (location.pathname !== "/" && location.pathname !== "/user") return

    // Preserve user-channel deep-links like /user?channelId=...
    if (searchParams.get("channelId")) return

    const redirectTo = getAdminStartParamRedirect(startParam)
    if (!redirectTo) return

    navigate(redirectTo, { replace: true })
  }, [location.pathname, navigate, searchParams, startParam])

  return (
    <div
      data-page={pageKey}
      className="flex min-h-[100svh] flex-col bg-flux-gradient bg-dots text-foreground"
    >
      <main className="mx-auto max-w-2xl flex-1 px-4 pt-4 pb-20 sm:max-w-4xl sm:pr-20">
        <Outlet />
      </main>

      <AppNav />
      <Toaster />
      <TelegramThemeSync />
    </div>
  )
}
