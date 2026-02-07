import * as React from "react"
import { AlertCircleIcon, Loader2Icon, SearchIcon } from "lucide-react"
import { isAddress } from "viem"
import { normalize } from "viem/ens"
import { useEnsAddress, useEnsName } from "wagmi"
import { mainnet } from "wagmi/chains"

import { ENSIdentityCard } from "@/components/ens/ENSIdentityCard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

function getDisplayAddress(
  searchType: "name" | "address" | null,
  resolvedAddress: `0x${string}` | null | undefined,
  searchTerm: string | null,
): `0x${string}` | null {
  if (searchType === "name") return resolvedAddress ?? null
  if (searchType === "address") return searchTerm as `0x${string}`
  return null
}

export function ENSLookup() {
  const [input, setInput] = React.useState("")
  const [searchTerm, setSearchTerm] = React.useState<string | null>(null)
  const [searchType, setSearchType] = React.useState<"name" | "address" | null>(
    null,
  )

  const isInputAnAddress = isAddress(input)

  const {
    data: resolvedAddress,
    isLoading: addressLoading,
    error: addressError,
  } = useEnsAddress({
    name:
      searchType === "name" && searchTerm ? normalize(searchTerm) : undefined,
    chainId: mainnet.id,
    query: { enabled: searchType === "name" && !!searchTerm },
  })

  const {
    data: resolvedName,
    isLoading: nameLoading,
    error: nameError,
  } = useEnsName({
    address:
      searchType === "address" && searchTerm
        ? (searchTerm as `0x${string}`)
        : undefined,
    chainId: mainnet.id,
    query: { enabled: searchType === "address" && !!searchTerm },
  })

  const handleSearch = () => {
    if (!input.trim()) return

    if (isInputAnAddress) {
      setSearchType("address")
      setSearchTerm(input.trim())
      return
    }

    setSearchType("name")
    const term = input.trim().endsWith(".eth") ? input.trim() : `${input.trim()}.eth`
    setSearchTerm(term)
  }

  const isLoading = addressLoading || nameLoading
  const error = addressError || nameError
  const hasResult =
    (searchType === "name" && resolvedAddress) ||
    (searchType === "address" && searchTerm)
  const displayAddress = getDisplayAddress(searchType, resolvedAddress, searchTerm)

  return (
    <Card className="py-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <SearchIcon className="size-5" />
          ENS Lookup
        </CardTitle>
        <CardDescription>
          Search for any ENS name or Ethereum address to view their profile.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <label htmlFor="ens-search-input" className="sr-only">
            Search for ENS name or address
          </label>
          <Input
            id="ens-search-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch()
            }}
            placeholder="vitalik.eth or 0xd8dA..."
            className="flex-1"
          />
          <Button
            type="button"
            onClick={handleSearch}
            disabled={!input.trim() || isLoading}
            aria-label="Search"
            size="icon"
          >
            {isLoading ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <SearchIcon className="size-4" />
            )}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground">Try:</span>
          {["vitalik.eth", "nick.eth", "ens.eth"].map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setInput(name)
                setSearchType("name")
                setSearchTerm(name)
              }}
              className="rounded text-xs text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {name}
            </button>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircleIcon className="size-4" />
            <span>
              {searchType === "name"
                ? "ENS name not found or no address set"
                : "Could not resolve ENS for this address"}
            </span>
          </div>
        )}

        {!isLoading && hasResult && displayAddress && (
          <div className="pt-2">
            {searchType === "name" && (
              <p className="mb-2 text-sm text-muted-foreground">
                <strong>{searchTerm}</strong> resolves to:
              </p>
            )}
            {searchType === "address" && resolvedName && (
              <p className="mb-2 text-sm text-muted-foreground">
                Address resolves to <strong>{resolvedName}</strong>:
              </p>
            )}
            {searchType === "address" && !resolvedName && !nameLoading && (
              <p className="mb-2 text-sm text-muted-foreground">
                No ENS name set for this address:
              </p>
            )}
            <ENSIdentityCard address={displayAddress} />
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
            <span className="sr-only">Loading ENS profile…</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

