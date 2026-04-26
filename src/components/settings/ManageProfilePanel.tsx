"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  deleteAccountWithProfile,
  isRequiresRecentLoginError,
  reauthenticateCurrentUser,
  updateAccountEmail,
  updateAccountPassword
} from "@/lib/auth";
import { useAuth } from "@/components/auth/AuthProvider";
import { useProfileSummary } from "@/components/profile/ProfileSummaryProvider";

type ManageProfilePanelProps = {
  isOpen: boolean;
  onClose: () => void;
  authProvider: "google" | "password";
};

type PendingSensitiveAction = "password" | "delete" | null;

export function ManageProfilePanel({ isOpen, onClose, authProvider }: ManageProfilePanelProps) {
  const router = useRouter();
  const { signOut, user } = useAuth();
  const { clearProfile } = useProfileSummary();
  const [nextEmail, setNextEmail] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [updatingEmail, setUpdatingEmail] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pendingSensitiveAction, setPendingSensitiveAction] = useState<PendingSensitiveAction>(null);
  const [reauthEmail, setReauthEmail] = useState("");
  const [reauthPassword, setReauthPassword] = useState("");
  const [reauthLoading, setReauthLoading] = useState(false);
  const [reauthError, setReauthError] = useState<string | null>(null);

  function clearReauthState() {
    setPendingSensitiveAction(null);
    setReauthEmail(user?.email ?? "");
    setReauthPassword("");
    setReauthLoading(false);
    setReauthError(null);
  }

  function promptForReauth(action: Exclude<PendingSensitiveAction, null>) {
    setPendingSensitiveAction(action);
    setReauthEmail(user?.email ?? "");
    setReauthPassword("");
    setReauthLoading(false);
    setReauthError("Please log in again to continue");
  }

  function resetFormState() {
    setFeedback(null);
    setNextEmail("");
    setNextPassword("");
    setUpdatingEmail(false);
    setUpdatingPassword(false);
    setLoggingOut(false);
    setDeletingAccount(false);
    clearReauthState();
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

  if (!isOpen) {
    return null;
  }

  async function handleUpdateEmail() {
    if (!nextEmail.trim()) {
      setFeedback("Please enter a new email address.");
      return;
    }

    setUpdatingEmail(true);
    setFeedback(null);

    try {
      await updateAccountEmail(nextEmail.trim());
      setFeedback("Email updated successfully.");
      setNextEmail("");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to update email right now.");
    } finally {
      setUpdatingEmail(false);
    }
  }

  async function handleUpdatePassword() {
    if (!nextPassword.trim()) {
      setFeedback("Please enter a new password.");
      return;
    }

    if (nextPassword.length < 8) {
      setFeedback("Password must be at least 8 characters.");
      return;
    }

    setUpdatingPassword(true);
    setFeedback(null);

    try {
      await updateAccountPassword(nextPassword.trim());
      setFeedback("Password updated successfully.");
      setNextPassword("");
    } catch (error) {
      if (isRequiresRecentLoginError(error)) {
        promptForReauth("password");
        return;
      }

      setFeedback(error instanceof Error ? error.message : "Unable to update password right now.");
    } finally {
      setUpdatingPassword(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    setFeedback(null);

    const error = await signOut();
    if (error) {
      setFeedback(error);
      setLoggingOut(false);
      return;
    }

    setLoggingOut(false);
    handleClose();
    router.push("/");
  }

  function handleDeleteAccount() {
    const confirmed = window.confirm("Are you sure you want to delete your account? This cannot be undone.");
    if (!confirmed) {
      return;
    }

    void (async () => {
      setDeletingAccount(true);
      setFeedback(null);

      try {
        await deleteAccountWithProfile();
        clearProfile();

        if (typeof window !== "undefined") {
          window.localStorage.removeItem("steerlo-is-guest");
        }

        setDeletingAccount(false);
        handleClose();
        router.push("/");
      } catch (error) {
        if (isRequiresRecentLoginError(error)) {
          setDeletingAccount(false);
          promptForReauth("delete");
          return;
        }

        setDeletingAccount(false);
        setFeedback(error instanceof Error ? error.message : "Unable to delete account right now.");
      }
    })();
  }

  async function handleReauthenticateAndRetry() {
    if (!pendingSensitiveAction) {
      return;
    }

    if (authProvider === "password") {
      if (!reauthEmail.trim()) {
        setReauthError("Please enter your account email.");
        return;
      }

      if (!reauthPassword.trim()) {
        setReauthError("Please enter your password.");
        return;
      }
    }

    setReauthLoading(true);
    setReauthError(null);
    setFeedback(null);

    try {
      await reauthenticateCurrentUser({
        authProvider,
        email: reauthEmail,
        password: reauthPassword
      });

      if (pendingSensitiveAction === "password") {
        if (!nextPassword.trim()) {
          setReauthError("Enter a new password, then try again.");
          setReauthLoading(false);
          return;
        }

        await updateAccountPassword(nextPassword.trim());
        setFeedback("Password updated successfully.");
        setNextPassword("");
      }

      if (pendingSensitiveAction === "delete") {
        await deleteAccountWithProfile();
        clearProfile();

        if (typeof window !== "undefined") {
          window.localStorage.removeItem("steerlo-is-guest");
        }

        clearReauthState();
        setDeletingAccount(false);
        handleClose();
        router.push("/");
        return;
      }

      clearReauthState();
    } catch (error) {
      setReauthError(error instanceof Error ? error.message : "Unable to verify your login. Please try again.");
    } finally {
      setReauthLoading(false);
    }
  }

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-profile-title"
        onClick={handleClose}
      >
        <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm" />

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative z-[101] w-full max-w-lg rounded-2xl border border-white/20 bg-slate-900/95 p-6 text-white shadow-[0_18px_56px_rgba(2,6,23,0.6)]"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-3 top-3 rounded-md p-1 text-white/70 transition hover:bg-white/10 hover:text-white"
            aria-label="Close manage profile panel"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>

          <h2 id="manage-profile-title" className="text-2xl font-semibold tracking-[0.02em] text-white">
            Manage Profile
          </h2>

          <section className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-white/70">Email</h3>
            <p className="mt-2 text-sm text-white/85">Current email: <span className="font-semibold text-white">{user?.email ?? "Not available"}</span></p>

            <label className="mt-3 block text-xs font-medium uppercase tracking-[0.08em] text-white/60" htmlFor="manage-email">
              Change Email
            </label>
            <input
              id="manage-email"
              type="email"
              value={nextEmail}
              onChange={(event) => setNextEmail(event.target.value)}
              placeholder="new-email@example.com"
              className="mt-2 w-full rounded-lg border border-white/20 bg-slate-950/50 px-3 py-2 text-sm text-white placeholder:text-white/45 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-400/20"
            />
            <button
              type="button"
              onClick={handleUpdateEmail}
              disabled={updatingEmail || loggingOut}
              className="mt-3 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-70"
            >
              {updatingEmail ? "Updating email..." : "Update Email"}
            </button>
          </section>

          {authProvider === "password" ? (
            <section className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-white/70">Password</h3>

              <label className="mt-2 block text-xs font-medium uppercase tracking-[0.08em] text-white/60" htmlFor="manage-password">
                Change Password
              </label>
              <input
                id="manage-password"
                type="password"
                value={nextPassword}
                onChange={(event) => setNextPassword(event.target.value)}
                placeholder="New password"
                className="mt-2 w-full rounded-lg border border-white/20 bg-slate-950/50 px-3 py-2 text-sm text-white placeholder:text-white/45 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-400/20"
              />
              <button
                type="button"
                onClick={handleUpdatePassword}
                disabled={updatingPassword || loggingOut}
                className="mt-3 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-70"
              >
                {updatingPassword ? "Updating password..." : "Update Password"}
              </button>
            </section>
          ) : null}

          <section className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-white/70">Account Actions</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut || updatingEmail || updatingPassword || deletingAccount}
                className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-70"
              >
                {loggingOut ? "Logging out..." : "Log Out"}
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={loggingOut || updatingEmail || updatingPassword || deletingAccount}
                className="rounded-lg border border-rose-300/35 bg-rose-500/12 px-4 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-500/20 disabled:opacity-70"
              >
                {deletingAccount ? "Deleting account..." : "Delete Account"}
              </button>
            </div>
          </section>

          {feedback ? <p className="mt-4 text-sm text-white/80">{feedback}</p> : null}
        </motion.div>

        <AnimatePresence>
          {pendingSensitiveAction ? (
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="relative z-[102] w-full max-w-md rounded-2xl border border-white/20 bg-slate-900/98 p-5 text-white shadow-[0_18px_56px_rgba(2,6,23,0.7)]"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="reauth-title"
            >
              <h3 id="reauth-title" className="text-lg font-semibold text-white">Please log in again to continue</h3>
              <p className="mt-2 text-sm text-white/75">
                {pendingSensitiveAction === "password"
                  ? "Re-authenticate to update your password."
                  : "Re-authenticate to delete your account."}
              </p>

              {authProvider === "password" ? (
                <div className="mt-4 space-y-3">
                  <label className="block text-xs font-medium uppercase tracking-[0.08em] text-white/60" htmlFor="reauth-email">
                    Email
                  </label>
                  <input
                    id="reauth-email"
                    type="email"
                    value={reauthEmail}
                    onChange={(event) => setReauthEmail(event.target.value)}
                    placeholder="your-email@example.com"
                    className="w-full rounded-lg border border-white/20 bg-slate-950/50 px-3 py-2 text-sm text-white placeholder:text-white/45 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-400/20"
                  />

                  <label className="block text-xs font-medium uppercase tracking-[0.08em] text-white/60" htmlFor="reauth-password">
                    Password
                  </label>
                  <input
                    id="reauth-password"
                    type="password"
                    value={reauthPassword}
                    onChange={(event) => setReauthPassword(event.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-lg border border-white/20 bg-slate-950/50 px-3 py-2 text-sm text-white placeholder:text-white/45 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-400/20"
                  />
                </div>
              ) : (
                <p className="mt-4 text-sm text-white/75">Use your Google account popup to verify your session.</p>
              )}

              {reauthError ? <p className="mt-4 text-sm text-rose-300">{reauthError}</p> : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleReauthenticateAndRetry}
                  disabled={reauthLoading}
                  className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-70"
                >
                  {reauthLoading ? "Verifying..." : authProvider === "google" ? "Continue with Google" : "Verify and Continue"}
                </button>
                <button
                  type="button"
                  onClick={clearReauthState}
                  disabled={reauthLoading}
                  className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white/85 transition hover:bg-white/10 disabled:opacity-70"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  );
}
