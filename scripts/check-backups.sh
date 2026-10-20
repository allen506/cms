#!/bin/bash
# Monitor ThinkMTB database backups
# Usage: ./check-backups.sh [--email] [--verbose]

BACKUP_DIR="/opt/thinkmtb-order/backups"
LOG="/opt/thinkmtb-order/logs/backup.log"
EMAIL_ON_ERROR=${1:-""}
VERBOSE=${2:-""}

echo "=== ThinkMTB Database Backup Monitor ==="
echo "Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Check backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
  echo "❌ CRITICAL: Backup directory does not exist: $BACKUP_DIR"
  exit 1
fi

# Count backups today
TODAY=$(date +"%Y-%m-%d")
TODAY_COUNT=$(ls -1 "$BACKUP_DIR"/orders_${TODAY}* 2>/dev/null | wc -l)

echo "📅 Backups Today (${TODAY}):"
echo "   Expected: 3 (8 AM, 2 PM, 8 PM UTC)"
echo "   Actual: $TODAY_COUNT"

if [ "$TODAY_COUNT" -lt 1 ]; then
  echo "   ⚠️  WARNING: No backups created today yet"
elif [ "$TODAY_COUNT" -lt 3 ]; then
  echo "   ⚠️  WARNING: Missing expected backups today"
else
  echo "   ✅ All expected backups present"
fi

echo ""

# Show latest 5 backups
echo "📦 Latest Backups:"
ls -lht "$BACKUP_DIR"/orders_*.db 2>/dev/null | head -5 | awk '{printf "   %s  %s  (%s)\n", $6, $7, $5}'

echo ""

# Check backup log for errors
ERROR_COUNT=$(grep "ERROR" "$LOG" 2>/dev/null | wc -l)
if [ "$ERROR_COUNT" -gt 0 ]; then
  echo "❌ Errors Found in Backup Log:"
  grep "ERROR" "$LOG" | tail -5 | sed 's/^/   /'
else
  echo "✅ No errors in backup log"
fi

echo ""

# Database integrity check
if command -v sqlite3 &> /dev/null; then
  DB_PATH="/opt/thinkmtb-order/data/orders.db"
  DB_SIZE=$(du -sh "$DB_PATH" | cut -f1)
  DB_TABLES=$(sqlite3 "$DB_PATH" ".tables" | wc -w)
  
  echo "📊 Database Status:"
  echo "   Path: $DB_PATH"
  echo "   Size: $DB_SIZE"
  echo "   Tables: $DB_TABLES"
  
  # Check integrity
  INTEGRITY=$(sqlite3 "$DB_PATH" "PRAGMA integrity_check;" 2>&1 | head -1)
  if [ "$INTEGRITY" = "ok" ]; then
    echo "   Integrity: ✅ OK"
  else
    echo "   Integrity: ❌ FAILED - $INTEGRITY"
  fi
else
  echo "⚠️  SQLite3 not installed - cannot check database integrity"
fi

echo ""
echo "=== End of Report ==="
