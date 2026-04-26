"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";

export default function SignupPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (!name || !email || !password) {
      setError("Name, email, and password are required.");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    const signUpError = await signUp(email, password, name);

    if (signUpError) {
      setError(signUpError);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card title="Create account">
      <form className="max-w-md" onSubmit={handleSubmit}>
        <Field id="name" label="Full name" placeholder="Jane Student" required autoComplete="name" />
        <Field id="email" label="Email" placeholder="you@example.com" type="email" required autoComplete="email" />
        <Field id="password" label="Password" placeholder="Pick a password" type="password" required autoComplete="new-password" />
        <Field id="confirmPassword" label="Confirm password" placeholder="Re-enter password" type="password" required autoComplete="new-password" />
        {error ? <p className="mb-2 text-sm text-red-600">{error}</p> : null}
        <button
          className="mt-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:opacity-70"
          disabled={loading}
          type="submit"
        >
          {loading ? "Creating account..." : "Sign up"}
        </button>
      </form>
    </Card>
  );
}
