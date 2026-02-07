import { useCallback, useState } from "react"
import { useMutation } from "convex/react"

import { api } from "@/convex/api"
import { useTelegram } from "@/contexts/TelegramContext"

type Id<TableName extends string> = string & { __tableName?: TableName }

export interface UseDeleteAddressReturn {
  deleteAddress: (addressId: Id<"addresses">) => Promise<boolean>
  isDeleting: boolean
  error: Error | null
}

export function useDeleteAddress(): UseDeleteAddressReturn {
  const { initDataRaw } = useTelegram()
  const deleteMutation = useMutation(api.ens.deleteAddress)

  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const deleteAddress = useCallback(
    async (addressId: Id<"addresses">): Promise<boolean> => {
      if (!initDataRaw || isDeleting) return false

      setIsDeleting(true)
      setError(null)
      try {
        await deleteMutation({ addressId, initDataRaw })
        return true
      } catch (err) {
        const e =
          err instanceof Error ? err : new Error("Failed to delete address")
        setError(e)
        return false
      } finally {
        setIsDeleting(false)
      }
    },
    [initDataRaw, isDeleting, deleteMutation]
  )

  return { deleteAddress, isDeleting, error }
}
