import { Outlet, useLocation } from "react-router-dom"

import { AppNav } from "@/components/AppNav"
import { TelegramThemeSync } from "@/components/TelegramThemeSync"
import { Toaster } from "@/components/ui/sonner"

function getPageKey(pathname: string) {
  if (pathname.startsWith("/user")) return "user"
  if (pathname.startsWith("/get-eligible")) return "get-eligible"
  if (pathname.startsWith("/faucet")) return "faucet"
  if (pathname.startsWith("/orgs")) return "orgs"
  if (pathname.startsWith("/admin")) return "admin"
  if (pathname.startsWith("/ens-eth-id")) return "ens-eth-id"
  return "not-found"
}

export function RootLayout() {
  const location = useLocation()
  const pageKey = getPageKey(location.pathname)

  return (
    <div
      data-page={pageKey}
      className="min-h-[100svh] bg-[var(--app-page-bg)] font-mono text-foreground"
    >
      <main className="mx-auto max-w-5xl px-4 py-6 pr-4 sm:pr-20">
        <Outlet />
      </main>

      <AppNav />
      <Toaster />
      <TelegramThemeSync />
    </div>
  )
}
