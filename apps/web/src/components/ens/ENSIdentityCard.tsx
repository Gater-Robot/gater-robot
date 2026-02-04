/**
 * ENSIdentityCard - Display ENS Identity
 *
 * A beautiful, demo-ready component that displays:
 * - ENS avatar
 * - ENS name with badge
 * - Address (truncated)
 * - Social links from text records
 * - Verification status
 *
 * This is the main identity display component for hackathon demos.
 */

import { useEnsProfile } from '@/hooks/ens'
import { truncateAddress, getHostname } from '@/lib/utils'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Card,
  CardContent,
  Skeleton,
} from '@/components/ui'
import { Twitter, Github, Globe, ExternalLink, Check, Clock } from 'lucide-react'

/**
 * Validate that a URL uses a safe protocol (http: or https:)
 * Prevents XSS via javascript: URIs in ENS text records
 */
function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    return false
  }
}

// Telegram icon component
function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z" />
    </svg>
  )
}

export interface ENSIdentityCardProps {
  /** The Ethereum address to display */
  address: `0x${string}`
  /** Whether this address is verified via SIWE */
  isVerified?: boolean
  /** Whether this is the user's default/primary address */
  isDefault?: boolean
  /** Whether ENS telegram matches their Telegram (for auto-verify) */
  telegramMatched?: boolean
  /** Use compact display (for tables) */
  compact?: boolean
}

export function ENSIdentityCard({
  address,
  isVerified = false,
  isDefault = false,
  telegramMatched = false,
  compact = false,
}: ENSIdentityCardProps) {
  const profile = useEnsProfile(address)

  if (profile.isLoading) {
    return <ENSIdentityCardSkeleton compact={compact} />
  }

  // Show error state if ENS lookup failed
  if (profile.error) {
    if (compact) {
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-yellow-100 text-yellow-700">
              !
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">
              {truncateAddress(address)}
            </span>
            <span className="text-xs text-yellow-600">ENS lookup failed</span>
          </div>
        </div>
      )
    }

    return (
      <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-yellow-100 text-yellow-700">!</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-mono text-sm">{truncateAddress(address)}</p>
              <p className="text-xs text-yellow-600">ENS lookup failed</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const displayName = profile.name ?? truncateAddress(address)

  // Compact variant for table rows
  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={profile.avatar ?? undefined} alt={displayName} />
          <AvatarFallback className="text-xs">
            {displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-medium">{displayName}</span>
            {profile.name && (
              <Badge variant="ens" size="sm">
                ENS
              </Badge>
            )}
            {isVerified && (
              <Check className="h-4 w-4 text-green-600" />
            )}
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {truncateAddress(address)}
          </span>
        </div>
      </div>
    )
  }

  // Full card variant
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Avatar className="h-16 w-16 border-2 border-background shadow-lg">
            <AvatarImage src={profile.avatar ?? undefined} alt={displayName} />
            <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Identity info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-semibold truncate">{displayName}</h3>
              {profile.name && (
                <Badge variant="ens">ENS</Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground font-mono mt-1">
              {truncateAddress(address)}
              <a
                href={`https://etherscan.io/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex ml-1 text-muted-foreground hover:text-foreground"
                aria-label="View on Etherscan"
              >
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            </p>

            {/* Description from ENS */}
            {profile.description && (
              <p className="text-sm mt-2 text-muted-foreground line-clamp-2">
                {profile.description}
              </p>
            )}

            {/* Status badges */}
            <div className="flex gap-2 mt-3 flex-wrap">
              {isVerified ? (
                <Badge variant="success">
                  <Check className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              ) : (
                <Badge variant="outline">
                  <Clock className="h-3 w-3 mr-1" />
                  Pending
                </Badge>
              )}
              {isDefault && (
                <Badge variant="default">Default Identity</Badge>
              )}
              {telegramMatched && (
                <Badge variant="success">
                  <TelegramIcon className="h-3 w-3 mr-1" />
                  TG Matched
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Social links from ENS text records */}
        {(profile.telegram || profile.twitter || profile.github || profile.url) && (
          <div className="flex gap-4 pt-4 mt-4 border-t">
            {profile.telegram && (
              <a
                href={`https://t.me/${profile.telegram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
                title={`@${profile.telegram} on Telegram`}
              >
                <TelegramIcon className="h-4 w-4" />
                <span className="hidden sm:inline">@{profile.telegram}</span>
              </a>
            )}
            {profile.twitter && (
              <a
                href={`https://twitter.com/${profile.twitter}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
              >
                <Twitter className="h-4 w-4" />
                <span className="hidden sm:inline">@{profile.twitter}</span>
              </a>
            )}
            {profile.github && (
              <a
                href={`https://github.com/${profile.github}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
              >
                <Github className="h-4 w-4" />
                <span className="hidden sm:inline">{profile.github}</span>
              </a>
            )}
            {profile.url && isSafeUrl(profile.url) && (
              <a
                href={profile.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
              >
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline truncate max-w-[150px]">
                  {getHostname(profile.url)}
                </span>
              </a>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ENSIdentityCardSkeleton({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="flex flex-col gap-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-28 mb-3" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export { ENSIdentityCardSkeleton }
