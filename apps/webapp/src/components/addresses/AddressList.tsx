import { CheckIcon, ClockIcon, Loader2Icon, StarIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Skeleton } from "@/components/ui/skeleton"
import { useAddresses, type UserAddress } from "@/hooks/useAddresses"
import { cn, truncateAddress } from "@/lib/utils"

type Id<TableName extends string> = string & { __tableName?: TableName }

export interface AddressListProps {
  className?: string
  onDefaultChange?: (addressId: Id<"addresses">) => void
}

export function AddressList({ className, onDefaultChange }: AddressListProps) {
  const { addresses, isLoading, setDefault, isSettingDefault, setDefaultError } =
    useAddresses()

  const defaultAddress = addresses.find((a) => a.isDefault)

  const handleValueChange = async (value: string) => {
    const address = addresses.find((a) => a._id === value)
    if (!address) return

    try {
      await setDefault(address._id)
      onDefaultChange?.(address._id)
    } catch {
      // error surfaced via hook state
    }
  }

  if (isLoading) return <AddressListSkeleton className={className} />

  if (addresses.length === 0) {
    return (
      <div className={cn("py-6 text-center text-muted-foreground", className)}>
        <p>No wallet addresses linked yet.</p>
        <p className="mt-1 text-sm">Connect a wallet to get started.</p>
      </div>
    )
  }

  return (
    <div className={className}>
      {setDefaultError && (
        <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {setDefaultError.message}
        </div>
      )}

      <RadioGroup
        value={defaultAddress?._id}
        onValueChange={handleValueChange}
        disabled={isSettingDefault}
        className="space-y-3"
      >
        {addresses.map((address) => (
          <AddressItem
            key={address._id}
            address={address}
            isSettingDefault={isSettingDefault}
          />
        ))}
      </RadioGroup>
    </div>
  )
}

function AddressItem({
  address,
  isSettingDefault,
}: {
  address: UserAddress
  isSettingDefault: boolean
}) {
  const isVerified = address.status === "verified"
  const displayName = address.ensName || truncateAddress(address.address)

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3 transition-colors",
        address.isDefault
          ? "border-primary bg-primary/5"
          : "border-border hover:border-muted-foreground/50",
        !isVerified && "opacity-60",
      )}
    >
      <div className="flex items-center">
        {isSettingDefault && address.isDefault ? (
          <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
        ) : (
          <RadioGroupItem
            value={address._id}
            id={address._id}
            disabled={!isVerified}
            aria-label={`Select ${displayName} as default`}
          />
        )}
      </div>

      <label
        htmlFor={address._id}
        className={cn(
          "min-w-0 flex-1",
          isVerified ? "cursor-pointer" : "cursor-not-allowed",
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("font-medium", !address.ensName && "font-mono")}>
            {displayName}
          </span>

          {address.ensName && (
            <Badge variant="ens" size="sm">
              ENS
            </Badge>
          )}
        </div>

        {address.ensName && (
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
            {truncateAddress(address.address)}
          </p>
        )}
      </label>

      <div className="flex items-center gap-2">
        {isVerified ? (
          <Badge variant="success" size="sm">
            <CheckIcon className="size-3" />
            Verified
          </Badge>
        ) : (
          <Badge variant="outline" size="sm">
            <ClockIcon className="size-3" />
            Pending
          </Badge>
        )}

        {address.isDefault && (
          <Badge variant="default" size="sm">
            <StarIcon className="size-3" />
            Default
          </Badge>
        )}
      </div>
    </div>
  )
}

function AddressListSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {[1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
          <Skeleton className="size-4 rounded-full" />
          <div className="flex-1">
            <Skeleton className="mb-1 h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
  )
}
