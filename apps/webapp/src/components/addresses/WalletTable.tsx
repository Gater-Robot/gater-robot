import { WalletIcon } from "lucide-react"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { useAddresses } from "@/hooks/useAddresses"
import { AddWalletInput } from "./AddWalletInput"
import { ENSCallToAction } from "./ENSCallToAction"
import { WalletTableRow } from "./WalletTableRow"

export function WalletTable() {
  const { addresses } = useAddresses()

  // Sort: default first, then verified before pending, then by ENS name
  const sortedAddresses = [...addresses].sort((a, b) => {
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1
    if (a.status !== b.status) return a.status === "verified" ? -1 : 1
    const aName = a.ensName || a.address
    const bName = b.ensName || b.address
    return aName.localeCompare(bName)
  })

  return (
    <div className="space-y-3">
      {/* Add wallet input */}
      <AddWalletInput />

      {/* Wallet list or empty state */}
      {addresses.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <WalletIcon className="size-6" />
            </EmptyMedia>
            <EmptyTitle>No wallets linked yet</EmptyTitle>
            <EmptyDescription>
              Add a wallet address above to unlock token-gated channels and
              prove eligibility
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-2">
          {sortedAddresses.map((address) => (
            <WalletTableRow key={address._id} address={address} />
          ))}
        </div>
      )}

      {/* ENS CTA - only show if at least one address exists */}
      {addresses.length > 0 && <ENSCallToAction />}
    </div>
  )
}
