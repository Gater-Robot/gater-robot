import * as React from "react"

import { ChainSelect } from "@/components/web3/ChainSelect"
import { TokenAddressField } from "@/components/web3/TokenAddressField"
import { TransactionStatus, type TransactionState } from "@/components/web3/TransactionStatus"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export function AdminPage() {
  const [chainId, setChainId] = React.useState<number | null>(8453)
  const [tokenAddress, setTokenAddress] = React.useState("")
  const [txState, setTxState] = React.useState<TransactionState>("pending")

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Admin</h1>

      <Card className="p-4 text-sm text-muted-foreground">
        Placeholder route. This page is where admins will configure org + channel
        gates. The components below are the harvested “Web3 Admin UX” primitives
        (chain picker, token input validation, transaction status).
      </Card>

      <Card className="space-y-6 p-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Register Gate (Demo)</h2>
          <p className="text-sm text-muted-foreground">
            Select a chain, then enter a token address. The app will validate
            the token on that chain and display token details or a helpful error.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <ChainSelect value={chainId} onChange={setChainId} />
          <TokenAddressField
            chainId={chainId}
            value={tokenAddress}
            onChange={setTokenAddress}
          />
        </div>
      </Card>

      <Card className="space-y-4 p-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Transaction Status (Demo)</h2>
          <p className="text-sm text-muted-foreground">
            Visual primitive used anywhere we submit onchain transactions.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={txState === "pending" ? "default" : "secondary"}
            onClick={() => setTxState("pending")}
          >
            Pending
          </Button>
          <Button
            type="button"
            variant={txState === "loading" ? "default" : "secondary"}
            onClick={() => setTxState("loading")}
          >
            Loading
          </Button>
          <Button
            type="button"
            variant={txState === "success" ? "default" : "secondary"}
            onClick={() => setTxState("success")}
          >
            Success
          </Button>
          <Button
            type="button"
            variant={txState === "error" ? "destructive" : "secondary"}
            onClick={() => setTxState("error")}
          >
            Error
          </Button>
        </div>

        <TransactionStatus
          state={txState}
          chainId={chainId ?? undefined}
          hash={
            // Just a demo hash shape
            "0x0000000000000000000000000000000000000000000000000000000000000000"
          }
          description={
            txState === "error"
              ? undefined
              : "This component shows progress, provides an explorer link, and supports copy-to-clipboard."
          }
          error={
            txState === "error"
              ? "User rejected the signature, or the transaction reverted."
              : undefined
          }
        />
      </Card>
    </div>
  )
}
