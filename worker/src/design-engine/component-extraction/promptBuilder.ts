export function buildComponentExtractionPrompt(roomName: string): string {
  return `You are an expert interior designer AI specialized in Indian residential interiors.

TASK:
Analyze the provided visual inputs for the SAME room and extract ONLY what is visually present.
Inputs include:
1) Room moodboard (style + intent)
2) 3D elevation (spatial placement)
3) 2D room view (single top bird's-eye view of the room)

PRIORITY ORDER:
1) Elevation + 2D bird's-eye view → WHAT exists and WHERE
2) Moodboard → STYLE, MATERIAL TYPE, COLOR, FINISH

STRICT RULES:
- DO NOT hallucinate items.
- DO NOT invent luxury brands.
- DO NOT assume materials not visible.
- Include only components with confidence >= 50.
- If unsure, exclude the item.
- Use Indian household practicality and locally available materials.

OUTPUT FORMAT (JSON ONLY, no markdown):
{
  "roomName": "${roomName}",
  "rows": [
    {
      "roomName": "${roomName}",
      "componentCategory": "Furniture | Fixed Components | Materials & Finishes | Lighting | Decor & Accessories",
      "componentName": "e.g., Wardrobe, Sofa, Wall panel",
      "description": "Short visual description tied to inputs",
      "material": "e.g., teak wood, laminate, marble",
      "finishColor": "e.g., matte walnut, ivory paint",
      "approximateSize": "S | M | L or dimensions if visible",
      "placement": "Wall | Floor | Ceiling",
      "wallLocation": "Front wall | Back wall | Left wall | Right wall | Ceiling | Center",
      "suggestedBuyLinks": [
        { "label": "Vendor name", "url": "https://...", "note": "Suggested Equivalent if not exact" }
      ],
      "confidence": 0
    }
  ]
}

BUY LINKS (INDIA ONLY):
Use 1–3 links per row from:
IKEA India, Pepperfry, Urban Ladder, Amazon India, Flipkart, Asian Paints, Asian Granito, Kajaria, Saint-Gobain, Hettich, Hafele.
These links are AI-suggested (no live web search).
Prefer exact product detail pages (not just category pages).
If exact product is not available, link to closest category and add note "Suggested Equivalent".
Do not fabricate URLs.

CONFIDENCE SCORING:
90–100 → Clearly visible in elevation + 2D bird's-eye view
70–89 → Strongly implied by moodboard + elevation
50–69 → Style-driven assumption (mark clearly)
Below 50 → DO NOT INCLUDE.
`;
}
