import { useState } from "react"
import { useMutation } from "convex/react"
import { CheckIcon, XIcon, Loader2Icon, PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { Field, FieldError } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupInput,
  InputGroupButton,
  InputGroupAddon,
} from "@/components/ui/input-group"
import { api } from "@/convex/api"
import { useTelegram } from "@/contexts/TelegramContext"
import { useAddresses } from "@/hooks/useAddresses"
import { useWalletValidation } from "@/hooks/useWalletValidation"

export function AddWalletInput({ onAdded }: { onAdded?: () => void }) {
  const [value, setValue] = useState("")
  const { initDataRaw } = useTelegram()
  const { addresses } = useAddresses()
  const { isValid, error, isValidating } = useWalletValidation(value, addresses)
  const addAddressMutation = useMutation(api.ens.addAddress)
  const [isAdding, setIsAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const handleAdd = async () => {
    if (!isValid || !initDataRaw) return

    setIsAdding(true)
    setAddError(null)
    try {
      await addAddressMutation({ address: value.trim(), initDataRaw })
      setValue("") // Clear input on success
      toast.success("Wallet added successfully")
      onAdded?.()
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to add wallet"
      setAddError(errorMessage)
      toast.error(errorMessage)
      console.error("Failed to add wallet:", err)
    } finally {
      setIsAdding(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && isValid) {
      handleAdd()
    }
  }

  return (
    <Field>
      <InputGroup>
        <InputGroupInput
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="0x... or ENS name"
          aria-invalid={!!error}
          className="font-mono text-sm"
        />

        {value && (
          <InputGroupAddon align="inline-end">
            {isValidating ? (
              <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
            ) : isValid ? (
              <CheckIcon className="size-4 text-success" />
            ) : error ? (
              <XIcon className="size-4 text-destructive" />
            ) : null}
          </InputGroupAddon>
        )}

        <InputGroupButton
          size="sm"
          variant="default"
          onClick={handleAdd}
          disabled={!isValid || isAdding}
        >
          {isAdding ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <PlusIcon className="size-4" />
          )}
          Add
        </InputGroupButton>
      </InputGroup>

      {error && <FieldError errors={[{ message: error }]} />}
      {addError && <FieldError errors={[{ message: addError }]} />}
    </Field>
  )
}
