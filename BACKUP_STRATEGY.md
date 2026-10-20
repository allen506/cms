# ThinkMTB Order System - Backup & Recovery Strategy

**Status:** ⚠️ NEEDS IMPLEMENTATION (As of October 19, 2026)

## Current Backup Status

### What's Backed Up ✅
- **Code & Commits:** Git repository on GitHub (all history preserved)
  - Remote: `https://github.com/allen506/cms.git`
  - Branch: `main` (production)

### What's NOT Backed Up ❌
- **Database:** Only 1 manual backup from Sept 4, 2026 (45+ days old)
- **Automated Backups:** NO cron jobs configured
- **Off-site Storage:** Database backups only stored locally on server

---

## Backup Architecture (Recommended)

### 1. Database Backups

#### Local Backup (Production Server)
```bash
Location:    /opt/thinkmtb-order/backups/
Frequency:   3x daily (8 AM, 2 PM, 8 PM UTC)
Retention:   7 days (21 backup files)
Method:      SQLite hot backup (safe with WAL mode)
Script:      /opt/thinkmtb-order/scripts/backup-db.sh
```

#### Off-Site Backup (Recommended Future)
```bash
Destination: S3, Google Drive, or Dropbox
Frequency:   Daily at 10 PM UTC
Retention:   30 days
Method:      SCP/rsync to secure cloud storage
```

### 2. Application Backups

#### Code Backups ✅
- **Repository:** GitHub (free, unlimited storage)
- **History:** Full commit history preserved
- **Rollback:** Any commit restorable with `git checkout`

#### Full System Backup (Recommended)
```bash
Schedule:    Weekly (Sunday at 3 AM UTC)
Include:     /opt/thinkmtb-order/ (code + backups)
Exclude:     node_modules/, .git/objects (can be regenerated)
Method:      tar.gz to secure storage
Retention:   4 weeks
```

### 3. Configuration Backups

#### SSL Certificates ✅
- **Auto-renewal:** Enabled via Certbot
- **Location:** `/etc/letsencrypt/live/`
- **Renewal:** Automatic 30 days before expiry

#### Nginx Configuration
```bash
Location:    /etc/nginx/sites-available/
Backup:      Should be versioned (consider adding to git)
Script:      Manual or via configuration management
```

---

## Immediate Action Items (October 19-20, 2026)

### Priority 1: Enable Database Backups
```bash
# 1. Create backup directory on production
ssh cmssportswear 'mkdir -p /opt/thinkmtb-order/backups'

# 2. Set up cron job for root user
ssh cmssportswear 'sudo crontab -e'

# Add these 3 lines:
0 8 * * * /opt/thinkmtb-order/scripts/backup-db.sh
0 14 * * * /opt/thinkmtb-order/scripts/backup-db.sh
0 20 * * * /opt/thinkmtb-order/scripts/backup-db.sh

# 3. Test the backup script
ssh cmssportswear '/opt/thinkmtb-order/scripts/backup-db.sh'

# 4. Verify backup was created
ssh cmssportswear 'ls -lh /opt/thinkmtb-order/backups/'
```

### Priority 2: Copy Local Backup Script to Production
```bash
# Copy the backup script to production if it doesn't exist
scp scripts/backup-db.sh cmssportswear:/opt/thinkmtb-order/scripts/

# Make it executable
ssh cmssportswear 'chmod +x /opt/thinkmtb-order/scripts/backup-db.sh'
```

### Priority 3: Document Recovery Procedures
```bash
# Test restore process locally
sqlite3 data/orders.db ".backup '/tmp/test_backup.db'"
sqlite3 '/tmp/test_backup.db' "SELECT COUNT(*) FROM orders_old;"
```

---

## Backup & Recovery Procedures

### Database Backup (Daily)
```bash
# Automatic via cron (3x daily, no action needed)
# Manual backup:
sqlite3 /opt/thinkmtb-order/data/orders.db ".backup '/tmp/manual_backup_$(date +%s).db'"
```

### Database Recovery
```bash
# If database is corrupted:
ssh cmssportswear '
  # 1. Identify the most recent good backup
  ls -lht /opt/thinkmtb-order/backups/ | head -5

  # 2. Stop the application
  sudo pm2 stop thinkmtb-order

  # 3. Restore from backup
  cp /opt/thinkmtb-order/backups/orders_2026-10-20_140000.db /opt/thinkmtb-order/data/orders.db

  # 4. Restart application
  sudo pm2 start thinkmtb-order

  # 5. Verify data
  sqlite3 /opt/thinkmtb-order/data/orders.db "SELECT COUNT(*) FROM orders_old;"
'
```

### Code Recovery
```bash
# Rollback to previous version
ssh cmssportswear '
  cd /opt/thinkmtb-order
  git log --oneline | head -10  # See recent commits
  git checkout abc4406           # Rollback to specific commit
  npm run build && pm2 restart thinkmtb-order
'
```

### Full System Recovery
```bash
# Restore from system backup (if available)
scp cmssportswear:/opt/backups/thinkmtb-order-*.tar.gz /local/recovery/
tar -xzf thinkmtb-order-*.tar.gz -C /opt/
npm install && npm run build
pm2 start ecosystem.config.js
```

---

## Monitoring & Alerts

### Backup Health Checks
```bash
# Check if today's backup exists
ssh cmssportswear '
  TODAY=$(date +"%Y-%m-%d")
  COUNT=$(ls -1 /opt/thinkmtb-order/backups/orders_${TODAY}* 2>/dev/null | wc -l)
  if [ "$COUNT" -eq 0 ]; then
    echo "WARNING: No backups today"
  else
    echo "OK: $COUNT backups created today"
  fi
'
```

### Backup Log Monitoring
```bash
# View backup log
ssh cmssportswear 'tail -20 /opt/thinkmtb-order/logs/backup.log'

# Watch for errors
ssh cmssportswear 'grep ERROR /opt/thinkmtb-order/logs/backup.log | tail -10'
```

---

## Testing Plan

### Quarterly Backup Restore Test
```
Schedule:  First Monday of each quarter
Procedure:
  1. Download latest backup from production
  2. Restore to test database
  3. Verify all tables present
  4. Spot-check 3-5 orders
  5. Verify totals and pricing calculations
  6. Document results
```

### Example Test (Next: January 2027)
```bash
# 1. Get latest backup
scp cmssportswear:/opt/thinkmtb-order/backups/orders_*.db /tmp/test_db.db

# 2. Test restore
sqlite3 /tmp/test_db.db ".tables"

# 3. Verify data integrity
sqlite3 /tmp/test_db.db "
  SELECT 'orders_old:' as table_name, COUNT(*) FROM orders_old
  UNION ALL
  SELECT 'order_items:', COUNT(*) FROM order_items
  UNION ALL
  SELECT 'product_types:', COUNT(*) FROM product_types;
"

# 4. Check pricing calculations still work
sqlite3 /tmp/test_db.db "
  SELECT o.user_name, COUNT(oi.id) as item_count, SUM(oi.quantity) as total_qty
  FROM orders_old o
  LEFT JOIN order_items oi ON o.id = oi.order_id
  GROUP BY o.user_name
  ORDER BY total_qty DESC;
"
```

---

## Cost Analysis

| Component | Cost | Notes |
|-----------|------|-------|
| Local backups | $0 | Included in server space |
| GitHub (Code) | $0 | Free tier sufficient |
| AWS S3 (Optional) | ~$0.50/mo | 21 × 368KB × 30 days ≈ 250MB/month |
| Google Drive | $0/100GB | Free tier sufficient for backups |
| Manual labor | 30 min | Initial setup + testing |

---

## Emergency Contact Procedures

### If Database is Lost
1. **Immediate:** Restore from latest backup (< 8 hours old)
2. **Contact:** Allen (has SSH access + backup scripts)
3. **Timeline:** Recovery in < 15 minutes

### If Code is Lost
1. **Immediate:** Redeploy from GitHub (git clone)
2. **Contact:** Allen (has deployment access)
3. **Timeline:** Full recovery in < 5 minutes

### If Server is Down
1. **Immediate:** Check status at thinkmtb.moralesrodionoff.com
2. **Verify:** `curl https://thinkmtb.moralesrodionoff.com/api/admin/verify-password`
3. **Contact:** VPS provider (Linode)

---

## Compliance & Regulations

### Data Protection
- **GDPR:** Not applicable (no EU users)
- **CCPA:** Not applicable (not processing personal data at scale)
- **Local:** Costa Rica privacy laws (minimal impact)

### Retention Policy
- **Active Backups:** 7 days (daily retention)
- **Archive Backups:** 30 days (weekly retention)
- **Data Deletion:** No automated deletion; manual purge after 30 days

---

## Document Version History

| Date | Status | Changes |
|------|--------|---------|
| Oct 19, 2026 | DRAFT | Initial assessment created |
| Oct 20, 2026 | REVIEW | Awaiting approval for implementation |
| TBD | IMPLEMENTED | Once cron jobs configured |

---

## Next Steps

1. **✅ Done:** Assess current backup status
2. ⏳ **TODO:** Set up automated cron jobs on production
3. ⏳ **TODO:** Create backup monitoring dashboard
4. ⏳ **TODO:** Test backup restoration procedure
5. ⏳ **TODO:** Document recovery procedures for non-technical staff
6. ⏳ **TODO:** Plan quarterly backup restore test

**Owner:** Allen  
**Last Updated:** October 19, 2026
