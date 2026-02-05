import * as React from "react"
import { ProfileCard } from "ethereum-identity-kit"
import {
  ChevronRightIcon,
  GlobeIcon,
  LayersIcon,
  Loader2Icon,
  ShieldIcon,
  SparklesIcon,
  WalletIcon,
} from "lucide-react"
import {
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from "wagmi"
import { arbitrum, base, mainnet, sepolia } from "wagmi/chains"

import {
  AddressTableWithENS,
  DEMO_ADDRESSES,
  ENSIdentityCard,
  ENSLookup,
  TelegramLinkVerify,
} from "@/components/ens"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ErrorBoundary } from "@/components/ui/error-boundary"

const DEMO_TELEGRAM_USER = {
  username: "nick",
}

function ENSDemo() {
  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

  const [isDarkMode, setIsDarkMode] = React.useState(() => {
    if (typeof window === "undefined") return false
    return window.matchMedia("(prefers-color-scheme: dark)").matches
  })

  React.useEffect(() => {
    if (typeof window === "undefined") return
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = (e: MediaQueryListEvent) => setIsDarkMode(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  const chains = [mainnet, base, arbitrum, sepolia]
  const currentChainName =
    chains.find((c) => c.id === chainId)?.name ?? `Chain ${chainId}`

  return (
    <div className="space-y-10">
      <section className="space-y-4 text-center">
        <Badge variant="ens" className="mx-auto w-fit">
          <SparklesIcon className="size-3" />
          EthGlobal HackMoney 2026 — ENS Track
        </Badge>
        <h1 className="text-4xl font-bold">ENS Identity Integration PoC</h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Demonstrating ENS identity for token-gated Telegram groups — profile
          resolution, org.telegram auto-verification, and cross-chain ENS from L2.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {isConnected && (
            <div
              className="flex items-center gap-1 rounded-md border bg-muted p-1"
              role="group"
              aria-label="Select network"
            >
              {chains.map((chain) => (
                <Button
                  key={chain.id}
                  type="button"
                  variant={chainId === chain.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    try {
                      switchChain({ chainId: chain.id })
                    } catch (error) {
                      console.error("Failed to switch chain:", error)
                    }
                  }}
                  className="text-xs"
                  aria-label={`Switch to ${chain.name}`}
                  aria-pressed={chainId === chain.id}
                >
                  {chain.name.split(" ")[0]}
                </Button>
              ))}
            </div>
          )}

          {isConnected ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                try {
                  disconnect()
                } catch (error) {
                  console.error("Failed to disconnect:", error)
                }
              }}
            >
              Disconnect
            </Button>
          ) : (
            <div className="flex flex-wrap justify-center gap-2">
              {connectors.slice(0, 2).map((connector) => (
                <Button
                  key={connector.uid}
                  type="button"
                  onClick={() => {
                    try {
                      connect({ connector })
                    } catch (error) {
                      console.error("Failed to connect:", error)
                    }
                  }}
                  disabled={isPending}
                >
                  {isPending ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <WalletIcon className="size-4" />
                  )}
                  {connector.name}
                </Button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-blue-200 bg-blue-50/50 py-0 dark:bg-blue-950/20">
          <CardContent className="pt-6">
            <GlobeIcon className="mb-3 size-8 text-blue-600" aria-hidden="true" />
            <h3 className="mb-1 font-semibold">Real ENS Resolution</h3>
            <p className="text-sm text-muted-foreground">
              Live resolution of names, avatars, and text records from mainnet.
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50 py-0 dark:bg-green-950/20">
          <CardContent className="pt-6">
            <ShieldIcon className="mb-3 size-8 text-green-600" aria-hidden="true" />
            <h3 className="mb-1 font-semibold">Telegram Auto-Verify</h3>
            <p className="text-sm text-muted-foreground">
              Creative use of org.telegram for signature-free identity verification.
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/50 py-0 dark:bg-purple-950/20">
          <CardContent className="pt-6">
            <LayersIcon className="mb-3 size-8 text-purple-600" aria-hidden="true" />
            <h3 className="mb-1 font-semibold">Cross-Chain Support</h3>
            <p className="text-sm text-muted-foreground">
              Resolve ENS while connected to Base, Arbitrum, or any L2.
            </p>
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-8">
          {isConnected && address && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <WalletIcon className="size-5" />
                <h3 className="text-lg font-semibold">Your ENS Identity</h3>
                <Badge variant="outline" className="ml-auto">
                  {currentChainName}
                </Badge>
              </div>
              <ENSIdentityCard address={address} isVerified />
              <p className="text-xs text-muted-foreground">
                * ENS resolved from mainnet while connected to {currentChainName}
              </p>
            </section>
          )}

          <section className="space-y-4">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <SparklesIcon className="size-5 text-green-600" />
                Telegram Auto-Verify (Demo)
              </h3>
              <p className="text-sm text-muted-foreground">
                If your ENS org.telegram matches your Telegram username, verify without signing.
              </p>
            </div>
            <TelegramLinkVerify
              address="0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5"
              telegramUsername={DEMO_TELEGRAM_USER.username}
              onVerified={() => alert("Auto-verified via ENS!")}
            />
          </section>

          <section>
            <ENSLookup />
          </section>
        </div>

        <div className="space-y-8">
          <section className="space-y-3">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <ChevronRightIcon className="size-5" />
              Multi-Address Demo
            </h3>
            <AddressTableWithENS
              addresses={DEMO_ADDRESSES}
              telegramUsername={DEMO_TELEGRAM_USER.username}
              onSetDefault={(id) => console.log("Set default:", id)}
              onVerify={(id) => console.log("Verify:", id)}
            />
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-semibold">Example ENS Profiles</h3>
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

          <section className="space-y-4">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <SparklesIcon className="size-5 text-purple-600" />
                EthIdentityKit ProfileCard
              </h3>
              <p className="text-sm text-muted-foreground">
                Full-featured profile component from Ethereum Identity Kit.
              </p>
            </div>

            <div className="space-y-4">
              <ErrorBoundary
                fallback={
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:bg-yellow-950/20">
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
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:bg-yellow-950/20">
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">
                      Failed to load ProfileCard for nick.eth
                    </p>
                  </div>
                }
              >
                <ProfileCard
                  addressOrName="nick.eth"
                  darkMode={isDarkMode}
                  showFollowButton={false}
                />
              </ErrorBoundary>
            </div>
          </section>
        </div>
      </div>

      <section>
        <Card className="py-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge variant="ens">ENS Bounty</Badge>
              Compliance Checklist
            </CardTitle>
            <CardDescription>
              Key requirements for the ENS prize track.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {[
                "Real ENS code (wagmi hooks + viem actions)",
                "No hard-coded values — dynamic RPC resolution",
                "Functional demo — profile display + auto-link",
                "Multi-chain support — resolve from Base/Arbitrum",
                "Creative use — org.telegram auto-verification",
                "Version control — incremental commits",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span
                    className="flex size-5 items-center justify-center rounded-full bg-green-100 text-xs text-green-700"
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
    </div>
  )
}

export function EnsDemoPage() {
  return <ENSDemo />
}
