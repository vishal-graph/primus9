import { NextRequest, NextResponse } from "next/server";

const GEMINI_TEXT_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1/models";

type AnalysisResult = {
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

    // Parse FormData
    const formData = await req.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No image file provided." },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image." },
        { status: 400 }
      );
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");
    const mimeType = file.type;

    // Create the analysis prompt
    const analysisPrompt = `You are an expert interior designer and visual interpreter. Analyze the user's uploaded reference image in extreme detail. Extract room type, interior style, mood, color palette, materials, textures, furniture elements, decor items, and lighting style. Then output ONLY the following JSON:

{
  "roomType": "",
  "aestheticStyle": "",
  "themeMood": "",
  "colorPalette": "",
  "materialPreferences": "",
  "texturePreferences": "",
  "furniturePreferences": "",
  "decorPreferences": "",
  "lightingPreferences": "",
  "notes": ""
}

Ensure the response always contains valid JSON. Do not add explanations or comments. Only output the JSON object itself.`;

    const parts: any[] = [
      {
        inlineData: {
          mimeType,
          data: base64Data
        }
      },
      { text: analysisPrompt }
    ];

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
        console.error("Gemini Vision API error:", errorText);
        return NextResponse.json(
          { error: "Failed to analyze reference image." },
          { status: 500 }
        );
      }

      data = await geminiRes.json();
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === "AbortError") {
        console.error("Image analysis API timeout:", fetchError);
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
        console.error("Image analysis API connection timeout:", fetchError);
        return NextResponse.json(
          {
            error:
              "Connection to the AI service timed out. Please verify network/firewall/VPN settings and try again."
          },
          { status: 504 }
        );
      }
      console.error("Image analysis API network error:", fetchError);
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
            "The AI model did not return a valid analysis. Please try again or upload a different image."
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

    // Ensure all fields are strings (fallback to empty string if missing)
    const result: AnalysisResult = {
      roomType: parsed.roomType || "",
      aestheticStyle: parsed.aestheticStyle || "",
      themeMood: parsed.themeMood || "",
      colorPalette: parsed.colorPalette || "",
      materialPreferences: parsed.materialPreferences || "",
      texturePreferences: parsed.texturePreferences || "",
      furniturePreferences: parsed.furniturePreferences || "",
      decorPreferences: parsed.decorPreferences || "",
      lightingPreferences: parsed.lightingPreferences || "",
      notes: parsed.notes || ""
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Image analysis API error:", error);
    return NextResponse.json(
      { error: "Unexpected error while analyzing image. Please try again." },
      { status: 500 }
    );
  }
}

