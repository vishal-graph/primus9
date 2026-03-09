## AI Interior Moodboard Generator

An AI‑powered interior design assistant built with **Next.js 14 (App Router)** and **Google Gemini** that:

- Lets users **upload a reference image**
- Uses **Gemini 2.5 Vision** to extract detailed design attributes
- Auto‑fills a rich **interior design brief form**
- Generates a **collage‑style moodboard image** via an image‑capable Gemini / Imagen model

This project is intended as a practical reference for combining multimodal analysis (image → structured JSON) with image generation (prompt → collage moodboard).

---

## Tech Stack

- **Framework**: Next.js 14 (App Router, TypeScript)
- **UI**: Tailwind CSS + custom components
- **AI Models** (Google AI Studio / Gemini API):
  - Text / Vision: `GEMINI_TEXT_MODEL` (e.g. `gemini-2.0-flash-exp`, `gemini-1.5-pro`)
  - Image: `GEMINI_IMAGE_MODEL` (e.g. `gemini-2.5-flash-image`, or another image‑capable model available to your project)

---

## Features

- **Reference Image Analysis**
  - Upload any room photo
  - Gemini Vision extracts:
    - Room type
    - Aesthetic style
    - Theme / mood
    - Color palette
    - Materials & textures
    - Furniture & decor preferences
    - Lighting style
    - Extra notes

- **Smart Form Auto‑Fill**
  - The main brief form (`UserForm`) is automatically populated from the analysis:
    - Room Type
    - Aesthetic Style
    - Theme / Mood
    - Color Palette
    - Materials
    - Textures
    - Furniture
    - Decor
    - Lighting
  - Dropdown values are normalized to match predefined options where possible.
  - Loader: **“Analyzing reference image…”** shown during image analysis.

- **Collage‑Style Moodboard Generation**
  - When the user clicks **Generate Moodboard**, the app sends:
    - Summary text
    - All extracted & user‑edited design attributes
  - Backend builds a **dense collage prompt** (overlaps, tape, swatches, textures, magazine layout).
  - Calls **Gemini Image / Imagen 3** to generate a high‑resolution interior moodboard.

- **Moodboard Regeneration**
  - User can tweak style / color / mood and regenerate.
  - The latest overrides are passed back into `/api/moodboard` to refine the collage.

---

## Project Structure (Key Files)

- `app/page.tsx`
  - Main UI composition.
  - Manages:
    - Summary text
    - Last form values
    - Selected style & room type
    - Moodboard image + loading states
  - Hooks into:
    - `UserForm` for collecting / auto‑filling data
    - `SummaryCard` for previewing the generated summary
    - `MoodboardResult` for displaying and regenerating the moodboard

- `app/components/UserForm.tsx`
  - Client component holding the **interior design brief form**.
  - Handles:
    - Input / select changes
    - Reference image upload
    - Calling `/api/summary` to get a **text+image combined analysis**
    - Calling `/api/analyze-image` to **auto‑fill the form directly from an uploaded image**
  - Shows:
    - “Generating Summary…” button state
    - “Analyzing reference image…” indicator while image analysis runs.

- `app/components/SummaryCard.tsx`
  - Displays the AI‑generated interior design summary.
  - Provides a **Generate Moodboard** button.

- `app/components/MoodboardResult.tsx`
  - Renders the generated moodboard image.
  - Shows key design details (room, style, palette, mood).
  - Supports:
    - Resetting back to the form
    - Regenerating the moodboard with altered style / palette / mood.

- `app/api/summary/route.ts`
  - **POST** `/api/summary`
  - Input body (`SummaryRequestBody`):
    - Form fields (roomType, style, colorPalette, materials, textures, mood, furniture, decor, lighting, technology, budget, renovationScope, timeframe, imageLinks)
    - Optional `referenceImage` as a base64 data URL.
  - Behavior:
    - Builds a structured prompt that combines:
      - The **uploaded image** (if present) via `inlineData`
      - The **user text inputs** as hints
    - Calls **Gemini text/vision** (`GEMINI_TEXT_MODEL`) with:
      - A schema‑style instruction to output a single JSON object:
        - `summary`, `roomType`, `aestheticStyle`, `themeMood`, `colorPalette`, `materialPreferences`, `texturePreferences`, `furniturePreferences`, `decorPreferences`, `lightingPreferences`, `notes`
    - Handles JSON wrapped in markdown code fences by stripping ```json ... ``` before parsing.
    - Returns:
      - `summary`: short 1–2 sentence description
      - `autoFill`: best‑effort merge of extracted values into the original form.

- `app/api/analyze-image/route.ts`
  - **POST** `/api/analyze-image`
  - Request:
    - `FormData` with an `image` field (`File`).
  - Behavior:
    - Validates `image/*` type and max size.
    - Converts file to base64 and sends as `inlineData` to `GEMINI_TEXT_MODEL`.
    - Uses a strict prompt to request **only JSON**:
      - `roomType`, `aestheticStyle`, `themeMood`, `colorPalette`, `materialPreferences`, `texturePreferences`, `furniturePreferences`, `decorPreferences`, `lightingPreferences`, `notes`.
    - Strips markdown fences if needed, parses JSON, and returns these fields.
  - Used by `UserForm` to **auto‑fill** the UI without needing any text input.

- `app/api/moodboard/route.ts`
  - **POST** `/api/moodboard`
  - Request body (`MoodboardRequestBody`):
    - `summary?`
    - `style?` / `aestheticStyle?`
    - `roomType?`
    - `colorPaletteOverride?` / `colorPalette?`
    - `moodOverride?` / `themeMood?`
    - `materialPreferences?`
    - `texturePreferences?`
    - `furniturePreferences?`
    - `decorPreferences?`
    - `lightingPreferences?`
    - `notes?`
  - Behavior:
    - Builds a **very detailed collage prompt**:
      - Dense, overlapping layout
      - Torn paper edges, tape, pins
      - Fabric swatches, material tiles, palette strips
      - Room photos, lighting, sketches, annotations
      - No empty space; magazine‑style composition
    - Injects the extracted design attributes into the prompt (room type, style, palette, mood, materials, textures, furniture, decor, lighting, notes).
    - Calls the image model (`GEMINI_IMAGE_MODEL`) via `generateContent`:
      - `generationConfig.responseModalities = ["Image"]` to force image output.
    - Extracts base64 image data from `response.candidates[0].content.parts[*].inlineData.data`.
    - Returns `{ image: <base64> }` to the frontend.
    - Logs and returns clear errors if:
      - The model returns only text
      - No `inlineData` is present
      - Network / timeout issues occur.

---

## API Reference

### **POST** `/api/analyze-image`

Analyze a single uploaded reference image and return structured design attributes.

- **Request**
  - **Headers**: none special (browser will set multipart boundary)
  - **Body**: `multipart/form-data`
    - **Fields**:
      - `image` – required, `File` (`image/*`), max ~4 MB recommended

```http
POST /api/analyze-image HTTP/1.1
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary

------WebKitFormBoundary
Content-Disposition: form-data; name="image"; filename="room.jpg"
Content-Type: image/jpeg

...binary...
------WebKitFormBoundary--
```

- **Success Response** `200 OK`

```json
{
  "roomType": "Balcony",
  "aestheticStyle": "Eclectic",
  "themeMood": "Relaxing",
  "colorPalette": "Neutral, Earthy, Green, Blue, Brown",
  "materialPreferences": "Wicker, Rope, Wood, Ceramic, Fabric",
  "texturePreferences": "Rough, Soft, Woven",
  "furniturePreferences": "Hanging Swing Chair",
  "decorPreferences": "Plants, Rugs, Wall Art, Baskets",
  "lightingPreferences": "Natural Light",
  "notes": "Additional free‑form observations from the image."
}
```

- **Error Responses**
  - `400` – missing or invalid `image`
  - `500/502/504` – Gemini / network issues, with a JSON `{ "error": "..." }` message.

---

### **POST** `/api/summary`

Combine user text inputs and optional base64 reference image into a structured design summary.

- **Request**
  - **Headers**: `Content-Type: application/json`
  - **Body** (`SummaryRequestBody`, all fields optional unless noted in UI):

```json
{
  "roomType": "Living room",
  "style": "Traditional English Country",
  "colorPalette": "Warm neutrals",
  "materials": "Oak, linen, wool",
  "textures": "Soft, woven, matte",
  "mood": "Cozy",
  "furniture": "Sofa, armchairs, coffee table",
  "decor": "Rugs, lamps, framed art",
  "lighting": "Warm ambient, floor lamps",
  "technology": "Hidden TV, smart lighting",
  "budget": "Premium",
  "renovationScope": "Full makeover",
  "timeframe": "Flexible",
  "imageLinks": "https://www.pinterest.com/...",
  "referenceImage": "data:image/jpeg;base64,AAA..."  // optional
}
```

- **Success Response** `200 OK`

```json
{
  "summary": "Short 1–2 sentence description of the design and feeling of the space.",
  "autoFill": {
    "roomType": "Living room",
    "style": "Traditional English Country",
    "colorPalette": "Warm neutrals (beige, sand, cream)",
    "materials": "Oak wood, linen upholstery, wool textiles",
    "textures": "Soft, woven, matte finishes",
    "mood": "Cozy, inviting, calm",
    "furniture": "Skirted sofa, rolled‑arm armchairs, wooden coffee table",
    "decor": "Patterned rug, framed botanical prints, table lamps, vases",
    "lighting": "Warm ambient lighting, table lamps, a central chandelier",
    "technology": "Hidden TV cabinet",
    "budget": "Premium",
    "renovationScope": "Full makeover",
    "timeframe": "Flexible",
    "imageNotes": "Extra observations / constraints inferred from the image."
  }
}
```

- **Error Responses**
  - `500` – configuration error (missing env vars)
  - `502/504` – Gemini / network errors, always with `{ "error": "..." }`.

---

### **POST** `/api/moodboard`

Generate a collage‑style interior moodboard image from the extracted + user‑edited design attributes.

- **Request**
  - **Headers**: `Content-Type: application/json`
  - **Body** (`MoodboardRequestBody`, most fields optional but **strongly recommended**):

```json
{
  "summary": "1–2 sentence summary of the concept",
  "style": "Traditional English Country",
  "roomType": "Living room",
  "colorPaletteOverride": "Warm neutrals, forest green accents",
  "moodOverride": "Cozy, layered, heritage",

  "aestheticStyle": "Traditional English Country",
  "themeMood": "Cozy heritage living room",
  "colorPalette": "Warm neutrals, forest green, brass",
  "materialPreferences": "Oak, linen, wool, brass",
  "texturePreferences": "Soft, woven, tufted, matte",
  "furniturePreferences": "Chesterfield sofa, wingback chairs, wooden coffee table",
  "decorPreferences": "Patterned rugs, framed art, table lamps, books, plants",
  "lightingPreferences": "Warm, layered lighting, sconces, table lamps",
  "notes": "Emphasise layered textiles, heritage patterns, and cozy reading nooks."
}
```

- **Success Response** `200 OK`

```json
{
  "image": "BASE64_IMAGE_DATA"
}
```

The frontend typically uses this as a data URL:

```ts
const src = `data:image/png;base64,${image}`;
```

- **Error Responses**
  - `500` – missing env vars, model not image‑capable, or no `inlineData` returned
  - `504` – timeout

---

## Getting Started

### 1. Prerequisites

- **Node.js** 18+ (recommended LTS)
- **npm** or **pnpm** / **yarn**
- A **Google Gemini / AI Studio** API key with:
  - Access to a **text/vision** model (`GEMINI_TEXT_MODEL`)
  - Access to an **image‑capable** model (`GEMINI_IMAGE_MODEL`)

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Create `.env.local` in the project root:

```bash
GEMINI_API_KEY=YOUR_API_KEY_HERE

# Text / vision model, used for summary + image analysis
GEMINI_TEXT_MODEL=gemini-2.0-flash-exp   # or another supported text/vision model

# Image model, used for collage moodboard generation
GEMINI_IMAGE_MODEL=gemini-2.5-flash-image  # or another supported image-capable model
```

> **Note:** Model names and availability depend on your Google Cloud / Gemini project.  
> If moodboard generation returns text instead of an image, verify the image model you’re using supports `responseModalities: ["Image"]` and image output.

### 4. Run the Dev Server

```bash
npm run dev
```

Then open `http://localhost:3000` in your browser.

---

## Usage Flow

1. **Open the app**
   - See the **Interior Moodboard Generator** form.

2. **(Optional) Upload a Reference Image**
   - Click **Choose File** and select an image of your room.
   - The app:
     - Uploads the file to `/api/analyze-image` as `FormData`.
     - Shows **“Analyzing reference image…”**.
     - Receives a JSON object of extracted design attributes.
     - Auto‑fills:
       - Room type, aesthetic style, mood, palette, materials, textures, furniture, decor, lighting, notes.

3. **Refine the Form**
   - Adjust any dropdowns or text inputs:
     - Change style from e.g. *Eclectic* to *Modern*
     - Narrow the color palette
     - Add specific furniture needs or constraints.

4. **Generate Summary**
   - Click **Generate Summary**.
   - `/api/summary`:
     - Combines image (if provided) + your text fields.
     - Returns a brief, human‑readable design summary.
   - The summary is shown in `SummaryCard`.

5. **Generate Moodboard**
   - Click **Generate Moodboard** from the summary card.
   - `/api/moodboard`:
     - Builds the collage prompt using all current design data.
     - Calls `GEMINI_IMAGE_MODEL` to generate a base64 image.
   - The moodboard appears in `MoodboardResult`.

6. **Regenerate Variations**
   - Use `MoodboardResult` controls to tweak:
     - Style
     - Color palette
     - Mood
   - Regenerate to explore multiple directions.

---

## Error Handling & Troubleshooting

- **“GEMINI_API_KEY or GEMINI_TEXT_MODEL is not configured.”**
  - Check `.env.local` is present and variables are correctly set.
  - Restart the dev server after changing env vars.

- **JSON parsing errors from Gemini**
  - Both `/api/summary` and `/api/analyze-image`:
    - Strip markdown fences like ```json … ``` before `JSON.parse`.
  - If you still see parse issues, inspect the logged `rawText` in your terminal.

- **“No image data returned from model.”**
  - The image model responded with text instead of an image, or your API key cannot access image output.
  - Check:
    - `GEMINI_IMAGE_MODEL` really is an **image‑capable** model for your project.
    - Google’s docs for the chosen model and supported parameters.

- **Timeout / network errors**
  - All API routes use `AbortController` with generous timeouts and return helpful 5xx messages.
  - Check your internet / VPN / firewall if calls repeatedly time out.

---

## Extending the Project

Ideas for future improvements:

- **Persistent history**
  - Save past summaries and moodboards to a database (e.g. Supabase / Prisma + Postgres).

- **Multiple moodboards per project**
  - Let users create multiple concepts for the same room and compare them side‑by‑side.

- **Download & share**
  - Add “Download PNG” and “Copy share link” actions for generated moodboards.

- **Multi‑image references**
  - Accept multiple inspiration images and blend their attributes.

---

## Scripts

From `package.json`:

- `npm run dev` – Start Next.js dev server
- `npm run build` – Production build
- `npm run start` – Start the production server
- `npm run lint` – Run ESLint

---

## License

This repository is currently private to your organization / project.  
Add a license file (e.g. `MIT`) if you plan to open‑source it.


