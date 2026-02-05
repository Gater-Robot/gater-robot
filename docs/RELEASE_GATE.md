# Release Gate — apps/webapp Mini-App

This doc defines the minimum “release gate” criteria to cut over from `apps/web` to `apps/webapp`.

## Must-pass

- **Telegram auth**: initData validation works in Telegram; mock initData only in development when enabled.
- **SIWE**: nonce + signature verification runs via secure Convex node actions; no unauthenticated SIWE mutations are callable.
- **Eligibility**: server-side balance checks work for supported chains; errors are actionable.
- **Admin safety**:
  - If `ADMIN_IDS` is set: admin actions are restricted and startup logs warn.
  - Recommended: `DISABLE_INSECURE_MUTATIONS=true` in prod.
- **LI.FI**: get-eligible flow renders and swap success UX shows tx hash.

## Nice-to-have

- `/health` diagnostics available in dev and Telegram admin mode.
- `/get-eligible` code-split so LI.FI widget doesn’t slow initial load.

