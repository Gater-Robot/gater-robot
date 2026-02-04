/**
 * App - Main Application Entry
 *
 * Sets up providers and routing for the Gater Robot web app.
 * Includes wagmi for wallet connection, TanStack Query for caching,
 * TransactionProvider from ethereum-identity-kit, TelegramProvider for
 * Telegram Mini App integration, and React Router for navigation.
 */

import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { TransactionProvider } from 'ethereum-identity-kit'
import { wagmiConfig } from '@/lib/wagmi'
import { TelegramProvider } from '@/contexts/TelegramContext'
import { DiagnosticsDrawer } from '@/components/ui'
import { ENSDemoPage } from '@/pages/ENSDemoPage'
import { UserPage } from '@/pages/UserPage'
import { AdminPage } from '@/pages/AdminPage'
import { OrgsPage } from '@/pages/OrgsPage'
import { GetEligiblePage } from '@/pages/GetEligiblePage'

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

// Mock user for development outside Telegram
const MOCK_USER = import.meta.env.DEV
  ? {
      id: '123456789',
      firstName: 'Dev',
      lastName: 'User',
      username: 'devuser',
      languageCode: 'en',
    }
  : undefined

// Router configuration with all app routes
const router = createBrowserRouter([
  // Default redirect to user page
  { path: '/', element: <Navigate to="/user" replace /> },

  // Main app routes
  { path: '/user', element: <UserPage /> },
  { path: '/admin', element: <AdminPage /> },
  { path: '/orgs', element: <OrgsPage /> },
  { path: '/get-eligible', element: <GetEligiblePage /> },

  // ENS demo page (for hackathon)
  { path: '/ens-eth-id', element: <ENSDemoPage /> },
])

export function App() {
  return (
    <TelegramProvider mockUser={MOCK_USER}>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <TransactionProvider>
            <RouterProvider router={router} />
            {/* Debug panel - only shows toggle button in corner */}
            {import.meta.env.DEV && <DiagnosticsDrawer />}
          </TransactionProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </TelegramProvider>
  )
}
