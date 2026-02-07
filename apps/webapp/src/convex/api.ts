import { anyApi } from "convex/server"

// Client-side Convex API references.
//
// We intentionally use `anyApi` here to avoid pulling Convex server module types
// (which live outside `apps/webapp/src`) into the Vite app TypeScript build.
export const api = anyApi as any
export const internal = anyApi as any

