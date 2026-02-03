## Technical Description

We’re building a **non-custodial access control and identity layer for Telegram communities**: a Telegram bot + Mini App that lets admins create **verifiable token-gated private channels** with continuous enforcement, and lets users join using cryptographic proof of wallet ownership.

### Problem

Today’s token gating is often implemented as:

* one-time checks (easy to bypass later),
* manual allowlists (high admin overhead),
* or fragile integrations that don’t handle multi-wallet users, identity, and ongoing eligibility well.

Communities need a system that is **automated, verifiable, and operationally reliable** while remaining **non-custodial** and simple for users.

### Solution Overview

Our system introduces a structured “membership state machine” for Telegram groups, backed by on-chain data and cryptographic identity:

* **SIWE-based address verification** so users can prove ownership of one or more EVM addresses.
* **Multi-wallet identity**: users can link multiple addresses and select a default identity for community membership checks.
* **ENS-based persona**: users select a preferred ENS name from verified addresses; this becomes their primary identity shown in the mini app and referenced by the bot.
* **Token threshold gating**: admins configure a gate (token address + chain + threshold). The app fetches token metadata (symbol/name/decimals) and validates configuration at creation time.
* **Continuous enforcement**: membership is revalidated on a schedule (and can be triggered on demand for demo/testing). Members falling below threshold are warned and then removed, ensuring the private channel’s membership remains accurate over time.
* **Recovery path**: instead of a hard rejection, ineligible users are guided through a “Get Eligible” flow designed to integrate swap/bridge routing (e.g., via LI.FI) to help them meet requirements and rejoin quickly.

### Architecture

The project is structured as a small set of focused services with clear responsibilities:

1. **Telegram Bot (webhook-driven)**

   * Handles onboarding entry points, admin commands, membership actions (invite / warn / remove), and pinned onboarding messages.
   * Uses deterministic state transitions and idempotency guards to prevent duplicate actions under webhook retries.

2. **Telegram Mini App (frontend)**

   * User onboarding and profile management (wallet linking, ENS selection).
   * Admin tooling for organization setup, channel configuration, and gate creation.
   * Deep link support (`startapp`) enables QR-based onboarding for demos and allows contextual flows (e.g., joining a specific community).

3. **Backend + State (Convex)**

   * Canonical data store for Users, Addresses, Organizations, Channels, Gates, Membership Status, and Event Logs.
   * Real-time updates ensure UI changes propagate immediately (e.g., address status changes from pending → verified without refresh).
   * Scheduled jobs perform revalidation and generate membership actions reliably.

4. **Chain Interaction Layer**

   * On-chain reads for token metadata and user balances for configured gates.
   * Produces verifiable artifacts (e.g., transaction/explorer references where applicable) and maintains consistent eligibility computation rules.

### Security / Trust Model

* **Non-custodial**: the system does not custody user assets.
* **Proof of control**: wallet ownership is established via SIWE signatures.
* **Deterministic enforcement**: membership decisions are computed from explicit rules and on-chain state, and are recorded in an event log for auditing/debugging.

### Scope and Roadmap

MVP focuses on token threshold gating + identity because it is the most reliable and easily verifiable end-to-end flow for a hackathon submission.

Roadmap includes:

* **USDC membership fees / prepaid subscription-style access** (safer than open-ended approvals),
* treasury/payout tooling for community operators,
* richer eligibility policies (multiple assets, role tiers),
* and additional identity signals (social + activity-based gating) where appropriate.

### Demo Plan

The demo is built around a single end-to-end “golden path”:

* Admin configures a gate → user verifies via SIWE + selects ENS identity → user attempts to join → gating succeeds → membership is enforced over time with warn/kick behavior and a clear recovery flow.

This demonstrates practical utility, technical correctness, and operational reliability in a form judges can validate quickly.
