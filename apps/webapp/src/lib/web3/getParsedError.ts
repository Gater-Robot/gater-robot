import { BaseError as BaseViemError, ContractFunctionRevertedError } from "viem"

export function getParsedError(error: unknown): string {
  const candidate: any =
    // viem/wagmi errors can be nested; `walk()` picks a useful root.
    (error as any)?.walk && typeof (error as any).walk === "function"
      ? (error as any).walk()
      : error

  if (candidate instanceof BaseViemError) {
    if (candidate.details) return candidate.details

    if (candidate.shortMessage) {
      if (
        candidate instanceof ContractFunctionRevertedError &&
        candidate.data &&
        candidate.data.errorName !== "Error"
      ) {
        const customErrorArgs = candidate.data.args?.toString?.() ?? ""
        const header = candidate.shortMessage.replace(
          /reverted\.$/,
          "reverted with the following reason:",
        )
        return `${header}\n${candidate.data.errorName}(${customErrorArgs})`
      }
      return candidate.shortMessage
    }

    return candidate.message ?? candidate.name ?? "An unknown error occurred"
  }

  return (candidate as any)?.message ?? "An unknown error occurred"
}

