# Claude Session Guide

This file helps Claude (and future AI sessions) maintain context and documentation for this project.

## Before Ending a Session

After completing major work, checking in code, or making significant discoveries:

1. **Update `docs/WORKLOG.md`**
   - Update "Current Status" section with phase/sprint status
   - Update "Sprint Progress" table
   - Update "Current Task Context" with next steps
   - Add session notes with what was accomplished

2. **Comment on GitHub Issues**
   - Update relevant sprint issues with progress
   - Mark completed items in acceptance criteria
   - Use: `gh issue comment <number> --repo Gater-Robot/gater-robot --body "..."`

3. **Commit and Push**
   - Use conventional commits: `feat(backend):`, `fix(convex):`, `docs:`, `chore:`
   - Push to the working branch (check WORKLOG.md for current branch)

## Starting a New Session

1. Read `docs/WORKLOG.md` for current status and next steps
2. Check the "Current Task Context" section for what to work on
3. Review relevant GitHub issues for acceptance criteria

## Key Documentation Files

| File | Purpose |
|------|---------|
| `docs/WORKLOG.md` | Current status, sprint progress, session history |
| `docs/FINAL_PLAN.md` | Consolidated hackathon plan with day-by-day tasks |
| `docs/CONTEXT.md` | TL;DR for new chats, demo script reference |
| `docs/findings-gotchas.md` | Technical solutions, code snippets to reuse |
| `docs/notes.md` | Setup instructions, troubleshooting |
| `issues/issues.json` | Issue definitions (run `scripts/create_github_issues.py`) |

## Project Context

- **App:** Telegram token-gated private groups bot and mini-app
- **Stack:** Vite + React Router + Convex + wagmi/viem + TypeScript + shadcn + Tailwind
- **Target:** EthGlobal 2026 HackMoney - Async Hack-a-thon First Place Winner!

## GitHub Project Structure

**Milestones (Sprints):**
- Sprint 1: Foundation (Day 1-2)
- Sprint 2: User Identity (Day 3)
- Sprint 3: Admin + Gates (Day 3-4)
- Sprint 4: Eligibility + LiFi (Day 4)
- Sprint 5: Demo Polish (Day 5)
- Sprint 6: Subscriptions (Stretch)
- Sprint 7: Misc Stretch (Stretch)

**Label Schema:**
- Priority: `P0: Critical`, `P1: High`, `P2: Medium`, `P3: Low`
- Area: `area:bot`, `area:mini-app`, `area:convex`, `area:lifi`, `area:contracts`, `area:hackathon`
- Type: `type:feature`, `type:bug`, `type:chore`, `type:docs`, `type:milestone`
- Status: `blocked`, `needs-review`, `partner-bounty`

## Git Branching Strategy

This project uses a **GitHub Flow + Develop Branch** hybrid workflow:

```
main (stable releases)
  │   • Only receives tested, stable code
  │   • Tagged releases (v1.0.0, v1.1.0, etc.)
  │   • PRs from develop require passing CI + manual approval
  │   • Auto-deploys to vercel
  │
  └── develop (integration/testing)
        │   • Default branch for all PRs
        │   • Integration branch for testing multiple features together
        │   • Merge to main when ready for release
        │
        ├── claude/feature-branch-*
        └── feat/manual-work
```

### Branch Workflow

1. **Feature Development**
   - Create feature branches from `develop`
   - Open PRs targeting `develop` (not main)
   - Merge to `develop` after review

2. **Integration Testing**
   - Test combined features on `develop`
   - Fix integration issues before promoting

3. **Release to Master**
   - Create PR from `develop` → `main`
   - Tag releases on main (e.g., `v1.0.0`)

### PR Conventions

- All PRs should target `develop` unless explicitly releasing to main
- Use conventional commit messages in PR titles
- Link related issues with "Closes #XX" or "Part of #XX"


# Check & Address PR Code Review Comments
When asked to review a Pull Request: use gh cli to read code review comments on the specified PR #.
- install the gh cli if it is not installed
- when reviewer(s) has left comments, summarize them; state whether you believe each one requires addressing now, should be delayed (create a new gh issue) or ignored/not a problem/false positve. present summary and recommend what you think should be done next. wait for user direction to continue fixing (unless otherwise directed to immediately start fixes)

# Agent Tools

## GitHub Project Status (gh_project_status)

**Location:** `.agents/bin/gh_project_status`

Use this tool to update issue/PR status in the GitHub Project board.

**Workflow:**
```
No Status (Backlog) → Todo → In Progress → Waiting for Merge → Done
```

**Commands:**
```bash
# Start working on an issue
.agents/bin/gh_project_status --issue 3 --status "In Progress"

# PR created, waiting for review
.agents/bin/gh_project_status --issue 3 --status "Waiting for Merge"

# List available statuses
.agents/bin/gh_project_status --list-statuses
```

**Agent Checklist:**

Before starting work:
- [ ] Update issue status to "In Progress"
- [ ] Comment on issue with approach/plan

After creating PR:
- [ ] Link PR to issue with "Closes #X" or "Part of #X"
- [ ] Update issue status to "Waiting for Merge"
- [ ] ntfy_send notification with PR link

After PR merged:
- [ ] Status auto-updates to "Done" (built-in workflow)
- [ ] Verify issue was closed

**View Project Board:** https://github.com/orgs/Gater-Robot/projects/1

## Project Board Automation

Issues and PRs are automatically added to the project board via GitHub Actions.

**Automatic Tracking (`.github/workflows/auto-add-to-project.yml`):**
- Triggers on: issue opened/transferred/reopened, PR opened/reopened
- Requires: `PROJECT_TOKEN` secret with `repo` and `project` scopes

**Backfill Script (`scripts/backfill-project-board.sh`):**
```bash
# Dry run - see what would be added
./scripts/backfill-project-board.sh --dry-run

# Add all open issues and PRs to project
./scripts/backfill-project-board.sh
```

**Manual Backfill Workflow (`.github/workflows/backfill-project.yml`):**
- Trigger manually from Actions tab
- Useful after setting up automation or if items were missed
- Requires same `PROJECT_TOKEN` secret as automatic tracking

## Notifications (ntfy_send)

**Location:** `.agents/bin/ntfy_send`

Use this tool to notify the developer after completing tasks, creating PRs, updating issues, or encountering blockers.

**Required format:**
```bash
.agents/bin/ntfy_send \
  --title "Action Title" \
  --tags "emoji_tag" \
  --click "https://github.com/Gater-Robot/gater-robot/..." \
  "Message body with details"
```

**Always include:**
- `--title` - Brief action summary
- `--click` - Direct link to GitHub resource (PR, issue, comment)
- Message body - What was done

See `docs/notes.md` for full documentation and examples.

# Important

- Never use npm. Only use pnpm.
- Always use gh cli to check for issues matching the work we are doing. Use gh cli to manage PRs, link to issues, and post comments on issues updating work statuses. Close issues when PRs get merged. Follow software development lifecycle and project management best practices.
- After completing a task, notify the user using `.agents/bin/ntfy_send` with a clickable link to the relevant GitHub resource.
- When creating GitHub issues, always assign a priority label (`P0: Critical`, `P1: High`, `P2: Medium`, `P3: Low`). If priority is unclear, ask the user for clarification via ntfy_send before creating the issue.