import {
  EmailAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateEmail,
  updatePassword,
  updateProfile
} from "firebase/auth";
import * as Sentry from "@sentry/nextjs";
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

const NON_ACTIONABLE_AUTH_CODES = new Set([
  "auth/cancelled-popup-request",
  "auth/email-already-in-use",
  "auth/invalid-credential",
  "auth/invalid-email",
  "auth/popup-closed-by-user",
  "auth/requires-recent-login",
  "auth/user-not-found",
  "auth/weak-password",
  "auth/wrong-password"
]);

function getAuthErrorMessage(error, fallbackMessage) {
  if (error && typeof error === "object" && "code" in error && error.code === "auth/requires-recent-login") {
    return "Please log in again to make this change.";
  }

  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  return fallbackMessage;
}

function getAuthErrorCode(error) {
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") {
    return error.code;
  }

  return null;
}

function createAuthError(error, fallbackMessage, action) {
  const wrappedError = new Error(getAuthErrorMessage(error, fallbackMessage));
  const errorCode = getAuthErrorCode(error);

  if (!errorCode || !NON_ACTIONABLE_AUTH_CODES.has(errorCode)) {
    Sentry.withScope((scope) => {
      scope.setTag("capture_source", "manual");
      scope.setTag("module", "firebase_auth");
      if (errorCode) {
        scope.setTag("firebase_error_code", errorCode);
      }

      if (auth.currentUser?.uid) {
        scope.setUser({ id: auth.currentUser.uid });
      }

      scope.setContext("app_context", {
        action,
        module: "firebase_auth"
      });

      Sentry.captureException(error);
    });
  }

  if (errorCode) {
    wrappedError.code = errorCode;
  }

  return wrappedError;
}

export function isRequiresRecentLoginError(error) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "auth/requires-recent-login");
}

async function ensureUserProfile(user) {
  if (!db) {
    return;
  }

  const userRef = doc(db, "users", user.uid);
  const existingProfile = await getDoc(userRef);

  if (!existingProfile.exists()) {
    await setDoc(userRef, {
      gpa: null,
      sat: null,
      act: null,
      courseRigor: null,
      activities: [],
      essays: [],
      collegeChances: [],
      updatedAt: serverTimestamp()
    });
  }
}

export async function signUp(email, password, displayName) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(userCredential.user, { displayName });
    }

    await ensureUserProfile(userCredential.user);
    return userCredential;
  } catch (error) {
    throw createAuthError(error, "Unable to sign up right now.", "firebase_sign_up");
  }
}

export async function logIn(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential;
  } catch (error) {
    throw createAuthError(error, "Unable to log in right now.", "firebase_log_in");
  }
}

export async function signInWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    await ensureUserProfile(userCredential.user);
    return userCredential;
  } catch (error) {
    throw createAuthError(error, "Unable to sign in with Google right now.", "firebase_google_sign_in");
  }
}

export async function logOut() {
  try {
    await signOut(auth);
  } catch (error) {
    throw createAuthError(error, "Unable to log out right now.", "firebase_log_out");
  }
}

export async function updateAccountEmail(newEmail) {
  try {
    if (!auth.currentUser) {
      throw new Error("No active account found.");
    }

    await updateEmail(auth.currentUser, newEmail);
  } catch (error) {
    throw createAuthError(error, "Unable to update email right now.", "firebase_update_email");
  }
}

export async function updateAccountPassword(newPassword) {
  try {
    if (!auth.currentUser) {
      throw new Error("No active account found.");
    }

    await updatePassword(auth.currentUser, newPassword);
  } catch (error) {
    throw createAuthError(error, "Unable to update password right now.", "firebase_update_password");
  }
}

export async function reauthenticateCurrentUser({ authProvider, email, password }) {
  try {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error("No active account found.");
    }

    if (authProvider === "google") {
      await reauthenticateWithPopup(currentUser, new GoogleAuthProvider());
      return;
    }

    const nextEmail = (email || currentUser.email || "").trim();
    if (!nextEmail) {
      throw new Error("Please enter your account email.");
    }

    if (!password || !password.trim()) {
      throw new Error("Please enter your password.");
    }

    const credential = EmailAuthProvider.credential(nextEmail, password);
    await reauthenticateWithCredential(currentUser, credential);
  } catch (error) {
    throw createAuthError(error, "Unable to verify your login. Please try again.", "firebase_reauthenticate");
  }
}

export async function deleteAccountWithProfile() {
  try {
    if (!auth.currentUser) {
      throw new Error("No active account found.");
    }

    const uid = auth.currentUser.uid;
    const userRef = doc(db, "users", uid);
    await deleteDoc(userRef);
    await deleteUser(auth.currentUser);
  } catch (error) {
    throw createAuthError(error, "Unable to delete account right now.", "firebase_delete_account");
  }
}
