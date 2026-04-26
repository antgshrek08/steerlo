"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Copy, Loader2, Pin, Sparkles } from "lucide-react";
import { useProfileSummary } from "@/components/profile/ProfileSummaryProvider";
import { getRankBadgeText, rankActivities, reorderRankedActivities, trimActivityDescription, type RankedActivity } from "@/components/activity-builder/activityRanking";

type ActivityFormState = {
  activityName: string;
  role: string;
  organizationName: string;
  hoursPerWeek: string;
  weeksPerYear: string;
  description: string;
};

type ActivityBuilderResult = {
  commonAppDescription: string;
  impactSuggestions: string;
  category: string;
  improvedPhrasing: string;
};

type ActivityResultInput = Omit<ActivityFormState, "hoursPerWeek" | "weeksPerYear"> & {
  id: string;
  hoursPerWeek: number;
  weeksPerYear: number;
  createdAt: string;
};

type ActivityResultItem = RankedActivity<ActivityResultInput & ActivityBuilderResult>;
type EditableActivityItem = Omit<ActivityResultItem, "hoursPerWeek" | "weeksPerYear"> & {
  id: string;
  hoursPerWeek: string;
  weeksPerYear: string;
};

const MIN_ACTIVITIES = 1;
const MAX_ACTIVITIES = 5;
const ACTIVITY_DRAFT_KEY = "steerlo-activity-top-list-draft";
const ACTIVITY_DRAFT_VERSION = 1;

function createEmptyActivity(): ActivityFormState {
  return {
    activityName: "",
    role: "",
    organizationName: "",
    hoursPerWeek: "",
    weeksPerYear: "",
    description: ""
  };
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function parsePositiveNumber(value: string | number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function isCompleteActivity(activity: ActivityFormState) {
  return Boolean(
    normalizeText(activity.activityName) &&
      normalizeText(activity.role) &&
      parsePositiveNumber(activity.hoursPerWeek) !== null &&
      parsePositiveNumber(activity.weeksPerYear) !== null &&
      normalizeText(activity.description)
  );
}

function validateResultShape(value: unknown, expectedCount: number): value is { activitiesResults: ActivityBuilderResult[] } {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.activitiesResults)) {
    return false;
  }

  if (record.activitiesResults.length !== expectedCount) {
    return false;
  }

  return record.activitiesResults.every((item) => {
    if (!item || typeof item !== "object") {
      return false;
    }

    const result = item as Record<string, unknown>;
    const commonAppDescription = typeof result.commonAppDescription === "string" ? result.commonAppDescription.trim() : "";
    const impactSuggestions = typeof result.impactSuggestions === "string" ? result.impactSuggestions.trim() : "";
    const category = typeof result.category === "string" ? result.category.trim() : "";
    const improvedPhrasing = typeof result.improvedPhrasing === "string" ? result.improvedPhrasing.trim() : "";

    return Boolean(commonAppDescription && impactSuggestions && category && improvedPhrasing);
  });
}

function getCategoryColor(category: string) {
  const normalized = category.toLowerCase().trim();
  if (normalized.includes("leadership")) {
    return "border-amber-300/35 bg-amber-500/15 text-amber-100";
  }
  if (normalized.includes("service")) {
    return "border-emerald-300/35 bg-emerald-500/15 text-emerald-100";
  }
  if (normalized.includes("work")) {
    return "border-blue-300/35 bg-blue-500/15 text-blue-100";
  }
  if (normalized.includes("academic")) {
    return "border-purple-300/35 bg-purple-500/15 text-purple-100";
  }
  return "border-indigo-300/35 bg-indigo-500/15 text-indigo-100";
}

function getCategoryLabel(category: string) {
  return category || "Uncategorized";
}

export function ActivityBuilderForm() {
  const { replaceActivities, profile } = useProfileSummary();
  const topActivitiesSectionRef = useRef<HTMLElement | null>(null);
  const [activityCount, setActivityCount] = useState(1);
  const [activities, setActivities] = useState<ActivityFormState[]>([createEmptyActivity()]);
  const [activitiesResults, setActivitiesResults] = useState<ActivityResultItem[]>([]);
  const [draftActivities, setDraftActivities] = useState<EditableActivityItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(ACTIVITY_DRAFT_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { version?: number; entries?: EditableActivityItem[] };
          if (parsed && parsed.version === ACTIVITY_DRAFT_VERSION && Array.isArray(parsed.entries) && parsed.entries.length) {
            return parsed.entries.slice(0, 10);
          }
        }
      } catch {
        // Ignore malformed draft payload and fall back to profile data.
      }
    }

    if (profile.activities.length) {
      return profile.activities.slice(0, 10).map((activity) => ({
        ...activity,
        impactSuggestions: "",
        hoursPerWeek: String(activity.hoursPerWeek),
        weeksPerYear: String(activity.weeksPerYear)
      }));
    }

    return [];
  });
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [draftMessage, setDraftMessage] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);

  const currentActivity = activities[currentActivityIndex];
  const currentResult = activitiesResults[currentActivityIndex];
  const topActivities = draftActivities;

  const savedSignature = useMemo(() => {
    return JSON.stringify(
      profile.activities.slice(0, 10).map((activity) => ({
        id: activity.id,
        activityName: activity.activityName,
        role: activity.role,
        organizationName: activity.organizationName,
        category: activity.category,
        hoursPerWeek: String(activity.hoursPerWeek),
        weeksPerYear: String(activity.weeksPerYear),
        description: activity.description,
        commonAppDescription: activity.commonAppDescription,
        improvedPhrasing: activity.improvedPhrasing
      }))
    );
  }, [profile.activities]);

  const draftSignature = useMemo(() => {
    return JSON.stringify(
      draftActivities.map((activity) => ({
        id: activity.id,
        activityName: activity.activityName,
        role: activity.role,
        organizationName: activity.organizationName,
        category: activity.category,
        hoursPerWeek: activity.hoursPerWeek,
        weeksPerYear: activity.weeksPerYear,
        description: activity.description,
        commonAppDescription: activity.commonAppDescription,
        improvedPhrasing: activity.improvedPhrasing
      }))
    );
  }, [draftActivities]);

  const isDraftDirty = draftActivities.length > 0 && draftSignature !== savedSignature;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    localStorage.setItem(
      ACTIVITY_DRAFT_KEY,
      JSON.stringify({
        version: ACTIVITY_DRAFT_VERSION,
        entries: draftActivities
      })
    );
  }, [draftActivities]);

  function buildId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function updateActivityCount(nextCount: number) {
    const clamped = Math.max(MIN_ACTIVITIES, Math.min(MAX_ACTIVITIES, nextCount));

    setActivityCount(clamped);
    setActivities((current) => {
      const next = current.slice(0, clamped);
      while (next.length < clamped) {
        next.push(createEmptyActivity());
      }
      return next;
    });
    setActivitiesResults([]);
    setCurrentActivityIndex(0);
    setError(null);
    setCopiedField(null);
  }

  function updateField<Key extends keyof ActivityFormState>(index: number, key: Key, value: ActivityFormState[Key]) {
    setActivities((current) => {
      const next = [...current];
      next[index] = {
        ...next[index],
        [key]: value
      };
      return next;
    });
    setActivitiesResults([]);
    setError(null);
  }

  function updateDraftField<Key extends keyof EditableActivityItem>(index: number, key: Key, value: EditableActivityItem[Key]) {
    setDraftActivities((current) => {
      const next = [...current];
      next[index] = {
        ...next[index],
        [key]: value,
        rankLabel: next[index].rankLabel,
        rankPosition: next[index].rankPosition,
        rankScore: next[index].rankScore
      };
      return reorderRankedActivities(next, next.map((activity) => activity.id));
    });
    setDraftMessage(null);
    setDraftError(null);
  }

  function copyToClipboard(text: string, field: string) {
    void navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  function copyFullResult(result: ActivityResultItem) {
    const text = [
      `Rank: ${getRankBadgeText(result.rankPosition)}`,
      `Activity: ${result.activityName}`,
      `Role: ${result.role}`,
      result.organizationName ? `Organization: ${result.organizationName}` : null,
      `Hours/Week: ${result.hoursPerWeek}`,
      `Weeks/Year: ${result.weeksPerYear}`,
      `Original Description: ${result.description}`,
      `Common App Description: ${result.commonAppDescription}`,
      `Impact Suggestions: ${result.impactSuggestions}`,
      `Category: ${result.category}`,
      `Boost Line: ${result.improvedPhrasing}`
    ].filter(Boolean).join("\n");

    copyToClipboard(text, `full-${currentActivityIndex}`);
  }

  function copyTopActivities() {
    const text = topActivities
      .map((activity, index) => {
        const description = trimActivityDescription(activity.commonAppDescription || activity.improvedPhrasing, 150);
        const details = [
          `${index + 1}. ${activity.activityName} | ${activity.role}`,
          activity.organizationName ? `Organization: ${activity.organizationName}` : null,
          `Description: ${description}`,
          `Time: ${activity.hoursPerWeek} hrs/wk, ${activity.weeksPerYear} wks/yr`,
          `Category: ${activity.category}`
        ]
          .filter(Boolean)
          .join("\n");

        return details;
      })
      .join("\n\n");

    copyToClipboard(text, "top-activities");
  }

  function scrollToTopActivities() {
    topActivitiesSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function moveDraftActivity(activityId: string, direction: -1 | 1) {
    const currentOrder = draftActivities.map((activity) => activity.id);
    const currentIndex = currentOrder.indexOf(activityId);

    if (currentIndex === -1) {
      return;
    }

    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= currentOrder.length) {
      return;
    }

    const nextOrder = [...currentOrder];
    [nextOrder[currentIndex], nextOrder[nextIndex]] = [nextOrder[nextIndex], nextOrder[currentIndex]];
    setDraftActivities((current) => reorderRankedActivities(current, nextOrder));
    setDraftMessage(null);
    setDraftError(null);
  }

  function pinDraftActivityToTop(activityId: string) {
    const currentOrder = draftActivities.map((activity) => activity.id);
    const nextOrder = [activityId, ...currentOrder.filter((id) => id !== activityId)];
    setDraftActivities((current) => reorderRankedActivities(current, nextOrder));
    setDraftMessage(null);
    setDraftError(null);
  }

  function removeDraftActivity(activityId: string) {
    setDraftActivities((current) => reorderRankedActivities(current.filter((activity) => activity.id !== activityId), current.filter((activity) => activity.id !== activityId).map((activity) => activity.id)));
    setDraftMessage(null);
    setDraftError(null);
  }

  function isDraftActivityComplete(activity: EditableActivityItem) {
    return Boolean(
      normalizeText(activity.activityName) &&
        normalizeText(activity.role) &&
        parsePositiveNumber(activity.hoursPerWeek) !== null &&
        parsePositiveNumber(activity.weeksPerYear) !== null &&
        normalizeText(activity.description)
    );
  }

  function saveDraftActivities() {
    if (!draftActivities.length) {
      setDraftError("Generate at least one activity before saving.");
      return;
    }

    if (!draftActivities.every(isDraftActivityComplete)) {
      setDraftError("Complete every saved activity before saving to your profile.");
      return;
    }

    replaceActivities(
      draftActivities.map((activity) => ({
        ...activity,
        hoursPerWeek: parsePositiveNumber(activity.hoursPerWeek) ?? 0,
        weeksPerYear: parsePositiveNumber(activity.weeksPerYear) ?? 0,
        description: trimActivityDescription(activity.description, 150),
        commonAppDescription: trimActivityDescription(activity.commonAppDescription || activity.improvedPhrasing, 150),
        improvedPhrasing: trimActivityDescription(activity.improvedPhrasing, 150)
      }))
    );

    setDraftMessage("Saved to Profile Summary.");
    setDraftError(null);
  }

  const canSubmit = useMemo(() => activities.length === activityCount && activities.every(isCompleteActivity) && !loading, [activities, activityCount, loading]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      setError("Complete every field for each activity before generating results.");
      return;
    }

    setLoading(true);
    setError(null);
    setActivitiesResults([]);
    setCurrentActivityIndex(0);

    try {
      const payload = {
        activities: activities.map((activity) => ({
          activityName: normalizeText(activity.activityName),
          role: normalizeText(activity.role),
          organizationName: normalizeText(activity.organizationName),
          hoursPerWeek: normalizeText(activity.hoursPerWeek),
          weeksPerYear: normalizeText(activity.weeksPerYear),
          description: normalizeText(activity.description)
        }))
      };

      const response = await fetch("/api/activity-builder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = (await response.json()) as { activitiesResults?: ActivityBuilderResult[]; error?: string };

      if (!response.ok) {
        const message = !Array.isArray(data.activitiesResults) && data.error ? data.error : "Failed to analyze activities.";
        throw new Error(message);
      }

      if (!validateResultShape(data, activities.length)) {
        throw new Error("The response is missing required fields. Please try again.");
      }

      const nextResults: ActivityResultItem[] = rankActivities(
        data.activitiesResults.map((result, index) => ({
          id: buildId(),
          activityName: activities[index].activityName,
          role: activities[index].role,
          organizationName: activities[index].organizationName,
          hoursPerWeek: parsePositiveNumber(activities[index].hoursPerWeek) ?? 0,
          weeksPerYear: parsePositiveNumber(activities[index].weeksPerYear) ?? 0,
          description: activities[index].description,
          createdAt: new Date().toISOString(),
          ...result
        }))
      );

      replaceActivities(
        nextResults.map((activity) => ({
          ...activity,
          hoursPerWeek: parsePositiveNumber(activity.hoursPerWeek) ?? 0,
          weeksPerYear: parsePositiveNumber(activity.weeksPerYear) ?? 0
        }))
      );

      setActivitiesResults(nextResults);
      setDraftActivities(
        nextResults.map((activity) => ({
          ...activity,
          hoursPerWeek: String(activity.hoursPerWeek),
          weeksPerYear: String(activity.weeksPerYear)
        }))
      );
      setCurrentActivityIndex(0);
      setDraftMessage("Edit your top activities, then save them to your profile.");
      setDraftError(null);

      requestAnimationFrame(() => {
        scrollToTopActivities();
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function goToPreviousActivity() {
    setCopiedField(null);
    setCurrentActivityIndex((current) => Math.max(0, current - 1));
  }

  function goToNextActivity() {
    setCopiedField(null);
    setCurrentActivityIndex((current) => Math.min(activitiesResults.length - 1, current + 1));
  }

  function getRankCardClasses(rankPosition: number) {
    if (rankPosition === 1) {
      return "border-emerald-300/35 bg-emerald-500/10 shadow-[0_18px_40px_rgba(16,185,129,0.18)]";
    }

    if (rankPosition === 2) {
      return "border-amber-300/30 bg-amber-500/10 shadow-[0_16px_36px_rgba(245,158,11,0.15)]";
    }

    return "border-white/15 bg-black/20";
  }

  function getRankBadgeClasses(rankPosition: number) {
    if (rankPosition === 1) {
      return "border-emerald-300/35 bg-emerald-500/15 text-emerald-100";
    }

    if (rankPosition === 2) {
      return "border-amber-300/35 bg-amber-500/15 text-amber-100";
    }

    return "border-white/15 bg-white/10 text-white/80";
  }

  function getTopActivityCardClasses(rankPosition: number) {
    if (rankPosition === 1) {
      return "border-emerald-300/35 bg-emerald-500/10 shadow-[0_18px_40px_rgba(16,185,129,0.12)]";
    }

    if (rankPosition === 2) {
      return "border-amber-300/30 bg-amber-500/10 shadow-[0_16px_36px_rgba(245,158,11,0.1)]";
    }

    return "border-white/15 bg-black/20";
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-white/20 bg-white/10 p-6 shadow-[0_8px_30px_rgba(15,23,42,0.3)] backdrop-blur-lg md:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-white">Build Your Activities</h2>
            <p className="mt-2 text-sm text-white/75">Choose up to five activities and improve them all at once.</p>
          </div>

          <label className="space-y-2">
            <span className="block text-sm font-medium text-white/90">Number of activities</span>
            <select
              value={activityCount}
              onChange={(event) => updateActivityCount(Number(event.target.value))}
              className="w-44 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none backdrop-blur-xl transition focus:border-indigo-300/70 focus:ring-4 focus:ring-indigo-400/25"
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <option key={value} value={value}>
                  {value} {value === 1 ? "activity" : "activities"}
                </option>
              ))}
            </select>
          </label>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <div key={index} className="rounded-2xl border border-white/10 bg-black/25 p-5">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Activity {index + 1}</h3>
                    <p className="text-xs uppercase tracking-[0.1em] text-white/60">{activityCount > 1 ? `Step ${index + 1} of ${activityCount}` : "Single activity"}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-white/70">
                    {activity.activityName.trim() ? activity.activityName.trim() : "Not yet named"}
                  </span>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-white/90">Activity name *</span>
                    <input
                      type="text"
                      value={activity.activityName}
                      onChange={(e) => updateField(index, "activityName", e.target.value)}
                      placeholder="e.g. Science Olympiad"
                      required
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/55 outline-none backdrop-blur-xl transition focus:border-indigo-300/70 focus:ring-4 focus:ring-indigo-400/25"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-white/90">Role / Title *</span>
                    <input
                      type="text"
                      value={activity.role}
                      onChange={(e) => updateField(index, "role", e.target.value)}
                      placeholder="e.g. Team Captain"
                      required
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/55 outline-none backdrop-blur-xl transition focus:border-indigo-300/70 focus:ring-4 focus:ring-indigo-400/25"
                    />
                  </label>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-white/90">Organization name</span>
                    <input
                      type="text"
                      value={activity.organizationName}
                      onChange={(e) => updateField(index, "organizationName", e.target.value)}
                      placeholder="e.g. Lincoln High School"
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/55 outline-none backdrop-blur-xl transition focus:border-indigo-300/70 focus:ring-4 focus:ring-indigo-400/25"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-white/90">Hours per week *</span>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={activity.hoursPerWeek}
                      onChange={(e) => updateField(index, "hoursPerWeek", e.target.value)}
                      placeholder="e.g. 10"
                      required
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/55 outline-none backdrop-blur-xl transition focus:border-indigo-300/70 focus:ring-4 focus:ring-indigo-400/25"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-white/90">Weeks per year *</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={activity.weeksPerYear}
                      onChange={(e) => updateField(index, "weeksPerYear", e.target.value)}
                      placeholder="e.g. 36"
                      required
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/55 outline-none backdrop-blur-xl transition focus:border-indigo-300/70 focus:ring-4 focus:ring-indigo-400/25"
                    />
                  </label>
                </div>

                <label className="mt-4 block space-y-2">
                  <span className="text-sm font-medium text-white/90">Activity description *</span>
                  <textarea
                    value={activity.description}
                    onChange={(e) => updateField(index, "description", e.target.value)}
                    placeholder="Describe what you do in this activity, what you've accomplished, and why it matters to you..."
                    required
                    rows={5}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/55 outline-none backdrop-blur-xl transition focus:border-indigo-300/70 focus:ring-4 focus:ring-indigo-400/25"
                  />
                </label>
              </div>
            ))}
          </div>

          {error && (
            <div className="rounded-xl border border-rose-300/35 bg-rose-500/15 px-4 py-3 text-sm text-rose-100">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-300/30 bg-indigo-500/70 px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.02] hover:bg-indigo-500/85 hover:shadow-[0_0_20px_rgba(99,102,241,0.35)] focus:outline-none focus:ring-2 focus:ring-indigo-300/70 focus:ring-offset-2 focus:ring-offset-black/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Improve Activities
              </>
            )}
          </button>
        </form>
      </div>

      {activitiesResults.length ? (
        <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="rounded-2xl border border-white/20 bg-white/10 p-6 shadow-[0_8px_30px_rgba(15,23,42,0.3)] backdrop-blur-lg md:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-[0.02em] text-white">Activity Results</h2>
              <p className="mt-2 text-sm text-white/75">
                Review and copy one activity at a time.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goToPreviousActivity}
                disabled={currentActivityIndex === 0}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-black/30 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Previous
              </button>

              <span className="rounded-xl border border-white/15 bg-black/20 px-4 py-2 text-sm font-medium text-white/80">
                Activity {currentActivityIndex + 1} of {activitiesResults.length}
              </span>

              <button
                type="button"
                onClick={goToNextActivity}
                disabled={currentActivityIndex === activitiesResults.length - 1}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-black/30 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentActivityIndex}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.28 }}
              className="space-y-4"
            >
              <div className={`rounded-2xl p-5 ${getRankCardClasses(currentResult.rankPosition)} ${currentResult.rankPosition <= 2 ? "md:p-6" : ""}`}>
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${getRankBadgeClasses(currentResult.rankPosition)}`}>
                      {getRankBadgeText(currentResult.rankPosition)}
                    </span>
                    <h3 className="text-xl font-semibold text-white">{currentActivity.activityName || `Activity ${currentActivityIndex + 1}`}</h3>
                    <p className="mt-1 text-sm text-white/70">{currentActivity.role}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => pinDraftActivityToTop(currentResult.id)}
                      className="inline-flex items-center gap-2 rounded-lg border border-emerald-300/30 bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-100 transition hover:bg-emerald-500/25"
                    >
                      <Pin className="h-4 w-4" aria-hidden="true" />
                      Pin to Top List
                    </button>
                    <button
                      type="button"
                      onClick={() => copyFullResult(currentResult)}
                      className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-medium text-white/80 transition hover:bg-white/20"
                    >
                      <Copy className="h-4 w-4" aria-hidden="true" />
                      Copy All
                    </button>
                    <button
                      type="button"
                      onClick={scrollToTopActivities}
                      className="inline-flex items-center gap-2 rounded-lg border border-indigo-300/30 bg-indigo-500/20 px-3 py-2 text-xs font-medium text-indigo-100 transition hover:bg-indigo-500/30"
                    >
                      Edit in Top Activities
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-white/60">Original Input</p>
                    <div className="mt-3 space-y-2 text-sm text-white/85">
                      <p><span className="font-semibold text-white">Hours:</span> {currentActivity.hoursPerWeek} / week</p>
                      <p><span className="font-semibold text-white">Weeks:</span> {currentActivity.weeksPerYear} / year</p>
                      {currentActivity.organizationName ? (
                        <p><span className="font-semibold text-white">Organization:</span> {currentActivity.organizationName}</p>
                      ) : null}
                      <p className="leading-6"><span className="font-semibold text-white">Description:</span> {currentActivity.description}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-white/60">Common App Description</p>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(currentResult.commonAppDescription, `common-${currentActivityIndex}`)}
                        className="rounded-lg border border-white/15 bg-black/20 px-2 py-1 text-xs font-medium text-white/75 transition hover:bg-black/30"
                      >
                        {copiedField === `common-${currentActivityIndex}` ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-white/90">{currentResult.commonAppDescription}</p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-white/60">Impact Suggestion</p>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(currentResult.impactSuggestions, `impact-${currentActivityIndex}`)}
                        className="rounded-lg border border-white/15 bg-black/20 px-2 py-1 text-xs font-medium text-white/75 transition hover:bg-black/30"
                      >
                        {copiedField === `impact-${currentActivityIndex}` ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-white/85">{currentResult.impactSuggestions}</p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-white/60">Category</p>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(currentResult.category, `category-${currentActivityIndex}`)}
                        className="rounded-lg border border-white/15 bg-black/20 px-2 py-1 text-xs font-medium text-white/75 transition hover:bg-black/30"
                      >
                        {copiedField === `category-${currentActivityIndex}` ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <span className={`mt-3 inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${getCategoryColor(currentResult.category)}`}>
                      {getCategoryLabel(currentResult.category)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-white/60">Strong Rewritten Version</p>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(currentResult.improvedPhrasing, `rewrite-${currentActivityIndex}`)}
                      className="rounded-lg border border-white/15 bg-black/20 px-2 py-1 text-xs font-medium text-white/75 transition hover:bg-black/30"
                    >
                      {copiedField === `rewrite-${currentActivityIndex}` ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/90">{currentResult.improvedPhrasing}</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.section>
      ) : null}

      <section ref={topActivitiesSectionRef} className="rounded-2xl border border-white/20 bg-white/10 p-6 shadow-[0_8px_30px_rgba(15,23,42,0.3)] backdrop-blur-lg md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-[0.02em] text-white">Your Top Activities (Common App Format)</h2>
            <p className="mt-2 max-w-2xl text-sm text-white/75">
              Edit the list directly, reorder it, and then save it to your profile. The final list stays capped at 10 activities.
            </p>
            {isDraftDirty ? (
              <p className="mt-2 inline-flex rounded-full border border-amber-300/35 bg-amber-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-amber-100">
                Unsaved changes
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={copyTopActivities}
              disabled={!topActivities.length}
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-300/30 bg-indigo-500/70 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500/85 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              Copy All Activities
            </button>

            <button
              type="button"
              onClick={saveDraftActivities}
              disabled={!topActivities.length}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-300/30 bg-emerald-500/20 px-4 py-2.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save Activities to Profile
            </button>
          </div>
        </div>

        {draftError ? (
          <p className="mt-4 rounded-xl border border-rose-300/35 bg-rose-500/15 px-4 py-3 text-sm text-rose-100">{draftError}</p>
        ) : null}

        {draftMessage ? (
          <p className="mt-4 rounded-xl border border-emerald-300/35 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100">{draftMessage}</p>
        ) : null}

        {topActivities.length ? (
          <div className="mt-6 space-y-4">
            {topActivities.map((activity, index) => (
              <article key={activity.id} className={`rounded-2xl p-5 ${getTopActivityCardClasses(activity.rankPosition)} ${activity.rankPosition <= 2 ? "md:p-6" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${getRankBadgeClasses(activity.rankPosition)}`}>
                        {getRankBadgeText(activity.rankPosition)}
                      </span>
                      {index < 2 ? (
                        <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/75">
                          Priority List
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-white/70">
                      Dragless reordering using Up / Down / Pin controls.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => pinDraftActivityToTop(activity.id)}
                      className="inline-flex items-center gap-2 rounded-lg border border-emerald-300/30 bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-100 transition hover:bg-emerald-500/25"
                    >
                      <Pin className="h-4 w-4" aria-hidden="true" />
                      Pin to Top
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDraftActivity(activity.id, -1)}
                      disabled={index === 0}
                      className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-xs font-medium text-white/80 transition hover:bg-black/30 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ArrowUp className="h-4 w-4" aria-hidden="true" />
                      Up
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDraftActivity(activity.id, 1)}
                      disabled={index === topActivities.length - 1}
                      className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-xs font-medium text-white/80 transition hover:bg-black/30 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ArrowDown className="h-4 w-4" aria-hidden="true" />
                      Down
                    </button>
                    <button
                      type="button"
                      onClick={() => removeDraftActivity(activity.id)}
                      className="inline-flex items-center gap-2 rounded-lg border border-rose-300/30 bg-rose-500/15 px-3 py-2 text-xs font-medium text-rose-100 transition hover:bg-rose-500/25"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/60">Activity Name</span>
                    <input
                      type="text"
                      value={activity.activityName}
                      onChange={(event) => updateDraftField(index, "activityName", event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/55 outline-none backdrop-blur-xl transition focus:border-indigo-300/70 focus:ring-4 focus:ring-indigo-400/25"
                      placeholder="Activity name"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/60">Role / Title</span>
                    <input
                      type="text"
                      value={activity.role}
                      onChange={(event) => updateDraftField(index, "role", event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/55 outline-none backdrop-blur-xl transition focus:border-indigo-300/70 focus:ring-4 focus:ring-indigo-400/25"
                      placeholder="Role or title"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/60">Organization</span>
                    <input
                      type="text"
                      value={activity.organizationName}
                      onChange={(event) => updateDraftField(index, "organizationName", event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/55 outline-none backdrop-blur-xl transition focus:border-indigo-300/70 focus:ring-4 focus:ring-indigo-400/25"
                      placeholder="School, club, company, or org"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/60">Category</span>
                    <select
                      value={activity.category}
                      onChange={(event) => updateDraftField(index, "category", event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none backdrop-blur-xl transition focus:border-indigo-300/70 focus:ring-4 focus:ring-indigo-400/25"
                    >
                      <option value="Leadership">Leadership</option>
                      <option value="Service">Service</option>
                      <option value="Work">Work</option>
                      <option value="Academic">Academic</option>
                      <option value="Hobby">Hobby</option>
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/60">Hours / Week</span>
                    <input
                      type="text"
                      value={activity.hoursPerWeek}
                      onChange={(event) => updateDraftField(index, "hoursPerWeek", event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/55 outline-none backdrop-blur-xl transition focus:border-indigo-300/70 focus:ring-4 focus:ring-indigo-400/25"
                      placeholder="10"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/60">Weeks / Year</span>
                    <input
                      type="text"
                      value={activity.weeksPerYear}
                      onChange={(event) => updateDraftField(index, "weeksPerYear", event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/55 outline-none backdrop-blur-xl transition focus:border-indigo-300/70 focus:ring-4 focus:ring-indigo-400/25"
                      placeholder="36"
                    />
                  </label>

                  <label className="space-y-2 md:col-span-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/60">Description</span>
                    <textarea
                      value={activity.description}
                      onChange={(event) => updateDraftField(index, "description", event.target.value)}
                      rows={4}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/55 outline-none backdrop-blur-xl transition focus:border-indigo-300/70 focus:ring-4 focus:ring-indigo-400/25"
                      placeholder="Describe the activity in Common App style"
                    />
                    <p className="text-xs text-white/60">Displayed in a 150-character summary when copied or exported.</p>
                  </label>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-6 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/70">
            Generate activities to automatically build your Common App list here.
          </p>
        )}
      </section>
    </div>
  );
}
