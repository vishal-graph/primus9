# 🚀 TatvaOps Vision - Quick Start Guide

## ⚠️ Current Issue

The UI is ready, but you need to configure **Clerk API keys** to run the app.

---

## 📝 Setup Steps

### Option 1: Get Real Clerk Keys (Recommended)

1. **Go to Clerk Dashboard**
   ```
   https://dashboard.clerk.com/
   ```

2. **Create a New Application**
   - Click "Add application"
   - Name: "TatvaOps Vision"
   - Select: Email + Google Sign-in

3. **Copy API Keys**
   - Navigate to "API Keys" in sidebar
   - Copy:
     - `Publishable Key` (starts with `pk_test_...`)
     - `Secret Key` (starts with `sk_test_...`)

4. **Create `.env.local` File**
   ```bash
   cd frontend
   ```
   
   Create `.env.local` with:
   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
   CLERK_SECRET_KEY=sk_test_YOUR_KEY_HERE
   
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
   
   NEXT_PUBLIC_API_URL=http://localhost:4000
   ```

5. **Restart Dev Server**
   ```bash
   # Stop current server (Ctrl+C in terminal 7)
   # Then run:
   npm run dev
   ```

6. **Open Browser**
   ```
   http://localhost:3000
   ```

---

### Option 2: UI Testing Without Auth (Quick)

If you just want to see the UI without setting up Clerk:

1. **Create a demo route** that bypasses auth:

```typescript
// Create: frontend/src/app/demo/page.tsx
'use client';

import { Box } from '@mui/material';
import { AppLayout } from '@/ui/layout';

export default function DemoPage() {
  return (
    <AppLayout>
      <Box sx={{ p: 4 }}>
        <h1>Demo Mode - UI Preview</h1>
        <p>Navigate to stages using the sidebar →</p>
      </Box>
    </AppLayout>
  );
}
```

2. **Visit**: `http://localhost:3000/demo`

---

## 🎯 What to Test

### 1. Landing Page
```
http://localhost:3000/
```
- Hero section
- Feature cards
- CTA buttons

### 2. Entry Selector
```
http://localhost:3000/entry
```
- 4 action cards
- Hover effects
- Click navigation

### 3. Dashboard
```
http://localhost:3000/dashboard
```
- Grid/list toggle
- Search bar
- Project cards
- Empty state

### 4. Project Workspace
```
http://localhost:3000/project/test-123
```
- Tab navigation (7 stages)
- Stage content
- Sidebar

### Individual Stages
```
http://localhost:3000/project/test-123?stage=floor_plan
http://localhost:3000/project/test-123?stage=intent
http://localhost:3000/project/test-123?stage=moodboard    ← CRITICAL
http://localhost:3000/project/test-123?stage=elevation
http://localhost:3000/project/test-123?stage=interior
http://localhost:3000/project/test-123?stage=component
http://localhost:3000/project/test-123?stage=export
```

---

## 🎨 Visual Features to Check

### Material UI Theme
- ✅ Off-white background (#FAFAFA)
- ✅ Slate gray primary (#37474F)
- ✅ Soft indigo accent (#5C6BC0)
- ✅ Minimal shadows
- ✅ 8px spacing grid

### Framer Motion
- ✅ Page fade transitions
- ✅ List stagger effects
- ✅ Image fade-ins
- ✅ Hover animations

### Redux State
- ✅ Sidebar toggle (click menu icon)
- ✅ AI job badge (if mock jobs present)
- ✅ Snackbar notifications

---

## 🐛 Troubleshooting

### Issue: Clerk Error
**Error**: `Missing publishableKey`

**Fix**: Create `.env.local` with valid Clerk keys (see Option 1)

### Issue: Module not found
**Error**: `Cannot find module '@/...'`

**Fix**:
```bash
cd frontend
npm install
```

### Issue: Port 3000 in use
**Error**: `Port 3000 is already in use`

**Fix**:
```bash
# Kill the process or use different port
npm run dev -- -p 3001
```

---

## 📸 Expected UI Preview

### Landing Page
```
┌─────────────────────────────────────────┐
│                                         │
│         TatvaOps Vision                 │
│      (gradient text H2)                 │
│                                         │
│   Transform your spaces with AI         │
│                                         │
│  [Get Started →]  [Sign In]             │
│                                         │
│ ┌──────┐ ┌──────┐ ┌──────┐             │
│ │ AI   │ │ Fast │ │ Ver- │             │
│ │ Power│ │ Flow │ │ sions│             │
│ └──────┘ └──────┘ └──────┘             │
└─────────────────────────────────────────┘
```

### Dashboard
```
┌─────────────────────────────────────────┐
│ Projects        [Search] [Grid] [+ New] │
├─────────────────────────────────────────┤
│ ┌────────┐ ┌────────┐ ┌────────┐       │
│ │ Modern │ │ Office │ │ Luxury │       │
│ │ Apt    │ │ Design │ │ Villa  │       │
│ │ 🟢Mood │ │ ✓Elev  │ │ ○Intent│       │
│ │ 4 rooms│ │ 3 rooms│ │ 8 rooms│       │
│ └────────┘ └────────┘ └────────┘       │
└─────────────────────────────────────────┘
```

### Moodboard Stage
```
┌─────────────────────────────────────────┐
│ AI Moodboard Generation                 │
├─────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│ │ 🖼️      │ │ ⚡Gen   │ │ ➕New   │   │
│ │ Living  │ │ Bedroom │ │ Kitchen │   │
│ │ Japandi │ │ 65%     │ │ Click   │   │
│ │ v2      │ │ ▓▓░░░   │ │ to gen  │   │
│ │[🔄][⬇] │ │         │ │         │   │
│ └─────────┘ └─────────┘ └─────────┘   │
└─────────────────────────────────────────┘
```

---

## 🎯 Next Steps After Setup

1. **Test Authentication** - Sign up → Sign in → Dashboard
2. **Test Entry Flow** - Choose entry point → Create project
3. **Test Stage Navigation** - Click through all 7 stages
4. **Test Moodboard** - Generate → Regenerate → Version history
5. **Test Responsiveness** - Resize browser, check mobile view
6. **Test Keyboard** - Tab through all interactive elements

---

## 📞 Need Help?

Current Status:
- ✅ Dependencies installed
- ✅ Dev server running (port 3000)
- ⏳ Waiting for Clerk API keys

**The UI is 100% ready - just needs environment variables to run!**

