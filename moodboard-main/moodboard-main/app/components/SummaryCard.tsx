"use client";

type SummaryCardProps = {
  summary: string;
  onGenerateMoodboard: () => void;
  generating: boolean;
};

export default function SummaryCard({
  summary,
  onGenerateMoodboard,
  generating
}: SummaryCardProps) {
  return (
    <div className="card space-y-4">
      <h2 className="text-xl font-semibold">Design Summary</h2>
      <p className="text-sm text-slate-700 whitespace-pre-line">{summary}</p>
      <button
        type="button"
        onClick={onGenerateMoodboard}
        disabled={generating}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-medium hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {generating && (
          <span className="inline-flex h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        )}
        <span>{generating ? "Generating moodboard…" : "Generate Moodboard"}</span>
      </button>
    </div>
  );
}


