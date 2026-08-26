/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as _shared from "../_shared.js";
import type * as analytics from "../analytics.js";
import type * as approvals from "../approvals.js";
import type * as auth from "../auth.js";
import type * as files from "../files.js";
import type * as invoices from "../invoices.js";
import type * as messages from "../messages.js";
import type * as misc from "../misc.js";
import type * as notifications from "../notifications.js";
import type * as projects from "../projects.js";
import type * as projects_impl from "../projects_impl.js";
import type * as reviewLinks from "../reviewLinks.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  _shared: typeof _shared;
  analytics: typeof analytics;
  approvals: typeof approvals;
  auth: typeof auth;
  files: typeof files;
  invoices: typeof invoices;
  messages: typeof messages;
  misc: typeof misc;
  notifications: typeof notifications;
  projects: typeof projects;
  projects_impl: typeof projects_impl;
  reviewLinks: typeof reviewLinks;
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
