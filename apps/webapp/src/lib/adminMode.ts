export function getAdminStartParamRedirect(startParam?: string | null): string | null {
  if (!startParam) return null

  if (startParam === "admin") return "/orgs"

  if (startParam.startsWith("org_")) {
    const orgId = startParam.slice("org_".length).trim()
    if (!orgId) return null
    return `/orgs/${orgId}`
  }

  return null
}

export function getIsAdminMode(args: {
  startParam?: string | null
  pathname: string
  searchParams: URLSearchParams
  dev: boolean
}): boolean {
  const { startParam, pathname, searchParams, dev } = args

  const devOverride = dev && searchParams.get("admin") === "1"
  if (devOverride) return true

  if (pathname.startsWith("/admin") || pathname.startsWith("/orgs")) return true

  if (startParam === "admin") return true
  if (startParam?.startsWith("org_")) return true

  return false
}

