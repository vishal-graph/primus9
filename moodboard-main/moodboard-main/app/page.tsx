"use client";

import { useState } from "react";
import UserForm, { type FormValues } from "./components/UserForm";
import SummaryCard from "./components/SummaryCard";
import MoodboardResult from "./components/MoodboardResult";

export default function HomePage() {
  const [summary, setSummary] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [selectedRoomType, setSelectedRoomType] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [lastFormValues, setLastFormValues] = useState<FormValues | null>(null);
  const [generatingMoodboard, setGeneratingMoodboard] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSummaryGenerated = (
    value: string,
    style: string,
    roomType: string,
    values: FormValues
  ) => {
    setSummary(value);
    setSelectedStyle(style);
    setSelectedRoomType(roomType);
    setLastFormValues(values);
    setImage(null);
    setError(null);
  };

  const handleGenerateMoodboard = async () => {
    if (!summary) return;
    setGeneratingMoodboard(true);
    setError(null);

    try {
      // Pass full extracted data from form values
      const requestBody: any = {
        summary,
        style: selectedStyle,
        roomType: selectedRoomType
      };

      // Add extracted data if available from form values
      if (lastFormValues) {
        requestBody.aestheticStyle = lastFormValues.style;
        requestBody.themeMood = lastFormValues.mood;
        requestBody.colorPalette = lastFormValues.colorPalette;
        requestBody.materialPreferences = lastFormValues.materials;
        requestBody.texturePreferences = lastFormValues.textures;
        requestBody.furniturePreferences = lastFormValues.furniture;
        requestBody.decorPreferences = lastFormValues.decor;
        requestBody.lightingPreferences = lastFormValues.lighting;
        // Extract notes from imageLinks if it contains analysis notes
        if (lastFormValues.imageLinks) {
          requestBody.notes = lastFormValues.imageLinks;
        }
      }

      const res = await fetch("/api/moodboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });

      if (!res.ok) {
        throw new Error("Failed to generate moodboard");
      }

      const data = (await res.json()) as { image: string };
      setImage(data.image);
    } catch (err) {
      console.error(err);
      setError("Something went wrong while generating the moodboard.");
    } finally {
      setGeneratingMoodboard(false);
    }
  };

  type RegenerateOptions = {
    style?: string;
    colorPalette?: string;
    mood?: string;
  };

  const handleRegenerateMoodboard = async (options: RegenerateOptions) => {
    if (!summary) return;
    const nextStyle = options.style ?? selectedStyle ?? undefined;
    const nextPalette =
      options.colorPalette ?? lastFormValues?.colorPalette ?? undefined;
    const nextMood = options.mood ?? lastFormValues?.mood ?? undefined;

    // Update the stored details so the key elements table reflects overrides
    setLastFormValues((prev) =>
      prev
        ? {
            ...prev,
            style: nextStyle ?? prev.style,
            colorPalette: nextPalette ?? prev.colorPalette,
            mood: nextMood ?? prev.mood
          }
        : prev
    );

    setSelectedStyle(nextStyle ?? null);
    setGeneratingMoodboard(true);
    setError(null);

    try {
      // Pass full extracted data from form values
      const requestBody: any = {
        summary,
        style: nextStyle,
        roomType: selectedRoomType,
        colorPaletteOverride: nextPalette,
        moodOverride: nextMood
      };

      // Add extracted data if available from form values
      if (lastFormValues) {
        requestBody.aestheticStyle = nextStyle || lastFormValues.style;
        requestBody.themeMood = nextMood || lastFormValues.mood;
        requestBody.colorPalette = nextPalette || lastFormValues.colorPalette;
        requestBody.materialPreferences = lastFormValues.materials;
        requestBody.texturePreferences = lastFormValues.textures;
        requestBody.furniturePreferences = lastFormValues.furniture;
        requestBody.decorPreferences = lastFormValues.decor;
        requestBody.lightingPreferences = lastFormValues.lighting;
        // Extract notes from imageLinks if it contains analysis notes
        if (lastFormValues.imageLinks) {
          requestBody.notes = lastFormValues.imageLinks;
        }
      }

      const res = await fetch("/api/moodboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });

      if (!res.ok) {
        throw new Error("Failed to generate moodboard");
      }

      const data = (await res.json()) as { image: string };
      setImage(data.image);
    } catch (err) {
      console.error(err);
      setError("Something went wrong while regenerating the moodboard.");
    } finally {
      setGeneratingMoodboard(false);
    }
  };

  const handleReset = () => {
    setSummary(null);
    setImage(null);
    setError(null);
    setGeneratingMoodboard(false);
    setSummaryLoading(false);
  };

  return (
    <main className="min-h-screen flex items-start justify-center px-4 py-10">
      <div className="w-full max-w-4xl space-y-6">
        <header className="mb-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight mb-1">
              Interior Moodboard Generator
            </h1>
            <p className="text-sm text-slate-600">
              Describe your space and style, then generate a single collage-style
              interior design moodboard.
            </p>
          </div>
          <div className="shrink-0">
            <img
              src="/Tatva-ops-logo.png"
              alt="tatva:Ops logo"
              className="h-10 md:h-12 object-contain"
            />
          </div>
        </header>

        {!summary && !image && (
          <UserForm
            onSummaryGenerated={handleSummaryGenerated}
            onLoadingChange={setSummaryLoading}
          />
        )}

        {summary && !image && (
          <SummaryCard
            summary={summary}
            onGenerateMoodboard={handleGenerateMoodboard}
            generating={generatingMoodboard}
          />
        )}

        {generatingMoodboard && (
          <div className="card mt-2 space-y-3">
            <div className="w-full h-72 rounded-xl overflow-hidden bg-black">
              <img
                src="/loading.gif"
                alt="Generating moodboard animation"
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-sm text-slate-600">
              {image
                ? "Generating your collage-style moodboard variation…"
                : "Generating your collage-style moodboard…"}
            </p>
          </div>
        )}

        {image && !generatingMoodboard && (
          <MoodboardResult
            image={image}
            onReset={handleReset}
            styleTitle={selectedStyle}
            summary={summary}
            details={lastFormValues}
            onRegenerate={handleRegenerateMoodboard}
          />
        )}

        {error && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}


