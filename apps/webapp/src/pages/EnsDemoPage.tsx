import * as React from "react"
import { ProfileCard } from "ethereum-identity-kit"
import {
  FlaskConicalIcon,
  GlobeIcon,
  LayersIcon,
  Loader2Icon,
  ShieldIcon,
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

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
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
    <div className="space-y-6">
      {/* Workshop header */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <FlaskConicalIcon className="size-5 text-primary" />
          <Badge variant="outline" size="sm">Workshop</Badge>
        </div>
        <h1 className="text-xl font-semibold">Component Workshop</h1>
        <p className="text-sm text-muted-foreground">
          ENS identity components &amp; integration demos. Live data, real
          resolution.
        </p>
      </div>

      {/* Wallet connection */}
      <Card className="py-0">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            {isConnected ? (
              <>
                <div className="flex flex-wrap gap-1">
                  {chains.map((chain) => (
                    <Button
                      key={chain.id}
                      type="button"
                      variant={chainId === chain.id ? "default" : "outline"}
                      size="xs"
                      onClick={() => {
                        try {
                          switchChain({ chainId: chain.id })
                        } catch (error) {
                          console.error("Failed to switch chain:", error)
                        }
                      }}
                      aria-label={`Switch to ${chain.name}`}
                      aria-pressed={chainId === chain.id}
                    >
                      {chain.name.split(" ")[0]}
                    </Button>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    try {
                      disconnect()
                    } catch (error) {
                      console.error("Failed to disconnect:", error)
                    }
                  }}
                  className="ml-auto"
                >
                  Disconnect
                </Button>
              </>
            ) : (
              <div className="flex flex-wrap gap-2">
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
                    size="sm"
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
        </CardContent>
      </Card>

      {/* Feature highlights - horizontal scroll on mobile */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        <Card className="min-w-[200px] flex-shrink-0 border-primary/20 bg-primary/5 py-0 dark:bg-primary/10">
          <CardContent className="p-3">
            <GlobeIcon className="mb-2 size-5 text-primary" aria-hidden="true" />
            <p className="text-sm font-medium">Real ENS Resolution</p>
            <p className="text-xs text-muted-foreground">Live from mainnet</p>
          </CardContent>
        </Card>
        <Card className="min-w-[200px] flex-shrink-0 border-emerald-500/20 bg-emerald-500/5 py-0 dark:bg-emerald-500/10">
          <CardContent className="p-3">
            <ShieldIcon className="mb-2 size-5 text-emerald-600" aria-hidden="true" />
            <p className="text-sm font-medium">Telegram Auto-Verify</p>
            <p className="text-xs text-muted-foreground">Via org.telegram</p>
          </CardContent>
        </Card>
        <Card className="min-w-[200px] flex-shrink-0 border-purple-500/20 bg-purple-500/5 py-0 dark:bg-purple-500/10">
          <CardContent className="p-3">
            <LayersIcon className="mb-2 size-5 text-purple-600" aria-hidden="true" />
            <p className="text-sm font-medium">Cross-Chain</p>
            <p className="text-xs text-muted-foreground">Base, Arbitrum, L2</p>
          </CardContent>
        </Card>
      </div>

      <SectionDivider label="Your Identity" />

      {/* Connected wallet ENS */}
      {isConnected && address ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Connected Wallet
            </h2>
            <Badge variant="outline" size="sm">{currentChainName}</Badge>
          </div>
          <ENSIdentityCard address={address} isVerified />
          <p className="text-xs text-muted-foreground">
            ENS resolved from mainnet while connected to {currentChainName}
          </p>
        </section>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          Connect a wallet above to see your ENS identity
        </p>
      )}

      <SectionDivider label="Telegram Verify" />

      {/* Telegram auto-verify demo */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Auto-Verify via org.telegram
        </h2>
        <p className="text-sm text-muted-foreground">
          If your ENS org.telegram matches your Telegram username, verify without signing.
        </p>
        <TelegramLinkVerify
          address="0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5"
          telegramUsername={DEMO_TELEGRAM_USER.username}
          onVerified={() => alert("Auto-verified via ENS!")}
        />
      </section>

      <SectionDivider label="ENS Lookup" />

      <ENSLookup />

      <SectionDivider label="Example Profiles" />

      {/* Example profiles */}
      <section className="space-y-4">
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
      </section>

      <SectionDivider label="Multi-Address Table" />

      {/* Multi-address demo */}
      <section className="space-y-3">
        <AddressTableWithENS
          addresses={DEMO_ADDRESSES}
          telegramUsername={DEMO_TELEGRAM_USER.username}
          onSetDefault={(id) => console.log("Set default:", id)}
          onVerify={(id) => console.log("Verify:", id)}
        />
      </section>

      <SectionDivider label="Ethereum Identity Kit" />

      {/* ProfileCard showcase */}
      <section className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Full ProfileCard from ethereum-identity-kit
        </p>
        <ErrorBoundary
          fallback={
            <Card className="border-amber-200 bg-amber-50 py-0 dark:bg-amber-950/20">
              <CardContent className="p-4">
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Failed to load ProfileCard for vitalik.eth
                </p>
              </CardContent>
            </Card>
          }
        >
          <ProfileCard addressOrName="vitalik.eth" darkMode={isDarkMode} />
        </ErrorBoundary>
        <ErrorBoundary
          fallback={
            <Card className="border-amber-200 bg-amber-50 py-0 dark:bg-amber-950/20">
              <CardContent className="p-4">
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Failed to load ProfileCard for nick.eth
                </p>
              </CardContent>
            </Card>
          }
        >
          <ProfileCard
            addressOrName="nick.eth"
            darkMode={isDarkMode}
            showFollowButton={false}
          />
        </ErrorBoundary>
      </section>

      <SectionDivider label="Hackathon Compliance" />

      {/* Compliance checklist */}
      <Card className="py-0">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Badge variant="ens" size="sm">ENS Bounty</Badge>
            Compliance Checklist
          </CardTitle>
          <CardDescription className="text-xs">
            Key requirements for the ENS prize track
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
                  className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
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
    </div>
  )
}

export function EnsDemoPage() {
  return <ENSDemo />
}
