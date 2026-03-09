import { NextRequest, NextResponse } from "next/server";

const GEMINI_TEXT_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1/models";

type SummaryRequestBody = {
  roomType?: string;
  style?: string;
  colorPalette?: string;
  materials?: string;
  textures?: string;
  mood?: string;
  furniture?: string;
  decor?: string;
  lighting?: string;
  technology?: string;
  budget?: string;
  renovationScope?: string;
  timeframe?: string;
  imageLinks?: string; // 'Extra Notes / Links'
  referenceImage?: string; // Base64 data URL
};

type AnalysisResult = {
  summary: string;
  roomType: string;
  aestheticStyle: string;
  themeMood: string;
  colorPalette: string;
  materialPreferences: string;
  texturePreferences: string;
  furniturePreferences: string;
  decorPreferences: string;
  lightingPreferences: string;
  notes: string;
};

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_TEXT_MODEL;

    if (!apiKey || !model) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY or GEMINI_TEXT_MODEL is not configured." },
        { status: 500 }
      );
    }

    const body = (await req.json()) as SummaryRequestBody;
    const schemaPrompt = `You are an expert interior designer and visual interpreter. Analyze the user’s uploaded reference image in extreme detail. You will also receive optional user-provided text fields (room type, style, etc.). Your job is to combine the IMAGE and TEXT and convert everything into structured form data.

Extract the following attributes from the image (using the user text only as a hint, but never contradicting what you clearly see):

- Room type (bathroom, living room, bedroom, dining room, office, kitchen, etc.)
- Aesthetic style (modern, contemporary, Scandinavian, minimalist, luxury, industrial, boho, coastal, farmhouse, transitional, etc.)
- Theme or mood (cozy, airy, dramatic, calm, warm, bold, elegant, natural, etc.)
- Color palette (list the main colors seen)
- Material preferences (wood type, metals, stones, tiles, upholstery, fabrics)
- Texture preferences (matte, glossy, rough, linen, velvet, boucle, etc.)
- Furniture preferences (sofa style, chair type, tables, cabinets, bathtub style, etc.)
- Decor preferences (plants, mirrors, lamps, vases, art, accessories)
- Lighting style (pendant, wall sconce, natural light, warm lighting, etc.)
- Additional notes (special features, patterns, layout hints)

Return ONLY a single JSON object with this exact shape and property names:
{
  "summary": "Short 1-2 sentence description of the overall design and feeling of the space.",
  "roomType": "string",
  "aestheticStyle": "string",
  "themeMood": "string",
  "colorPalette": "string",
  "materialPreferences": "string",
  "texturePreferences": "string",
  "furniturePreferences": "string",
  "decorPreferences": "string",
  "lightingPreferences": "string",
  "notes": "any extra observations, constraints, or suggestions from the image and text"
}

Do not add explanations or comments. Only output the JSON object itself.`;

    const userContext = [
      `User-provided fields (these are hints, may be refined by image analysis):`,
      `Room type: ${body.roomType ?? ""}`,
      `Style: ${body.style ?? ""}`,
      `Color palette: ${body.colorPalette ?? ""}`,
      `Materials: ${body.materials ?? ""}`,
      `Textures: ${body.textures ?? ""}`,
      `Mood: ${body.mood ?? ""}`,
      `Furniture needs: ${body.furniture ?? ""}`,
      `Decor: ${body.decor ?? ""}`,
      `Lighting: ${body.lighting ?? ""}`,
      `Tech/Smart features: ${body.technology ?? ""}`,
      `Budget: ${body.budget ?? ""}`,
      `Scope: ${body.renovationScope ?? ""}`,
      `Timeframe: ${body.timeframe ?? ""}`,
      `Extra notes/Links: ${body.imageLinks ?? ""}`
    ].join("\n");

    const parts: any[] = [];

    // Add image as inlineData if provided
    if (body.referenceImage) {
      const matches = body.referenceImage.match(
        /^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/
      );
      if (matches && matches.length === 3) {
        const mimeType = matches[1];
        const base64Data = matches[2];
        parts.push({
          inlineData: {
            mimeType,
            data: base64Data
          }
        });
      }
    }

    parts.push({ text: schemaPhrase(schemaPrompt, userContext) });

    const url = `${GEMINI_TEXT_ENDPOINT}/${model}:generateContent?key=${apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    let data: any;
    try {
      const geminiRes = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts
            }
          ]
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!geminiRes.ok) {
        const errorText = await geminiRes.text();
        console.error("Gemini text API error:", errorText);
        return NextResponse.json(
          { error: "Failed to analyze reference image and generate summary." },
          { status: 500 }
        );
      }

      data = await geminiRes.json();
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === "AbortError") {
        console.error("Summary API timeout:", fetchError);
        return NextResponse.json(
          {
            error:
              "Request to the AI model timed out. Please check your internet connection and try again."
          },
          { status: 504 }
        );
      }
      if (
        fetchError.code === "UND_ERR_CONNECT_TIMEOUT" ||
        fetchError.cause?.code === "UND_ERR_CONNECT_TIMEOUT"
      ) {
        console.error("Summary API connection timeout:", fetchError);
        return NextResponse.json(
          {
            error:
              "Connection to the AI service timed out. Please verify network/firewall/VPN settings and try again."
          },
          { status: 504 }
        );
      }
      console.error("Summary API network error:", fetchError);
      return NextResponse.json(
        { error: "Network error while contacting the AI service." },
        { status: 502 }
      );
    }

    const rawText: string | undefined =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText || typeof rawText !== "string" || rawText.trim().length < 10) {
      console.error("Empty or invalid model response:", rawText);
      return NextResponse.json(
        {
          error:
            "The AI model did not return a valid description. Please try again or adjust your input."
        },
        { status: 502 }
      );
    }

    // Try to extract JSON from the response (handle cases where it might be wrapped in markdown code blocks)
    let jsonText = rawText.trim();
    
    // Remove markdown code blocks if present
    if (jsonText.startsWith("```")) {
      const lines = jsonText.split("\n");
      const startIndex = lines.findIndex(line => line.trim().startsWith("```"));
      const endIndex = lines.findIndex((line, idx) => 
        idx > startIndex && line.trim().endsWith("```")
      );
      if (startIndex !== -1 && endIndex !== -1) {
        jsonText = lines.slice(startIndex + 1, endIndex).join("\n").trim();
      } else {
        // Try to find JSON object boundaries if closing ``` is on same line or missing
        const jsonMatch = jsonText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          jsonText = jsonMatch[1].trim();
        } else {
          // Fallback: remove first line if it starts with ``` and last line if it ends with ```
          jsonText = jsonText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
        }
      }
    }

    let parsed: AnalysisResult;
    try {
      parsed = JSON.parse(jsonText) as AnalysisResult;
    } catch (err) {
      console.error("Failed to parse model JSON:", jsonText, err);
      return NextResponse.json(
        {
          error:
            "The AI model returned an unexpected format. Please try again or update the model configuration."
        },
        { status: 502 }
      );
    }

    const fallback = (value?: string, fallbackValue?: string) =>
      (value && String(value).trim()) || (fallbackValue ?? "");

    const summary = fallback(parsed.summary, body.mood);

    const autoFill = {
      roomType: fallback(parsed.roomType, body.roomType),
      style: fallback(parsed.aestheticStyle, body.style),
      colorPalette: fallback(parsed.colorPalette, body.colorPalette),
      materials: fallback(parsed.materialPreferences, body.materials),
      textures: fallback(parsed.texturePreferences, body.textures),
      mood: fallback(parsed.themeMood, body.mood),
      furniture: fallback(parsed.furniturePreferences, body.furniture),
      decor: fallback(parsed.decorPreferences, body.decor),
      lighting: fallback(parsed.lightingPreferences, body.lighting),
      technology: fallback(body.technology, body.technology),
      budget: fallback(body.budget, body.budget),
      renovationScope: fallback(body.renovationScope, body.renovationScope),
      timeframe: fallback(body.timeframe, body.timeframe),
      imageNotes: parsed.notes ?? ""
    };

    return NextResponse.json({ summary, autoFill });
  } catch (error) {
    console.error("Summary API error:", error);
    return NextResponse.json(
      { error: "Unexpected error while generating summary. Please try again." },
      { status: 500 }
    );
  }
}

function schemaPhrase(schemaPrompt: string, userContext: string) {
  return `${schemaPrompt}\n\n${userContext}`;
}
