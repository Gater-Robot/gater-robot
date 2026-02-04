<discussion>
You’re steering this in a really sane direction.

### Quick reactions to your updates

**RainbowKit v3 + latest wagmi + viem + MetaMask connector**
Yes. That’s the right “modern web3 React” stack, and it’s a better long-term posture than relying on `window.ethereum` directly. Wagmi’s model (connectors + transports + hooks) gives you a cleaner abstraction boundary and makes it easier to add WalletConnect/Reown later if you need it. ([rainbowkit.com][1])

**Landmine 2 (close callback)**
Agree it’s non-critical. Treat it as a “bonus if it works” and don’t let it block the sprint. If you do try it, just remember: the robust primitive is “Mini App explicitly sends something” rather than relying on a close event. Telegram’s WebApp API supports sending data back to the bot, but you can just skip it tonight. ([core.telegram.org][2])

**try_instant_view=true for external links**
Good catch: that option exists on the **Mini App** method for opening links (not the Bot API inline URL button itself). In other words, if you want to try Instant View, you’ll get the most control by opening links from the Mini App using `openLink(url, { try_instant_view: true })`. ([core.telegram.org][2])

**Diagnostics panel everywhere**
Strong improvement. Making it a global, collapsible “Debug/Diagnostics” drawer that appears on all pages is perfect for a sprint. You’ll thank yourself when you’re trying to understand what Telegram is actually passing through `initData` and what environment the webview is running under.

---

## The dev workflow concern you raised is the most important thing here

You’re right: “deploy to Vercel every time” is sprint-killing friction.

But there’s a subtle truth about Telegram Mini Apps that impacts how “local” your dev loop can really be:

* Telegram Mini Apps are loaded in a client webview on your phone or desktop Telegram app, and **they need an HTTPS URL** that your device can reach.
* A local dev server on `http://localhost:3000` isn’t reachable from your phone.
* So you’ll almost always need *some* “bridge” to test on a real device while keeping hot reload.

### The best DX compromise for a 1-night sprint

Use **hot reload locally**, but expose the web app via a **Cloudflare quick tunnel** (no subdomain needed).

That gives you:

* Vite/Next dev server with hot reload
* a public HTTPS URL in seconds
* no Vercel deploy loop
* no DNS/subdomain setup

Later, if you want a stable URL, you can add a real Cloudflare tunnel + subdomain and script it. But for tonight, “quick tunnel” is the clean path.

---

## “Do we need an HTTPS endpoint for the bot?”

Not if you run the bot in **long polling mode** during dev.

* **Webhook mode** requires a public HTTPS endpoint that Telegram can call.
* **Long polling mode** doesn’t. Your bot connects outward to Telegram and receives updates, so it can run entirely on your laptop.

So for the sprint:

* Mini App: needs HTTPS (tunnel is great)
* Bot: can run local polling (no webhook tunnel needed)

That’s the simplest setup that still feels fast.

---

## Can Convex run locally?

Yes — Convex supports **local deployments for development**. ([docs.convex.dev][3])

However, there’s an important practical detail:

* If you run Convex locally on your laptop, your Mini App running on your phone must be able to reach it.
* That means you’d need to expose the Convex local deployment to the public internet too (again via a tunnel) **and** ensure websockets and auth behave correctly through that tunnel.

That’s doable, but it’s extra moving parts.

### My recommendation for tonight

For a 1-night PoC:

* Use Convex **hosted dev deployment** (super low friction).
* Use local hot reload for the web app via Cloudflare tunnel.
* Run the bot locally via polling.
* Only later, if you want it, experiment with Convex local deployment.

You still get the “local dev feel” where it matters: the UI and the bot logic.

Convex’s HTTP actions are still useful regardless, especially once you later switch to webhooks. ([docs.convex.dev][4])

---

# Now your explicit question: mini app framework and backend framework

You asked what I’m thinking for the Mini App, and what about the backend.

## Mini App framework: Next.js vs Vite + React Router

### Option A: **Vite + React Router** (my best “sprint DX” pick)

If the Mini App is fundamentally a client-side app (which it is), Vite is hard to beat for:

* very fast startup
* very fast HMR
* minimal ceremony
* fewer gotchas about SSR

And since your backend is Convex, you don’t need Next.js API routes. The Mini App pages are just routes and components.

It also tends to behave more predictably inside embedded webviews because it’s “just a SPA.”

**Downside:**
You lose the “Vercel-native default” and some Next conveniences, but for a Mini App PoC, those aren’t critical.

### Option B: **Next.js** (my best “product evolution” pick)

Next is excellent if you expect the UI to become larger and you want:

* built-in routing conventions
* easy deployment to Vercel
* mature patterns for environment variables, builds, previews
* later, if you ever want marketing pages, SEO pages, or other non-mini-app pages, it’s already there

RainbowKit/wagmi can be used in Next; you just have to be mindful of SSR and configure accordingly (RainbowKit docs call this out). ([rainbowkit.com][1])

**Downside:**
There’s more framework weight than you need for a Mini App, and you can hit SSR-related friction unless you keep the Mini App fully client-side.

### My recommendation given your goals tonight

For a 1-night PoC sprint where hot reload speed and low friction matter most:

**Use Vite + React Router for the Mini App UI.**
It’s the most “it just works” approach in a webview, and it keeps the repo clean.

Then, later, if you decide you want the whole ecosystem on Next.js, you can migrate once the product shape is stable.

If you’re strongly biased to Next because you want Vercel previews and you’re already comfortable with Next, it’s still totally fine — just keep the Mini App pages as client-only components and don’t build server-driven patterns you don’t need.

---

## Backend framework: Convex-first, plus a tiny bot runner

This is where Convex really shines.

In this project, you don’t need a traditional “backend web server framework” like Express/Nest/Fastify to get started, because Convex provides:

* database + reactive queries
* mutations/actions
* scheduled jobs / cron
* HTTP actions for webhooks when you’re ready ([docs.convex.dev][4])

### Recommended backend shape for the PoC

Think of “backend” as two pieces:

1. **Convex backend (the real backend)**

   * stores users, wallets, events, and history
   * verifies signatures
   * later runs cron jobs for balance checks
   * can expose HTTP actions if/when you move to webhooks

2. **Local Node bot runner (thin)**

   * runs in polling mode for dev
   * renders buttons and handles commands
   * writes to Convex (create user, log events, etc.)

This division gives you exceptional DX:

* you can restart the bot instantly
* UI hot reload stays fast
* Convex remains the source of truth
* you avoid building and maintaining an extra web server that duplicates Convex responsibilities

Convex also has an HTTP API that can invoke functions by endpoint, which is handy for integrating external processes, though for the bot you can also just use the Convex JS client. ([docs.convex.dev][5])

### When would I add a “real” backend server?

Only if you hit one of these:

* you need a dedicated webhook edge layer (rate limiting, filtering, security), in which case Cloudflare Worker becomes compelling
* you need long-lived processes or heavy chain indexing that Convex actions aren’t ideal for
* you want to unify many integrations behind a single gateway service

For the PoC: Convex + bot runner is cleaner.

---

## On your Cloudflare scripting question

Yes, you *can* script Cloudflare tunnel setup and subdomain mapping, but it’s not the best use of sprint time. The real win tonight is:

* quick tunnel for the Mini App dev URL
* no DNS
* no stable hostname
* minimal moving parts

Then, after the PoC works, you can decide:

* keep quick tunnels for dev forever
* or formalize with a named tunnel + subdomain and script it

---

## Summary of what I’d lock in for the sprint

* **Mini App:** Vite + React Router (fastest dev loop in a webview)
* **Wallet:** RainbowKit v3 + wagmi + viem; MetaMask first; optional fallback later
* **Backend:** Convex as primary backend
* **Bot:** Local Node bot runner in polling mode
* **Dev HTTPS:** Cloudflare quick tunnel for the Mini App dev server
* **Convex local:** supported, but use hosted dev deployment tonight for lowest friction ([docs.convex.dev][3])
* **Diagnostics:** global collapsible panel on every page
* **Instant view links:** use Mini App `openLink(..., { try_instant_view: true })` where you control it ([core.telegram.org][2])

---

If you want, next we can convert this into the “inside repo / outside repo” step lists again, updated with:

* Vite + Router choice
* Cloudflare quick tunnel as the default dev URL source
* Convex hosted dev as default
* Bot polling mode as default
* a clean turbo orchestration plan (dev commands) without introducing Docker.

[1]: https://rainbowkit.com/docs/installation?utm_source=chatgpt.com "Installation - RainbowKit"
[2]: https://core.telegram.org/bots/webapps?utm_source=chatgpt.com "Telegram Mini Apps"
[3]: https://docs.convex.dev/cli/local-deployments?utm_source=chatgpt.com "Local Deployments for Development"
[4]: https://docs.convex.dev/functions/http-actions?utm_source=chatgpt.com "HTTP Actions | Convex Developer Hub"
[5]: https://docs.convex.dev/http-api/?utm_source=chatgpt.com "Convex HTTP API | Convex Developer Hub"

</discussion>

<issue-planning>

# Token-Gated Telegram Mini App PoC — GitHub Issue Template + Phase Issues

This doc contains:
1) A reusable GitHub Issue Template (for each PoC phase)
2) A set of numbered issues (user stories) covering the PoC sprint phases we agreed on

Copy/paste into your repo as:
- `.github/ISSUE_TEMPLATE/poc-phase.yml` (recommended)
or (if you prefer classic markdown templates)
- `.github/ISSUE_TEMPLATE/poc-phase.md`

Then copy/paste each numbered issue into your PM agent to create issues.

---

## 1) GitHub Issue Template (YAML form)

> File: `.github/ISSUE_TEMPLATE/poc-phase.yml`

```yml
name: "PoC Phase"
description: "Define a PoC phase with explicit scope, deliverables, and manual validation checklist."
title: "[PoC] <PHASE #> - <SHORT TITLE>"
labels: ["poc", "phase"]
assignees: []
body:
  - type: markdown
    attributes:
      value: |
        Use this template for PoC phases. Keep scope tight. Every phase ends with manual validation steps.
  - type: input
    id: phase
    attributes:
      label: Phase
      description: "Phase number (e.g., 0, 1, 2, 2.5, 3...)"
      placeholder: "e.g., 2"
    validations:
      required: true
  - type: textarea
    id: goal
    attributes:
      label: Goal
      description: "What capability should exist after this phase?"
      placeholder: "After this phase, the bot can /start and show buttons that open the Mini App..."
    validations:
      required: true
  - type: textarea
    id: scope
    attributes:
      label: In Scope
      description: "What is included in this phase?"
      value: |
        -
        -
    validations:
      required: true
  - type: textarea
    id: outofscope
    attributes:
      label: Out of Scope
      description: "What is explicitly not included (to protect timeline)?"
      value: |
        -
        -
    validations:
      required: true
  - type: textarea
    id: deliverables
    attributes:
      label: Deliverables
      description: "Concrete repo artifacts/features that must exist."
      value: |
        -
        -
    validations:
      required: true
  - type: textarea
    id: implementation_notes
    attributes:
      label: Implementation Notes
      description: "Key decisions, conventions, env vars, or pitfalls."
      value: |
        -
        -
    validations:
      required: false
  - type: checkboxes
    id: definition_of_done
    attributes:
      label: Definition of Done
      description: "These must be true before closing the issue."
      options:
        - label: Code merged to main (or phase branch) and builds locally
          required: true
        - label: Manual validation checklist completed and recorded in issue comments
          required: true
        - label: No hardcoded secrets committed (only .env.example updated)
          required: true
        - label: README/notes updated if user-facing behavior changed
          required: false
  - type: textarea
    id: manual_validation
    attributes:
      label: Manual Validation Checklist (fill in for this phase)
      description: "Add grouped checklists. Keep it explicit and testable."
      value: |
        ### Bot UX
        - [ ]
        - [ ]

        ### Mini App UX
        - [ ]
        - [ ]

        ### Convex / Data
        - [ ]
        - [ ]

        ### Dev Workflow
        - [ ]
        - [ ]
    validations:
      required: true
```

---

## 1b) (Optional) Classic Markdown Issue Template

> File: `.github/ISSUE_TEMPLATE/poc-phase.md`

```md
---
name: PoC Phase
about: Define a PoC phase with explicit scope and manual validation
title: "[PoC] <PHASE #> - <SHORT TITLE>"
labels: poc, phase
---

## Phase
<e.g., 2>

## Goal
<What capability should exist after this phase?>

## In Scope
-
-

## Out of Scope
-
-

## Deliverables
-
-

## Implementation Notes
-
-

## Definition of Done
- [ ] Code merged to main (or phase branch) and builds locally
- [ ] Manual validation checklist completed and recorded in issue comments
- [ ] No hardcoded secrets committed (only .env.example updated)
- [ ] README/notes updated if user-facing behavior changed (if applicable)

## Manual Validation Checklist

### Bot UX
- [ ]
- [ ]

### Mini App UX
- [ ]
- [ ]

### Convex / Data
- [ ]
- [ ]

### Dev Workflow
- [ ]
- [ ]
```

---

# 2) Numbered Issues (User Stories / Tasks)

Below are the issues formatted for direct pasting into a PM agent.
Each issue includes: Summary, Scope, Deliverables, and an explicit manual validation checklist grouped by category.

---

## 0) [PoC] 0 — Monorepo skeleton (pnpm + Turborepo) + repo meta files

### Summary

Set up a new monorepo `tg-token-bot` with pnpm workspaces and Turborepo, plus baseline repo docs and placeholder directories for apps/packages/convex/scripts/docs.

### In Scope

* pnpm workspace configuration
* turborepo pipeline config
* repository meta files: README.md, AGENTS.md, .env.example, .gitignore, editor config
* placeholder folders: `apps/`, `packages/`, `convex/`, `scripts/`, `docs/`

### Out of Scope

* any Telegram bot logic
* any Mini App UI
* Convex schema/logic
* Cloudflare/Vercel setup

### Deliverables

* Workspace structure created
* Turbo pipelines (dev/build/lint/typecheck) wired
* Root scripts that run without errors (even if apps are placeholders)
* README + AGENTS with conventions and dev commands

### Manual Validation Checklist

#### Repo / Tooling

* [ ] `pnpm -v` and `pnpm install` succeeds at repo root
* [ ] `pnpm -r lint` runs (can be minimal)
* [ ] `pnpm -r typecheck` runs (can be minimal)
* [ ] `pnpm -r dev` starts placeholder dev processes without crashing
* [ ] `.env.example` exists and contains all planned env var names (empty values)

#### Structure

* [ ] Repo contains: `apps/`, `packages/`, `convex/`, `scripts/`, `docs/`
* [ ] README has: quickstart, dev commands, high-level architecture note
* [ ] AGENTS.md has: how to run, how to test, code conventions, PR hygiene

---

## 1) [PoC] 1 — Telegram bot: /start greeting + buttons (inline, menu, keyboard) + local polling dev

### Summary

Create the Telegram bot app inside the monorepo. Implement `/start` greeting and required buttons:

* Inline buttons: Open app (Mini App), Learn more (external link)
* Menu button: Open app
* Keyboard buttons: User, Admin (routing shortcuts)
  Run the bot locally using long polling for dev.

### In Scope

* Bot project scaffold under `apps/bot`
* `/start` command and messaging
* Inline keyboard with (Open app, Learn more)
* Reply keyboard with (User, Admin)
* Bot menu button configured to open Mini App
* Env var `DEBUG_LOG_IN_CHAT` (stub: just read env; behavior implemented later)

### Out of Scope

* Mini App UI pages (handled later)
* Convex integration (handled later)
* Webhook deployment / HTTPS endpoint for bot (polling only for now)

### Deliverables

* `apps/bot` can run locally and respond to `/start`
* Buttons match spec and don't crash
* Learn more opens `https://agentix.bot` (and we'll later attempt Instant View from within the Mini App)

### Manual Validation Checklist

#### Bot UX

* [ ] Send `/start` → bot replies with greeting message
* [ ] Greeting message contains inline buttons:

  * [ ] "Open app" (web app button)
  * [ ] "Learn more" (URL button to `https://agentix.bot`)
* [ ] Reply keyboard shows two buttons: "User" and "Admin"
* [ ] Bot menu button exists and opens the app

#### Dev Workflow

* [ ] `pnpm dev` (or `pnpm --filter bot dev`) runs the bot in polling mode
* [ ] No secrets committed (token only via env)

---

## 2) [PoC] 2 — Mini App local dev server + Cloudflare quick tunnel + Hello World

### Summary

Create the Mini App UI with local hot reloading and expose it via Cloudflare quick tunnel so Telegram can load it over HTTPS. Implement a Hello World page that reads basic Telegram WebApp context and shows a placeholder SVG icon.

### In Scope

* Mini App scaffold under `apps/web` (Vite + React Router)
* Hello World route (initially `/`)
* Read basic Telegram WebApp context and render it (safe subset)
* Add placeholder SVG icon in top-left
* Cloudflare quick tunnel workflow documented in repo (scripts optional)

### Out of Scope

* Vercel deployment (Phase 2.5)
* Convex integration (Phase 3)
* Full routing UX (choose/user/admin) beyond Hello World

### Deliverables

* Hot reload dev server for UI
* Public HTTPS URL via quick tunnel usable as Telegram Mini App URL
* Hello World page renders inside Telegram webview

### Manual Validation Checklist

#### Dev Workflow / Networking

* [ ] Local dev server starts with HMR
* [ ] Cloudflare quick tunnel produces an HTTPS URL
* [ ] Telegram bot "Open app" points to the tunnel URL and opens successfully

#### Mini App UI

* [ ] Page loads in Telegram webview (no blank screen)
* [ ] Placeholder SVG icon visible top-left
* [ ] Diagnostics section shows:

  * [ ] Telegram WebApp object presence (true/false)
  * [ ] platform / colorScheme (if available)
  * [ ] initData length (not the full raw string)

---

## 2.5) [PoC] 2.5 — Deploy Mini App to Vercel (stable URL)

### Summary

Deploy `apps/web` Mini App to Vercel to produce a stable URL for non-local testing. Keep local tunnel dev loop as primary dev workflow, but confirm Vercel deploy works.

### In Scope

* Vercel project setup for `apps/web`
* Document how to set env vars needed by web app (if any)
* Update bot config so "Open app" can point to Vercel URL when desired

### Out of Scope

* Migrating away from tunnel dev loop (still preferred for sprint)
* Convex integration

### Deliverables

* Vercel deployment live at a stable HTTPS URL
* README updated with "Local dev (tunnel)" and "Vercel deploy" flows

### Manual Validation Checklist

#### Deployment

* [ ] Vercel build and deploy succeed
* [ ] Deployed Mini App opens in Telegram
* [ ] No secrets exposed to client bundle unintentionally

#### Docs

* [ ] README includes both:

  * [ ] tunnel-based dev loop steps
  * [ ] Vercel deployment steps

---

## 3) [PoC] 3 — Convex: initData validation + user profile capture + global Diagnostics drawer + admin debug route

### Summary

Introduce Convex backend. **Critically, implement server-side validation of Telegram's `initData`** using HMAC-SHA256 before trusting any user identity. On Mini App load, send initData to Convex for validation, then upsert a user profile. Add a global Diagnostics drawer available on every page. Create an admin route that shows Convex-backed user data + Telegram data.

### In Scope

* Convex project init under `convex/`
* **initData validation (security-critical)**:
  * Convex action that validates initData signature using bot token + HMAC-SHA256
  * Reject requests with invalid/expired initData (Telegram allows up to ~1 hour validity)
  * Parse validated initData to extract user fields safely
* Convex tables for:
  * users (tgUserId, current username, username history, timestamps)
  * events (optional, but recommended for chronological history)
* Mutations/actions:
  * validateAndUpsertUser (validates initData first, then creates/updates user)
* Mini App:
  * global Diagnostics drawer component (accordion/menu)
  * admin route reads Convex data and shows debug info
  * shows validation status in diagnostics

### Out of Scope

* Wallet logic
* DEBUG_LOG_IN_CHAT behavior (Phase 4)

### Implementation Notes

* **initData validation algorithm** (per Telegram docs):
  1. Parse initData as URL query string
  2. Extract `hash` parameter and remove it from the data
  3. Sort remaining key=value pairs alphabetically
  4. Join with newlines to create data_check_string
  5. Compute `secret_key = HMAC-SHA256(bot_token, "WebAppData")`
  6. Compute `hash = HMAC-SHA256(secret_key, data_check_string)`
  7. Compare computed hash with provided hash (constant-time comparison)
  8. Optionally check `auth_date` is within acceptable window (e.g., 1 hour)
* Never trust client-side parsed initData for identity decisions
* Store raw initData hash in events table for audit trail

### Deliverables

* Convex action that cryptographically validates initData
* User profile created/updated only after successful validation
* Username history array updates when username changes
* Diagnostics drawer visible on all pages showing validation status

### Manual Validation Checklist

#### Security / initData Validation

* [ ] Convex action validates initData before creating/updating user
* [ ] Invalid initData (tampered hash) is rejected with appropriate error
* [ ] Expired initData (auth_date too old) is rejected or flagged
* [ ] Validation uses constant-time comparison to prevent timing attacks

#### Convex / Data

* [ ] Opening Mini App with valid initData creates a user row in Convex
* [ ] Re-opening Mini App updates lastSeenAt/updatedAt
* [ ] If username changes, old username is appended to history and timestamp updated
* [ ] Validation event is logged (success/failure)

#### Mini App UI

* [ ] Diagnostics drawer is available on every page
* [ ] Diagnostics shows initData validation status (valid/invalid/pending)
* [ ] Admin debug route renders Convex user record + Telegram-derived fields

#### Dev Workflow

* [ ] Convex dev deployment works from local web app
* [ ] No runtime errors when Convex is unavailable (UI shows error state)

---

## 4) [PoC] 4 — Bot DEBUG_LOG_IN_CHAT mode (background debug messages)

### Summary

Add an env setting `DEBUG_LOG_IN_CHAT`. When enabled, the bot sends short debug messages to the user chat as key actions occur (open app, signup, wallet connect attempts, etc.). This is intended as a cheap "telemetry" channel for sprint debugging.

### In Scope

* Env var parsing and behavior gating
* A lightweight debug logger utility used in bot handlers
* Debug messages triggered by:

  * /start
  * button presses (where applicable)
  * Mini App sendData / callback events (if used)
  * Convex-side actions that call bot messaging (if implemented)

### Out of Scope

* Rich logging infrastructure
* Log persistence (optional later via Convex events table)

### Deliverables

* DEBUG_LOG_IN_CHAT on/off works reliably
* Debug messages are short, consistent, and not spammy

### Manual Validation Checklist

#### Bot UX

* [ ] With DEBUG_LOG_IN_CHAT=false: no debug messages
* [ ] With DEBUG_LOG_IN_CHAT=true: debug messages appear for:

  * [ ] /start event
  * [ ] user opens Mini App (if detectable)
  * [ ] user navigates user/admin routes (at least one signal)

---

## 5) [PoC] 5 — Full button matrix + routing (choose page, user page skeleton, admin page)

### Summary

Implement all routing behavior and button entry points:

* Inline "Open app" + menu button open the choose page
* Keyboard buttons go directly to user/admin pages
  Choose page includes icon, big buttons, and privacy/terms links.

### In Scope

* Routes:

  * `/choose` (user/admin selection)
  * `/admin` (debug view)
  * `/user` (skeleton view)
* Inline button target = `/choose`
* Menu button target = `/choose`
* Keyboard "User" target = `/user`
* Keyboard "Admin" target = `/admin`
* Privacy/Terms links open `https://agentix.bot/#privacy` (use openLink with try_instant_view where possible)

### Out of Scope

* Wallet connect
* Signature flow
* "Admin close triggers goodbye" (optional bonus; not blocking)

### Deliverables

* All buttons open correct routes
* Choose page UX matches spec
* User page skeleton is ready for wallet features

### Manual Validation Checklist

#### Bot UX

* [ ] Inline "Open app" opens `/choose`
* [ ] Menu button opens `/choose`
* [ ] Keyboard "User" opens `/user`
* [ ] Keyboard "Admin" opens `/admin`
* [ ] Inline "Learn more" opens `https://agentix.bot`

#### Mini App UX

* [ ] `/choose` shows:

  * [ ] top-left placeholder SVG
  * [ ] "User" + "Admin" big buttons
  * [ ] Privacy + Terms links to `https://agentix.bot/#privacy`
* [ ] Diagnostics drawer present on all pages

---

## 6) [PoC] 6 — RainbowKit v3 / wagmi / viem MetaMask connect on user page

### Summary

Add wallet connection UX on `/user` using RainbowKit v3 and latest wagmi/viem with MetaMask connector. Show connected address at top with disconnect.

### In Scope

* Web3 provider setup in `apps/web`
* RainbowKit connect button (or custom button wired to connectors)
* MetaMask connector only for now
* UI states:

  * disconnected → connect button
  * connected → address shown + disconnect button

### Out of Scope

* Saving to Convex (Phase 7)
* WalletConnect/Reown fallback (optional later)
* Signature verification (Phase 8)

### Deliverables

* MetaMask connect works (at least on desktop Telegram; mobile best-effort)
* Connected address visible and stable

### Manual Validation Checklist

#### Mini App UX

* [ ] On `/user`, clicking "Connect wallet" opens MetaMask flow
* [ ] After connect, the connected address displays prominently
* [ ] Disconnect button clears connected state

#### Diagnostics

* [ ] Diagnostics drawer shows connector availability and connection state

---

## 7) [PoC] 7 — Save connected address to Convex (unverified) + realtime wallet list + duplicate warning

### Summary

When a wallet connects, save a new wallet association record in Convex (unverified). Display wallets table from Convex and update in realtime. Allow same wallet to be associated to multiple users for now, but show a warning if already associated elsewhere.

### In Scope

* Convex table: walletAssociations (immutable records with timestamps; soft removal later)
* Mutation: addWalletAssociation (creates new unverified record)
* Query: listWalletAssociationsByUser
* Query: findOtherUsersByWallet (for warning)
* UI:

  * wallets table (Convex realtime)
  * warning banner if wallet already linked to another tg user

### Out of Scope

* Signature verification (Phase 8)
* Removal/de-association (Phase 8)
* Complex chain IDs (can store chainId optionally; PoC focus is address)

### Deliverables

* On connect, wallet record is created in Convex
* Wallet appears in table without refresh
* Duplicate association warning displays

### Manual Validation Checklist

#### Convex / Data

* [ ] Connecting a wallet creates an unverified record with createdAt
* [ ] Wallet list query shows the new record immediately (realtime)

#### Mini App UX

* [ ] Wallet table updates without a page refresh
* [ ] If wallet is associated to another tg user, a warning message appears

---

## 8) [PoC] 8 — Verify wallet (EIP-712 or SIWE-style) + backend signature validation + badge + de-association (soft delete)

### Summary

Add "Verify now" flow: sign a message that includes Telegram username, store signature, and validate it server-side. Mark wallet record verified with verifiedAt. Implement de-association that soft-removes the record (removedAt), never deletes history.

### In Scope

* Signing flow:

  * message includes telegram username (and tg user id + nonce recommended)
  * sign via MetaMask through wagmi/viem
* Convex action/mutation:

  * verifySignatureAndMarkVerified
  * verify by recovering signer address and matching associated wallet address
* UI:

  * verified/unverified badge
  * verify now button only when unverified
  * remove/de-associate button for each wallet record
  * removing sets removedAt and hides from "active list" (optional filter to show history)

### Out of Scope

* Admin close callback + goodbye message (optional)
* On-chain eligibility checks
* Group gating enforcement

### Deliverables

* Verified badge flips after successful signature validation
* Signature payload stored for audit
* Remove/de-associate sets removedAt and preserves record history
* Username history tracking remains intact

### Manual Validation Checklist

#### Wallet Verification

* [ ] Unverified wallet shows "Verify now" button
* [ ] Clicking verify triggers MetaMask signing prompt
* [ ] Signature is stored in Convex alongside wallet record (or linked event)
* [ ] Backend validates signature and marks record verifiedAt/status=verified
* [ ] UI updates in realtime to show "Verified"

#### De-association / History

* [ ] Clicking remove sets removedAt (does not delete record)
* [ ] Removed wallet disappears from active wallet list (or is clearly marked removed)
* [ ] Re-adding the same wallet creates a NEW record with new createdAt

#### Data Integrity

* [ ] All relevant timestamps are present:

  * [ ] users.createdAt / updatedAt / lastSeenAt
  * [ ] wallet.createdAt / updatedAt / verifiedAt / removedAt (as applicable)
* [ ] Username history array updates when username changes

---

## (Optional Bonus) 9) [PoC] 9 — Attempt admin close → bot goodbye message (non-blocking)

### Summary

Attempt to send a "goodbye admin: username" message when admin page closes. Non-blocking; do not let this delay the sprint.

### In Scope

* Best-effort implementation:

  * attempt WebApp sendData on close
  * or explicit "Close app" button that triggers sendData or calls backend endpoint
* Bot receives event and sends goodbye message

### Out of Scope

* Reliably detecting OS-level close without user action
* Complex lifecycle handling

### Manual Validation Checklist

* [ ] Clicking "Close app" from admin page results in bot sending "goodbye admin: <username>"
* [ ] If it fails on a client, fallback is documented and the issue is marked non-blocking

---

## Labels Taxonomy

Recommended labels for organizing issues:

| Label | Description |
|-------|-------------|
| `poc` | Part of the PoC sprint |
| `phase` | A discrete phase with its own deliverables |
| `bot` | Telegram bot related |
| `miniapp` | Mini App UI related |
| `convex` | Convex backend related |
| `web3` | Wallet/blockchain related |
| `dx` | Developer experience improvements |
| `security` | Security-critical item |
| `non-blocking` | Nice-to-have, don't let it delay sprint |

---

## Definition of Done (Standard)

Apply to all phase issues:

1. Code merged to main (or phase branch) and builds locally
2. Manual validation checklist completed and recorded in issue comments
3. No hardcoded secrets committed (only .env.example updated)
4. README/notes updated if user-facing behavior changed
5. Security-sensitive code (initData validation, signature verification) has been reviewed

</issue-planning>