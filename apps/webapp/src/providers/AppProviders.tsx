import * as React from "react"
import { ConvexProvider, useAction } from "convex/react"
import { TransactionProvider } from "ethereum-identity-kit"
import { WagmiProvider } from "wagmi"

import { ThemeProvider } from "@/components/theme-provider"
import { api } from "@/convex/api"
import { TelegramProvider } from "@/contexts/TelegramContext"
import { convex } from "@/lib/convex"
import { wagmiConfig } from "@/lib/wagmi"
import { QueryClientProvider } from "@tanstack/react-query"
import { queryClient } from "@/providers/queryClient"

const MOCK_USER = import.meta.env.DEV
  ? {
      id: "123456789",
      firstName: "Dev",
      lastName: "User",
      username: "devuser",
      languageCode: "en",
    }
  : undefined

function AdminIdsStartupWarning() {
  const getPolicy = useAction(api.adminActions.getAdminIdsPolicy)
  const didRunRef = React.useRef(false)

  React.useEffect(() => {
    if (didRunRef.current) return
    didRunRef.current = true

    void (async () => {
      try {
        const result = await getPolicy({})
        if (result?.enforced) {
          const count = typeof result.count === "number" ? result.count : undefined
          console.warn(
            `[gater] ADMIN_IDS enforcement is enabled${count != null ? ` (${count} ID(s))` : ""}. Admin actions are restricted to configured Telegram user IDs.`,
          )
        }
      } catch {
        // Best-effort log only; avoid blocking app startup on policy checks.
      }
    })()
  }, [getPolicy])

  return null
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <ConvexProvider client={convex}>
          <AdminIdsStartupWarning />
          <TelegramProvider mockUser={MOCK_USER}>
            <WagmiProvider config={wagmiConfig}>
              <TransactionProvider>{children}</TransactionProvider>
            </WagmiProvider>
          </TelegramProvider>
        </ConvexProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
