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

# Global counters (set by process_items)
ISSUE_COUNT=0
PR_COUNT=0

if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
  echo "🔍 DRY RUN MODE - showing what would be added"
  echo ""
fi

# Check if gh cli is available
if ! command -v gh &> /dev/null; then
  echo "❌ Error: gh cli is not installed. Please install it first."
  exit 1
fi

# Check if gh is authenticated
if ! gh auth status &> /dev/null; then
  echo "❌ Error: gh cli is not authenticated. Please run 'gh auth login' first."
  exit 1
fi

# Function to process items (issues or PRs)
# Arguments: $1=item_type (issue/pr), $2=path_segment (issues/pull), $3=name_plural, $4=emoji
# Sets global ITEM_COUNT with the result
process_items() {
  local item_type="$1"
  local path_segment="$2"
  local name_plural="$3"
  local emoji="$4"

  echo "$emoji Processing open $name_plural..."
  ITEM_COUNT=0

  # Fetch items and check for errors
  local items
  if ! items=$(gh "$item_type" list --repo "$REPO" --state open --limit 500 --json number --jq '.[].number' 2>&1); then
    echo "❌ Error fetching $name_plural: $items"
    return 1
  fi

  if [[ -z "$items" ]]; then
    echo "  No open $name_plural found."
    return 0
  fi

  while IFS= read -r item_number; do
    [[ -z "$item_number" ]] && continue
    local item_url="https://github.com/$REPO/$path_segment/$item_number"

    if [[ "$DRY_RUN" == "true" ]]; then
      echo "  Would add: $item_url"
    else
      echo -n "  Adding $item_type #$item_number... "
      if gh project item-add "$PROJECT_NUMBER" --owner "$ORG" --url "$item_url" 2>/dev/null; then
        echo "✓ added"
      else
        echo "○ (already exists or error)"
      fi
      sleep 0.3 # Rate limiting
    fi
    ITEM_COUNT=$((ITEM_COUNT + 1))
  done <<< "$items"
}

echo "📋 Backfilling project board: https://github.com/orgs/$ORG/projects/$PROJECT_NUMBER"
echo ""

# Process issues
if ! process_items "issue" "issues" "issues" "📌"; then
  echo "⚠️  Warning: Failed to fetch issues"
fi
ISSUE_COUNT=$ITEM_COUNT

echo ""

# Process PRs
if ! process_items "pr" "pull" "PRs" "🔀"; then
  echo "⚠️  Warning: Failed to fetch PRs"
fi
PR_COUNT=$ITEM_COUNT

echo ""
echo "✅ Done! Processed $ISSUE_COUNT issues and $PR_COUNT PRs"
echo ""
echo "View project: https://github.com/orgs/$ORG/projects/$PROJECT_NUMBER"
