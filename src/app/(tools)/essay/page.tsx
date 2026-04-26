"use client";

import { useState } from "react";
import { Navbar } from "@/components/home/navbar";

type EssayFormData = {
  lifeExperience: string;
  challenge: string;
  proudOf: string;
  interests: string;
};

type EssayIdea = {
  title: string;
  description: string;
};

const initialFormData: EssayFormData = {
  lifeExperience: "",
  challenge: "",
  proudOf: "",
  interests: ""
};

export default function EssayPage() {
  const [formData, setFormData] = useState<EssayFormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState<EssayIdea[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleChange(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setIdeas(null);
    setError(null);

    try {
      const response = await fetch("/api/essay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      const data = (await response.json()) as EssayIdea[] | { error?: string };

      if (!response.ok) {
        const errorMessage = !Array.isArray(data) && data.error ? data.error : "Failed to load essay ideas.";
        throw new Error(errorMessage);
      }

      setIdeas(Array.isArray(data) ? data : []);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong while loading essay ideas.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-0">
        <video autoPlay muted loop playsInline className="h-full w-full scale-110 object-cover object-[center_30%]">
          <source
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/199692-910996039-Cig4PmUSdlnN2lDe5v3jDPO3hAL2LV.mp4"
            type="video/mp4"
          />
        </video>
        <div className="absolute inset-0 bg-black/70" />
        <div className="absolute inset-0 bg-[linear-gradient(145deg,_rgba(37,99,235,0.16)_0%,_rgba(124,58,237,0.12)_42%,_rgba(0,0,0,0.05)_100%)] backdrop-blur-[1px]" />
      </div>

      <main className="relative z-10 min-h-screen">
        <Navbar />

        <section className="px-6 pb-20 pt-28 md:pb-24 md:pt-32">
          <div className="mx-auto max-w-3xl space-y-6 md:space-y-8">
            <div className="space-y-3 text-center">
              <h1 className="text-4xl font-bold tracking-[0.02em] text-white md:text-5xl">Essay Tool</h1>
              <p className="text-base leading-7 text-white/80 md:text-lg">
                Fill out the prompts below to capture ideas for a personal essay.
              </p>
            </div>

            <form
              className="space-y-5 rounded-2xl border border-white/20 bg-white/10 p-6 shadow-[0_8px_30px_rgba(15,23,42,0.3)] backdrop-blur-lg"
              onSubmit={handleSubmit}
            >
              {loading ? (
                <p className="rounded-xl border border-indigo-300/25 bg-indigo-400/15 px-4 py-3 text-sm text-indigo-100">
                  Generating essay ideas...
                </p>
              ) : null}

              {error ? (
                <p className="rounded-xl border border-rose-300/35 bg-rose-500/15 px-4 py-3 text-sm text-rose-100">{error}</p>
              ) : null}

              <label className="block space-y-2">
                <span className="text-sm font-medium text-white/90">A meaningful life experience</span>
                <textarea
                  className="min-h-28 w-full rounded-xl border border-white/20 bg-black/25 px-4 py-3 text-sm text-white placeholder:text-white/55 outline-none transition focus:border-indigo-300/70 focus:ring-4 focus:ring-indigo-400/25"
                  name="lifeExperience"
                  value={formData.lifeExperience}
                  onChange={handleChange}
                  placeholder="Describe a moment that changed your perspective..."
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-white/90">A challenge I faced</span>
                <textarea
                  className="min-h-28 w-full rounded-xl border border-white/20 bg-black/25 px-4 py-3 text-sm text-white placeholder:text-white/55 outline-none transition focus:border-indigo-300/70 focus:ring-4 focus:ring-indigo-400/25"
                  name="challenge"
                  value={formData.challenge}
                  onChange={handleChange}
                  placeholder="Share a difficult situation you worked through..."
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-white/90">Something I am proud of</span>
                <textarea
                  className="min-h-28 w-full rounded-xl border border-white/20 bg-black/25 px-4 py-3 text-sm text-white placeholder:text-white/55 outline-none transition focus:border-indigo-300/70 focus:ring-4 focus:ring-indigo-400/25"
                  name="proudOf"
                  value={formData.proudOf}
                  onChange={handleChange}
                  placeholder="Describe an achievement that matters to you..."
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-white/90">My interests</span>
                <input
                  className="w-full rounded-xl border border-white/20 bg-black/25 px-4 py-3 text-sm text-white placeholder:text-white/55 outline-none transition focus:border-indigo-300/70 focus:ring-4 focus:ring-indigo-400/25"
                  name="interests"
                  onChange={handleChange}
                  placeholder="For example: music, robotics, reading"
                  type="text"
                  value={formData.interests}
                />
              </label>

              <button
                className="inline-flex items-center justify-center rounded-xl border border-indigo-300/30 bg-indigo-500/70 px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.02] hover:bg-indigo-500/85 hover:shadow-[0_0_20px_rgba(99,102,241,0.35)] focus:outline-none focus:ring-2 focus:ring-indigo-300/70 focus:ring-offset-2 focus:ring-offset-black/40 disabled:cursor-not-allowed disabled:bg-indigo-500/35"
                disabled={loading}
                type="submit"
              >
                {loading ? "Working..." : "Submit"}
              </button>
            </form>

            {ideas ? (
              <section className="space-y-4">
                <h2 className="text-2xl font-semibold tracking-[0.02em] text-white">Essay ideas</h2>
                <div className="grid gap-4 md:grid-cols-3">
                  {ideas.map((idea) => (
                    <article
                      key={idea.title}
                      className="rounded-2xl border border-white/20 bg-white/10 p-5 shadow-[0_8px_30px_rgba(15,23,42,0.3)] backdrop-blur-lg"
                    >
                      <h3 className="text-base font-semibold text-white">{idea.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-white/80">{idea.description}</p>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </section>
      </main>
    </>
  );
}
