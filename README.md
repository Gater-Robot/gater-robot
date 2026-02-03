# Gater Robot


>**Elevator pitch**
>
>We’re building **Telegram’s missing identity + access layer for crypto communities**: a bot and mini-app that lets admins create **token-gated private channels** in under a minute, and lets users join in seconds.
>
>Members verify wallet ownership with **SIWE**, link multiple addresses, and choose a “favorite” **ENS** identity that shows up inside Telegram. Admins set a simple rule—like “hold 2,000 $BEST”—and our system continuously revalidates membership, warning and removing users who fall below the threshold.
>
>The killer part is the recovery loop: if you’re not eligible, we don’t just reject you—we give you a one-click **Get Eligible** flow so you can swap/bridge into the required token and rejoin instantly. Powered by: **LiFi**.
>
>Today it’s token thresholds; next it’s **USDC membership fees/subscriptions**, community analytics, and fully programmable engagement—turning Telegram groups into real, enforceable, monetizable communities.
>

---

Open in Telegram [@GaterRobot](https://t.me/gaterrobot)

---

## Development

### Cloudflare quick tunnel (Telegram Mini App)

Telegram Mini Apps require a **public HTTPS URL**. For local dev, use Cloudflare quick tunnel:

```bash
pnpm dlx cloudflared tunnel --url http://localhost:5173
```

Copy the generated `https://` URL and use it as your Mini App URL in Telegram (and in any local `.env` config if required by the web app). Replace `5173` with your local dev server port as needed.

> **Tip:** Tunnel URLs change each run—avoid committing them to git.

---

## Hackathon plan

See `docs/FINAL_PLAN.md` for the reconciled 5‑day demo plan and where the older planning docs diverge.
