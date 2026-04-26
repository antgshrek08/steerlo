"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

type ContactModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type SubjectOption = "Steerlo Support Request" | "Steerlo Bug Report" | "Steerlo Question" | "Steerlo Feedback";

const supportEmail = "support@steerlo.com";

export function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState<SubjectOption>("Steerlo Support Request");
  const [sending, setSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [closeTimerId, setCloseTimerId] = useState<number | null>(null);

  const canSend = useMemo(() => message.trim().length > 0, [message]);
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const isEmailValid = useMemo(() => {
    if (!email.trim()) {
      return true;
    }

    return emailPattern.test(email.trim());
  }, [email]);

  const canSubmit = canSend && isEmailValid && !sending;

  function resetForm() {
    setName("");
    setEmail("");
    setMessage("");
    setSubject("Steerlo Support Request");
    setSending(false);
    setStatusMessage(null);
    setErrorMessage(null);
    if (closeTimerId !== null) {
      window.clearTimeout(closeTimerId);
      setCloseTimerId(null);
    }
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleClose();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  async function handleSendMessage() {
    if (!canSubmit) {
      return;
    }

    setSending(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
          subject
        })
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Failed to send message. Please try again.");
      }

      setStatusMessage("Message sent successfully");

      const timerId = window.setTimeout(() => {
        handleClose();
      }, 1000);

      setCloseTimerId(timerId);
    } catch {
      setErrorMessage("Failed to send message. Please try again.");
      setSending(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
      className="fixed inset-0 z-[85] flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />

      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="relative z-[86] w-full max-w-lg rounded-2xl border border-white/20 bg-slate-900/95 p-6 text-white shadow-[0_18px_56px_rgba(2,6,23,0.6)]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-3 top-3 rounded-md p-1 text-white/70 transition hover:bg-white/10 hover:text-white"
          aria-label="Close contact modal"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <h2 id="contact-modal-title" className="text-2xl font-semibold tracking-[0.02em] text-white">
          Contact Us
        </h2>
        <p className="mt-2 text-sm text-white/75">
          Support email: <span className="font-medium text-white">{supportEmail}</span>
        </p>

        <p className="mt-3 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/75">
          This will open your email app to send the message
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSubject("Steerlo Bug Report")}
            className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-white/80 transition hover:bg-white/10"
          >
            Report a bug
          </button>
          <button
            type="button"
            onClick={() => setSubject("Steerlo Question")}
            className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-white/80 transition hover:bg-white/10"
          >
            Ask a question
          </button>
          <button
            type="button"
            onClick={() => setSubject("Steerlo Feedback")}
            className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-white/80 transition hover:bg-white/10"
          >
            Give feedback
          </button>
        </div>

        <form
          className="mt-5 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSendMessage();
          }}
        >
          <div>
            <label htmlFor="contact-name" className="mb-1 block text-sm font-medium text-white/90">
              Name (optional)
            </label>
            <input
              id="contact-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-lg border border-white/20 bg-slate-950/50 px-3 py-2 text-sm text-white placeholder:text-white/50 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-400/20"
              placeholder="Your name"
            />
          </div>

          <div>
            <label htmlFor="contact-email" className="mb-1 block text-sm font-medium text-white/90">
              Email (optional)
            </label>
            <input
              id="contact-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-white/20 bg-slate-950/50 px-3 py-2 text-sm text-white placeholder:text-white/50 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-400/20"
              placeholder="you@example.com"
            />
            {!isEmailValid ? <p className="mt-1 text-xs text-rose-300">Please enter a valid email address.</p> : null}
          </div>

          <div>
            <label htmlFor="contact-message" className="mb-1 block text-sm font-medium text-white/90">
              Message
            </label>
            <textarea
              id="contact-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="min-h-32 w-full rounded-lg border border-white/20 bg-slate-950/50 px-3 py-2 text-sm text-white placeholder:text-white/50 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-400/20"
              placeholder="How can we help?"
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? "Sending..." : "Send Message"}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white/85 transition hover:bg-white/10"
            >
              Cancel
            </button>
          </div>

          {statusMessage ? <p className="text-sm text-emerald-200">{statusMessage}</p> : null}
          {errorMessage ? <p className="text-sm text-rose-300">{errorMessage}</p> : null}
        </form>
      </motion.div>
    </div>
  );
}
