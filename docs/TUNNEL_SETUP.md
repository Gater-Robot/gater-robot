# Cloudflare Tunnel & Deployment Setup

This guide covers how to expose your local development Mini App to Telegram, and deploy to production.

## Why You Need This

Telegram Mini Apps **require HTTPS URLs**. During development, your app runs on `localhost` which Telegram can't access. Solutions:

| Environment | Method | URL Type |
|-------------|--------|----------|
| Development | Cloudflare Quick Tunnel | Random URL (changes each restart) |
| Staging | Named Cloudflare Tunnel | Persistent subdomain |
| Production | Vercel | Custom domain or `*.vercel.app` |

---

## 1. Quick Tunnel (Development)

**Best for:** Quick testing, no setup required

### Install cloudflared

```bash
# macOS
brew install cloudflared

# Linux (Debian/Ubuntu)
curl -L https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/cloudflare-archive-keyring.gpg] https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflare.list
sudo apt update && sudo apt install cloudflared

# Windows
winget install Cloudflare.cloudflared
# or download from: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/
```

### Run Quick Tunnel

```bash
# Terminal 1: Start your web app
pnpm dev

# Terminal 2: Create tunnel
cloudflared tunnel --url http://localhost:5173
```

Output:
```
Your quick tunnel has been created!
https://random-words-here.trycloudflare.com
```

### Update Bot with Tunnel URL

1. Copy the tunnel URL
2. Go to [@BotFather](https://t.me/BotFather)
3. `/mybots` → Select your bot → **Bot Settings** → **Menu Button**
4. Set the URL to your tunnel URL

**Note:** URL changes each time you restart cloudflared. For persistent URLs, use a named tunnel.

---

## 2. Named Tunnel (Staging/Persistent Dev)

**Best for:** Consistent URL across restarts, team sharing

### One-Time Setup

```bash
# Login to Cloudflare
cloudflared tunnel login
# This opens a browser - select your Cloudflare account

# Create a named tunnel
cloudflared tunnel create gater-robot-dev
# Note the tunnel ID (e.g., a1b2c3d4-...)

# Create config file
mkdir -p ~/.cloudflared
```

Create `~/.cloudflared/config.yml`:
```yaml
tunnel: a1b2c3d4-your-tunnel-id
credentials-file: /Users/yourname/.cloudflared/a1b2c3d4.json

ingress:
  - hostname: gater-dev.yourdomain.com
    service: http://localhost:5173
  - service: http_status:404
```

### DNS Setup (Cloudflare Dashboard)

1. Go to your domain in Cloudflare Dashboard
2. DNS → Add Record:
   - Type: `CNAME`
   - Name: `gater-dev`
   - Target: `a1b2c3d4.cfargotunnel.com` (your tunnel ID)
   - Proxy: ON (orange cloud)

### Run Named Tunnel

```bash
# Terminal 1: Start web app
pnpm dev

# Terminal 2: Start named tunnel
cloudflared tunnel run gater-robot-dev
```

Now your app is always at `https://gater-dev.yourdomain.com`

---

## 3. Vercel Deployment (Production)

**Best for:** Production, automatic deploys from git

### Initial Setup

```bash
# Install Vercel CLI
pnpm add -g vercel

# Login
vercel login

# Deploy (first time - follow prompts)
vercel
```

### Configure for Telegram

After first deploy, you'll get a URL like `https://gater-robot.vercel.app`

1. Update BotFather menu button to Vercel URL
2. Set `WEBAPP_URL` environment variable:
   ```bash
   vercel env add WEBAPP_URL
   # Enter: https://gater-robot.vercel.app
   ```

### Auto-Deploy from Git

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Import your GitHub repo
3. Configure:
   - Framework: Vite
   - Root Directory: `apps/web` (if monorepo)
   - Build Command: `pnpm build`
   - Output Directory: `dist`

Now every push to `main` auto-deploys.

---

## 4. BotFather Configuration

Open [@BotFather](https://t.me/BotFather) in Telegram and run these commands.

### Create Bot (First Time Only)

```
/newbot
→ Enter display name: "Gater Robot"
→ Enter username: gater_robot_bot (must end in 'bot')
→ Copy the token to BOT_TOKEN in .env
```

### Set Bot Commands

```
/mybots
→ Select @YourBot
→ Edit Bot
→ Edit Commands
→ Send this text:

start - Start the bot and open the mini app
admin - Toggle admin mode (admins only)
help - Show help message
```

### Set Bot Description

```
/mybots
→ Select @YourBot
→ Edit Bot
→ Edit Description
→ Send:

Token-gated Telegram communities. Connect your wallet, verify with ENS, and join exclusive groups based on token holdings.
```

### Set About Text

```
/mybots
→ Select @YourBot
→ Edit Bot
→ Edit About
→ Send:

Gater Robot lets admins create token-gated private channels. Members verify wallet ownership with SIWE and link ENS identities.
```

### Set Menu Button (Required for Mini App)

```
/mybots
→ Select @YourBot
→ Bot Settings
→ Menu Button
→ Configure menu button
→ Enter URL: https://your-tunnel-or-vercel-url.com
→ Enter button text: Open App
```

### Set Bot Profile Picture (Optional)

```
/mybots
→ Select @YourBot
→ Edit Bot
→ Edit Botpic
→ Send an image (512x512 recommended)
```

### Enable Inline Mode (Optional)

```
/mybots
→ Select @YourBot
→ Bot Settings
→ Inline Mode
→ Turn on
```

### Group Privacy Settings

For the bot to read messages in groups (needed for moderation):

```
/mybots
→ Select @YourBot
→ Bot Settings
→ Group Privacy
→ Turn off (allows bot to see all messages)
```

### Allow Groups

```
/mybots
→ Select @YourBot
→ Bot Settings
→ Allow Groups
→ Turn on
```

---

### Environment Variable for Mini App

The bot code uses `WEBAPP_URL` environment variable:

```javascript
// apps/bot/src/index.js
const webAppUrl = process.env.WEBAPP_URL;

// In keyboard:
Markup.button.webApp('Open App', webAppUrl)
```

### Deep Links

For direct links that open the mini app:
```
https://t.me/YourBotUsername/app?startapp=welcome
```

For links with parameters:
```
https://t.me/YourBotUsername/app?startapp=gate_123
```

---

## 5. Environment Variables Summary

### Development (.env)

```bash
# Use your current tunnel URL
WEBAPP_URL=https://random-words.trycloudflare.com
```

### Staging (.env.staging)

```bash
# Named tunnel subdomain
WEBAPP_URL=https://gater-dev.yourdomain.com
```

### Production (.env.production)

```bash
# Vercel or custom domain
WEBAPP_URL=https://gater-robot.vercel.app
# or
WEBAPP_URL=https://app.gater-robot.com
```

---

## 6. Quick Reference Commands

```bash
# === QUICK TUNNEL ===
cloudflared tunnel --url http://localhost:5173

# === NAMED TUNNEL ===
# Setup (one-time)
cloudflared tunnel login
cloudflared tunnel create gater-robot-dev
cloudflared tunnel route dns gater-robot-dev gater-dev.yourdomain.com

# Run
cloudflared tunnel run gater-robot-dev

# List tunnels
cloudflared tunnel list

# Delete tunnel
cloudflared tunnel delete gater-robot-dev

# === VERCEL ===
# Deploy preview
vercel

# Deploy production
vercel --prod

# Set env var
vercel env add WEBAPP_URL

# List deployments
vercel ls
```

---

## 7. Troubleshooting

### Tunnel URL not working in Telegram

1. Ensure URL uses HTTPS (not HTTP)
2. Check cloudflared is still running
3. Test URL in browser first
4. Clear Telegram cache: Settings → Data and Storage → Clear Web App Data

### "WebApp not available" error

1. Verify BotFather menu button URL is correct
2. Check WEBAPP_URL env var in bot
3. Ensure web app is running on correct port

### Named tunnel not connecting

```bash
# Check tunnel status
cloudflared tunnel info gater-robot-dev

# Check credentials
ls ~/.cloudflared/

# Re-authenticate
cloudflared tunnel login
```

### Vercel deploy failing

1. Check build logs in Vercel dashboard
2. Ensure `apps/web/package.json` has correct build script
3. Verify Node version matches (check `.nvmrc` or `package.json` engines)

---

## 8. Security Notes

- **Never commit** tunnel credentials (`*.json` files)
- Quick tunnel URLs are **public** - don't use with real data
- For production, use Vercel with proper auth
- Set `TELEGRAM_INITDATA_MAX_AGE_SECONDS` to limit token validity

---

## Next Steps

After setting up your tunnel:

1. Run the bot: `pnpm --filter @gater/bot dev`
2. Run the web app: `pnpm --filter @gater/web dev`
3. Start the tunnel: `cloudflared tunnel --url http://localhost:5173`
4. Open Telegram → Your Bot → Menu Button
5. Mini App should load!
