"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useProfileSummary } from "@/components/profile/ProfileSummaryProvider";
import { getProfileReadinessBreakdown, getProfileReadinessColor, getProfileReadinessTier, hasMeaningfulProfileData } from "@/components/profile/profileReadiness";
import { getRankBadgeText, rankActivities } from "@/components/activity-builder/activityRanking";
import { captureExceptionWithContext } from "@/lib/sentry";

type ProfileInsights = {
  strengths: string[];
  weaknesses: string[];
  nextSteps: string[];
};

type InsightsCacheEntry = {
  data: ProfileInsights;
  expiresAt: number;
};

const insightsCacheTtlMs = 5 * 60 * 1000;
const insightsCache = new Map<string, InsightsCacheEntry>();
const SAVE_BANNER_STORAGE_KEY = "hideSaveBanner";

function hasLeadershipRole(profile: ReturnType<typeof useProfileSummary>["profile"]) {
  return profile.activities.some((activity) => {
    const role = activity.role.toLowerCase();
    const category = activity.category.toLowerCase();
    return (
      role.includes("leader") ||
      role.includes("captain") ||
      role.includes("president") ||
      role.includes("founder") ||
      category.includes("lead")
    );
  });
}

function formatHoursLabel(hours: number, weeks: number) {
  return `${hours}h/wk x ${weeks} wks/yr`;
}

function ProfileReadinessCard() {
  const { profile } = useProfileSummary();
  const breakdown = useMemo(() => getProfileReadinessBreakdown(profile), [profile]);

  if (!breakdown) {
    return null;
  }

  const tier = getProfileReadinessTier(breakdown.total);
  const colors = getProfileReadinessColor(breakdown.total);
  const progress = Math.max(0, Math.min(100, breakdown.total));

  return (
    <article className={`rounded-3xl border p-6 shadow-[0_12px_36px_rgba(15,23,42,0.34)] backdrop-blur-lg ${colors.accent}`}>
      <div className="grid gap-6 md:grid-cols-[180px_1fr] md:items-center">
        <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-full border border-white/15 bg-black/20">
          <div
            className="flex h-32 w-32 items-center justify-center rounded-full border border-white/10 bg-slate-950/80"
            style={{
              backgroundImage: `conic-gradient(${progress >= 85 ? "#34d399" : progress >= 70 ? "#facc15" : progress >= 50 ? "#fb923c" : "#f87171"} ${progress}%, rgba(255,255,255,0.08) ${progress}% 100%)`
            }}
          >
            <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-slate-950/95 text-center">
              <p className={`text-3xl font-bold ${colors.text}`}>{breakdown.total}/100</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-white/60">Readiness</p>
            </div>
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-semibold text-white">Profile Readiness Score</h3>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${colors.accent} ${colors.text}`}>
              {tier}
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
            A live overview of how your academics, activities, essays, and college alignment are shaping your college application profile.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ScoreBreakdownItem label="Academics" value={breakdown.academics} maxValue={40} />
            <ScoreBreakdownItem label="Activities" value={breakdown.activities} maxValue={30} />
            <ScoreBreakdownItem label="Essays" value={breakdown.essays} maxValue={20} />
            <ScoreBreakdownItem label="College Alignment" value={breakdown.collegeAlignment} maxValue={10} />
          </div>
        </div>
      </div>
    </article>
  );
}

function ProfileInsightsCard() {
  const { profile } = useProfileSummary();
  const breakdown = useMemo(() => getProfileReadinessBreakdown(profile), [profile]);

  const profileSignal = useMemo(() => {
    if (!breakdown) {
      return null;
    }

    const collegeBalance = profile.collegeChances.reduce(
      (acc, chance) => {
        if (chance.status === "Reach") {
          acc.reach += 1;
        } else if (chance.status === "Target") {
          acc.match += 1;
        } else {
          acc.safety += 1;
        }

        return acc;
      },
      { reach: 0, match: 0, safety: 0 }
    );

    return {
      overallScore: breakdown.total,
      gpa: profile.academic.weightedGpa,
      testType: profile.academic.testType,
      testScore: profile.academic.testScore,
      courseRigor: profile.academic.courseRigor,
      activityCount: profile.activities.length,
      hasLeadership: hasLeadershipRole(profile),
      essayCount: profile.essays.length,
      collegeBalance
    };
  }, [profile, breakdown]);

  const signalKey = useMemo(() => JSON.stringify(profileSignal), [profileSignal]);
  const [insights, setInsights] = useState<ProfileInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!breakdown || !profileSignal) {
      return;
    }

    const cached = insightsCache.get(signalKey);
    const now = Date.now();

    if (cached && cached.expiresAt > now) {
      queueMicrotask(() => {
        setInsights(cached.data);
        setError(null);
        setLoading(false);
      });
      return;
    }

    const abortController = new AbortController();

    async function generateInsights() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/profile-insights", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(profileSignal),
          signal: abortController.signal
        });

        const data = (await response.json()) as ProfileInsights | { error?: string };

        if (!response.ok) {
          const message = !Array.isArray(data) && "error" in data && data.error ? data.error : "Could not generate insights right now.";
          throw new Error(message);
        }

        if (
          !data ||
          typeof data !== "object" ||
          !Array.isArray((data as ProfileInsights).strengths) ||
          !Array.isArray((data as ProfileInsights).weaknesses) ||
          !Array.isArray((data as ProfileInsights).nextSteps)
        ) {
          throw new Error("Invalid insights format received.");
        }

        const normalized: ProfileInsights = {
          strengths: (data as ProfileInsights).strengths.filter((item) => typeof item === "string" && item.trim().length > 0).slice(0, 3),
          weaknesses: (data as ProfileInsights).weaknesses.filter((item) => typeof item === "string" && item.trim().length > 0).slice(0, 3),
          nextSteps: (data as ProfileInsights).nextSteps.filter((item) => typeof item === "string" && item.trim().length > 0).slice(0, 3)
        };

        if (normalized.strengths.length < 2 || normalized.weaknesses.length < 2 || normalized.nextSteps.length !== 3) {
          throw new Error("Incomplete insights received.");
        }

        insightsCache.set(signalKey, {
          data: normalized,
          expiresAt: Date.now() + insightsCacheTtlMs
        });

        setInsights(normalized);
      } catch (requestError) {
        if (abortController.signal.aborted) {
          return;
        }

        captureExceptionWithContext(requestError, {
          action: "api_profile_insights_generate",
          page: "/dashboard"
        });

        const message = requestError instanceof Error ? requestError.message : "Could not generate insights right now.";
        setError(message);
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void generateInsights();

    return () => {
      abortController.abort();
    };
  }, [signalKey, profileSignal, breakdown]);

  if (!breakdown) {
    return null;
  }

  return (
    <article className="mt-4 rounded-3xl border border-white/20 bg-white/10 p-6 shadow-[0_12px_36px_rgba(15,23,42,0.34)] backdrop-blur-lg">
      <h3 className="text-xl font-semibold text-white">AI Insights</h3>
      <p className="mt-2 text-sm text-white/75">Personalized highlights and next moves based on your current profile summary.</p>

      {loading ? (
        <div className="mt-5 flex items-center gap-2 text-sm text-white/80">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Generating insights...
        </div>
      ) : null}

      {error ? (
        <p className="mt-5 rounded-xl border border-rose-300/35 bg-rose-500/15 px-4 py-3 text-sm text-rose-100">
          Insights are temporarily unavailable. Keep updating your profile and try again in a moment.
        </p>
      ) : null}

      {!loading && !error && insights ? (
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <InsightBlock title="Strengths" items={insights.strengths} toneClasses="border-emerald-300/30 bg-emerald-500/10" />
          <InsightBlock title="Areas to Improve" items={insights.weaknesses} toneClasses="border-amber-300/30 bg-amber-500/10" />
          <InsightBlock title="Next Steps" items={insights.nextSteps} toneClasses="border-sky-300/30 bg-sky-500/10" />
        </div>
      ) : null}
    </article>
  );
}

function EmptyProfileSummaryState() {
  return (
    <article className="rounded-3xl border border-white/20 bg-white/10 p-8 text-center shadow-[0_12px_36px_rgba(15,23,42,0.34)] backdrop-blur-lg">
      <h3 className="text-xl font-semibold text-white">Start using tools to build your profile</h3>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-white/75">
        Your profile summary will update automatically after you enter academics, build activities, generate essay ideas, or run college chances with real data.
      </p>
    </article>
  );
}

function InsightBlock({ title, items, toneClasses }: { title: string; items: string[]; toneClasses: string }) {
  return (
    <section className={`rounded-2xl border p-4 ${toneClasses}`}>
      <h4 className="text-sm font-semibold uppercase tracking-[0.08em] text-white/90">{title}</h4>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-white/85">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function ScoreBreakdownItem({ label, value, maxValue }: { label: string; value: number; maxValue: number }) {
  const safeValue = Number.isFinite(value) ? value : 0;
  const percent = Math.max(0, Math.min(100, Math.round((safeValue / maxValue) * 100)));

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-white/90">{label}</p>
        <p className="text-sm font-semibold text-white">{safeValue}/{maxValue}</p>
      </div>
      <div className="mt-3 h-2 rounded-full bg-white/10">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-indigo-400 to-cyan-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function ActivityOverviewCard() {
  const { profile } = useProfileSummary();

  const topActivities = useMemo(() => {
    const ranked = profile.rankedActivities.length ? profile.rankedActivities : rankActivities(profile.activities);
    return ranked.slice(0, 3);
  }, [profile.activities, profile.rankedActivities]);

  const activityStrengthScore = useMemo(() => {
    if (!profile.activities.length) {
      return 0;
    }

    const totalCommitment = profile.activities.reduce((sum, item) => sum + item.hoursPerWeek * item.weeksPerYear, 0);
    const normalized = Math.min(100, Math.round((totalCommitment / 300) * 100));
    return normalized;
  }, [profile.activities]);

  return (
    <article className="rounded-2xl border border-emerald-300/25 bg-emerald-500/10 p-5 shadow-[0_8px_26px_rgba(15,23,42,0.28)] backdrop-blur-lg">
      <h3 className="text-lg font-semibold text-white">Activity Overview</h3>
      <p className="mt-1 text-xs uppercase tracking-[0.1em] text-white/60">Extracurriculars Snapshot</p>

      <div className="mt-4 space-y-2 text-sm text-white/90">
        <p>
          Total Activities: <span className="font-semibold">{profile.activities.length}</span>
        </p>
        <p>
          Activity Strength Score: <span className="font-semibold">{activityStrengthScore}/100</span>
        </p>
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-white/60">Top Activities</p>
        {topActivities.length ? (
          <ul className="mt-2 space-y-2 text-sm text-white/85">
            {topActivities.map((activity) => (
              <li key={activity.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-white">{activity.activityName}</p>
                  <span className="rounded-full border border-white/15 bg-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/75">
                    {getRankBadgeText(activity.rankPosition)}
                  </span>
                </div>
                <p className="text-xs text-white/70">{formatHoursLabel(activity.hoursPerWeek, activity.weeksPerYear)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/70">
            No activities added yet.
          </p>
        )}
      </div>
    </article>
  );
}

function AcademicSnapshotCard() {
  const { profile } = useProfileSummary();
  const { academic } = profile;

  return (
    <article className="rounded-2xl border border-sky-300/25 bg-sky-500/10 p-5 shadow-[0_8px_26px_rgba(15,23,42,0.28)] backdrop-blur-lg">
      <h3 className="text-lg font-semibold text-white">Academic Snapshot</h3>
      <p className="mt-1 text-xs uppercase tracking-[0.1em] text-white/60">Latest Profile Inputs</p>

      <div className="mt-4 space-y-3 text-sm text-white/90">
        <p>
          Weighted GPA: <span className="font-semibold">{academic.weightedGpa ?? "Not provided"}</span>
        </p>
        <p>
          {academic.testType ?? "Test"} Score: <span className="font-semibold">{academic.testScore ?? "Not provided"}</span>
        </p>
        <p>
          Course Rigor: <span className="font-semibold">{academic.courseRigor || "Not provided"}</span>
        </p>
      </div>
    </article>
  );
}

function CollegeChancesCard() {
  const { profile } = useProfileSummary();

  const counts = useMemo(() => {
    return profile.collegeChances.reduce(
      (acc, item) => {
        if (item.status === "Reach") {
          acc.reach += 1;
        } else if (item.status === "Target") {
          acc.match += 1;
        } else {
          acc.safety += 1;
        }

        return acc;
      },
      { reach: 0, match: 0, safety: 0 }
    );
  }, [profile.collegeChances]);

  return (
    <article className="rounded-2xl border border-amber-300/25 bg-amber-500/10 p-5 shadow-[0_8px_26px_rgba(15,23,42,0.28)] backdrop-blur-lg">
      <h3 className="text-lg font-semibold text-white">College Chances Snapshot</h3>
      <p className="mt-1 text-xs uppercase tracking-[0.1em] text-white/60">Latest Chances Run</p>

      {profile.collegeChances.length ? (
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg border border-rose-300/35 bg-rose-500/15 px-3 py-3">
            <p className="text-xs uppercase tracking-[0.08em] text-rose-100/80">Reach</p>
            <p className="mt-1 text-xl font-semibold text-rose-100">{counts.reach}</p>
          </div>
          <div className="rounded-lg border border-amber-300/35 bg-amber-500/15 px-3 py-3">
            <p className="text-xs uppercase tracking-[0.08em] text-amber-100/80">Match</p>
            <p className="mt-1 text-xl font-semibold text-amber-100">{counts.match}</p>
          </div>
          <div className="rounded-lg border border-emerald-300/35 bg-emerald-500/15 px-3 py-3">
            <p className="text-xs uppercase tracking-[0.08em] text-emerald-100/80">Safety</p>
            <p className="mt-1 text-xl font-semibold text-emerald-100">{counts.safety}</p>
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/70">
          No college chances data yet.
        </p>
      )}
    </article>
  );
}

function EssaySnapshotCard() {
  const { profile } = useProfileSummary();
  const topEssayIdeas = profile.essays.slice(0, 2);

  return (
    <article className="rounded-2xl border border-violet-300/25 bg-violet-500/10 p-5 shadow-[0_8px_26px_rgba(15,23,42,0.28)] backdrop-blur-lg">
      <h3 className="text-lg font-semibold text-white">Essay / Writing Snapshot</h3>
      <p className="mt-1 text-xs uppercase tracking-[0.1em] text-white/60">Story Development Progress</p>

      {profile.essays.length ? (
        <div className="mt-4 space-y-2 text-sm text-white/90">
          <p>
            Essay Ideas Created: <span className="font-semibold">{profile.essays.length}</span>
          </p>
          <div className="space-y-1">
            {topEssayIdeas.map((idea, index) => (
              <p key={idea.id} className="text-xs text-white/70">
                {index + 1}. {idea.topic}
              </p>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/70">
          No essays created yet.
        </p>
      )}
    </article>
  );
}

function GuestSaveProgressBanner({ bannerKey, hasMeaningfulData }: { bannerKey: string; hasMeaningfulData: boolean }) {
  const { isGuest, openAuthModal } = useAuth();
  const { profile } = useProfileSummary();
  const [initialBannerKey] = useState(() => bannerKey);
  const [dismissedKey, setDismissedKey] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const raw = window.localStorage.getItem(SAVE_BANNER_STORAGE_KEY);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as { dismissedKey?: string };
      return typeof parsed.dismissedKey === "string" ? parsed.dismissedKey : null;
    } catch {
      return null;
    }
  });

  const hasCompletedActionThisSession = bannerKey !== initialBannerKey;
  const hasValueSignal = profile.activities.length > 0 || profile.essays.length > 0 || hasMeaningfulData;
  const hasDismissedBefore = dismissedKey !== null;
  const shouldShowAfterDismiss = hasDismissedBefore && dismissedKey !== bannerKey;
  const shouldShowFirstTime = !hasDismissedBefore && hasCompletedActionThisSession;

  const shouldShow = isGuest && hasValueSignal && (shouldShowAfterDismiss || shouldShowFirstTime);

  function dismissBanner() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        SAVE_BANNER_STORAGE_KEY,
        JSON.stringify({
          hideSaveBanner: true,
          dismissedKey: bannerKey
        })
      );
    }

    setDismissedKey(bannerKey);
  }

  function handleCreateAccount() {
    openAuthModal("signup");
  }

  function handleLogIn() {
    openAuthModal("login");
  }

  return (
    <AnimatePresence>
      {shouldShow ? (
        <motion.article
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="mb-4 rounded-2xl border border-indigo-300/30 bg-indigo-500/12 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.25)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-white">Save Your Progress</h3>
              <p className="mt-1 text-sm text-white/80">Create an account to keep your activities, essays, and profile score.</p>
            </div>

            <button
              type="button"
              onClick={dismissBanner}
              className="rounded-md p-1 text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Dismiss save progress banner"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCreateAccount}
              className="rounded-lg bg-indigo-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={handleLogIn}
              className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm font-medium text-white/85 transition hover:bg-white/10"
            >
              Log In
            </button>
          </div>
        </motion.article>
      ) : null}
    </AnimatePresence>
  );
}

export function ProfileSummaryDashboard() {
  const { profile, profileLoading, profileSaving, profileSyncError, exportProfile, importProfile } = useProfileSummary();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hasMeaningfulData = hasMeaningfulProfileData(profile);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const saveBannerKey = useMemo(
    () =>
      JSON.stringify({
        activities: profile.activities.length,
        essays: profile.essays.length,
        collegeChances: profile.collegeChances.length,
        hasMeaningfulData
      }),
    [profile.activities.length, profile.essays.length, profile.collegeChances.length, hasMeaningfulData]
  );

  async function copyProfileData() {
    const payload = exportProfile();
    await navigator.clipboard.writeText(payload);
    setSyncMessage("Profile data copied.");
  }

  function openImportPicker() {
    fileInputRef.current?.click();
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const text = await file.text();
    const error = importProfile(text);
    setSyncMessage(error ?? "Profile imported successfully.");
    event.target.value = "";
  }

  return (
    <section className="mt-16">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold tracking-[0.02em] text-white md:text-3xl">Profile Summary</h2>
              <p className="mt-2 text-sm text-white/75 md:text-base">
                A quick dashboard view of your academics, activities, college chances, and essay progress.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={copyProfileData}
                className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-xs font-semibold text-white/85 transition hover:bg-black/30"
              >
                Copy Profile JSON
              </button>
              <button
                type="button"
                onClick={openImportPicker}
                className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-xs font-semibold text-white/85 transition hover:bg-black/30"
              >
                Import Profile JSON
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={handleImportFile}
              />
            </div>
          </div>

          {syncMessage ? <p className="mt-3 text-xs text-white/70">{syncMessage}</p> : null}

          {profileLoading ? (
            <p className="mt-2 text-xs text-white/70">Loading your saved profile...</p>
          ) : null}

          {!profileLoading && profileSaving ? (
            <p className="mt-2 text-xs text-emerald-200/85">Saving profile updates...</p>
          ) : null}

          {profileSyncError ? (
            <p className="mt-2 text-xs text-rose-200/90">{profileSyncError}</p>
          ) : null}
        </header>

        <GuestSaveProgressBanner bannerKey={saveBannerKey} hasMeaningfulData={hasMeaningfulData} />

        {profileLoading ? (
          <article className="rounded-3xl border border-white/20 bg-white/10 p-8 text-center shadow-[0_12px_36px_rgba(15,23,42,0.34)] backdrop-blur-lg">
            <h3 className="text-xl font-semibold text-white">Loading profile...</h3>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-white/75">
              Pulling your latest saved profile data.
            </p>
          </article>
        ) : !hasMeaningfulData ? (
          <EmptyProfileSummaryState />
        ) : (
          <>
            <div className="mb-4">
              <ProfileReadinessCard />
              <ProfileInsightsCard />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <AcademicSnapshotCard />
              <ActivityOverviewCard />
              <CollegeChancesCard />
              <EssaySnapshotCard />
            </div>
          </>
        )}
      </div>
    </section>
  );
}
