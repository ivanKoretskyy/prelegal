"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiUrl } from "@/lib/api";

type AuthedUser = { id: number; email: string };
type AuthMode = "signin" | "signup";

type AuthContextValue = {
  user: AuthedUser | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function submit(mode: AuthMode, email: string, password: string): Promise<AuthedUser> {
  const response = await fetch(apiUrl(`/api/auth/${mode}`), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? "Something went wrong. Please try again.");
  }
  return response.json();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(apiUrl("/api/auth/me"), { credentials: "include" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled) setUser(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value: AuthContextValue = {
    user,
    isLoading,
    signIn: async (email, password) => {
      setUser(await submit("signin", email, password));
    },
    signUp: async (email, password) => {
      setUser(await submit("signup", email, password));
    },
    signOut: async () => {
      await fetch(apiUrl("/api/auth/signout"), { method: "POST", credentials: "include" });
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
