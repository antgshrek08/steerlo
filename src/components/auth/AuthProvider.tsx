"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { User as FirebaseUser } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/lib/firebase";
import { trackEvent } from "@/lib/analytics";
import { logIn as firebaseLogIn, logOut as firebaseLogOut, signInWithGoogle as firebaseSignInWithGoogle, signUp as firebaseSignUp } from "@/lib/auth";

type AuthMode = "login" | "signup";

type AuthContextValue = {
  user: FirebaseUser | null;
  loading: boolean;
  isGuest: boolean;
  authModalOpen: boolean;
  authMode: AuthMode;
  signupPromptSource: string | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string, name?: string) => Promise<string | null>;
  signInWithGoogle: () => Promise<string | null>;
  signOut: () => Promise<string | null>;
  openAuthModal: (mode?: AuthMode) => void;
  closeAuthModal: () => void;
  setAuthMode: (mode: AuthMode) => void;
  continueAsGuest: () => void;
  requestSignupPrompt: (source: string) => void;
  clearSignupPrompt: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const GUEST_STORAGE_KEY = "steerlo-is-guest";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem(GUEST_STORAGE_KEY) === "true";
  });
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [signupPromptSource, setSignupPromptSource] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser ?? null);

      if (firebaseUser) {
        Sentry.setUser({ id: firebaseUser.uid });
      } else {
        Sentry.setUser(null);
      }

      if (firebaseUser) {
        setIsGuest(false);
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(GUEST_STORAGE_KEY);
        }
      }

      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (isGuest) {
      window.localStorage.setItem(GUEST_STORAGE_KEY, "true");
    } else {
      window.localStorage.removeItem(GUEST_STORAGE_KEY);
    }
  }, [isGuest]);

  const finishAuthenticatedSession = useCallback(() => {
    setIsGuest(false);
    setAuthModalOpen(false);
    setSignupPromptSource(null);
  }, []);

  const openAuthModal = useCallback((mode: AuthMode = "signup") => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
  }, []);

  const requestSignupPrompt = useCallback((source: string) => {
    setSignupPromptSource(source);
  }, []);

  const clearSignupPrompt = useCallback(() => {
    setSignupPromptSource(null);
  }, []);

  async function signIn(email: string, password: string) {
    try {
      await firebaseLogIn(email, password);
      trackEvent("user_logged_in", { method: "password" });
      finishAuthenticatedSession();
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Unable to log in right now.";
    }
  }

  async function signUp(email: string, password: string, name?: string) {
    try {
      await firebaseSignUp(email, password, name);
      trackEvent("user_signed_up", { method: "password" });
      finishAuthenticatedSession();
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Unable to sign up right now.";
    }
  }

  async function signInWithGoogle() {
    try {
      await firebaseSignInWithGoogle();
      trackEvent("user_logged_in", { method: "google" });
      finishAuthenticatedSession();
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Unable to sign in with Google right now.";
    }
  }

  async function signOut() {
    try {
      await firebaseLogOut();
      setIsGuest(false);
      setAuthModalOpen(false);
      setSignupPromptSource(null);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Unable to log out right now.";
    }
  }

  function continueAsGuest() {
    setIsGuest(true);
    setAuthModalOpen(false);
    setSignupPromptSource(null);
    Sentry.setUser(null);
    trackEvent("guest_mode_started");
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isGuest,
        authModalOpen,
        authMode,
        signupPromptSource,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        openAuthModal,
        closeAuthModal,
        setAuthMode,
        continueAsGuest,
        requestSignupPrompt,
        clearSignupPrompt
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}

