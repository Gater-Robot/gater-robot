# Sprint 1 Audit: Foundation (Issues #3–#11, #52)

## Scope
- Epic: **#52 Sprint 1: Foundation**
- Issues: **#3–#11**
- Source of truth: GitHub issues + current repo implementation

## Commands used (traceability)
- `gh issue list --repo Gater-Robot/gater-robot --limit 200 --state all --milestone "Sprint 1: Foundation"`
- `gh issue view <issue> --repo Gater-Robot/gater-robot --json title,state,body,labels,comments`
- `rg -n "start|admin" apps/bot`
- `rg -n "Router|Routes|WebApp|diagnostic|Diagnostics" apps/web`
- `rg -n "cloudflared|tunnel" README.md`
- `rg -n "initData|HMAC|telegram" convex`

## Issue-by-issue validation

### #3 Initialize pnpm + turborepo monorepo (CLOSED)
**Acceptance criteria check**
- pnpm workspace configured ✅ (`pnpm-workspace.yaml` exists)
- turborepo configured ✅ (`turbo.json` exists)
- `apps/bot`, `apps/web`, `convex/` directories created ✅
- `.env.example` with required variables ✅

**Drift / notes**
- No drift found for acceptance criteria.

**Action items**
- None.

---

### #4 Implement /start handler with Mini App button (OPEN)
**Acceptance criteria check**
- `/start` sends greeting message ✅
- Inline button opens Mini App URL ✅
- Bot runs in polling mode locally ✅

**Drift / notes**
- Issue remains open even though implementation is present; likely needs closure or validation run.

**Action items**
- Close issue after manual verification of bot token + WEBAPP_URL.

---

### #5 Implement /admin slash command (OPEN)
**Acceptance criteria check**
- `/admin` command toggles admin state for user ✅
- State persisted (can be in-memory for PoC) ✅ (in-memory map)
- Response confirms mode change ✅

**Drift / notes**
- Issue remains open even though implementation is present; likely needs closure or validation run.

**Action items**
- Close issue after manual verification of ADMIN_IDS behavior.

---

### #6 Create Vite + React Router Mini App shell (OPEN)
**Acceptance criteria check**
- Vite + React + TypeScript setup ⚠️ (Vite/React/TS exist, but routing scaffold is different)
- React Router routes: `/`, `/user`, `/admin`, `/orgs`, `/get-eligible` ❌ (only `/` redirect + `/ens-eth-id`)
- Telegram WebApp SDK integrated ❌ (no WebApp SDK usage found)
- Basic diagnostics drawer component ❌ (no diagnostics component found)

**Drift / notes**
- Current mini app is an ENS Identity demo, not the requested routing shell.

**Action items**
- Implement required routes + skeleton pages.
- Add Telegram WebApp SDK integration and a diagnostics drawer.
- Decide how to keep ENS demo without blocking Sprint 1 acceptance (move to separate route or feature flag).

---

### #7 Set up Cloudflare quick tunnel for dev (OPEN)
**Acceptance criteria check**
- `cloudflared tunnel` runs locally ✅ (documented)
- Mini App URL works in Telegram ✅ (documented guidance)
- Documented in README ✅

**Drift / notes**
- Issue remains open even though documentation is present.

**Action items**
- Close issue after confirming README accuracy.

---

### #8 Define Convex schema with orgs layer (OPEN)
**Acceptance criteria check**
- Tables: `users`, `addresses`, `orgs`, `channels`, `gates`, `memberships`, `events` ✅
- Schema deployed to Convex ⚠️ (deployment cannot be validated from repo)
- Basic queries/mutations scaffolded ✅ (orgs/channels/gates/memberships/users actions exist)

**Drift / notes**
- **Schema mismatch risk:** both `convex/schema.js` and `convex/schema.ts` exist with differing field names and indexes.
- Inconsistent field naming between schema and mutations (e.g., `telegramFirstName` vs `firstName`).

**Action items**
- Decide on single schema file (TS vs JS), delete/align the other.
- Align mutation field names with chosen schema.
- Confirm Convex deployment status and document.

---

### #9 Implement initData HMAC validation (OPEN)
**Acceptance criteria check**
- Convex action validates initData HMAC ✅
- Rejects invalid/expired data ✅
- Returns user info on success ✅
- Unit tests for happy/unhappy paths ✅

**Drift / notes**
- Issue remains open even though implementation + tests exist.

**Action items**
- Close issue after confirming environment variables used in deployment.

---

### #10 Create validateAndUpsertUser mutation (OPEN)
**Acceptance criteria check**
- Mutation upserts user from validated initData ⚠️ (upsert exists, but named differently)
- Stores telegramUserId, username, names ⚠️ (field naming mismatch between schema variants)
- Returns user record ❌ (current mutation returns only the ID)

**Drift / notes**
- Missing `validateAndUpsertUser` mutation name; current `upsertUserFromTelegram` returns ID only.
- Schema field mismatch may break expected fields if TS schema is active.

**Action items**
- Implement `validateAndUpsertUser` (or rename) to return full user record.
- Align field names with schema.
- Add tests to ensure the user record fields are set.

---

### #11 Evaluate ETH Identity Kit for ENS/SIWE (CLOSED)
**Acceptance criteria check**
- Install `ethereum-identity-kit` in apps/web ✅
- Test ENS resolution components ✅ (ENS demo components exist)
- Test SIWE integration ❌ (no SIWE implementation present)
- Document decision: adopt or use RainbowKit/wagmi ❌ (no decision doc found)

**Drift / notes**
- Issue closed but acceptance criteria not fully met; no documented decision or SIWE evaluation.

**Action items**
- Document decision in docs (adopt ETH Identity Kit vs RainbowKit/wagmi).
- If adopting, add SIWE spike or explicit deferral note.

---

### #52 Sprint 1: Foundation (OPEN)
**Acceptance check**
- Bot /start works ✅ (implementation present)
- Mini App opens in Telegram ⚠️ (bot uses WEBAPP_URL but Mini App shell incomplete)
- User persisted in Convex ❌ (no validateAndUpsertUser returning user record, unclear UI integration)

**Drift / notes**
- Epic acceptance depends on #6 and #10 completion.

**Action items**
- Complete #6 and #10; then re-validate epic.

---

## Summary of gaps
- **Mini App shell**: missing required routes + Telegram WebApp SDK + diagnostics drawer.
- **User persistence**: missing validateAndUpsertUser mutation that returns a user record and aligns fields.
- **Schema consistency**: conflicting schema definitions likely to cause runtime errors.
- **ETH Identity Kit evaluation**: SIWE test + documented decision missing.

## Recommended next steps (ordered)
1. Fix schema conflicts; standardize field names across schema and mutations.
2. Implement Mini App router scaffold with required routes + diagnostics drawer + WebApp SDK.
3. Add validateAndUpsertUser mutation that returns a user record; add tests.
4. Document ETH Identity Kit decision (and SIWE spike status).
5. Close issues #4, #5, #7, #9 after quick manual verification.
6. Reassess #52 epic after #6 and #10 are complete.
