"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

type AuthMode = "login" | "signup";

type AuthModalProps = {
  isOpen: boolean;
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onClose: () => void;
  onSuccess: () => void;
};

export function AuthModal({ isOpen, mode, onModeChange, onClose, onSuccess }: AuthModalProps) {
  const { continueAsGuest, signIn, signInWithGoogle, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<"email" | "google" | null>(null);

  function resetFormState() {
    setEmail("");
    setPassword("");
    setError(null);
    setSubmitting(null);
  }

  function handleClose() {
    resetFormState();
    onClose();
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting("email");
    setError(null);

    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) {
      setError("Email and password are required.");
      setSubmitting(null);
      return;
    }

    const authError = mode === "signup" ? await signUp(normalizedEmail, password) : await signIn(normalizedEmail, password);

    if (authError) {
      setError(authError);
      setSubmitting(null);
      return;
    }

    resetFormState();
    onSuccess();
  }

  async function handleGoogleSignIn() {
    setSubmitting("google");
    setError(null);

    const authError = await signInWithGoogle();
    if (authError) {
      setError(authError);
      setSubmitting(null);
      return;
    }

    resetFormState();
    onSuccess();
  }

  function handleGuestContinue() {
    resetFormState();
    continueAsGuest();
    onSuccess();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />

      <div
        className="relative z-[81] w-full max-w-md rounded-2xl border border-white/20 bg-slate-900/95 p-6 text-white shadow-[0_16px_50px_rgba(2,6,23,0.55)]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-3 top-3 rounded-md p-1 text-white/70 transition hover:bg-white/10 hover:text-white"
          aria-label="Close authentication modal"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          role="status"
          className="mb-4 rounded-xl border border-indigo-300/20 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-100"
        >
          Save your progress with an account so your tools stay with you anywhere.
        </motion.div>

        <h2 id="auth-modal-title" className="text-2xl font-semibold tracking-[0.02em] text-white">
          Save Your Progress
        </h2>
        <p className="mt-2 text-sm text-white/75">
          Create an account or log in to track your profile, activities, and college chances.
        </p>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={submitting !== null}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:opacity-70"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none">
            <path d="M12 10.2v3.95h5.58c-.24 1.26-.98 2.33-2.08 3.05l3.18 2.47C20.55 17.84 22 15.18 22 12c0-.73-.06-1.43-.17-2.1H12Z" fill="#4285F4" />
            <path d="M6.51 14.49l-.78.6-2.76 2.15A9.98 9.98 0 0 0 12 22c2.78 0 5.12-.92 6.83-2.48l-3.18-2.47c-.88.6-2.01.97-3.65.97-2.8 0-5.17-1.89-6.02-4.43Z" fill="#34A853" />
            <path d="M3.17 6.63A9.99 9.99 0 0 0 2 12c0 1.1.18 2.16.49 3.15l4.52-3.51A5.99 5.99 0 0 1 12 6c1.51 0 2.87.52 3.95 1.54l2.95-2.95A10 10 0 0 0 12 2C8.3 2 5.1 4.1 3.17 6.63Z" fill="#FBBC05" />
            <path d="M12 6c1.51 0 2.87.52 3.95 1.54l2.95-2.95A10 10 0 0 0 12 2C8.3 2 5.1 4.1 3.17 6.63l4.52 3.51A5.98 5.98 0 0 1 12 6Z" fill="#EA4335" opacity="0.95" />
          </svg>
          {submitting === "google" ? "Connecting with Google..." : "Continue with Google"}
        </button>

        <div className="mt-5 grid grid-cols-2 rounded-lg border border-white/15 bg-white/5 p-1">
          <button
            type="button"
            onClick={() => onModeChange("signup")}
            className={`rounded-md px-3 py-2 text-sm font-medium transition ${
              mode === "signup" ? "bg-white text-slate-900" : "text-white/75 hover:text-white"
            }`}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => onModeChange("login")}
            className={`rounded-md px-3 py-2 text-sm font-medium transition ${
              mode === "login" ? "bg-white text-slate-900" : "text-white/75 hover:text-white"
            }`}
          >
            Log In
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <div>
            <label htmlFor="auth-email" className="mb-1 block text-sm font-medium text-white/90">
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-white/20 bg-slate-950/50 px-3 py-2 text-sm text-white placeholder:text-white/50 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-400/20"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="mb-1 block text-sm font-medium text-white/90">
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-white/20 bg-slate-950/50 px-3 py-2 text-sm text-white placeholder:text-white/50 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-400/20"
              placeholder={mode === "signup" ? "Create a password" : "Enter your password"}
              required
            />
          </div>

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting !== null}
            className="w-full rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-70"
          >
            {submitting === "email" ? "Please wait..." : mode === "signup" ? "Create account" : "Log in"}
          </button>
        </form>

        <button
          type="button"
          onClick={handleGuestContinue}
          className="mt-4 w-full text-center text-xs text-white/60 underline-offset-4 transition hover:text-white/80 hover:underline"
        >
          Continue without saving
        </button>
      </div>
    </div>
  );
}
