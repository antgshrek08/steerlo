import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { checkRateLimit, createRequestId, getClientIp } from "@/lib/api";

type ActivityInput = {
  activityName?: string;
  role?: string;
  organizationName?: string;
  hoursPerWeek?: string;
  weeksPerYear?: string;
  description?: string;
};

type ActivityBuilderInput = {
  activities?: ActivityInput[];
  activityName?: string;
  role?: string;
  organizationName?: string;
  hoursPerWeek?: string;
  weeksPerYear?: string;
  description?: string;
};

type ActivityBuilderResult = {
  commonAppDescription: string;
  impactSuggestions: string;
  category: "Leadership" | "Service" | "Work" | "Academic" | "Hobby";
  improvedPhrasing: string;
};

type ActivityBuilderResponse = {
  activitiesResults: ActivityBuilderResult[];
};

function isPlaceholderValue(value: string | undefined) {
  if (!value) {
    return true;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.includes("your_key_here") || normalized.includes("your-") || normalized.includes("gsk_your");
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function extractActivities(body: ActivityBuilderInput) {
  if (Array.isArray(body.activities) && body.activities.length > 0) {
    const trimmed = body.activities.slice(0, 5).map((activity) => ({
      activityName: normalizeText(activity.activityName),
      role: normalizeText(activity.role),
      organizationName: normalizeText(activity.organizationName),
      hoursPerWeek: normalizeText(activity.hoursPerWeek),
      weeksPerYear: normalizeText(activity.weeksPerYear),
      description: normalizeText(activity.description)
    }));

    if (trimmed.some((activity) => !activity.activityName || !activity.role || !activity.hoursPerWeek || !activity.weeksPerYear || !activity.description)) {
      return null;
    }

    return trimmed;
  }

  const singleActivity = {
    activityName: normalizeText(body.activityName),
    role: normalizeText(body.role),
    organizationName: normalizeText(body.organizationName),
    hoursPerWeek: normalizeText(body.hoursPerWeek),
    weeksPerYear: normalizeText(body.weeksPerYear),
    description: normalizeText(body.description)
  };

  if (!singleActivity.activityName || !singleActivity.role || !singleActivity.hoursPerWeek || !singleActivity.weeksPerYear || !singleActivity.description) {
    return null;
  }

  return [singleActivity];
}

function buildPrompt(activities: Array<{ activityName: string; role: string; organizationName: string; hoursPerWeek: string; weeksPerYear: string; description: string }>) {
  return [
    "You are an expert college admissions consultant helping students present extracurricular activities effectively.",
    "Analyze each student activity individually and provide structured improvements.",
    "Use simple, student-friendly language.",
    "Avoid generic statements and avoid exaggeration.",
    "Each bullet or sentence should be concise and application-appropriate.",
    "",
    "You must respond with valid JSON containing exactly these keys:",
    "- activitiesResults (array of objects)",
    "Each object must contain exactly these keys:",
    "- commonAppDescription (string): concise, action-based Common App activity description in 1-2 lines.",
    "- impactSuggestions (string): specific suggestions on how to strengthen the activity description.",
    "- category (one of: Leadership, Service, Work, Academic, Hobby).",
    "- improvedPhrasing (string): stronger but truthful wording of the original description.",
    "Do not omit any field or leave any field empty.",
    "Return one result for each activity in the same order provided.",
    "",
    "Return ONLY valid JSON in this exact shape:",
    '{"activitiesResults":[{"commonAppDescription":"...","impactSuggestions":"...","category":"Leadership|Service|Work|Academic|Hobby","improvedPhrasing":"..."}]}',
    "",
    "Activities:",
    ...activities.map(
      (activity, index) =>
        `Activity ${index + 1}: Name: ${activity.activityName}; Role: ${activity.role}; Organization: ${activity.organizationName || "N/A"}; Hours/week: ${activity.hoursPerWeek}; Weeks/year: ${activity.weeksPerYear}; Description: ${activity.description}`
    )
  ].join("\n");
}

function normalizeCategory(value: string): ActivityBuilderResult["category"] | null {
  const normalized = value.trim().toLowerCase();

  if (normalized.includes("lead")) {
    return "Leadership";
  }

  if (normalized.includes("service") || normalized.includes("volunteer")) {
    return "Service";
  }

  if (normalized.includes("work") || normalized.includes("employment") || normalized.includes("job")) {
    return "Work";
  }

  if (normalized.includes("academic") || normalized.includes("research") || normalized.includes("study")) {
    return "Academic";
  }

  if (normalized.includes("hobby") || normalized.includes("personal") || normalized.includes("project")) {
    return "Hobby";
  }

  return null;
}

function parseResults(content: string, expectedCount: number): ActivityBuilderResponse {
  const normalized = content.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "");
  const parsed = JSON.parse(normalized) as unknown;

  let items: unknown[] | null = null;
  if (Array.isArray(parsed)) {
    items = parsed;
  } else if (parsed && typeof parsed === "object") {
    const record = parsed as Record<string, unknown>;
    if (Array.isArray(record.activitiesResults)) {
      items = record.activitiesResults;
    }
  }

  if (!items) {
    throw new Error("AI response must include an activitiesResults array.");
  }

  if (items.length !== expectedCount) {
    throw new Error("AI response must include one result for each activity in the same order.");
  }

  const activitiesResults = items.map((item) => {
    if (!item || typeof item !== "object") {
      throw new Error("Each activity result must be an object.");
    }

    const record = item as Record<string, unknown>;
    const commonAppDescription = normalizeText(record.commonAppDescription);
    const impactSuggestions = normalizeText(record.impactSuggestions);
    const category = typeof record.category === "string" ? normalizeCategory(record.category) : null;
    const improvedPhrasing = normalizeText(record.improvedPhrasing);

    if (!commonAppDescription || !impactSuggestions || !category || !improvedPhrasing) {
      throw new Error("Each activity result must include non-empty commonAppDescription, impactSuggestions, category, and improvedPhrasing fields.");
    }

    return {
      commonAppDescription,
      impactSuggestions,
      category,
      improvedPhrasing
    } satisfies ActivityBuilderResult;
  });

  return { activitiesResults };
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`activity-builder:${ip}`, 20, 60_000);

  if (!rateLimit.ok) {
    return NextResponse.json(
      {
        error: "Too many requests. Please try again in a moment.",
        requestId
      },
      {
        status: 429,
        headers: {
          "x-request-id": requestId,
          "retry-after": String(Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000)))
        }
      }
    );
  }

  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

  if (isPlaceholderValue(apiKey)) {
    return NextResponse.json(
      {
        error: "GROQ_API_KEY is missing or still set to a placeholder. Add a real key in .env.local.",
        requestId
      },
      { status: 500, headers: { "x-request-id": requestId } }
    );
  }

  const body = (await request.json().catch(() => null)) as ActivityBuilderInput | null;
  if (!body) {
    return NextResponse.json({ error: "Request body is required.", requestId }, { status: 400, headers: { "x-request-id": requestId } });
  }

  const activities = extractActivities(body);
  if (!activities || !activities.length) {
    return NextResponse.json(
      {
        error: "Provide between 1 and 5 complete activities before generating results.",
        requestId
      },
      { status: 400, headers: { "x-request-id": requestId } }
    );
  }

  if (activities.length > 5) {
    return NextResponse.json(
      {
        error: "You can submit up to 5 activities at a time.",
        requestId
      },
      { status: 400, headers: { "x-request-id": requestId } }
    );
  }

  try {
    const groq = new Groq({ apiKey });

    const completion = await groq.chat.completions.create({
      model,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a helpful college admissions consultant. Provide honest, constructive feedback on student activities without exaggeration. Return strict JSON only."
        },
        {
          role: "user",
          content: buildPrompt(activities)
        }
      ]
    });

    const content = completion.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "AI response was empty.", requestId }, { status: 502, headers: { "x-request-id": requestId } });
    }

    const result = parseResults(content, activities.length);
    return NextResponse.json(result, { headers: { "x-request-id": requestId } });
  } catch (generationError) {
    const message = generationError instanceof Error ? generationError.message : "Failed to analyze activity.";
    return NextResponse.json({ error: message, requestId }, { status: 502, headers: { "x-request-id": requestId } });
  }
}
