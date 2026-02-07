import { cronJobs } from "convex/server"
import { internal } from "./_generated/api"

const crons = cronJobs()

// Sweep stale faucet claims every 2 minutes
crons.interval(
  "sweep stale faucet claims",
  { minutes: 2 },
  internal.faucetActions.sweepStaleClaims,
)

export default crons
