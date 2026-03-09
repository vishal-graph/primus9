# 3D Walkthrough - Sense Layer Feature Guide

## 📖 Overview

The **Sense Layer** is the first part of the 3D Walkthrough system. It's a parallel entry point to the existing "Upload Floor Plan" flow that allows users to start with **minimal input**—images, text, sketches, or any combination—and have AI understand their design intent.

### Key Principle
**The Sense Layer NEVER generates images.** It only understands, infers, and structures user intent into an Intent Graph that downstream systems can consume.

---

## 🎯 What Problem Does It Solve?

**Traditional Flow Problems:**
- Users must have a floor plan to start
- Users must fill out detailed intent forms
- No way to start with just inspiration images
- Rigid, linear workflow

**Sense Layer Solution:**
- Start with ANY input: photos, sketches, moodboards, text
- AI infers intent automatically
- Flexible, non-linear entry point
- User can refine AI inferences before proceeding

---

## 🔄 User Journey

### 1. Entry Point
User lands on `/entry` page and sees:

```
┌─────────────────────────────────────────┐
│  How would you like to start?           │
├─────────────────────────────────────────┤
│                                          │
│  ┌────────────┐  ┌────────────┐        │
│  │ 3D         │  │ Upload     │        │
│  │ Walkthrough│  │ Floor Plan │        │
│  │    NEW     │  │            │        │
│  └────────────┘  └────────────┘        │
│                                          │
│  ┌────────────┐  ┌────────────┐        │
│  │ I Have     │  │ Resume     │        │
│  │ Moodboard  │  │ Project    │        │
│  └────────────┘  └────────────┘        │
└─────────────────────────────────────────┘
```

Clicks **"3D Walkthrough"** card → Creates project → Goes to sense intake page

### 2. Input Collection (TODO: UI Page)
User uploads inputs (all optional):

**Visual Inputs:**
- Interior photos (inspiration, existing space, Pinterest saves)
- Floor plan (rough sketch or CAD)
- Moodboards (collection of images)

**Text Input:**
- "Modern living room with warm colors and comfortable seating"
- "Scandinavian style bedroom for a couple"
- "Open concept kitchen with natural light"

**Quick Hints:**
- Space type: Living Room, Bedroom, Kitchen, etc.
- Budget: Economy, Moderate, Premium
- Style preference: Modern, Traditional, Industrial, etc.

### 3. AI Inference (Automatic)
Backend queues a Sense Inference job:

```
User Input
    ↓
Upload to S3
    ↓
POST /api/sense/intake
    ↓
Check Redis Cache (SHA256 hash)
    ├─ Cache Hit → Return immediately
    └─ Cache Miss → Enqueue SQS job
         ↓
Worker downloads images
         ↓
Gemini 2.0 Flash analyzes
         ↓
Returns structured JSON
         ↓
Intent Graph stored in DB
         ↓
Cached in Redis (30 days)
```

**Processing Time:**
- Cache hit: <50ms
- Cache miss: 3-8 seconds

### 4. Intent Preview (TODO: UI Component)
User sees AI-inferred intent:

```
┌─────────────────────────────────────────┐
│  Your Design Intent                      │
│  Confidence: 85%                         │
├─────────────────────────────────────────┤
│                                          │
│  Space Type: Living Room                 │
│                                          │
│  Style Signals:                          │
│  • Era: Contemporary                     │
│  • Warmth: High (cozy, inviting)         │
│  • Visual Density: Medium                │
│  • Colors: Beige, Wood tones, White      │
│                                          │
│  Component Preferences:                  │
│  • Furniture: Modern, comfortable seating│
│  • Materials: Wood, fabric, metal        │
│  • Lighting: Layered ambient & task      │
│                                          │
│  Lifestyle Signals:                      │
│  • Work from home: Likely                │
│  • Kids: Not detected                    │
│  • Pets: Not detected                    │
│                                          │
│  [ Refine ]  [ Looks Good, Continue ]   │
└─────────────────────────────────────────┘
```

### 5. Refinement (Optional, TODO: UI Dialog)
If AI got something wrong:

```
┌─────────────────────────────────────────┐
│  Refine Your Intent                      │
├─────────────────────────────────────────┤
│                                          │
│  Style Warmth:                           │
│  [===●=====] High                        │
│                                          │
│  Color Palette:                          │
│  [x] Beige  [x] Wood  [x] White          │
│  [ ] Gray   [ ] Navy  [ ] Green          │
│                                          │
│  Add Materials:                          │
│  + Leather  + Brass                      │
│                                          │
│  [ Cancel ]  [ Apply Refinements ]       │
└─────────────────────────────────────────┘
```

Clicking "Apply Refinements" triggers a new inference with user corrections.

### 6. Proceed to Moodboard Generation
Once satisfied, user clicks "Continue" → Intent Graph is passed to moodboard generation using **FORMAT 3**.

---

## 🏗️ Technical Architecture

### Data Models

**IntentGraph (Database)**
```typescript
{
  id: string;
  projectId: string;
  userId: string;
  inputs: {
    images: string[];      // S3 URLs
    floorPlan?: string;
    moodboards: string[];
    text?: string;
    hints: Record<string, unknown>;
  };
  inferred: {
    spaceType: string;
    styleSignals: {
      era?: string;
      warmth: 'low' | 'medium' | 'high';
      visualDensity: 'sparse' | 'medium' | 'dense';
      colorPalette: string[];
    };
    componentPreferences: {
      furniture: string[];
      materials: string[];
      lighting: string;
    };
    changeBoundaries: {
      preserve: string[];
      mustChange: string[];
    };
    lifestyleSignals?: {
      hasKids?: boolean;
      hasPets?: boolean;
      workFromHome?: boolean;
    };
    confidence: number;
    inferredFrom: string[];
  };
  constraints: {
    preserve?: string[];
    mustChange?: string[];
  };
  priorities: {
    style?: number;
    cost?: number;
    speed?: number;
  };
  confidence: number;
  version: number;
  inputHash?: string;     // SHA256 for deduplication
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

### API Endpoints

#### POST /api/sense/intake
Create Intent Graph from inputs.

**Request:**
```json
{
  "projectId": "uuid",
  "inputs": {
    "images": ["s3://bucket/img1.jpg"],
    "text": "Modern living room",
    "hints": {
      "spaceType": "living_room",
      "budget": "moderate"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "uuid",
    "fromCache": false,
    "message": "Inference job queued"
  }
}
```

#### GET /api/sense/:projectId
Retrieve Intent Graph.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "projectId": "uuid",
    "inferred": { /* ... */ },
    "confidence": 0.85,
    "version": 1
  }
}
```

#### POST /api/sense/:projectId/refine
Apply user refinements.

**Request:**
```json
{
  "refinements": {
    "styleSignals": {
      "warmth": "high",
      "colorPalette": ["beige", "wood", "white", "brass"]
    }
  }
}
```

#### DELETE /api/sense/:projectId
Delete Intent Graph.

### Server Actions (Frontend)

```typescript
// Upload files
const { success, urls } = await uploadSenseInputs(files);

// Trigger inference
const { success, jobId, fromCache } = await processIntent(projectId, {
  images: urls,
  text: "Modern living room",
  hints: { spaceType: "living_room" }
});

// Poll job status
const { success, data } = await getSenseJobStatus(jobId);

// Fetch Intent Graph
const { success, data } = await getIntentGraph(projectId);

// Refine
const { success, jobId } = await refineIntentGraph(projectId, refinements);

// Delete
const { success } = await deleteIntentGraph(projectId);
```

### Redux State

```typescript
// Access state
const senseState = useAppSelector((state) => state.sense);

// Dispatch actions
dispatch(startUpload());
dispatch(addUploadedFile({ file, category: 'images' }));
dispatch(startProcessing({ jobId, fromCache }));
dispatch(inferenceComplete(intentGraph));
```

---

## 🔌 Integration with Existing System

### Moodboard Generation (FORMAT 3)

The moodboard handler now supports 3 formats:

```typescript
interface MoodboardJobPayload {
  // ... existing fields
  
  // FORMAT 1: Legacy - direct DesignIntent
  designIntent?: DesignIntent;
  
  // FORMAT 2: UI forms - IntentPayload
  intentPayload?: IntentPayload;
  
  // FORMAT 3: NEW - Intent Graph (Sense Layer)
  intentGraphId?: string;
}
```

**When `intentGraphId` is present:**
1. Worker fetches Intent Graph from database
2. Maps `InferredIntent → IntentPayload` via `intentGraphMapper`
3. Maps `IntentPayload → DesignIntent` via existing `intentMapper`
4. Generates moodboard with DesignIntent

**Result:** Seamless integration, no breaking changes!

### Project Flow

**Traditional Flow:**
```
Upload Floor Plan → Detect Rooms → Intent Stage → Moodboard → Elevation
```

**New Parallel Flow:**
```
3D Walkthrough → Sense Intake → Intent Graph → Moodboard → Elevation
                     ↓
              (Optional) Intent Refinement
```

Both flows converge at the Moodboard stage.

---

## 💡 Usage Examples

### Example 1: Minimal Text Input
**User Input:**
- Text: "Scandinavian bedroom for a couple"

**AI Infers:**
- Space Type: Bedroom
- Era: Scandinavian
- Warmth: Medium
- Colors: White, light wood, soft gray
- Materials: Light wood, linen, wool
- Furniture: Minimalist, functional
- Lighting: Natural-focus, warm

### Example 2: Image-Heavy Input
**User Input:**
- 5 Pinterest images of modern living rooms
- Text: "Something like these but warmer"

**AI Infers:**
- Space Type: Living Room
- Era: Contemporary
- Warmth: High (overridden from images)
- Colors: Extracted from images + warm tones
- Materials: Detected from images
- Furniture: Style from images
- Lighting: Inferred from image analysis

### Example 3: Floor Plan + Moodboard
**User Input:**
- Floor plan sketch
- 3 moodboard images
- Hints: Budget = Premium, Style = Industrial

**AI Infers:**
- Space Type: Detected from floor plan
- Layout: Extracted from floor plan
- Style: Industrial (from hint + moodboard)
- Materials: Metal, concrete, exposed brick
- Budget considerations built-in

---

## 🎨 Design Principles

1. **Minimal Input, Maximum Understanding**
   - User provides as little or as much as they want
   - AI fills in the gaps intelligently

2. **Confidence-Based UX**
   - High confidence (>0.8): Auto-proceed option
   - Medium (0.6-0.8): Show preview, suggest review
   - Low (<0.6): Force review/refinement

3. **Transparent Reasoning**
   - Show what AI inferred from what input
   - "Era: Contemporary (inferred from images 1, 3, 5)"

4. **User Control**
   - Always allow refinement before proceeding
   - Don't lock user into AI decisions

5. **Deduplication & Cost Optimization**
   - Cache identical inputs for 30 days
   - Only charge credits once per unique input set

---

## 📊 Metrics & Monitoring

### Key Metrics

**Performance:**
- Cache hit rate (target: >40%)
- Average inference time (target: <5s)
- Upload time per file (target: <2s)

**Quality:**
- Confidence score distribution
- Refinement rate (% users who refine)
- Proceed-without-refinement rate

**Cost:**
- Gemini API calls per day
- Cache savings (avoided API calls)
- Average cost per inference

### Logging

```typescript
// Backend logs
logger.info('Sense inference started', { jobId, projectId, inputHash });
logger.info('Cache hit', { inputHash, projectId });
logger.info('Intent Graph created', { jobId, confidence, spaceType });

// Worker logs
logger.info('Gemini inference completed', { jobId, processingTimeMs });
logger.debug('Prompt tokens', { input: 1500, output: 800 });
logger.warn('Low confidence result', { confidence: 0.55, spaceType });
```

---

## 🔒 Security & Privacy

- ✅ All endpoints require Clerk authentication
- ✅ User can only access their own Intent Graphs
- ✅ Images stored in user-scoped S3 buckets
- ✅ Redis cache keys include userId
- ✅ Input validation via Zod schemas
- ✅ Rate limiting on API endpoints

---

## 🚀 Future Enhancements (Not in Scope)

1. **Multi-Room Intent**
   - Infer intent for multiple rooms from single floor plan
   
2. **Style Transfer**
   - "Apply this style from image A to space B"

3. **Conversational Refinement**
   - Chat interface for iterative refinement
   - "Make it warmer", "Add more green"

4. **Intent History**
   - Track user's style evolution
   - Suggest similar spaces

5. **Collaborative Intent**
   - Multiple users refine same Intent Graph
   - Family/designer collaboration

---

## 📞 Support

### Common User Questions

**Q: How many images should I upload?**
A: 3-10 images work best. More than 10 may slow inference.

**Q: Can I skip uploading images?**
A: Yes! Text-only works, but images improve accuracy.

**Q: What if AI gets it wrong?**
A: You can refine any inferences before proceeding.

**Q: Are my uploads cached?**
A: Yes, for 30 days. Identical inputs return instantly.

**Q: Can I edit Intent Graph later?**
A: Yes, use the refinement feature at any time.

### Developer Troubleshooting

**Issue: Cache not working**
- Check Redis connection
- Verify `inputHash` generation
- Check cache key format: `intent:hash:{hash}`

**Issue: Low confidence scores**
- Add more input images
- Provide text context
- Check image quality (resolution, clarity)

**Issue: Gemini timeout**
- Reduce number of images
- Check API key validity
- Increase worker timeout setting

---

**Feature Status:** ✅ Backend Complete, Frontend Infrastructure Ready  
**Documentation Version:** 1.0.0  
**Last Updated:** January 2026
