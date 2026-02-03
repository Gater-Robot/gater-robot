/**
 * App - Main Application Entry
 *
 * Sets up providers and routing for the Gater Robot web app.
 * Includes wagmi for wallet connection, TanStack Query for caching,
 * TransactionProvider from ethereum-identity-kit, and React Router for navigation.
 */

import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { TransactionProvider } from 'ethereum-identity-kit'
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

// Router configuration with ENS demo page route
const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/ens-eth-id" replace /> },
  { path: '/ens-eth-id', element: <ENSDemoPage /> },
])

export function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <TransactionProvider>
          <RouterProvider router={router} />
        </TransactionProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
