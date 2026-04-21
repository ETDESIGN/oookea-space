"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, createContext, useContext, useState, useEffect, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "";
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

// ─── Types ──────────────────────────────────────────────────────
interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "client";
  company?: string;
  phone?: string;
  avatar?: string;
  status: "active" | "inactive";
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => ({ success: false }),
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

// ─── Inner Provider (runs inside ConvexProvider) ────────────────
function AuthInner({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [storedUserId, setStoredUserId] = useState<string | null>(null);

  // Check stored session on mount (client only)
  useEffect(() => {
    const stored = localStorage.getItem("oookea_user_id");
    if (stored) setStoredUserId(stored);
    else setIsLoading(false);
  }, []);

  // Fetch user from Convex when we have a stored ID
  const convexUser = useQuery(
    api.projects.getUserById,
    storedUserId ? { id: storedUserId as Id<"users"> } : "skip"
  );

  useEffect(() => {
    if (convexUser !== undefined) {
      if (convexUser) {
        setUser({
          id: convexUser._id,
          name: convexUser.name,
          email: convexUser.email,
          role: convexUser.role as "admin" | "client",
          company: convexUser.company ?? undefined,
          phone: convexUser.phone ?? undefined,
          avatar: convexUser.avatar ?? undefined,
          status: convexUser.status as "active" | "inactive",
        });
      } else {
        localStorage.removeItem("oookea_user_id");
        setStoredUserId(null);
        setUser(null);
      }
      setIsLoading(false);
    }
  }, [convexUser]);

  const login = useCallback(async (email: string, _password: string) => {
    try {
      const result = await convex!.query(api.projects.loginUser, { email });
      if (result) {
        const userData: User = {
          id: result._id,
          name: result.name,
          email: result.email,
          role: result.role as "admin" | "client",
          company: result.company ?? undefined,
          phone: result.phone ?? undefined,
          status: result.status as "active" | "inactive",
        };
        setUser(userData);
        localStorage.setItem("oookea_user_id", result._id);
        setStoredUserId(result._id);
        return { success: true };
      }
      return { success: false, error: "Invalid email or password" };
    } catch {
      return { success: false, error: "Login failed. Please try again." };
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("oookea_user_id");
    setStoredUserId(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Outer Provider (Convex + Auth) ─────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  if (!convex) {
    return (
      <AuthContext.Provider value={{ user: null, isLoading: false, login: async () => ({ success: false, error: "Backend not configured" }), logout: () => {} }}>
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <ConvexProvider client={convex}>
      <AuthInner>{children}</AuthInner>
    </ConvexProvider>
  );
}

// ─── Protected Route ────────────────────────────────────────────
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E2E8F0] border-t-[#6366F1]" />
      </div>
    );
  }

  if (!user) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

  return <>{children}</>;
}
