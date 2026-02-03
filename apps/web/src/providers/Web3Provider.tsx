/**
 * Web3Provider - Unified Web3 Provider Wrapper
 *
 * Combines WagmiProvider, RainbowKitProvider, and QueryClientProvider
 * into a single provider for the app.
 */

import { type ReactNode } from 'react'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { wagmiConfig } from '@/config/wagmi'
import '@rainbow-me/rainbowkit/styles.css'

// Create QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Blockchain data can change, but not too frequently
      staleTime: 30 * 1000, // 30 seconds
      gcTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
    },
  },
})

interface Web3ProviderProps {
  children: ReactNode
}

/**
 * Custom RainbowKit theme configuration
 */
const customDarkTheme = darkTheme({
  accentColor: '#0052ff',
  accentColorForeground: 'white',
  borderRadius: 'medium',
  fontStack: 'system',
})

const customLightTheme = lightTheme({
  accentColor: '#0052ff',
  accentColorForeground: 'white',
  borderRadius: 'medium',
  fontStack: 'system',
})

/**
 * Web3Provider component
 *
 * Wraps the app with all necessary Web3 providers.
 */
export function Web3Provider({ children }: Web3ProviderProps) {
  // TODO: Detect system theme preference
  const isDarkMode = true

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={isDarkMode ? customDarkTheme : customLightTheme}
          modalSize="compact"
        >
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: {
                background: isDarkMode ? '#1a1a2e' : '#ffffff',
                color: isDarkMode ? '#ffffff' : '#1a1a2e',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              },
            }}
          />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default Web3Provider
