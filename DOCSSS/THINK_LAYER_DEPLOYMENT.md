# Think Layer Deployment Guide

## Overview

This guide walks you through deploying Part 2 (Think Layer) of the 3D Walkthrough System.

**Prerequisites:**
- Part 1 (Sense Layer) already deployed
- PostgreSQL database accessible
- Backend and worker services running

---

## 📋 Deployment Checklist

### 1. Database Migration (5 minutes)

Run Prisma migrations to add the `SpatialPlan` table and update enums:

```bash
# Backend
cd tatvaops-vision/backend
npx prisma migrate dev --name add_spatial_plan_think_layer
npx prisma generate

# Worker
cd ../worker
npx prisma migrate dev --name add_spatial_plan_think_layer
npx prisma generate
```

**What This Does:**
- Adds `SpatialPlan` model
- Adds `SPATIAL_PLANNING` to `ProjectStage` enum
- Adds `SPATIAL_PLANNING` to `AIJobType` enum
- Updates `Project` and `IntentGraph` relations

**Expected Output:**
```
✔ Generated Prisma Client to ./node_modules/@prisma/client

The following migration(s) have been created and applied:

migrations/
  └─ 20260120_add_spatial_plan_think_layer/
      └─ migration.sql
```

### 2. Verify Database Schema

```bash
npx prisma studio
```

Or via psql:
```sql
\d SpatialPlan

-- Should show:
-- id, projectId (unique), intentGraphId, userId
-- roomPlans (json), componentPlan (json), lightingPlan (json)
-- walkthrough (json), constraints (json)
-- readiness (float), version (int), inputHash (text, unique)
-- createdAt, updatedAt
```

### 3. Deploy Services (3 minutes)

No environment variables needed! The Think Layer reuses existing infrastructure.

```bash
# Build services
docker-compose build backend worker

# Deploy
docker-compose up -d

# Or use existing pipeline
./scripts/deploy.sh
```

### 4. Verify API Endpoints (2 minutes)

Test the Think Layer API:

```bash
# Health check
curl https://api.tatvaops.com/health

# Create spatial plan (requires existing IntentGraph)
curl -X POST https://api.tatvaops.com/api/think/plan \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "YOUR_PROJECT_ID",
    "intentGraphId": "YOUR_INTENT_GRAPH_ID",
    "options": {
      "useFloorPlan": true
    }
  }'

# Get spatial plan
curl https://api.tatvaops.com/api/think/YOUR_PROJECT_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "spatialPlanId": "uuid",
    "readiness": 0.87,
    "fromCache": false,
    "message": "Spatial plan created"
  }
}
```

---

## 🔄 Integration Verification

### Test Complete Flow (Part 1 → Part 2)

```bash
# 1. Create project
PROJECT_ID=$(curl -X POST https://api.tatvaops.com/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"3D Walkthrough Test"}' | jq -r '.data.id')

echo "Project created: $PROJECT_ID"

# 2. Create IntentGraph (Part 1)
INTENT_RESULT=$(curl -X POST https://api.tatvaops.com/api/sense/intake \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"projectId\": \"$PROJECT_ID\",
    \"inputs\": {
      \"text\": \"Modern living room with warm colors and comfortable seating\",
      \"hints\": {
        \"spaceType\": \"living_room\",
        \"budget\": \"moderate\"
      }
    }
  }")

JOB_ID=$(echo $INTENT_RESULT | jq -r '.data.jobId')
echo "Intent inference job: $JOB_ID"

# 3. Wait for inference to complete
echo "Waiting for intent inference..."
sleep 8

# 4. Get IntentGraph
INTENT_GRAPH=$(curl https://api.tatvaops.com/api/sense/$PROJECT_ID \
  -H "Authorization: Bearer $TOKEN")

INTENT_GRAPH_ID=$(echo $INTENT_GRAPH | jq -r '.data.id')
echo "IntentGraph created: $INTENT_GRAPH_ID"

# 5. Create SpatialPlan (Part 2)
SPATIAL_RESULT=$(curl -X POST https://api.tatvaops.com/api/think/plan \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"projectId\": \"$PROJECT_ID\",
    \"intentGraphId\": \"$INTENT_GRAPH_ID\",
    \"options\": {
      \"useFloorPlan\": false
    }
  }")

echo "SpatialPlan result:"
echo $SPATIAL_RESULT | jq

SPATIAL_PLAN_ID=$(echo $SPATIAL_RESULT | jq -r '.data.spatialPlanId')
READINESS=$(echo $SPATIAL_RESULT | jq -r '.data.readiness')

echo "✅ SpatialPlan created: $SPATIAL_PLAN_ID"
echo "✅ Readiness score: $READINESS"

# 6. Retrieve full SpatialPlan
curl https://api.tatvaops.com/api/think/$PROJECT_ID \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## 🗄️ Database Verification

### Check SpatialPlan Table

```sql
-- Count spatial plans
SELECT COUNT(*) FROM "SpatialPlan";

-- View recent plans
SELECT id, "projectId", readiness, version, "createdAt"
FROM "SpatialPlan"
ORDER BY "createdAt" DESC
LIMIT 10;

-- Check readiness distribution
SELECT 
  CASE 
    WHEN readiness >= 0.8 THEN 'High (>= 0.8)'
    WHEN readiness >= 0.6 THEN 'Medium (0.6-0.8)'
    ELSE 'Low (< 0.6)'
  END as readiness_category,
  COUNT(*) as count
FROM "SpatialPlan"
GROUP BY readiness_category;

-- Verify cascade delete
SELECT p.id, p.name, sp.id as spatial_plan_id, ig.id as intent_graph_id
FROM "Project" p
LEFT JOIN "SpatialPlan" sp ON p.id = sp."projectId"
LEFT JOIN "IntentGraph" ig ON p.id = ig."projectId"
WHERE sp.id IS NOT NULL OR ig.id IS NOT NULL;
```

---

## 🔍 Monitoring

### CloudWatch Logs

Search for Think Layer activity:

```bash
# Backend logs
aws logs filter-log-events \
  --log-group-name /tatvaops/vision/backend \
  --filter-pattern "\"spatial plan\""

# Worker logs
aws logs filter-log-events \
  --log-group-name /tatvaops/vision/worker \
  --filter-pattern "\"SpatialPlan\""
```

### Redis Cache

Monitor cache performance:

```bash
# Check cache keys
redis-cli KEYS "spatial:*"

# Get a cached plan
redis-cli GET "spatial:hash:SOME_HASH"

# Monitor cache activity
redis-cli MONITOR | grep "spatial:"
```

### Success Metrics

**After 1 week, check:**
- Average readiness score (target: >0.75)
- Cache hit rate (target: >30%)
- Processing time (target: <3s)
- Readiness failures (target: <10%)

---

## ⚠️ Troubleshooting

### Error: "Intent Graph not found"

**Cause:** Part 1 (Sense Layer) not completed for this project

**Solution:**
```bash
# Verify IntentGraph exists
curl https://api.tatvaops.com/api/sense/PROJECT_ID \
  -H "Authorization: Bearer $TOKEN"

# If not found, create IntentGraph first (Part 1)
curl -X POST https://api.tatvaops.com/api/sense/intake \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"projectId":"PROJECT_ID","inputs":{...}}'
```

### Error: "Low readiness score (<0.7)"

**Cause:** Insufficient intent data or ambiguous inputs

**Solution:**
- Add more context to IntentGraph (Part 1)
- Provide floor plan for better geometry
- Manual review and adjustment before proceeding

### Error: "SpatialPlan already exists"

**Cause:** Plan already created for this project

**Solution:**
```bash
# Option 1: Use existing plan
curl https://api.tatvaops.com/api/think/PROJECT_ID \
  -H "Authorization: Bearer $TOKEN"

# Option 2: Delete and recreate
curl -X DELETE https://api.tatvaops.com/api/think/PROJECT_ID \
  -H "Authorization: Bearer $TOKEN"

curl -X POST https://api.tatvaops.com/api/think/plan \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"projectId":"...","intentGraphId":"...","options":{"forceRegenerate":true}}'
```

### Error: "Room not found in spatial plan"

**Cause:** Room ID mismatch or incomplete room decomposition

**Solution:**
- Verify room IDs from floor plan analysis
- Check `roomPlans` object in SpatialPlan
- Try regenerating with `forceRegenerate: true`

---

## 🔄 Rollback Procedure

If you need to rollback Part 2:

```sql
-- Drop SpatialPlan table
DROP TABLE IF EXISTS "SpatialPlan" CASCADE;

-- Remove SPATIAL_PLANNING from enums (complex - requires manual steps)
-- Typically not recommended; instead, keep schema and disable feature in code
```

**Recommendation:** Don't rollback the schema. Instead, disable the Think Layer API by commenting out the router registration in `backend/src/index.ts`:

```typescript
// app.use('/api/think', authMiddleware, thinkRouter);  // DISABLED
```

---

## ✅ Post-Deployment Checklist

- [ ] Database migration applied successfully (backend + worker)
- [ ] Prisma clients regenerated
- [ ] `SpatialPlan` table exists with correct schema
- [ ] Backend service restarted without errors
- [ ] Worker service restarted without errors
- [ ] API endpoint `/api/think/plan` responds (200/202)
- [ ] API endpoint `/api/think/:projectId` responds (200/404)
- [ ] Test flow: Part 1 → Part 2 works end-to-end
- [ ] Redis cache keys generated correctly
- [ ] CloudWatch logs showing Think Layer activity
- [ ] No linter errors in new code

---

## 📞 Support

**Documentation:**
- `THINK_LAYER_COMPLETE.md` - Implementation summary
- `THINK_LAYER_DEPLOYMENT.md` - This file
- Plan file: `.cursor/plans/part_2_think_layer_*.plan.md`

**Common Commands:**
```bash
# Check migration status
npx prisma migrate status

# View logs
docker-compose logs -f backend
docker-compose logs -f worker

# Check database
npx prisma studio

# Test API
curl https://api.tatvaops.com/api/think/PROJECT_ID \
  -H "Authorization: Bearer $TOKEN"
```

---

**Deployment Status:** Ready to Execute  
**Estimated Time:** 10 minutes  
**Risk Level:** Low (additive changes only)  
**Rollback:** Available (disable router)  
**Breaking Changes:** None
