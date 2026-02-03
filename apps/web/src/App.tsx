/**
 * App - Main Application Entry
 *
 * Sets up providers and routing for the Gater Robot web app.
 * Includes Web3Provider (wagmi + RainbowKit + QueryClient),
 * TransactionProvider from ethereum-identity-kit, and React Router for navigation.
 */

import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { TransactionProvider } from 'ethereum-identity-kit'
import { Web3Provider } from '@/providers/Web3Provider'
import { ENSDemoPage } from '@/pages/ENSDemoPage'

// Router configuration with ENS demo page route
const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/ens-eth-id" replace /> },
  { path: '/ens-eth-id', element: <ENSDemoPage /> },
])

export function App() {
  return (
    <Web3Provider>
      <TransactionProvider>
        <RouterProvider router={router} />
      </TransactionProvider>
    </Web3Provider>
  )
}
