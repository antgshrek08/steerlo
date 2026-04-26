import { NextResponse } from "next/server";
import { checkRateLimit, createRequestId, getClientIp } from "@/lib/api";

type RequestBody = {
  topic?: string;
};

export async function POST(request: Request) {
  const requestId = createRequestId();
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`brainstorm:${ip}`, 30, 60_000);

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

  const body = (await request.json()) as RequestBody;
  const topic = body.topic?.trim();

  if (!topic) {
    return NextResponse.json({ error: "Topic is required.", requestId }, { status: 400, headers: { "x-request-id": requestId } });
  }

  const ideas = [
    `Define why ${topic} matters today`,
    `Present one strong argument in favor and one against ${topic}`,
    `Use a real-world example to support your position on ${topic}`,
    `End with a practical recommendation for readers`
  ];

  return NextResponse.json({ topic, ideas, requestId }, { headers: { "x-request-id": requestId } });
}
