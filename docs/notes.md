# Development Notes

This document contains setup instructions, tooling notes, and troubleshooting information.

## ntfy_send - Agent Notification Tool

A CLI tool for sending push notifications to the developer via [ntfy.sh](https://ntfy.sh).

**Location:** `.agents/bin/ntfy_send`

### For Claude/AI Agents

**IMPORTANT:** Always use this tool to notify the developer when completing tasks, creating PRs, updating issues, or encountering blockers.

#### Required Format

```bash
.agents/bin/ntfy_send \
  --title "Short Title" \
  --click "https://github.com/..." \
  "Detailed message body"
```

**Always include:**
1. `--title` - Brief action summary (e.g., "PR Created", "Issue Updated")
2. `--click` - Direct link to the GitHub resource (PR, issue, comment)
3. Message body - Details about what was done

#### Standard Agent Notifications

**After creating a PR:**
```bash
.agents/bin/ntfy_send \
  --title "PR Created" \
  --tags "rocket" \
  --click "https://github.com/Gater-Robot/gater-robot/pull/123" \
  "PR #123: Add wallet connection flow

Ready for review. Closes #45, #46."
```

**After updating/commenting on an issue:**
```bash
.agents/bin/ntfy_send \
  --title "Issue Updated" \
  --tags "memo" \
  --click "https://github.com/Gater-Robot/gater-robot/issues/45#issuecomment-123456" \
  "Updated issue #45 with implementation progress.

Completed: Schema design, API routes
Next: Frontend integration"
```

**After completing a task:**
```bash
.agents/bin/ntfy_send \
  --title "Task Complete" \
  --tags "white_check_mark" \
  --click "https://github.com/Gater-Robot/gater-robot/issues/12" \
  "Completed: Initialize monorepo structure

- Created apps/bot, apps/web, convex/
- Set up pnpm workspace
- Added turbo.json"
```

**When blocked or need input:**
```bash
.agents/bin/ntfy_send \
  --title "Blocked - Input Needed" \
  --tags "warning,eyes" \
  --priority high \
  --click "https://github.com/Gater-Robot/gater-robot/issues/20" \
  "Need decision on auth flow.

Options:
1. JWT tokens
2. Session cookies

Waiting for direction on issue #20"
```

**Build/test failures:**
```bash
.agents/bin/ntfy_send \
  --title "Tests Failed" \
  --tags "x,warning" \
  --priority urgent \
  --click "https://github.com/Gater-Robot/gater-robot/actions/runs/12345" \
  "CI failed: 3 tests failing in auth module

See run #12345 for details"
```

---

## Human Developer Setup

### Initial Setup

1. **Set your channel environment variable:**
   ```bash
   export NTFY_CHANNEL=your-channel-name
   ```
   Add this to your `.bashrc` or `.zshrc` for persistence.

2. **Subscribe to notifications:**
   - Install the ntfy app on your phone ([Android](https://play.google.com/store/apps/details?id=io.heckel.ntfy) / [iOS](https://apps.apple.com/us/app/ntfy/id1625396347))
   - Or use the web interface at `https://ntfy.sh/your-channel-name`
   - Subscribe to your channel name

### CLI Options

| Option | Short | Description |
|--------|-------|-------------|
| `--title` | `-t` | Notification title |
| `--priority` | `-p` | min, low, default, high, urgent (or 1-5) |
| `--tags` | `-g` | Comma-separated emoji tags |
| `--click` | `-c` | URL to open when clicked |
| `--actions` | `-a` | Action buttons |
| `--attach` | `-A` | URL to attach as image/file |
| `--email` | `-e` | Also send to email |
| `--delay` | `-d` | Schedule message (e.g., "30min") |
| `--icon` | `-i` | Custom icon URL (must be public HTTP/HTTPS) |
| `--claude` | | Use Claude model icon |
| `--codex` | | Use Codex/OpenAI model icon |
| `--gemini` | | Use Gemini model icon |
| `--help` | `-h` | Show help |
| `--verbose` | `-v` | Show curl command |

### Priority Levels

| Level | Use Case |
|-------|----------|
| `min` / `1` | Background info, no sound |
| `low` / `2` | FYI updates |
| `default` / `3` | Normal notifications |
| `high` / `4` | Important, needs attention soon |
| `urgent` / `5` | Critical, needs immediate attention |

### Emoji Tags (Common)

| Tag | Emoji | Use Case |
|-----|-------|----------|
| `white_check_mark` | ✅ | Success |
| `x` | ❌ | Failure |
| `warning` | ⚠️ | Warning |
| `rocket` | 🚀 | Deploy/Launch/PR |
| `tada` | 🎉 | Celebration |
| `memo` | 📝 | Documentation/Updates |
| `bug` | 🐛 | Bug fix |
| `wrench` | 🔧 | Config/Tools |
| `fire` | 🔥 | Urgent |
| `eyes` | 👀 | Review needed |

Full list: https://docs.ntfy.sh/emojis/

### Model Icons

AI agents can sign their notifications with model-specific icons:

| Flag | Model | Description |
|------|-------|-------------|
| `--claude` | Claude (Anthropic) | Orange/coral Claude logo |
| `--codex` | Codex/OpenAI | Green OpenAI logo |
| `--gemini` | Gemini (Google) | Multicolor Gemini logo |

**Usage Examples:**

```bash
# Claude agent notification
.agents/bin/ntfy_send --claude \
  --title "PR Created" \
  --click "https://github.com/Gater-Robot/gater-robot/pull/123" \
  "Claude created PR #123: Add wallet connection"

# Codex agent notification
.agents/bin/ntfy_send --codex \
  --title "Code Review Complete" \
  "Codex completed review of auth module"

# Gemini agent notification
.agents/bin/ntfy_send --gemini \
  --title "Analysis Done" \
  "Gemini finished security analysis"

# Custom icon (must be public URL)
.agents/bin/ntfy_send -i "https://example.com/my-icon.png" \
  --title "Custom Bot" \
  "Notification with custom icon"
```

**Note:** Icons must be public HTTP/HTTPS URLs. The built-in model icons use raw GitHub content URLs from this repository.

### Action Buttons

Add clickable action buttons:

```bash
# Single action
.agents/bin/ntfy_send \
  --title "PR Ready" \
  --actions "view, Review PR, https://github.com/owner/repo/pull/123" \
  "PR requires your review"

# Multiple actions (semicolon-separated)
.agents/bin/ntfy_send \
  --title "Deploy Approval" \
  --actions "view, View Diff, https://github.com/.../compare; view, Approve, https://github.com/.../merge" \
  "Production deploy pending approval"
```

### Troubleshooting

**Error: NTFY_CHANNEL not set**
```bash
export NTFY_CHANNEL=your-channel-name
```

**Notification not received**
- Check you're subscribed to the correct channel
- Verify channel name matches exactly (case-sensitive)
- Try the web interface: `https://ntfy.sh/your-channel-name`

### References

- [ntfy.sh Documentation](https://docs.ntfy.sh/)
- [Publishing Messages](https://docs.ntfy.sh/publish/)
- [Emoji Tags](https://docs.ntfy.sh/emojis/)
