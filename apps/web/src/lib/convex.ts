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
  if (import.meta.env.PROD) {
    throw new Error('VITE_CONVEX_URL environment variable is required')
  }
  console.warn('VITE_CONVEX_URL not set - Convex features will not work')
}

/**
 * Convex React Client instance
 *
 * This client connects to the Convex backend and provides real-time
 * subscriptions and mutations.
 */
export const convex = new ConvexReactClient(convexUrl || 'https://placeholder.convex.cloud')
