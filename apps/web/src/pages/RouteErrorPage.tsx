import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'

function getDevDetails(error: unknown): string | undefined {
  if (!import.meta.env.DEV) return undefined

  if (error instanceof Error) return error.stack || error.message
  if (typeof error === 'string') return error

  try {
    return JSON.stringify(error, null, 2)
  } catch {
    return String(error)
  }
}

export function RouteErrorPage() {
  const error = useRouteError()

  const title = isRouteErrorResponse(error)
    ? `Request failed (${error.status} ${error.statusText || ''})`.trim()
    : 'Something went wrong'

  const message = isRouteErrorResponse(error)
    ? typeof error.data === 'string'
      ? error.data
      : 'The app hit an unexpected error while loading this screen.'
    : error instanceof Error
      ? error.message || 'The app threw an unexpected error.'
      : 'The app threw an unexpected error.'

  const devDetails = isRouteErrorResponse(error)
    ? getDevDetails(error.data)
    : getDevDetails(error)

  return (
    <div className="mx-auto max-w-2xl p-4">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{message}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                window.location.assign('/user')
              }}
            >
              Go to home
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                window.location.reload()
              }}
            >
              Reload
            </Button>
          </div>
          {devDetails && (
            <pre className="max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs">
              {devDetails}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

