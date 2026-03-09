# 3D Walkthrough - Quick Reference Guide

> Complete reference for Parts 1 & 2 implementation

---

## 🎯 System Overview

```
Part 1: SENSE (Understand)  ✅ DONE
    ↓
Part 2: THINK (Plan)        ✅ DONE
    ↓
Part 3: RENDER (Visualize)  ⏳ FUTURE
```

---

## 📊 Data Models

### IntentGraph (Part 1)
```typescript
{
  projectId: string;
  inputs: { images, text, hints };
  inferred: {
    spaceType: string;
    styleSignals: { era, warmth, visualDensity, colorPalette };
    componentPreferences: { furniture, materials, lighting };
    changeBoundaries: { preserve, mustChange };
    confidence: number;
  };
}
```

### SpatialPlan (Part 2)
```typescript
{
  projectId: string;
  intentGraphId: string;
  roomPlans: Record<string, RoomSpatialPlan>;
  componentPlan: ComponentPlacementPlan[];
  lightingPlan: LightingPlan;
  walkthrough: WalkthroughPlan;
  readiness: number;
}
```

---

## 🔌 API Quick Reference

### Part 1: Sense Layer

**Create IntentGraph:**
```bash
POST /api/sense/intake
Body: { projectId, inputs: { images, text, hints } }
Response: { jobId, fromCache }
```

**Get IntentGraph:**
```bash
GET /api/sense/:projectId
Response: { id, inferred, confidence }
```

**Refine IntentGraph:**
```bash
POST /api/sense/:projectId/refine
Body: { refinements: { styleSignals, ... } }
Response: { jobId }
```

**Delete IntentGraph:**
```bash
DELETE /api/sense/:projectId
Response: { success }
```

### Part 2: Think Layer

**Create SpatialPlan:**
```bash
POST /api/think/plan
Body: { projectId, intentGraphId, options }
Response: { spatialPlanId, readiness, fromCache }
```

**Get SpatialPlan:**
```bash
GET /api/think/:projectId
Response: { roomPlans, componentPlan, lightingPlan, walkthrough, readiness }
```

**Delete SpatialPlan:**
```bash
DELETE /api/think/:projectId
Response: { success }
```

---

## 💻 Server Actions (Frontend)

### Part 1: Sense
```typescript
import { 
  uploadSenseInputs, 
  processIntent, 
  getIntentGraph, 
  refineIntentGraph 
} from '@/lib/actions/sense';

// Upload files
const { urls } = await uploadSenseInputs(files);

// Process intent
const { jobId, fromCache } = await processIntent(projectId, {
  images: urls,
  text: "Modern living room",
  hints: { spaceType: "living_room" }
});

// Poll job
const { data } = await getSenseJobStatus(jobId);

// Get intent graph
const { data: intentGraph } = await getIntentGraph(projectId);
```

### Part 2: Think
```typescript
import { 
  createSpatialPlan, 
  getSpatialPlan,
  getSpatialPlanningJobStatus 
} from '@/lib/actions/think';

// Create spatial plan
const { spatialPlanId, readiness } = await createSpatialPlan(
  projectId,
  intentGraphId,
  { useFloorPlan: true }
);

// Get spatial plan
const { data: spatialPlan } = await getSpatialPlan(projectId);

// Poll job if needed
const { data } = await getSpatialPlanningJobStatus(jobId);
```

---

## 🗂️ File Locations

### Backend Modules
```
backend/src/modules/
├── sense/          # Part 1
│   ├── sense.types.ts
│   ├── sense.validators.ts
│   ├── sense.service.ts
│   └── sense.controller.ts
└── think/          # Part 2
    ├── think.types.ts
    ├── think.validators.ts
    ├── room-decomposer.ts
    ├── component-planner.ts
    ├── walkthrough-planner.ts
    ├── spatial-plan.builder.ts
    ├── think.service.ts
    └── think.controller.ts
```

### Worker Design Engine
```
worker/src/design-engine/
├── sense/          # Part 1
│   ├── inferIntent.ts
│   ├── promptBuilder.ts
│   ├── responseParser.ts
│   └── intentGraphMapper.ts
└── think/          # Part 2
    └── spatialPlanMapper.ts
```

### Frontend Actions
```
frontend/src/lib/actions/
├── sense.ts        # Part 1
└── think.ts        # Part 2
```

---

## 🔑 Key Constants

### Confidence Thresholds
- **IntentGraph:** Min 0.6 for reliable inference
- **SpatialPlan Readiness:** Min 0.7 to proceed to rendering
- **High Quality:** > 0.8

### Cache TTLs
- **IntentGraph:** 30 days
- **SpatialPlan:** 30 days

### Credit Costs
- **Sense Inference:** 5 credits
- **Spatial Planning:** 3 credits
- **Combined:** 8 credits per project (cached after first use)

### Processing Times
- **Sense (cache miss):** 3-8 seconds
- **Sense (cache hit):** <50ms
- **Think:** 1-3 seconds
- **Combined:** 4-11 seconds first run

---

## 🏗️ Architecture Patterns

### Hybrid Room Handling (Part 2)
```typescript
if (project.rooms && project.rooms.length > 0) {
  // Use floor plan rooms
  return mapToExistingRooms(intent, rooms);
} else {
  // Infer rooms from intent
  return inferRoomsFromIntent(intent);
}
```

### Component Hierarchy
```typescript
Primary   (visualHierarchy: 9-10) → Anchor points
Secondary (visualHierarchy: 5-8)  → Supporting elements
Ambient   (visualHierarchy: 1-4)  → Atmosphere
```

### Placement Rules
```typescript
'anchor'      → Main furniture (sofa, bed, desk)
'focal'       → Centerpieces (dining table, chandelier)
'perimeter'   → Storage (cabinets, shelves)
'distributed' → Lighting, decor, plants
```

---

## 🧪 Common Test Scenarios

### Scenario 1: Text-Only Input
```json
{
  "inputs": {
    "text": "Scandinavian bedroom for a couple"
  }
}
```
**Expected:** IntentGraph → SpatialPlan with inferred room

### Scenario 2: Images + Text
```json
{
  "inputs": {
    "images": ["s3://url1", "s3://url2", "s3://url3"],
    "text": "Something like these but warmer"
  }
}
```
**Expected:** High confidence IntentGraph → detailed SpatialPlan

### Scenario 3: Floor Plan + Intent
```json
{
  "inputs": {
    "floorPlan": "s3://floorplan.pdf",
    "text": "Modern open concept"
  }
}
```
**Expected:** IntentGraph → SpatialPlan with floor plan rooms

---

## 🐛 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| "Intent Graph not found" | Run Part 1 first: `POST /api/sense/intake` |
| "Low readiness score" | Add more intent context or floor plan |
| "SpatialPlan already exists" | Delete first or use `forceRegenerate: true` |
| "Room not found" | Check room IDs; try regenerating |
| "Cache not working" | Verify Redis connection |

---

## 📈 Success Metrics

**Part 1 (Sense):**
- ✅ Confidence score: Avg > 0.75
- ✅ Cache hit rate: > 40%
- ✅ Processing time: < 8s

**Part 2 (Think):**
- ✅ Readiness score: Avg > 0.75
- ✅ Cache hit rate: > 30%
- ✅ Processing time: < 3s
- ✅ Readiness failures: < 10%

**Combined:**
- ✅ End-to-end time: < 12s (cached: <100ms)
- ✅ Total cost: 8 credits (first run only)
- ✅ User satisfaction: High (minimal input required)

---

## 🚀 Deployment Commands

```bash
# Part 1 + Part 2 combined deployment
cd tatvaops-vision

# Migrations
cd backend && npx prisma migrate dev --name add_3d_walkthrough_parts_1_and_2
cd ../worker && npx prisma migrate dev --name add_3d_walkthrough_parts_1_and_2

# SQS (Part 1 only)
aws sqs create-queue --queue-name tatvaops-vision-sense-inference

# Deploy
docker-compose build backend worker frontend
docker-compose up -d

# Verify
curl https://api.tatvaops.com/health
```

---

## 📞 Quick Help

**Issue?** Check these in order:
1. `3D_WALKTHROUGH_PARTS_1_AND_2_COMPLETE.md` - Full overview
2. `THINK_LAYER_DEPLOYMENT.md` - Deployment steps
3. `SENSE_LAYER_FEATURE_GUIDE.md` - API documentation
4. Logs: `docker-compose logs -f backend worker`

**Test Command:**
```bash
# Full system test
./scripts/test-3d-walkthrough.sh  # (create this script using examples above)
```

---

**Version:** 2.0.0 (Parts 1 & 2)  
**Status:** Production Ready  
**Last Updated:** January 2026
