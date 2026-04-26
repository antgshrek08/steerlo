"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Sparkles } from "lucide-react";
import { Navbar } from "@/components/home/navbar";
import { useProfileSummary } from "@/components/profile/ProfileSummaryProvider";
import { CollegeOption } from "@/components/tools/CollegeOption";

type ChanceStatus = "Reach" | "Target" | "Safety";
type CourseRigorValue =
  | "Graduating with AA"
  | "Most Rigorous (AP/IB/AICE/DE)"
  | "Rigorous"
  | "Moderate"
  | "Standard";

type ChanceResult = {
  school: string;
  status: ChanceStatus;
  explanation: string;
};

type FormState = {
  gpa: string;
  testType: "SAT" | "ACT";
  testScore: string;
  courseRigor: string;
  intendedMajor: string;
  selectedColleges: string[];
};

type PersistedFormState = Omit<FormState, "selectedColleges">;

type CollegeDirectoryItem = {
  id: string;
  name: string;
  logo: string;
  avgGPA: number;
  avgSAT: number;
  acceptanceRate: number;
};

type CollegesCache = {
  data: CollegeDirectoryItem[];
  expiresAt: number;
};

const storageKey = "steerlo-college-chances-inputs";
const collegesCacheTtlMs = 10 * 60 * 1000;
let collegesPageCache: CollegesCache | null = null;

const courseRigorOptions: CourseRigorValue[] = [
  "Graduating with AA",
  "Most Rigorous (AP/IB/AICE/DE)",
  "Rigorous",
  "Moderate",
  "Standard"
];

const defaultFormState: FormState = {
  gpa: "",
  testType: "SAT",
  testScore: "",
  courseRigor: "",
  intendedMajor: "",
  selectedColleges: []
};

function parseNumericValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getTestScoreRange(testType: "SAT" | "ACT") {
  return testType === "SAT" ? { min: 400, max: 1600 } : { min: 1, max: 36 };
}

function normalizeCourseRigor(value: string): CourseRigorValue | "" {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return "";
  }

  if (normalized.includes("aa") || normalized.includes("associate")) {
    return "Graduating with AA";
  }

  if (
    normalized.includes("most rigorous") ||
    normalized.includes("ap") ||
    normalized.includes("ib") ||
    normalized.includes("aice") ||
    normalized.includes("de") ||
    normalized.includes("dual enrollment")
  ) {
    return "Most Rigorous (AP/IB/AICE/DE)";
  }

  if (normalized.includes("rigorous")) {
    return "Rigorous";
  }

  if (normalized.includes("moderate")) {
    return "Moderate";
  }

  if (normalized.includes("standard")) {
    return "Standard";
  }

  return "";
}

function validateProfileInputs(formState: FormState) {
  const weightedGpa = parseNumericValue(formState.gpa.trim());
  if (weightedGpa === null || weightedGpa < 0 || weightedGpa > 6) {
    return "Enter a valid weighted GPA between 0.00 and 6.00.";
  }

  const testScore = parseNumericValue(formState.testScore.trim());
  const testRange = getTestScoreRange(formState.testType);
  if (testScore === null || testScore < testRange.min || testScore > testRange.max) {
    return `Enter a valid ${formState.testType} score between ${testRange.min} and ${testRange.max}.`;
  }

  return null;
}

function loadInitialFormState(): FormState {
  if (typeof window === "undefined") {
    return defaultFormState;
  }

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return defaultFormState;
    }

    const parsed = JSON.parse(raw) as Partial<PersistedFormState>;

    return {
      gpa: typeof parsed.gpa === "string" ? parsed.gpa : defaultFormState.gpa,
      testType: parsed.testType === "ACT" ? "ACT" : "SAT",
      testScore: typeof parsed.testScore === "string" ? parsed.testScore : defaultFormState.testScore,
      courseRigor:
        typeof parsed.courseRigor === "string" ? normalizeCourseRigor(parsed.courseRigor) : defaultFormState.courseRigor,
      intendedMajor: typeof parsed.intendedMajor === "string" ? parsed.intendedMajor : defaultFormState.intendedMajor,
      selectedColleges: []
    };
  } catch {
    return defaultFormState;
  }
}

function getStatusClasses(status: ChanceStatus) {
  if (status === "Reach") {
    return "border-rose-300/45 bg-rose-500/20 text-rose-100";
  }

  if (status === "Target") {
    return "border-amber-300/45 bg-amber-500/20 text-amber-100";
  }

  return "border-emerald-300/45 bg-emerald-500/20 text-emerald-100";
}

export default function CollegeChancesPage() {
  const { recordAcademicSnapshot, recordCollegeChances } = useProfileSummary();
  const [formState, setFormState] = useState<FormState>(defaultFormState);
  const hasLoadedPersistedState = useRef(false);
  const [collegeOptions, setCollegeOptions] = useState<CollegeDirectoryItem[]>([]);
  const [collegesLoading, setCollegesLoading] = useState(true);
  const [collegesError, setCollegesError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ChanceResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [savedSignature, setSavedSignature] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadColleges() {
      setCollegesLoading(true);
      setCollegesError(null);

      const now = Date.now();
      if (collegesPageCache && collegesPageCache.expiresAt > now) {
        if (isMounted) {
          setCollegeOptions(collegesPageCache.data);
          setCollegesLoading(false);
        }

        return;
      }

      try {
        const response = await fetch("/api/colleges", {
          method: "GET"
        });

        const data = (await response.json()) as CollegeDirectoryItem[] | { error?: string };

        if (!response.ok) {
          const message = !Array.isArray(data) && data.error ? data.error : "Failed to load colleges.";
          throw new Error(message);
        }

        if (!isMounted) {
          return;
        }

        const options = Array.isArray(data) ? data : [];

        collegesPageCache = {
          data: options,
          expiresAt: Date.now() + collegesCacheTtlMs
        };

        setCollegeOptions(options);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        const message = loadError instanceof Error ? loadError.message : "Failed to load colleges.";
        setCollegesError(message);
        setCollegeOptions([]);
      } finally {
        if (isMounted) {
          setCollegesLoading(false);
        }
      }
    }

    void loadColleges();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormState(loadInitialFormState());
    hasLoadedPersistedState.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoadedPersistedState.current) {
      return;
    }

    const persistedState: PersistedFormState = {
      gpa: formState.gpa,
      testType: formState.testType,
      testScore: formState.testScore,
      courseRigor: formState.courseRigor,
      intendedMajor: formState.intendedMajor
    };

    localStorage.setItem(storageKey, JSON.stringify(persistedState));
  }, [formState]);

  useEffect(() => {
    if (!hasLoadedPersistedState.current) {
      return;
    }

    const timeoutId = setTimeout(() => {
      const weightedGpa = parseNumericValue(formState.gpa.trim());
      const testScore = parseNumericValue(formState.testScore.trim());

      recordAcademicSnapshot({
        weightedGpa,
        testType: formState.testType,
        testScore,
        courseRigor: formState.courseRigor.trim() || null
      });
    }, 500);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [formState.courseRigor, formState.gpa, formState.testScore, formState.testType, recordAcademicSnapshot]);

  const validationError = useMemo(() => validateProfileInputs(formState), [formState]);
  const currentSaveSignature = useMemo(() => {
    return JSON.stringify({
      gpa: formState.gpa,
      testType: formState.testType,
      testScore: formState.testScore,
      courseRigor: formState.courseRigor,
      intendedMajor: formState.intendedMajor,
      selectedColleges: formState.selectedColleges,
      results
    });
  }, [formState.gpa, formState.testType, formState.testScore, formState.courseRigor, formState.intendedMajor, formState.selectedColleges, results]);

  const isAlreadySaved = savedSignature === currentSaveSignature;

  const canSubmit = useMemo(() => {
    return Boolean(
      formState.gpa.trim() &&
        formState.testScore.trim() &&
        formState.courseRigor.trim() &&
        formState.selectedColleges.length &&
        !validationError &&
        !collegesLoading &&
        !collegesError &&
        !loading
    );
  }, [formState, validationError, collegesLoading, collegesError, loading]);

  function updateField<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setResults([]);
    setError(null);
    setSaveMessage(null);
    setSavedSignature(null);

    setFormState((current) => ({
      ...current,
      [key]: value
    }));
  }

  function toggleSchool(id: string) {
    setResults([]);
    setError(null);
    setSaveMessage(null);
    setSavedSignature(null);

    setFormState((current) => {
      const exists = current.selectedColleges.includes(id);

      if (exists) {
        return {
          ...current,
          selectedColleges: current.selectedColleges.filter((value) => value !== id)
        };
      }

      return {
        ...current,
        selectedColleges: Array.from(new Set([...current.selectedColleges, id]))
      };
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      if (validationError) {
        setError(validationError);
      }

      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);
    setSaveMessage(null);
    setSavedSignature(null);

    try {
      const response = await fetch("/api/chances", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          gpa: formState.gpa,
          testType: formState.testType,
          testScore: formState.testScore,
          courseRigor: normalizeCourseRigor(formState.courseRigor),
          intendedMajor: formState.intendedMajor,
          collegeIds: formState.selectedColleges
        })
      });

      const data = (await response.json()) as ChanceResult[] | { error?: string };
      if (!response.ok) {
        const message = !Array.isArray(data) && data.error ? data.error : "Failed to generate chances.";
        throw new Error(message);
      }

      const chanceResults = Array.isArray(data) ? data : [];
      setResults(chanceResults);

      const weightedGpa = parseNumericValue(formState.gpa.trim());
      const testScore = parseNumericValue(formState.testScore.trim());

      recordAcademicSnapshot({
        weightedGpa,
        testType: formState.testType,
        testScore,
        courseRigor: formState.courseRigor.trim() || null
      });

      recordCollegeChances(
        chanceResults.map((item) => ({
          school: item.school,
          status: item.status,
          explanation: item.explanation
        }))
      );

      setSavedSignature(currentSaveSignature);
      setSaveMessage("Saved to Profile Summary.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong while generating chances.");
    } finally {
      setLoading(false);
    }
  }

  function handleSaveProfileInfo() {
    const weightedGpa = parseNumericValue(formState.gpa.trim());
    const testScore = parseNumericValue(formState.testScore.trim());
    const courseRigor = formState.courseRigor.trim();

    if (!results.length) {
      setSaveMessage("Generate chances first, then save them to your profile.");
      return;
    }

    const academicSnapshot = {
      weightedGpa,
      testType: formState.testType,
      testScore,
      courseRigor: courseRigor || null
    };

    recordAcademicSnapshot(academicSnapshot);
    recordCollegeChances(
      results.map((item) => ({
        school: item.school,
        status: item.status,
        explanation: item.explanation
      }))
    );

    setSavedSignature(currentSaveSignature);
    setSaveMessage("Saved to Profile Summary.");
  }

  return (
    <>
      <div className="fixed inset-0 z-0">
        <video autoPlay muted loop playsInline className="h-full w-full scale-110 object-cover object-[center_26%]">
          <source
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/199692-910996039-Cig4PmUSdlnN2lDe5v3jDPO3hAL2LV.mp4"
            type="video/mp4"
          />
        </video>
        <div className="absolute inset-0 bg-black/72" />
        <div className="absolute inset-0 bg-[linear-gradient(152deg,_rgba(59,130,246,0.18)_0%,_rgba(124,58,237,0.15)_42%,_rgba(0,0,0,0.04)_100%)] backdrop-blur-[1.5px]" />
      </div>

      <main className="relative z-10 min-h-screen">
        <Navbar />

        <section className="px-6 pb-20 pt-28 md:pb-24 md:pt-32">
          <div className="mx-auto max-w-5xl">
            <header className="mx-auto max-w-3xl text-center">
              <h1 className="text-4xl font-bold tracking-[0.02em] text-white md:text-5xl">Know Your Chances</h1>
              <p className="mt-4 text-base text-white/80 md:text-lg">
                Add your current profile and get realistic Reach, Target, and Safety guidance.
              </p>
            </header>

            <form
              onSubmit={handleSubmit}
              className="mx-auto mt-10 max-w-3xl space-y-5 rounded-2xl border border-white/20 bg-white/10 p-6 shadow-[0_0_25px_rgba(59,130,246,0.22)] backdrop-blur-lg md:p-8"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-white/90">Weighted GPA</span>
                  <input
                    type="number"
                    min="0"
                    max="6"
                    step="0.01"
                    value={formState.gpa}
                    onChange={(event) => updateField("gpa", event.target.value)}
                    placeholder="e.g. 4.35"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/55 outline-none backdrop-blur-xl transition focus:border-indigo-300/70 focus:ring-4 focus:ring-indigo-400/25"
                  />
                </label>

                <div className="grid grid-cols-[110px_1fr] gap-3">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-white/90">Exam</span>
                    <select
                      value={formState.testType}
                      onChange={(event) => updateField("testType", event.target.value === "ACT" ? "ACT" : "SAT")}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none backdrop-blur-xl transition focus:border-indigo-300/70 focus:ring-4 focus:ring-indigo-400/25"
                    >
                      <option value="SAT">SAT</option>
                      <option value="ACT">ACT</option>
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-white/90">Test Score</span>
                    <input
                      type="number"
                      min={getTestScoreRange(formState.testType).min}
                      max={getTestScoreRange(formState.testType).max}
                      value={formState.testScore}
                      onChange={(event) => updateField("testScore", event.target.value)}
                      placeholder={formState.testType === "SAT" ? "e.g. 1310" : "e.g. 29"}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/55 outline-none backdrop-blur-xl transition focus:border-indigo-300/70 focus:ring-4 focus:ring-indigo-400/25"
                    />
                  </label>
                </div>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-white/90">Course Rigor</span>
                <select
                  value={formState.courseRigor}
                  onChange={(event) => updateField("courseRigor", normalizeCourseRigor(event.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none backdrop-blur-xl transition focus:border-indigo-300/70 focus:ring-4 focus:ring-indigo-400/25"
                >
                  <option value="">Select rigor</option>
                  {courseRigorOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-white/90">Intended Major (optional)</span>
                <input
                  type="text"
                  value={formState.intendedMajor}
                  onChange={(event) => updateField("intendedMajor", event.target.value)}
                  placeholder="e.g. Computer Science"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/55 outline-none backdrop-blur-xl transition focus:border-indigo-300/70 focus:ring-4 focus:ring-indigo-400/25"
                />
              </label>

              <fieldset className="space-y-3">
                <legend className="text-sm font-medium text-white/90">Select Colleges</legend>
                <div className="max-h-[25rem] overflow-y-auto rounded-2xl border border-white/10 bg-black/30 p-3 backdrop-blur-xl">
                  {collegesLoading ? (
                    <div className="flex min-h-20 items-center justify-center text-sm text-white/70">Loading colleges...</div>
                  ) : collegesError ? (
                    <div className="rounded-xl border border-rose-300/35 bg-rose-500/15 px-4 py-3 text-sm text-rose-100">
                      {collegesError}
                    </div>
                  ) : collegeOptions.length ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {collegeOptions.map((college) => (
                        <CollegeOption
                          key={college.id}
                          college={college}
                          selected={formState.selectedColleges.includes(college.id)}
                          onToggle={toggleSchool}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex min-h-20 items-center justify-center text-sm text-white/70">
                      No colleges available right now.
                    </div>
                  )}
                </div>
                {formState.selectedColleges.length ? (
                  <p className="text-xs text-white/65">Selected: {formState.selectedColleges.length}</p>
                ) : (
                  <p className="text-xs text-white/65">No colleges selected yet.</p>
                )}
              </fieldset>

              {error ? (
                <p className="rounded-xl border border-rose-300/35 bg-rose-500/15 px-4 py-3 text-sm text-rose-100">{error}</p>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-300/30 bg-indigo-500/70 px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.02] hover:bg-indigo-500/85 hover:shadow-[0_0_20px_rgba(99,102,241,0.35)] focus:outline-none focus:ring-2 focus:ring-indigo-300/70 focus:ring-offset-2 focus:ring-offset-black/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
                  {loading ? "Analyzing Profile..." : "See My Chances"}
                </button>

                <button
                  type="button"
                  onClick={handleSaveProfileInfo}
                  disabled={!results.length}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-300/30 bg-emerald-500/20 px-5 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-300/70 focus:ring-offset-2 focus:ring-offset-black/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isAlreadySaved ? "Saved to Profile Summary" : "Save to Profile Summary"}
                </button>
              </div>

              {saveMessage ? (
                <p className="rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-xs leading-5 text-white/70">
                  {saveMessage}
                </p>
              ) : null}

              <p className="rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-xs leading-5 text-white/70">
                Disclaimer: These results are estimates based on the information provided and are not guaranteed or
                confirmed admissions outcomes.
              </p>
            </form>

            <div className="mx-auto mt-12 max-w-4xl">
              {results.length ? (
                <motion.section
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45 }}
                  className="space-y-4"
                >
                  <h2 className="text-2xl font-semibold tracking-[0.02em] text-white">Your Chances</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {results.map((result) => (
                      <article
                        key={result.school}
                        className="rounded-2xl border border-white/20 bg-white/10 p-5 shadow-[0_8px_30px_rgba(15,23,42,0.3)] backdrop-blur-lg"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <h3 className="text-lg font-semibold text-white">{result.school}</h3>
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${getStatusClasses(result.status)}`}
                          >
                            {result.status}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-white/85">{result.explanation}</p>
                      </article>
                    ))}
                  </div>
                </motion.section>
              ) : (
                <p className="rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-sm text-white/70">
                  Select a college to see your chances.
                </p>
              )}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
