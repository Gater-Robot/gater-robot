---
name: impl-pr-review-triage-wt
description: Implement a plan in a git worktree, create PR, run parallel code reviews, and triage feedback. Use after discussing and approving a plan that needs implementation.
argument-hint: creates feat/[branch-name], otherwise name is auto-generated
disable-model-invocation: true
allowed-tools: Bash(git status *), Bash(git log *), Bash(git diff *), Bash(git branch --show-current), Bash(git branch -l *), Bash(git show *), Bash(git remote *), Bash(git worktree list), Bash(gh pr list *), Bash(gh pr view *), Bash(gh pr diff *), Bash(gh pr checks *), Bash(gh pr comment *), Bash(gh issue list *), Bash(gh issue view *), Bash(gh issue comment *), Bash(gh api *)
---

# Implement Plan with PR Review & Triage

## Context

Current branch: !`git branch --show-current`
Repository: !`git remote get-url origin 2>/dev/null || echo "local"`

good plan. please do this, but do it in a work tree. 

## 1: Setup Worktree & Branch

1. Create a new git worktree with branch `feat/$ARGUMENTS` (or generate a descriptive branch name if no argument provided)
2. The worktree should branch from the current branch: !`git branch --show-current`
3. Change to the worktree directory

## 2: Agent Implementation

1. Launch sub-agent(s) to implement the approved plan
2. Follow project conventions in CLAUDE.md
3. Ensure code compiles/lints successfully
4. Commit changes with conventional commit messages

## 3: Create Pull Request

1. Push the feature branch to origin
2. Create a PR targeting the parent branch (!`git branch --show-current`)
3. Link to any relevant GitHub issues mentioned in the plan
4. Notify user:
   ```bash
   .agents/bin/ntfy_send --title "PR Created" --tags "rocket" --click "<PR_URL>" "Implementation complete. PR ready for review."
   ```

## 4: Code Review

1. Use the `/pr-review-toolkit:review-pr` skill to launch parallel review sub-agents
2. Wait for all review agents to complete
3. Check for additional automated review comments on the PR:
   ```bash
   gh pr view <PR_NUMBER> --comments
   gh api repos/{owner}/{repo}/pulls/<PR_NUMBER>/comments
   ```

## 5: Triage & Report

Consolidate all feedback from:
- Sub-agent code reviews
- GitHub automated reviews (Copilot, Gemini, etc.)
- Any PR comments

Classify each finding using your expert judgment:

| Category | Criteria |
|----------|----------|
| **Must Fix** | Bugs, security issues, breaking changes, test failures |
| **Should Fix** | Code quality, performance, maintainability concerns |
| **Defer** | Valid improvements but out of scope - create a new GitHub issue with appropriate priority label |
| **Skip** | False positives, style preferences, or incorrect suggestions |

## 6: Final Report

1. Present the categorized summary to the user
2. Notify user:
   ```bash
   .agents/bin/ntfy_send --title "Reviews Complete" --tags "clipboard" --click "<PR_URL>" "Code reviews triaged. Awaiting your decision on next steps."
   ```
3. Recommend next steps based on findings:
   - If must-fix items exist: propose fixing them
   - If only should-fix: ask user preference
   - If clean: recommend merging
