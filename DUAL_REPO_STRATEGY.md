# Dual Repository Strategy - ThinkMTB Order System

**Last Updated:** October 20, 2026  
**Status:** ✅ Active with safeguards

---

## Repository Configuration

### Primary Repository (SOURCE OF TRUTH)
```
Name:     thinkmtb-order
URL:      https://github.com/allen506/thinkmtb-order.git
Remote:   origin
Usage:    All commits pushed HERE
Status:   ✅ ACTIVE
```

### Secondary Repository (MIRROR/REFERENCE)
```
Name:     cms
URL:      https://github.com/allen506/cms.git
Remote:   public
Usage:    Manual sync only (for historical reference)
Status:   ℹ️ SECONDARY
```

---

## Why Two Repositories?

### Historical Context
- **thinkmtb-order:** Dedicated repository for this project
- **cms:** Broader CMS repository containing this and other projects
- Both kept in sync for documentation/archival purposes

### Current Best Practice
- Always clone/pull/push to `thinkmtb-order` (origin)
- Treat `cms` as read-only mirror for reference only
- Never push to `cms` directly

---

## Git Workflow (DO THIS)

### ✅ CORRECT
```bash
# Clone from PRIMARY repo
git clone https://github.com/allen506/thinkmtb-order.git

# Push to origin (PRIMARY)
git add -A && git commit -m "message"
git push origin main

# Pull from origin (PRIMARY)
git pull origin main
```

### ❌ AVOID
```bash
# Don't clone from secondary repo
git clone https://github.com/allen506/cms.git

# Don't push to public remote
git push public main

# Don't pull from secondary
git pull public main
```

---

## Git Remote Configuration

### Current Setup
```bash
# View remotes
git remote -v
# origin  https://github.com/allen506/thinkmtb-order.git (fetch)
# origin  https://github.com/allen506/thinkmtb-order.git (push)
# public  https://github.com/allen506/cms.git (fetch)
# public  https://github.com/allen506/cms.git (push)

# Set origin as tracking branch
git branch -u origin/main main
```

### What This Means
- **`origin` (Primary):** Fetch AND push here
- **`public` (Mirror):** Only used for manual sync if needed
- **No dual-push:** Each commit goes to ONE repo only

---

## Safeguards Against Divergence

### 1. Manual Sync Command (Use Monthly)
```bash
# To manually sync cms repo with thinkmtb-order
# Run this from laptop if you need to sync the mirror:

# Fetch latest from both
git fetch origin main
git fetch public main

# Verify they're in sync
git rev-list --all --count origin/main
git rev-list --all --count public/main
# Should show same number

# If cms is behind, manually push to it
git push public origin/main:main
```

### 2. Verification Script (Check Before Deploy)
```bash
# Check both repos are synchronized
git ls-remote origin HEAD
git ls-remote public HEAD
# Both should show same commit hash (287f59b...)
```

### 3. Pre-Push Hook (Optional Future)
```bash
# Add to .git/hooks/pre-push to prevent pushes to 'public'
# (Can be added later if accidental pushes become an issue)
```

---

## Daily Development Rules

| Task | How |
|------|-----|
| **Start work** | Clone from `thinkmtb-order` (origin) |
| **Pull latest** | `git pull origin main` |
| **Commit** | `git commit -m "..."` |
| **Push to prod** | `git push origin main` |
| **Check status** | `git status` or `git log --oneline` |

**Never use `git push public main` in normal workflow.**

---

## If Repos Diverge (Emergency Recovery)

### Detect Divergence
```bash
git ls-remote origin main | awk '{print $1}'  # Get thinkmtb-order HEAD
git ls-remote public main | awk '{print $1}'  # Get cms HEAD
# If different, they've diverged
```

### Fix Divergence (Force Sync)
```bash
# Only do this if confirmed they've diverged
# Make sure you're on origin first

git fetch origin main
git fetch public main

# Force cms to match thinkmtb-order
git push public origin/main:main --force

# Verify
git ls-remote origin HEAD
git ls-remote public HEAD
# Should match now
```

---

## Production Deployment Flow

```
Local Commit
    ↓
git push origin main        ← Push to PRIMARY repo only
    ↓
[Verify on GitHub]
    ↓
ssh cmssportswear 'cd /opt/thinkmtb-order && git pull origin main && npm run build && pm2 restart'
    ↓
✅ Live on Production
```

**Note:** `cms` repo is NOT part of production deployment. Only `thinkmtb-order` is deployed.

---

## Monitoring & Alerts

### Weekly Check
```bash
# Add to calendar reminder (Mondays 9 AM)
cd /Users/allen/Programming/thinkmtb-order
git fetch origin main
git fetch public main
ORIGIN_HEAD=$(git ls-remote origin HEAD | awk '{print $1}')
PUBLIC_HEAD=$(git ls-remote public main | awk '{print $1}')

if [ "$ORIGIN_HEAD" != "$PUBLIC_HEAD" ]; then
  echo "⚠️ WARNING: Repos are out of sync!"
  echo "Origin:  $ORIGIN_HEAD"
  echo "Public:  $PUBLIC_HEAD"
else
  echo "✅ Repos are in sync"
fi
```

---

## Questions & Troubleshooting

### Q: Can I just use one repo?
**A:** Yes, we COULD consolidate to just `thinkmtb-order`. The `cms` repo is historical/reference only. If it causes confusion, we can archive it.

### Q: What if I accidentally push to public?
**A:** No problem. Just force-sync: `git push public origin/main:main --force`

### Q: Will production break if repos diverge?
**A:** No. Production only pulls from `origin` (thinkmtb-order). The `public` repo doesn't affect production.

### Q: Should I clone from cms instead?
**A:** No. Always clone from `thinkmtb-order` (origin). The `cms` repo is read-only.

---

## Future Improvements

1. **Archive `cms` repo** - If it's no longer needed, mark it archived on GitHub
2. **Add pre-commit hooks** - Prevent accidental pushes to public
3. **Consolidate to single repo** - Remove confusion completely
4. **Automate sync** - GitHub Actions workflow to keep `cms` updated (if keeping both)

---

## Document Version History

| Date | Change | Status |
|------|--------|--------|
| Oct 20, 2026 | Initial dual-repo strategy created | ✅ Active |
| TBD | Consider consolidating to single repo | Pending |

**Owner:** Allen  
**Last Updated:** October 20, 2026
