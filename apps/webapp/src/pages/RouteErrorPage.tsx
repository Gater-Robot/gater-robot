import * as React from "react"
import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { useTelegram } from "@/contexts/TelegramContext"

type ErrorCopy = {
  title: string
  message: string
  devDetails?: string
}

function getDevDetails(error: unknown): string | undefined {
  if (!import.meta.env.DEV) return undefined

  if (error instanceof Error) {
    return error.stack || error.message
  }

  if (typeof error === "string") return error

  try {
    return JSON.stringify(error, null, 2)
  } catch {
    return String(error)
  }
}

function getErrorCopy(error: unknown): ErrorCopy {
  if (isRouteErrorResponse(error)) {
    const statusLine = `${error.status} ${error.statusText || ""}`.trim()
    const message =
      typeof error.data === "string"
        ? error.data
        : "The app hit an unexpected error while loading this screen."

    return {
      title: statusLine ? `Request failed (${statusLine})` : "Request failed",
      message,
      devDetails: getDevDetails(error.data),
    }
  }

  if (error instanceof Error) {
    return {
      title: "Something went wrong",
      message: error.message || "The app threw an unexpected error.",
      devDetails: getDevDetails(error),
    }
  }

  return {
    title: "Something went wrong",
    message: "The app threw an unexpected error.",
    devDetails: getDevDetails(error),
  }
}

export function RouteErrorPage() {
  const error = useRouteError()
  const telegram = useTelegram()
  const copy = React.useMemo(() => getErrorCopy(error), [error])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{copy.title}</h1>

      <div className="rounded-xl border bg-card p-4 text-card-foreground">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{copy.message}</p>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/user">Go to home</Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                window.location.reload()
              }}
            >
              Reload
            </Button>
            {telegram.isInTelegram && (
              <Button
                variant="outline"
                onClick={() => {
                  telegram.close()
                }}
              >
                Close mini app
              </Button>
            )}
          </div>

          {copy.devDetails && (
            <pre className="max-h-80 overflow-auto rounded-lg bg-muted p-3 text-xs">
              {copy.devDetails}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}

