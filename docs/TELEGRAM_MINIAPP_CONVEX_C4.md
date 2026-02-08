# Telegram + Mini App + Convex (C4)

This is a C4-style view of the current system for judges.

## C4 Level 1: System Context

```mermaid
flowchart LR
  classDef person fill:#0F172A,stroke:#334155,color:#E2E8F0;
  classDef system fill:#1D4ED8,stroke:#1E40AF,color:#DBEAFE;
  classDef ext fill:#7C3AED,stroke:#5B21B6,color:#EDE9FE;
  classDef data fill:#0F766E,stroke:#115E59,color:#CCFBF1;

  Admin[Telegram Admin]:::person
  Member[Telegram Member]:::person

  TG[Telegram Platform<br/>Bot API + Mini App Host]:::ext
  MiniApp[Gater Mini App<br/>apps/webapp]:::system
  Bot[Gater Bot<br/>apps/bot]:::system
  Convex[Convex Backend<br/>Queries/Mutations/Actions]:::system
  DB[(Convex DB)]:::data

  RPC[EVM RPC / Chains]:::ext
  LIFI[LI.FI Widget]:::ext
  ENS[ENS + Avatar Resolution]:::ext

  Admin -->|/start, admin actions| TG
  Member -->|open app, join flows| TG

  TG -->|webhook/polling updates| Bot
  TG -->|launches Mini App with initData| MiniApp

  Bot -->|secure writes + checks| Convex
  MiniApp -->|secure reads/writes| Convex
  Convex --> DB

  MiniApp -->|wallet + token reads| RPC
  Convex -->|eligibility checks| RPC
  MiniApp --> LIFI
  MiniApp --> ENS
```

## C4 Level 2: Container View (Inside Gater System)

```mermaid
flowchart TB
  classDef boundary fill:#0B1020,stroke:#475569,color:#E2E8F0;
  classDef container fill:#2563EB,stroke:#1D4ED8,color:#DBEAFE;
  classDef data fill:#0F766E,stroke:#115E59,color:#CCFBF1;
  classDef ext fill:#7C3AED,stroke:#5B21B6,color:#EDE9FE;
  classDef person fill:#0F172A,stroke:#334155,color:#E2E8F0;

  Admin[Admin]:::person
  User[User]:::person
  Telegram[Telegram Cloud]:::ext
  Chain[EVM RPC/Chains]:::ext

  subgraph GaterRobot["Gater Robot System Boundary"]
    direction TB
    BotC[Container: Bot Service<br/>apps/bot<br/>Commands, moderation triggers]:::container
    WebC[Container: Mini App Frontend<br/>apps/webapp<br/>Admin/member UX]:::container
    ConvexC[Container: Convex Functions<br/>convex/<br/>Auth, org/gate logic, checks]:::container
    RegC[Container: Chain Registry Package<br/>packages/chain-registry<br/>supported chains + RPC utils]:::container
    DbC[(Container: Convex DB<br/>users/orgs/channels/gates/memberships)]:::data
  end

  Admin --> Telegram
  User --> Telegram

  Telegram -->|Bot updates| BotC
  Telegram -->|Mini App launch + initData| WebC

  BotC -->|mutations/actions| ConvexC
  WebC -->|queries/mutations| ConvexC
  ConvexC --> DbC

  WebC --> RegC
  ConvexC --> RegC
  ConvexC -->|balance/member checks| Chain
  WebC -->|wallet reads + SIWE UX| Chain
```

## What judges should notice

1. Telegram identity is the UX entrypoint; trust decisions are enforced server-side in Convex.
2. Convex is the policy engine: admin writes, channel config, and eligibility checks.
3. Bot and Mini App are separate containers sharing one backend state model.
4. On-chain checks are externalized via RPC/chains, while Telegram control remains through Bot API.
