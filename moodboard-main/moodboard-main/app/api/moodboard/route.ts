import { NextRequest, NextResponse } from "next/server";

// Use v1beta as is common for these newer models
const GEMINI_API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

type MoodboardRequestBody = {
  summary?: string;
  style?: string;
  roomType?: string;
  colorPaletteOverride?: string;
  moodOverride?: string;
  // Full extracted data from image analysis
  aestheticStyle?: string;
  themeMood?: string;
  colorPalette?: string;
  materialPreferences?: string;
  texturePreferences?: string;
  furniturePreferences?: string;
  decorPreferences?: string;
  lightingPreferences?: string;
  notes?: string;
};

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_IMAGE_MODEL; // e.g. gemini-2.5-flash-image

    if (!apiKey || !model) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY or GEMINI_IMAGE_MODEL is not configured." },
        { status: 500 }
      );
    }

    const body = (await req.json()) as MoodboardRequestBody;
    const summary = body.summary ?? "";
    const style = body.style ?? body.aestheticStyle ?? "";
    const roomType = body.roomType ?? "";
    const colorPaletteOverride = body.colorPaletteOverride ?? body.colorPalette ?? "";
    const moodOverride = body.moodOverride ?? body.themeMood ?? "";

    // Use extracted data if available, otherwise fall back to overrides/summary
    const roomTypeValue = roomType || "";
    const aestheticStyleValue = body.aestheticStyle || style || "";
    const themeMoodValue = body.themeMood || moodOverride || "";
    const colorPaletteValue = body.colorPalette || colorPaletteOverride || "";
    const materialPreferencesValue = body.materialPreferences || "";
    const texturePreferencesValue = body.texturePreferences || "";
    const furniturePreferencesValue = body.furniturePreferences || "";
    const decorPreferencesValue = body.decorPreferences || "";
    const lightingPreferencesValue = body.lightingPreferences || "";
    const notesValue = body.notes || "";

    // Build the detailed collage prompt using extracted data
    const collagePrompt = [
      "Create a high-resolution interior design moodboard in a dense collage style with overlapping images, torn paper edges, pinned swatches, taped corners, textured backgrounds, and no empty space. Use the following extracted design inputs:",
      "",
      `Room Type: ${roomTypeValue}`,
      `Aesthetic Style: ${aestheticStyleValue}`,
      `Theme / Mood: ${themeMoodValue}`,
      `Color Palette: ${colorPaletteValue}`,
      `Materials: ${materialPreferencesValue}`,
      `Textures: ${texturePreferencesValue}`,
      `Furniture: ${furniturePreferencesValue}`,
      `Decor: ${decorPreferencesValue}`,
      `Lighting: ${lightingPreferencesValue}`,
      notesValue ? `Notes: ${notesValue}` : "",
      "",
      "Arrange fabric swatches, material tiles, inspiration photos, lighting samples, sketches, and palette strips in a cohesive, magazine-style moodboard layout. Use soft shadows and overlapping composition to match high-end interior design collage boards.",
      "",
      "Create a tightly packed, high-resolution interior design moodboard with NO empty space and a fully overlapping collage layout.",
      "Ensure every element—photos, material samples, fabric swatches, color palette strips, lighting references, decor items, sketches, and annotations—is arranged closely together with natural overlap.",
      "Use tape pieces, pins, torn-paper edges, soft shadows, and layered textures to achieve an authentic designer collage aesthetic.",
      "Avoid placing objects separately or floating; instead, make items touch, overlap, or cluster organically. Fill the entire canvas so there are ZERO blank gaps or unused areas.",
      "The background should be warm, soft, textured paper.",
      "",
      "Use: torn paper edges, taped corners, fabric swatches, material tiles, color palette strips, clear and sharp labels, small caption tags near key items, soft shadows, aesthetic layering, and editorial layout styling. All text and labels must be high-resolution, **very sharp and readable**, with solid high-contrast fonts (no cursive scribbles, no faux handwriting, no blur). Make all text at least medium size so it is legible even when the image is scaled down. Do NOT display objects isolated on white; always embed them into a collage composition. Avoid large empty spaces; fill the canvas with a balanced, natural collage.",
      "",
      roomTypeValue
        ? `Room type for this moodboard: "${roomTypeValue}". Only show this room type. For example, if the room type is "Balcony / Outdoor", the entire moodboard must clearly depict balcony / outdoor scenes and elements. Do NOT show unrelated interior room types like living rooms, dining rooms, or bedrooms.`
        : "",
      aestheticStyleValue
        ? `Moodboard Style (heading text on the moodboard): "${aestheticStyleValue}". Place this style name as a clear, elegant heading on the moodboard (similar to a magazine title), e.g. top-left or top-center, integrated with the collage design.`
        : "",
      "",
      "Include:",
      "- Color palette section",
      "- Fabric swatches section",
      "- 2–4 room inspiration photos",
      "- Material tiles (stone, wood, metal)",
      "- Key furniture elements",
      "- Lighting samples",
      "- Sketch / line drawing element",
      "- Labels or annotations for each key element (colors, fabrics, materials, furniture, lighting) using neat, consistent, high-contrast typography (simple sans-serif or minimal serif), not decorative cursive. Text must be **pin-sharp**, not fuzzy or pixelated.",
      "- 2–4 short summary text blocks placed inside the collage (for example, describing the overall mood, key design goals, or styling notes). These summaries should be only 1–2 short lines each, with bold, clean, easy-to-read type. Do NOT render these summaries as illegible or warped text.",
      "- Natural overlapping composition",
      "",
      "Background: soft beige, warm off-white, textured paper.",
      "",
      "Overall aesthetic: polished, warm, curated, magazine-layout, interior-designer style.",
      "",
      "Do NOT add any logos, brand marks, or watermarks inside the generated image. Focus purely on the interior design collage.",
      "Match the density, compactness, and overlapping style of high-end interior designer moodboards. Make the whole composition visually rich, full, cohesive, and intentionally layered."
    ]
      .filter(line => line !== "") // Remove empty lines
      .join("\n");

    // Using generateContent as per your SDK example
    const url = `${GEMINI_API_ENDPOINT}/${model}:generateContent?key=${apiKey}`;

    // Create an AbortController with a 90-second timeout (images take longer)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    try {
      const geminiRes = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: collagePrompt }]
            }
          ],
          generationConfig: {
            // Explicitly request image output from the multimodal image model
            responseModalities: ["Image"],
            temperature: 0.4
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!geminiRes.ok) {
        const errorText = await geminiRes.text();
        console.error("Gemini image API error:", errorText);
        return NextResponse.json(
          { error: "Failed to generate moodboard image." },
          { status: 500 }
        );
      }

      const data = await geminiRes.json();

      // Check all parts for inlineData (image)
      const parts = data.candidates?.[0]?.content?.parts || [];
      let img: string | undefined;
      
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          img = part.inlineData.data;
          break;
        }
      }

      if (!img) {
        // Log the full response for debugging
        console.error("No inlineData found in response:", JSON.stringify(data, null, 2));
        
        // Check if model returned text instead of image
        const textResponse = parts.find((p: any) => p.text)?.text;
        if (textResponse) {
          console.error("Model returned text instead of image:", textResponse);
          return NextResponse.json(
            { 
              error: "The image generation model returned text instead of an image. Please check your GEMINI_IMAGE_MODEL configuration. The model may not support image generation or may require different parameters." 
            },
            { status: 500 }
          );
        }
        
        return NextResponse.json(
          { error: "No image data returned from model." },
          { status: 500 }
        );
      }

      return NextResponse.json({ image: img });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error("Moodboard API timeout:", fetchError);
        return NextResponse.json(
          { error: "Request timed out. Please check your internet connection and try again." },
          { status: 504 }
        );
      }
      if (fetchError.code === 'UND_ERR_CONNECT_TIMEOUT' || fetchError.cause?.code === 'UND_ERR_CONNECT_TIMEOUT') {
        console.error("Moodboard API connection timeout:", fetchError);
        return NextResponse.json(
          { error: "Connection timeout. Please check your internet connection, firewall settings, or VPN, and try again." },
          { status: 504 }
        );
      }
      throw fetchError;
    }
  } catch (error) {
    console.error("Moodboard API error:", error);
    return NextResponse.json(
      { error: "Unexpected error while generating moodboard. Please try again." },
      { status: 500 }
    );
  }
}
