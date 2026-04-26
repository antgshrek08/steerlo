"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { rankActivities, reorderRankedActivities, type RankedActivity } from "@/components/activity-builder/activityRanking";
import { useAuth } from "@/components/auth/AuthProvider";
import { db } from "@/lib/firebase";

type TestType = "SAT" | "ACT";

type AcademicSnapshot = {
  weightedGpa: number | null;
  testType: TestType | null;
  testScore: number | null;
  courseRigor: string | null;
};

export type ActivitySummaryItem = {
  id: string;
  activityName: string;
  role: string;
  organizationName: string;
  hoursPerWeek: number;
  weeksPerYear: number;
  description: string;
  commonAppDescription: string;
  category: string;
  improvedPhrasing: string;
  createdAt: string;
};

export type RankedActivitySummaryItem = RankedActivity<ActivitySummaryItem>;

export type EssaySummaryItem = {
  id: string;
  topic: string;
  createdAt: string;
};

export type CollegeChanceSummaryItem = {
  school: string;
  status: "Reach" | "Target" | "Safety";
  category: "reach" | "match" | "safety";
  score: number;
  explanation: string;
  createdAt: string;
};

type ProfileSummaryState = {
  academic: AcademicSnapshot;
  activities: RankedActivitySummaryItem[];
  rankedActivities: RankedActivitySummaryItem[];
  essays: EssaySummaryItem[];
  collegeChances: CollegeChanceSummaryItem[];
};

export type { ProfileSummaryState };

type AddActivityInput = {
  activityName: string;
  role: string;
  organizationName?: string;
  hoursPerWeek: number;
  weeksPerYear: number;
  description: string;
  commonAppDescription: string;
  category: string;
  improvedPhrasing: string;
};

type ProfilePatch = {
  academic?: Partial<AcademicSnapshot>;
  activities?: RankedActivitySummaryItem[];
  essays?: EssaySummaryItem[];
  collegeChances?: CollegeChanceSummaryItem[];
};

type ProfileSummaryContextValue = {
  profile: ProfileSummaryState;
  profileLoading: boolean;
  profileSaving: boolean;
  profileSyncError: string | null;
  saveUserProfile: (updates: ProfilePatch) => Promise<void>;
  clearProfile: () => void;
  recordAcademicSnapshot: (snapshot: AcademicSnapshot) => void;
  addActivity: (activity: AddActivityInput) => void;
  replaceActivities: (activities: RankedActivitySummaryItem[]) => void;
  reorderActivities: (orderedIds: string[]) => void;
  recordEssayIdeas: (ideas: Array<{ topic: string }>) => void;
  recordCollegeChances: (chances: Array<{ school: string; status: "Reach" | "Target" | "Safety"; explanation: string }>) => void;
  exportProfile: () => string;
  importProfile: (raw: string) => string | null;
};

type FirestoreProfile = {
  gpa: number | null;
  sat: number | null;
  act: number | null;
  courseRigor: string | null;
  activities: RankedActivitySummaryItem[];
  essays: EssaySummaryItem[];
  collegeChances: CollegeChanceSummaryItem[];
};

const defaultProfile: ProfileSummaryState = {
  academic: {
    weightedGpa: null,
    testType: null,
    testScore: null,
    courseRigor: null
  },
  activities: [],
  rankedActivities: [],
  essays: [],
  collegeChances: []
};

const ProfileSummaryContext = createContext<ProfileSummaryContextValue | null>(null);
const AUTOSAVE_DEBOUNCE_MS = 700;

function hasMeaningfulProfileData(profile: ProfileSummaryState) {
  return profile.academic.weightedGpa !== null || profile.activities.length > 0 || profile.essays.length > 0 || profile.collegeChances.length > 0;
}

function buildId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function toFiniteNumber(value: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
}

function normalizeCategory(value: string) {
  const normalized = normalizeText(value).toLowerCase();

  if (normalized.includes("lead")) {
    return "Leadership";
  }

  if (normalized.includes("service") || normalized.includes("volunteer")) {
    return "Service";
  }

  if (normalized.includes("work") || normalized.includes("job") || normalized.includes("employment")) {
    return "Work";
  }

  if (normalized.includes("academic") || normalized.includes("research")) {
    return "Academic";
  }

  return "Hobby";
}

function normalizeActivity(activity: AddActivityInput) {
  return {
    id: buildId(),
    activityName: normalizeText(activity.activityName),
    role: normalizeText(activity.role),
    organizationName: normalizeText(activity.organizationName || ""),
    hoursPerWeek: Number.isFinite(activity.hoursPerWeek) ? activity.hoursPerWeek : 0,
    weeksPerYear: Number.isFinite(activity.weeksPerYear) ? activity.weeksPerYear : 0,
    description: normalizeText(activity.description),
    commonAppDescription: normalizeText(activity.commonAppDescription),
    category: normalizeCategory(activity.category),
    improvedPhrasing: normalizeText(activity.improvedPhrasing),
    createdAt: new Date().toISOString()
  };
}

function normalizeCollegeChanceCategory(status: "Reach" | "Target" | "Safety") {
  if (status === "Reach") {
    return "reach" as const;
  }

  if (status === "Safety") {
    return "safety" as const;
  }

  return "match" as const;
}

function estimateCollegeChanceScore(status: "Reach" | "Target" | "Safety") {
  if (status === "Reach") {
    return 45;
  }

  if (status === "Safety") {
    return 85;
  }

  return 65;
}

function mergeProfile(current: ProfileSummaryState, updates: ProfilePatch): ProfileSummaryState {
  const nextAcademic = updates.academic
    ? {
        weightedGpa: updates.academic.weightedGpa !== undefined ? toFiniteNumber(updates.academic.weightedGpa) : current.academic.weightedGpa,
        testType: updates.academic.testType !== undefined ? updates.academic.testType : current.academic.testType,
        testScore: updates.academic.testScore !== undefined ? toFiniteNumber(updates.academic.testScore) : current.academic.testScore,
        courseRigor:
          updates.academic.courseRigor !== undefined
            ? updates.academic.courseRigor
              ? normalizeText(updates.academic.courseRigor)
              : null
            : current.academic.courseRigor
      }
    : current.academic;

  const nextActivities = updates.activities !== undefined ? updates.activities : current.activities;
  const nextRankedActivities = reorderRankedActivities(nextActivities, nextActivities.map((activity) => activity.id));

  return {
    academic: nextAcademic,
    activities: nextRankedActivities,
    rankedActivities: nextRankedActivities,
    essays: updates.essays !== undefined ? updates.essays : current.essays,
    collegeChances: updates.collegeChances !== undefined ? updates.collegeChances : current.collegeChances
  };
}

function profileToFirestorePatch(updates: ProfilePatch, current: ProfileSummaryState) {
  const patch: Record<string, unknown> = {};

  if (updates.academic) {
    const mergedAcademic = {
      ...current.academic,
      ...updates.academic
    };

    patch.gpa = toFiniteNumber(mergedAcademic.weightedGpa);

    if (mergedAcademic.testType === "SAT") {
      patch.sat = toFiniteNumber(mergedAcademic.testScore);
      patch.act = null;
    } else if (mergedAcademic.testType === "ACT") {
      patch.act = toFiniteNumber(mergedAcademic.testScore);
      patch.sat = null;
    } else if (updates.academic.testType !== undefined || updates.academic.testScore !== undefined) {
      patch.sat = null;
      patch.act = null;
    }

    if (updates.academic.courseRigor !== undefined) {
      patch.courseRigor = updates.academic.courseRigor ? normalizeText(updates.academic.courseRigor) : null;
    }
  }

  if (updates.activities !== undefined) {
    patch.activities = updates.activities;
  }

  if (updates.essays !== undefined) {
    patch.essays = updates.essays;
  }

  if (updates.collegeChances !== undefined) {
    patch.collegeChances = updates.collegeChances;
  }

  return patch;
}

function parseFirestoreProfile(raw: unknown): ProfileSummaryState {
  const data = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const satScore = typeof data.sat === "number" && Number.isFinite(data.sat) ? Number(data.sat) : null;
  const actScore = typeof data.act === "number" && Number.isFinite(data.act) ? Number(data.act) : null;
  const testType: TestType | null = satScore !== null ? "SAT" : actScore !== null ? "ACT" : null;
  const testScore = satScore ?? actScore;

  const parsedActivities = Array.isArray(data.activities)
    ? data.activities
        .filter((item): item is RankedActivitySummaryItem => Boolean(item && typeof item === "object"))
        .map((item) => ({
          id: typeof item.id === "string" ? item.id : buildId(),
          activityName: normalizeText(String(item.activityName || "")),
          role: normalizeText(String(item.role || "")),
          organizationName: normalizeText(String(item.organizationName || "")),
          hoursPerWeek: Number.isFinite(item.hoursPerWeek) ? Number(item.hoursPerWeek) : 0,
          weeksPerYear: Number.isFinite(item.weeksPerYear) ? Number(item.weeksPerYear) : 0,
          description: normalizeText(String(item.description || "")),
          commonAppDescription: normalizeText(String(item.commonAppDescription || "")),
          category: normalizeCategory(String(item.category || "")),
          improvedPhrasing: normalizeText(String(item.improvedPhrasing || "")),
          createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
          rankScore: Number.isFinite(item.rankScore) ? Number(item.rankScore) : 0,
          rankPosition: Number.isFinite(item.rankPosition) ? Number(item.rankPosition) : 1,
          rankLabel: typeof item.rankLabel === "string" ? item.rankLabel : "Activity"
        }))
        .filter((item) => item.activityName.length > 0)
        .slice(0, 10)
    : [];

  const rankedActivities = reorderRankedActivities(parsedActivities, parsedActivities.map((item) => item.id));

  const essays = Array.isArray(data.essays)
    ? data.essays
        .filter((item): item is EssaySummaryItem => Boolean(item && typeof item === "object"))
        .map((item) => ({
          id: typeof item.id === "string" ? item.id : buildId(),
          topic: normalizeText(String(item.topic || "")),
          createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString()
        }))
        .filter((item) => item.topic.length > 0)
        .slice(0, 20)
    : [];

  const collegeChances = Array.isArray(data.collegeChances)
    ? data.collegeChances
        .filter((item): item is CollegeChanceSummaryItem => Boolean(item && typeof item === "object"))
        .map((item) => {
          const status = item.status === "Reach" || item.status === "Target" || item.status === "Safety" ? item.status : "Target";

          return {
            school: normalizeText(String(item.school || "")),
            status,
            category:
              item.category === "reach" || item.category === "match" || item.category === "safety"
                ? item.category
                : normalizeCollegeChanceCategory(status),
            score: Number.isFinite(item.score) ? Number(item.score) : estimateCollegeChanceScore(status),
            explanation: normalizeText(String(item.explanation || "")),
            createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString()
          };
        })
        .filter((item) => item.school.length > 0)
    : [];

  return {
    academic: {
      weightedGpa: typeof data.gpa === "number" && Number.isFinite(data.gpa) ? Number(data.gpa) : null,
      testType,
      testScore,
      courseRigor: typeof data.courseRigor === "string" && data.courseRigor.trim() ? normalizeText(data.courseRigor) : null
    },
    activities: rankedActivities,
    rankedActivities,
    essays,
    collegeChances
  };
}

function toFirestoreDefaultProfile(profile: ProfileSummaryState): FirestoreProfile {
  const testScore = toFiniteNumber(profile.academic.testScore);

  return {
    gpa: toFiniteNumber(profile.academic.weightedGpa),
    sat: profile.academic.testType === "SAT" ? testScore : null,
    act: profile.academic.testType === "ACT" ? testScore : null,
    courseRigor: profile.academic.courseRigor ? normalizeText(profile.academic.courseRigor) : null,
    activities: profile.activities,
    essays: profile.essays,
    collegeChances: profile.collegeChances
  };
}

export function ProfileSummaryProvider({ children }: { children: React.ReactNode }) {
  const { isGuest, loading: authLoading, user } = useAuth();
  const [profile, setProfile] = useState<ProfileSummaryState>(defaultProfile);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSyncError, setProfileSyncError] = useState<string | null>(null);
  const profileRef = useRef<ProfileSummaryState>(defaultProfile);
  const pendingWriteRef = useRef<Record<string, unknown> | null>(null);
  const writeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPendingWrites = useCallback(() => {
    if (writeTimeoutRef.current) {
      clearTimeout(writeTimeoutRef.current);
      writeTimeoutRef.current = null;
    }

    pendingWriteRef.current = null;
    setProfileSaving(false);
  }, []);

  const setProfileState = useCallback((nextProfile: ProfileSummaryState) => {
    profileRef.current = nextProfile;
    setProfile(nextProfile);
  }, []);

  const clearPendingWriteRefs = useCallback(() => {
    if (writeTimeoutRef.current) {
      clearTimeout(writeTimeoutRef.current);
      writeTimeoutRef.current = null;
    }

    pendingWriteRef.current = null;
  }, []);

  const flushPendingWrite = useCallback(async () => {
    if (!user || isGuest || !db) {
      clearPendingWrites();
      return;
    }

    const pendingPatch = pendingWriteRef.current;
    if (!pendingPatch || Object.keys(pendingPatch).length === 0) {
      clearPendingWrites();
      return;
    }

    pendingWriteRef.current = null;

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        ...pendingPatch,
        updatedAt: serverTimestamp()
      });
      setProfileSyncError(null);
    } catch (error) {
      console.error("Failed to sync profile update to Firestore", error);
      setProfileSyncError("Unable to sync profile right now. Retrying...");
      pendingWriteRef.current = {
        ...(pendingWriteRef.current || {}),
        ...pendingPatch
      };
    } finally {
      if (!pendingWriteRef.current || Object.keys(pendingWriteRef.current).length === 0) {
        setProfileSaving(false);
      }
    }
  }, [clearPendingWrites, isGuest, user]);

  const queueFirestoreSave = useCallback(
    (patch: Record<string, unknown>) => {
      if (!user || isGuest || !db || !Object.keys(patch).length) {
        return;
      }

      pendingWriteRef.current = {
        ...(pendingWriteRef.current || {}),
        ...patch
      };

      setProfileSyncError(null);
      setProfileSaving(true);

      if (writeTimeoutRef.current) {
        clearTimeout(writeTimeoutRef.current);
      }

      writeTimeoutRef.current = setTimeout(() => {
        void flushPendingWrite();
      }, AUTOSAVE_DEBOUNCE_MS);
    },
    [flushPendingWrite, isGuest, user]
  );

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user || isGuest || !db) {
      clearPendingWriteRefs();

      queueMicrotask(() => {
        setProfileSaving(false);
        setProfileSyncError(null);
        setProfileState(defaultProfile);
        setProfileLoading(false);
      });

      return;
    }

    const currentUser = user;

    let cancelled = false;

    async function loadProfile() {
      setProfileLoading(true);
      const userRef = doc(db, "users", currentUser.uid);

      try {
        const snapshot = await getDoc(userRef);

        if (cancelled) {
          return;
        }

        if (!snapshot.exists()) {
          const defaultFirestoreProfile = toFirestoreDefaultProfile(defaultProfile);
          await setDoc(userRef, {
            ...defaultFirestoreProfile,
            updatedAt: serverTimestamp()
          });

          if (!cancelled) {
            setProfileSyncError(null);
            setProfileState(defaultProfile);
          }
        } else {
          setProfileSyncError(null);
          setProfileState(parseFirestoreProfile(snapshot.data()));
        }
      } catch (error) {
        console.error("Failed to load profile from Firestore", error);
        if (!cancelled) {
          setProfileSyncError("Unable to load your saved profile. Using local defaults.");
          setProfileState(defaultProfile);
        }
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [authLoading, clearPendingWriteRefs, isGuest, setProfileState, user]);

  useEffect(() => {
    return () => {
      clearPendingWriteRefs();
    };
  }, [clearPendingWriteRefs]);

  const saveUserProfile = useCallback(
    async (updates: ProfilePatch) => {
      const currentProfile = profileRef.current;
      const nextProfile = mergeProfile(currentProfile, updates);
      const firestorePatch = profileToFirestorePatch(updates, currentProfile);

      setProfileState(nextProfile);

      if (isGuest || !user || authLoading) {
        return;
      }

      if (!hasMeaningfulProfileData(nextProfile)) {
        return;
      }

      queueFirestoreSave(firestorePatch);
    },
    [authLoading, isGuest, queueFirestoreSave, setProfileState, user]
  );

  const clearProfile = useCallback(() => {
    clearPendingWrites();
    setProfileSyncError(null);
    setProfileState(defaultProfile);
  }, [clearPendingWrites, setProfileState]);

  const recordAcademicSnapshot = useCallback(
    (snapshot: AcademicSnapshot) => {
      const nextWeightedGpa = snapshot.weightedGpa === null ? null : toFiniteNumber(snapshot.weightedGpa);
      const nextTestScore = snapshot.testScore === null ? null : toFiniteNumber(snapshot.testScore);
      const nextCourseRigor = snapshot.courseRigor ? normalizeText(snapshot.courseRigor) : null;

      void saveUserProfile({
        academic: {
          weightedGpa: nextWeightedGpa,
          testType: snapshot.testType,
          testScore: nextTestScore,
          courseRigor: nextCourseRigor
        }
      });
    },
    [saveUserProfile]
  );

  const addActivity = useCallback(
    (activity: AddActivityInput) => {
      const normalizedActivity = normalizeActivity(activity);

      if (!normalizedActivity.activityName || !normalizedActivity.commonAppDescription || !normalizedActivity.improvedPhrasing) {
        return;
      }

      const nextActivities = [
        normalizedActivity,
        ...profile.activities.filter(
          (item) =>
            !(
              item.activityName.toLowerCase() === normalizedActivity.activityName.toLowerCase() &&
              item.role.toLowerCase() === normalizedActivity.role.toLowerCase() &&
              item.commonAppDescription.toLowerCase() === normalizedActivity.commonAppDescription.toLowerCase()
            )
        )
      ];
      const ranked = rankActivities(nextActivities);

      void saveUserProfile({ activities: ranked });
    },
    [profile.activities, saveUserProfile]
  );

  const replaceActivities = useCallback(
    (activities: RankedActivitySummaryItem[]) => {
      const trimmedActivities = activities.slice(0, 10);
      const reordered = reorderRankedActivities(trimmedActivities, trimmedActivities.map((activity) => activity.id));
      void saveUserProfile({ activities: reordered });
    },
    [saveUserProfile]
  );

  const reorderActivities = useCallback(
    (orderedIds: string[]) => {
      const reordered = reorderRankedActivities(profile.activities, orderedIds);
      void saveUserProfile({ activities: reordered });
    },
    [profile.activities, saveUserProfile]
  );

  const recordEssayIdeas = useCallback(
    (ideas: Array<{ topic: string }>) => {
      if (!ideas.length) {
        return;
      }

      const nextEssays = [
        ...ideas
          .map((idea) => ({
            id: buildId(),
            topic: normalizeText(idea.topic),
            createdAt: new Date().toISOString()
          }))
          .filter((idea) => idea.topic.length > 0),
        ...profile.essays
      ]
        .filter((idea, index, arr) => arr.findIndex((item) => item.topic.toLowerCase() === idea.topic.toLowerCase()) === index)
        .slice(0, 20);

      void saveUserProfile({ essays: nextEssays });
    },
    [profile.essays, saveUserProfile]
  );

  const recordCollegeChances = useCallback(
    (chances: Array<{ school: string; status: "Reach" | "Target" | "Safety"; explanation: string }>) => {
      const nextChances = chances
        .map((item) => ({
          school: normalizeText(item.school),
          status: item.status,
          category: normalizeCollegeChanceCategory(item.status),
          score: estimateCollegeChanceScore(item.status),
          explanation: normalizeText(item.explanation),
          createdAt: new Date().toISOString()
        }))
        .filter((item) => item.school.length > 0)
        .filter((item, index, arr) => arr.findIndex((entry) => entry.school.toLowerCase() === item.school.toLowerCase()) === index);

      void saveUserProfile({ collegeChances: nextChances });
    },
    [saveUserProfile]
  );

  const exportProfile = useCallback(() => {
    return JSON.stringify(
      {
        version: 1,
        profile
      },
      null,
      2
    );
  }, [profile]);

  const importProfile = useCallback(
    (raw: string) => {
      try {
        const parsed = JSON.parse(raw) as { profile?: Partial<ProfileSummaryState> };
        const importedProfile = parsed?.profile;

        if (!importedProfile || typeof importedProfile !== "object") {
          return "Invalid profile file.";
        }

        const academic = importedProfile.academic && typeof importedProfile.academic === "object" ? importedProfile.academic : defaultProfile.academic;

        const activities = Array.isArray(importedProfile.activities)
          ? importedProfile.activities
              .filter((item): item is RankedActivitySummaryItem => Boolean(item && typeof item === "object"))
              .map((item) => ({
                id: typeof item.id === "string" ? item.id : buildId(),
                activityName: normalizeText(String(item.activityName || "")),
                role: normalizeText(String(item.role || "")),
                organizationName: normalizeText(String(item.organizationName || "")),
                hoursPerWeek: Number.isFinite(item.hoursPerWeek) ? Number(item.hoursPerWeek) : 0,
                weeksPerYear: Number.isFinite(item.weeksPerYear) ? Number(item.weeksPerYear) : 0,
                description: normalizeText(String(item.description || "")),
                commonAppDescription: normalizeText(String(item.commonAppDescription || "")),
                category: normalizeCategory(String(item.category || "")),
                improvedPhrasing: normalizeText(String(item.improvedPhrasing || "")),
                createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
                rankScore: Number.isFinite(item.rankScore) ? Number(item.rankScore) : 0,
                rankPosition: Number.isFinite(item.rankPosition) ? Number(item.rankPosition) : 1,
                rankLabel: typeof item.rankLabel === "string" ? item.rankLabel : "Activity"
              }))
              .filter((item) => item.activityName.length > 0)
              .slice(0, 10)
          : [];

        const rerankedActivities = reorderRankedActivities(activities, activities.map((item) => item.id));

        const essays = Array.isArray(importedProfile.essays)
          ? importedProfile.essays
              .filter((item): item is EssaySummaryItem => Boolean(item && typeof item === "object"))
              .map((item) => ({
                id: typeof item.id === "string" ? item.id : buildId(),
                topic: normalizeText(String(item.topic || "")),
                createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString()
              }))
              .filter((item) => item.topic.length > 0)
              .slice(0, 20)
          : [];

        const collegeChances = Array.isArray(importedProfile.collegeChances)
          ? importedProfile.collegeChances
              .filter((item): item is CollegeChanceSummaryItem => Boolean(item && typeof item === "object"))
              .map((item) => {
                const status = item.status === "Reach" || item.status === "Target" || item.status === "Safety" ? item.status : "Target";

                return {
                  school: normalizeText(String(item.school || "")),
                  status,
                  category:
                    item.category === "reach" || item.category === "match" || item.category === "safety"
                      ? item.category
                      : normalizeCollegeChanceCategory(status),
                  score: Number.isFinite(item.score) ? Number(item.score) : estimateCollegeChanceScore(status),
                  explanation: normalizeText(String(item.explanation || "")),
                  createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString()
                };
              })
              .filter((item) => item.school.length > 0)
          : [];

        const nextAcademic: AcademicSnapshot = {
          weightedGpa: toFiniteNumber(academic.weightedGpa ?? null),
          testType: academic.testType === "ACT" || academic.testType === "SAT" ? academic.testType : null,
          testScore: toFiniteNumber(academic.testScore ?? null),
          courseRigor: academic.courseRigor ? normalizeText(String(academic.courseRigor)) : null
        };

        void saveUserProfile({
          academic: nextAcademic,
          activities: rerankedActivities,
          essays,
          collegeChances
        });

        return null;
      } catch {
        return "Could not import profile. Check the file format and try again.";
      }
    },
    [saveUserProfile]
  );

  const value = useMemo<ProfileSummaryContextValue>(
    () => ({
      profile,
      profileLoading,
      profileSaving,
      profileSyncError,
      saveUserProfile,
      clearProfile,
      recordAcademicSnapshot,
      addActivity,
      replaceActivities,
      reorderActivities,
      recordEssayIdeas,
      recordCollegeChances,
      exportProfile,
      importProfile
    }),
    [
      profile,
      profileLoading,
      profileSaving,
      profileSyncError,
      saveUserProfile,
      clearProfile,
      recordAcademicSnapshot,
      addActivity,
      replaceActivities,
      reorderActivities,
      recordEssayIdeas,
      recordCollegeChances,
      exportProfile,
      importProfile
    ]
  );

  return <ProfileSummaryContext.Provider value={value}>{children}</ProfileSummaryContext.Provider>;
}

export function useProfileSummary() {
  const context = useContext(ProfileSummaryContext);

  if (!context) {
    throw new Error("useProfileSummary must be used within ProfileSummaryProvider.");
  }

  return context;
}
