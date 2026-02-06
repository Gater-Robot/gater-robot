import type { WidgetConfig } from "@lifi/widget"

function toWei(amount: string, decimals: number): string {
  const [whole, fraction = ""] = amount.split(".")
  const paddedFraction = fraction.padEnd(decimals, "0").slice(0, decimals)
  const combined = whole + paddedFraction
  const trimmed = combined.replace(/^0+/, "") || "0"
  return trimmed
}

export function createGateWidgetConfig(
  _gateName: string,
  tokenAddress: string,
  chainId: number,
  amountNeeded: string,
  decimals: number,
): WidgetConfig {
  const amountInWei = toWei(amountNeeded, decimals)

  return {
    integrator: "gater-robot",
    appearance: "dark",
    theme: {
      palette: {
        primary: { main: "#3b82f6" },
        background: { default: "#0f172a", paper: "#1e293b" },
      },
      container: {
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "12px",
      },
    },
    toChain: chainId,
    toToken: tokenAddress,
    toAmount: amountInWei,
    fromChain: undefined,
    fromToken: undefined,
  }
}

export const DEFAULT_WIDGET_CONFIG: WidgetConfig = {
  integrator: "gater-robot",
  appearance: "dark",
  theme: {
    palette: {
      primary: { main: "#3b82f6" },
      background: { default: "#0f172a", paper: "#1e293b" },
    },
    container: {
      border: "1px solid rgba(255, 255, 255, 0.1)",
      borderRadius: "12px",
    },
  },
}

