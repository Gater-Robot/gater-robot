#!/usr/bin/env bash
# Backfill all open issues and PRs to the GitHub Project board
# Run this script once to add all existing items that aren't on the board yet
#
# Usage: ./scripts/backfill-project-board.sh [--dry-run]
#
# Requires: gh cli authenticated with project scope

REPO="Gater-Robot/gater-robot"
PROJECT_NUMBER=1
ORG="Gater-Robot"
DRY_RUN=false

if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
  echo "🔍 DRY RUN MODE - showing what would be added"
  echo ""
fi

echo "📋 Backfilling project board: https://github.com/orgs/$ORG/projects/$PROJECT_NUMBER"
echo ""

# Add issues
echo "📌 Processing open issues..."
issue_count=0
issues=$(gh issue list --repo $REPO --state open --limit 500 --json number --jq '.[].number')
for issue_number in $issues; do
  issue_url="https://github.com/$REPO/issues/$issue_number"
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "  Would add: $issue_url"
  else
    echo -n "  Adding issue #$issue_number... "
    if gh project item-add $PROJECT_NUMBER --owner $ORG --url "$issue_url" 2>/dev/null; then
      echo "✓ added"
    else
      echo "○ (already exists or error)"
    fi
    sleep 0.3  # Rate limiting
  fi
  issue_count=$((issue_count + 1))
done

echo ""
echo "🔀 Processing open PRs..."
pr_count=0
prs=$(gh pr list --repo $REPO --state open --limit 500 --json number --jq '.[].number')
for pr_number in $prs; do
  pr_url="https://github.com/$REPO/pull/$pr_number"
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "  Would add: $pr_url"
  else
    echo -n "  Adding PR #$pr_number... "
    if gh project item-add $PROJECT_NUMBER --owner $ORG --url "$pr_url" 2>/dev/null; then
      echo "✓ added"
    else
      echo "○ (already exists or error)"
    fi
    sleep 0.3  # Rate limiting
  fi
  pr_count=$((pr_count + 1))
done

echo ""
echo "✅ Done! Processed $issue_count issues and $pr_count PRs"
echo ""
echo "View project: https://github.com/orgs/$ORG/projects/$PROJECT_NUMBER"
