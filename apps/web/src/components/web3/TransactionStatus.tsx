/**
 * TransactionStatus Component
 *
 * Displays transaction state with visual feedback.
 * Shows pending, success, or error states with explorer links.
 */

import { useState } from 'react'
import { type Hash } from 'viem'
import { useChainId } from 'wagmi'
import {
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react'
import { useNetworkColor, useSelectedNetwork } from '@/hooks/web3'
import { getBlockExplorerTxLink, getBlockExplorerName } from '@/utils/networks'
import { cn } from '@/lib/utils'

/**
 * Transaction state types
 */
export type TransactionState = 'pending' | 'loading' | 'success' | 'error'

/**
 * Transaction type for contextual messaging
 */
export type TransactionType =
  | 'mint'
  | 'deploy'
  | 'approve'
  | 'claim'
  | 'transfer'
  | 'generic'

interface TransactionStatusProps {
  /** Transaction hash */
  hash?: Hash
  /** Current state */
  state: TransactionState
  /** Transaction type for messaging */
  type?: TransactionType
  /** Error message */
  error?: string
  /** Custom success message */
  successMessage?: string
  /** Custom loading message */
  loadingMessage?: string
  /** Additional class names */
  className?: string
  /** Compact display mode */
  compact?: boolean
}

/**
 * Get display info for transaction type
 */
function getTransactionTypeInfo(type: TransactionType) {
  const info: Record<TransactionType, { name: string; description: string }> = {
    mint: { name: 'Token Mint', description: 'Minting tokens to your wallet' },
    deploy: { name: 'Contract Deployment', description: 'Deploying contract' },
    approve: { name: 'Token Approval', description: 'Approving token transfer' },
    claim: { name: 'Claim', description: 'Claiming tokens' },
    transfer: { name: 'Token Transfer', description: 'Transferring tokens' },
    generic: { name: 'Transaction', description: 'Processing transaction' },
  }
  return info[type]
}

/**
 * Format hash for display
 */
function formatHash(hash: Hash, length = 10): string {
  if (hash.length <= length + 2) return hash
  return `${hash.slice(0, length)}...${hash.slice(-6)}`
}

/**
 * TransactionStatus component
 */
export function TransactionStatus({
  hash,
  state,
  type = 'generic',
  error,
  successMessage,
  loadingMessage,
  className,
  compact = false,
}: TransactionStatusProps) {
  const [copied, setCopied] = useState(false)
  const chainId = useChainId() ?? 1
  const network = useSelectedNetwork(chainId)
  const networkColor = useNetworkColor(chainId)
  const typeInfo = getTransactionTypeInfo(type)

  const handleCopyHash = async () => {
    if (!hash) return
    try {
      await navigator.clipboard.writeText(hash)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const explorerUrl = hash ? getBlockExplorerTxLink(chainId, hash) : null

  const getStatusIcon = () => {
    switch (state) {
      case 'loading':
      case 'pending':
        return <Loader2 className="h-5 w-5 text-primary animate-spin" />
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'error':
        return <XCircle className="h-5 w-5 text-destructive" />
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
    }
  }

  const getStatusStyles = () => {
    switch (state) {
      case 'success':
        return 'border-green-500/20 bg-green-500/5'
      case 'error':
        return 'border-destructive/20 bg-destructive/5'
      case 'loading':
      case 'pending':
        return 'border-primary/20 bg-primary/5'
      default:
        return 'border-border bg-card'
    }
  }

  const getMessage = () => {
    switch (state) {
      case 'loading':
      case 'pending':
        return loadingMessage ?? `${typeInfo.description}...`
      case 'success':
        return successMessage ?? `${typeInfo.name} completed successfully!`
      case 'error':
        return error ?? `${typeInfo.name} failed`
      default:
        return typeInfo.description
    }
  }

  // Compact mode
  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 p-2 rounded-lg border',
          getStatusStyles(),
          className
        )}
      >
        {getStatusIcon()}
        <span className="text-sm font-medium flex-1">{getMessage()}</span>
        {hash && state === 'success' && (
          <div className="flex items-center gap-1">
            {explorerUrl ? (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs bg-muted px-2 py-1 rounded hover:bg-muted/80 inline-flex items-center gap-1"
              >
                {formatHash(hash)}
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <code className="font-mono text-xs bg-muted px-2 py-1 rounded">
                {formatHash(hash)}
              </code>
            )}
            <button
              onClick={handleCopyHash}
              className="p-1 hover:bg-muted rounded"
              title="Copy hash"
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          </div>
        )}
      </div>
    )
  }

  // Full mode
  return (
    <div
      className={cn('p-4 rounded-lg border', getStatusStyles(), className)}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">{getStatusIcon()}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium">{typeInfo.name}</h4>
            {(state === 'loading' || state === 'pending') && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                {state === 'pending' ? 'Confirming' : 'Processing'}
              </span>
            )}
          </div>

          <p className="text-sm text-muted-foreground mb-3">{getMessage()}</p>

          {hash && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Transaction:</span>
                {state === 'success' && explorerUrl ? (
                  <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs bg-muted px-2 py-1 rounded hover:bg-muted/80 inline-flex items-center gap-1"
                  >
                    {formatHash(hash)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <code className="font-mono text-xs bg-muted px-2 py-1 rounded">
                    {formatHash(hash)}
                  </code>
                )}
                <button
                  onClick={handleCopyHash}
                  className="p-1 hover:bg-muted rounded"
                  title="Copy full hash"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </div>

              {explorerUrl && state !== 'success' && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  View on {getBlockExplorerName(chainId)}
                </a>
              )}
            </div>
          )}

          {/* Network indicator */}
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: networkColor }}
            />
            <span>Network:</span>
            <span className="font-medium" style={{ color: networkColor }}>
              {network.name}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Convenience component for loading state
 */
export function LoadingTransaction({
  type = 'generic',
  message,
  className,
}: {
  type?: TransactionType
  message?: string
  className?: string
}) {
  return (
    <TransactionStatus
      state="loading"
      type={type}
      loadingMessage={message}
      className={className}
      compact
    />
  )
}

/**
 * Convenience component for success state
 */
export function SuccessTransaction({
  hash,
  type = 'generic',
  message,
  className,
}: {
  hash: Hash
  type?: TransactionType
  message?: string
  className?: string
}) {
  return (
    <TransactionStatus
      state="success"
      hash={hash}
      type={type}
      successMessage={message}
      className={className}
    />
  )
}

/**
 * Convenience component for error state
 */
export function ErrorTransaction({
  error,
  type = 'generic',
  className,
}: {
  error: string
  type?: TransactionType
  className?: string
}) {
  return (
    <TransactionStatus
      state="error"
      type={type}
      error={error}
      className={className}
    />
  )
}

export default TransactionStatus
