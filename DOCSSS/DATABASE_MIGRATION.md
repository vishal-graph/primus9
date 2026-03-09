# Sense Layer - Database Migration Guide

## Overview

This guide walks you through running the Prisma migration to add the `IntentGraph` model to your database.

---

## Prerequisites

- PostgreSQL database running
- Backend environment variables configured
- Prisma CLI installed (included in dependencies)

---

## Migration Steps

### 1. Review Schema Changes

The following changes have been made to `backend/prisma/schema.prisma`:

**New Model:**
```prisma
model IntentGraph {
  id            String   @id @default(uuid())
  projectId     String   @unique
  userId        String
  inputs        Json
  inferred      Json
  constraints   Json
  priorities    Json
  confidence    Float    @default(0.0)
  version       Int      @default(1)
  inputHash     String?  @unique
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  project       Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([inputHash])
  @@index([projectId])
  @@index([createdAt])
}
```

**Updated Project Model:**
```prisma
model Project {
  // ... existing fields
  intentGraph IntentGraph?  // NEW
}
```

**Updated AIJobType Enum:**
```prisma
enum AIJobType {
  // ... existing types
  SENSE_INFERENCE  // NEW
}
```

### 2. Run Migration (Development)

```bash
cd tatvaops-vision/backend

# Generate migration file
npx prisma migrate dev --name add_intent_graph_sense_layer

# This will:
# 1. Create migration SQL file
# 2. Apply migration to database
# 3. Regenerate Prisma client
```

**Expected Output:**
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "tatvaops", schema "public"

Applying migration `20260120_add_intent_graph_sense_layer`

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20260120_add_intent_graph_sense_layer/
      └─ migration.sql

✔ Generated Prisma Client (v5.8.0) to ./node_modules/@prisma/client
```

### 3. Run Migration (Worker)

The worker has its own Prisma schema that needs to be updated:

```bash
cd ../worker

# Generate migration
npx prisma migrate dev --name add_intent_graph_sense_layer

# Regenerate client
npx prisma generate
```

### 4. Verify Migration

```bash
# Check database
npx prisma studio

# Or via psql
psql $DATABASE_URL -c "\d IntentGraph"
```

**Expected Schema:**
```sql
Table "public.IntentGraph"
    Column     |            Type             | Nullable |    Default
---------------+-----------------------------+----------+---------------
 id            | text                        | not null | 
 projectId     | text                        | not null | 
 userId        | text                        | not null | 
 inputs        | jsonb                       | not null | 
 inferred      | jsonb                       | not null | 
 constraints   | jsonb                       | not null | 
 priorities    | jsonb                       | not null | 
 confidence    | double precision            | not null | 0.0
 version       | integer                     | not null | 1
 inputHash     | text                        |          | 
 createdAt     | timestamp(3)                | not null | now()
 updatedAt     | timestamp(3)                | not null | 

Indexes:
    "IntentGraph_pkey" PRIMARY KEY, btree (id)
    "IntentGraph_projectId_key" UNIQUE CONSTRAINT, btree ("projectId")
    "IntentGraph_inputHash_key" UNIQUE CONSTRAINT, btree ("inputHash")
    "IntentGraph_userId_idx" btree ("userId")
    "IntentGraph_inputHash_idx" btree ("inputHash")
    "IntentGraph_projectId_idx" btree ("projectId")
    "IntentGraph_createdAt_idx" btree ("createdAt")
Foreign-key constraints:
    "IntentGraph_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"(id) ON DELETE CASCADE
```

---

## Production Deployment

### Option 1: Using Prisma Migrate (Recommended)

```bash
# Backend
cd backend
npx prisma migrate deploy

# Worker
cd ../worker
npx prisma migrate deploy
```

### Option 2: Manual SQL (Advanced)

If you prefer to review and apply SQL manually:

```bash
# Generate SQL without applying
npx prisma migrate dev --create-only --name add_intent_graph_sense_layer

# Review SQL in:
# backend/prisma/migrations/YYYYMMDD_add_intent_graph_sense_layer/migration.sql

# Apply manually via psql
psql $DATABASE_URL < backend/prisma/migrations/YYYYMMDD_add_intent_graph_sense_layer/migration.sql
```

---

## Rollback (Emergency)

If you need to rollback the migration:

```bash
# Find migration name
npx prisma migrate status

# Create rollback SQL (manual)
# Remove IntentGraph table and related changes

psql $DATABASE_URL <<EOF
-- Drop IntentGraph table
DROP TABLE IF EXISTS "IntentGraph" CASCADE;

-- Remove intentGraphId from Project (if added)
ALTER TABLE "Project" DROP COLUMN IF EXISTS "intentGraphId";

-- Remove SENSE_INFERENCE from AIJobType enum
-- (Note: Postgres enum modification is complex, consider adding rather than removing)
EOF
```

**Note:** Rollback may require manual SQL depending on your Prisma version and database state.

---

## Verification Tests

After migration, verify the setup:

### 1. Test Project Creation with Intent Graph

```sql
-- Insert test project
INSERT INTO "Project" (id, "userId", name, stage, status, "createdAt", "updatedAt")
VALUES ('test-project-1', 'user123', 'Test Project', 'FLOOR_PLAN', 'ACTIVE', NOW(), NOW());

-- Insert test Intent Graph
INSERT INTO "IntentGraph" (
  id, "projectId", "userId", inputs, inferred, constraints, priorities, confidence, version, "inputHash", "createdAt", "updatedAt"
)
VALUES (
  'test-intent-1',
  'test-project-1',
  'user123',
  '{"images": [], "text": "Modern living room"}',
  '{"spaceType": "living_room", "styleSignals": {"warmth": "high"}, "componentPreferences": {"furniture": [], "materials": [], "lighting": ""}, "changeBoundaries": {"preserve": [], "mustChange": []}, "confidence": 0.85, "inferredFrom": ["text"]}',
  '{}',
  '{"style": 0.8, "cost": 0.5, "speed": 0.5}',
  0.85,
  1,
  'test-hash-123',
  NOW(),
  NOW()
);

-- Verify
SELECT * FROM "IntentGraph" WHERE "projectId" = 'test-project-1';

-- Cleanup
DELETE FROM "IntentGraph" WHERE id = 'test-intent-1';
DELETE FROM "Project" WHERE id = 'test-project-1';
```

### 2. Test Unique Constraints

```sql
-- Should fail (duplicate projectId)
INSERT INTO "IntentGraph" (...) VALUES (..., 'existing-project-id', ...);
-- Expected: ERROR: duplicate key value violates unique constraint "IntentGraph_projectId_key"

-- Should fail (duplicate inputHash)
INSERT INTO "IntentGraph" (..., "inputHash") VALUES (..., 'existing-hash');
-- Expected: ERROR: duplicate key value violates unique constraint "IntentGraph_inputHash_key"
```

### 3. Test Cascade Delete

```sql
-- Create project with Intent Graph
INSERT INTO "Project" (...) VALUES ('cascade-test-project', ...);
INSERT INTO "IntentGraph" (..., "projectId") VALUES (..., 'cascade-test-project');

-- Delete project
DELETE FROM "Project" WHERE id = 'cascade-test-project';

-- Verify Intent Graph was also deleted
SELECT * FROM "IntentGraph" WHERE "projectId" = 'cascade-test-project';
-- Expected: 0 rows
```

---

## Troubleshooting

### Error: "Migration failed to apply"

**Cause:** Database connection issue or schema conflict

**Solution:**
```bash
# Check database connection
npx prisma db pull

# Reset database (DANGER: Development only!)
npx prisma migrate reset

# Re-apply migrations
npx prisma migrate deploy
```

### Error: "Type 'SENSE_INFERENCE' does not exist"

**Cause:** Enum not updated in database

**Solution:**
```sql
-- Add enum value manually
ALTER TYPE "AIJobType" ADD VALUE IF NOT EXISTS 'SENSE_INFERENCE';
```

### Error: "Relation field 'intentGraph' is missing"

**Cause:** Prisma client not regenerated

**Solution:**
```bash
npx prisma generate
```

---

## Post-Migration Checklist

- [ ] Backend migration applied successfully
- [ ] Worker migration applied successfully
- [ ] Prisma clients regenerated (both backend and worker)
- [ ] Database schema verified via `prisma studio` or `psql`
- [ ] Unique constraints working (projectId, inputHash)
- [ ] Cascade delete working (Project → IntentGraph)
- [ ] Indexes created (userId, inputHash, projectId, createdAt)
- [ ] Backend server restarts without errors
- [ ] Worker restarts without errors

---

## Next Steps

After migration is complete:

1. ✅ Create AWS SQS queue for sense-inference
2. ✅ Update environment variables
3. ✅ Deploy backend and worker services
4. ✅ Test API endpoints
5. ✅ Monitor CloudWatch logs

---

**Migration Status:** Ready to Execute  
**Estimated Time:** 2-5 minutes  
**Rollback Available:** Yes (with manual SQL)  
**Data Loss Risk:** None (adds new table only)
