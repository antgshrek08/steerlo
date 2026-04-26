import { NextResponse } from "next/server";

const supportEmail = "steerlo.contact@gmail.com";
const allowedSubjects = new Set([
  "Steerlo Support Request",
  "Steerlo Bug Report",
  "Steerlo Question",
  "Steerlo Feedback"
]);

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function buildMessageBody(input: { name: string; email: string; message: string }) {
  return [
    `Name: ${input.name || "Not provided"}`,
    `Email: ${input.email || "Not provided"}`,
    "",
    "Message:",
    input.message
  ].join("\n");
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      name?: string;
      email?: string;
      message?: string;
      subject?: string;
    };

    const name = typeof payload.name === "string" ? payload.name.trim() : "";
    const email = typeof payload.email === "string" ? payload.email.trim() : "";
    const message = typeof payload.message === "string" ? payload.message.trim() : "";
    const subject = typeof payload.subject === "string" && allowedSubjects.has(payload.subject) ? payload.subject : "Steerlo Support Request";

    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    if (email && !isValidEmail(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const body = buildMessageBody({ name, email, message });
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.CONTACT_FROM_EMAIL || "Steerlo <onboarding@resend.dev>";

    if (!resendApiKey) {
      if (process.env.NODE_ENV !== "production") {
        console.log("[contact] dev fallback send", {
          to: supportEmail,
          from: fromEmail,
          subject,
          body
        });

        return NextResponse.json({ ok: true }, { status: 200 });
      }

      return NextResponse.json(
        { error: "Contact email is not configured yet. Please try again later." },
        { status: 500 }
      );
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [supportEmail],
        subject,
        text: body,
        reply_to: email || undefined
      })
    });

    if (!resendResponse.ok) {
      const errorData = (await resendResponse.json().catch(() => null)) as { message?: string } | null;
      return NextResponse.json(
        { error: errorData?.message || "Failed to send message. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Contact form send failed", error);
    return NextResponse.json({ error: "Failed to send message. Please try again." }, { status: 500 });
  }
}
