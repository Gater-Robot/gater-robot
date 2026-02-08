import { useState } from "react"
import { Loader2Icon, Trash2Icon, StarIcon } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { SIWEButton } from "@/components/wallet/SIWEButton"
import { useAddresses, type UserAddress } from "@/hooks/useAddresses"
import { truncateAddress } from "@/lib/utils"
import { toast } from "sonner"

export function WalletActions({
  address,
  onActionComplete,
}: {
  address: UserAddress
  onActionComplete?: () => void
}) {
  const { setDefault, deleteAddress, isSettingDefault, isDeletingAddress } =
    useAddresses()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const isPending = address.status === "pending"
  const isVerified = address.status === "verified"
  const isDefault = address.isDefault

  const handleMakeDefault = async () => {
    try {
      await setDefault(address._id)
      toast.success(
        `${address.ensName || truncateAddress(address.address)} is now your default wallet`,
      )
      onActionComplete?.()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update default address",
      )
    }
  }

  const handleDelete = async () => {
    try {
      await deleteAddress(address._id)
      toast.success(
        `${address.ensName || truncateAddress(address.address)} has been deleted`,
      )
      setDeleteDialogOpen(false)
      onActionComplete?.()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete wallet",
      )
    }
  }

  return (
    <div className="space-y-2">
      {/* Verify section for pending wallets */}
      {isPending && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Verify Wallet</p>
          <SIWEButton address={address.address} />
        </div>
      )}

      {/* Make default button for verified non-default wallets */}
      {isVerified && !isDefault && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleMakeDefault}
          disabled={isSettingDefault}
          className="w-full"
        >
          {isSettingDefault ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <StarIcon className="size-4" />
          )}
          Make Default
        </Button>
      )}

      {/* Delete button */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={isDefault || isDeletingAddress}
            className="w-full"
          >
            {isDeletingAddress ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <Trash2Icon className="size-4" />
            )}
            Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete wallet?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove{" "}
              <span className="font-mono">
                {address.ensName || truncateAddress(address.address)}
              </span>{" "}
              from your account. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isDefault && (
        <p className="text-xs text-muted-foreground">
          Cannot delete default address. Make another wallet default first.
        </p>
      )}
    </div>
  )
}
