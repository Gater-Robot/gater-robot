# Sprint 2 Environment Setup Guide

This guide helps you configure all API keys, credentials, and environment variables needed before starting Sprint 2: User Identity.

## Overview

Sprint 2 focuses on:
- Wallet connection (MetaMask via wagmi)
- SIWE (Sign-In With Ethereum) verification
- ENS name/avatar resolution
- $BEST token faucet UI

---

## Required Environment Variables

Copy `.env.example` to `.env` and configure each section:

```bash
cp .env.example .env
```

### 1. Telegram Bot (Already configured in Sprint 1)

| Variable | Description | How to Get |
|----------|-------------|------------|
| `BOT_TOKEN` | Telegram bot API token | [@BotFather](https://t.me/BotFather) → /newbot |
| `BOT_USERNAME` | Bot username (without @) | Set during bot creation |
| `ADMIN_IDS` | Comma-separated Telegram user IDs | Use [@userinfobot](https://t.me/userinfobot) |

### 2. Web App

| Variable | Description | How to Get |
|----------|-------------|------------|
| `WEBAPP_URL` | Public URL of mini-app | Cloudflare tunnel or Vercel URL |

**Setup Steps:**
1. For development: `cloudflared tunnel --url http://localhost:5173`
2. For production: Deploy to Vercel and use the URL

### 3. Convex Backend

| Variable | Description | How to Get |
|----------|-------------|------------|
| `CONVEX_DEPLOYMENT` | Deployment name | `npx convex dev` (creates one) |
| `CONVEX_URL` | Convex HTTP endpoint | Convex Dashboard → Settings |
| `CONVEX_DEPLOY_KEY` | CI/CD deploy key | Convex Dashboard → Settings → Deploy Keys |

**Setup Steps:**
1. Run `npx convex login` to authenticate
2. Run `npx convex dev` to start local development
3. Note the deployment URL from the output

### 4. Telegram initData Validation

| Variable | Description | Default |
|----------|-------------|---------|
| `TELEGRAM_INITDATA_MAX_AGE_SECONDS` | Max age for initData validity | `86400` (24 hours) |

### 5. Notifications (For Agents)

| Variable | Description | How to Get |
|----------|-------------|------------|
| `NTFY_CHANNEL` | ntfy.sh channel name | Choose any unique name |

**Setup Steps:**
1. Go to [ntfy.sh](https://ntfy.sh)
2. Subscribe to your channel on your phone
3. Set the channel name in `.env`

---

## NEW for Sprint 2

### 6. Block Explorer & RPC API Keys

| Variable | Description | How to Get |
|----------|-------------|------------|
| `ETHERSCAN_API_KEY` | Etherscan API for contract verification | [etherscan.io/apis](https://etherscan.io/apis) |
| `ALCHEMY_API_KEY` | Alchemy RPC provider | [alchemy.com](https://www.alchemy.com/) → Create App |
| `INFURA_API_KEY` | Infura RPC provider (backup) | [infura.io](https://www.infura.io/) → Create Project |

**Setup Steps:**
1. Create free accounts on Etherscan, Alchemy, and Infura
2. Generate API keys for each service
3. Add to `.env` file

### 7. WalletConnect

| Variable | Description | How to Get |
|----------|-------------|------------|
| `WALLET_CONNECT_PROJECT_ID` | WalletConnect Cloud project ID | [cloud.walletconnect.com](https://cloud.walletconnect.com/) |

**Setup Steps:**
1. Sign up at WalletConnect Cloud
2. Create a new project
3. Copy the Project ID

### 8. ENS / Mainnet RPC

| Variable | Description | How to Get |
|----------|-------------|------------|
| `MAINNET_RPC_URL` | Ethereum mainnet RPC for ENS resolution | Alchemy/Infura mainnet endpoint |

**Setup Steps:**
1. Use your Alchemy/Infura API key
2. Format: `https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY`
3. Or: `https://mainnet.infura.io/v3/YOUR_API_KEY`

---

## Quick Setup Checklist

### Before Sprint 2 Starts

- [ ] **Telegram Bot**
  - [ ] BOT_TOKEN is set and working
  - [ ] BOT_USERNAME matches your bot
  - [ ] ADMIN_IDS includes your Telegram user ID
  - [ ] Bot responds to /start command

- [ ] **Convex**
  - [ ] Logged in: `npx convex login`
  - [ ] Deployment created: `npx convex dev`
  - [ ] CONVEX_URL is set
  - [ ] Schema deployed successfully

- [ ] **Web App URL**
  - [ ] Cloudflare tunnel running OR
  - [ ] Vercel deployment URL set
  - [ ] WEBAPP_URL configured in BotFather

- [ ] **RPC Providers**
  - [ ] Alchemy account created
  - [ ] ALCHEMY_API_KEY is set
  - [ ] MAINNET_RPC_URL is configured
  - [ ] Test: Can resolve ENS names

- [ ] **WalletConnect**
  - [ ] WalletConnect Cloud account created
  - [ ] WALLET_CONNECT_PROJECT_ID is set

- [ ] **Notifications**
  - [ ] NTFY_CHANNEL is set
  - [ ] ntfy app installed on phone
  - [ ] Test: `.agents/bin/ntfy_send --title "Test" "Setup complete"`

---

## Verification Commands

Run these commands to verify your setup:

```bash
# Check Node version
node --version  # Should be v22+

# Install dependencies
pnpm install

# Start Convex dev server
npx convex dev

# Build contracts
pnpm --filter @gater/contracts build

# Run contract tests
pnpm --filter @gater/contracts test

# Test ntfy notifications
.agents/bin/ntfy_send --title "Setup Test" "Environment ready for Sprint 2"
```

---

## Cloudflare Tunnel for Development

For local development with Telegram Mini App:

```bash
# Install cloudflared
# macOS: brew install cloudflared
# Linux: See https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/

# Start web app
pnpm dev

# In another terminal, create tunnel
cloudflared tunnel --url http://localhost:5173
```

Copy the tunnel URL (e.g., `https://random-words.trycloudflare.com`) and:
1. Set as `WEBAPP_URL` in `.env`
2. Configure in BotFather: /mybots → Your Bot → Bot Settings → Menu Button

---

## Secrets Security

**Never commit:**
- `.env` file
- Private keys
- API keys
- Bot tokens

**Already in .gitignore:**
```
.env
.env.local
.env.*.local
```

---

## Support Resources

| Service | Documentation |
|---------|---------------|
| Telegram Bot API | https://core.telegram.org/bots/api |
| Convex | https://docs.convex.dev |
| wagmi | https://wagmi.sh |
| viem | https://viem.sh |
| WalletConnect | https://docs.walletconnect.com |
| ENS | https://docs.ens.domains |
| Alchemy | https://docs.alchemy.com |
| ntfy | https://docs.ntfy.sh |

---

## Next Steps

After completing this setup:

1. Verify all checkboxes above are complete
2. Run UAT_CHECKLIST.md tests
3. Start Sprint 2 issues in order:
   - Issue #14: Set up wagmi + viem with MetaMask connector
   - Issue #15: Implement wallet connection UI
   - Issue #16: Create SIWE verification flow
   - Issue #17: Build ENS resolution components
