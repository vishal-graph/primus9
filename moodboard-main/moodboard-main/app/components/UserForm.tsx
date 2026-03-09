"use client";

import { useState, FormEvent, ChangeEvent } from "react";

export type FormValues = {
  roomType: string;
  style: string;
  colorPalette: string;
  materials: string;
  textures: string;
  mood: string;
  furniture: string;
  decor: string;
  lighting: string;
  technology: string;
  budget: string;
  renovationScope: string;
  timeframe: string;
  imageLinks: string;
  referenceImage?: string; // Base64 string
};

type UserFormProps = {
  onSummaryGenerated: (
    summary: string,
    style: string,
    roomType: string,
    values: FormValues
  ) => void;
  onLoadingChange?: (loading: boolean) => void;
};

export default function UserForm({
  onSummaryGenerated,
  onLoadingChange
}: UserFormProps) {
  const roomOptions = [
    "Living room",
    "Bedroom",
    "Kitchen",
    "Dining",
    "Bathroom",
    "Kids room",
    "Home office / Study",
    "Balcony / Outdoor",
    "Foyer",
    "Walk-in wardrobe"
  ];

  const styleOptions = [
    "Modern / Contemporary",
    "Minimalist",
    "Scandinavian",
    "Boho",
    "Industrial",
    "Japandi",
    "Luxury",
    "Rustic",
    "Traditional / Indian",
    "Mediterranean",
    "Art Deco",
    "Eclectic",
    "Farmhouse"
  ];

  const moodOptions = [
    "Cozy",
    "Calm",
    "Elegant",
    "Vibrant",
    "Earthy",
    "Airy",
    "Bold",
    "Sophisticated",
    "Minimal",
    "Playful"
  ];

  const colorPaletteOptions = [
    "Warm neutrals (beige, sand, cream)",
    "Cool neutrals (grey, white, charcoal)",
    "Earthy tones (olive, terracotta, rust)",
    "Soft pastels (blush, sage, powder blue)",
    "Monochrome (black, white, greys)",
    "Bold accents (navy, emerald, amber)",
    "Muted jewel tones",
    "Soft coastal (seafoam, sand, white)",
    "High contrast (dark wood + light walls)",
    "Colorful mixed palette (playful, multi-color)"
  ];

  const budgetOptions = ["Low (affordable)", "Medium", "Premium", "Luxury"];

  const scopeOptions = ["Full makeover", "Partial upgrade", "Furnishing-only"];

  const timeframeOptions = ["Urgent", "Flexible", "Phased execution"];

  const [values, setValues] = useState<FormValues>({
    roomType: roomOptions[0],
    style: styleOptions[0],
    colorPalette: colorPaletteOptions[0],
    materials: "",
    textures: "",
    mood: moodOptions[0],
    furniture: "",
    decor: "",
    lighting: "",
    technology: "",
    budget: budgetOptions[1],
    renovationScope: scopeOptions[0],
    timeframe: timeframeOptions[1],
    imageLinks: "",
    referenceImage: ""
  });
  const [loading, setLoading] = useState(false);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Basic validation: check if image and size < 4MB (Gemini limit is higher, but Vercel functions have limits)
      if (!file.type.startsWith("image/")) {
        alert("Please upload an image file.");
        return;
      }
      if (file.size > 4 * 1024 * 1024) {
        alert("File size should be under 4MB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        // Result is "data:image/jpeg;base64,..."
        const base64String = reader.result as string;
        setValues((prev) => ({ ...prev, referenceImage: base64String }));
      };
      reader.readAsDataURL(file);

      // Automatically analyze the image
      await analyzeImage(file);
    }
  };

  const analyzeImage = async (file: File) => {
    setAnalyzingImage(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/analyze-image", {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Failed to analyze image" }));
        throw new Error(errorData.error || "Failed to analyze image");
      }

      const extractedData = (await res.json()) as {
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

      // Normalize options to match form dropdowns
      const normalizeOption = (input: string | undefined, options: string[]) => {
        if (!input) return undefined;
        const lower = input.toLowerCase();
        const exact = options.find((o) => o.toLowerCase() === lower);
        if (exact) return exact;
        const contains = options.find((o) => lower.includes(o.toLowerCase()) || o.toLowerCase().includes(lower));
        return contains ?? undefined;
      };

      const normalizedRoom = normalizeOption(extractedData.roomType, roomOptions) ?? extractedData.roomType;
      const normalizedStyle = normalizeOption(extractedData.aestheticStyle, styleOptions) ?? extractedData.aestheticStyle;
      const normalizedPalette = normalizeOption(extractedData.colorPalette, colorPaletteOptions) ?? extractedData.colorPalette;
      const normalizedMood = normalizeOption(extractedData.themeMood, moodOptions) ?? extractedData.themeMood;

      // Auto-fill form with extracted data
      setValues((prev) => ({
        ...prev,
        roomType: normalizedRoom,
        style: normalizedStyle,
        colorPalette: normalizedPalette,
        mood: normalizedMood,
        materials: extractedData.materialPreferences || prev.materials,
        textures: extractedData.texturePreferences || prev.textures,
        furniture: extractedData.furniturePreferences || prev.furniture,
        decor: extractedData.decorPreferences || prev.decor,
        lighting: extractedData.lightingPreferences || prev.lighting,
        imageLinks: extractedData.notes ? (prev.imageLinks ? `${prev.imageLinks}\n${extractedData.notes}` : extractedData.notes) : prev.imageLinks
      }));
    } catch (err: any) {
      console.error("Image analysis error:", err);
      setError(err.message || "Failed to analyze image. You can still fill the form manually.");
    } finally {
      setAnalyzingImage(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    onLoadingChange?.(true);

    try {
      const res = await fetch("/api/summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(values)
      });

      if (!res.ok) {
        throw new Error("Failed to generate summary");
      }

      const data = (await res.json()) as {
        summary: string;
        autoFill?: Partial<FormValues>;
      };

      const merged: FormValues = {
        ...values,
        ...(data.autoFill ?? {})
      };

      // Ensure selects get values from known option lists when possible
      const normalizeOption = (input: string | undefined, options: string[]) => {
        if (!input) return undefined;
        const lower = input.toLowerCase();
        const exact = options.find((o) => o.toLowerCase() === lower);
        if (exact) return exact;
        const contains = options.find((o) => lower.includes(o.toLowerCase()));
        return contains ?? undefined;
      };

      const normalizedRoom =
        normalizeOption(merged.roomType, roomOptions) ?? merged.roomType;
      const normalizedStyle =
        normalizeOption(merged.style, styleOptions) ?? merged.style;
      const normalizedPalette =
        normalizeOption(merged.colorPalette, colorPaletteOptions) ??
        merged.colorPalette;
      const normalizedMood =
        normalizeOption(merged.mood, moodOptions) ?? merged.mood;

      const finalValues: FormValues = {
        ...merged,
        roomType: normalizedRoom,
        style: normalizedStyle,
        colorPalette: normalizedPalette,
        mood: normalizedMood
      };

      setValues(finalValues);

      onSummaryGenerated(
        data.summary,
        finalValues.style,
        finalValues.roomType,
        finalValues
      );
    } catch (err) {
      console.error(err);
      setError("Something went wrong while generating the summary.");
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Interior Design Moodboard Generator</h2>
        <p className="text-sm text-slate-600">
          Complete the details below to generate a comprehensive design summary.
        </p>
      </div>

      {/* Reference Image Upload */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Upload Reference Image (Optional)</label>
        <div className="flex items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <span>{analyzingImage ? "Analyzing..." : "Choose File"}</span>
            <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={analyzingImage}
                className="hidden"
            />
          </label>
          {analyzingImage && (
            <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
              <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
              </svg>
              Analyzing reference image...
            </span>
          )}
          {values.referenceImage && !analyzingImage && (
            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              Image attached & analyzed
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-1">Max 4MB. Supported: JPG, PNG, WEBP. Form will auto-fill after analysis.</p>
      </div>

      {/* Section 1: Space & Style */}
      <div className="space-y-4">
        <h3 className="text-md font-medium text-slate-800 border-b pb-2">1. Space & Style</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Room Type</label>
            <select
              name="roomType"
              value={values.roomType}
              onChange={handleChange}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              {roomOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Aesthetic Style</label>
            <select
              name="style"
              value={values.style}
              onChange={handleChange}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              {styleOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Theme / Mood</label>
            <select
              name="mood"
              value={values.mood}
              onChange={handleChange}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              {moodOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Color Palette</label>
            <select
              name="colorPalette"
              value={values.colorPalette}
              onChange={handleChange}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              {colorPaletteOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Section 2: Materials & Textures */}
      <div className="space-y-4">
        <h3 className="text-md font-medium text-slate-800 border-b pb-2">2. Materials & Textures</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Material Preferences</label>
            <input
              type="text"
              name="materials"
              value={values.materials}
              onChange={handleChange}
              placeholder="Wood (oak, teak), Metal, Stone, Fabrics..."
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
           <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Texture Preferences</label>
            <input
              type="text"
              name="textures"
              value={values.textures}
              onChange={handleChange}
              placeholder="Matte, glossy, rough, patterned..."
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
        </div>
      </div>

       {/* Section 3: Furniture & Decor */}
      <div className="space-y-4">
        <h3 className="text-md font-medium text-slate-800 border-b pb-2">3. Furniture & Decor</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Furniture Needs</label>
            <input
              type="text"
              name="furniture"
              value={values.furniture}
              onChange={handleChange}
              placeholder="L-shape sofa, King bed, Dining table..."
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
           <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Decor Elements</label>
            <input
              type="text"
              name="decor"
              value={values.decor}
              onChange={handleChange}
              placeholder="Art, rugs, mirrors, plants..."
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
           <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Lighting Types</label>
            <input
              type="text"
              name="lighting"
              value={values.lighting}
              onChange={handleChange}
              placeholder="Ambient, task, accent, decorative..."
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
           <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Technology / Smart Features</label>
            <input
              type="text"
              name="technology"
              value={values.technology}
              onChange={handleChange}
              placeholder="TV placement, smart lighting, automation..."
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Section 4: Practical Details */}
      <div className="space-y-4">
        <h3 className="text-md font-medium text-slate-800 border-b pb-2">4. Practical Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Budget Level</label>
            <select
              name="budget"
              value={values.budget}
              onChange={handleChange}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              {budgetOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Renovation Scope</label>
            <select
              name="renovationScope"
              value={values.renovationScope}
              onChange={handleChange}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              {scopeOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

           <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Timeframe</label>
            <select
              name="timeframe"
              value={values.timeframe}
              onChange={handleChange}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              {timeframeOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Extra Notes & Links */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Extra Notes / Links</label>
        <textarea
          name="imageLinks"
          value={values.imageLinks}
          onChange={handleChange}
          rows={2}
          placeholder="Paste Pinterest/Instagram links here..."
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full inline-flex items-center justify-center rounded-lg bg-slate-900 text-white px-4 py-3 text-sm font-medium hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Generating Summary..." : "Generate Summary"}
      </button>
    </form>
  );
}
