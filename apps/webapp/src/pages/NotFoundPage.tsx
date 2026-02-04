export function NotFoundPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Not Found</h1>

      <div className="rounded-xl border bg-card p-4 text-card-foreground">
        <div className="text-sm text-muted-foreground">This route does not exist.</div>
      </div>
    </div>
  )
}
