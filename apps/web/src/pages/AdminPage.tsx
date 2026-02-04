/**
 * AdminPage - Organization and channel administration
 *
 * Admin dashboard for managing:
 * - Organizations
 * - Gated channels
 * - Token gate rules
 * - Member management
 */

import { useTelegram } from '@/contexts/TelegramContext'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Skeleton,
} from '@/components/ui'
import {
  Shield,
  Building2,
  Users,
  Settings,
  Plus,
  ChevronRight,
} from 'lucide-react'

export function AdminPage() {
  const { user, isLoading, isInTelegram } = useTelegram()

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
              <p className="text-muted-foreground">
                {isInTelegram
                  ? 'Unable to load user data from Telegram.'
                  : 'Please open this app in Telegram to access admin features.'}
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
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your organizations and gated channels
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Organization
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Organizations</p>
                <p className="text-2xl font-bold">0</p>
              </div>
              <Building2 className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Channels</p>
                <p className="text-2xl font-bold">0</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Gates</p>
                <p className="text-2xl font-bold">0</p>
              </div>
              <Shield className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Members</p>
                <p className="text-2xl font-bold">0</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Organizations List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Your Organizations
              </CardTitle>
              <CardDescription>
                Telegram groups and channels you manage
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Placeholder for org list */}
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p>No organizations yet</p>
            <p className="text-sm mb-4">
              Create an organization to start managing token-gated channels
            </p>
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Create Organization
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest events across your organizations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No recent activity</p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="ghost" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add a new channel
            </span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Configure a new gate
            </span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Manage bot settings
            </span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
