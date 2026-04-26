import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { colleges, collegesById } from "@/lib/colleges";

type ChanceStatus = "Reach" | "Target" | "Safety";

type CollegeChanceInput = {
  gpa?: string;
  testType?: "SAT" | "ACT";
  testScore?: string;
  courseRigor?: string;
  intendedMajor?: string;
  collegeIds?: string[];
  collegeSlugs?: string[];
  schools?: string[];
};

type CollegeChanceResult = {
  school: string;
  status: ChanceStatus;
  explanation: string;
};

type RigorInfo = {
  normalizedLabel: string;
  rigorScore: number;
};

type CanonicalRigor =
  | "Graduating with AA"
  | "Most Rigorous (AP/IB/AICE/DE)"
  | "Rigorous"
  | "Moderate"
  | "Standard";

const fallbackWeightedGpa = 3.5;
const fallbackSatScore = 1050;
const fallbackActScore = 22;

const allowedSchoolNames = colleges.map((college) => college.name);

function isPlaceholderValue(value: string | undefined) {
  if (!value) {
    return true;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.includes("your_key_here") || normalized.includes("your-") || normalized.includes("gsk_your");
}

function buildPrompt(input: Required<Pick<CollegeChanceInput, "gpa" | "testType" | "testScore" | "courseRigor" | "intendedMajor">> & { schools: string[] }) {
  const normalizedRigor = normalizeCourseRigor(input.courseRigor);
  const rigorInfo = getRigorInfo(normalizedRigor);
  const satEquivalentScore = convertToSatEquivalent(input.testType, Number(input.testScore));

  return [
    "You are a college admissions advisor.",
    "Based on the following student profile:",
    `- Weighted GPA: ${input.gpa}`,
    `- Test Score: ${input.testType} ${input.testScore}`,
    `- SAT Equivalent Score: ${satEquivalentScore}`,
    `- Course Rigor: ${rigorInfo.normalizedLabel}`,
    `- Course Rigor Score (1-5): ${rigorInfo.rigorScore}`,
    `- Intended Major: ${input.intendedMajor || "Undeclared"}`,
    "",
    "For each of these colleges:",
    ...input.schools.map((school) => `- ${school}`),
    "",
    "When course rigor is 'Graduating with AA', treat it as strong college-level preparation and factor that meaningfully into recommendations.",
    "When rigor includes DE (Dual Enrollment), factor this as advanced college-level coursework.",
    "Classify the student's chances as Reach, Target, or Safety.",
    "Then provide a short explanation (1-2 sentences).",
    "Be realistic and avoid exact percentages.",
    "Return ONLY valid JSON in this format:",
    "{\"results\":[{\"school\":\"...\",\"status\":\"Reach | Target | Safety\",\"explanation\":\"...\"}]}",
    "Output one result for each college in the same order."
  ].join("\n");
}

function getRigorInfo(rawValue: string): RigorInfo {
  const normalized = rawValue.trim().toLowerCase();

  if (normalized.includes("aa") || normalized.includes("associate")) {
    return {
      normalizedLabel: "Graduating with AA",
      rigorScore: 5
    };
  }

  if (
    normalized.includes("most rigorous") ||
    normalized.includes("ap") ||
    normalized.includes("ib") ||
    normalized.includes("aice") ||
    normalized.includes("de") ||
    normalized.includes("dual enrollment")
  ) {
    return {
      normalizedLabel: "Most Rigorous (AP/IB/AICE/DE)",
      rigorScore: 4
    };
  }

  if (normalized.includes("rigorous")) {
    return {
      normalizedLabel: "Rigorous",
      rigorScore: 3
    };
  }

  if (normalized.includes("moderate")) {
    return {
      normalizedLabel: "Moderate",
      rigorScore: 2
    };
  }

  return {
    normalizedLabel: "Standard",
    rigorScore: 1
  };
}

function normalizeCourseRigor(rawValue: string): CanonicalRigor {
  const normalized = rawValue.trim().toLowerCase();

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

  return "Standard";
}

function normalizeWeightedGpa(rawValue: string) {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  if (parsed < 0 || parsed > 6) {
    return null;
  }

  return Math.round(parsed * 100) / 100;
}

function normalizeTestScore(rawValue: string, testType: "SAT" | "ACT") {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  if (testType === "SAT") {
    if (parsed < 400 || parsed > 1600) {
      return null;
    }

    return Math.round(parsed);
  }

  if (parsed < 1 || parsed > 36) {
    return null;
  }

  return Math.round(parsed);
}

function convertToSatEquivalent(testType: "SAT" | "ACT", testScore: number) {
  if (testType === "SAT") {
    return testScore;
  }

  return Math.round(400 + ((testScore - 1) / 35) * 1200);
}

function parseResults(content: string, schools: string[]) {
  const normalized = content.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "");
  const parsed = JSON.parse(normalized) as { results?: unknown };

  if (!parsed || !Array.isArray(parsed.results)) {
    throw new Error("AI response must include a results array.");
  }

  if (parsed.results.length !== schools.length) {
    throw new Error("AI response must include one result for each selected school.");
  }

  const validStatuses: ChanceStatus[] = ["Reach", "Target", "Safety"];

  const results = parsed.results.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error("Each college result must be an object.");
    }

    const record = item as Record<string, unknown>;
    const school = typeof record.school === "string" ? record.school.trim() : "";
    const status = typeof record.status === "string" ? record.status.trim() : "";
    const explanation = typeof record.explanation === "string" ? record.explanation.trim() : "";

    if (!school || !status || !explanation) {
      throw new Error("Each result must include non-empty school, status, and explanation fields.");
    }

    if (!validStatuses.includes(status as ChanceStatus)) {
      throw new Error("Status must be Reach, Target, or Safety.");
    }

    if (school !== schools[index]) {
      throw new Error("Each result school must match the selected schools in order.");
    }

    return {
      school,
      status: status as ChanceStatus,
      explanation
    } satisfies CollegeChanceResult;
  });

  return results;
}

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

  if (isPlaceholderValue(apiKey)) {
    return NextResponse.json(
      {
        error: "GROQ_API_KEY is missing or still set to a placeholder. Add a real key in .env.local."
      },
      { status: 500 }
    );
  }

  const body = (await request.json().catch(() => null)) as CollegeChanceInput | null;
  if (!body) {
    return NextResponse.json({ error: "Request body is required." }, { status: 400 });
  }

  const gpaRaw = body.gpa?.trim() || "";
  const testType = body.testType === "ACT" ? "ACT" : "SAT";
  const testScoreRaw = body.testScore?.trim() || "";
  const courseRigorRaw = body.courseRigor?.trim() || "";
  const courseRigor = courseRigorRaw ? normalizeCourseRigor(courseRigorRaw) : "Standard";
  const intendedMajor = body.intendedMajor?.trim() || "";

  const weightedGpa = normalizeWeightedGpa(gpaRaw) ?? fallbackWeightedGpa;
  const normalizedTestScore =
    normalizeTestScore(testScoreRaw, testType) ?? (testType === "SAT" ? fallbackSatScore : fallbackActScore);

  const selectedById = Array.isArray(body.collegeIds)
    ? body.collegeIds
        .filter((id): id is string => typeof id === "string")
        .map((id) => collegesById[id.trim()])
        .filter((college): college is (typeof colleges)[number] => Boolean(college))
        .map((college) => college.name)
    : [];

  const selectedBySlug = Array.isArray(body.collegeSlugs)
    ? body.collegeSlugs
        .filter((slug): slug is string => typeof slug === "string")
        .map((slug) => collegesById[slug.trim()])
        .filter((college): college is (typeof colleges)[number] => Boolean(college))
        .map((college) => college.name)
    : [];

  const selectedByName = Array.isArray(body.schools)
    ? body.schools
        .filter((school): school is string => typeof school === "string")
        .map((school) => school.trim())
        .filter((school) => allowedSchoolNames.includes(school))
    : [];

  const schools = selectedById.length ? selectedById : selectedBySlug.length ? selectedBySlug : selectedByName;

  if (!schools.length) {
    return NextResponse.json({ error: "Select at least one college." }, { status: 400 });
  }

  try {
    const groq = new Groq({ apiKey });

    const completion = await groq.chat.completions.create({
      model,
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a realistic college admissions advisor. Keep recommendations grounded, concise, and practical. Return valid JSON only."
        },
        {
          role: "user",
          content: buildPrompt({
            gpa: weightedGpa.toFixed(2),
            testType,
            testScore: String(normalizedTestScore),
            courseRigor,
            intendedMajor,
            schools
          })
        }
      ]
    });

    const content = completion.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "AI response was empty." }, { status: 502 });
    }

    const results = parseResults(content, schools);
    return NextResponse.json(results);
  } catch (generationError) {
    const message = generationError instanceof Error ? generationError.message : "Failed to generate college chances.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}