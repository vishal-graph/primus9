# Supabase Storage setup (replaces AWS S3)

File uploads (floor plans, moodboards, renders, exports) use **Supabase Storage** in the same project as your Postgres database. No migration of old S3 objects — new uploads only.

## 1. Create buckets

In [Supabase Dashboard](https://supabase.com/dashboard) → **Storage** → **New bucket**, create:

| Bucket name   | Suggested visibility | Purpose        |
|---------------|----------------------|----------------|
| `floorplans`  | Public               | Floor plan PDFs/images |
| `moodboards`  | Public               | Generated moodboards (shown in UI) |
| `renders`     | Public               | Elevations, 2D views, videos |
| `exports`     | Private              | PDF export packages |

Public buckets allow direct URLs (`getPublicUrl`). Private buckets use signed URLs only.

## 2. Environment variables

Set on **backend API** and **worker** (Render / local `.env`):

```env
# Auto-derived from DATABASE_URL if omitted (postgres.PROJECT_REF@...)
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # Settings → API → service_role (server only)

S3_BUCKET_FLOORPLANS=floorplans
S3_BUCKET_MOODBOARDS=moodboards
S3_BUCKET_RENDERS=renders
S3_BUCKET_EXPORTS=exports
```

Remove or leave blank old AWS keys — they are no longer required for file storage.

## 3. Verify

```bash
cd backend
node scripts/test-storage.mjs
```

All four buckets should report Upload / Download / Signed URL: **OK**.

## 4. Deploy

Redeploy **API** and **worker** after updating env vars. Old assets stored with AWS bucket names in the DB will not load unless you re-upload.
