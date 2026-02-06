/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adminActions from "../adminActions.js";
import type * as adminMutations from "../adminMutations.js";
import type * as adminQueries from "../adminQueries.js";
import type * as channels from "../channels.js";
import type * as convex__generated_api from "../convex/_generated/api.js";
import type * as convex__generated_server from "../convex/_generated/server.js";
import type * as eligibility from "../eligibility.js";
import type * as eligibilityQueries from "../eligibilityQueries.js";
import type * as ens from "../ens.js";
import type * as events from "../events.js";
import type * as gates from "../gates.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_balance from "../lib/balance.js";
import type * as lib_telegramBotVerification from "../lib/telegramBotVerification.js";
import type * as lib_telegramInitData from "../lib/telegramInitData.js";
import type * as memberships from "../memberships.js";
import type * as orgs from "../orgs.js";
import type * as policyActions from "../policyActions.js";
import type * as siwe from "../siwe.js";
import type * as telegram from "../telegram.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminActions: typeof adminActions;
  adminMutations: typeof adminMutations;
  adminQueries: typeof adminQueries;
  channels: typeof channels;
  "convex/_generated/api": typeof convex__generated_api;
  "convex/_generated/server": typeof convex__generated_server;
  eligibility: typeof eligibility;
  eligibilityQueries: typeof eligibilityQueries;
  ens: typeof ens;
  events: typeof events;
  gates: typeof gates;
  "lib/auth": typeof lib_auth;
  "lib/balance": typeof lib_balance;
  "lib/telegramBotVerification": typeof lib_telegramBotVerification;
  "lib/telegramInitData": typeof lib_telegramInitData;
  memberships: typeof memberships;
  orgs: typeof orgs;
  policyActions: typeof policyActions;
  siwe: typeof siwe;
  telegram: typeof telegram;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
