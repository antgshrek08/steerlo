import type { ProfileSummaryState } from "@/components/profile/ProfileSummaryProvider";

export type ProfileReadinessBreakdown = {
  academics: number;
  activities: number;
  essays: number;
  collegeAlignment: number;
  total: number;
};

export type ProfileReadinessTier = "Strong Profile" | "Competitive" | "Developing" | "Needs Improvement";

function toSafeNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeText(value: string | null | undefined) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function countCollegeStatuses(profile: ProfileSummaryState) {
  return profile.collegeChances.reduce(
    (acc, item) => {
      if (item.status === "Reach") {
        acc.reach += 1;
      } else if (item.status === "Target") {
        acc.target += 1;
      } else if (item.status === "Safety") {
        acc.safety += 1;
      }

      return acc;
    },
    { reach: 0, target: 0, safety: 0 }
  );
}

export function hasMeaningfulProfileData(profile: ProfileSummaryState) {
  const academic = profile.academic;
  const hasAcademicData = academic.weightedGpa !== null || academic.testScore !== null;

  return hasAcademicData || profile.activities.length > 0 || profile.essays.length > 0 || profile.collegeChances.length > 0;
}

function getAcademicScore(profile: ProfileSummaryState) {
  const academic = profile.academic;
  let score = 0;

  const gpa = toSafeNumber(academic.weightedGpa);
  if (gpa !== null) {
    if (gpa >= 4.0) {
      score += 25;
    } else if (gpa >= 3.7) {
      score += 20;
    } else if (gpa >= 3.3) {
      score += 15;
    } else {
      score += 10;
    }
  }

  const testScore = toSafeNumber(academic.testScore);
  if (testScore !== null) {
    if (academic.testType === "SAT" && testScore >= 1400) {
      score += 10;
    } else if (academic.testType === "SAT" && testScore >= 1200) {
      score += 7;
    } else if (academic.testType === "SAT" && testScore >= 1000) {
      score += 5;
    } else if (academic.testType === "ACT" && testScore >= 32) {
      score += 10;
    } else if (academic.testType === "ACT" && testScore >= 27) {
      score += 7;
    } else if (academic.testType === "ACT" && testScore >= 20) {
      score += 5;
    }
  }

  const rigor = normalizeText(academic.courseRigor);
  if (rigor.includes("most rigorous") || rigor.includes("graduating with aa")) {
    score += 5;
  } else if (rigor.includes("rigorous") || rigor.includes("moderate")) {
    score += 3;
  } else if (rigor) {
    score += 1;
  }

  return Math.min(40, score);
}

function getActivitiesScore(profile: ProfileSummaryState) {
  if (!profile.activities.length) {
    return 0;
  }

  let score = 0;
  const activityCount = profile.activities.length;

  if (activityCount >= 6) {
    score += 10;
  } else if (activityCount >= 3) {
    score += 7;
  } else {
    score += 4;
  }

  const hasLeadership = profile.activities.some((activity) => normalizeText(activity.category).includes("lead") || normalizeText(activity.role).includes("lead") || normalizeText(activity.role).includes("captain") || normalizeText(activity.role).includes("president") || normalizeText(activity.role).includes("founder"));
  score += hasLeadership ? 10 : 3;

  const totalCommitment = profile.activities.reduce((sum, activity) => sum + activity.hoursPerWeek * activity.weeksPerYear, 0);
  if (totalCommitment >= 250) {
    score += 10;
  } else if (totalCommitment >= 100) {
    score += 8;
  } else {
    score += 5;
  }

  return Math.min(30, score);
}

function getEssaysScore(profile: ProfileSummaryState) {
  const count = profile.essays.length;

  if (count >= 5) {
    return 20;
  }

  if (count >= 3) {
    return 15;
  }

  if (count >= 1) {
    return 10;
  }

  return 0;
}

function getCollegeAlignmentScore(profile: ProfileSummaryState) {
  const counts = countCollegeStatuses(profile);
  if (counts.reach > 0 && counts.target > 0 && counts.safety > 0) {
    return 10;
  }

  if (counts.reach > 0 || counts.target > 0 || counts.safety > 0) {
    return 5;
  }

  return 0;
}

export function getProfileReadinessBreakdown(profile: ProfileSummaryState): ProfileReadinessBreakdown | null {
  if (!hasMeaningfulProfileData(profile)) {
    return null;
  }

  const academics = getAcademicScore(profile);
  const activities = getActivitiesScore(profile);
  const essays = getEssaysScore(profile);
  const collegeAlignment = getCollegeAlignmentScore(profile);
  const total = Math.min(100, academics + activities + essays + collegeAlignment);

  return {
    academics,
    activities,
    essays,
    collegeAlignment,
    total
  };
}

export function getProfileReadinessTier(score: number): ProfileReadinessTier {
  if (score >= 85) {
    return "Strong Profile";
  }

  if (score >= 70) {
    return "Competitive";
  }

  if (score >= 50) {
    return "Developing";
  }

  return "Needs Improvement";
}

export function getProfileReadinessColor(score: number) {
  if (score >= 85) {
    return {
      ring: "from-emerald-400/90 to-emerald-500/80",
      text: "text-emerald-100",
      accent: "border-emerald-300/30 bg-emerald-500/10"
    };
  }

  if (score >= 70) {
    return {
      ring: "from-yellow-300/90 to-amber-400/85",
      text: "text-yellow-100",
      accent: "border-yellow-300/30 bg-yellow-500/10"
    };
  }

  if (score >= 50) {
    return {
      ring: "from-orange-300/90 to-orange-500/85",
      text: "text-orange-100",
      accent: "border-orange-300/30 bg-orange-500/10"
    };
  }

  return {
    ring: "from-rose-400/90 to-red-500/80",
    text: "text-rose-100",
    accent: "border-rose-300/30 bg-rose-500/10"
  };
}
