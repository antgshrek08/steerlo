"use client";

import { useState } from "react";
import { useProfileSummary } from "@/components/profile/ProfileSummaryProvider";

type BrainstormResponse = {
  topic: string;
  ideas: string[];
};

export function BrainstormForm() {
  const { recordEssayIdeas } = useProfileSummary();
  const [topic, setTopic] = useState("");
  const [result, setResult] = useState<BrainstormResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedTopic = topic.trim();

    if (!normalizedTopic) {
      setError("Please enter a topic first.");
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/brainstorm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: normalizedTopic })
      });

      if (!response.ok) {
        throw new Error("Failed to brainstorm.");
      }

      const data = (await response.json()) as BrainstormResponse;
      setResult(data);

      if (Array.isArray(data.ideas) && data.ideas.length) {
        recordEssayIdeas(data.ideas.map((idea) => ({ topic: idea })));
      }
    } catch {
      setError("Something went wrong. Please try again with a clearer topic.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 p-6 shadow-[0_8px_30px_rgba(15,23,42,0.3)] backdrop-blur-lg md:p-8">
      <form className="space-y-3" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-white/90">Essay topic or question</span>
          <input
            className="w-full rounded-xl border border-white/20 bg-black/25 px-4 py-3 text-sm text-white placeholder:text-white/55 outline-none transition focus:border-indigo-300/70 focus:ring-4 focus:ring-indigo-400/25"
            onChange={(event) => setTopic(event.target.value)}
            placeholder="Example: Should social media be regulated for teens?"
            required
            value={topic}
            aria-invalid={Boolean(error)}
          />
        </label>

        {error ? (
          <p className="rounded-xl border border-rose-300/35 bg-rose-500/15 px-3 py-2 text-sm text-rose-100">{error}</p>
        ) : null}

        <button
          className="rounded-xl border border-indigo-300/30 bg-indigo-500/70 px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.02] hover:bg-indigo-500/85 hover:shadow-[0_0_20px_rgba(99,102,241,0.35)] focus:outline-none focus:ring-2 focus:ring-indigo-300/70 focus:ring-offset-2 focus:ring-offset-black/40 disabled:opacity-70"
          disabled={loading}
          type="submit"
        >
          {loading ? "Generating..." : "Generate ideas"}
        </button>
      </form>

      {result ? (
        <div className="mt-6 rounded-xl border border-indigo-300/25 bg-black/25 p-5">
          <h2 className="font-semibold text-white">Ideas for: {result.topic}</h2>
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-white/85">
            {result.ideas.map((idea) => (
              <li key={idea}>{idea}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
