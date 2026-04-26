type AuthProviderType = "google" | "password";

type ReauthParams = {
  authProvider: AuthProviderType;
  email?: string;
  password?: string;
};

// Local typed wrapper around legacy JS auth helpers.
// @ts-expect-error Legacy JS module has no declaration file.
import * as legacyAuth from "../../lib/auth";

export const signUp = (email: string, password: string, displayName?: string) =>
  legacyAuth.signUp(email, password, displayName) as Promise<unknown>;

export const logIn = (email: string, password: string) =>
  legacyAuth.logIn(email, password) as Promise<unknown>;

export const signInWithGoogle = () => legacyAuth.signInWithGoogle() as Promise<unknown>;

export const logOut = () => legacyAuth.logOut() as Promise<void>;

export const updateAccountEmail = (newEmail: string) =>
  legacyAuth.updateAccountEmail(newEmail) as Promise<void>;

export const updateAccountPassword = (newPassword: string) =>
  legacyAuth.updateAccountPassword(newPassword) as Promise<void>;

export const reauthenticateCurrentUser = (params: ReauthParams) =>
  legacyAuth.reauthenticateCurrentUser(params) as Promise<void>;

export const deleteAccountWithProfile = () => legacyAuth.deleteAccountWithProfile() as Promise<void>;

export const isRequiresRecentLoginError = (error: unknown) =>
  legacyAuth.isRequiresRecentLoginError(error) as boolean;
