/* WHAT IT DO? Restores and persists the frontend bearer session, then exposes sign-in and sign-out helpers. */

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { requestAuthToken } from "../lib/api";
import type { AuthSession, AuthTokenRequest, AuthenticatedRole } from "../types";

interface AuthContextState {
  isReady: boolean;
  session: AuthSession | null;
  signIn: (credentials: AuthTokenRequest) => Promise<AuthSession>;
  signOut: () => void;
}

type TokenPayload = {
  exp?: number;
  role?: string;
  userId?: string;
};

const STORAGE_KEY = "pnyx-auth-session";
const KNOWN_ROLES: AuthenticatedRole[] = ["user", "moderator", "admin"];
const AuthContext = createContext<AuthContextState | undefined>(undefined);

const isAuthenticatedRole = (value: string | undefined): value is AuthenticatedRole => {
  return value != null && KNOWN_ROLES.includes(value as AuthenticatedRole);
};

const decodeBase64Url = (value: string): string => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? 0 : 4 - (normalized.length % 4);
  return atob(`${normalized}${"=".repeat(padding)}`);
};

const decodeSessionToken = (token: string): AuthSession | null => {
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[1]) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(parts[1])) as TokenPayload;
    if (!payload.userId || !isAuthenticatedRole(payload.role)) {
      return null;
    }

    const expiresAt = typeof payload.exp === "number" ? new Date(payload.exp * 1000).toISOString() : null;
    if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
      return null;
    }

    return {
      token,
      userId: payload.userId,
      role: payload.role,
      expiresAt
    };
  } catch {
    return null;
  }
};

const readStoredSession = (): AuthSession | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const token = window.localStorage.getItem(STORAGE_KEY);
  if (!token) {
    return null;
  }

  const session = decodeSessionToken(token);
  if (!session) {
    window.localStorage.removeItem(STORAGE_KEY);
  }

  return session;
};

const persistSession = (session: AuthSession | null): void => {
  if (typeof window === "undefined") {
    return;
  }

  if (!session) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, session.token);
};

export const AuthProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  const [session, setSession] = useState<AuthSession | null>(() => readStoredSession());

  useEffect(() => {
    const syncStoredSession = (): void => {
      setSession(readStoredSession());
    };

    syncStoredSession();
    window.addEventListener("storage", syncStoredSession);

    return () => {
      window.removeEventListener("storage", syncStoredSession);
    };
  }, []);

  const signIn = async (credentials: AuthTokenRequest): Promise<AuthSession> => {
    const response = await requestAuthToken(credentials);
    const nextSession = decodeSessionToken(response.token);
    if (!nextSession) {
      throw new Error("Received an unusable auth token.");
    }

    persistSession(nextSession);
    setSession(nextSession);
    return nextSession;
  };

  const signOut = (): void => {
    persistSession(null);
    setSession(null);
  };

  const value = useMemo<AuthContextState>(
    () => ({
      isReady: true,
      session,
      signIn,
      signOut
    }),
    [session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextState => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
};
