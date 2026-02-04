/**
 * FaucetPage - Claim BEST tokens from the faucet
 *
 * Allows users to claim 2026 $BEST tokens once per address.
 * Features:
 * - Connect wallet if not connected
 * - Check if already claimed
 * - Claim tokens with loading state
 * - Add token to wallet (EIP-747)
 * - Success/error feedback
 */

import { useState, useEffect } from 'react'
import {
  useAccount,
  useChainId,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from 'wagmi'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Badge,
} from '@/components/ui'
import { ConnectWallet } from '@/components/wallet'
import { GoldMedalIcon } from '@/components/icons'
import { Loader2, CheckCircle, XCircle, Plus, ExternalLink, Droplets } from 'lucide-react'
import type { Address } from 'viem'

// Token configuration
const BEST_TOKEN_SYMBOL = 'BEST'
const BEST_TOKEN_DECIMALS = 18
const FAUCET_AMOUNT = '2026'

// Get token address from environment or use placeholder
const BEST_TOKEN_ADDRESS = (import.meta.env.VITE_BEST_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000') as Address

// Minimal ABI for the faucet contract
const BEST_TOKEN_ABI = [
  {
    type: 'function',
    name: 'faucet',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'hasClaimed',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'name',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'symbol',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'decimals',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
] as const

type ClaimState = 'idle' | 'claiming' | 'success' | 'error'

export function FaucetPage() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const [claimState, setClaimState] = useState<ClaimState>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [addedToWallet, setAddedToWallet] = useState(false)

  // Check if user has already claimed
  const { data: hasClaimed, refetch: refetchHasClaimed } = useReadContract({
    address: BEST_TOKEN_ADDRESS,
    abi: BEST_TOKEN_ABI,
    functionName: 'hasClaimed',
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address && BEST_TOKEN_ADDRESS !== '0x0000000000000000000000000000000000000000',
    },
  })

  // Get user's balance
  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: BEST_TOKEN_ADDRESS,
    abi: BEST_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address && BEST_TOKEN_ADDRESS !== '0x0000000000000000000000000000000000000000',
    },
  })

  // Write contract hook for claiming
  const {
    writeContract,
    data: txHash,
    isPending: isWritePending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract()

  // Wait for transaction receipt
  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmError,
  } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  // Handle transaction state changes
  useEffect(() => {
    if (isWritePending || isConfirming) {
      setClaimState('claiming')
    } else if (isConfirmed) {
      setClaimState('success')
      // Refetch balance and claimed status
      refetchHasClaimed()
      refetchBalance()
    } else if (writeError || confirmError) {
      setClaimState('error')
      setErrorMessage(writeError?.message || confirmError?.message || 'Transaction failed')
    }
  }, [isWritePending, isConfirming, isConfirmed, writeError, confirmError, refetchHasClaimed, refetchBalance])

  // Handle claim button click
  const handleClaim = async () => {
    setErrorMessage('')
    setClaimState('claiming')

    try {
      writeContract({
        address: BEST_TOKEN_ADDRESS,
        abi: BEST_TOKEN_ABI,
        functionName: 'faucet',
      })
    } catch (err) {
      setClaimState('error')
      setErrorMessage(err instanceof Error ? err.message : 'Failed to initiate transaction')
    }
  }

  // Reset state for trying again
  const handleReset = () => {
    setClaimState('idle')
    setErrorMessage('')
    resetWrite()
  }

  // Add token to wallet (EIP-747)
  const handleAddToWallet = async () => {
    if (!window.ethereum) {
      setErrorMessage('No wallet detected')
      return
    }

    try {
      await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: BEST_TOKEN_ADDRESS,
            symbol: BEST_TOKEN_SYMBOL,
            decimals: BEST_TOKEN_DECIMALS,
          },
        },
      })
      setAddedToWallet(true)
    } catch (err) {
      console.error('Failed to add token to wallet:', err)
    }
  }

  // Format balance for display
  const formatBalance = (value: bigint | undefined): string => {
    if (!value) return '0'
    const formatted = Number(value) / 10 ** BEST_TOKEN_DECIMALS
    return formatted.toLocaleString(undefined, { maximumFractionDigits: 2 })
  }

  // Check if contract is configured
  const isContractConfigured = BEST_TOKEN_ADDRESS !== '0x0000000000000000000000000000000000000000'

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                <Droplets className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg">$BEST Faucet</h1>
                <p className="text-xs text-muted-foreground">
                  Claim your free tokens
                </p>
              </div>
            </div>

            <ConnectWallet />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8 max-w-xl">
        {/* Hero Card */}
        <Card className="mb-6">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <GoldMedalIcon size={80} />
            </div>
            <CardTitle className="text-2xl">Claim {FAUCET_AMOUNT} $BEST</CardTitle>
            <CardDescription>
              Get your free tokens to start using Gater Robot.
              Each address can claim once.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Contract not configured warning */}
            {!isContractConfigured && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  <strong>Note:</strong> Token contract not yet deployed.
                  Set <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">VITE_BEST_TOKEN_ADDRESS</code> environment variable.
                </p>
              </div>
            )}

            {/* Not connected state */}
            {!isConnected && (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Connect your wallet to claim tokens
                </p>
                <ConnectWallet />
              </div>
            )}

            {/* Connected states */}
            {isConnected && isContractConfigured && (
              <>
                {/* Already claimed state */}
                {hasClaimed && claimState !== 'success' && (
                  <div className="text-center py-6 space-y-4">
                    <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Already Claimed</h3>
                      <p className="text-muted-foreground">
                        You have already claimed your tokens.
                      </p>
                    </div>
                    <Badge variant="outline" className="text-lg px-4 py-2">
                      Balance: {formatBalance(balance)} $BEST
                    </Badge>
                  </div>
                )}

                {/* Idle state - ready to claim */}
                {!hasClaimed && claimState === 'idle' && (
                  <div className="text-center py-6 space-y-4">
                    <p className="text-muted-foreground">
                      You are eligible to claim <strong>{FAUCET_AMOUNT} $BEST</strong> tokens!
                    </p>
                    <Button
                      size="lg"
                      onClick={handleClaim}
                      className="w-full sm:w-auto"
                    >
                      <Droplets className="h-5 w-5 mr-2" />
                      Claim Tokens
                    </Button>
                  </div>
                )}

                {/* Claiming state */}
                {claimState === 'claiming' && (
                  <div className="text-center py-6 space-y-4">
                    <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
                    <div>
                      <h3 className="font-semibold text-lg">
                        {isConfirming ? 'Confirming Transaction...' : 'Claiming Tokens...'}
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        {isConfirming
                          ? 'Waiting for blockchain confirmation'
                          : 'Please confirm the transaction in your wallet'}
                      </p>
                    </div>
                    {txHash && (
                      <Badge variant="outline" className="font-mono text-xs">
                        TX: {txHash.slice(0, 10)}...{txHash.slice(-8)}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Success state */}
                {claimState === 'success' && (
                  <div className="text-center py-6 space-y-4">
                    <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-green-700 dark:text-green-400">
                        Tokens Claimed!
                      </h3>
                      <p className="text-muted-foreground">
                        You received {FAUCET_AMOUNT} $BEST tokens
                      </p>
                    </div>
                    <Badge variant="ens" className="text-lg px-4 py-2">
                      Balance: {formatBalance(balance)} $BEST
                    </Badge>

                    {/* Add to wallet button */}
                    {!addedToWallet ? (
                      <Button
                        variant="outline"
                        onClick={handleAddToWallet}
                        className="mt-4"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add $BEST to Wallet
                      </Button>
                    ) : (
                      <p className="text-sm text-green-600 flex items-center justify-center gap-1">
                        <CheckCircle className="h-4 w-4" />
                        Token added to wallet
                      </p>
                    )}
                  </div>
                )}

                {/* Error state */}
                {claimState === 'error' && (
                  <div className="text-center py-6 space-y-4">
                    <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30">
                      <XCircle className="h-8 w-8 text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-red-700 dark:text-red-400">
                        Claim Failed
                      </h3>
                      <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                        {errorMessage || 'Something went wrong. Please try again.'}
                      </p>
                    </div>
                    <Button onClick={handleReset} variant="outline">
                      Try Again
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* Connected but contract not configured */}
            {isConnected && !isContractConfigured && (
              <div className="text-center py-6">
                <p className="text-muted-foreground">
                  Faucet is not available on this network yet.
                </p>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex-col gap-4 text-center text-sm text-muted-foreground">
            <div className="flex items-center justify-center gap-2">
              <Badge variant="outline">Chain ID: {chainId}</Badge>
              {address && (
                <Badge variant="outline" className="font-mono">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </Badge>
              )}
            </div>
            {txHash && (
              <a
                href={`https://basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                View on Explorer
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </CardFooter>
        </Card>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">About $BEST Token</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong>$BEST</strong> (Best Token) is the utility token for Gater Robot,
              used for token-gating Telegram groups and premium features.
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Faucet amount: {FAUCET_AMOUNT} tokens per address</li>
              <li>Token standard: ERC-20</li>
              <li>Network: Base / Base Sepolia</li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
