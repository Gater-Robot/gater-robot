/**
 * ConnectButton - Wallet Connection Button
 *
 * Uses RainbowKit's ConnectButton with custom styling.
 * Shows connect button when disconnected, chain + address when connected.
 */

import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ConnectButtonProps {
  /** Button variant */
  variant?: 'default' | 'secondary' | 'outline' | 'ghost'
  /** Button size */
  size?: 'default' | 'sm' | 'lg'
  /** Additional class names */
  className?: string
  /** Show chain selector when connected */
  showChain?: boolean
}

/**
 * Custom wallet connect button
 */
export function ConnectButton({
  variant = 'default',
  size = 'default',
  className,
  showChain = true,
}: ConnectButtonProps) {
  return (
    <RainbowConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== 'loading'
        const connected = ready && account && chain

        if (!connected) {
          return (
            <Button
              variant={variant}
              size={size}
              className={cn('min-w-[140px]', className)}
              onClick={openConnectModal}
              disabled={!ready}
            >
              Connect Wallet
            </Button>
          )
        }

        // Wrong network state
        if (chain.unsupported) {
          return (
            <Button
              variant="destructive"
              size={size}
              className={className}
              onClick={openChainModal}
            >
              Wrong Network
            </Button>
          )
        }

        return (
          <div className={cn('flex items-center gap-2', className)}>
            {showChain && (
              <Button
                variant="outline"
                size={size}
                className="gap-2"
                onClick={openChainModal}
              >
                {chain.iconUrl && (
                  <img
                    src={chain.iconUrl}
                    alt={chain.name ?? 'Chain'}
                    width={18}
                    height={18}
                    className="rounded-full"
                  />
                )}
                <span className="text-xs uppercase tracking-wide hidden sm:inline">
                  {chain.name}
                </span>
              </Button>
            )}
            <Button
              variant="outline"
              size={size}
              className="gap-2"
              onClick={openAccountModal}
            >
              <span className="font-semibold">{account.displayName}</span>
              {account.displayBalance && (
                <span className="text-muted-foreground hidden sm:inline">
                  ({account.displayBalance})
                </span>
              )}
            </Button>
          </div>
        )
      }}
    </RainbowConnectButton.Custom>
  )
}

export default ConnectButton
