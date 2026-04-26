import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import * as Sentry from "@sentry/nextjs";
import { checkRateLimit, createRequestId, getClientIp } from "@/lib/api";

type EssayStarterInput = {
  responses?: Array<{
    question?: string;
    answer?: string;
  }>;
};

type EssayStarterResult = {
  question: string;
  topic: string;
  starter: string;
};

function isPlaceholderValue(value: string | undefined) {
  if (!value) {
    return true;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.includes("your_key_here") || normalized.includes("your-") || normalized.includes("gsk_your");
}

function buildPrompt(responses: Array<{ question: string; answer: string }>) {
  return [
    "You are an expert college admissions writing coach.",
    "For each student response, generate:",
    "1) A clear and specific college essay topic title.",
    "2) A compelling essay starter paragraph of 3-5 sentences.",
    "Keep ideas concrete, authentic, and emotionally specific.",
    "Do not repeat topics across responses.",
    "Return ONLY valid JSON in this shape:",
    "{\"ideas\":[{\"question\":\"...\",\"topic\":\"...\",\"starter\":\"...\"}]}",
    "Include all responses in the same order provided.",
    "",
    ...responses.map((entry, index) => `Response ${index + 1} - Question: ${entry.question}\nResponse ${index + 1} - Answer: ${entry.answer}`)
  ].join("\n");
}

function parseIdeas(content: string) {
  const normalized = content.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "");
  const parsed = JSON.parse(normalized) as { ideas?: unknown };

  if (!parsed || !Array.isArray(parsed.ideas)) {
    throw new Error("AI response must include an ideas array.");
  }

  const ideas = parsed.ideas.map((item) => {
    if (!item || typeof item !== "object") {
      throw new Error("Each idea must be an object.");
    }

    const record = item as Record<string, unknown>;
    const question = typeof record.question === "string" ? record.question.trim() : "";
    const topic = typeof record.topic === "string" ? record.topic.trim() : "";
    const starter = typeof record.starter === "string" ? record.starter.trim() : "";

    if (!question || !topic || !starter) {
      throw new Error("Each idea must include non-empty question, topic, and starter fields.");
    }

    return { question, topic, starter } satisfies EssayStarterResult;
  });

  if (ideas.length !== 3) {
    throw new Error("AI response must contain exactly 3 ideas.");
  }

  return ideas;
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`essay-starter:${ip}`, 20, 60_000);

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

  const body = (await request.json().catch(() => null)) as EssayStarterInput | null;

  if (!body || !Array.isArray(body.responses)) {
    return NextResponse.json({ error: "Request body must include a responses array.", requestId }, { status: 400, headers: { "x-request-id": requestId } });
  }

  if (body.responses.length !== 3) {
    return NextResponse.json({ error: "Exactly 3 responses are required.", requestId }, { status: 400, headers: { "x-request-id": requestId } });
  }

  const responses = body.responses.map((item) => ({
    question: item.question?.trim() || "",
    answer: item.answer?.trim() || ""
  }));

  const hasInvalidResponse = responses.some((item) => !item.question || !item.answer);
  if (hasInvalidResponse) {
    return NextResponse.json({ error: "Each response must include a question and a non-empty answer.", requestId }, { status: 400, headers: { "x-request-id": requestId } });
  }

  try {
    const groq = new Groq({ apiKey });

    const completion = await groq.chat.completions.create({
      model,
      temperature: 0.8,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You create high-quality college essay starter ideas and always return valid JSON with no extra text."
        },
        {
          role: "user",
          content: buildPrompt(responses)
        }
      ]
    });

    const content = completion.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "AI response was empty.", requestId }, { status: 502, headers: { "x-request-id": requestId } });
    }

    const ideas = parseIdeas(content);
    return NextResponse.json(ideas, { headers: { "x-request-id": requestId } });
  } catch (generationError) {
    Sentry.withScope((scope) => {
      scope.setTag("capture_source", "manual");
      scope.setTag("route", "/api/essay-starter");
      scope.setContext("app_context", {
        action: "ai_generate_essay_starter",
        route: "/api/essay-starter",
        requestId,
        model
      });
      Sentry.captureException(generationError);
    });

    const message =
      generationError instanceof Error ? generationError.message : "Failed to generate essay starter ideas.";
    return NextResponse.json({ error: message, requestId }, { status: 502, headers: { "x-request-id": requestId } });
  }
}