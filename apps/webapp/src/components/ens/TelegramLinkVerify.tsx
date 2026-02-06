import * as React from "react"
import {
  AlertCircleIcon,
  CheckCircleIcon,
  Link2Icon,
  Loader2Icon,
  SparklesIcon,
} from "lucide-react"
import { useMutation } from "convex/react"

import { api } from "@/convex/api"
import { useTelegram } from "@/contexts/TelegramContext"
import { useEnsProfile, useEnsTelegramMatch } from "@/hooks/ens"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export interface TelegramLinkVerifyProps {
  address: `0x${string}`
  telegramUsername: string | null
  onVerified?: () => void
  isVerifying?: boolean
}

export function TelegramLinkVerify({
  address,
  telegramUsername,
  onVerified,
  isVerifying = false,
}: TelegramLinkVerifyProps) {
  const { initDataRaw } = useTelegram()
  const autoVerify = useMutation(api.ens.autoVerifyTelegramLink)
  const profile = useEnsProfile(address)
  const match = useEnsTelegramMatch(profile.name, telegramUsername)
  const [verifyTriggered, setVerifyTriggered] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleAutoVerify = async () => {
    if (!initDataRaw || !profile.name || !match.ensTelegram) return
    setVerifyTriggered(true)
    setError(null)
    try {
      await autoVerify({
        initDataRaw,
        address,
        ensName: profile.name,
        ensTelegram: match.ensTelegram,
      })
      onVerified?.()
    } catch (err) {
      console.error('[gater] ENS auto-verify failed:', err)
      setError(err instanceof Error ? err.message : "Verification failed")
      setVerifyTriggered(false)
    }
  }

  if (match.isLoading || profile.isLoading) {
    return (
      <Card className="py-0">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!profile.name) return null

  if (!match.ensTelegram) {
    return (
      <Card className="border-dashed border-muted-foreground/50 py-0">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2Icon className="size-5 text-muted-foreground" />
            Link Telegram via ENS
          </CardTitle>
          <CardDescription>
            Set your{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              org.telegram
            </code>{" "}
            text record in your ENS profile to{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              {telegramUsername || "your_username"}
            </code>{" "}
            for automatic identity verification.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <a
            href={`https://app.ens.domains/${profile.name}?tab=records`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button type="button" variant="outline" size="sm" className="w-full">
              <Link2Icon className="size-4" />
              Set Record in ENS App
            </Button>
          </a>
        </CardContent>
      </Card>
    )
  }

  if (match.isMatch) {
    return (
      <Card className="border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 py-0 dark:from-green-950/30 dark:to-emerald-950/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base text-green-700 dark:text-green-400">
              <CheckCircleIcon className="size-5" />
              ENS Telegram Match Found!
            </CardTitle>
            <Badge variant="success" className="motion-safe:animate-pulse">
              <SparklesIcon className="size-3" />
              Auto-Verify Available
            </Badge>
          </div>
          <CardDescription className="text-green-600/80 dark:text-green-400/80">
            Your ENS name{" "}
            <strong className="text-green-700 dark:text-green-300">
              {profile.name}
            </strong>{" "}
            has{" "}
            <code className="rounded bg-green-100 px-1.5 py-0.5 font-mono text-xs dark:bg-green-900/50">
              org.telegram
            </code>{" "}
            set to{" "}
            <strong className="text-green-700 dark:text-green-300">
              @{match.ensTelegram}
            </strong>{" "}
            which matches your Telegram account!
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Button
            type="button"
            onClick={handleAutoVerify}
            disabled={isVerifying || verifyTriggered}
            variant="success"
            className="w-full"
          >
            {isVerifying || verifyTriggered ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Verifying…
              </>
            ) : (
              <>
                <CheckCircleIcon className="size-4" />
                Auto-Verify via ENS
              </>
            )}
          </Button>
          {error && (
            <p className="mt-2 text-center text-xs text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          <p className="mt-2 text-center text-xs text-green-600/70 dark:text-green-400/60">
            No signature required — your ENS proves ownership!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-yellow-300 bg-gradient-to-br from-yellow-50 to-amber-50 py-0 dark:from-yellow-950/30 dark:to-amber-950/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-yellow-700 dark:text-yellow-400">
          <AlertCircleIcon className="size-5" />
          ENS Telegram Mismatch
        </CardTitle>
        <CardDescription className="text-yellow-600/80 dark:text-yellow-400/80">
          Your ENS{" "}
          <strong className="text-yellow-700 dark:text-yellow-300">
            {profile.name}
          </strong>{" "}
          has{" "}
          <code className="rounded bg-yellow-100 px-1.5 py-0.5 font-mono text-xs dark:bg-yellow-900/50">
            org.telegram
          </code>{" "}
          set to{" "}
          <strong className="text-yellow-700 dark:text-yellow-300">
            @{match.ensTelegram}
          </strong>
          , but you are logged in as{" "}
          <strong className="text-yellow-700 dark:text-yellow-300">
            @{match.telegramUsername}
          </strong>
          .
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-yellow-600/70 dark:text-yellow-400/60">
          Update your ENS record or use SIWE verification instead.
        </p>
      </CardContent>
    </Card>
  )
}

