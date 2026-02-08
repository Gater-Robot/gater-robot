import { ExternalLinkIcon, GithubIcon, GlobeIcon, CheckIcon, ClockIcon, TwitterIcon } from "lucide-react"

import { useEnsProfile } from "@/hooks/ens"
import { getExplorerAddressUrl } from "@gater/chain-registry"
import { getHostname, truncateAddress } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return ["http:", "https:"].includes(parsed.protocol)
  } catch {
    return false
  }
}

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
  address: `0x${string}`
  isVerified?: boolean
  isDefault?: boolean
  telegramMatched?: boolean
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

  if (profile.error) {
    if (compact) {
      return (
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            <AvatarFallback className="bg-yellow-100 text-xs text-yellow-700">
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
      <Card className="border-yellow-200 bg-yellow-50/50 py-0 dark:bg-yellow-950/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Avatar className="size-10">
              <AvatarFallback className="bg-yellow-100 text-yellow-700">
                !
              </AvatarFallback>
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

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <Avatar className="size-8">
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
            {isVerified && <CheckIcon className="size-4 text-emerald-600" />}
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            {truncateAddress(address)}
          </span>
        </div>
      </div>
    )
  }

  const addressUrl = getExplorerAddressUrl(1, address)

  return (
    <Card className="overflow-hidden py-0">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="size-16 border-2 border-background shadow-lg">
            <AvatarImage src={profile.avatar ?? undefined} alt={displayName} />
            <AvatarFallback className="text-lg">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-xl font-bold">{displayName}</h3>
              {profile.name && <Badge variant="ens">ENS</Badge>}
              {isDefault && <Badge variant="default">Default</Badge>}
            </div>

            <p className="mt-1 flex flex-wrap items-center gap-2 font-mono text-sm text-muted-foreground">
              {truncateAddress(address)}
              {addressUrl && (
                <a
                  href={addressUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
                  aria-label="View on explorer"
                >
                  <ExternalLinkIcon className="size-3" aria-hidden="true" />
                </a>
              )}
            </p>

            {profile.description && (
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                {profile.description}
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {isVerified ? (
                <Badge variant="success">
                  <CheckIcon className="size-3" />
                  Verified
                </Badge>
              ) : (
                <Badge variant="outline">
                  <ClockIcon className="size-3" />
                  Pending
                </Badge>
              )}
              {telegramMatched && (
                <Badge variant="success">
                  <TelegramIcon className="size-3" />
                  TG Matched
                </Badge>
              )}
            </div>
          </div>
        </div>

        {(profile.telegram || profile.twitter || profile.github || profile.url) && (
          <div className="mt-4 flex flex-wrap gap-4 border-t pt-4">
            {profile.telegram && (
              <a
                href={`https://t.me/${profile.telegram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                title={`@${profile.telegram} on Telegram`}
              >
                <TelegramIcon className="size-4" />
                <span className="hidden sm:inline">@{profile.telegram}</span>
              </a>
            )}
            {profile.twitter && (
              <a
                href={`https://twitter.com/${profile.twitter}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <TwitterIcon className="size-4" />
                <span className="hidden sm:inline">@{profile.twitter}</span>
              </a>
            )}
            {profile.github && (
              <a
                href={`https://github.com/${profile.github}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <GithubIcon className="size-4" />
                <span className="hidden sm:inline">{profile.github}</span>
              </a>
            )}
            {profile.url && isSafeUrl(profile.url) && (
              <a
                href={profile.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <GlobeIcon className="size-4" />
                <span className="hidden max-w-[150px] truncate sm:inline">
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
        <Skeleton className="size-8 rounded-full" />
        <div className="flex flex-col gap-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    )
  }

  return (
    <Card className="py-0">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Skeleton className="size-16 rounded-full" />
          <div className="flex-1">
            <Skeleton className="mb-2 h-6 w-32" />
            <Skeleton className="mb-3 h-4 w-28" />
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

