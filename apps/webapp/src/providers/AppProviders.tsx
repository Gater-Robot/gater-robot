import * as React from "react"
import { ConvexProvider } from "convex/react"
import { TransactionProvider } from "ethereum-identity-kit"
import { WagmiProvider } from "wagmi"

import { ThemeProvider } from "@/components/theme-provider"
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

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <ConvexProvider client={convex}>
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

