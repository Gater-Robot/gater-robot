# PR Triage Execution Plan

## Overview
Consolidate 6 open PRs into 4 UAT-ready feature branches with phased execution and review gates.

## Current State
| PR | Title | Action |
|----|-------|--------|
| #75 | feat(bot): refine /start and /admin UX | → `feat/4-5-bot` |
| #82 | feat(contracts): merge PR #80 with improvements | → `feat/13-contracts` |
| #84 | feat(convex): consolidated schema, initData | → `feat/8-9-10-convex` |
| #85 | feat: Initialize web app with ENS identity | → `feat/6-webapp` |
| #88 | feat(web): migrate web3 components | Merge into #85, close |
| #97 | feat(agents): ntfy session context | Keep as-is |

---

## Phase 1: Cleanup Stale Branches

### Agent 1A: Delete Duplicate Bot Branches (Bash)
```bash
git push origin --delete codex-2026-02-03/complete-github-issues-#4-and-#5-12-18-23
git push origin --delete codex-2026-02-03/complete-github-issues-#4-and-#5-12-41-54
git push origin --delete codex-2026-02-03/complete-github-issues-#4-and-#5-12-42-29
git push origin --delete codex-2026-02-03/complete-github-issues-#4-and-#5-12-45-33
```

### Review Gate 1: Verify Cleanup
- [ ] Confirm only 1 bot branch remains: `codex-2026-02-03/complete-github-issues-#4-and-#5-12-24-50`
- [ ] Update worklog with Phase 1 completion

---

## Phase 2: Rebase & Rename Feature Branches

### Agent 2A: Bot Branch (#75)
```bash
git fetch origin
git checkout -b feat/4-5-bot origin/codex-2026-02-03/complete-github-issues-#4-and-#5-12-24-50
git rebase origin/develop
git push origin feat/4-5-bot -u
git push origin --delete codex-2026-02-03/complete-github-issues-#4-and-#5-12-24-50
```

### Agent 2B: Convex Branch (#84)
```bash
git fetch origin
git checkout -b feat/8-9-10-convex origin/claude/compare-prs-dual-review-bs85Z
git rebase origin/develop
git push origin feat/8-9-10-convex -u
git push origin --delete claude/compare-prs-dual-review-bs85Z
```

### Agent 2C: Contracts Branch (#82)
```bash
git fetch origin
git checkout -b feat/13-contracts origin/claude/compare-prs-dual-review-42i4Y
git rebase origin/develop
git push origin feat/13-contracts -u
git push origin --delete claude/compare-prs-dual-review-42i4Y
```

### Agent 2D: Web Branch (#85 + #88 consolidated)
```bash
git fetch origin
git checkout -b feat/6-webapp origin/claude/eth-id-ens-poc-KqvYk
git rebase origin/develop
git merge origin/claude/web3-components-migration --no-edit -m "Merge web3-components-migration into feat/6-webapp"
git push origin feat/6-webapp -u
git push origin --delete claude/eth-id-ens-poc-KqvYk
git push origin --delete claude/web3-components-migration
gh pr close 88 --repo Gater-Robot/gater-robot --comment "Closing: consolidated into PR #85 → feat/6-webapp branch"
```

### Review Gate 2: Verify Branches
- [ ] `git branch -r | grep feat/` shows 4 branches
- [ ] No merge conflicts in any branch
- [ ] Update worklog with Phase 2 completion

---

## Phase 3: Update PR Head Branches

### Agent 3A: Update PR References
```bash
# Note: GitHub automatically updates PRs when branches are renamed
# Verify PRs are tracking new branches
gh pr view 75 --repo Gater-Robot/gater-robot --json headRefName
gh pr view 82 --repo Gater-Robot/gater-robot --json headRefName
gh pr view 84 --repo Gater-Robot/gater-robot --json headRefName
gh pr view 85 --repo Gater-Robot/gater-robot --json headRefName
```

### Review Gate 3: Verify PRs
- [ ] PR #75 head branch is `feat/4-5-bot`
- [ ] PR #82 head branch is `feat/13-contracts`
- [ ] PR #84 head branch is `feat/8-9-10-convex`
- [ ] PR #85 head branch is `feat/6-webapp`
- [ ] PR #88 is closed
- [ ] Update worklog with Phase 3 completion

---

## Phase 4: Final Verification & Notification

### Agent 4A: Generate Summary Report
```bash
echo "=== PR Triage Complete ==="
gh pr list --repo Gater-Robot/gater-robot --state open --json number,title,headRefName
git branch -r | grep feat/
```

### Agent 4B: Send Notification
```bash
.agents/bin/ntfy_send \
  --title "PR Triage Complete" \
  --tags "white_check_mark" \
  --click "https://github.com/Gater-Robot/gater-robot/pulls" \
  "Consolidated 6 PRs → 5 PRs. 4 UAT branches ready: feat/4-5-bot, feat/8-9-10-convex, feat/13-contracts, feat/6-webapp"
```

### Review Gate 4: Final Checklist
- [ ] All 4 feat/* branches exist
- [ ] All 4 PRs targeting develop
- [ ] PR #88 closed
- [ ] Notification sent
- [ ] Worklog updated with final status

---

## Worklog Checkpoints

After each phase, update `docs/WORKLOG.md`:
```markdown
### Phase X Complete - [timestamp]
- Completed: [what was done]
- Verified by: [review agent]
- Next: Phase X+1
```

## Recovery Instructions

If session is cut off:
1. Read `docs/WORKLOG.md` for last completed phase
2. Check `git branch -r | grep feat/` for branch state
3. Check `gh pr list` for PR state
4. Resume from next incomplete phase

---

## Execution Order

```
Phase 1 (Cleanup) → Review Gate 1 →
Phase 2 (Rebase/Rename) → Review Gate 2 →
Phase 3 (Update PRs) → Review Gate 3 →
Phase 4 (Verify/Notify) → Review Gate 4 → DONE
```
