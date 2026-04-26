import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";

type EssayFormData = {
  experience?: string;
  lifeExperience?: string;
  challenge?: string;
  proud?: string;
  proudOf?: string;
  interests?: string;
};

type EssayIdea = {
  title: string;
  idea: string;
  why_it_works: string;
};

function isPlaceholderValue(value: string | undefined) {
  if (!value) {
    return true;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.includes("your_key_here") || normalized.includes("your-") || normalized.includes("gsk_your");
}

function buildPrompt(formData: EssayFormData) {
  const experience = formData.experience?.trim() || formData.lifeExperience?.trim() || "Not provided";
  const proud = formData.proud?.trim() || formData.proudOf?.trim() || "Not provided";

  const promptLines = [
    `Meaningful life experience: ${experience}`,
    `Challenge faced: ${formData.challenge?.trim() || "Not provided"}`,
    `Something the student is proud of: ${proud}`,
    `Interests: ${formData.interests?.trim() || "Not provided"}`
  ];

  return [
    "You are an expert college admissions advisor helping a student brainstorm authentic personal statement stories.",
    "Generate exactly 3 UNIQUE essay story ideas based directly on the student's responses.",
    "Each idea must include a specific moment, emotional stakes, and clear personal growth.",
    "Do not give generic advice. Do not repeat themes across ideas.",
    "Make each idea feel authentic, compelling, and human.",
    "Return ONLY valid JSON in this exact shape:",
    "{\"ideas\":[{\"title\":\"...\",\"idea\":\"...\",\"why_it_works\":\"...\"}]}",
    "`idea` should describe the story angle in 3-5 sentences.",
    "`why_it_works` should explain why this story is effective for admissions in 2-3 sentences.",
    "",
    ...promptLines
  ].join("\n");
}

function parseIdeas(content: string): EssayIdea[] {
  const normalized = content.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "");
  const parsed = JSON.parse(normalized) as { ideas?: unknown };

  if (!parsed || !Array.isArray(parsed.ideas)) {
    throw new Error("AI response must be valid JSON with an ideas array.");
  }

  if (parsed.ideas.length !== 3) {
    throw new Error("AI response must contain exactly 3 ideas.");
  }

  const ideas = parsed.ideas.map((item) => {
    if (!item || typeof item !== "object") {
      throw new Error("Each idea must be an object.");
    }

    const record = item as Record<string, unknown>;
    const title = typeof record.title === "string" ? record.title.trim() : "";
    const idea = typeof record.idea === "string" ? record.idea.trim() : "";
    const whyItWorks = typeof record.why_it_works === "string" ? record.why_it_works.trim() : "";

    if (!title || !idea || !whyItWorks) {
      throw new Error("Each idea must include non-empty title, idea, and why_it_works fields.");
    }

    return {
      title,
      idea,
      why_it_works: whyItWorks
    };
  });

  return ideas;
}

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  const supabase = createAdminClient();

  if (isPlaceholderValue(apiKey)) {
    return NextResponse.json(
      {
        error: "GROQ_API_KEY is missing or still set to a placeholder. Add a real key in .env.local."
      },
      { status: 500 }
    );
  }

  const body = (await request.json().catch(() => null)) as EssayFormData | null;

  if (!body) {
    return NextResponse.json({ error: "Request body is required." }, { status: 400 });
  }

  const hasInput = [body.experience, body.lifeExperience, body.challenge, body.proud, body.proudOf, body.interests].some((value) => Boolean(value?.trim()));

  if (!hasInput) {
    return NextResponse.json({ error: "At least one form field is required." }, { status: 400 });
  }

  try {
    const groq = new Groq({ apiKey });

    const completion = await groq.chat.completions.create({
      model,
      temperature: 0.9,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an expert college admissions advisor. Produce concrete, emotionally specific essay story ideas grounded in student details. Output JSON only."
        },
        {
          role: "user",
          content: buildPrompt(body)
        }
      ]
    });

    const content = completion.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: "AI response was empty." }, { status: 502 });
    }

    const ideas = parseIdeas(content);

    if (supabase) {
      await supabase
        .from("essay_submissions")
        .insert({
          life_experience: body.lifeExperience ?? null,
          challenge: body.challenge ?? null,
          proud_of: body.proudOf ?? null,
          interests: body.interests ?? null,
          ideas,
          model
        });
    }

    return NextResponse.json(ideas);
  } catch (generationError) {
    Sentry.withScope((scope) => {
      scope.setTag("capture_source", "manual");
      scope.setTag("route", "/api/essay");
      scope.setContext("app_context", {
        action: "ai_generate_essay",
        route: "/api/essay",
        model
      });
      Sentry.captureException(generationError);
    });

    const message =
      generationError instanceof Error ? generationError.message : "Failed to generate essay ideas from Groq API.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
