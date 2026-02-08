# Sprint 2 Environment Setup Guide

Complete environment configuration guide based on actual codebase requirements.

## Environment Variable Locations

This project has **4 separate environments** that each need configuration:

| Location | Config File | Purpose |
|----------|-------------|---------|
| Root `.env` | `.env` | Bot + shared vars |
| Convex Dashboard | (web UI) | Backend functions |
| Web App | `apps/web/.env` | Frontend (VITE_ prefix) |
| Contracts | `packages/contracts/.env` | Deployment scripts |

---

## 1. Root Environment (`.env`)

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### Telegram Bot Configuration

| Variable | Required | How to Get |
|----------|----------|------------|
| `BOT_TOKEN` | **Yes** | [@BotFather](https://t.me/BotFather) → `/newbot` → Copy the token |
| `BOT_USERNAME` | **Yes** | The username you chose (without @), e.g. `gater_robot_bot` |
| `ADMIN_IDS` | **Yes** | Your Telegram user ID. Get it: message [@userinfobot](https://t.me/userinfobot) |
| `WEBAPP_URL` | **Yes** | Your mini-app URL (tunnel or Vercel) |

**Example:**
```bash
BOT_TOKEN=7123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw
BOT_USERNAME=gater_robot_bot
ADMIN_IDS=123456789,987654321
WEBAPP_URL=https://random-words.trycloudflare.com
```

### Convex Configuration

| Variable | Required | How to Get |
|----------|----------|------------|
| `CONVEX_DEPLOYMENT` | **Yes** | Run `npx convex dev` - shown in output |
| `CONVEX_URL` | For CI | Convex Dashboard → Settings → Deployment URL |
| `CONVEX_DEPLOY_KEY` | For CI | Convex Dashboard → Settings → Deploy Keys |

**First-time Convex setup:**
```bash
npx convex login          # Authenticate with Convex
npx convex dev            # Creates deployment, shows URL
```

### Telegram Auth Settings

| Variable | Default | Purpose |
|----------|---------|---------|
| `TELEGRAM_INITDATA_MAX_AGE_SECONDS` | `86400` | How long initData is valid (24h default) |

### Notifications (Agent Tooling)

| Variable | Required | Purpose |
|----------|----------|---------|
| `NTFY_CHANNEL` | Optional | ntfy.sh channel for agent notifications |

---

## 2. Convex Dashboard Environment Variables

**CRITICAL:** The Convex backend runs in the cloud and needs its own environment variables set via the dashboard.

### Steps:

1. Go to [dashboard.convex.dev](https://dashboard.convex.dev)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

| Variable | Value | Used By |
|----------|-------|---------|
| `BOT_TOKEN` | Same as root `.env` | `convex/telegram.js` - initData HMAC validation |
| `TELEGRAM_INITDATA_MAX_AGE_SECONDS` | `86400` | Token expiry validation |
| `MAINNET_RPC_URL` | Your Alchemy/Infura mainnet URL | `convex/ens.ts` - ENS resolution |

**Why BOT_TOKEN in Convex?**
The `validateTelegramInitData` action in `convex/telegram.js:10` uses `process.env.BOT_TOKEN` to verify the HMAC signature of Telegram's initData. Without this, all auth will fail.

**MAINNET_RPC_URL fallback:**
If not set, defaults to `https://cloudflare-eth.com` (see `convex/ens.ts:14`), but this is rate-limited. Use your own RPC for production.

---

## 3. Web App Environment (`apps/web/.env`)

Vite requires `VITE_` prefix for frontend-accessible variables.

Create `apps/web/.env`:
```bash
# WalletConnect Project ID (required for wallet connections)
VITE_WALLET_CONNECT_PROJECT_ID=your-project-id

# Convex deployment URL (auto-set by convex dev usually)
VITE_CONVEX_URL=https://your-deployment.convex.cloud
```

### Getting WalletConnect Project ID

1. Go to [cloud.walletconnect.com](https://cloud.walletconnect.com)
2. Sign up / Log in
3. Create a new project
4. Copy the **Project ID**

**Code reference:** `apps/web/src/lib/wagmi.ts:13`
```typescript
const WALLET_CONNECT_PROJECT_ID = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || 'demo'
```

---

## 4. Contracts Environment (`packages/contracts/.env`)

For deploying the $BEST token to Base and Arc chains.

Create `packages/contracts/.env`:
```bash
# Deployer wallet private key (WITH FUNDS for gas)
DEPLOYER_PRIVATE_KEY=0xabc123...

# Base mainnet RPC
BASE_RPC_URL=https://mainnet.base.org

# Arc chain RPC and chain ID
ARC_RPC_URL=https://rpc.arc.io
ARC_CHAIN_ID=1234
```

### Getting RPC URLs

| Chain | Free RPC | Better Option |
|-------|----------|---------------|
| Base | `https://mainnet.base.org` | Alchemy Base endpoint |
| Ethereum | `https://cloudflare-eth.com` | Alchemy/Infura mainnet |
| Arc | Check Arc documentation | - |

### Getting Alchemy API Key

1. Go to [alchemy.com](https://www.alchemy.com)
2. Create account → Create App
3. Select network (Ethereum Mainnet, Base, etc.)
4. Copy the HTTPS URL

**Format:**
```
https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY
```

---

## 5. Complete Setup Checklist

### Pre-Flight Checks

```bash
# Verify Node version (must be 22+)
node --version

# Install dependencies
pnpm install
```

### Bot Setup

- [ ] Created bot via @BotFather
- [ ] Copied `BOT_TOKEN` to root `.env`
- [ ] Set `BOT_USERNAME` in root `.env`
- [ ] Got your Telegram user ID from @userinfobot
- [ ] Added your ID to `ADMIN_IDS` in root `.env`

### Convex Setup

- [ ] Ran `npx convex login`
- [ ] Ran `npx convex dev` (creates deployment)
- [ ] **Added `BOT_TOKEN` to Convex Dashboard** (Settings → Environment Variables)
- [ ] Added `MAINNET_RPC_URL` to Convex Dashboard (for ENS)

### Web App Setup

- [ ] Created WalletConnect Cloud account
- [ ] Got WalletConnect Project ID
- [ ] Created `apps/web/.env` with `VITE_WALLET_CONNECT_PROJECT_ID`

### Tunnel/URL Setup

- [ ] Installed cloudflared (`brew install cloudflared` on macOS)
- [ ] Started tunnel: `cloudflared tunnel --url http://localhost:5173`
- [ ] Copied tunnel URL to `WEBAPP_URL` in root `.env`
- [ ] Configured BotFather menu button with tunnel URL

### Contracts Setup (if deploying)

- [ ] Created `packages/contracts/.env`
- [ ] Added `DEPLOYER_PRIVATE_KEY` (wallet with funds)
- [ ] Added `BASE_RPC_URL`
- [ ] Added `ARC_RPC_URL` and `ARC_CHAIN_ID`

---

## 6. Verification Commands

```bash
# === TEST BOT ===
cd /home/user/gater-robot
pnpm --filter @gater/bot dev
# Then message /start to your bot in Telegram

# === TEST CONVEX ===
npx convex dev
# Check dashboard for schema deployment

# === TEST WEB APP ===
pnpm --filter @gater/web dev
# Open http://localhost:5173

# === TEST TUNNEL ===
cloudflared tunnel --url http://localhost:5173
# Copy URL, open in Telegram via bot menu button

# === TEST CONTRACTS ===
pnpm --filter @gater/contracts test
```

---

## 7. Common Mistakes

### "Unauthorized" error in Mini App
**Cause:** `BOT_TOKEN` not set in Convex Dashboard
**Fix:** Add `BOT_TOKEN` environment variable in Convex Dashboard → Settings

### ENS resolution failing
**Cause:** No `MAINNET_RPC_URL` or rate-limited default
**Fix:** Add `MAINNET_RPC_URL` to Convex Dashboard with Alchemy/Infura URL

### WalletConnect not working
**Cause:** Missing or invalid `VITE_WALLET_CONNECT_PROJECT_ID`
**Fix:** Create `apps/web/.env` with valid WalletConnect project ID

### Bot says "Mini App URL not configured"
**Cause:** `WEBAPP_URL` not set or tunnel not running
**Fix:** Start tunnel, copy URL to `WEBAPP_URL` in root `.env`, restart bot

### Contracts deployment fails
**Cause:** Missing `DEPLOYER_PRIVATE_KEY` or no funds
**Fix:** Add private key with ETH/gas to `packages/contracts/.env`

---

## 8. Environment Variable Reference

### Root `.env`
```bash
# Required for bot
BOT_TOKEN=7123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw
BOT_USERNAME=gater_robot_bot
ADMIN_IDS=123456789

# Required for mini-app
WEBAPP_URL=https://random-words.trycloudflare.com

# Convex (auto-populated by convex dev)
CONVEX_DEPLOYMENT=your-deployment-name

# Optional
TELEGRAM_INITDATA_MAX_AGE_SECONDS=86400
NTFY_CHANNEL=your-ntfy-channel
```

### Convex Dashboard
```
BOT_TOKEN=7123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw
MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
TELEGRAM_INITDATA_MAX_AGE_SECONDS=86400
```

### `apps/web/.env`
```bash
VITE_WALLET_CONNECT_PROJECT_ID=abc123def456
VITE_CONVEX_URL=https://your-deployment.convex.cloud
```

### `packages/contracts/.env`
```bash
DEPLOYER_PRIVATE_KEY=0xabc...
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
ARC_RPC_URL=https://rpc.arc.io
ARC_CHAIN_ID=1234
```

---

## 9. Service Signup Links

| Service | URL | What You Need |
|---------|-----|---------------|
| Telegram BotFather | https://t.me/BotFather | Bot token |
| Convex | https://convex.dev | Backend deployment |
| WalletConnect Cloud | https://cloud.walletconnect.com | Project ID |
| Alchemy | https://alchemy.com | RPC URLs |
| Infura | https://infura.io | RPC URLs (alternative) |
| ntfy | https://ntfy.sh | Notification channel |
