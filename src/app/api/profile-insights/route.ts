import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { checkRateLimit, createRequestId, getClientIp } from "@/lib/api";

type ProfileInsightsInput = {
  overallScore?: number;
  gpa?: number | null;
  testType?: "SAT" | "ACT" | null;
  testScore?: number | null;
  courseRigor?: string | null;
  activityCount?: number;
  hasLeadership?: boolean;
  essayCount?: number;
  collegeBalance?: {
    reach?: number;
    match?: number;
    safety?: number;
  };
};

type ProfileInsightsOutput = {
  strengths: string[];
  weaknesses: string[];
  nextSteps: string[];
};

function isPlaceholderValue(value: string | undefined) {
  if (!value) {
    return true;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.includes("your_key_here") || normalized.includes("your-") || normalized.includes("gsk_your");
}

function normalizeBulletList(value: unknown, minLength: number, maxLength: number) {
  if (!Array.isArray(value)) {
    return null;
  }

  const items = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (items.length < minLength || items.length > maxLength) {
    return null;
  }

  return items;
}

function parseInsights(content: string): ProfileInsightsOutput {
  const normalized = content.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "");
  const parsed = JSON.parse(normalized) as Record<string, unknown>;

  const strengths = normalizeBulletList(parsed.strengths, 2, 3);
  const weaknesses = normalizeBulletList(parsed.weaknesses, 2, 3);
  const nextSteps = normalizeBulletList(parsed.nextSteps, 3, 3);

  if (!strengths || !weaknesses || !nextSteps) {
    throw new Error("AI response must include strengths (2-3), weaknesses (2-3), and nextSteps (exactly 3).");
  }

  return {
    strengths,
    weaknesses,
    nextSteps
  };
}

function buildPrompt(input: Required<ProfileInsightsInput>) {
  return [
    "You are a college admissions readiness coach.",
    "Analyze the student's profile summary and provide concise, realistic advice.",
    "Use simple, student-friendly language.",
    "Avoid generic statements and avoid exaggeration.",
    "Each bullet must be exactly one sentence.",
    "Do not change or reinterpret the numeric score.",
    "Focus on recommendations that can improve future readiness outcomes.",
    "",
    "Student profile data:",
    `- Overall score: ${input.overallScore}/100`,
    `- GPA: ${input.gpa ?? "Not provided"}`,
    `- Test: ${input.testType ?? "Not provided"} ${input.testScore ?? ""}`.trim(),
    `- Course rigor: ${input.courseRigor || "Not provided"}`,
    `- Activity count: ${input.activityCount}`,
    `- Leadership present: ${input.hasLeadership ? "Yes" : "No"}`,
    `- Essay idea count: ${input.essayCount}`,
    `- College balance: Reach ${input.collegeBalance.reach}, Match ${input.collegeBalance.match}, Safety ${input.collegeBalance.safety}`,
    "",
    "Return ONLY valid JSON in this exact shape:",
    '{"strengths":["...","..."],"weaknesses":["...","..."],"nextSteps":["...","...","..."]}',
    "",
    "Constraints:",
    "- strengths: array of 2-3 concise bullet points",
    "- weaknesses: array of 2-3 concise bullet points",
    "- nextSteps: array of exactly 3 actionable steps"
  ].join("\n");
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`profile-insights:${ip}`, 20, 60_000);

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

  const body = (await request.json().catch(() => null)) as ProfileInsightsInput | null;
  if (!body) {
    return NextResponse.json({ error: "Request body is required.", requestId }, { status: 400, headers: { "x-request-id": requestId } });
  }

  const input: Required<ProfileInsightsInput> = {
    overallScore: typeof body.overallScore === "number" && Number.isFinite(body.overallScore) ? body.overallScore : 0,
    gpa: typeof body.gpa === "number" && Number.isFinite(body.gpa) ? body.gpa : null,
    testType: body.testType === "ACT" ? "ACT" : body.testType === "SAT" ? "SAT" : null,
    testScore: typeof body.testScore === "number" && Number.isFinite(body.testScore) ? body.testScore : null,
    courseRigor: typeof body.courseRigor === "string" ? body.courseRigor.trim() : null,
    activityCount: typeof body.activityCount === "number" && Number.isFinite(body.activityCount) ? body.activityCount : 0,
    hasLeadership: Boolean(body.hasLeadership),
    essayCount: typeof body.essayCount === "number" && Number.isFinite(body.essayCount) ? body.essayCount : 0,
    collegeBalance: {
      reach: typeof body.collegeBalance?.reach === "number" && Number.isFinite(body.collegeBalance.reach) ? body.collegeBalance.reach : 0,
      match: typeof body.collegeBalance?.match === "number" && Number.isFinite(body.collegeBalance.match) ? body.collegeBalance.match : 0,
      safety: typeof body.collegeBalance?.safety === "number" && Number.isFinite(body.collegeBalance.safety) ? body.collegeBalance.safety : 0
    }
  };

  try {
    const groq = new Groq({ apiKey });

    const completion = await groq.chat.completions.create({
      model,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a practical college admissions mentor. Provide realistic guidance in concise one-sentence bullets and strict JSON only."
        },
        {
          role: "user",
          content: buildPrompt(input)
        }
      ]
    });

    const content = completion.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "AI response was empty.", requestId }, { status: 502, headers: { "x-request-id": requestId } });
    }

    const insights = parseInsights(content);
    return NextResponse.json(insights, { headers: { "x-request-id": requestId } });
  } catch (generationError) {
    const message = generationError instanceof Error ? generationError.message : "Failed to generate insights.";
    return NextResponse.json({ error: message, requestId }, { status: 502, headers: { "x-request-id": requestId } });
  }
}
