import * as React from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { getChainLabel } from "@gater/chain-registry"
import { PlusIcon, ShieldIcon, SparklesIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { parseUnits } from "viem"
import { toast } from "sonner"

import { useChannels } from "@/hooks/useChannels"
import { useGatesForChannel } from "@/hooks/useGates"
import { useOrgs } from "@/hooks/useOrgs"
import { ChainSelect } from "@/components/web3/ChainSelect"
import { TokenAddressField } from "@/components/web3/TokenAddressField"
import { TransactionStatus, type TransactionState } from "@/components/web3/TransactionStatus"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function AdminPage() {
  const { orgs } = useOrgs()
  const [orgId, setOrgId] = React.useState<string | null>(null)
  const { channels } = useChannels(orgId)
  const [channelId, setChannelId] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!orgId && orgs.length > 0) setOrgId(orgs[0]._id)
  }, [orgId, orgs])

  React.useEffect(() => {
    if (!channelId && channels.length > 0) setChannelId(channels[0]._id)
  }, [channelId, channels])

  const { createGate } = useGatesForChannel(channelId)

  const [chainId, setChainId] = React.useState<number | null>(8453)
  const [tokenAddress, setTokenAddress] = React.useState("")
  const [resolvedToken, setResolvedToken] = React.useState<{
    address: string
    name?: string
    symbol?: string
    decimals: number
  } | null>(null)

  const [txState, setTxState] = React.useState<TransactionState>("pending")

  const gateSchema = z.object({
    threshold: z
      .string()
      .trim()
      .min(1, "Enter a threshold")
      .refine((val) => /^\d+(?:\.\d+)?$/.test(val), "Enter a number")
      .refine((val) => Number(val) > 0, "Must be greater than 0"),
  })

  const gateForm = useForm<z.infer<typeof gateSchema>>({
    resolver: zodResolver(gateSchema),
    defaultValues: { threshold: "" },
  })

  const onCreateGate = async (values: z.infer<typeof gateSchema>) => {
    if (!orgId) {
      toast.error("Create/select an org first")
      return
    }
    if (!channelId) {
      toast.error("Create/select a channel first")
      return
    }
    if (chainId == null) {
      toast.error("Select a chain")
      return
    }
    if (!resolvedToken) {
      toast.error("Enter a valid token address")
      return
    }

    try {
      let thresholdBigInt: bigint
      try {
        thresholdBigInt = parseUnits(values.threshold, resolvedToken.decimals)
      } catch {
        throw new Error(
          `Invalid threshold for ${resolvedToken.symbol || "token"} (max ${resolvedToken.decimals} decimals)`,
        )
      }

      await createGate({
        orgId,
        channelId,
        chainId,
        tokenAddress: resolvedToken.address,
        tokenSymbol: resolvedToken.symbol,
        tokenName: resolvedToken.name,
        tokenDecimals: resolvedToken.decimals,
        threshold: thresholdBigInt.toString(),
        thresholdFormatted: values.threshold,
      })
      toast.success("Gate created")
      gateForm.reset()
      setTokenAddress("")
      setResolvedToken(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create gate")
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="text-sm text-muted-foreground">
          Configure org + channel gates (and keep a playground to stay motivated).
        </p>
      </div>

      <Tabs defaultValue="manage" className="space-y-4">
        <TabsList>
          <TabsTrigger value="manage">
            <ShieldIcon className="size-4" />
            Manage
          </TabsTrigger>
          <TabsTrigger value="playground">
            <SparklesIcon className="size-4" />
            Playground
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manage" className="space-y-4">
          <Card className="py-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldIcon className="size-5" />
                Register Gate
              </CardTitle>
              <CardDescription>
                Pick an org + channel, then select chain, token, and threshold.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Organization</div>
                  <Select
                    value={orgId ?? undefined}
                    onValueChange={(v) => {
                      setOrgId(v)
                      setChannelId(null)
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select an org" />
                    </SelectTrigger>
                    <SelectContent>
                      {orgs.map((org) => (
                        <SelectItem key={org._id} value={org._id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {orgs.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Create an org first on the Organizations page.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Channel</div>
                  <Select
                    value={channelId ?? undefined}
                    onValueChange={setChannelId}
                    disabled={!orgId || channels.length === 0}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a channel" />
                    </SelectTrigger>
                    <SelectContent>
                      {channels.map((channel) => (
                        <SelectItem key={channel._id} value={channel._id}>
                          {channel.title || channel.telegramChatId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!orgId ? (
                    <p className="text-xs text-muted-foreground">
                      Select an org to load channels.
                    </p>
                  ) : channels.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No channels yet for this org. Add one in the org view.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <ChainSelect value={chainId} onChange={setChainId} />
                <TokenAddressField
                  chainId={chainId}
                  value={tokenAddress}
                  onChange={(v) => {
                    setTokenAddress(v)
                    setResolvedToken(null)
                  }}
                  onTokenResolved={(token) =>
                    setResolvedToken({
                      address: token.address,
                      name: token.name,
                      symbol: token.symbol,
                      decimals: token.decimals,
                    })
                  }
                />
              </div>

              <Form {...gateForm}>
                <form onSubmit={gateForm.handleSubmit(onCreateGate)} className="space-y-4">
                  <FormField
                    control={gateForm.control}
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

                  {resolvedToken && chainId != null && (
                    <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">
                          {resolvedToken.symbol || "TOKEN"}
                        </Badge>
                        <span className="text-muted-foreground">
                          on {chainId ? `${chainId} (${getChainLabel(chainId)})` : "—"}
                        </span>
                        <span className="text-muted-foreground">
                          • decimals {resolvedToken.decimals}
                        </span>
                      </div>
                      <div className="mt-1 truncate font-mono text-xs text-muted-foreground">
                        {resolvedToken.address}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={
                        gateForm.formState.isSubmitting ||
                        chainId == null ||
                        !resolvedToken
                      }
                    >
                      <PlusIcon className="size-4" />
                      Create gate
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="playground" className="space-y-4">
          <Card className="py-0">
            <CardHeader>
              <CardTitle className="text-lg">Web3 Admin UX Playground</CardTitle>
              <CardDescription>
                A quick sandbox for chain picker, token lookup, and transaction status UI.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <ChainSelect value={chainId} onChange={setChainId} />
                <TokenAddressField
                  chainId={chainId}
                  value={tokenAddress}
                  onChange={setTokenAddress}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="py-0">
            <CardHeader>
              <CardTitle className="text-lg">Transaction Status (Demo)</CardTitle>
              <CardDescription>
                Visual primitive used anywhere we submit onchain transactions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={txState === "pending" ? "default" : "secondary"}
                  onClick={() => setTxState("pending")}
                >
                  Pending
                </Button>
                <Button
                  type="button"
                  variant={txState === "loading" ? "default" : "secondary"}
                  onClick={() => setTxState("loading")}
                >
                  Loading
                </Button>
                <Button
                  type="button"
                  variant={txState === "success" ? "default" : "secondary"}
                  onClick={() => setTxState("success")}
                >
                  Success
                </Button>
                <Button
                  type="button"
                  variant={txState === "error" ? "destructive" : "secondary"}
                  onClick={() => setTxState("error")}
                >
                  Error
                </Button>
              </div>

              <TransactionStatus
                state={txState}
                chainId={chainId ?? undefined}
                hash="0x0000000000000000000000000000000000000000000000000000000000000000"
                description={
                  txState === "error"
                    ? undefined
                    : "This component shows progress, provides an explorer link, and supports copy-to-clipboard."
                }
                error={
                  txState === "error"
                    ? "User rejected the signature, or the transaction reverted."
                    : undefined
                }
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
