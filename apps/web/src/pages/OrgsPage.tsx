/**
 * OrgsPage - Organization listing and management
 *
 * Lists all organizations the user owns or is a member of.
 * Provides navigation to individual org management pages.
 */

import { useState } from 'react'
import { useTelegram } from '@/contexts/TelegramContext'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Skeleton,
} from '@/components/ui'
import {
  Building2,
  Plus,
  Search,
  ChevronRight,
  Users,
  Shield,
} from 'lucide-react'

// Placeholder org type
interface Org {
  id: string
  name: string
  channelCount: number
  memberCount: number
  gateCount: number
  createdAt: number
}

export function OrgsPage() {
  const { user, isLoading, isInTelegram } = useTelegram()
  const [searchQuery, setSearchQuery] = useState('')

  // Placeholder orgs - will be replaced with Convex query
  const orgs: Org[] = []

  const filteredOrgs = orgs.filter((org) =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
              <p className="text-muted-foreground">
                {isInTelegram
                  ? 'Unable to load user data from Telegram.'
                  : 'Please open this app in Telegram to view organizations.'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Organizations</h1>
          <p className="text-muted-foreground">
            Manage your Telegram groups and channels
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Organization
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search organizations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Organizations Grid */}
      {filteredOrgs.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrgs.map((org) => (
            <Card key={org.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{org.name}</CardTitle>
                    <CardDescription>
                      Created {new Date(org.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {org.channelCount} channels
                  </Badge>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    {org.gateCount} gates
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {org.memberCount} members
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              {searchQuery ? (
                <>
                  <p className="text-lg font-medium">No organizations found</p>
                  <p className="text-sm">
                    No organizations match "{searchQuery}"
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg font-medium">No organizations yet</p>
                  <p className="text-sm mb-4">
                    Create your first organization to start managing token-gated channels
                  </p>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Organization
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-2">What are Organizations?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Organizations group your Telegram channels together for easier management.
            Each organization can have multiple channels with different token gates.
          </p>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <h4 className="font-medium">1. Create Organization</h4>
              <p className="text-muted-foreground">
                Set up an organization for your community
              </p>
            </div>
            <div>
              <h4 className="font-medium">2. Add Channels</h4>
              <p className="text-muted-foreground">
                Link your Telegram groups and channels
              </p>
            </div>
            <div>
              <h4 className="font-medium">3. Configure Gates</h4>
              <p className="text-muted-foreground">
                Set token requirements for access
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
