# GATER ROBOT - FINAL HACKATHON PLAN

## Quick Context

**Product:** Token-gated Telegram communities with identity + cross-chain onboarding
**Event:** ETHGlobal HackMoney 2026 (5-day async hackathon)
**Stack:** Convex + Vite + React Router + grammY/telegraf + wagmi/viem

## Key Decisions Made

| Decision | Choice |
|----------|--------|
| Frontend | **Vite + React Router** (lighter for Mini App) |
| Backend | **Convex** (DB + functions + scheduler) |
| Data Model | **Orgs in data layer**, but per-group UI for PoC |
| Indexer | **Manual button**, cron as stretch |
| ETH Identity Kit | **Evaluate Day 1** |
| LiFi | **YES - Partner bounty** |
| Wallet | **MetaMask only** |
| Demo Token | **$BEST on Base + Arc mainnets**, faucet (2026 tokens, once per wallet, user pays gas) |
| Demo delivery | **Recorded 4-min video** |

## Prize Targets

| Prize | Priority | Requirement |
|-------|----------|-------------|
| **ENS** | Primary | Real ENS code, no hard-coded values, functional demo |
| **LI.FI** | Primary | Cross-chain action, 2+ EVM chains, working frontend |
| **Arc/Circle** | Stretch | USDC membership deposit (if time) |

---

## LiFi "Get Eligible" Flow (Partner Bounty)

This is a key differentiator and bounty requirement:

```
1. User balance checked → below threshold
2. Bot sends DM: "Your balance is too low! You need X tokens."
   → Button: "Fix with LiFi"
3. Button deep-links to Mini App: /get-eligible?token=X&amount=Y
4. Mini App page shows LiFi Widget pre-configured to swap/bridge
5. User completes swap → clicks "Re-check Eligibility"
6. User is now eligible → can join/remain in group
```

---

## Day-by-Day Plan

### Day 1: Foundation + ETH Identity Kit Evaluation

**Morning: Monorepo Setup**
- [ ] Initialize pnpm + turborepo workspace
- [ ] Create `apps/bot` (Node.js, grammY or telegraf)
- [ ] Create `apps/web` (Vite + React Router)
- [ ] Create `convex/` directory with initial schema
- [ ] Set up environment variables (.env.example)

**Afternoon: ETH Identity Kit Spike**
- [ ] Install `ethereum-identity-kit` in apps/web
- [ ] Test ENS resolution components
- [ ] Test SIWE integration
- [ ] **Decision point:** Does it simplify our flow enough to adopt?
  - If YES → Use for ENS display + SIWE auth
  - If NO → Fall back to RainbowKit/wagmi plan

**Evening: Bot Basics**
- [ ] Implement /start with greeting + "Open App" button
- [ ] Implement `/admin` slash command to toggle admin mode
- [ ] Run bot in polling mode locally

### Day 2: Mini App + Convex Integration

**Morning: Mini App Shell**
- [ ] Set up Cloudflare quick tunnel for dev
- [ ] Create routes: `/`, `/user`, `/admin`, `/orgs`, `/get-eligible`
- [ ] Add Telegram WebApp SDK integration
- [ ] Create global diagnostics drawer component

**Afternoon: Convex Backend + Data Model**
- [ ] Define schema with orgs layer:
  - `users` (telegramUserId, primaryEnsName, defaultAddressId)
  - `addresses` (userId, address, status, verifiedAt, ensName)
  - `orgs` (ownerTelegramUserId, name)
  - `channels` (orgId, telegramChatId, botIsAdmin)
  - `gates` (orgId, channelId, chainId, tokenAddress, threshold)
  - `memberships` (channelId, userId, status, lastCheckedAt)
  - `events` (audit log)
- [ ] Implement initData HMAC validation (security-critical!)
- [ ] Create `validateAndUpsertUser` mutation
- [ ] Connect Mini App → Convex

**Evening: Verify Foundation**
- [ ] Bot /start opens Mini App via tunnel
- [ ] Mini App validates initData on load
- [ ] User appears in Convex dashboard

### Day 3: Wallet + ENS + Admin Org Setup

**Morning: Wallet Connection + Faucet**
- [ ] Set up wagmi + viem with MetaMask connector
- [ ] Deploy $BEST token on Base + Arc mainnets
- [ ] Create faucet UI: claim 2026 tokens (once per wallet, user pays gas)
- [ ] "Add to wallet" button (EIP-747) with gold medal SVG icon

**Afternoon: ENS + Multi-Address Table**
- [ ] ENS name + avatar resolution for verified addresses
- [ ] 3-address table UI: verified ✅ / pending ⏳
- [ ] "Default address" radio button → updates displayed ENS
- [ ] "Verify ownership" button → SIWE → mark verified

**Evening: Admin Org Onboarding**
- [ ] `/admin` toggle shows admin UI in mini app
- [ ] Org list view + "+ Add Organization" button
- [ ] Org setup: name, select channels
- [ ] Instructions to add bot as admin → "Check Done" verification

### Day 4: Gate Config + Eligibility + LiFi

**Morning: Gate Configuration**
- [ ] Admin gate config form (per-channel for PoC)
- [ ] Fields: token address, chain dropdown (25+ chains), threshold
- [ ] Loading → fetch token metadata (symbol, name, decimals)
- [ ] Error handling for invalid addresses
- [ ] Store gate config in Convex

**Afternoon: Eligibility Check**
- [ ] Create "Check Eligibility" button/mutation
- [ ] Sum balances across all verified wallets
- [ ] Compare against threshold
- [ ] Return eligible/ineligible status
- [ ] Rejection → show friendly message + "Get Eligible" CTA

**Evening: LiFi Widget Integration**
- [ ] Install LiFi Widget SDK
- [ ] Create `/get-eligible` page
- [ ] Pre-configure widget:
  - Destination chain = gate's chain
  - Destination token = gate token (e.g., $BEST)
  - Amount = threshold - currentBalance + buffer
- [ ] Support cross-chain: USDC on Arbitrum → BEST on Base
- [ ] "Re-check Eligibility" button after swap completes

### Day 5: Bot Enforcement + Demo Recording

**Morning: Bot DM Warning Flow**
- [ ] When user ineligible → bot sends WARNING DM
- [ ] DM includes: current balance, required amount
- [ ] Button: "Fix with LiFi" → deep-links to `/get-eligible`
- [ ] After LiFi swap → bot confirms: "Detected X tokens, welcome back!"

**Afternoon: Public/Private Chat Setup**
- [ ] Create public chat "Best Crypto DAO" (slow, "dead" vibe)
- [ ] Create private chat "BCD Holders Club" (hyped, countdown)
- [ ] Pinned message in public chat with:
  - Intro + signup instructions
  - "Join Private Club" button (rejects if ineligible)
  - "Open Mini App" button
- [ ] Test reject → onboard → join flow

**Evening: Demo Video Recording**
- [ ] Record 4-minute demo following script (see below)
- [ ] Side overlays: pain points, architecture, prize alignment
- [ ] Deploy Mini App to Vercel
- [ ] Final QA pass

---

## Stretch Goals

### Sprint 6: Subscriptions (Arc/Circle Partner Prize)
- [ ] USDC membership deposit gate type
- [ ] Recurring subscription payments
- [ ] Treasury management for admins
- [ ] Circle/Arc SDK integration

### Sprint 7: Misc Stretch
- [ ] Automated cron job for periodic eligibility checks (24h)
- [ ] Full Orgs UI (currently just data layer)
- [ ] WalletConnect for mobile Telegram
- [ ] EFP integration (social followers from ETH Identity Kit)
- [ ] Demo Control Panel (`/demo` route with trigger buttons)
- [ ] Admin analytics dashboard

---

## Files to Create

```
gater-robot/
├── apps/
│   ├── bot/
│   │   ├── src/
│   │   │   ├── index.ts              # Bot entry point
│   │   │   ├── commands/
│   │   │   │   ├── start.ts          # /start handler
│   │   │   │   └── admin.ts          # /admin toggle
│   │   │   └── handlers/
│   │   │       ├── joinRequest.ts    # chat_join_request
│   │   │       └── warning.ts        # Send warning DM
│   │   └── package.json
│   └── web/
│       ├── src/
│       │   ├── main.tsx
│       │   ├── routes/
│       │   │   ├── index.tsx         # Landing / role select
│       │   │   ├── user.tsx          # User wallet + ENS + addresses
│       │   │   ├── admin.tsx         # Admin landing
│       │   │   ├── orgs.tsx          # Org list + add
│       │   │   ├── org-setup.tsx     # Single org config
│       │   │   ├── gate-config.tsx   # Gate form
│       │   │   └── get-eligible.tsx  # LiFi widget page
│       │   ├── components/
│       │   │   ├── Diagnostics.tsx   # Debug drawer
│       │   │   ├── WalletConnect.tsx
│       │   │   ├── AddressTable.tsx  # Multi-address with verify
│       │   │   ├── ENSIdentity.tsx   # ENS name + avatar
│       │   │   ├── TokenMint.tsx     # Mint + add to wallet
│       │   │   └── LiFiWidget.tsx
│       │   └── lib/
│       │       ├── telegram.ts       # WebApp SDK helpers
│       │       └── chains.ts         # Base + Arc chain configs
│       └── package.json
├── convex/
│   ├── schema.ts                     # Full data model
│   ├── auth.ts                       # initData HMAC validation
│   ├── users.ts                      # User mutations/queries
│   ├── addresses.ts                  # Wallet SIWE + verify
│   ├── orgs.ts                       # Org CRUD
│   ├── channels.ts                   # Channel management
│   ├── gates.ts                      # Gate config
│   ├── memberships.ts                # Eligibility check
│   └── events.ts                     # Audit log
├── contracts/
│   └── BestToken.sol                 # Demo ERC-20
├── turbo.json
├── pnpm-workspace.yaml
└── .env.example
```

---

## Demo Script (4-Minute Video)

### Scene 1: Cold Open (0:00-0:10)
- Admin persona face flash + name card
- VO: "Telegram communities are either alive… or dead. Today we make them *earned*."

### Scene 2: Bot Start (0:10-0:25)
- Bot /start → "Open App" button → Mini App splash
- Admin already has wallet connected

### Scene 3: Admin Org Setup (0:25-1:10)
- `/admin` command toggles admin mode
- See org list + "+ Add Organization"
- Quick onboard: name, select channels
- Instructions to add bot as admin → "Check Done" ✅

### Scene 4: Gate Configuration (1:10-1:35)
- Admin types threshold (show last digits for drama)
- Paste token address
- Select chain from dropdown (25+ chains visible)
- Loading → token metadata fetched (symbol/name/decimals)

### Scene 5: User Rejected (1:35-2:10)
- **Scene switch:** New character "Amelia" loves Best Crypto DAO
- Public chat is slow, bots complain "dead chat", "whale chat dropping alpha"
- Pinned message with signup instructions
- User clicks "Join Private Club" → **REJECTED** :(

### Scene 6: User Onboarding (2:10-2:40)
- Connect wallet (already connected for speed)
- Claim 2026 $BEST tokens from faucet (user pays gas)
- "Add to wallet" button with gold medal SVG icon
- Fade zoom into token balance

### Scene 7: ENS + Multi-Address (2:40-3:00)
- ENS name + avatar displayed
- 3 addresses table: 2 verified ✅, 1 pending ⏳
- "Verify ownership" button → SIWE → third address verified ✅
- Default address radio toggles ENS identity

### Scene 8: Join Success (3:00-3:10)
- Back to DAO chat → pinned message → "Join Private Club"
- **BOOM, you're in!**
- Private chat is hyped, countdown to "Alpha Call"

### Scene 9: Audience CTA (3:10-3:20)
- QR code overlay: "Scan to join"
- User sells tokens on Uniswap for $5 ("while they're still worth something!")

### Scene 10: Warning + LiFi Recovery (3:20-3:45)
- User gets push notification: **WARNING** from bot
- Opens Mini App → LiFi widget pre-configured
- Buys back 2000 $BEST with USDC on Arbitrum (cross-chain!)
- Bot confirms: "Detected 2001.34 $BEST — welcome back!"

### Scene 11: Second User Fails (3:45-3:55)
- Second user speedruns, dumps tokens, can't rejoin
- Gets roasted in public chat: "shouldn't have dumped bro", "ngmi"

### Scene 12: Tease + End Card (3:55-4:00)
- Tease: subscriptions, analytics, user profiles, data dashboards
- Architecture diagram flash
- "Today: token thresholds. Next: USDC membership + analytics."

---

## Verification Checklist

### Bot
- [ ] /start responds with greeting + "Open App" button
- [ ] /admin toggles admin mode
- [ ] Bot can send WARNING DMs to users
- [ ] Bot can KICK users from groups
- [ ] Bot sends kick notification DM to removed users
- [ ] "Fix with LiFi" button deep-links to mini app

### Mini App
- [ ] Opens inside Telegram webview
- [ ] initData HMAC validated on every load
- [ ] Wallet connect works (MetaMask)
- [ ] Faucet claim works (2026 tokens, once per wallet)
- [ ] "Add to wallet" adds token with gold medal icon
- [ ] SIWE verification completes
- [ ] ENS name + avatar resolves and displays
- [ ] 3-address table shows verified/pending states
- [ ] Default address toggle changes ENS identity

### Admin Flow
- [ ] Org list shows + "Add Organization" works
- [ ] Channel selection + "Check Done" verification
- [ ] Gate config: paste address, select chain, set threshold
- [ ] Token metadata (symbol, decimals) fetched from chain

### Eligibility
- [ ] "Check Eligibility" sums balances across wallets
- [ ] Ineligible → rejection with "Get Eligible" CTA
- [ ] Eligible → can join private group

### LiFi (Partner Bounty)
- [ ] Widget loads on /get-eligible
- [ ] Pre-configured with destination chain/token/amount
- [ ] Cross-chain swap works (e.g., Arbitrum USDC → Base BEST)
- [ ] "Re-check Eligibility" after swap
- [ ] Bot confirms detection of new balance

### End-to-End Demo Flow
- [ ] Admin creates org + gate
- [ ] User rejected from private chat
- [ ] User onboards: wallet → faucet claim → ENS → verify
- [ ] User joins private chat successfully
- [ ] User dumps tokens → warning DM
- [ ] Grace period expires → bot kicks user + sends kick DM
- [ ] User uses LiFi to recover → rejoins successfully

---

## GitHub Labels

### Priority Labels
| Label | Color | Description |
|-------|-------|-------------|
| `P0: Critical` | `#e11d21` (red) | Must ship for hackathon demo |
| `P1: High` | `#eb6420` (orange) | Important for complete experience |
| `P2: Medium` | `#fbca04` (yellow) | Nice to have, time permitting |
| `P3: Low` | `#c5def5` (light blue) | Stretch goals, post-hackathon |

### Area Labels
| Label | Color | Description |
|-------|-------|-------------|
| `area:bot` | `#0052cc` (blue) | Telegram bot logic |
| `area:mini-app` | `#0e8a16` (green) | Mini App frontend |
| `area:convex` | `#5319e7` (purple) | Convex backend/DB |
| `area:contracts` | `#fbca04` (yellow) | Smart contracts ($BEST token) |
| `area:lifi` | `#1d76db` (light blue) | LiFi widget integration |

### Type Labels
| Label | Color | Description |
|-------|-------|-------------|
| `type:feature` | `#84b6eb` | New functionality |
| `type:bug` | `#b60205` (red) | Something broken |
| `type:chore` | `#d4c5f9` (lavender) | Maintenance, setup, config |
| `type:docs` | `#c2e0c6` (light green) | Documentation |

### Status Labels
| Label | Color | Description |
|-------|-------|-------------|
| `blocked` | `#000000` (black) | Waiting on something external |
| `needs-review` | `#fbca04` (yellow) | Ready for code review |
| `partner-bounty` | `#ff69b4` (pink) | Relevant to prize submission |

### Sprint Labels
| Label | Color | Description |
|-------|-------|-------------|
| `sprint:1-foundation` | `#bfd4f2` | Sprint 1 issues |
| `sprint:2-identity` | `#bfd4f2` | Sprint 2 issues |
| `sprint:3-admin` | `#bfd4f2` | Sprint 3 issues |
| `sprint:4-eligibility` | `#bfd4f2` | Sprint 4 issues |
| `sprint:5-demo` | `#bfd4f2` | Sprint 5 issues |
| `sprint:6-subscriptions` | `#d4c5f9` | Sprint 6 stretch |
| `sprint:7-misc-stretch` | `#d4c5f9` | Sprint 7 stretch |

---

## GitHub Milestones (Sprints)

| Milestone | Focus | Target |
|-----------|-------|--------|
| **Sprint 1: Foundation** | Monorepo, bot /start, Convex schema, tunnel | Day 1-2 |
| **Sprint 2: User Identity** | Wallet connect, SIWE, ENS, multi-address | Day 3 |
| **Sprint 3: Admin + Gates** | Org setup, gate config, token metadata | Day 3-4 |
| **Sprint 4: Eligibility + LiFi** | Check eligibility, LiFi widget, recovery flow | Day 4 |
| **Sprint 5: Demo Polish** | Bot DMs, kick flow, chat setup, recording | Day 5 |
| **Sprint 6: Subscriptions** | USDC membership payments (Arc/Circle prize) | Stretch |
| **Sprint 7: Misc Stretch** | Cron, WalletConnect, EFP, analytics | Stretch |

---

## Issue Assignment Strategy

**For dividing work between team members:**
- Use `area:*` labels to assign by expertise (bot vs frontend vs contracts)
- Use sprint labels + priority to sequence work
- Daily standup: filter by `sprint:X` + sort by priority

**For tracking progress:**
- Move issues through: Open → In Progress → Needs Review → Closed
- Use `blocked` label when waiting on dependencies
- Use `partner-bounty` to ensure prize requirements are met
