Below is the **Option B Doc Pack** (core docs + MARKET/ASSETS/LEVITY) with **real jot notes** already filled in from everything we’ve discussed.

**How to use:** copy each section into a file with the same name in your repo (e.g., `/docs/CONTEXT.md`, `/docs/DEMO.md`, etc.). I wrote these so you can also paste the **TL;DR block** into a brand-new chat and get instant continuity.

---

## `CONTEXT.md`

# Gatekeeper (working title) — Context Pack

## 0) TL;DR — Copy/Paste Context Block for New Chats

We’re building a Telegram bot + Telegram Mini App that lets admins create token-gated private communities on Telegram. Users connect to the bot, open the mini-app, link one or more wallet addresses via SIWE signatures (ownership verification), and pick a “favorite ENS” identity from their linked addresses. Admins configure a gate for a Telegram private group/channel: token address + chain + minimum token threshold. Users can only join if their **total balance across verified linked wallets** meets the threshold. Balances are revalidated every ~24h (production), with a warn → kick flow (demo uses “instant check” + “simulate 24h”).
Key demo “WOW”: a user fails the gate, then taps “Get Eligible” inside the mini-app and uses LI.FI Widget (or Jumper UI) to swap/bridge into the required token across chains; bot re-checks and grants access.
Stack plan: frontend on Vercel, backend on Convex, Telegram bot via webhooks + Convex functions. Demo chain: Base Sepolia or other cheap EVM testnet; we’ll run a faucet/mint page and gas-sponsor minting where possible (paymaster). Telegram deep link + QR code opens the mini-app with `startapp` param and we keep the QR overlay visible during demo.
HackMoney 2026 async hackathon target; optimize for partner prize eligibility: ENS integration + LI.FI integration (cross-chain “Get Eligible”), potentially Arc/Circle USDC membership deposits as stretch, Yellow sessions as stretch, Uniswap v4 optional. Partner prize requirements include functional demo video + open-source repo; some tracks have max 3-min video, so we may produce a 4:00 main cut plus a 2:50 partner cut.
Demo style: cinematic narrative, 3–5 “bot cast” characters to make chats feel alive, and 4–5 planned laugh beats that are PG-13 and judge-safe.

## 1) Project Summary

**Product:** Token-gated private communities on **Telegram**, delivered as:

* Telegram bot (admin commands + membership enforcement)
* Telegram Mini App (user onboarding + identity + eligibility + “Get Eligible”)

**Tagline (draft):**
“Private Telegram communities with onchain identity, automatic enforcement, and instant onboarding.”

**Core differentiators vs “generic token gate”:**

* **Multi-wallet identity** (link multiple addresses; verify ownership via SIWE)
* **ENS as identity layer** (favorite ENS + avatar shown in bot messages / profile)
* **Continuous enforcement** (re-check; warn; kick)
* **Remediation** (“Get Eligible” via LI.FI instead of dead-end rejection)
* **Hackathon-first polish** (living chat simulation + clear demo spine)

## 2) Target Event & Constraints

* Event: ETHGlobal HackMoney 2026 async (Jan 30 – Feb 11, 2026). ([ETHGlobal][1])
* Output needs to be demoable and judge-friendly: functional flow, clear video, repo, docs.

## 3) Prize Targets (Strategy)

From the HackMoney 2026 prizes page, partners include Yellow, Uniswap Foundation, Sui, Arc, LI.FI, ENS. ([ETHGlobal][2])

**Primary (highest expected value for this project):**

* **ENS**: strong identity integration; must be real code and functional demo (not hard-coded). ([ETHGlobal][2])
* **LI.FI**: “Get Eligible” cross-chain swap/bridge to required token; needs 2+ EVM chains in user journey + working frontend + repo + demo video. ([ETHGlobal][2])

**Secondary (if time):**

* **Arc / Circle**: USDC membership deposit/treasury rails; requires frontend+backend+architecture diagram; uses Circle tools. ([ETHGlobal][2])

**Optional (only if it becomes core, not bolt-on):**

* **Yellow**: session-based micro-payments / instant off-chain actions; requires integrating Yellow SDK/Nitrolite and showing off-chain logic + settlement; demo video 2–3 minutes. ([ETHGlobal][2])
* **Uniswap Foundation**: only if we add meaningful v4 integration; they require TxIDs, repo/README, and demo video max 3 minutes. ([ETHGlobal][2])
* **Sui**: likely not pursued (we’re EVM-first). ([ETHGlobal][2])

## 4) MVP Feature Set (Tier 0)

### Admin (MVP)

* Admin “organization” setup (name, channels)
* Bot permission check: “add bot as admin → verify done”
* Create gate:

  * token address
  * select chain (dropdown; demo can show 25+ even if we fully support fewer)
  * threshold amount
  * token metadata retrieval (symbol/name/decimals) OR error message

### User (MVP)

* Open mini-app via pinned message / QR deep link
* Connect wallet
* SIWE sign-in
* Link 1–3 addresses

  * verified addresses show ✅
  * pending address shows ⏳ then verify via SIWE
* Choose default address (affects displayed ENS identity)
* Eligibility check
* Join private chat success flow

### Enforcement (MVP)

* Periodic re-check (target: every 24h in production)
* Warn user when they fall below threshold
* Kick user after grace period (for demo: immediate simulate)
* Demo-only: “Simulate 24h” button + “Force user below threshold” button

## 5) Stretch Features (Tier 1 / Tier 2)

### Tier 1 (ship if time)

* LI.FI “Get Eligible” widget embedded in mini-app for cross-chain swaps/bridges to regain eligibility.
* QR overlay + deep link to faucet/mint inside mini-app with `startapp` param. Telegram supports passing `startapp` into Mini Apps via `tgWebAppStartParam`. ([core.telegram.org][3])

### Tier 2 (tease only)

* Subscription model (USDC)

  * likely prepaid escrow or user-initiated renewal (avoid scary open approvals)
* Admin analytics dashboards (whales / engagement / retention)
* Additional identity verifications (social proofs) — only as “future”

## 6) Demo North Star

**4-minute cinematic narrative** that feels like a real Telegram DAO:

* Introduce admin persona → config gate quickly
* Introduce user persona → rejected → onboard → accepted
* Show “dump tokens → warning → Get Eligible → rejoin”
* Call-to-action: audience scans QR to try it

We will use 3–5 scripted bot “cast” accounts/voices to make chats look alive.

## 7) Tech Stack (current plan)

* Frontend: Next.js (Telegram Mini App web) deployed on Vercel. ([Convex Developer Hub][4])
* Backend: Convex (DB + functions + scheduler) ([Convex Developer Hub][4])
* Telegram bot:

  * Webhook endpoint (Vercel route or Convex HTTP action)
  * Commands: `/admin`, `/create_org`, `/create_gate`, `/status`, etc.
* Onchain:

  * Demo token on Base Sepolia (preferred)
  * Gas sponsorship for faucet/mint using paymaster approach. ([docs.base.org][5])
* Cross-chain:

  * LI.FI Widget embedded for “Get Eligible” flow. ([LI.FI][6])

## 8) Risks / Open Questions (start list)

* Telegram Mini App deep link param (`startapp`) works across all clients; some historical client quirks exist → implement fallback if param missing. ([core.telegram.org][3])
* Wallet connection UX inside Telegram webview (reliability + compatibility).
* Balance checking reliability across chains (RPC limits; caching; timeouts).
* Telegram admin permissions (bot must be admin in private groups/channels to invite/kick).
* Avoid over-scoping: keep a “Do Not Build” list in TASKS.md.

## 9) Decisions Log (seed entries)

* D-001: MVP gate type = **token threshold** (single ERC-20 + single chain per gate).
* D-002: Use LI.FI as remediation (“Get Eligible”) to increase usability + prize eligibility.
* D-003: Use testnet token + clear “demo token” labeling (avoid “real money” confusion).
* D-004: Maintain a 4:00 “main cut” and optionally a 2:50 “partner cut” if needed.

## 10) Glossary

* **Gate:** Rule that decides who can join a private community.
* **Org:** Admin’s “community container” (brand + channels + gates).
* **Eligibility:** Pass/fail state based on verified wallets + onchain balances.
* **Revalidation:** Periodic re-check of eligibility.
* **Remediation:** Action to regain eligibility (swap/bridge to required token).

---

## `DEMO.md`

# Demo Bible — 4:00 Main Cut + Partner Cut

## A) Demo goals

* Feel like a real Telegram community (not a hackathon prototype)
* Show the “magic trick” in <90 seconds: rejected → fix → in
* Make judges smile 4–5 times without being mean or edgy
* Keep it PG-13 and professional (no slurs, no explicit content, no illegal vibes)

## B) Key demo props

* 2 Telegram chats:

  1. Public “Best Crypto DAO” chat (slow, “dead chat” joke)
  2. Private “BCD Holders Club” chat (fast, hype)
* Pinned onboarding message with buttons:

  * “Open Gatekeeper Mini App”
  * “Join Private Club” (will reject until eligible)
  * “Mint demo tokens” (mini-app deep link)
* QR code overlay that deep-links into mini-app faucet screen using `startapp` param. ([core.telegram.org][3])

## C) Characters

* Admin persona (pick one; default = Nerdy Builder “Devon”)
* User persona (default = Amelia)
* Bot cast (scripted messages):

  * ModBot
  * HypeBot
  * SkepticBot
  * WhaleBot
  * LoreBot

## D) Laugh beats placement (planned)

* L1: “enforcing it with code, not vibes”
* L2: “admin rights… totally normal” (wink, not scary)
* L3: “wrong token address? app judges you”
* L4: “denied access, but with good UX”
* L5: “social survival mode” when using Get Eligible

## E) 4:00 storyboard (timecoded)

Use scene IDs so edits are surgical.

### D1 (0:00–0:10) Cold open

* Quick face flash of admin + name card
* VO: “Telegram communities are either alive… or dead. Today we’re making them *earned*.”
* Side overlay: tagline + product name

### D2 (0:10–0:25) Bot → Open Mini App

* Show Telegram bot “Start” + “Open”
* Mini app splash screen + fade
* On-screen micro text: “Demo token / testnet”

### D3 (0:25–1:10) Admin onboarding org + channels

* `/admin` command toggles admin mode
* Mini-app: org list + “+ Add Organization”
* Setup org name: “Best Crypto DAO”
* Select channels → instructions to add bot admin rights → verify
* Show quick Telegram UI: add bot admin → return → “Verified ✅”

### D4 (1:10–1:35) Gate creation (token + chain + threshold)

* Admin types threshold (show last digits for drama)
* Paste token address
* Select chain from dropdown (looks “25+ chains”)
* Loading spinner → token metadata fetched (symbol/name/decimals) OR error state (only if you want to show robustness)

### D5 (1:35–2:10) Scene switch: Amelia tries to join

* Public chat is slow, bots comment it’s dead
* Pinned message instructs how to join + opens mini-app
* Amelia clicks “Join Private Club” → rejected with friendly message and CTA: “Get demo tokens / Get Eligible”

### D6 (2:10–2:40) User onboarding: SIWE + mint demo token

* Wallet connect (already connected for speed)
* SIWE signature
* “Mint demo $BEST tokens” (gas sponsored if possible)
* “Add token to wallet” (gold medal SVG icon)
* Quick zoom into balance number

### D7 (2:40–3:00) ENS identity + multi-address table

* Show ENS name + avatar
* 3 addresses table: 2 verified ✅, 1 pending ⏳
* “Verify ownership” button → SIWE → pending becomes verified ✅
* Default address radio toggles “favorite ENS identity”

### D8 (3:00–3:10) Join succeeds

* Back to Telegram → Join Private Club → “Boom, you’re in”
* Private chat is lively, pinned countdown to “Alpha call”

### D9 (3:10–3:25) Audience CTA

* Overlay QR code with “Scan to try it”
* VO: “Scan to mint demo tokens and join in under 30 seconds.”

### D10 (3:25–3:45) Dump → warning → Get Eligible via LI.FI widget

* Show user swapping out of $BEST (testnet DEX clip)
* Bot sends WARNING notification
* Button: “Get Eligible” opens embedded LI.FI widget configured to swap/bridge to required token
* Success: bot says “Detected 2001.34 $BEST — welcome back”
* Note: “Widget is embedded; no backend required” is credible. ([LI.FI][6])

### D11 (3:45–3:58) Second user speedrun + playful roast

* Second user joins then fails; complains in public chat
* Bots respond with playful lines (“paper hands detected 🚨”, “come back we’ll wait”)
* Keep roasts fun, never hateful.

### D12 (3:58–4:00) End card

* “Today: token thresholds. Next: USDC membership + analytics.”
* Show architecture diagram briefly.

## F) 2:50 “Partner Cut” (if needed)

Some prize tracks ask for max ~3 minutes (e.g., Uniswap demo video max 3 min; Yellow demo 2–3 min). ([ETHGlobal][2])
Plan: cut D1–D5 tighter, drop D11, keep:

* admin config
* user denied → onboard → in
* warning → Get Eligible

## G) Recording checklist

* Record at 1080p+ (Telegram UI text is tiny)
* 60fps if possible (scrolling looks smoother)
* Pre-seed wallets and chats
* “Demo control panel” ready to trigger warn/kick instantly
* Never wait for slow confirmations in real time: use pre-recorded quick clip if needed

---

## `TECH.md`

# Tech Bible — Architecture + Data Model + Flows

## 1) High-level architecture (MVP)

**Clients:**

* Telegram chat UI (bot)
* Telegram Mini App (web app in Telegram webview)

**Backend:**

* Convex DB + server functions + scheduler
* Telegram webhook handler (Vercel route or Convex HTTP action)
* Chain read layer (RPC providers; caching)

**Onchain:**

* Demo ERC-20 token contract (testnet)
* Optional paymaster/gas sponsorship for mint/faucet. ([docs.base.org][5])
* Optional “membership receipt” contract (not required for MVP)

## 2) Telegram Mini App deep linking

We will use Telegram’s “direct link mini app” format with `startapp` parameter. Telegram passes it into the mini app as `tgWebAppStartParam`. ([core.telegram.org][3])

**Use cases for `startapp` payload:**

* Deep-link user into faucet screen for a specific community (`orgId`)
* Track attribution (“came from QR at demo”)
* Preselect gate and chain/token in UI

**Reliability note:** Some Telegram clients historically had quirks passing start params → implement fallback (manual community selection) if param missing. ([GitHub][7])

## 3) Data model (Convex tables — draft)

* `users`

  * `telegramUserId`, `telegramUsername`, `createdAt`
  * `primaryEnsName`, `primaryEnsAvatarUrl`
  * `defaultAddressId`
  * `lastSeenAt`
* `addresses`

  * `userId`, `address`, `status` (pending/verified)
  * `verifiedAt`, `siweMessage`, `siweSignature`
  * `ensNameAtVerification` (optional cache)
* `orgs`

  * `ownerTelegramUserId`, `name`, `createdAt`
* `channels`

  * `orgId`, `telegramChatId`, `type` (public/private)
  * `title`, `botIsAdmin` (bool), `verifiedAt`
* `gates`

  * `orgId`, `channelId`
  * `chainId`, `tokenAddress`, `tokenSymbol`, `tokenDecimals`
  * `threshold` (as big integer or decimal string)
  * `active` (bool)
* `memberships`

  * `orgId`, `channelId`, `userId`
  * `status` (eligible / warned / kicked / pending)
  * `lastCheckedAt`, `nextCheckAt`
  * `lastKnownBalance`
* `events`

  * audit log: `type` (joined, warned, kicked, verifiedAddress, etc.), `payload`, `createdAt`

## 4) Core flows (server-side)

### 4.1 User onboarding + SIWE linking

* Mini app initiates “link wallet”:

  * generate SIWE message (nonce, domain, issuedAt)
  * user signs
  * backend verifies signature → marks address verified
* Repeat for additional addresses
* Choosing “default address” updates:

  * displayed ENS identity (resolve ENS name for that address)
  * bot uses that identity in future messages

### 4.2 ENS integration

* Requirements: must write ENS-specific code; no hard-coded values; functional demo. ([ETHGlobal][2])
  Implementation notes:
* Resolve ENS name for an address (reverse record or lookup)
* Fetch ENS avatar/text records (optional)
* Store “favorite ENS” in `users.primaryEnsName` and use in UI + bot messages

### 4.3 Admin setup

* Admin in bot triggers org creation:

  * create `orgs` entry
  * user adds bot as admin to channels
  * bot verifies permissions and stores `channels.telegramChatId`
* Gate creation:

  * admin supplies token address + chain
  * backend calls ERC-20 `symbol()`, `name()`, `decimals()` to validate
  * store gate config

### 4.4 Eligibility check engine

MVP design goal: **boring and reliable.**

* For each membership check:

  * for each verified address:

    * read `balanceOf(address)` for gate token
  * sum balances
  * compare against threshold
* If fail:

  * status transitions: `eligible → warned → kicked`
  * warn includes remediation button “Get Eligible”
* For demo:

  * allow “recheck now”
  * allow “simulate 24h”
  * allow “force below threshold”

## 5) LI.FI integration (“Get Eligible”)

We embed LI.FI widget so a user can swap/bridge to required token directly in mini-app. LI.FI provides an embeddable widget and supports configuration (default chains, tokens, destination amount, etc.). ([LI.FI][6])

HackMoney LI.FI prize requirements to keep in mind:

* Must use LI.FI SDK/APIs for at least one cross-chain action
* Must support at least 2 EVM chains in user journey
* Must ship a working frontend + repo + video demo ([ETHGlobal][2])

Implementation note:

* For “Get Eligible,” preconfigure widget with:

  * destination chain = gate’s chain
  * destination token = gate token
  * destination amount = “just enough to pass” (threshold - currentBalance + buffer)
* After swap completes:

  * trigger immediate re-check
  * show “Detected X tokens — you’re eligible”

## 6) Gas sponsorship / “free mint” demo

We want a faucet/mint that feels free. Base docs describe using a paymaster for gasless transactions. ([docs.base.org][5])

Implementation options:

* Simple: normal mint on testnet; we pre-seed users with gas (least dev effort)
* Better: paymaster sponsored mint (more WOW; more work)

## 7) Hosting / deployment notes

Using Convex with Vercel is a standard pattern; redeploy both frontend and backend on pushes. ([Convex Developer Hub][4])

Bot webhook considerations:

* must be idempotent (Telegram may retry)
* store processed update IDs
* rate limit to avoid message storms

## 8) Environment variables (draft)

* `TELEGRAM_BOT_TOKEN`
* `TELEGRAM_WEBHOOK_SECRET`
* `CONVEX_DEPLOYMENT`
* `RPC_URLS_BY_CHAIN` (map)
* `DEMO_TOKEN_ADDRESS_BY_CHAIN`
* `LIFI_API_KEY` (if needed for SDK; widget may not require)
* `PAYMASTER_API_KEY` (if using gasless)

## 9) “Demo control panel” (must-have)

Hidden route `/demo` behind a passcode:

* Spawn chat burst (scripted bot lines)
* Force user eligible/ineligible
* Trigger warning
* Trigger kick
* Reset all demo state

This is what prevents demo disasters.

---

## `PRIZES.md`

# Prize Strategy & Compliance Checklist

## 1) Partner prize landscape (HackMoney 2026)

HackMoney prize list includes: Yellow, Uniswap Foundation, Sui, Arc, LI.FI, ENS (+ finalists pack). ([ETHGlobal][2])

## 2) Which prizes we’re actually targeting (default plan)

### Primary targets

1. ENS pool prize + (maybe) “Most creative use of ENS for DeFi”

* ENS pool prize: “Integrate ENS” split pool; must write ENS-specific code; demo functional; no hard-coded values; open source. ([ETHGlobal][2])
* Creative ENS for DeFi: store preferences via ENS text records, etc. (stretch). ([ETHGlobal][2])

2. LI.FI “Best Use of Composer in DeFi”

* Must use LI.FI SDK/API for cross-chain action; support 2+ EVM chains; working frontend; repo + demo video. ([ETHGlobal][2])
  Our mapping: “Get Eligible” = cross-chain swap/bridge into gate token + (optional) contract call.

### Secondary target

3. Arc (Circle) prize — only if time
   Arc prize requires:

* Circle tools: Arc, Circle Gateway, USDC, Circle Wallets (varies by track)
* Working frontend + backend + architecture diagram
* Video demo + documentation + repo ([ETHGlobal][2])
  Our mapping: USDC membership deposit gate or community treasury.

### Optional (only if we make them core)

4. Yellow

* Must integrate Yellow SDK / Nitrolite, show off-chain session logic + settlement, include 2–3 minute demo video, repo, apply under Yellow track. ([ETHGlobal][2])
  Potential mapping: “instant micro-tipping per message/emoji in Telegram” (session-based), used to grant temporary membership perks.

5. Uniswap Foundation

* Tracks: Agentic Finance + Privacy DeFi
* UI not required; must submit TxIDs + repo + README + demo video max 3 min. ([ETHGlobal][2])
  We should NOT target this unless we add real Uniswap v4 logic (otherwise it’s distraction).

6. Sui

* Requires being built on Sui; not aligned with our EVM/Telegram focus. ([ETHGlobal][8])

## 3) Submission artifacts checklist (global)

* Repo is open-source
* README: problem, solution, architecture, how to run
* Deployed demo link (mini-app)
* Demo video:

  * Main cut: 4:00 (for overall judging)
  * Partner cut(s): 2–3 min if applying to Yellow/Uniswap
* TxIDs (if needed for Uniswap or onchain proof)
* Architecture diagram (needed for Arc track)

## 4) “Don’t get disqualified” checklist

* ENS demo cannot be hard-coded values. ([ETHGlobal][2])
* LI.FI must actually perform cross-chain action + 2 chains in user journey. ([ETHGlobal][2])
* Yellow requires actual SDK/Nitrolite integration and off-chain logic demonstration. ([ETHGlobal][2])
* Uniswap requires TxIDs + max 3 min video. ([ETHGlobal][2])

---

## `RUNBOOK.md`

# Demo Runbook (Setup, Reset, Fallbacks)

## 1) Pre-demo setup (T-24h)

* Create Telegram public + private chats
* Add bot(s) as admin; verify permissions in app
* Pin onboarding message in public chat:

  * “Open mini-app”
  * “Join private club”
  * “Mint demo tokens”
* Load scripted bot messages into demo control panel

## 2) Wallet fixtures

* Admin wallet: pre-connected
* Amelia wallet: pre-connected
* Second user wallet: pre-connected
* Ensure each has:

  * 1 address already verified
  * 2nd address verified
  * 3rd address pending (for “verify ownership” moment)

## 3) Token fixtures

* Deploy demo token on testnet
* Faucet/mint flow works
* Token icon works (gold medal svg)
* If gas sponsored: confirm paymaster config; else pre-fund wallets with test ETH

## 4) LI.FI fixtures

* Prepare a “Get Eligible” route configuration:

  * from chain: another cheap EVM chain
  * to chain: gated chain
  * to token: $BEST
  * amount: threshold + buffer
* Pre-test that the widget loads reliably in Telegram webview

## 5) Chat realism fixtures

* “Dead chat” mode: low message rate
* “Hype chat” mode: rapid replies + pinned countdown
* Bot cast scripts ready:

  * ModBot lines
  * HypeBot lines
  * SkepticBot lines
  * WhaleBot lines
  * LoreBot pinned info

## 6) Demo control panel (instant triggers)

Buttons:

* `SpawnDeadChatBurst()`
* `SpawnHypeChatBurst()`
* `ForceUserBelowThreshold(userId)`
* `TriggerWarning(userId)`
* `TriggerKick(userId)`
* `Simulate24Hours()`
* `ResetDemoState()`

## 7) Failure fallbacks (non-negotiable)

* If a live tx stalls:

  * cut to pre-recorded “tx confirmed” clip
* If Telegram deep link param missing:

  * fallback screen “Select community” (manual)
* If widget fails to load:

  * fallback “faucet + manual swap” clip or a simplified route

## 8) Reset procedure (5 minutes)

* Click ResetDemoState
* Clear memberships state for Amelia + second user
* Reset balances (mint/burn or switch to fresh wallets)
* Re-pin message if needed

---

## `TASKS.md`

# Execution Plan & Scope Ladder

## 0) Scope ladder (protect against overbuild)

### Tier 0 (must ship)

* Admin: org setup + bot permission verify + create gate (token + chain + threshold + metadata fetch)
* User: SIWE login + link wallets + pick ENS + eligibility check + join
* Enforcement: warn + kick + simulate time
* Demo: QR deep link + pinned message + bot cast scripts

### Tier 1 (ship if time)

* LI.FI “Get Eligible” embedded widget with prefilled config + auto re-check after swap
* Gas-sponsored faucet/mint (if stable)

### Tier 2 (tease only)

* Arc USDC deposit membership gate + treasury
* Yellow session-based micro-tipping
* Advanced analytics dashboards

## 1) Milestone plan (suggested)

M1: Demo spine end-to-end (no polish)

* Admin creates gate
* User fails → onboards → joins

M2: Identity polish

* Multi-address table with pending → verified moment
* ENS shown in bot messages

M3: Enforcement + remediation

* Warn/kick flow + “Get Eligible”
* Demo control panel

M4: Demo production

* Bot cast scripts
* Overlay QR
* 4:00 cut + partner cut (if needed)

## 2) Task list (starter)

* [ ] Telegram bot scaffolding + webhook
* [ ] Mini-app routing: `/home`, `/orgs`, `/org/:id/setup`, `/gate/create`, `/profile`, `/get-eligible`
* [ ] SIWE signing + verification
* [ ] ENS resolver + avatar/text record fetch
* [ ] ERC-20 metadata fetch + error handling
* [ ] Balance checker + caching
* [ ] Membership invite + kick logic
* [ ] Scheduler: periodic re-check
* [ ] Demo control panel
* [ ] QR generator + overlay assets
* [ ] Video storyboard + voiceover script + record pass 1

## 3) “Do not build” list (guardrails)

* No full subscription auto-pull from EOAs
* No multi-token portfolio valuation
* No chain-agnostic “everything everywhere” balance engine for MVP
* No “AI agents” unless required and demonstrably reliable

---

## `MARKET.md`

# Market & Narrative (for slides / side overlays)

## 1) Positioning

**“Collabland, but Telegram-native — with identity + monetization + cross-chain onboarding.”**

Key claim: Telegram is where communities already operate; token gates are typically Discord-first and don’t feel native in Telegram.

## 2) Personas

* Community admin: wants quality members, easy setup, enforcement, and monetization
* Member: wants frictionless joining and identity
* Moderator: wants automation + safety
* “Skeptic”: wants trust model clarity (no custody, minimal permissions)

## 3) Problem framing (slides)

* Token-gated communities exist, but onboarding is painful:

  * wrong chain, wrong token, no gas, confusing wallet UX
* Enforcement is often weak:

  * manual or inconsistent re-checks
* Identity is fragmented:

  * addresses aren’t people; ENS makes identity human

## 4) Competitive landscape (fill in later with citations)

Competitors / adjacent:

* Collab.Land
* Guild.xyz
* Tokenproof-style gating
  Differentiators:
* Telegram-native UX
* Multi-wallet identity + ENS-first identity
* Built-in remediation (Get Eligible)
* Monetization roadmap (USDC deposit/subscription)

## 5) GTM ideas (optional)

* Start with crypto DAOs and alpha groups on Telegram
* Partner with token communities that already have Telegram channels
* Offer “free tier” gating + premium analytics

## 6) Metrics to show (even if mocked)

* conversion rate: scanned QR → minted token → joined
* retention: % still eligible after 24h
* remediation: % of failed users who click Get Eligible and return

## 7) TAM/SAM/SOM (guidance)

Don’t invent numbers. Instead:

* Count Telegram group ecosystem + crypto communities
* Use credible sources later (to add citations) — keep placeholders now.

---

## `ASSETS.md`

# Asset Checklist & File Map

## 1) Brand

* Project name: Gatekeeper (working)
* Logo: simple lock + chat bubble
* Color palette: high contrast for readability in Telegram webview

## 2) Tokens

* Demo token name: `$BEST` (or `$VIBE`)
* Token icon: base64 SVG “gold medal #1”
* Token faucet/mint UI:

  * big CTA “Mint enough to qualify”
  * small note: “demo token / testnet”

## 3) Telegram assets

* Bot avatar (friendly)
* Pinned message image (square)
* “Welcome” sticker-like graphic (optional)

## 4) Demo overlays

* Persistent QR overlay banner

  * “Scan to join”
  * short text instructions
* Lower-thirds for characters:

  * “Admin: Devon”
  * “Member: Amelia”
* Side panel graphics:

  * pain points
  * architecture diagram
  * prize alignment
  * roadmap

## 5) Architecture diagram (for Arc track / credibility)

* Components:

  * Telegram chat
  * Bot webhook
  * Convex DB + scheduler
  * Chain read layer
  * LI.FI widget
  * Onchain token contract
* Export: PNG + Figma source

## 6) Video assets

* Intro sting (0.5s)
* Scene transition whooshes (subtle)
* Sound effects: *very light* (don’t overdo it)

---

## `LEVITY.md`

# Levity Bank & Presentation Safety Notes

## 0) Rules for humor

* Keep it PG-13 and judge-safe
* Humor should reinforce clarity (“teach while entertaining”)
* Never use slurs, hate, or explicit content
* Roast behavior, not people (“paper hands” is fine; targeted insults aren’t)

## 1) Laugh beats (mapped to storyboard)

* L1 (Cold open): “code, not vibes”
* L2 (Admin permissions): “we’re not asking for your seed phrase”
* L3 (Token address): “app judges you”
* L4 (Rejection): “denied access, but with good UX”
* L5 (Get Eligible): “social survival mode”

## 2) Joke bank (drop-ins)

### Onboarding

* “Just a signature. Not a mortgage.”
* “We verify wallets, not personalities.”

### ENS identity

* “Pick your ENS like a gamer tag, but with more consequences.”
* “Your ENS is your badge. Your balance is your ticket.”

### Eligibility fail

* “You’re not eligible yet — but we believe in you.”
* “Current status: vibes. Required status: tokens.”

### Enforcement

* “This is a gentle reminder. The next one is… still gentle, but automated.”
* “We’re not banning you. We’re rebalancing your access.”

### Get Eligible

* “Insufficient vibes detected. Initiating refill…”
* “One click from ‘no’ to ‘welcome back.’”

## 3) Safe roast lines for bot cast

* “paper hands detected 🚨”
* “ngmi… unless you click Get Eligible (then you’re fine)”
* “come back, we’ll keep your seat warm”

## 4) Things to avoid (explicitly)

* Don’t imply real profit or “hurry before value changes”
* Don’t include explicit content or illegal references
* Don’t do “subliminal messaging” — do “Easter eggs”

  * Example Easter egg: a tiny gold medal icon appears whenever someone becomes eligible

## 5) Easter egg ideas (judge-friendly)

* Token icon is a gold medal (winning motif)
* “Eligible ✅” animation is a tiny confetti pop
* A hidden `/lore` command that posts a funny “community lore” line

---

If you want, I can now generate a **single consolidated “handoff snippet”** (like a 1-page `CONTEXT.md` top section you can paste into *any* new chat) *plus* a **Decision Log** template that forces alignment (so new chats don’t reopen settled questions).

[1]: https://ethglobal.com/events?utm_source=chatgpt.com "Events"
[2]: https://ethglobal.com/events/hackmoney2026/prizes/ "ETHGlobal"
[3]: https://core.telegram.org/bots/webapps?utm_source=chatgpt.com "Telegram Mini Apps"
[4]: https://docs.convex.dev/production/hosting/vercel?utm_source=chatgpt.com "Using Convex with Vercel | Convex Developer Hub"
[5]: https://docs.base.org/cookbook/go-gasless?utm_source=chatgpt.com "Gasless Transactions on Base using a Paymaster"
[6]: https://li.fi/widget/?utm_source=chatgpt.com "Widget"
[7]: https://github.com/TelegramMessenger/Telegram-iOS/issues/1091?utm_source=chatgpt.com "start_param and tgWebAppStartParam are not present in ..."
[8]: https://ethglobal.com/events/hackmoney2026/prizes/sui?utm_source=chatgpt.com "Sui"
