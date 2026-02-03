/**
 * ENSLookup - Search for any ENS name or address
 *
 * Interactive component for looking up ENS profiles:
 * - Enter an ENS name → resolves to address + profile
 * - Enter an address → resolves to ENS name + profile
 *
 * Great for hackathon demos to show real ENS resolution.
 */

import { useState } from 'react'
import { useEnsName, useEnsAddress } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { normalize } from 'viem/ens'
import { isAddress } from 'viem'
import { ENSIdentityCard } from './ENSIdentityCard'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
} from '@/components/ui'
import { Search, Loader2, AlertCircle } from 'lucide-react'

export function ENSLookup() {
  const [input, setInput] = useState('')
  const [searchTerm, setSearchTerm] = useState<string | null>(null)
  const [searchType, setSearchType] = useState<'name' | 'address' | null>(null)

  // Determine if input is an address or ENS name (use viem's isAddress for robust validation)
  const isInputAnAddress = isAddress(input)

  // ENS name resolution (when searching by name)
  const {
    data: resolvedAddress,
    isLoading: addressLoading,
    error: addressError,
  } = useEnsAddress({
    name: searchType === 'name' && searchTerm ? normalize(searchTerm) : undefined,
    chainId: mainnet.id,
    query: { enabled: searchType === 'name' && !!searchTerm },
  })

  // ENS name reverse lookup (when searching by address)
  const {
    data: resolvedName,
    isLoading: nameLoading,
    error: nameError,
  } = useEnsName({
    address: searchType === 'address' && searchTerm ? (searchTerm as `0x${string}`) : undefined,
    chainId: mainnet.id,
    query: { enabled: searchType === 'address' && !!searchTerm },
  })

  const handleSearch = () => {
    if (!input.trim()) return

    if (isInputAnAddress) {
      setSearchType('address')
      setSearchTerm(input.trim())
    } else {
      setSearchType('name')
      // Add .eth if not present
      const term = input.trim().endsWith('.eth')
        ? input.trim()
        : `${input.trim()}.eth`
      setSearchTerm(term)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const isLoading = addressLoading || nameLoading
  const error = addressError || nameError
  const hasResult =
    (searchType === 'name' && resolvedAddress) ||
    (searchType === 'address' && searchTerm)
  const displayAddress =
    searchType === 'name'
      ? resolvedAddress
      : searchType === 'address'
      ? (searchTerm as `0x${string}`)
      : null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Search className="h-5 w-5" />
          ENS Lookup
        </CardTitle>
        <CardDescription>
          Search for any ENS name or Ethereum address to view their profile.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="vitalik.eth or 0xd8dA..."
            className="flex-1 px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button onClick={handleSearch} disabled={!input.trim() || isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Quick search suggestions */}
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Try:</span>
          {['vitalik.eth', 'nick.eth', 'ens.eth'].map((name) => (
            <button
              key={name}
              onClick={() => {
                setInput(name)
                setSearchType('name')
                setSearchTerm(name)
              }}
              className="text-xs text-primary hover:underline"
            >
              {name}
            </button>
          ))}
        </div>

        {/* Error state */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
            <AlertCircle className="h-4 w-4" />
            <span>
              {searchType === 'name'
                ? 'ENS name not found or no address set'
                : 'Could not resolve ENS for this address'}
            </span>
          </div>
        )}

        {/* Result */}
        {!isLoading && hasResult && displayAddress && (
          <div className="pt-2">
            {searchType === 'name' && (
              <p className="text-sm text-muted-foreground mb-2">
                <strong>{searchTerm}</strong> resolves to:
              </p>
            )}
            {searchType === 'address' && resolvedName && (
              <p className="text-sm text-muted-foreground mb-2">
                Address resolves to <strong>{resolvedName}</strong>:
              </p>
            )}
            {searchType === 'address' && !resolvedName && !nameLoading && (
              <p className="text-sm text-muted-foreground mb-2">
                No ENS name set for this address:
              </p>
            )}
            <ENSIdentityCard address={displayAddress} />
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
