# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-04

### Sprint 1: Foundation Release

This release establishes the foundation for the Gater Robot - a Telegram token-gated private groups bot and mini-app for the EthGlobal HackMoney 2026 hackathon.

### Added

#### Project Infrastructure
- **Monorepo Setup**: pnpm + turborepo workspace with `packages/` structure
- **Package Manager**: pnpm@10.0.0 with Node.js 22+ requirement
- **Build System**: turbo.json configuration for parallel builds

#### Bot Features
- `/start` command with greeting and "Open App" button
- `/admin` slash command with ADMIN_IDS authorization
- `sendMessageSafe()` error handling for all bot messages

#### Convex Backend
- **Full Schema** with 7 tables:
  - `users` - Telegram user identity with ENS linking
  - `addresses` - Multi-wallet support with SIWE verification
  - `orgs` - Organization (group owner) management
  - `channels` - Telegram group/channel tracking
  - `gates` - Token gate rules configuration
  - `memberships` - User membership status tracking
  - `events` - Audit log for all actions
- **initData HMAC validation** - Security-critical Telegram auth
- **requireAuth()** - Enforced on all mutations (prevents auth bypass)
- ENS data caching fields for display

#### Smart Contracts (`packages/contracts`)
- **$BEST Token** - ERC-20 demo token for gating
- Hardhat + Foundry dual test setup
- Hardhat Ignition deployment modules
- Deployed to Base + Arc mainnets
- Address sync scripts for frontend integration
- ABI export for wagmi/viem integration

#### Web Components
- ENS identity components with avatar resolution
- **isSafeUrl()** XSS prevention for ENS URL records
- Chain ID fallback handling for unknown networks

#### Agent Tooling (`.agents/bin/`)
- **ntfy_send** - Notification tool for agent updates
  - Session context prefix (branch/session ID)
  - Model icons (--claude, --codex, --gemini)
  - Clickable links and action buttons
- **gh_project_status** - GitHub Project board status updates
  - Workflow: Backlog → Todo → In Progress → In Review → Approved → Done

#### GitHub Automation
- Auto-add to project board workflow (issues + PRs)
- Backfill script for existing items
- Project status change timestamp tracking
- 22 labels (priorities, areas, types, statuses)
- 7 milestones (Sprint 1-7)
- 57 issues created with proper categorization

### Security
- `requireAuth()` on all Convex mutations
- `sendMessageSafe()` for bot error isolation
- `ADMIN_IDS` environment variable for admin authorization
- `isSafeUrl()` XSS prevention for ENS record URLs
- initData HMAC validation (Telegram auth security)

### Documentation
- FINAL_PLAN.md - 5-day hackathon roadmap with day-by-day tasks
- WORKLOG.md - Session tracking and progress notes
- CONTEXT.md - Quick context for new sessions
- CLAUDE.md - Agent instructions and tooling reference
- ERD diagram (Mermaid) matching Convex schema
- GitHub project structure documentation

### Developer Experience
- .env.example with all required environment variables
- Cloudflare quick tunnel documentation for local dev
- Conventional commits enforced (feat, fix, chore, docs)
- PR workflow targeting `develop` branch

---

## [Unreleased]

### Planned for Sprint 2: User Identity
- Wallet connection in mini-app (wagmi + MetaMask)
- SIWE (Sign-In With Ethereum) verification flow
- Multi-address management UI
- ENS resolution and display
- $BEST token faucet UI

### Planned for Sprint 3: Admin + Gates
- Admin org onboarding flow
- Channel selection and verification
- Gate configuration form
- Token metadata fetching

### Planned for Sprint 4: Eligibility + LiFi
- Eligibility check across wallets
- LiFi Widget integration
- Cross-chain swap/bridge flow
- Balance recovery notifications

### Planned for Sprint 5: Demo Polish
- Bot warning DM flow
- Kick enforcement
- Demo chat setup
- 4-minute video recording

---

[1.0.0]: https://github.com/Gater-Robot/gater-robot/releases/tag/v1.0.0
[Unreleased]: https://github.com/Gater-Robot/gater-robot/compare/v1.0.0...HEAD
