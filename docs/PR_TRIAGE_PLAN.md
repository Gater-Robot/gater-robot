# PR Triage Plan

## Summary
Organizing open PRs into 5 categories and consolidating stacked PRs before UAT.

## Categories

### A: Bot (`apps/bot/`) - Issues #4 + #5
| PR | Keep? | Notes |
|----|-------|-------|
| #74 | **Compare** | feat(bot): add /start + /admin polling bot commands |
| #75 | **Compare** | feat(bot): refine /start and /admin UX |
| #77 | Close | Orphaned - targets merged branch |

### B: Convex (`convex/`) - Issues #7-10
| PR | Keep? | Notes |
|----|-------|-------|
| #84 | **Keep** | Consolidated PR |
| #76 | Close | Duplicate of #84 |
| #78 | Close | Orphaned - targets merged branch |
| #79 | Close | Orphaned - targets merged branch |

### C: Contracts (`contracts/`) - Issue #13
| PR | Keep? | Notes |
|----|-------|-------|
| #82 | **Keep** | Consolidated PR (best of #80 + #81) |
| #80 | Close | Orphaned - targets merged branch |
| #81 | Close | Orphaned - targets merged branch |

### D: Web (`apps/web/`) - Issue #6
| PR | Keep? | Notes |
|----|-------|-------|
| #85 | **Keep** | Base PR for web |
| #88 | **Keep** | Separate feature (web3 components) |
| #93 | Merge into #85 | Stacked improvements |
| #94 | Close | Empty copilot PR |
| #89 | Close | Orphaned - targets merged branch |

### E: Other/Misc
| PR | Keep? | Notes |
|----|-------|-------|
| #95 | **Keep** | Project board automation |

## Execution Steps

1. [ ] Compare #74 vs #75, pick best bot PR
2. [ ] Close orphaned PRs: #77, #78, #79, #80, #81, #89, #94
3. [ ] Close duplicate PR #76
4. [ ] Merge #93 into #85 branch locally
5. [ ] Rebase feature branches onto latest develop
6. [ ] Rename branches:
   - `feat/4-5-bot` ← bot PR branch
   - `feat/8-9-10-convex` ← #84 branch
   - `feat/13-contracts` ← #82 branch
   - `feat/6-webapp` ← #85 branch
7. [ ] UAT test each branch
8. [ ] Merge to develop

## PRs to Close (with comment)

```bash
# Orphaned PRs (base branch was merged)
gh pr close 77 --repo Gater-Robot/gater-robot --comment "Closing: base branch was merged. Work superseded by PR targeting develop directly."
gh pr close 78 --repo Gater-Robot/gater-robot --comment "Closing: base branch was merged. Work consolidated in PR #84."
gh pr close 79 --repo Gater-Robot/gater-robot --comment "Closing: base branch was merged. Work consolidated in PR #84."
gh pr close 80 --repo Gater-Robot/gater-robot --comment "Closing: base branch was merged. Work consolidated in PR #82."
gh pr close 81 --repo Gater-Robot/gater-robot --comment "Closing: base branch was merged. Work consolidated in PR #82."
gh pr close 89 --repo Gater-Robot/gater-robot --comment "Closing: base branch was merged. Web work being tracked in PRs #85 and #88."
gh pr close 94 --repo Gater-Robot/gater-robot --comment "Closing: empty PR from copilot bot."

# Duplicate PR
gh pr close 76 --repo Gater-Robot/gater-robot --comment "Closing: work consolidated in PR #84."
```
