import { NextResponse } from "next/server";
import { Resend } from "resend";

const supportEmail = "steerlo.contact@gmail.com";
const firebaseApiKey = "AIzaSyAxJYIPUNAByBrnvYx1ujpZ_8PT7wgxdyE";
const allowedSubjects = new Set([
  "Steerlo Support Request",
  "Steerlo Bug Report",
  "Steerlo Question",
  "Steerlo Feedback"
]);

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
}

async function getVerifiedUserEmail(idToken: string): Promise<{ email: string; displayName?: string } | null> {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ idToken })
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    users?: Array<{
      email?: string;
      displayName?: string;
      localId?: string;
    }>;
  };

  const user = data.users?.[0];

  if (!user?.email) {
    return null;
  }

  return {
    email: user.email,
    displayName: user.displayName || undefined
  };
}

function buildMessageBody(input: { email: string; displayName?: string; message: string; subject: string }) {
  return [
    `Subject: ${input.subject}`,
    `From: ${input.displayName ? `${input.displayName} <${input.email}>` : input.email}`,
    `Email: ${input.email}`,
    `Timestamp: ${new Date().toISOString()}`,
    "",
    "Message:",
    input.message
  ].join("\n");
}

export async function POST(request: Request) {
  try {
    const idToken = getBearerToken(request);
    if (!idToken) {
      return NextResponse.json({ error: "You must be logged in to send a message." }, { status: 401 });
    }

    const verifiedUser = await getVerifiedUserEmail(idToken);
    if (!verifiedUser) {
      return NextResponse.json({ error: "You must be logged in to send a message." }, { status: 401 });
    }

    const payload = (await request.json()) as {
      message?: string;
      subject?: string;
    };

    const message = typeof payload.message === "string" ? payload.message.trim() : "";
    const subject = typeof payload.subject === "string" && allowedSubjects.has(payload.subject) ? payload.subject : "Steerlo Support Request";

    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const body = buildMessageBody({
      email: verifiedUser.email,
      displayName: verifiedUser.displayName,
      message,
      subject
    });
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.CONTACT_FROM_EMAIL || "Steerlo <noreply@steerlo.com>";

    if (!resendApiKey) {
      if (process.env.NODE_ENV !== "production") {
        console.log("[contact] dev fallback send", {
          to: supportEmail,
          from: fromEmail,
          subject,
          body
        });

        return NextResponse.json({ success: true }, { status: 200 });
      }

      return NextResponse.json(
        { error: "Contact email is not configured yet. Please try again later." },
        { status: 500 }
      );
    }

    const resend = new Resend(resendApiKey);
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: [supportEmail],
      subject: "New Steerlo Support Message",
      text: body,
      replyTo: verifiedUser.email
    });

    if (error) {
      console.error("[contact] resend send failed", {
        message: error.message,
        to: supportEmail,
        from: fromEmail,
        replyTo: verifiedUser.email
      });
      return NextResponse.json(
        { error: error.message || "Failed to send message. Please try again." },
        { status: 500 }
      );
    }

    console.log("[contact] message sent", {
      to: supportEmail,
      from: fromEmail,
      replyTo: verifiedUser.email,
      subject: "New Steerlo Support Message"
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Contact form send failed", error);
    return NextResponse.json({ error: "Failed to send message. Please try again." }, { status: 500 });
  }
}
