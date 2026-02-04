**Auto Session Links:** When running in a Claude Code web session, `ntfy_send` automatically detects the session URL from `CLAUDE_CODE_REMOTE_SESSION_ID` and uses it as the default `--click` link. You can still override with an explicit `--click` URL.

## OpenAI Codex CLI

The OpenAI Codex CLI is a coding agent that can be used alongside Claude for certain tasks.

### Installation

```bash
# Install globally (use npm for codex, pnpm for everything else)
npm i -g @openai/codex
```

### Authentication

Codex requires authentication via ChatGPT Plus/Pro subscription using device auth flow:

```bash
# Start device auth (run in background so it stays alive)
codex login --device-auth 2>/dev/null &

# Or use Claude's background task feature for persistent process
# The auth process will output:
# 1. A URL: https://auth.openai.com/codex/device
# 2. A one-time code (e.g., XXXX-XXXXX)

# Complete auth by:
# 1. Open the URL in browser
# 2. Sign in with ChatGPT account
# 3. Enter the one-time code

# Verify login status
codex login status
```

### Usage

```bash
# Basic exec (read-only sandbox by default)
codex exec "describe this codebase"

# Full access mode (use with caution)
codex -s danger-full-access exec "what can you do?"

# Sandbox modes:
#   read-only         - Default, safe for exploration
#   workspace-write   - Can write to workspace
#   danger-full-access - Full system access
```

### Known Limitations

- **Container sandbox conflict:** In containerized environments (like Claude Code remote), Codex's internal landlock sandbox may conflict with the container's security, causing `Sandbox(LandlockRestrict)` errors even with `danger-full-access`. Codex can still respond but cannot execute filesystem commands.
- **Model:** Uses `gpt-5.2-codex` by default via ChatGPT subscription.
