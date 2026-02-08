import {
  ChevronRightIcon,
  ExternalLinkIcon,
  GithubIcon,
  GlobeIcon,
  TwitterIcon,
} from "lucide-react";

import { useEnsProfile } from "@/hooks/ens";
import { getExplorerAddressUrl } from "@gater/chain-registry";
import { cn, getHostname, truncateAddress } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
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
  );
}

export interface IdentityCardProps {
  className?: string;
  telegramUser: {
    firstName: string;
    lastName?: string;
    username?: string;
    id: number;
    isPremium?: boolean;
  };
  defaultAddress?: `0x${string}` | null;
  isLoadingAddresses?: boolean;
  hasVerifiedAddress?: boolean;
}

export function IdentityCard({
  className,
  telegramUser,
  defaultAddress,
  isLoadingAddresses = false,
  hasVerifiedAddress = false,
}: IdentityCardProps) {
  const profile = useEnsProfile(defaultAddress ?? undefined);

  // Loading state
  if (defaultAddress && (isLoadingAddresses || profile.isLoading)) {
    return <IdentityCardSkeleton className={className} />;
  }

  // No wallet connected - show Telegram identity
  if (!defaultAddress) {
    return (
      <TelegramIdentityCard
        className={className}
        telegramUser={telegramUser}
        hasVerifiedAddress={hasVerifiedAddress}
      />
    );
  }

  // Wallet connected with ENS name
  if (profile.name) {
    return (
      <ENSProfileCard
        className={className}
        address={defaultAddress}
        profile={profile}
        hasVerifiedAddress={hasVerifiedAddress}
      />
    );
  }

  // Wallet connected but no ENS name - show CTA
  return <ENSCTACard className={className} />;
}

interface TelegramIdentityCardProps {
  className?: string;
  telegramUser: {
    firstName: string;
    lastName?: string;
    username?: string;
    id: number;
    isPremium?: boolean;
  };
  hasVerifiedAddress: boolean;
}

function TelegramIdentityCard({
  className,
  telegramUser,
  hasVerifiedAddress,
}: TelegramIdentityCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-[var(--color-surface-alt)] p-4",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary text-sm font-bold text-primary-foreground",
            hasVerifiedAddress &&
              "ring-2 ring-primary/20 shadow-[0_0_12px_var(--color-glow)]",
          )}
        >
          {telegramUser.firstName.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">
            {telegramUser.firstName}
            {telegramUser.lastName ? ` ${telegramUser.lastName}` : ""}
          </p>
          {telegramUser.username && (
            <p className="truncate text-sm text-muted-foreground">
              @{telegramUser.username}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Badge variant="flux" size="sm">
            {telegramUser.id}
          </Badge>
          {telegramUser.isPremium && (
            <Badge variant="ens" size="sm">
              PRO
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

interface ENSProfileCardProps {
  className?: string;
  address: `0x${string}`;
  profile: {
    name: string | null;
    avatar: string | null;
    description: string | null;
    telegram: string | null;
    twitter: string | null;
    github: string | null;
    url: string | null;
  };
  hasVerifiedAddress: boolean;
}

function ENSProfileCard({
  className,
  address,
  profile,
  hasVerifiedAddress,
}: ENSProfileCardProps) {
  const displayName = profile.name ?? truncateAddress(address);
  const addressUrl = getExplorerAddressUrl(1, address);
  const hasSocialLinks =
    profile.telegram || profile.twitter || profile.github || profile.url;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-[var(--color-surface-alt)] p-4",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar
          className={cn(
            "size-12 border-2 border-background",
            hasVerifiedAddress &&
              "ring-2 ring-primary/20 shadow-[0_0_12px_var(--color-glow)]",
          )}
        >
          <AvatarImage src={profile.avatar ?? undefined} alt={displayName} />
          <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-sm font-bold text-primary-foreground">
            {displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold">{displayName}</p>
            <Badge variant="ens" size="sm">
              ENS
            </Badge>
          </div>

          <p className="mt-0.5 flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
            {truncateAddress(address)}
            {addressUrl && (
              <a
                href={addressUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="View on explorer"
              >
                <ExternalLinkIcon className="size-3" aria-hidden="true" />
              </a>
            )}
          </p>

          {profile.description && (
            <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
              {profile.description}
            </p>
          )}
        </div>
      </div>

      {hasSocialLinks && (
        <div className="mt-3 flex flex-wrap gap-3 border-t border-border/50 pt-3">
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
              <span className="hidden max-w-[120px] truncate sm:inline">
                {getHostname(profile.url)}
              </span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function ENSCTACard({ className }: { className?: string }) {
  return (
    <a
      href="https://app.ens.domains"
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-[0_0_16px_var(--color-glow)]",
        className,
      )}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <img src="/ens-logo.svg" alt="ENS" className="size-6" />
      </div>
      <div className="min-w-0 flex-1">
        {/* <p className="text-md font-semibold">Get more with ENS</p> */}

        <p className="text-sm font-medium fade-up stagger-1">
          Gater Communities are more powerful with ENS names.
        </p>
        <p className="text-xs text-muted-foreground fade-up stagger-2">
          Set your default wallet below to use your favourite ENS on your
          profile.
        </p>
        <p className="text-sm text-primary fade-up stagger-3">
          Or register a new one now at app.ens.domains
        </p>
      </div>
      <ChevronRightIcon className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
    </a>
  );
}

function IdentityCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "fade-up stagger-1 animate-pulse",
        "rounded-xl border border-border bg-[var(--color-surface-alt)] p-4",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="size-12 rounded-full" />
        <div className="flex flex-1 flex-col gap-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
}

export {
  ENSCTACard,
  ENSProfileCard,
  IdentityCardSkeleton,
  TelegramIdentityCard,
};
