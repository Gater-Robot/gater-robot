# UAT Manual Testing Checklist - Sprint 1 Release

## Pre-Testing Setup

Before running tests, ensure all environment variables are configured:

- [ ] Copy `.env.example` to `.env` and fill in values
- [ ] Run `pnpm install` to install dependencies
- [ ] Convex deployment is active and accessible

---

## 1. Project Infrastructure

### 1.1 Monorepo Structure
- [ ] `pnpm install` completes without errors
- [ ] `pnpm build` runs turbo build successfully
- [ ] `packages/contracts` exists with contract code
- [ ] `convex/` directory contains schema and functions

### 1.2 Environment Configuration
- [ ] `.env.example` contains all required variables
- [ ] No secrets are committed to the repository
- [ ] `node --version` shows v22 or higher

---

## 2. Telegram Bot (Requires Manual Testing)

### 2.1 Bot Token Setup
- [ ] BOT_TOKEN is valid (test with BotFather)
- [ ] Bot responds to `/start` command
- [ ] Bot responds to `/admin` command

### 2.2 /start Command
- [ ] Sends greeting message
- [ ] Includes "Open App" inline button
- [ ] Button URL points to correct mini-app

### 2.3 /admin Command
- [ ] Rejects users NOT in ADMIN_IDS
- [ ] Accepts users in ADMIN_IDS list
- [ ] Shows admin-specific message/UI

### 2.4 Error Handling
- [ ] Bot continues running after message send failures
- [ ] Errors are logged but don't crash the bot

---

## 3. Convex Backend

### 3.1 Schema Verification
- [ ] `npx convex dev` starts without schema errors
- [ ] Dashboard shows all 7 tables:
  - [ ] users
  - [ ] addresses
  - [ ] orgs
  - [ ] channels
  - [ ] gates
  - [ ] memberships
  - [ ] events

### 3.2 Indexes
- [ ] `users.by_telegram_id` index exists
- [ ] `addresses.by_address` index exists
- [ ] `gates.by_channel_active` index exists

### 3.3 Security - initData Validation
- [ ] Invalid initData is rejected
- [ ] Expired initData is rejected (based on max age)
- [ ] Valid initData is accepted

### 3.4 Security - requireAuth
- [ ] Mutations reject unauthenticated requests
- [ ] Mutations accept authenticated requests
- [ ] No mutations exposed without auth check

---

## 4. Smart Contracts (`packages/contracts`)

### 4.1 Build & Test
- [ ] `pnpm --filter @gater/contracts build` compiles contracts
- [ ] `pnpm --filter @gater/contracts test` passes Hardhat tests
- [ ] `pnpm --filter @gater/contracts test:forge` passes Foundry tests

### 4.2 BestToken Contract
- [ ] Contract compiles without errors
- [ ] Token name is "Best Token"
- [ ] Token symbol is "BEST"
- [ ] Initial supply minted to deployer

### 4.3 Deployment Addresses
- [ ] `deployments/addresses.json` contains Base address
- [ ] `deployments/addresses.json` contains Arc address
- [ ] Addresses are valid (42 characters, 0x prefix)

### 4.4 ABI Export
- [ ] `src/abi.ts` exports contract ABI
- [ ] `src/addresses.ts` exports deployment addresses
- [ ] `src/index.ts` re-exports both

---

## 5. Web Components

### 5.1 ENS Components
- [ ] ENS resolution returns name for known addresses
- [ ] Avatar URL is fetched correctly
- [ ] Graceful handling of addresses without ENS

### 5.2 Security - isSafeUrl
- [ ] Blocks `javascript:` URLs
- [ ] Blocks `data:` URLs
- [ ] Allows `https://` URLs
- [ ] Allows `ipfs://` URLs
- [ ] Returns null for unsafe URLs

### 5.3 Chain Handling
- [ ] Known chain IDs display correct chain name
- [ ] Unknown chain IDs fallback gracefully
- [ ] No crashes on unsupported chains

---

## 6. Agent Tooling

### 6.1 ntfy_send
- [ ] `.agents/bin/ntfy_send --help` shows usage
- [ ] Test notification: `.agents/bin/ntfy_send --title "Test" "Hello"`
- [ ] Notification received on ntfy channel
- [ ] Click URL works when provided

### 6.2 gh_project_status
- [ ] `.agents/bin/gh_project_status --list-statuses` shows all statuses
- [ ] Can update issue status: `.agents/bin/gh_project_status --issue 3 --status "In Progress"`
- [ ] Status change reflected in GitHub Project board

---

## 7. GitHub Integration

### 7.1 Labels
- [ ] Priority labels exist (P0, P1, P2, P3)
- [ ] Area labels exist (bot, mini-app, convex, contracts, lifi)
- [ ] Type labels exist (feature, bug, chore, docs, milestone)

### 7.2 Milestones
- [ ] Sprint 1-7 milestones exist
- [ ] Issues are assigned to correct milestones

### 7.3 Project Board
- [ ] Project board exists at https://github.com/orgs/Gater-Robot/projects/1
- [ ] Issues appear on the board
- [ ] Status workflow columns are visible

---

## 8. Documentation

### 8.1 Required Files Exist
- [ ] CLAUDE.md - Agent instructions
- [ ] README.md - Project overview (if exists)
- [ ] CHANGELOG.md - Release notes
- [ ] docs/WORKLOG.md - Progress tracking
- [ ] docs/FINAL_PLAN.md - Hackathon roadmap
- [ ] .env.example - Environment template

### 8.2 Documentation Accuracy
- [ ] WORKLOG shows Sprint 1 complete
- [ ] FINAL_PLAN matches actual implementation
- [ ] .env.example has all required keys

---

## Test Results Summary

| Section | Pass | Fail | Skip | Notes |
|---------|------|------|------|-------|
| 1. Infrastructure | | | | |
| 2. Telegram Bot | | | | |
| 3. Convex Backend | | | | |
| 4. Smart Contracts | | | | |
| 5. Web Components | | | | |
| 6. Agent Tooling | | | | |
| 7. GitHub Integration | | | | |
| 8. Documentation | | | | |

**Tested By:** _______________
**Date:** _______________
**Overall Result:** [ ] PASS / [ ] FAIL

---

## Notes

_Add any issues, blockers, or observations here:_
