/**
 * Reown AppKit initialisation (side-effect module).
 *
 * Import this file once (e.g. in main.tsx) so that createAppKit() runs
 * before React renders. The modal, wallet discovery, and Telegram WebView
 * deep-link rewriting are all handled by AppKit after this call.
 */

import { createAppKit } from "@reown/appkit/react"
import { wagmiAdapter, enabledChains, WALLET_CONNECT_PROJECT_ID } from "./wagmi"

// MetaMask WalletConnect Explorer ID
const METAMASK_WALLET_ID =
  "c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96"

createAppKit({
  adapters: [wagmiAdapter],
  networks: enabledChains,
  projectId: WALLET_CONNECT_PROJECT_ID,
  metadata: {
    name: "Gater Robot",
    description: "Token-gated Telegram groups",
    url: "https://gater-app.agentix.bot",
    icons: ["https://gater-app.agentix.bot/icon.png"],
  },
  featuredWalletIds: [METAMASK_WALLET_ID],
  includeWalletIds: [METAMASK_WALLET_ID],
  allWallets: "HIDE",
  themeMode: document.documentElement.classList.contains("dark") ? "dark" : "light",
  themeVariables: {
    "--w3m-accent": "#14b8a6",
    "--w3m-border-radius-master": "10px",
    "--w3m-font-family": "Outfit, system-ui, sans-serif",
  },
})
