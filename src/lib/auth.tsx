"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { User, AuthTokens } from "@/types";
import { wpLogin, wpGetCurrentUser } from "@/lib/wp";

// ─── Token Storage ──────────────────────────────────────────────
const TOKEN_KEY = "oookea_token";

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function storeToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// ─── Context ────────────────────────────────────────────────────
interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

// ─── Provider ───────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = getStoredToken();
    if (stored) {
      setToken(stored);
      wpGetCurrentUser(stored)
        .then((wpUser) => {
          if (wpUser) {
            setUser({
              id: Number(wpUser.id),
              name: (wpUser.name as string) || "User",
              email: (wpUser.email as string) || "",
              avatar: (wpUser.avatar as Record<string, string>)?.url || undefined,
              role: "client",
              createdAt: new Date().toISOString(),
            });
          }
        })
        .catch(() => {
          clearToken();
          setToken(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const result = await wpLogin(username, password);
    storeToken(result.token);
    setToken(result.token);

    const wpUser = await wpGetCurrentUser(result.token);
    if (wpUser) {
      setUser({
        id: Number(wpUser.id),
        name: (wpUser.name as string) || result.user_display_name || "User",
        email: (wpUser.email as string) || result.user_email || "",
        avatar: (wpUser.avatar as Record<string, string>)?.url || undefined,
        role: "client",
        createdAt: new Date().toISOString(),
      });
    }
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

// ─── Protected Route Wrapper ────────────────────────────────────
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#6366F1] border-t-transparent" />
          <p className="text-sm text-[#64748B]">Loading…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

  return <>{children}</>;
}
