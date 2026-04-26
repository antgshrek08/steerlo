type RankedActivityBase = {
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

export type RankedActivity<T extends RankedActivityBase = RankedActivityBase> = T & {
  rankScore: number;
  rankPosition: number;
  rankLabel: string;
};

const leadershipKeywords = [
  "lead",
  "led",
  "captain",
  "president",
  "founder",
  "cofounder",
  "chair",
  "director",
  "manager",
  "coordinator",
  "organizer",
  "supervisor",
  "mentor",
  "head"
];

const actionKeywords = [
  "led",
  "organized",
  "managed",
  "founded",
  "created",
  "built",
  "launched",
  "designed",
  "developed",
  "coordinated",
  "mentored",
  "tutored",
  "coached",
  "raised",
  "improved",
  "increased",
  "reduced",
  "presented",
  "advocated",
  "researched",
  "published",
  "volunteered",
  "served"
];

const impactKeywords = [
  "impact",
  "improved",
  "increase",
  "increased",
  "growth",
  "grew",
  "expanded",
  "raised",
  "reduced",
  "saved",
  "served",
  "supported",
  "trained",
  "awarded",
  "recognized",
  "led",
  "mentored",
  "organized",
  "built",
  "launched"
];

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countKeywordMatches(text: string, keywords: string[]) {
  return keywords.reduce((total, keyword) => {
    const pattern = new RegExp(`\\b${escapeRegExp(keyword)}\\b`, "i");
    return pattern.test(text) ? total + 1 : total;
  }, 0);
}

function getCategoryScore(category: string) {
  const normalized = normalizeText(category);

  if (normalized.includes("lead")) {
    return 20;
  }

  if (normalized.includes("academic")) {
    return 16;
  }

  if (normalized.includes("service")) {
    return 12;
  }

  if (normalized.includes("work")) {
    return 8;
  }

  return 4;
}

function getLeadershipScore(activity: RankedActivityBase) {
  const text = [activity.role, activity.description, activity.commonAppDescription, activity.improvedPhrasing].join(" ");
  let score = 0;

  if (normalizeText(activity.category).includes("lead")) {
    score += 20;
  }

  score += Math.min(12, countKeywordMatches(text, leadershipKeywords) * 2);
  score += Math.min(8, countKeywordMatches(text, ["led", "managed", "organized", "coordinated", "founded", "built", "directed"]) * 2);

  return Math.min(40, score);
}

function getCommitmentScore(activity: RankedActivityBase) {
  const commitment = Math.max(0, activity.hoursPerWeek * activity.weeksPerYear);

  if (commitment >= 500) {
    return 20;
  }

  if (commitment >= 300) {
    return 18;
  }

  if (commitment >= 180) {
    return 15;
  }

  if (commitment >= 100) {
    return 12;
  }

  if (commitment >= 60) {
    return 9;
  }

  if (commitment >= 24) {
    return 6;
  }

  if (commitment > 0) {
    return 3;
  }

  return 0;
}

function getDescriptionStrengthScore(activity: RankedActivityBase) {
  const text = [activity.description, activity.commonAppDescription, activity.improvedPhrasing].join(" ");
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  let score = 0;

  score += Math.min(10, countKeywordMatches(text, actionKeywords));
  score += Math.min(8, countKeywordMatches(text, impactKeywords) * 2);

  if (/[0-9]/.test(text) || /%|percent|students|members|participants|dollars|hours|hours per week/i.test(text)) {
    score += 2;
  }

  if (wordCount >= 25) {
    score += 3;
  } else if (wordCount >= 15) {
    score += 2;
  } else if (wordCount >= 8) {
    score += 1;
  }

  return Math.min(20, score);
}

function getRankLabel(rankPosition: number) {
  if (rankPosition === 1) {
    return "Most Impactful";
  }

  if (rankPosition === 2) {
    return "Strong Activity";
  }

  if (rankPosition === 3) {
    return "Good Activity";
  }

  if (rankPosition === 4) {
    return "Solid Activity";
  }

  if (rankPosition === 5) {
    return "Developing Activity";
  }

  return "Activity";
}

function getRankedActivityScore(activity: RankedActivityBase) {
  return getLeadershipScore(activity) + getCategoryScore(activity.category) + getCommitmentScore(activity) + getDescriptionStrengthScore(activity);
}

export function rankActivities<T extends RankedActivityBase>(activities: T[]) {
  const scoredActivities = activities.map((activity, index) => {
    const rankScore = getRankedActivityScore(activity);
    const commitment = activity.hoursPerWeek * activity.weeksPerYear;
    const descriptionStrength = getDescriptionStrengthScore(activity);

    return {
      ...activity,
      rankScore,
      commitment,
      descriptionStrength,
      originalIndex: index
    };
  });

  scoredActivities.sort((left, right) => {
    if (right.rankScore !== left.rankScore) {
      return right.rankScore - left.rankScore;
    }

    if (right.commitment !== left.commitment) {
      return right.commitment - left.commitment;
    }

    if (right.descriptionStrength !== left.descriptionStrength) {
      return right.descriptionStrength - left.descriptionStrength;
    }

    const nameComparison = left.activityName.localeCompare(right.activityName);
    if (nameComparison !== 0) {
      return nameComparison;
    }

    return left.originalIndex - right.originalIndex;
  });

  return scoredActivities.map((activity, index) => ({
    ...activity,
    rankPosition: index + 1,
    rankLabel: getRankLabel(index + 1)
  })) as Array<RankedActivity<T>>;
}

export function getRankBadgeText(rankPosition: number) {
  return `#${rankPosition} ${getRankLabel(rankPosition)}`;
}

export function trimActivityDescription(value: string, maxLength = 150) {
  const normalized = value.trim().replace(/\s+/g, " ");

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function reorderRankedActivities<T extends { id: string; rankScore: number; rankPosition: number; rankLabel: string }>(activities: T[], orderedIds: string[]) {
  const activityById = new Map(activities.map((activity) => [activity.id, activity] as const));
  const seen = new Set<string>();

  const reordered = orderedIds
    .map((id) => {
      const activity = activityById.get(id);
      if (!activity) {
        return null;
      }

      seen.add(id);
      return activity;
    })
    .filter((activity): activity is T => activity !== null);

  const remaining = activities.filter((activity) => !seen.has(activity.id));

  return [...reordered, ...remaining].map((activity, index) => ({
    ...activity,
    rankPosition: index + 1,
    rankLabel: getRankLabel(index + 1)
  }));
}
