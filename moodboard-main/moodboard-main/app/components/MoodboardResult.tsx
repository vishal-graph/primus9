"use client";

import { useCallback, useState, useEffect } from "react";
import type { FormValues } from "./UserForm";

type MoodboardResultProps = {
  image: string;
  onReset: () => void;
  styleTitle?: string | null;
  summary?: string | null;
  details?: FormValues | null;
  onRegenerate?: (options: {
    style?: string;
    colorPalette?: string;
    mood?: string;
  }) => void;
  isGenerating?: boolean;
};

export default function MoodboardResult({
  image,
  onReset,
  styleTitle,
  summary,
  details,
  onRegenerate,
  isGenerating
}: MoodboardResultProps) {
  const [showRegeneratePanel, setShowRegeneratePanel] = useState(false);
  const [overrideStyle, setOverrideStyle] = useState<string | undefined>(
    details?.style
  );
  const [overridePalette, setOverridePalette] = useState<string | undefined>(
    details?.colorPalette
  );
  const [overrideMood, setOverrideMood] = useState<string | undefined>(
    details?.mood
  );

  // Mirror the main form options so dropdowns are consistent
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

  // When details change (new summary), reset overrides to match
  useEffect(() => {
    if (details) {
      setOverrideStyle(details.style);
      setOverridePalette(details.colorPalette);
      setOverrideMood(details.mood);
    }
  }, [details]);

  const handleDownload = useCallback(async () => {
    try {
      const baseImage = new Image();
      baseImage.crossOrigin = "anonymous";
      baseImage.src = `data:image/png;base64,${image}`;

      const logo = new Image();
      // Expect the original tatva:Ops logo to be placed in public/tatva-ops-logo.png
      logo.src = "/tatva-ops-logo.png";

      await Promise.all([
        new Promise((resolve, reject) => {
          baseImage.onload = () => resolve(null);
          baseImage.onerror = reject;
        }),
        new Promise((resolve, reject) => {
          logo.onload = () => resolve(null);
          logo.onerror = reject;
        })
      ]);

      const canvas = document.createElement("canvas");
      canvas.width = baseImage.width;
      canvas.height = baseImage.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Draw original moodboard
      ctx.drawImage(baseImage, 0, 0);

      // Draw logo bottom-right
      const padding = canvas.width * 0.02;
      const logoWidth = canvas.width * 0.08;
      const logoHeight = (logo.height / logo.width) * logoWidth;
      ctx.globalAlpha = 0.8;
      ctx.drawImage(
        logo,
        canvas.width - logoWidth - padding,
        canvas.height - logoHeight - padding,
        logoWidth,
        logoHeight
      );
      ctx.globalAlpha = 1;

      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = "tatvaops-moodboard.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to generate branded download image", error);
      // Fallback to original image
      const link = document.createElement("a");
      link.href = `data:image/png;base64,${image}`;
      link.download = "moodboard.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [image]);

  return (
    <div className="space-y-6">
      <div className="card space-y-3">
        <h2 className="text-xl font-semibold mb-2">Your Moodboard</h2>
        {styleTitle && (
          <p className="text-sm font-semibold tracking-wide uppercase text-slate-600 mb-2">
            {styleTitle}
          </p>
        )}
        <div className="relative flex justify-center">
          {isGenerating ? (
            <div className="w-full h-72 rounded-xl overflow-hidden bg-black">
              <img
                src="/loading.gif"
                alt="Generating moodboard"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <>
              <img
                src={`data:image/png;base64,${image}`}
                alt="Generated moodboard"
                className="rounded-xl shadow-lg max-w-full h-auto mx-auto"
              />
              {/* Overlay the original tatva:Ops logo so it is always the same asset */}
              <div className="pointer-events-none absolute bottom-3 right-3">
                <img
                  src="/tatva-ops-logo.png"
                  alt="tatva:Ops logo"
                  className="h-8 md:h-10 object-contain drop-shadow-sm opacity-75"
                />
              </div>
            </>
          )}
        </div>
        {(summary || details) && (
          <div className="mt-3 border-t border-slate-100 pt-3 space-y-3">
            {summary && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                  Moodboard summary
                </p>
                <p className="text-sm text-slate-700">
                  {summary.length > 220 ? `${summary.slice(0, 217)}…` : summary}
                </p>
              </div>
            )}

            {details && (
              <div className="overflow-x-auto">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                  Key elements
                </p>
                <table className="w-full text-xs md:text-sm border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">
                        Category
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-slate-100">
                      <td className="px-3 py-2 font-medium text-slate-600">
                        Room type
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {details.roomType}
                      </td>
                    </tr>
                    <tr className="border-t border-slate-100">
                      <td className="px-3 py-2 font-medium text-slate-600">
                        Style
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {details.style}
                      </td>
                    </tr>
                    <tr className="border-t border-slate-100">
                      <td className="px-3 py-2 font-medium text-slate-600">
                        Color palette
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {details.colorPalette}
                      </td>
                    </tr>
                    <tr className="border-t border-slate-100">
                      <td className="px-3 py-2 font-medium text-slate-600">
                        Materials
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {details.materials || "-"}
                      </td>
                    </tr>
                    <tr className="border-t border-slate-100">
                      <td className="px-3 py-2 font-medium text-slate-600">
                        Textures
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {details.textures || "-"}
                      </td>
                    </tr>
                    <tr className="border-t border-slate-100">
                      <td className="px-3 py-2 font-medium text-slate-600">
                        Furniture
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {details.furniture || "-"}
                      </td>
                    </tr>
                    <tr className="border-t border-slate-100">
                      <td className="px-3 py-2 font-medium text-slate-600">
                        Decor
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {details.decor || "-"}
                      </td>
                    </tr>
                    <tr className="border-t border-slate-100">
                      <td className="px-3 py-2 font-medium text-slate-600">
                        Lighting
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {details.lighting || "-"}
                      </td>
                    </tr>
                    <tr className="border-t border-slate-100">
                      <td className="px-3 py-2 font-medium text-slate-600">
                        Tech / Smart
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {details.technology || "-"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex items-center justify-center rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-medium hover:bg-slate-800"
        >
          Download Image
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center justify-center rounded-lg bg-slate-700 text-white px-4 py-2 text-sm font-medium hover:bg-slate-800"
        >
          Download PDF
        </button>
        {onRegenerate && (
          <>
            <button
              type="button"
              onClick={() => setShowRegeneratePanel((v) => !v)}
              disabled={isGenerating}
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Regenerate
            </button>
            {showRegeneratePanel && (
              <div className="w-full card mt-2 space-y-3 bg-slate-50">
                <p className="text-sm font-semibold text-slate-700">
                  Adjust key parameters, then regenerate a new moodboard.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs md:text-sm">
                  <div className="flex flex-col gap-1">
                    <label className="font-medium text-slate-600">
                      Style override
                    </label>
                    <select
                      value={overrideStyle ?? ""}
                      onChange={(e) =>
                        setOverrideStyle(e.target.value || undefined)
                      }
                      className="rounded-lg border border-slate-200 px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
                    >
                      <option value="">Use current</option>
                      {styleOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-medium text-slate-600">
                      Color palette override
                    </label>
                    <select
                      value={overridePalette ?? ""}
                      onChange={(e) =>
                        setOverridePalette(e.target.value || undefined)
                      }
                      className="rounded-lg border border-slate-200 px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
                    >
                      <option value="">Use current</option>
                      {colorPaletteOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-medium text-slate-600">
                      Mood override
                    </label>
                    <select
                      value={overrideMood ?? ""}
                      onChange={(e) =>
                        setOverrideMood(e.target.value || undefined)
                      }
                      className="rounded-lg border border-slate-200 px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
                    >
                      <option value="">Use current</option>
                      {moodOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onRegenerate({
                        style: overrideStyle,
                        colorPalette: overridePalette,
                        mood: overrideMood
                      })
                    }
                    className="inline-flex items-center justify-center rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs md:text-sm font-medium hover:bg-emerald-700"
                  >
                    Generate new variation
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-900 px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Back to Form
        </button>
      </div>
    </div>
  );
}

