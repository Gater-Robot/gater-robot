import { useCallback, useRef, useState } from "react"
import { useMutation } from "convex/react"

import { api } from "@/convex/api"
import { useTelegram } from "@/contexts/TelegramContext"

type Id<TableName extends string> = string & { __tableName?: TableName }

export interface UseDeleteAddressReturn {
  deleteAddress: (addressId: Id<"addresses">) => Promise<boolean>
  deletingId: string | null
  error: Error | null
}

export function useDeleteAddress(): UseDeleteAddressReturn {
  const { initDataRaw } = useTelegram()
  const deleteMutation = useMutation(api.ens.deleteAddress)

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const inflightRef = useRef(false)

  const deleteAddress = useCallback(
    async (addressId: Id<"addresses">): Promise<boolean> => {
      if (!initDataRaw || inflightRef.current) return false

      inflightRef.current = true
      setDeletingId(addressId)
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
        inflightRef.current = false
        setDeletingId(null)
      }
    },
    [initDataRaw, deleteMutation]
  )

  return { deleteAddress, deletingId, error }
}
