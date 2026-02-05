import * as React from "react"
import { CheckIcon, ClockIcon, StarIcon } from "lucide-react"

import { ENSIdentityCard } from "@/components/ens/ENSIdentityCard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

function getRadioButtonStyles(isSelected: boolean, isVerified: boolean): string {
  if (isSelected) return "border-primary bg-primary"
  if (isVerified) return "border-muted-foreground/40 hover:border-primary/60"
  return "border-muted-foreground/20 cursor-not-allowed"
}

export interface AddressData {
  id: string
  address: `0x${string}`
  status: "verified" | "pending"
  isDefault: boolean
  ensName?: string | null
  ensTelegram?: string | null
  verificationMethod?: "siwe" | "ens_telegram_match"
}

export interface AddressTableWithENSProps {
  addresses: AddressData[]
  onSetDefault?: (addressId: string) => void
  onVerify?: (addressId: string) => void
  telegramUsername?: string | null
}

export function AddressTableWithENS({
  addresses,
  onSetDefault,
  onVerify,
  telegramUsername: _telegramUsername,
}: AddressTableWithENSProps) {
  void _telegramUsername
  const [selectedDefault, setSelectedDefault] = React.useState<string | undefined>(
    addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id,
  )

  React.useEffect(() => {
    const newDefault = addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id
    setSelectedDefault(newDefault)
  }, [addresses])

  const handleSetDefault = (addressId: string) => {
    const address = addresses.find((a) => a.id === addressId)
    if (address?.status !== "verified") return
    setSelectedDefault(addressId)
    onSetDefault?.(addressId)
  }

  return (
    <Card className="py-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <StarIcon className="size-5 text-yellow-500" />
          Linked Wallets
        </CardTitle>
        <CardDescription>
          Manage your connected wallet addresses. Select a default identity to use
          across the platform.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className={
                `flex items-center gap-4 py-4 first:pt-0 last:pb-0 ` +
                (addr.isDefault ? "bg-primary/5 -mx-4 rounded-lg px-4" : "")
              }
            >
              <button
                type="button"
                onClick={() => handleSetDefault(addr.id)}
                disabled={addr.status !== "verified"}
                role="radio"
                aria-checked={selectedDefault === addr.id}
                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${getRadioButtonStyles(selectedDefault === addr.id, addr.status === "verified")}`}
                title={
                  addr.status !== "verified"
                    ? "Verify this address to set as default"
                    : "Set as default identity"
                }
              >
                {selectedDefault === addr.id && (
                  <div className="h-2 w-2 rounded-full bg-white" />
                )}
              </button>

              <div className="min-w-0 flex-1">
                <ENSIdentityCard
                  address={addr.address}
                  isVerified={addr.status === "verified"}
                  isDefault={selectedDefault === addr.id}
                  telegramMatched={addr.verificationMethod === "ens_telegram_match"}
                  compact
                />
              </div>

              <div className="flex flex-shrink-0 items-center gap-2">
                {addr.status === "verified" ? (
                  <Badge variant="success" className="gap-1">
                    <CheckIcon className="size-3" />
                    Verified
                    {addr.verificationMethod === "ens_telegram_match" && (
                      <span className="text-[10px] opacity-75">(ENS)</span>
                    )}
                  </Badge>
                ) : (
                  <>
                    <Badge variant="outline" className="gap-1">
                      <ClockIcon className="size-3" />
                      Pending
                    </Badge>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onVerify?.(addr.id)}
                    >
                      Verify
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {addresses.length === 0 && (
          <div className="py-8 text-center text-muted-foreground">
            <p>No wallets connected yet.</p>
            <p className="mt-1 text-sm">Connect a wallet to get started with ENS identity.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export const DEMO_ADDRESSES: AddressData[] = [
  {
    id: "1",
    address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    status: "verified",
    isDefault: true,
    ensName: "vitalik.eth",
    verificationMethod: "siwe",
  },
  {
    id: "2",
    address: "0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5",
    status: "verified",
    isDefault: false,
    ensName: "nick.eth",
    verificationMethod: "ens_telegram_match",
  },
  {
    id: "3",
    address: "0x983110309620D911731Ac0932219af06091b6744",
    status: "pending",
    isDefault: false,
    ensName: null,
  },
]

