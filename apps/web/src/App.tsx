/**
 * App - Main Application Entry
 *
 * Sets up providers and routing for the Gater Robot web app.
 * Includes wagmi for wallet connection and TanStack Query for caching.
 */

import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig } from '@/lib/wagmi'
import { ENSDemoPage } from '@/pages/ENSDemoPage'

// Create a client for TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // ENS data doesn't change often, cache for 5 minutes
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  },
})

export function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ENSDemoPage />
      </QueryClientProvider>
    </WagmiProvider>
  )
}
