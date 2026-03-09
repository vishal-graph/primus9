# Admin Dashboard Deployment Guide

## Overview

The admin dashboard at `/krsna` is now fully implemented. This is an internal-only, read-only observability dashboard restricted to `@tatvaops.com` email addresses.

## What Was Built

### Backend (Express API)

1. **Admin API Router** (`backend/src/api/admin.ts`)
   - `GET /api/admin/stats` - Dashboard overview metrics
   - `GET /api/admin/users` - Users list with pagination, filters, and anomaly detection
   - `GET /api/admin/users/:userId` - User 360° profile
   - `GET /api/admin/feedback` - Feedback submissions list

2. **Anomaly Detection Service** (`backend/src/services/anomaly-detection.ts`)
   - Regen Abuse detection (10/15/20 regens per project)
   - Credit Farming detection (high gens, low exports)
   - Project Hoarding detection (12/20/30 projects in 24h)
   - Burst Activity detection (40/75/125 gens per hour)
   - Unlimited Plan Abuse detection (75%/85%/95% usage)

3. **Admin Auth Middleware** (`backend/src/middleware/admin-auth.ts`)
   - Validates `@tatvaops.com` email domain
   - Returns 403 for non-admin users
   - Logs all admin access attempts

4. **Database Indexes** (Updated `backend/prisma/schema.prisma`)
   - Added indexes on User (createdAt, plan)
   - Added indexes on AIJob (userId+createdAt, completedAt)
   - Added indexes on CreditTransaction (userId+type+createdAt)
   - Added indexes on RegenerationLog (userId+updatedAt)

### Frontend (Next.js)

1. **Admin Layout** (`frontend/src/app/(admin)/layout.tsx`)
   - Clean, minimal design (AWS Console style)
   - No customer-facing UI elements
   - Header with "ADMIN" badge
   - Footer with read-only notice

2. **Main Dashboard Page** (`frontend/src/app/(admin)/krsna/page.tsx`)
   - Tab-based navigation (Overview, Users, Feedback)
   - Read-only badge
   - Footer notice about no mutations

3. **Overview Tab** (`frontend/src/components/admin/OverviewTab.tsx`)
   - 8 metric cards with trends
   - Auto-refresh every 60 seconds
   - Total users, active users, projects, generations, etc.

4. **Users Tab** (`frontend/src/components/admin/UsersTab.tsx`)
   - Comprehensive users table
   - Search by email/name/ID (debounced 500ms)
   - Filters: Plan type, Has anomalies, High regen users
   - Anomaly flags with colored chips (LOW/MEDIUM/HIGH)
   - Click row to open user profile drawer
   - Pagination (50 users per page)

5. **User Profile Drawer** (`frontend/src/components/admin/UserProfileDrawer.tsx`)
   - 5 sections: Basic Info, Credit Intelligence, Projects, Feedback, AI Usage
   - Copyable user ID
   - Visual charts and progress bars
   - Comprehensive project table

6. **Feedback Tab** (`frontend/src/components/admin/FeedbackTab.tsx`)
   - Feedback submissions table
   - Search and sort functionality
   - Star ratings display
   - Expandable rows for full JSON
   - Improvement vectors as chips

7. **Admin Server Actions** (`frontend/src/lib/actions/admin.ts`)
   - TypeScript types for all responses
   - Error handling
   - Auth header injection

8. **Middleware Protection** (Updated `frontend/src/middleware.ts`)
   - `/krsna` route protection
   - Email domain validation
   - Redirect to sign-in with error message for non-admins

## Deployment Steps

### 1. Database Migration

Run the migration to add performance indexes:

```bash
cd tatvaops-vision/backend
npx prisma migrate dev --name add_admin_indexes
```

Or in production:

```bash
npx prisma migrate deploy
```

### 2. Backend Deployment

The backend changes are ready. Deploy using your existing process:

```bash
# On application server
cd /opt/tatvaops/backend

# Pull latest code
sudo git pull origin main

# Rebuild backend image
cd /opt/tatvaops
sudo DOCKER_BUILDKIT=1 docker build -t tatvaops-backend -f backend/Dockerfile backend/

# Restart backend container
sudo docker stop backend
sudo docker rm backend
sudo docker run -d --name backend -p 3001:4000 --env-file /opt/tatvaops/backend/.env --restart unless-stopped tatvaops-backend

# Verify
sudo docker logs backend --tail 50
curl -I http://localhost:3001/health
```

### 3. Frontend Deployment

Deploy frontend with the new admin routes:

```bash
# On application server
cd /opt/tatvaops/frontend

# Pull latest code
sudo git pull origin main

# Rebuild frontend image
cd /opt/tatvaops
sudo DOCKER_BUILDKIT=1 docker build -t tatvaops-frontend -f frontend/Dockerfile frontend/

# Restart frontend container
sudo docker stop frontend
sudo docker rm frontend
sudo docker run -d --name frontend -p 3000:3000 --network host --env-file /opt/tatvaops/frontend/.env --restart unless-stopped tatvaops-frontend

# Verify
sudo docker logs frontend --tail 50
curl -I http://localhost:3000
```

### 4. Worker Deployment (Fix BACKEND_API_URL)

The worker `.env` file needs to be updated with the correct backend URL:

```bash
# On worker server
cd /opt/tatvaops

# Verify BACKEND_API_URL is set
grep BACKEND_API_URL .env

# If missing, add it:
sudo bash -c 'echo "" >> /opt/tatvaops/.env'
sudo bash -c 'echo "# Backend API" >> /opt/tatvaops/.env'
sudo bash -c 'echo "BACKEND_API_URL=https://vision.tatvaops.com" >> /opt/tatvaops/.env'
sudo bash -c 'echo "API_URL=https://vision.tatvaops.com" >> /opt/tatvaops/.env'

# Restart workers
sudo docker-compose -f /opt/tatvaops/docker-compose.yml restart worker

# Verify
sudo docker logs tatvaops-worker-1 --tail 50
```

## Testing the Admin Dashboard

### 1. Access Control Testing

**Test with @tatvaops.com account:**
1. Sign in with a @tatvaops.com Google account
2. Navigate to: https://vision.tatvaops.com/krsna
3. Should see the admin dashboard

**Test with non-admin account:**
1. Sign in with a non-@tatvaops.com account
2. Try to navigate to: https://vision.tatvaops.com/krsna
3. Should be redirected to sign-in with error message

**Test backend API directly:**
```bash
# From bastion or local machine
# Replace TOKEN with actual Clerk JWT token from browser

# Should work with @tatvaops.com token
curl -H "Authorization: Bearer TOKEN" https://vision.tatvaops.com/api/admin/stats

# Should return 403 with non-admin token
curl -H "Authorization: Bearer TOKEN" https://vision.tatvaops.com/api/admin/stats
```

### 2. Functional Testing

**Overview Tab:**
- [ ] All 8 metrics display correctly
- [ ] Trends show deltas (24h users, 7d projects)
- [ ] Auto-refresh works (60s interval)
- [ ] Refresh button works

**Users Tab:**
- [ ] Users table loads with pagination
- [ ] Search filters users by email/name/ID
- [ ] Plan filter works
- [ ] "Has Anomalies" checkbox filters correctly
- [ ] "High Regen Users" checkbox works
- [ ] Anomaly flags display with correct colors
- [ ] Click row opens user profile drawer
- [ ] Pagination works

**User Profile Drawer:**
- [ ] All 5 sections display
- [ ] Basic info shows user details
- [ ] Credit intelligence shows balance, usage, regen ratio
- [ ] Projects table shows all user projects
- [ ] Feedback summary shows count, avg score, signals
- [ ] AI usage breakdown shows counts by type
- [ ] Copy ID button works

**Feedback Tab:**
- [ ] Feedback table loads with pagination
- [ ] Search filters by user email or project name
- [ ] Sort by date/score works
- [ ] Star ratings display correctly
- [ ] Improvement vectors show as chips
- [ ] Expand row shows full JSON
- [ ] Pagination works

### 3. Performance Testing

Run these queries to verify performance:

```sql
-- Check if indexes exist
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('User', 'AIJob', 'CreditTransaction', 'RegenerationLog')
ORDER BY tablename, indexname;

-- Test stats query performance
EXPLAIN ANALYZE
SELECT COUNT(*) FROM "User";

-- Test users query performance
EXPLAIN ANALYZE
SELECT * FROM "User" 
ORDER BY "createdAt" DESC 
LIMIT 50;
```

**Expected Performance:**
- Stats endpoint: < 500ms
- Users list (50 rows): < 1s
- User profile: < 800ms
- Feedback list: < 1s

### 4. Security Testing

**Verify access control:**
```bash
# Test without auth (should fail)
curl https://vision.tatvaops.com/api/admin/stats

# Test with non-admin auth (should return 403)
curl -H "Authorization: Bearer NON_ADMIN_TOKEN" https://vision.tatvaops.com/api/admin/stats

# Test with admin auth (should work)
curl -H "Authorization: Bearer ADMIN_TOKEN" https://vision.tatvaops.com/api/admin/stats
```

**Verify no mutations:**
- Admin API has no POST/PUT/PATCH/DELETE endpoints
- All endpoints are GET only
- No user data can be modified

## Anomaly Detection Thresholds

### Regen Abuse
- **LOW**: 10-15 regens/project
- **MEDIUM**: 15-20 regens/project
- **HIGH**: 20+ regens/project

### Credit Farming
- **LOW**: 30-50 gens with <15% export ratio
- **MEDIUM**: 50-100 gens with <10% export ratio
- **HIGH**: 100+ gens with <5% export ratio

### Project Hoarding
- **LOW**: 12-20 projects in 24h
- **MEDIUM**: 20-30 projects in 24h
- **HIGH**: 30+ projects in 24h

### Burst Activity
- **LOW**: 40-75 gens/hour
- **MEDIUM**: 75-125 gens/hour
- **HIGH**: 125+ gens/hour

### Unlimited Plan Abuse
- **LOW**: 75-85% of allocation used
- **MEDIUM**: 85-95% of allocation used
- **HIGH**: 95%+ of allocation used

## Troubleshooting

### Issue: 403 Forbidden on admin routes

**Cause:** User email is not @tatvaops.com

**Solution:** 
1. Verify Clerk account uses @tatvaops.com email
2. Check middleware logs in backend
3. Ensure Clerk JWT token is valid

### Issue: Stats not loading

**Cause:** Redis connection issue or database query timeout

**Solution:**
1. Check Redis connection: `redis-cli ping`
2. Check database indexes: `\d+ "User"` in psql
3. Clear Redis cache: `redis-cli DEL admin:stats`

### Issue: Anomaly detection not working

**Cause:** Missing data in RegenerationLog or AIJob tables

**Solution:**
1. Verify data exists: `SELECT COUNT(*) FROM "RegenerationLog"`
2. Check query logs in backend
3. Verify thresholds are appropriate for your data

### Issue: Frontend build errors

**Cause:** Missing MUI dependencies

**Solution:**
```bash
cd tatvaops-vision/frontend
npm install @mui/material @mui/icons-material @emotion/react @emotion/styled
```

## Future Enhancements (Not Implemented)

The following features are structured but not implemented:

1. **Manual Interventions**
   - Account suspension toggle
   - Credit adjustments
   - Admin notes

2. **Audit Logging**
   - Track all admin actions
   - Export audit logs

3. **Advanced Analytics**
   - Cohort analysis
   - Churn prediction
   - Revenue forecasting

4. **Configurable Thresholds**
   - Environment variables for anomaly thresholds
   - Dynamic threshold adjustment

## Architecture

```
Frontend (/krsna)
  ↓
Middleware (check @tatvaops.com)
  ↓
Admin API (/api/admin/*)
  ↓
Admin Auth Middleware
  ↓
Anomaly Detection Service
  ↓
Database (PostgreSQL)
```

## Files Created

### Backend
- `backend/src/api/admin.ts` (234 lines)
- `backend/src/middleware/admin-auth.ts` (95 lines)
- `backend/src/services/anomaly-detection.ts` (325 lines)

### Frontend
- `frontend/src/app/(admin)/layout.tsx` (99 lines)
- `frontend/src/app/(admin)/krsna/page.tsx` (165 lines)
- `frontend/src/components/admin/OverviewTab.tsx` (265 lines)
- `frontend/src/components/admin/UsersTab.tsx` (315 lines)
- `frontend/src/components/admin/UserProfileDrawer.tsx` (380 lines)
- `frontend/src/components/admin/FeedbackTab.tsx` (340 lines)
- `frontend/src/lib/actions/admin.ts` (280 lines)

### Database
- Updated `backend/prisma/schema.prisma` (4 new indexes)

### Modified Files
- `backend/src/index.ts` (added admin router)
- `frontend/src/middleware.ts` (added /krsna protection)

**Total:** ~2,500 lines of production-grade code

## Next Steps

1. **Deploy to Production**
   - Run database migration
   - Deploy backend with admin API
   - Deploy frontend with admin dashboard
   - Fix worker BACKEND_API_URL issue

2. **Test with @tatvaops.com Account**
   - Access https://vision.tatvaops.com/krsna
   - Verify all tabs work
   - Test anomaly detection
   - Verify performance

3. **Monitor**
   - Check backend logs for admin access
   - Monitor Redis cache hit rate
   - Verify query performance

## Support

For issues or questions, check:
- Backend logs: `sudo docker logs backend`
- Frontend logs: `sudo docker logs frontend`
- Database logs: Check RDS CloudWatch
- Redis logs: Check ElastiCache CloudWatch

