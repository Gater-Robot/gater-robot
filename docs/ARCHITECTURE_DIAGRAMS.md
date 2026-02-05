# Gater Robot — Architecture Diagrams (Slide-Ready)

These diagrams are designed to be **presentation-friendly**:
- dark background
- consistent accent colors per subsystem
- exports cleanly to SVG

## How to use (slides)

1) Paste a diagram into Mermaid Live Editor.
2) Export as **SVG** (preferred for crisp scaling).
3) Drop SVG into Google Slides / Keynote / PowerPoint.

## Theme (shared across all diagrams)

All diagrams below use the same Mermaid `init` theme variables:
- background: `#0B1020`
- webapp/UI: `#2D6CDF`
- Convex/services: `#14B8A6`
- external services: `#A78BFA`
- chains/RPC: `#F59E0B`

---

## Slide 1 — Master: System Context (what talks to what)

```mermaid
%%{init: {"theme":"base","themeVariables":{
  "background":"#0B1020",
  "primaryColor":"#2D6CDF",
  "primaryTextColor":"#EAF2FF",
  "primaryBorderColor":"#2559B8",
  "lineColor":"#6B7280",
  "secondaryColor":"#14B8A6",
  "tertiaryColor":"#A78BFA",
  "fontFamily":"Inter, ui-sans-serif, system-ui"
}}}%%
flowchart LR
  classDef app fill:#2D6CDF,stroke:#2559B8,color:#EAF2FF;
  classDef convex fill:#14B8A6,stroke:#0F766E,color:#071018;
  classDef ext fill:#A78BFA,stroke:#7C3AED,color:#0B1020;
  classDef chain fill:#F59E0B,stroke:#B45309,color:#0B1020;
  classDef db fill:#111827,stroke:#374151,color:#E5E7EB;

  TG[Telegram Client<br/>Mini App WebView]:::ext
  WEB[apps/webapp<br/>Vite + React + shadcn/ui<br/>Router + Providers]:::app

  CONVEX[Convex Backend<br/>Queries + Mutations + Node Actions]:::convex
  DB[(Convex DB<br/>orgs / channels / gates / memberships / addresses)]:::db

  RPC[RPC Providers<br/>Alchemy (preferred) / defaults]:::chain
  EVM[EVM Networks<br/>25+ supported chains]:::chain
  BOTAPI[Telegram Bot API<br/>getMe / getChatMember]:::ext

  LI[LI.FI Widget<br/>Swap/Bridge UX]:::ext
  ENS[ENS + Public RPC<br/>Name/Avatar/Records]:::ext
  WALLET[Wallets<br/>Injected / WalletConnect]:::ext

  TG -->|startParam + initDataRaw| WEB
  WEB -->|queries/secure actions| CONVEX
  CONVEX --> DB

  WEB -->|wagmi/viem calls| RPC
  RPC --> EVM

  CONVEX -->|balance/eligibility checks| RPC
  WEB --> LI
  WEB --> ENS
  WEB --> WALLET

  CONVEX -->|bot permission verify| BOTAPI
```

---

## Slide 2 — Zoom-in: Admin Onboarding + Gate Creation (happy path)

```mermaid
%%{init: {"theme":"base","themeVariables":{
  "background":"#0B1020",
  "primaryColor":"#2D6CDF",
  "primaryTextColor":"#EAF2FF",
  "primaryBorderColor":"#2559B8",
  "lineColor":"#6B7280",
  "secondaryColor":"#14B8A6",
  "tertiaryColor":"#A78BFA",
  "fontFamily":"Inter, ui-sans-serif, system-ui"
}}}%%
sequenceDiagram
  participant TG as Telegram Mini App
  participant WEB as apps/webapp (Admin UX)
  participant CX as Convex (secure actions + internal mutations)
  participant DB as Convex DB
  participant TGA as Telegram Bot API
  participant RPC as RPC (Alchemy/default)

  TG->>WEB: Launch with startapp=admin or org_<orgId>
  WEB->>WEB: Admin mode detect + redirect (/orgs or /orgs/:orgId)

  WEB->>CX: createOrgSecure(initDataRaw, name)
  CX->>CX: validate initData (HMAC) + optional ADMIN_IDS gate
  CX->>DB: insert orgs{ownerTelegramUserId,name}
  DB-->>CX: orgId
  CX-->>WEB: orgId

  WEB->>CX: createChannelSecure(initDataRaw, orgId, telegramChatId, type, title)
  CX->>DB: insert channels{orgId,telegramChatId,...,botIsAdmin:false}
  DB-->>CX: channelId
  CX-->>WEB: channelId

  WEB->>CX: verifyChannelBotAdminSecure(initDataRaw, channelId)
  CX->>DB: read channel + org ownership check
  CX->>TGA: getMe() -> botId
  CX->>TGA: getChatMember(chat_id, botId)
  CX->>CX: require can_restrict_members (admin/creator)
  CX->>DB: patch channels{botIsAdmin:true, verifiedAt:now}
  CX-->>WEB: verified=true

  WEB->>WEB: ChainSelect + TokenAddressField resolve metadata
  WEB->>RPC: read ERC20 name/symbol/decimals
  RPC-->>WEB: metadata

  WEB->>CX: createGateSecure(initDataRaw, orgId, channelId, chainId, tokenAddress, threshold...)
  CX->>DB: insert gates{orgId,channelId,chainId,tokenAddress,threshold,...}
  CX-->>WEB: gateId
```

---

## Slide 3 — Zoom-in: Telegram InitData + SIWE Wallet Linking (secure boundary)

This zoom highlights why we treat **writes** differently than **reads**:
- Queries can parse identity for UX (non-cryptographic).
- Any wallet linking or admin writes must validate Telegram **HMAC initData**.

```mermaid
%%{init: {"theme":"base","themeVariables":{
  "background":"#0B1020",
  "primaryColor":"#2D6CDF",
  "primaryTextColor":"#EAF2FF",
  "primaryBorderColor":"#2559B8",
  "lineColor":"#6B7280",
  "secondaryColor":"#14B8A6",
  "tertiaryColor":"#A78BFA",
  "fontFamily":"Inter, ui-sans-serif, system-ui"
}}}%%
sequenceDiagram
  participant TG as Telegram Client
  participant WEB as apps/webapp
  participant CX as Convex
  participant DB as Convex DB
  participant WALLET as Wallet (wagmi)

  TG->>WEB: initDataRaw (contains user + hash)
  WEB->>CX: SIWE: generateNonce / verifySignature

  Note over CX: MUST validate Telegram initData (HMAC)\nfor wallet-linking + any write
  CX->>CX: validateTelegramInitData(initDataRaw)
  CX-->>CX: userId (trusted)

  CX->>DB: store nonce keyed to userId+address
  DB-->>CX: nonce
  CX-->>WEB: nonce

  WEB->>WALLET: sign SIWE message (domain + nonce)
  WALLET-->>WEB: signature

  WEB->>CX: verifySignature(message, signature, initDataRaw)
  CX->>CX: validate initData (HMAC) again
  CX->>CX: verify SIWE (domain allowlist + nonce match + signature)
  CX->>DB: mark address verified + emit events
  CX-->>WEB: success
```

---

## Slide 4 — Zoom-in: Eligibility + “Get Eligible” Loop (user journey + enforcement)

```mermaid
%%{init: {"theme":"base","themeVariables":{
  "background":"#0B1020",
  "primaryColor":"#2D6CDF",
  "primaryTextColor":"#EAF2FF",
  "primaryBorderColor":"#2559B8",
  "lineColor":"#6B7280",
  "secondaryColor":"#14B8A6",
  "tertiaryColor":"#A78BFA",
  "fontFamily":"Inter, ui-sans-serif, system-ui"
}}}%%
flowchart TB
  classDef user fill:#2D6CDF,stroke:#2559B8,color:#EAF2FF;
  classDef svc fill:#14B8A6,stroke:#0F766E,color:#071018;
  classDef decision fill:#111827,stroke:#374151,color:#E5E7EB;
  classDef warn fill:#F59E0B,stroke:#B45309,color:#0B1020;
  classDef bad fill:#EF4444,stroke:#991B1B,color:#0B1020;
  classDef good fill:#22C55E,stroke:#15803D,color:#071018;

  U[User in Telegram<br/>opens Mini App]:::user
  SIWE[Wallet connect + SIWE verify]:::user
  GATE[Load channel gates<br/>from Convex]:::svc
  CHECK[Eligibility check<br/>onchain balances]:::svc
  D{Eligible?}:::decision
  OK[Allow/keep membership]:::good

  NO[Not eligible]:::bad
  LI[Offer “Get Eligible”<br/>LI.FI swap/bridge]:::warn
  RECHECK[Re-check eligibility]:::svc

  ENF[Bot enforcement loop<br/>warn/remove if below threshold]:::svc

  U --> SIWE --> GATE --> CHECK --> D
  D -->|Yes| OK --> ENF
  D -->|No| NO --> LI --> RECHECK --> D
```

---

## Slide 5 — Zoom-in: Chain Registry as a Single Source of Truth

```mermaid
%%{init: {"theme":"base","themeVariables":{
  "background":"#0B1020",
  "primaryColor":"#2D6CDF",
  "primaryTextColor":"#EAF2FF",
  "primaryBorderColor":"#2559B8",
  "lineColor":"#6B7280",
  "secondaryColor":"#14B8A6",
  "tertiaryColor":"#A78BFA",
  "fontFamily":"Inter, ui-sans-serif, system-ui"
}}}%%
flowchart LR
  classDef pkg fill:#A78BFA,stroke:#7C3AED,color:#0B1020;
  classDef web fill:#2D6CDF,stroke:#2559B8,color:#EAF2FF;
  classDef cx fill:#14B8A6,stroke:#0F766E,color:#071018;
  classDef db fill:#111827,stroke:#374151,color:#E5E7EB;
  classDef rpc fill:#F59E0B,stroke:#B45309,color:#0B1020;

  REG[packages/chain-registry<br/>SUPPORTED_CHAINS + explorers<br/>Alchemy URL helpers]:::pkg

  WEB[apps/webapp<br/>ChainSelect + TokenAddressField<br/>Admin gate form UX]:::web
  CX[Convex<br/>balance/eligibility + admin actions]:::cx
  DB[(Convex DB)]:::db
  RPC[RPC layer<br/>Alchemy preferred<br/>fallback defaults]:::rpc

  WEB -->|imports| REG
  CX -->|imports| REG

  WEB -->|chain picker options| REG
  CX -->|validate supported chainId| REG
  CX -->|getDefaultRpcUrl / getAlchemyHttpUrl| REG --> RPC

  WEB -->|createGateSecure| CX --> DB
  CX -->|eligibility queries| RPC
```

