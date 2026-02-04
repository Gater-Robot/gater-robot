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

## Development tunnel (Cloudflare Quick Tunnel)

Telegram Mini Apps must be served from a **public HTTPS URL** during development. We use Cloudflare Quick Tunnel
to expose the local Mini App so it can be opened inside Telegram.

**Prereqs**
- Install `cloudflared` (https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/)

**Run the Mini App and tunnel**
```bash
# terminal 1: run the web app (assumes it starts on :5173)
pnpm --filter @gater/web dev

# terminal 2: expose it publicly
cloudflared tunnel --url http://localhost:5173
```

Cloudflared will print a public HTTPS URL (e.g. `https://<random>.trycloudflare.com`). Use this URL when
opening the Mini App in Telegram (and for any `startapp` deep links). Avoid committing personal tunnel URLs.

---

## Hackathon plan

See `docs/FINAL_PLAN.md` for the reconciled 5‑day demo plan and where the older planning docs diverge.
