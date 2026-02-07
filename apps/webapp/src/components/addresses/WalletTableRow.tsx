import { useState } from "react"
import {
  CheckIcon,
  ChevronDownIcon,
  ClockIcon,
  StarIcon,
  WalletIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import type { UserAddress } from "@/hooks/useAddresses"
import { cn, truncateAddress } from "@/lib/utils"
import { WalletActions } from "./WalletActions"

export function WalletTableRow({ address }: { address: UserAddress }) {
  const [isOpen, setIsOpen] = useState(false)

  const isVerified = address.status === "verified"
  const isDefault = address.isDefault
  const displayName = address.ensName || truncateAddress(address.address)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Item
        variant="outline"
        size="sm"
        className={cn(
          "transition-colors",
          isDefault && "border-primary bg-primary/5",
          !isVerified && "opacity-60",
        )}
      >
        <CollapsibleTrigger asChild>
          <button
            className="flex w-full items-center gap-3 text-left"
            aria-expanded={isOpen}
            aria-label={`${displayName} - ${isVerified ? "Verified" : "Pending"}${isDefault ? " - Default" : ""}`}
          >
            <ItemMedia variant="icon">
              {isDefault ? (
                <StarIcon className="size-4 text-primary" />
              ) : (
                <WalletIcon className="size-4" />
              )}
            </ItemMedia>

            <ItemContent>
              <ItemTitle>
                <span className={cn(!address.ensName && "font-mono text-sm")}>
                  {displayName}
                </span>
                {address.ensName && (
                  <Badge variant="ens" size="sm" className="ml-2">
                    ENS
                  </Badge>
                )}
              </ItemTitle>
              {address.ensName && (
                <ItemDescription className="font-mono text-xs">
                  {truncateAddress(address.address)}
                </ItemDescription>
              )}
            </ItemContent>

            <ItemActions>
              <Badge variant={isVerified ? "success" : "outline"} size="sm">
                {isVerified ? (
                  <CheckIcon className="size-3" />
                ) : (
                  <ClockIcon className="size-3" />
                )}
                {isVerified ? "Verified" : "Pending"}
              </Badge>
              <ChevronDownIcon
                className={cn(
                  "size-4 transition-transform",
                  isOpen && "rotate-180",
                )}
              />
            </ItemActions>
          </button>
        </CollapsibleTrigger>
      </Item>

      <CollapsibleContent className="px-4 pb-3 pt-2">
        <WalletActions
          address={address}
          onActionComplete={() => setIsOpen(false)}
        />
      </CollapsibleContent>
    </Collapsible>
  )
}
