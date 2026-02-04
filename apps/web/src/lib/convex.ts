/**
 * Convex Client Configuration
 *
 * Sets up the ConvexReactClient for connecting to the Convex backend.
 * Uses the VITE_CONVEX_URL environment variable for the deployment URL.
 */

import { ConvexReactClient } from 'convex/react'

// Get the Convex URL from environment variables
const convexUrl = import.meta.env.VITE_CONVEX_URL

if (!convexUrl) {
  console.warn('VITE_CONVEX_URL is not set. Convex client may not work properly.')
}

/**
 * Convex React Client instance
 *
 * This client connects to the Convex backend and provides real-time
 * subscriptions and mutations.
 */
export const convex = new ConvexReactClient(convexUrl || '')
