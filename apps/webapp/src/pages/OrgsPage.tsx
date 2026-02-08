import * as React from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Building2Icon, PlusIcon, SearchIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { useTelegram } from "@/contexts/TelegramContext"
import { useOrgs } from "@/hooks/useOrgs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { TelegramAuthDebugPanel } from "@/components/debug/TelegramAuthDebugPanel"
import { cn } from "@/lib/utils"

const createOrgSchema = z.object({
  name: z.string().min(2, "Organization name is too short").max(64),
})

type CreateOrgValues = z.infer<typeof createOrgSchema>

export function OrgsPage() {
  const navigate = useNavigate()
  const telegram = useTelegram()
  const initDataRaw = telegram.getInitData()
  const { orgs, isLoading, createOrg } = useOrgs()

  const [searchQuery, setSearchQuery] = React.useState("")
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)

  const form = useForm<CreateOrgValues>({
    resolver: zodResolver(createOrgSchema),
    defaultValues: { name: "" },
  })

  const filteredOrgs = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return orgs
    return orgs.filter((org) => org.name.toLowerCase().includes(query))
  }, [orgs, searchQuery])

  const handleSubmit = async (values: CreateOrgValues) => {
    try {
      const orgId = await createOrg({ name: values.name })
      toast.success("Organization created")
      setIsDialogOpen(false)
      form.reset()
      if (typeof orgId === "string") navigate(`/orgs/${orgId}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create org")
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    )
  }

  if (!telegram.user || !initDataRaw) {
    return (
      <Card className="py-0">
        <CardContent className="pt-6">
          <div className="py-8 text-center">
            <Building2Icon className="mx-auto mb-4 size-12 text-muted-foreground" />
            <h2 className="mb-2 text-xl font-semibold">Authentication Required</h2>
            <p className="text-muted-foreground">
              {telegram.isInTelegram
                ? "Unable to validate your Telegram session. Please reopen the Mini App."
                : "Please open this app in Telegram to view organizations."}
            </p>
            <TelegramAuthDebugPanel />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Organizations</h1>
          <p className="text-muted-foreground">
            Manage channels and token gates across your Telegram groups.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button type="button">
              <PlusIcon className="size-4" />
              New
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New organization</DialogTitle>
              <DialogDescription>
                Create an organization to group channels and gates together.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Gater Labs" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    Create
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search organizations..."
          className="pl-9"
        />
      </div>

      {filteredOrgs.length > 0 ? (
        <div className="grid gap-3">
          {filteredOrgs.map((org) => (
            <Card
              key={org._id}
              className={cn("cursor-pointer py-0 transition-shadow hover:shadow-md")}
              onClick={() => navigate(`/orgs/${org._id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  navigate(`/orgs/${org._id}`)
                }
              }}
            >
              <CardHeader>
                <CardTitle className="text-lg">{org.name}</CardTitle>
                <CardDescription>
                  Created {new Date(org.createdAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="py-0">
          <CardContent className="pt-6">
            <div className="py-12 text-center text-muted-foreground">
              <Building2Icon className="mx-auto mb-4 size-12 opacity-50" />
              {searchQuery.trim() ? (
                <>
                  <p className="text-lg font-medium">No organizations found</p>
                  <p className="text-sm">
                    No organizations match &quot;{searchQuery.trim()}&quot;
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg font-medium">No organizations yet</p>
                  <p className="mb-4 text-sm">
                    Create your first organization to start managing token-gated channels.
                  </p>
                  <Button type="button" onClick={() => setIsDialogOpen(true)}>
                    <PlusIcon className="size-4" />
                    Create Organization
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
