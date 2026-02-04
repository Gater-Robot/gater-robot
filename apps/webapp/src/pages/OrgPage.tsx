import * as React from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { getChainLabel } from "@gater/chain-registry"
import {
  CheckCircle2Icon,
  CircleSlash2Icon,
  PlusIcon,
  Settings2Icon,
  ShieldIcon,
  VerifiedIcon,
  XCircleIcon,
} from "lucide-react"
import { useForm } from "react-hook-form"
import { useParams } from "react-router-dom"
import { parseUnits } from "viem"
import { toast } from "sonner"
import { useQuery } from "convex/react"

import { api } from "@/convex/api"
import { useTelegram } from "@/contexts/TelegramContext"
import { useChannels } from "@/hooks/useChannels"
import { useGatesForChannel } from "@/hooks/useGates"
import { ChainSelect } from "@/components/web3/ChainSelect"
import { TokenAddressField } from "@/components/web3/TokenAddressField"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

type OrgDoc = {
  _id: string
  name: string
  ownerTelegramUserId: string
  createdAt: number
}

const createChannelSchema = z.object({
  telegramChatId: z.string().min(3).max(64),
  type: z.enum(["public", "private"]),
  title: z.string().max(96).optional(),
})

type CreateChannelValues = z.infer<typeof createChannelSchema>

const createGateSchema = z.object({
  threshold: z.string().min(1, "Enter a threshold"),
})

type CreateGateValues = z.infer<typeof createGateSchema>

export function OrgPage() {
  const params = useParams()
  const orgId = params.orgId ?? null

  const telegram = useTelegram()
  const initDataRaw = telegram.getInitData()

  const org = useQuery(
    api.orgs.getOrgById,
    initDataRaw && orgId ? { initDataRaw, orgId: orgId as any } : "skip",
  ) as OrgDoc | null | undefined

  const {
    channels,
    isLoading: channelsLoading,
    createChannel,
    setChannelBotAdminStatus,
    verifyChannelBotAdmin,
  } = useChannels(orgId)

  const [selectedChannelId, setSelectedChannelId] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (selectedChannelId) return
    if (channels.length > 0) setSelectedChannelId(channels[0]._id)
  }, [channels, selectedChannelId])

  const selectedChannel = React.useMemo(() => {
    if (!selectedChannelId) return null
    return channels.find((c) => c._id === selectedChannelId) ?? null
  }, [channels, selectedChannelId])

  const {
    gates,
    isLoading: gatesLoading,
    createGate,
    setGateActive,
  } = useGatesForChannel(selectedChannelId)

  const [isCreateChannelOpen, setIsCreateChannelOpen] = React.useState(false)
  const createChannelForm = useForm<CreateChannelValues>({
    resolver: zodResolver(createChannelSchema),
    defaultValues: {
      telegramChatId: "",
      type: "private",
      title: "",
    },
  })

  const onCreateChannel = async (values: CreateChannelValues) => {
    if (!orgId) return
    try {
      const channelId = await createChannel({
        orgId,
        telegramChatId: values.telegramChatId,
        type: values.type,
        title: values.title?.trim() ? values.title.trim() : undefined,
      })
      toast.success("Channel created")
      setIsCreateChannelOpen(false)
      createChannelForm.reset()
      if (typeof channelId === "string") setSelectedChannelId(channelId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create channel")
    }
  }

  const [isCreateGateOpen, setIsCreateGateOpen] = React.useState(false)
  const createGateForm = useForm<CreateGateValues>({
    resolver: zodResolver(createGateSchema),
    defaultValues: { threshold: "" },
  })

  const [gateChainId, setGateChainId] = React.useState<number | null>(8453)
  const [gateTokenAddress, setGateTokenAddress] = React.useState("")
  const [resolvedToken, setResolvedToken] = React.useState<{
    address: string
    name?: string
    symbol?: string
    decimals: number
  } | null>(null)

  const [isVerifyingBotAdmin, setIsVerifyingBotAdmin] = React.useState(false)

  const onCreateGate = async (values: CreateGateValues) => {
    if (!orgId || !selectedChannelId) return
    if (gateChainId == null) {
      toast.error("Select a chain")
      return
    }
    if (!resolvedToken) {
      toast.error("Enter a valid token address")
      return
    }

    try {
      const thresholdBigInt = parseUnits(values.threshold, resolvedToken.decimals)
      await createGate({
        orgId,
        channelId: selectedChannelId,
        chainId: gateChainId,
        tokenAddress: resolvedToken.address,
        tokenSymbol: resolvedToken.symbol,
        tokenName: resolvedToken.name,
        tokenDecimals: resolvedToken.decimals,
        threshold: thresholdBigInt.toString(),
        thresholdFormatted: values.threshold,
      })
      toast.success("Gate created")
      setIsCreateGateOpen(false)
      createGateForm.reset()
      setGateTokenAddress("")
      setResolvedToken(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create gate")
    }
  }

  if (telegram.isLoading || org === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!telegram.user) {
    return (
      <Card className="py-0">
        <CardContent className="pt-6">
          <div className="py-8 text-center">
            <ShieldIcon className="mx-auto mb-4 size-12 text-muted-foreground" />
            <h2 className="mb-2 text-xl font-semibold">Authentication Required</h2>
            <p className="text-muted-foreground">
              {telegram.isInTelegram
                ? "Unable to load user data from Telegram."
                : "Please open this app in Telegram to manage organizations."}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!org) {
    return (
      <Card className="py-0">
        <CardContent className="pt-6">
          <div className="py-8 text-center">
            <CircleSlash2Icon className="mx-auto mb-4 size-12 text-muted-foreground" />
            <h2 className="mb-2 text-xl font-semibold">Organization not found</h2>
            <p className="text-muted-foreground">
              You may not have access to this organization.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{org.name}</h1>
          <p className="text-muted-foreground">
            Channels and token gates for this organization.
          </p>
        </div>

        <Dialog open={isCreateChannelOpen} onOpenChange={setIsCreateChannelOpen}>
          <DialogTrigger asChild>
            <Button type="button">
              <PlusIcon className="size-4" />
              Add channel
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a channel</DialogTitle>
              <DialogDescription>
                Register a Telegram chat ID to manage token gates for it.
              </DialogDescription>
            </DialogHeader>

            <Form {...createChannelForm}>
              <form
                onSubmit={createChannelForm.handleSubmit(onCreateChannel)}
                className="space-y-4"
              >
                <FormField
                  control={createChannelForm.control}
                  name="telegramChatId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telegram chat ID</FormLabel>
                      <FormControl>
                        <Input placeholder="-1001234567890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createChannelForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="My gated group" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createChannelForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="private">Private</SelectItem>
                            <SelectItem value="public">Public</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateChannelOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createChannelForm.formState.isSubmitting}>
                    Create
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="py-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <VerifiedIcon className="size-5" />
            Setup checklist
          </CardTitle>
          <CardDescription>
            A quick path to a working gated channel: add a channel, verify the bot, then create a gate.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-medium">
                {channels.length > 0 ? (
                  <CheckCircle2Icon className="size-4 text-emerald-600" />
                ) : (
                  <XCircleIcon className="size-4 text-muted-foreground" />
                )}
                Add a channel
              </div>
              <div className="text-xs text-muted-foreground">
                Register the Telegram chat ID you want to manage.
              </div>
            </div>
            {channels.length === 0 && (
              <Button type="button" size="sm" onClick={() => setIsCreateChannelOpen(true)}>
                <PlusIcon className="size-4" />
                Add
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-medium">
                {selectedChannel?.botIsAdmin ? (
                  <CheckCircle2Icon className="size-4 text-emerald-600" />
                ) : (
                  <XCircleIcon className="size-4 text-muted-foreground" />
                )}
                Verify bot permissions
              </div>
              <div className="text-xs text-muted-foreground">
                Add <span className="font-mono">@GaterRobot</span> as an admin and enable “restrict members”, then click Check Done.
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant={selectedChannel?.botIsAdmin ? "secondary" : "success"}
              disabled={!selectedChannel || isVerifyingBotAdmin}
              onClick={async () => {
                if (!selectedChannel) return
                try {
                  setIsVerifyingBotAdmin(true)
                  const result = await verifyChannelBotAdmin({ channelId: selectedChannel._id })
                  if (result?.botIsAdmin) toast.success("Bot permissions verified")
                  else toast.error(result?.reason || "Bot is not an admin (or missing permission)")
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Failed to verify bot permissions")
                } finally {
                  setIsVerifyingBotAdmin(false)
                }
              }}
            >
              Check Done
            </Button>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-medium">
                {gates.length > 0 ? (
                  <CheckCircle2Icon className="size-4 text-emerald-600" />
                ) : (
                  <XCircleIcon className="size-4 text-muted-foreground" />
                )}
                Create a gate
              </div>
              <div className="text-xs text-muted-foreground">
                Choose chain + token + threshold, then save to Convex.
              </div>
            </div>
            {gates.length === 0 && (
              <Button
                type="button"
                size="sm"
                disabled={!selectedChannel}
                onClick={() => setIsCreateGateOpen(true)}
              >
                <ShieldIcon className="size-4" />
                Create
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <Card className="py-0">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Settings2Icon className="size-5" />
                  Channels
                </CardTitle>
                <CardDescription>Pick a channel to manage gates.</CardDescription>
              </div>
              <Badge variant="outline">{channels.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {channelsLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : channels.length === 0 ? (
              <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                No channels yet. Add one to start configuring gates.
              </div>
            ) : (
              <div className="grid gap-2">
                {channels.map((channel) => {
                  const active = channel._id === selectedChannelId
                  return (
                    <button
                      key={channel._id}
                      type="button"
                      onClick={() => setSelectedChannelId(channel._id)}
                      className={
                        "rounded-lg border p-3 text-left transition-colors " +
                        (active ? "border-primary bg-primary/5" : "hover:bg-muted/40")
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-medium">
                            {channel.title || "Untitled channel"}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span className="font-mono">{channel.telegramChatId}</span>
                            <Badge variant="secondary" size="sm">
                              {channel.type}
                            </Badge>
                          </div>
                        </div>

                        {channel.botIsAdmin ? (
                          <VerifiedIcon className="size-4 text-emerald-600" />
                        ) : (
                          <XCircleIcon className="size-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="py-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldIcon className="size-5" />
              Gates
            </CardTitle>
            <CardDescription>
              {selectedChannel
                ? `Manage token gates for “${selectedChannel.title || selectedChannel.telegramChatId}”.`
                : "Select a channel to view gates."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedChannel && (
              <div className="space-y-3 rounded-lg border bg-muted/30 p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 font-medium">
                      Bot permissions
                      {selectedChannel.botIsAdmin ? (
                        <Badge variant="success" size="sm">
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="secondary" size="sm">
                          Not verified
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Add the bot as an admin in this Telegram chat and ensure it can restrict members, then verify.
                    </div>
                    {selectedChannel.verifiedAt && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Last verified: {new Date(selectedChannel.verifiedAt).toLocaleString()}
                      </div>
                    )}
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant={selectedChannel.botIsAdmin ? "outline" : "success"}
                    disabled={isVerifyingBotAdmin}
                    onClick={async () => {
                      try {
                        setIsVerifyingBotAdmin(true)
                        const result = await verifyChannelBotAdmin({
                          channelId: selectedChannel._id,
                        })

                        if (result?.botIsAdmin) {
                          toast.success("Bot permissions verified")
                        } else {
                          toast.error(result?.reason || "Bot is not an admin (or missing permission)")
                        }
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Failed to verify bot permissions")
                      } finally {
                        setIsVerifyingBotAdmin(false)
                      }
                    }}
                  >
                    {selectedChannel.botIsAdmin ? (
                      <>
                        <VerifiedIcon className="size-4" />
                        Re-check
                      </>
                    ) : (
                      <>
                        <ShieldIcon className="size-4" />
                        Verify
                      </>
                    )}
                  </Button>
                </div>

                {import.meta.env.DEV && (
                  <div className="flex items-center justify-between gap-3 rounded-md border bg-background/70 px-3 py-2 text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CircleSlash2Icon className="size-4" />
                      Dev override
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        try {
                          await setChannelBotAdminStatus({
                            channelId: selectedChannel._id,
                            botIsAdmin: !selectedChannel.botIsAdmin,
                          })
                          toast.success("Updated bot admin status (dev)")
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : "Failed to update status")
                        }
                      }}
                    >
                      {selectedChannel.botIsAdmin ? (
                        <>
                          <CheckCircle2Icon className="size-4" />
                          Mark not admin
                        </>
                      ) : (
                        <>
                          <XCircleIcon className="size-4" />
                          Mark admin
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}

            <Dialog open={isCreateGateOpen} onOpenChange={setIsCreateGateOpen}>
              <DialogTrigger asChild>
                <Button type="button" className="w-full" disabled={!selectedChannel}>
                  <PlusIcon className="size-4" />
                  Create gate
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create gate</DialogTitle>
                  <DialogDescription>
                    Choose a chain + token and set the threshold required to be eligible.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 md:grid-cols-2">
                  <ChainSelect value={gateChainId} onChange={setGateChainId} />
                  <TokenAddressField
                    chainId={gateChainId}
                    value={gateTokenAddress}
                    onChange={(v) => {
                      setGateTokenAddress(v)
                      setResolvedToken(null)
                    }}
                    onTokenResolved={(token) => {
                      setResolvedToken({
                        address: token.address,
                        name: token.name,
                        symbol: token.symbol,
                        decimals: token.decimals,
                      })
                    }}
                  />
                </div>

                <Form {...createGateForm}>
                  <form
                    onSubmit={createGateForm.handleSubmit(onCreateGate)}
                    className="space-y-4"
                  >
                    <FormField
                      control={createGateForm.control}
                      name="threshold"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Threshold</FormLabel>
                          <FormControl>
                            <Input placeholder="100" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsCreateGateOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createGateForm.formState.isSubmitting}>
                        Create
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            {gatesLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : gates.length === 0 ? (
              <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                No gates yet for this channel.
              </div>
            ) : (
              <div className="space-y-2">
                {gates.map((gate) => (
                  <div
                    key={gate._id}
                    className="flex items-start justify-between gap-3 rounded-lg border p-3"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">
                          {gate.tokenSymbol || "TOKEN"} on {getChainLabel(gate.chainId)}
                        </span>
                        <Badge variant={gate.active ? "success" : "secondary"}>
                          {gate.active ? "active" : "inactive"}
                        </Badge>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Threshold:{" "}
                        <span className="font-mono">
                          {gate.thresholdFormatted || gate.threshold}
                        </span>
                      </div>
                      <div className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                        {gate.tokenAddress}
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant={gate.active ? "outline" : "success"}
                      onClick={async () => {
                        try {
                          await setGateActive({ gateId: gate._id, active: !gate.active })
                          toast.success("Updated gate")
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : "Failed to update gate")
                        }
                      }}
                    >
                      {gate.active ? "Disable" : "Enable"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
