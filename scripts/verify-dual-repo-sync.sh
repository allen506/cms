#!/bin/bash
# Verify that both GitHub repos are in sync
# Run this weekly to detect divergence

REPO_DIR="/Users/allen/Programming/thinkmtb-order"
PRIMARY="origin"
SECONDARY="public"

cd "$REPO_DIR" || exit 1

echo "=== Repository Sync Verification ==="
echo "Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo "Location: $REPO_DIR"
echo ""

# Fetch latest from both remotes
echo "🔄 Fetching from both remotes..."
git fetch "$PRIMARY" main 2>/dev/null
git fetch "$SECONDARY" main 2>/dev/null
echo "✅ Fetch complete"
echo ""

# Get HEAD commits from both repos
echo "📋 Checking commit history..."
PRIMARY_HEAD=$(git ls-remote "$PRIMARY" main 2>/dev/null | awk '{print $1}')
SECONDARY_HEAD=$(git ls-remote "$SECONDARY" main 2>/dev/null | awk '{print $1}')

echo "Primary (thinkmtb-order):"
echo "  Branch: main"
echo "  HEAD:   ${PRIMARY_HEAD:0:7}"
echo ""

echo "Secondary (cms):"
echo "  Branch: main"
echo "  HEAD:   ${SECONDARY_HEAD:0:7}"
echo ""

# Compare
if [ "$PRIMARY_HEAD" = "$SECONDARY_HEAD" ]; then
  echo "✅ SYNC OK - Both repos are identical"
  exit 0
else
  echo "⚠️  DIVERGENCE DETECTED - Repos are out of sync!"
  echo ""
  echo "Recovery command:"
  echo "  git push $SECONDARY $PRIMARY/main:main --force"
  exit 1
fi
