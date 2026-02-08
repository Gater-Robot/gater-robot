# Hackathon Submission Checklist

**Event:** EthGlobal HackMoney 2026
**Deadline:** February 8, 2026 5:00 PM ET (VERIFY — may differ from internal "noon Feb 9" target)
**Judging:** February 9–11, 2026 (async partner judging + finalist live judging)

> **Video limit from EthGlobal: max 3 minutes for partner tracks.**
> Plan: 3:00 main cut + optional 2:50 partner cut. Trim the 4:00 script.

---

## A. SUBMISSION FORM (EthGlobal Hacker Dashboard)

- [ ] **Project title** — "KeyBot" or "Gater" (finalize name)
- [ ] **Project description** — 2–3 paragraph pitch (problem, solution, differentiators)
- [ ] **Repository link** — `https://github.com/Gater-Robot/gater-robot` (must be public)
- [ ] **Demo video** — Upload or link (max 3 min for partner tracks; verify main track limit)
- [ ] **Demo link** — Live mini-app URL (Telegram deep link or web URL)
- [ ] **Logo** — 512×512 square PNG
- [ ] **Cover image** — 640×360 PNG
- [ ] **Screenshots** — 6 screenshots demonstrating key flows
- [ ] **Tech stack tags** — Select all relevant: Convex, Telegram, wagmi, viem, LiFi, ENS, Hardhat, etc.
- [ ] **Prize tracks selected** — ENS, LiFi, (optional: Arc, Yellow, Uniswap Foundation)
- [ ] **Team members** — Add all team members
- [ ] **Transaction IDs** — Mainnet TxIDs for contract deployments + swaps (required for some tracks)

---

## B. VIDEO PRODUCTION

### B1. Pre-Production
- [ ] Finalize script (trim 4:00 → 3:00, cut D11 second-user roast, tighten transitions)
- [ ] Create shot list with exact timestamps for 3:00 version
- [ ] Prepare slide deck / side graphics for picture-in-picture overlay
- [ ] Create architecture diagram (Telegram → Bot → Convex → Chain RPC → LiFi)
- [ ] Create system flow diagram (user journey: connect → verify → check → join → warn → topup)
- [ ] Prepare "legitimizer" bullet overlays (feature bullets that rotate on screen)
- [ ] Prepare character lower-thirds ("Admin: Cipher", "User: Amelia")
- [ ] Generate QR code deep link: `https://t.me/<bot>/<app>?startapp=faucet`
- [ ] Prepare end card graphic with project name + tagline

### B2. Demo Environment Setup (before recording)
- [ ] Clean iPhone — disable all notifications except Telegram
- [ ] Pre-connect wallet in mini-app (no first-launch lag)
- [ ] Pre-cache mini-app (open once, close, reopen for instant load)
- [ ] Pre-seed public chat with bot-cast messages (5–10 "alive" messages)
- [ ] Pre-seed private chat with hype messages
- [ ] Pin KeyBot instructions message in public chat
- [ ] Ensure bot is admin in both groups (invite + ban permissions)
- [ ] Pre-fund demo wallets with enough ETH for gas on Base + Arbitrum
- [ ] Pre-fund demo wallets with BEST tokens for demo scenarios
- [ ] Pre-fund USDC on Arbitrum for cross-chain LiFi demo
- [ ] Test the full flow end-to-end once before recording
- [ ] Set Telegram to dark mode (or whichever looks better on camera)

### B3. Screen Recording (iPhone)
- [ ] **Scene 1:** Cold open — face cam of admin persona (5 sec)
- [ ] **Scene 2:** Admin `/admin on` → admin dashboard in mini-app
- [ ] **Scene 3:** Create org → select channels → checklist → done
- [ ] **Scene 4:** Set gate — threshold + token address + chain dropdown → metadata loads
- [ ] **Scene 5:** Switch to user Amelia — face cam intro (3 sec)
- [ ] **Scene 6:** Public chat → pinned message → tap "Join Private Club" → rejected
- [ ] **Scene 7:** Open mini-app → wallet connected → SIWE signature
- [ ] **Scene 8:** Multi-address table — verify address #3 via SIWE → verified
- [ ] **Scene 9:** ENS identity display — pick default ENS
- [ ] **Scene 10:** Join private club → success → welcome message
- [ ] **Scene 11:** Warning notification → tap → "Get Eligible" button
- [ ] **Scene 12:** LiFi widget — cross-chain swap → success → "Detected 2001.34 BEST"
- [ ] **Scene 13:** QR code CTA (overlay in post-production)
- [ ] **Scene 14:** End card + architecture flash

### B4. Voiceover
- [ ] Write final voiceover script (word-for-word, matches 3:00 cut)
- [ ] Record voiceover audio (quiet room, decent mic)
- [ ] Time voiceover against screen recordings — adjust pacing

### B5. Video Editing
- [ ] Assemble screen recordings in timeline
- [ ] Layer voiceover audio
- [ ] Add slide/diagram overlays as picture-in-picture
- [ ] Add lower-thirds for character intros
- [ ] Add QR code persistent overlay (bottom banner)
- [ ] Add feature bullet rotation overlay (top-right)
- [ ] Add architecture diagram pop-in (last 15 sec)
- [ ] Add end card
- [ ] Add subtle SFX (success chime, notification ping, etc.)
- [ ] Color correct / normalize audio levels
- [ ] Export at 1080p, H.264, under 3:00
- [ ] Watch full video — check for any UI glitches, timing issues, audio sync
- [ ] Optional: create 2:50 "partner cut" variant

### B6. Speaker Video (Stretch)
- [ ] Record face cam clips for intro + transitions
- [ ] Overlay face cam as small circle PIP during key moments

---

## C. IMAGES & BRANDING

- [ ] **Logo (512×512)** — Design or generate a square logo for KeyBot/Gater
- [ ] **Cover image (640×360)** — Hero banner with project name + tagline + key visual
- [ ] **Screenshot 1:** Admin org creation flow
- [ ] **Screenshot 2:** Gate configuration (token address + chain dropdown + threshold)
- [ ] **Screenshot 3:** User wallet + SIWE verification
- [ ] **Screenshot 4:** Multi-address table with ENS identity
- [ ] **Screenshot 5:** Eligibility check result (pass or fail state)
- [ ] **Screenshot 6:** LiFi "Get Eligible" widget with cross-chain swap
- [ ] Ensure all screenshots are clean (no debug panels, no dev tools visible)
- [ ] Resize/crop screenshots to consistent dimensions

---

## D. SYSTEM DIAGRAMS

### D1. Architecture Diagram
- [ ] High-level: User → Telegram → Bot → Convex → Chain RPC
- [ ] Show LiFi Widget integration path
- [ ] Show ENS resolution path
- [ ] Show data flow: initData HMAC → Convex auth → DB operations
- [ ] Clean, professional style (use Excalidraw, Mermaid, or Figma)

### D2. User Journey Flowchart
- [ ] Admin flow: Create org → Add bot → Configure gate → Monitor
- [ ] User flow: Connect wallet → SIWE → Link addresses → Check eligibility → Join/Rejected
- [ ] Remediation flow: Warning → Get Eligible → LiFi swap → Re-check → Rejoin

### D3. Data Model Diagram
- [ ] Show Convex tables: users, addresses, orgs, channels, gates, memberships, events
- [ ] Show relationships between tables

### D4. Sequence Diagram (optional, impressive)
- [ ] SIWE verification flow (wallet → mini-app → Convex → verify → store)
- [ ] Eligibility check flow (user request → sum balances across wallets → compare threshold)
- [ ] Enforcement flow (scheduler → check → warn DM → grace period → kick)

---

## E. GITHUB CLEANUP & PROJECT DOCS

### E1. README.md Overhaul
- [ ] Problem statement (1 paragraph)
- [ ] Solution description (1 paragraph)
- [ ] Key features (bullet list)
- [ ] Architecture diagram (embedded image)
- [ ] Tech stack list with versions
- [ ] How to run locally (pnpm install, env setup, convex dev, bot start, web start)
- [ ] Environment variables reference (.env.example)
- [ ] Deployment instructions
- [ ] Demo link + video link
- [ ] Screenshots section
- [ ] License
- [ ] Team / credits

### E2. Repository Cleanup
- [ ] Verify repo is **public** (or make public before submission)
- [ ] Remove any `.env` files or secrets from git history
- [ ] Ensure `.gitignore` covers: node_modules, .env, dist, .convex/_generated
- [ ] Delete or archive dead branches (keep develop + main + current feature branches)
- [ ] Verify `pnpm install && pnpm build` works cleanly from fresh clone
- [ ] Check that no large binaries are committed (images should be in a CDN or small)
- [ ] Add LICENSE file if missing (MIT recommended for hackathons)

### E3. Commit History
- [ ] Ensure proper version control (no single giant commits)
- [ ] Conventional commit messages throughout (feat, fix, chore, docs)
- [ ] Merge outstanding PRs that are ready
- [ ] Squash/clean up WIP branches

---

## F. DEPLOYMENT & INFRASTRUCTURE

### F1. Web App (Mini-App)
- [ ] Deploy to Vercel (or confirm existing deployment)
- [ ] Set all environment variables in Vercel dashboard
- [ ] Verify HTTPS URL works (required for Telegram Mini App)
- [ ] Test mini-app loads inside Telegram WebView
- [ ] Configure custom domain if desired (optional)

### F2. Bot Deployment
- [ ] Deploy bot to production (Vercel serverless, Railway, or similar)
- [ ] Switch from polling to webhooks for production
- [ ] Set Telegram webhook URL via `setWebhook` API
- [ ] Verify bot responds to `/start` in production
- [ ] Set `WEBAPP_URL` env var to production mini-app URL

### F3. Cloudflare Setup
- [ ] Configure Cloudflare DNS if using custom domain
- [ ] Enable SSL/TLS (Full Strict)
- [ ] Set up Cloudflare Tunnel if needed for bot webhook
- [ ] Test end-to-end through Cloudflare

### F4. Convex
- [ ] Verify Convex production deployment is active
- [ ] Run `npx convex deploy` for production (not just dev)
- [ ] Verify all mutations/queries work in production environment
- [ ] Check Convex dashboard for any errors

### F5. Smart Contracts (Mainnet)
- [ ] Deploy $BEST token to Base mainnet
- [ ] Deploy $BEST token to Arbitrum mainnet (for cross-chain demo)
- [ ] Verify contracts on block explorers (Basescan, Arbiscan)
- [ ] Update frontend with mainnet contract addresses
- [ ] Fund faucet contract with initial BEST supply
- [ ] Record deployment TxIDs for submission

### F6. Uniswap Pools
- [ ] Create BEST/ETH pool on Uniswap (Base)
- [ ] Create BEST/USDC pool on Uniswap (Base) (optional)
- [ ] Add initial liquidity (small amounts for demo)
- [ ] Verify pool is visible in Uniswap UI
- [ ] Verify LiFi can route through the pool
- [ ] Record pool creation TxIDs

### F7. QR Codes
- [ ] Generate QR code for `https://t.me/<bot>/<app>?startapp=faucet`
- [ ] Generate QR code for direct bot link `https://t.me/<bot>?start=demo`
- [ ] Test QR codes on multiple phones
- [ ] Create print-ready versions for video overlay

---

## G. COMPETITOR RESEARCH & MARKET NARRATIVE

### G1. Competitor Analysis
- [ ] **Collab.Land** — Telegram/Discord token gating (how do we differ?)
- [ ] **Guild.xyz** — Role-based access with token gates
- [ ] **Tokenproof** — Token verification for events/access
- [ ] **Lit Protocol** — Token-gated encryption/access
- [ ] **Sismo** — Privacy-preserving attestations
- [ ] Create comparison table: features vs competitors
- [ ] Identify our unique advantages (ENS identity, cross-chain remediation via LiFi, Telegram-native)

### G2. Market Sizing
- [ ] TAM: Total crypto communities (Telegram + Discord) — estimate # of groups
- [ ] SAM: Token-gated communities specifically
- [ ] SOM: Communities on Telegram using EVM tokens
- [ ] Reference data: Telegram monthly active users (1B+), crypto Telegram groups, DeFi users
- [ ] Growth narrative: crypto community management is underserved

### G3. Startup / Growth Narrative
- [ ] Problem statement: communities can't enforce token-based access natively
- [ ] Solution: KeyBot makes it native, automatic, and user-friendly
- [ ] Business model sketch: freemium (free for small groups, paid tiers for analytics/subscriptions)
- [ ] Revenue streams: SaaS fees, premium features, white-label licensing
- [ ] Growth flywheel: more communities → more users verify → more data → better analytics → more communities
- [ ] Roadmap: token gates → paid memberships → analytics → cross-platform (Discord, Farcaster)
- [ ] "Why now" argument: Telegram Mini Apps maturing, ENS adoption growing, cross-chain UX improving via LiFi

---

## H. PRIZE TRACK REQUIREMENTS

### H1. ENS Prize
- [ ] Real ENS code integration (not hard-coded)
- [ ] Functional demo showing ENS resolution, avatar display, identity selection
- [ ] Highlight in video: "ENS as identity layer" moment
- [ ] Mention ENS in project description

### H2. LiFi Prize
- [ ] Cross-chain swap/bridge integration working
- [ ] 2+ EVM chains in user journey (Base + Arbitrum)
- [ ] Working frontend with LiFi Widget
- [ ] Demo video showing LiFi "Get Eligible" flow
- [ ] Open-source repo
- [ ] Mention LiFi in project description

### H3. Arc / Circle (if pursuing)
- [ ] USDC integration for membership deposits
- [ ] Frontend + backend + architecture diagram
- [ ] Uses Circle tools

### H4. Yellow (if pursuing)
- [ ] Yellow SDK / Nitrolite integration
- [ ] 2–3 minute demo video
- [ ] Off-chain session logic + settlement

### H5. Uniswap Foundation (if pursuing)
- [ ] Meaningful v4 integration (not just a pool)
- [ ] TxIDs submitted
- [ ] Repo + README
- [ ] Demo video max 3 minutes

---

## I. ADDITIONAL TASKS (BRAINSTORMED)

### I1. Pre-Submission Testing
- [ ] Full end-to-end test: admin setup → user onboard → eligibility check → join → warning → topup → rejoin
- [ ] Test on multiple devices (iOS, Android)
- [ ] Test with multiple wallets (MetaMask, Rainbow, Coinbase Wallet)
- [ ] Test deep links work from QR code scan
- [ ] Test LiFi widget loads and routes correctly on mainnet
- [ ] Load test: what happens if 10+ people scan QR simultaneously?
- [ ] Verify bot handles errors gracefully (no crashes during judging)

### I2. Demo Telegram Setup
- [ ] Create clean "Best Crypto DAO" public group
- [ ] Create clean "BCD Private Club" private group
- [ ] Add bot as admin to both groups
- [ ] Create 3–5 bot-cast accounts (or use scripted messages)
- [ ] Pre-populate chats with realistic messages
- [ ] Pin instruction message in public group
- [ ] Test invite/kick flow works in production

### I3. Wallet & Token Setup
- [ ] Fund admin wallet with ETH on Base + Arbitrum
- [ ] Fund user demo wallet with ETH on Base + Arbitrum
- [ ] Mint BEST tokens to faucet reserve address
- [ ] Pre-approve any needed token allowances
- [ ] Verify token shows correct icon in wallets (base64 SVG medal)

### I4. Presentation Materials
- [ ] One-liner pitch (for submission title/tagline)
- [ ] Elevator pitch (30 seconds, for if judges ask "what is this?")
- [ ] Technical deep-dive bullets (for technical judges)
- [ ] "What's next" roadmap slide
- [ ] Team bio / why us

### I5. Legal / Compliance
- [ ] No copyrighted images in submission
- [ ] No real user data in demo
- [ ] Demo tokens clearly labeled as demo/test
- [ ] Disclose any pre-existing code per EthGlobal rules
- [ ] Review EthGlobal Code of Conduct compliance

### I6. Post-Submission Prep
- [ ] Be available Feb 9–11 for async judge questions
- [ ] Prepare for possible live finalist presentation
- [ ] Keep demo environment running through judging period
- [ ] Monitor bot for crashes / errors during judging
- [ ] Have a "break glass" plan if something goes down during judging

### I7. Social / Marketing (Optional)
- [ ] Tweet about the project with demo link
- [ ] Post in EthGlobal Discord #show-and-tell
- [ ] Share with friends/community for initial traction during judging

---

## J. PRIORITY ORDER (Time-Critical Path)

If time is extremely limited, do these in order:

### MUST DO (Submission won't work without these)
1. Deploy web app to production URL
2. Deploy bot to production (webhooks)
3. Deploy mainnet contracts + fund wallets
4. Record screen recordings of key flows
5. Record voiceover
6. Edit video (3:00 max)
7. Create logo (512×512) + cover image (640×360)
8. Take 6 screenshots
9. Write project description
10. Fill out submission form

### SHOULD DO (Significantly improves score)
11. Create architecture diagram
12. Overhaul README.md
13. Setup Uniswap pools + verify LiFi routing
14. Generate QR codes + test deep links
15. Create competitor comparison table
16. Write market narrative / growth story
17. Pre-seed Telegram chats for demo
18. Add side graphics / overlays to video
19. Clean up GitHub (merge PRs, delete dead branches)

### NICE TO HAVE (Polish)
20. Speaker video overlay
21. Sequence diagrams
22. Data model diagram
23. Multiple video cuts (main + partner)
24. Social media posts
25. Load testing
26. Startup pitch deck

---

## K. TIME ESTIMATES EXCLUDED

Per project convention, no time estimates are included. Use the priority order in Section J to work through tasks. Check off items as completed. If you're running out of time, everything in "MUST DO" needs to be done; "SHOULD DO" improves your chances; "NICE TO HAVE" is bonus.
