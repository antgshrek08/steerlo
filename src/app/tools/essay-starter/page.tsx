"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Sparkles } from "lucide-react";
import { Navbar } from "@/components/home/navbar";
import { useProfileSummary } from "@/components/profile/ProfileSummaryProvider";
import { VideoBackground } from "@/components/layout/VideoBackground";
import { trackEvent } from "@/lib/analytics";
import { captureExceptionWithContext } from "@/lib/sentry";

type StarterIdea = {
  question: string;
  topic: string;
  starter: string;
  answer?: string;
};

type HistoryEntry = {
  id: string;
  createdAt: string;
  ideas: StarterIdea[];
};

const HISTORY_KEY = "steerlo-essay-starter-history";
const HISTORY_SCHEMA_VERSION = 1;

const questions = [
  "Describe a challenge you've faced and how you handled it",
  "What is something you're passionate about and why?",
  "Describe a moment that changed your perspective"
];

function randomId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadInitialHistory(): HistoryEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    const entries = (() => {
      if (Array.isArray(parsed)) {
        return parsed;
      }

      if (parsed && typeof parsed === "object") {
        const record = parsed as Record<string, unknown>;
        if (Array.isArray(record.entries)) {
          return record.entries;
        }
      }

      return null;
    })();

    if (!entries) {
      return [];
    }

    return entries
      .filter((entry) => entry && typeof entry === "object")
      .map((entry) => {
        const record = entry as Record<string, unknown>;
        const ideas = Array.isArray(record.ideas) ? record.ideas : [];

        return {
          id: typeof record.id === "string" ? record.id : randomId(),
          createdAt: typeof record.createdAt === "string" ? record.createdAt : new Date().toISOString(),
          ideas: ideas.filter((idea) => idea && typeof idea === "object") as StarterIdea[]
        } satisfies HistoryEntry;
      })
      .slice(0, 8);
  } catch {
    return [];
  }
}

export default function EssayStarterPage() {
  const { recordEssayIdeas } = useProfileSummary();
  const [answers, setAnswers] = useState<string[]>(["", "", ""]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<StarterIdea[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>(loadInitialHistory);
  const [error, setError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!results.length || !resultsRef.current) {
      return;
    }

    resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [results]);

  const canSubmit = useMemo(() => answers.every((value) => value.trim().length > 0) && !loading, [answers, loading]);

  function updateAnswer(index: number, value: string) {
    setAnswers((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  }

  function persistHistory(nextHistory: HistoryEntry[]) {
    setHistory(nextHistory);
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify({
        version: HISTORY_SCHEMA_VERSION,
        entries: nextHistory
      })
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        responses: questions.map((question, index) => ({
          question,
          answer: answers[index].trim()
        }))
      };

      const response = await fetch("/api/essay-starter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = (await response.json()) as StarterIdea[] | { error?: string };

      if (!response.ok) {
        const message = !Array.isArray(data) && data.error ? data.error : "Failed to generate essay starter ideas.";
        throw new Error(message);
      }

      const ideas = Array.isArray(data)
        ? data.map((item, index) => ({
            ...item,
            answer: answers[index]
          }))
        : [];

      setResults(ideas);
      trackEvent("generated_essay", { tool: "essay_starter", idea_count: ideas.length });
      recordEssayIdeas(ideas.map((idea) => ({ topic: idea.topic })));

      const nextHistory = [
        {
          id: randomId(),
          createdAt: new Date().toISOString(),
          ideas
        },
        ...history
      ].slice(0, 8);

      persistHistory(nextHistory);
    } catch (submitError) {
      captureExceptionWithContext(submitError, {
        action: "api_essay_starter_submit",
        page: "/tools/essay-starter"
      });
      setError(submitError instanceof Error ? submitError.message : "Something went wrong while generating ideas.");
    } finally {
      setLoading(false);
    }
  }


  function clearHistory() {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  }

  return (
    <>
      <VideoBackground
        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/199692-910996039-Cig4PmUSdlnN2lDe5v3jDPO3hAL2LV.mp4"
        videoClassName="h-full w-full scale-110 object-cover object-[center_28%]"
        overlayClassName="bg-black/72"
        gradientClassName="bg-[linear-gradient(150deg,_rgba(59,130,246,0.18)_0%,_rgba(124,58,237,0.14)_44%,_rgba(0,0,0,0.05)_100%)] backdrop-blur-[1.5px]"
      />

      <main id="main-content" className="relative z-10 min-h-screen">
        <Navbar />

        <section className="px-6 pb-20 pt-28 md:pb-24 md:pt-32">
          <div className="mx-auto max-w-5xl">
            <header className="mx-auto max-w-3xl text-center">
              <h1 className="text-4xl font-bold tracking-[0.02em] text-white md:text-5xl">Find Your Story</h1>
              <p className="mt-4 text-base text-white/80 md:text-lg">
                Answer a few questions and get personalized college essay ideas
              </p>
            </header>

            <form
              className="mx-auto mt-10 max-w-3xl space-y-5 rounded-2xl border border-white/20 bg-white/10 p-6 shadow-[0_0_25px_rgba(59,130,246,0.22)] backdrop-blur-lg md:p-8"
              onSubmit={handleSubmit}
            >
              {questions.map((question, index) => (
                <label key={question} className="block space-y-2">
                  <span className="text-sm font-medium text-white/90">{question}</span>
                  <textarea
                    value={answers[index]}
                    onChange={(event) => updateAnswer(index, event.target.value)}
                    className="min-h-28 w-full rounded-xl border border-white/20 bg-black/25 px-4 py-3 text-sm text-white placeholder:text-white/55 outline-none transition focus:border-indigo-300/70 focus:ring-4 focus:ring-indigo-400/25"
                    placeholder="Write your answer here..."
                  />
                </label>
              ))}

              {error ? (
                <p className="rounded-xl border border-rose-300/35 bg-rose-500/15 px-4 py-3 text-sm text-rose-100">{error}</p>
              ) : null}

              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-300/30 bg-indigo-500/70 px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.02] hover:bg-indigo-500/85 hover:shadow-[0_0_20px_rgba(99,102,241,0.35)] focus:outline-none focus:ring-2 focus:ring-indigo-300/70 focus:ring-offset-2 focus:ring-offset-black/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
                {loading ? "Generating Ideas..." : "Generate Ideas"}
              </button>
            </form>

            <div ref={resultsRef} className="mx-auto mt-12 max-w-4xl">
              {results.length ? (
                <motion.section
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45 }}
                  className="space-y-4"
                >
                  <h2 className="text-2xl font-semibold tracking-[0.02em] text-white">Your Essay Ideas</h2>
                  <div className="space-y-4">
                    {results.map((item) => (
                      <article
                        key={`${item.question}-${item.topic}`}
                        className="rounded-2xl border border-white/20 bg-white/10 p-5 shadow-[0_8px_30px_rgba(15,23,42,0.3)] backdrop-blur-lg"
                      >
                        <h3 className="text-xl font-semibold text-white">{item.topic}</h3>
                        <p className="mt-3 text-sm leading-6 text-white/85">{item.starter}</p>
                        <details className="mt-4 rounded-lg border border-white/15 bg-black/20 p-3">
                          <summary className="cursor-pointer text-sm font-medium text-white/80">View your response</summary>
                          <p className="mt-2 text-sm text-white/75">{item.answer}</p>
                        </details>
                      </article>
                    ))}
                  </div>
                </motion.section>
              ) : null}
            </div>

            <section className="mx-auto mt-12 max-w-4xl space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold tracking-[0.02em] text-white">Your Previous Ideas</h2>
                {history.length ? (
                  <button
                    type="button"
                    onClick={clearHistory}
                    className="rounded-lg border border-white/20 px-3 py-2 text-xs font-medium text-white/85 transition hover:bg-white/10"
                  >
                    Clear History
                  </button>
                ) : null}
              </div>

              {history.length ? (
                <div className="space-y-4">
                  {history.map((entry) => (
                    <article key={entry.id} className="rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur-md">
                      <p className="text-xs uppercase tracking-[0.12em] text-white/60">
                        {new Date(entry.createdAt).toLocaleString()}
                      </p>
                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        {entry.ideas.map((idea) => (
                          <div key={`${entry.id}-${idea.topic}`} className="rounded-xl border border-white/15 bg-black/20 p-3">
                            <h3 className="text-sm font-semibold text-white">{idea.topic}</h3>
                            <p className="mt-2 text-xs leading-5 text-white/75">{idea.starter}</p>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/70">
                  No previous ideas yet. Generate your first set to build your history.
                </p>
              )}
            </section>
          </div>
        </section>
      </main>
    </>
  );
}