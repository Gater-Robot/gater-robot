# Telegram Bot + Mini App Authentication Architecture Plan

> **Document Type:** Research & Architecture Plan
> **Status:** Ready for Implementation
> **Last Updated:** 2026-02-04
> **Related Issues:** Security hardening for user authentication

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Recommended Architecture](#2-recommended-architecture)
3. [Implementation Approach](#3-implementation-approach)
4. [Code Examples](#4-code-examples)
5. [References](#5-references)

---

## 1. Current State Analysis

### 1.1 The Problem: Trusting Client-Provided IDs

The current design (as documented in `FINAL_PLAN.md` and `erd.mmd`) stores `telegramUserId` directly from client requests without server-side validation. This creates several critical security vulnerabilities:

**Vulnerability 1: User Impersonation**
```
Client → "My telegramUserId is 12345" → Server trusts it → Stores/queries as user 12345
```
An attacker can trivially claim to be any Telegram user by simply sending a different user ID.

**Vulnerability 2: Unauthorized Data Access**
- Attackers can read other users' wallet addresses
- Attackers can view eligibility status of arbitrary users
- Attackers can potentially manipulate membership records

**Vulnerability 3: Admin Privilege Escalation**
- If admin status is determined by `telegramUserId`, attackers can claim admin IDs
- Gate configurations could be modified by unauthorized users

### 1.2 Why This Matters for Gater Robot

| Data at Risk | Impact |
|--------------|--------|
| Wallet addresses | Privacy violation; potential social engineering vector |
| ENS identities | Identity theft within the community |
| Gate configurations | Unauthorized access to private groups |
| Membership status | Join groups without meeting requirements |
| Admin privileges | Full control over organizations |

### 1.3 Current Flow (Insecure)

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│  Telegram App   │         │   Mini App      │         │     Convex      │
│                 │         │   (Frontend)    │         │    (Backend)    │
└────────┬────────┘         └────────┬────────┘         └────────┬────────┘
         │                           │                           │
         │  Opens Mini App           │                           │
         │  (provides initData)      │                           │
         ├──────────────────────────►│                           │
         │                           │                           │
         │                           │  Mutation: upsertUser     │
         │                           │  { telegramUserId: X }    │
         │                           ├──────────────────────────►│
         │                           │                           │  ❌ No validation!
         │                           │                           │  Trusts client ID
         │                           │                           │
```

---

## 2. Recommended Architecture

### 2.1 Overview: Server-Side initData Validation

The secure approach requires validating Telegram's `initData` on the server before trusting any user identity claims. Telegram signs this data with the bot token, making it cryptographically verifiable.

### 2.2 How Telegram initData Validation Works

When a user opens a Mini App, Telegram provides initialization data containing:

| Field | Type | Description |
|-------|------|-------------|
| `user` | Object | User info (id, first_name, last_name, username, etc.) |
| `auth_date` | Number | Unix timestamp when the Mini App was opened |
| `hash` | String | HMAC-SHA-256 signature of all parameters |
| `query_id` | String | (Optional) Unique session identifier |
| `chat_type` | String | (Optional) sender, private, group, supergroup, channel |
| `start_param` | String | (Optional) Deep link parameter |
| `signature` | String | (Optional) Ed25519 signature for third-party validation |

**User Object Fields:**
```typescript
interface TelegramUser {
  id: number;              // Unique Telegram user ID
  first_name: string;      // User's first name
  last_name?: string;      // User's last name (optional)
  username?: string;       // Telegram username (optional)
  language_code?: string;  // IETF language tag
  is_premium?: boolean;    // Premium subscriber status
  photo_url?: string;      // Profile photo URL
  allows_write_to_pm?: boolean; // Bot can message user
}
```

### 2.3 HMAC-SHA-256 Verification Process

The validation follows this cryptographic process:

```
Step 1: Build data-check-string
─────────────────────────────────
Sort all parameters alphabetically (excluding 'hash')
Join with newline: "auth_date=123\nquery_id=abc\nuser={...}"

Step 2: Derive secret key
─────────────────────────────────
secret_key = HMAC-SHA256(bot_token, "WebAppData")
Note: Use "WebAppData" as the HMAC key, bot token as the message

Step 3: Compute signature
─────────────────────────────────
computed_hash = HMAC-SHA256(data_check_string, secret_key)

Step 4: Compare
─────────────────────────────────
if (hex(computed_hash) === received_hash) {
  // Data is authentic and from Telegram
}
```

### 2.4 Recommended Auth Flow: Mini App

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│  Telegram App   │         │   Mini App      │         │     Convex      │
│                 │         │   (Frontend)    │         │    (Backend)    │
└────────┬────────┘         └────────┬────────┘         └────────┬────────┘
         │                           │                           │
         │  Opens Mini App           │                           │
         │  initData = "auth_date=.. │                           │
         │  &user={...}&hash=..."    │                           │
         ├──────────────────────────►│                           │
         │                           │                           │
         │                           │  HTTP Action or Mutation  │
         │                           │  { initData: raw_string } │
         │                           ├──────────────────────────►│
         │                           │                           │
         │                           │           ┌───────────────┴───────────────┐
         │                           │           │ 1. Validate HMAC signature    │
         │                           │           │ 2. Check auth_date freshness  │
         │                           │           │ 3. Extract user from initData │
         │                           │           │ 4. Upsert user in database    │
         │                           │           │ 5. Generate session token     │
         │                           │           └───────────────┬───────────────┘
         │                           │                           │
         │                           │  { sessionToken, user }   │
         │                           │◄──────────────────────────┤
         │                           │                           │
         │                           │  Subsequent requests:     │
         │                           │  Authorization: Bearer    │
         │                           │  <sessionToken>           │
         │                           ├──────────────────────────►│
         │                           │                           │
```

### 2.5 Recommended Auth Flow: Bot Commands

For bot message handlers, authentication is inherently secure because:
1. Messages come through Telegram's servers
2. The `from.id` field is guaranteed by Telegram
3. Bot receives updates via webhook signed with webhook secret

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│  Telegram User  │         │  Telegram API   │         │  Bot (Convex)   │
└────────┬────────┘         └────────┬────────┘         └────────┬────────┘
         │                           │                           │
         │  /start command           │                           │
         ├──────────────────────────►│                           │
         │                           │                           │
         │                           │  Webhook POST             │
         │                           │  X-Telegram-Bot-Api-      │
         │                           │  Secret-Token: <secret>   │
         │                           ├──────────────────────────►│
         │                           │                           │
         │                           │           ┌───────────────┴───────────────┐
         │                           │           │ 1. Verify webhook secret      │
         │                           │           │ 2. Trust update.message.from  │
         │                           │           │ 3. Process command            │
         │                           │           └───────────────┬───────────────┘
         │                           │                           │
```

### 2.6 Session/Token Management Approach

**Option A: Stateless JWT (Recommended for Hackathon)**
- Generate JWT after initData validation
- JWT contains: `{ telegramUserId, iat, exp }`
- Each request validates JWT signature
- No database session table needed
- Expiration: 1-24 hours

**Option B: Stateful Sessions (Production)**
- Store sessions in Convex `sessions` table
- Session contains: `{ userId, createdAt, expiresAt, deviceInfo }`
- Better for: revocation, concurrent session limits, audit trails

### 2.7 Admin User Management

**Recommended: Database-Driven Admin Roles**

```typescript
// Schema addition
admins: defineTable({
  telegramUserId: v.string(),  // Telegram user ID
  role: v.union(
    v.literal("superadmin"),   // Can manage all orgs
    v.literal("org_admin")     // Can manage specific orgs
  ),
  orgId: v.optional(v.id("orgs")), // For org_admin role
  grantedBy: v.string(),       // Who granted admin access
  grantedAt: v.number(),       // Timestamp
})
.index("by_telegram_user", ["telegramUserId"])
.index("by_org", ["orgId"])
```

**Why Database over Environment Variables:**
- Dynamic: Add/remove admins without redeploy
- Auditable: Track who granted access and when
- Scalable: Support org-specific admins
- Secure: Principle of least privilege

**Initial Superadmin Seeding:**
```typescript
// In convex/init.ts or via CLI
// Seed initial superadmin from env var on first deploy
const INITIAL_SUPERADMIN = process.env.INITIAL_SUPERADMIN_TELEGRAM_ID;
```

---

## 3. Implementation Approach

### Phase 1: Basic initData Validation (Hackathon-Safe)

**Goal:** Secure authentication with minimal complexity

**Timeline:** 2-4 hours

**Tasks:**
1. Create `convex/lib/telegramAuth.ts` with HMAC validation helper
2. Create `validateInitData` mutation that:
   - Validates initData signature
   - Checks auth_date is recent (< 1 hour)
   - Upserts user record
   - Returns user data
3. Update Mini App to send raw initData on load
4. Add `withTelegramAuth` wrapper for protected mutations

**Schema Changes:**
```typescript
// Add to existing users table
users: defineTable({
  telegramUserId: v.string(),
  telegramUsername: v.optional(v.string()),
  telegramFirstName: v.optional(v.string()),
  telegramLastName: v.optional(v.string()),
  telegramPhotoUrl: v.optional(v.string()),
  isPremium: v.optional(v.boolean()),
  lastAuthAt: v.number(),  // NEW: Track last authentication
  // ... existing fields
})
```

### Phase 2: Full Auth with Sessions (Post-Hackathon)

**Goal:** Production-ready authentication with session management

**Timeline:** 1-2 days

**Tasks:**
1. Add `sessions` table to schema
2. Generate session tokens (JWT or random UUID)
3. Create session validation middleware
4. Add session expiration handling
5. Implement logout/session revocation
6. Add concurrent session management

**Schema Additions:**
```typescript
sessions: defineTable({
  userId: v.id("users"),
  token: v.string(),           // Hashed session token
  createdAt: v.number(),
  expiresAt: v.number(),
  lastActivityAt: v.number(),
  userAgent: v.optional(v.string()),
  ipAddress: v.optional(v.string()),
})
.index("by_token", ["token"])
.index("by_user", ["userId"])
.index("by_expiry", ["expiresAt"])
```

### Phase 3: Admin Management UI (Stretch)

**Goal:** Self-service admin role management

**Timeline:** 1 day

**Tasks:**
1. Create `admins` table
2. Add admin CRUD mutations
3. Create admin management page in Mini App
4. Add superadmin-only routes
5. Implement admin audit logging

---

## 4. Code Examples

### 4.1 initData Validation Helper

```typescript
// convex/lib/telegramAuth.ts
import crypto from "crypto";

interface ValidatedInitData {
  user: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
    photo_url?: string;
  };
  auth_date: number;
  query_id?: string;
  chat_type?: string;
  start_param?: string;
}

export function validateTelegramInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds: number = 3600 // 1 hour
): ValidatedInitData {
  // Parse the URL-encoded init data
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");

  if (!hash) {
    throw new Error("Missing hash in initData");
  }

  // Remove hash from params for validation
  params.delete("hash");

  // Sort parameters alphabetically and create data-check-string
  const sortedParams = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  // Create secret key: HMAC-SHA256(bot_token, "WebAppData")
  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  // Compute hash: HMAC-SHA256(data_check_string, secret_key)
  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(sortedParams)
    .digest("hex");

  // Verify signature
  if (computedHash !== hash) {
    throw new Error("Invalid initData signature");
  }

  // Check auth_date freshness
  const authDateStr = params.get("auth_date");
  if (!authDateStr) {
    throw new Error("Missing auth_date in initData");
  }

  const authDate = parseInt(authDateStr, 10);
  const now = Math.floor(Date.now() / 1000);

  if (now - authDate > maxAgeSeconds) {
    throw new Error("initData has expired");
  }

  // Parse user data
  const userStr = params.get("user");
  if (!userStr) {
    throw new Error("Missing user in initData");
  }

  const user = JSON.parse(userStr);

  return {
    user,
    auth_date: authDate,
    query_id: params.get("query_id") || undefined,
    chat_type: params.get("chat_type") || undefined,
    start_param: params.get("start_param") || undefined,
  };
}
```

### 4.2 Convex Auth Middleware Pattern

```typescript
// convex/lib/withTelegramUser.ts
import { MutationCtx, QueryCtx } from "../_generated/server";
import { validateTelegramInitData } from "./telegramAuth";
import { Doc } from "../_generated/dataModel";

type CtxWithUser<T> = T & {
  user: Doc<"users">;
  telegramUser: {
    id: number;
    first_name: string;
    username?: string;
  };
};

/**
 * Wrapper that validates Telegram initData and provides authenticated user context.
 * Use for mutations that require authentication.
 */
export function withTelegramUser<
  Ctx extends MutationCtx,
  Args extends { initData: string },
  Returns
>(
  handler: (ctx: CtxWithUser<Ctx>, args: Omit<Args, "initData">) => Promise<Returns>
) {
  return async (ctx: Ctx, args: Args): Promise<Returns> => {
    const { initData, ...restArgs } = args;

    // Get bot token from environment
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      throw new Error("TELEGRAM_BOT_TOKEN not configured");
    }

    // Validate initData
    const validated = validateTelegramInitData(initData, botToken);

    // Upsert user in database
    const telegramUserId = validated.user.id.toString();

    let user = await ctx.db
      .query("users")
      .withIndex("by_telegram_user_id", (q) =>
        q.eq("telegramUserId", telegramUserId)
      )
      .unique();

    if (!user) {
      // Create new user
      const userId = await ctx.db.insert("users", {
        telegramUserId,
        telegramUsername: validated.user.username,
        telegramFirstName: validated.user.first_name,
        telegramLastName: validated.user.last_name,
        telegramPhotoUrl: validated.user.photo_url,
        isPremium: validated.user.is_premium,
        lastAuthAt: Date.now(),
        createdAt: Date.now(),
      });
      user = await ctx.db.get(userId);
    } else {
      // Update last auth time
      await ctx.db.patch(user._id, {
        lastAuthAt: Date.now(),
        telegramUsername: validated.user.username,
        telegramFirstName: validated.user.first_name,
        telegramLastName: validated.user.last_name,
      });
    }

    if (!user) {
      throw new Error("Failed to create/retrieve user");
    }

    // Extend context with user info
    const extendedCtx = {
      ...ctx,
      user,
      telegramUser: validated.user,
    } as CtxWithUser<Ctx>;

    return handler(extendedCtx, restArgs as Omit<Args, "initData">);
  };
}
```

### 4.3 Using the Middleware in Mutations

```typescript
// convex/users.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { withTelegramUser } from "./lib/withTelegramUser";

/**
 * Authenticate user and return their profile.
 * This is the first call made when Mini App loads.
 */
export const authenticate = mutation({
  args: {
    initData: v.string(),
  },
  handler: withTelegramUser(async (ctx, _args) => {
    // User is already upserted by middleware
    // Return user data for the Mini App
    return {
      id: ctx.user._id,
      telegramUserId: ctx.user.telegramUserId,
      telegramUsername: ctx.user.telegramUsername,
      telegramFirstName: ctx.user.telegramFirstName,
      primaryEnsName: ctx.user.primaryEnsName,
      defaultAddressId: ctx.user.defaultAddressId,
    };
  }),
});

/**
 * Get user's linked addresses.
 */
export const getMyAddresses = mutation({
  args: {
    initData: v.string(),
  },
  handler: withTelegramUser(async (ctx, _args) => {
    const addresses = await ctx.db
      .query("addresses")
      .withIndex("by_user_id", (q) => q.eq("userId", ctx.user._id))
      .collect();

    return addresses;
  }),
});

/**
 * Link a new wallet address.
 */
export const linkAddress = mutation({
  args: {
    initData: v.string(),
    address: v.string(),
    siweMessage: v.string(),
    siweSignature: v.string(),
  },
  handler: withTelegramUser(async (ctx, args) => {
    // Verify SIWE signature here...

    // Create address record linked to authenticated user
    const addressId = await ctx.db.insert("addresses", {
      userId: ctx.user._id,
      address: args.address.toLowerCase(),
      status: "verified",
      verifiedAt: Date.now(),
      siweMessage: args.siweMessage,
      siweSignature: args.siweSignature,
    });

    return { addressId };
  }),
});
```

### 4.4 Admin Check Middleware

```typescript
// convex/lib/withAdmin.ts
import { MutationCtx } from "../_generated/server";
import { withTelegramUser } from "./withTelegramUser";
import { Doc, Id } from "../_generated/dataModel";

type AdminRole = "superadmin" | "org_admin";

type CtxWithAdmin<T> = T & {
  user: Doc<"users">;
  admin: Doc<"admins">;
  adminRole: AdminRole;
};

/**
 * Wrapper that requires admin privileges.
 * Chains with withTelegramUser for authentication.
 */
export function withAdmin<
  Ctx extends MutationCtx,
  Args extends { initData: string; orgId?: Id<"orgs"> },
  Returns
>(
  handler: (ctx: CtxWithAdmin<Ctx>, args: Omit<Args, "initData">) => Promise<Returns>,
  options?: { requireSuperadmin?: boolean }
) {
  return withTelegramUser<Ctx, Args, Returns>(async (ctx, args) => {
    // Check if user is an admin
    const admin = await ctx.db
      .query("admins")
      .withIndex("by_telegram_user", (q) =>
        q.eq("telegramUserId", ctx.user.telegramUserId)
      )
      .first();

    if (!admin) {
      throw new Error("Unauthorized: Admin access required");
    }

    // Check for superadmin requirement
    if (options?.requireSuperadmin && admin.role !== "superadmin") {
      throw new Error("Unauthorized: Superadmin access required");
    }

    // For org_admin, verify they have access to the specified org
    if (admin.role === "org_admin" && args.orgId) {
      if (admin.orgId !== args.orgId) {
        throw new Error("Unauthorized: No access to this organization");
      }
    }

    const extendedCtx = {
      ...ctx,
      admin,
      adminRole: admin.role,
    } as CtxWithAdmin<Ctx>;

    return handler(extendedCtx, args);
  });
}

// Usage example
export const updateGate = mutation({
  args: {
    initData: v.string(),
    orgId: v.id("orgs"),
    gateId: v.id("gates"),
    threshold: v.number(),
  },
  handler: withAdmin(async (ctx, args) => {
    // Only admins can reach here
    await ctx.db.patch(args.gateId, {
      threshold: args.threshold,
    });

    // Log the admin action
    await ctx.db.insert("events", {
      userId: ctx.user._id,
      orgId: args.orgId,
      action: "gate_updated",
      metadata: { gateId: args.gateId, threshold: args.threshold },
      createdAt: Date.now(),
    });
  }),
});
```

### 4.5 Mini App Client Integration

```typescript
// apps/webapp/src/lib/telegram.ts

/**
 * Get raw initData from Telegram WebApp SDK
 */
export function getTelegramInitData(): string | null {
  if (typeof window === "undefined") return null;

  // @ts-ignore - Telegram WebApp SDK adds this to window
  const tg = window.Telegram?.WebApp;

  if (!tg) {
    console.warn("Telegram WebApp SDK not available");
    return null;
  }

  return tg.initData || null;
}

/**
 * Get parsed initData (for display only - don't trust this!)
 */
export function getTelegramInitDataUnsafe(): {
  user?: {
    id: number;
    first_name: string;
    username?: string;
  };
} | null {
  if (typeof window === "undefined") return null;

  // @ts-ignore
  const tg = window.Telegram?.WebApp;

  return tg?.initDataUnsafe || null;
}

// apps/webapp/src/hooks/useTelegramAuth.ts (example)
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getTelegramInitData } from "../lib/telegram";
import { useEffect, useState } from "react";

export function useTelegramAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const authenticate = useMutation(api.users.authenticate);

  useEffect(() => {
    async function doAuth() {
      const initData = getTelegramInitData();

      if (!initData) {
        setError(new Error("Not running in Telegram Mini App"));
        setIsLoading(false);
        return;
      }

      try {
        const result = await authenticate({ initData });
        setUser(result);
        setIsAuthenticated(true);
      } catch (err) {
        setError(err as Error);
        console.error("Authentication failed:", err);
      } finally {
        setIsLoading(false);
      }
    }

    doAuth();
  }, [authenticate]);

  return { isAuthenticated, user, isLoading, error };
}
```

### 4.6 Alternative: Using @tma.js/init-data-node Package

For production, consider using the official package instead of manual implementation:

```typescript
// convex/lib/telegramAuth.ts (alternative using package)
// Note: May need to be used in an HTTP action due to Node.js crypto requirements

import { validate, isValid } from "@tma.js/init-data-node";

export function validateTelegramInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds: number = 3600
) {
  // The validate function throws on errors
  validate(initData, botToken, {
    expiresIn: maxAgeSeconds,
  });

  // Parse the validated data
  const params = new URLSearchParams(initData);
  const userStr = params.get("user");

  if (!userStr) {
    throw new Error("Missing user in initData");
  }

  return {
    user: JSON.parse(userStr),
    auth_date: parseInt(params.get("auth_date") || "0", 10),
    query_id: params.get("query_id") || undefined,
    start_param: params.get("start_param") || undefined,
  };
}
```

---

## 5. References

### Official Telegram Documentation
- [Telegram Mini Apps](https://core.telegram.org/bots/webapps) - Official WebApp documentation
- [Init Data](https://docs.telegram-mini-apps.com/platform/init-data) - Detailed initData field reference
- [Validating Data](https://docs.telegram-mini-apps.com/packages/tma-js-init-data-node/validating) - @tma.js/init-data-node validation guide

### Convex Documentation
- [Authentication | Convex Developer Hub](https://docs.convex.dev/auth) - Overview of auth options
- [Custom Auth Integration | Convex](https://docs.convex.dev/auth/custom-auth) - OpenID Connect integration
- [HTTP Actions | Convex](https://docs.convex.dev/functions/http-actions) - Creating HTTP endpoints
- [Auth in Functions | Convex](https://docs.convex.dev/auth/functions-auth) - Using auth in backend functions
- [Wrappers as Middleware](https://stack.convex.dev/wrappers-as-middleware-authentication) - Custom middleware patterns

### Code Examples & Gists
- [Node.js initData Validation](https://gist.github.com/konstantin24121/49da5d8023532d66cc4db1136435a885) - Reference implementation
- [TypeScript & Python Validation](https://gist.github.com/Malith-Rukshan/da02bbf6e0219653c53ec9116cdd37f2) - Multi-language examples

### Security Best Practices
- [How to Secure Telegram Bots](https://bazucompany.com/blog/how-to-secure-a-telegram-bot-best-practices/) - General bot security
- [Seamless Authentication in Telegram Mini Apps](https://medium.com/@miralex13/seamless-authentication-in-telegram-mini-apps-building-a-secure-and-frictionless-user-experience-6249599e2693) - JWT session patterns

### Third-Party Validation (Ed25519)
For sharing data with third parties without exposing bot token:
- **Production Public Key:** `e7bf03a2fa4602af4580703d88dda5bb59f32ed8b02a56c187fe7d34caed242d`
- **Test Environment Key:** `40055058a4ee38156a06562e52eece92a771bcd8346a8c4615cb7376eddf72ec`

---

## Appendix A: Security Checklist

### Pre-Launch Security Review

- [ ] initData validation implemented and tested
- [ ] auth_date freshness check enabled (max 1 hour recommended)
- [ ] Bot token stored securely (environment variable, not in code)
- [ ] All mutations requiring auth use `withTelegramUser` wrapper
- [ ] Admin routes use `withAdmin` wrapper
- [ ] No client-provided telegramUserId trusted without validation
- [ ] Session expiration configured appropriately
- [ ] Rate limiting implemented on auth endpoints
- [ ] Audit logging for admin actions enabled

### Testing Scenarios

1. **Valid initData** - Should authenticate successfully
2. **Expired initData** - Should reject (auth_date > 1 hour old)
3. **Tampered initData** - Should reject (invalid hash)
4. **Missing hash** - Should reject
5. **Missing user** - Should reject
6. **Non-admin accessing admin routes** - Should reject
7. **Org admin accessing other org** - Should reject

---

## Appendix B: Migration Path

### From Insecure to Secure Auth

If existing users were created with unvalidated telegramUserIds:

1. **Don't Delete**: Keep existing user records
2. **Re-authenticate**: On next Mini App open, validate initData
3. **Match by ID**: Link validated identity to existing record
4. **Mark as Verified**: Add `authVerifiedAt` timestamp
5. **Grace Period**: Allow 30 days for users to re-authenticate

```typescript
// Migration helper
export const migrateUserAuth = mutation({
  args: { initData: v.string() },
  handler: async (ctx, args) => {
    const validated = validateTelegramInitData(args.initData, botToken);
    const telegramUserId = validated.user.id.toString();

    // Find existing user (may have been created insecurely)
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_telegram_user_id", (q) =>
        q.eq("telegramUserId", telegramUserId)
      )
      .unique();

    if (existingUser) {
      // Mark as verified
      await ctx.db.patch(existingUser._id, {
        authVerifiedAt: Date.now(),
        lastAuthAt: Date.now(),
      });
    }

    // Continue with normal auth flow...
  },
});
```
