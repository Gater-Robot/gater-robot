# Work Log

## Current Status

**Sprint:** 3 - Admin + Gates
**Branch:** `claude/sprint-3-planning-SYnT7`

---

## Previous Sprints Summary

### Sprint 1 (Complete)
Issues #3-11: Monorepo setup, bot commands (/start, /admin), Convex schema + auth, web app shell, ENS components, $BEST token contracts.

### Sprint 2 (Complete - Needs GH Cleanup)
Issues #12-19: ConnectWallet UI, SIWE auth flow, ENS resolution + identity card, FaucetPage, multi-address support.

**Note:** PR #134 still open. Issues #12,15,16,17 have code complete but GH issues not closed.

---

## Sprint 3 Progress

| # | Issue | Status | Phase | Depends On |
|---|-------|--------|-------|------------|
| 20 | Show admin UI when /admin toggled | Pending | 1 | - |
| 21 | Create org list view with add button | Pending | 1 | #20 |
| 22 | Org creation flow | Pending | 2 | #21, #23 |
| 23 | Verify bot admin rights in channel | Pending | 2 | - |
| 24 | Gate configuration form UI | Pending | 3 | #22, #25 |
| 25 | Fetch token metadata from chain | Pending | 3 | - |
| 26 | Save gate config to Convex | Pending | 3 | #24, #25 |

---

## Sprint 3 Execution Plan

### Phase 1: Admin Detection & Org Infrastructure
**Parallel tasks:**
- **1A.** Admin state detection in TelegramContext
- **1B.** Create `convex/orgs.ts` module

### Phase 2: Org Creation & Bot Verification
**Sequential:** #21 → #22 | **Parallel:** #23 (bot work)
- **2A.** Org list UI (OrgsPage.tsx)
- **2B.** Org creation flow (OrgCreatePage.tsx)
- **2C.** Bot permission verification

### Phase 3: Gate Configuration (Core Feature)
**Parallel:** #25, #26 backend | **Sequential:** #24 UI depends on #25
- **3A.** Token metadata fetching (viem)
- **3B.** Gate Convex module (`convex/gates.ts`)
- **3C.** Gate configuration UI (GateConfigPage.tsx)

---

## Files to Create

| File | Purpose |
|------|---------|
| `convex/orgs.ts` | Org CRUD operations |
| `convex/channels.ts` | Channel management + bot verification |
| `convex/gates.ts` | Gate config + token metadata |
| `apps/web/src/pages/OrgCreatePage.tsx` | Org creation form |
| `apps/web/src/pages/GateConfigPage.tsx` | Gate configuration form |

## Files to Modify

| File | Changes |
|------|---------|
| `TelegramContext.tsx` | Add `adminMode` state |
| `App.tsx` | Add routes for org/gate pages |
| `OrgsPage.tsx` | Wire up Convex queries |
| `AdminPage.tsx` | Wire up org list |
| `apps/bot/src/index.js` | Enhance /admin command |

---

## Session Notes

### 2026-02-04 - Sprint 3 Planning

- Verified Sprint 2 code exists (SIWE, ENS, ConnectWallet, FaucetPage)
- Identified Sprint 2 GH housekeeping needed (PR #134 open, issues not closed)
- Created Sprint 3 dependency graph with 3 execution phases
- Mapped all 7 Sprint 3 issues with dependencies
