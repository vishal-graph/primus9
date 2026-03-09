# Admin Dashboard - Quick Reference

## Access

**URL:** https://vision.tatvaops.com/krsna

**Auth:** Google Sign-In with `@tatvaops.com` email only

## Features

### Overview Tab
- Platform-wide metrics
- User and project statistics
- Credit consumption tracking
- Auto-refresh every 60s

### Users Tab
- Searchable user list
- Anomaly detection flags
- Filter by plan, anomalies, high regen
- Click row for 360° profile

### Feedback Tab
- All user feedback submissions
- Star ratings display
- Improvement signals
- Expandable full JSON view

## Anomaly Detection

### Severity Colors
- 🟡 **LOW** (Yellow #FFA726)
- 🟠 **MEDIUM** (Orange #FF7043)
- 🔴 **HIGH** (Red #EF5350)

### Detection Types

| Type | Description | Thresholds (L/M/H) |
|------|-------------|-------------------|
| **REGEN_ABUSE** | Excessive regenerations per project | 10 / 15 / 20 |
| **CREDIT_FARMING** | High gens, low exports | 30-50 / 50-100 / 100+ gens |
| **PROJECT_HOARDING** | Rapid project creation | 12 / 20 / 30 in 24h |
| **BURST_ACTIVITY** | Excessive gens in short time | 40 / 75 / 125 per hour |
| **PLAN_ABUSE** | Near-cap usage on unlimited | 75% / 85% / 95% |

## API Endpoints

All endpoints require `@tatvaops.com` authentication.

```
GET /api/admin/stats
GET /api/admin/users?page=1&limit=50&search=email&filter=anomaly&plan=FREE
GET /api/admin/users/:userId
GET /api/admin/feedback?page=1&limit=50&sort=createdAt&order=desc
```

## Keyboard Shortcuts

- **Tab** - Navigate between tabs
- **Ctrl/Cmd + K** - Focus search (when implemented)
- **Escape** - Close drawer
- **Arrow Keys** - Navigate table rows

## Performance

- Stats: < 500ms (cached 5min)
- Users list: < 1s (50 rows)
- User profile: < 800ms
- Feedback list: < 1s

## Security

- ✅ Read-only (no mutations)
- ✅ Domain validation (@tatvaops.com)
- ✅ Audit logging
- ✅ No customer data exposure
- ✅ CORS protected

## Deployment

```bash
# From bastion
./tatvaops-vision/deploy-admin-dashboard.sh
```

## Monitoring

```bash
# Backend logs
ssh -i ~/.ssh/app-access-key ec2-user@10.0.13.25 'sudo docker logs -f backend | grep admin'

# Check Redis cache
redis-cli GET admin:stats
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 403 Forbidden | Verify @tatvaops.com email in Clerk |
| Stats not loading | Clear Redis cache, check DB connection |
| Anomalies missing | Verify data in RegenerationLog table |
| Slow queries | Check database indexes are applied |

## Quick Stats Query

```sql
-- Get platform overview
SELECT 
  (SELECT COUNT(*) FROM "User") as total_users,
  (SELECT COUNT(*) FROM "Project" WHERE "deletedAt" IS NULL) as total_projects,
  (SELECT COUNT(*) FROM "AIJob" WHERE status = 'COMPLETED') as total_jobs,
  (SELECT SUM(count) FROM "RegenerationLog") as total_regens;
```

## Support

For issues:
1. Check deployment guide: `ADMIN_DASHBOARD_DEPLOYMENT.md`
2. Review summary: `ADMIN_DASHBOARD_SUMMARY.md`
3. Check backend logs for errors
4. Verify database migration ran successfully

---

**Built with:** Next.js 14, Material-UI, Express, Prisma, Redis

**Status:** ✅ Production Ready

