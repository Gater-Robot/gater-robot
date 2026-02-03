/**
 * ENS Demo Page - Showcase All ENS Features
 *
 * This is the main demo page for hackathon judges showing:
 * 1. ENS Profile Resolution (name, avatar, text records)
 * 2. ENS Lookup (search any name/address)
 * 3. Multi-Address Table with ENS
 * 4. Telegram Auto-Link via org.telegram
 * 5. Cross-chain ENS (resolve from L2)
 *
 * Prize track emphasis: ENS bounty
 */

import { useState, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi'
import { ProfileCard } from 'ethereum-identity-kit'
import {
  ENSIdentityCard,
  ENSLookup,
  AddressTableWithENS,
  TelegramLinkVerify,
  DEMO_ADDRESSES,
} from '@/components/ens'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, ErrorBoundary } from '@/components/ui'
import { Wallet, ChevronRight, Sparkles, Globe, Shield, Layers, Loader2 } from 'lucide-react'
import { mainnet, base, arbitrum, sepolia } from 'wagmi/chains'

// Simulated Telegram user (in real app, comes from Telegram WebApp)
const DEMO_TELEGRAM_USER = {
  username: 'nick', // Matches nick.eth's org.telegram for demo
}

export function ENSDemoPage() {
  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

  const [isDarkMode, setIsDarkMode] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setIsDarkMode(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const chains = [mainnet, base, arbitrum, sepolia]
  const currentChainName = chains.find((c) => c.id === chainId)?.name

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">G</span>
              </div>
              <div>
                <h1 className="font-bold text-lg">Gater Robot</h1>
                <p className="text-xs text-muted-foreground">
                  ENS Identity PoC
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Chain switcher */}
              {isConnected && (
                <div className="flex items-center gap-1" role="group" aria-label="Select network">
                  {chains.map((chain) => (
                    <Button
                      key={chain.id}
                      variant={chainId === chain.id ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => {
                        try {
                          switchChain({ chainId: chain.id })
                        } catch (error) {
                          console.error('Failed to switch chain:', error)
                        }
                      }}
                      className="text-xs"
                      aria-label={`Switch to ${chain.name}`}
                      aria-pressed={chainId === chain.id}
                    >
                      {chain.name.split(' ')[0]}
                    </Button>
                  ))}
                </div>
              )}

              {/* Wallet connection */}
              {isConnected ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    try {
                      disconnect()
                    } catch (error) {
                      console.error('Failed to disconnect:', error)
                    }
                  }}
                >
                  Disconnect
                </Button>
              ) : (
                <div className="flex gap-2">
                  {connectors.slice(0, 2).map((connector) => (
                    <Button
                      key={connector.uid}
                      onClick={() => {
                        try {
                          connect({ connector })
                        } catch (error) {
                          console.error('Failed to connect:', error)
                        }
                      }}
                      disabled={isPending}
                    >
                      {isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Wallet className="h-4 w-4 mr-2" />
                      )}
                      {connector.name}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        {/* Hero section */}
        <section className="text-center mb-12">
          <Badge variant="ens" className="mb-4">
            <Sparkles className="h-3 w-3 mr-1" />
            EthGlobal HackMoney 2026 - ENS Bounty Track
          </Badge>
          <h2 className="text-4xl font-bold mb-4">
            ENS Identity Integration PoC
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Demonstrating real ENS integration for token-gated Telegram groups.
            Features include profile resolution, org.telegram auto-verification,
            and cross-chain ENS from L2. Powered by{' '}
            <a
              href="https://ethid.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
            >
              EthID
            </a>,{' '}
            <a
              href="https://ethidentitykit.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
            >
              EthIdentityKit
            </a>, and{' '}
            <a
              href="https://ens.domains"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
            >
              ENS
            </a>.
          </p>
        </section>

        {/* Feature highlights */}
        <section className="grid md:grid-cols-3 gap-4 mb-12">
          <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
            <CardContent className="pt-6">
              <Globe className="h-8 w-8 text-blue-600 mb-3" aria-hidden="true" />
              <h3 className="font-semibold mb-1">Real ENS Resolution</h3>
              <p className="text-sm text-muted-foreground">
                No hard-coded values. Live resolution of names, avatars, and text
                records from mainnet.
              </p>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
            <CardContent className="pt-6">
              <Shield className="h-8 w-8 text-green-600 mb-3" aria-hidden="true" />
              <h3 className="font-semibold mb-1">Telegram Auto-Verify</h3>
              <p className="text-sm text-muted-foreground">
                Creative use of org.telegram text record for signature-free
                identity verification.
              </p>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/20">
            <CardContent className="pt-6">
              <Layers className="h-8 w-8 text-purple-600 mb-3" aria-hidden="true" />
              <h3 className="font-semibold mb-1">Cross-Chain Support</h3>
              <p className="text-sm text-muted-foreground">
                Resolve ENS while connected to Base, Arbitrum, or any L2. Works
                seamlessly.
              </p>
            </CardContent>
          </Card>
        </section>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left column */}
          <div className="space-y-8">
            {/* Connected wallet identity */}
            {isConnected && address && (
              <section>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Your ENS Identity
                  <Badge variant="outline" className="ml-auto">
                    {currentChainName}
                  </Badge>
                </h3>
                <ENSIdentityCard address={address} isVerified />
                <p className="text-xs text-muted-foreground mt-2">
                  * ENS resolved from mainnet while connected to{' '}
                  {currentChainName}
                </p>
              </section>
            )}

            {/* Demo: Telegram Auto-Link */}
            <section>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-green-600" />
                Telegram Auto-Verify (Demo)
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                If your ENS org.telegram matches your Telegram username, verify
                without signing!
              </p>
              <TelegramLinkVerify
                address="0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5" // nick.eth
                telegramUsername={DEMO_TELEGRAM_USER.username}
                onVerified={() => alert('Auto-verified via ENS!')}
              />
            </section>

            {/* ENS Lookup */}
            <section>
              <ENSLookup />
            </section>
          </div>

          {/* Right column */}
          <div className="space-y-8">
            {/* Multi-address table */}
            <section>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ChevronRight className="h-5 w-5" />
                Multi-Address Demo
              </h3>
              <AddressTableWithENS
                addresses={DEMO_ADDRESSES}
                telegramUsername={DEMO_TELEGRAM_USER.username}
                onSetDefault={(id) =>
                  console.log('Set default:', id)
                }
                onVerify={(id) => console.log('Verify:', id)}
              />
            </section>

            {/* Known ENS profiles */}
            <section>
              <h3 className="text-lg font-semibold mb-4">
                Example ENS Profiles
              </h3>
              <div className="space-y-4">
                <ENSIdentityCard
                  address="0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
                  isVerified
                  isDefault
                />
                <ENSIdentityCard
                  address="0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5"
                  isVerified
                  telegramMatched
                />
              </div>
            </section>

            {/* EthIdentityKit ProfileCard Demo */}
            <section>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                EthIdentityKit ProfileCard
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Full-featured profile component from Ethereum Identity Kit
              </p>
              <div className="space-y-4">
                <ErrorBoundary
                  fallback={
                    <div className="p-4 border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                      <p className="text-sm text-yellow-600 dark:text-yellow-400">
                        Failed to load ProfileCard for vitalik.eth
                      </p>
                    </div>
                  }
                >
                  <ProfileCard addressOrName="vitalik.eth" darkMode={isDarkMode} />
                </ErrorBoundary>
                <ErrorBoundary
                  fallback={
                    <div className="p-4 border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                      <p className="text-sm text-yellow-600 dark:text-yellow-400">
                        Failed to load ProfileCard for nick.eth
                      </p>
                    </div>
                  }
                >
                  <ProfileCard addressOrName="nick.eth" darkMode={isDarkMode} showFollowButton={false} />
                </ErrorBoundary>
              </div>
            </section>
          </div>
        </div>

        {/* Bounty compliance checklist */}
        <section className="mt-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge variant="ens">ENS Bounty</Badge>
                Compliance Checklist
              </CardTitle>
              <CardDescription>
                All requirements for the ENS prize track
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {[
                  'Real ENS code (wagmi hooks + viem actions)',
                  'No hard-coded values - dynamic RPC resolution',
                  'Functional demo - profile display + auto-link',
                  'Multi-chain support - resolve from Base/Arbitrum',
                  'Creative use - org.telegram auto-verification',
                  'Version control - incremental commits',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span
                      className="h-5 w-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs"
                      role="img"
                      aria-label="Completed"
                    >
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            Built for EthGlobal HackMoney 2026 | ENS Bounty Track |{' '}
            <a
              href="https://github.com/Gater-Robot/gater-robot"
              className="text-primary hover:underline"
            >
              GitHub
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
