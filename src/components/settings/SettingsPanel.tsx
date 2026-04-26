"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { ManageProfilePanel } from "@/components/settings/ManageProfilePanel";

type SettingsPanelProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const router = useRouter();
  const { clearSignupPrompt, isGuest, loading, openAuthModal, signOut, user } = useAuth();
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isManageProfileOpen, setIsManageProfileOpen] = useState(false);

  const isLoggedIn = Boolean(user);
  const isGuestMode = isGuest || !isLoggedIn;
  const providerId = user?.providerData?.[0]?.providerId;
  const authProvider = useMemo(() => {
    if (providerId === "google.com") {
      return "google";
    }

    return "password";
  }, [providerId]);

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

  async function handleLogout() {
    setIsLoggingOut(true);
    setActionMessage(null);
    const error = await signOut();
    if (error) {
      setActionMessage(error);
      setIsLoggingOut(false);
      return;
    }

    setIsLoggingOut(false);
    onClose();
    router.push("/");
  }

  function handleCreateAccount() {
    clearSignupPrompt();
    openAuthModal("signup");
    onClose();
  }

  function handleLogIn() {
    clearSignupPrompt();
    openAuthModal("login");
    onClose();
  }

  function openManageProfile() {
    setIsManageProfileOpen(true);
  }

  function closeManageProfile() {
    setIsManageProfileOpen(false);
  }

  return (
    <AnimatePresence>
      {isOpen ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-panel-title"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />

          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative z-[91] w-full max-w-md rounded-2xl border border-white/20 bg-slate-900/95 p-6 text-white shadow-[0_16px_50px_rgba(2,6,23,0.55)]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 rounded-md p-1 text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Close settings panel"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>

            <h2 id="settings-panel-title" className="text-2xl font-semibold tracking-[0.02em] text-white">
              Account Settings
            </h2>

            <section className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-white/70">User Info</h3>
              {loading ? (
                <p className="mt-3 text-sm text-white/70">Loading account details...</p>
              ) : isGuestMode ? (
                <div className="mt-3 space-y-2 text-sm text-white/85">
                  <p className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-400" aria-hidden="true" />
                    <span className="font-semibold text-white">Guest Mode</span>
                  </p>
                  <p className="text-white/70">Your work won’t be saved unless you create an account</p>
                </div>
              ) : isLoggedIn ? (
                <div className="mt-3 space-y-2 text-sm text-white/85">
                  <p className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" aria-hidden="true" />
                    <span className="font-semibold text-white">Account Active</span>
                  </p>
                  <p className="text-base font-semibold text-white">{user?.email ?? "Not available"}</p>
                  <p className="text-xs uppercase tracking-[0.08em] text-white/60">
                    {authProvider === "google" ? "Google Account" : "Email Account"}
                  </p>
                  <p className="text-sm text-white/70">Saving progress automatically</p>
                </div>
              ) : null}
            </section>

            {!loading ? (
              <section className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-white/70">Account Actions</h3>

                <div className="mt-3 flex flex-col gap-2">
                  {isGuestMode ? (
                    <>
                      <button
                        type="button"
                        onClick={handleCreateAccount}
                        disabled={loading}
                        className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-70"
                      >
                        Create Account
                      </button>
                      <button
                        type="button"
                        onClick={handleLogIn}
                        disabled={loading}
                        className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/85 transition hover:bg-white/10 disabled:opacity-70"
                      >
                        Log In
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-70"
                      >
                        {isLoggingOut ? "Logging out..." : "Log Out"}
                      </button>

                      <button
                        type="button"
                        onClick={openManageProfile}
                        disabled={isLoggingOut}
                        className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/85 transition hover:bg-white/10 disabled:opacity-70"
                      >
                        Manage Profile Data
                      </button>

                      {authProvider === "password" ? (
                        <button
                          type="button"
                          onClick={openManageProfile}
                          disabled={isLoggingOut}
                          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/85 transition hover:bg-white/10 disabled:opacity-70"
                        >
                          Change Password
                        </button>
                      ) : null}
                    </>
                  )}
                </div>
              </section>
            ) : null}

            {actionMessage ? <p className="mt-4 text-sm text-rose-300">{actionMessage}</p> : null}

            <ManageProfilePanel
              isOpen={isManageProfileOpen}
              onClose={closeManageProfile}
              authProvider={authProvider}
            />
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}