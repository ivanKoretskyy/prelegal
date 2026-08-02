"use client";

import { type FormEvent, useState } from "react";
import { useAuth } from "@/context/AuthContext";

type Mode = "signin" | "signup";

export function AuthBar() {
  const { user, isLoading, signIn, signUp, signOut } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await (mode === "signup" ? signUp(email, password) : signIn(email, password));
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="h-10 border-b border-desk-border bg-desk sm:h-11" />;
  }

  if (user) {
    return (
      <div className="border-b border-desk-border bg-desk px-6 py-2 sm:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <p className="font-mono text-[11px] text-pad-muted-2">Signed in as {user.email}</p>
          <button
            type="button"
            onClick={() => signOut()}
            className="font-mono text-[11px] uppercase tracking-[0.14em] text-stamp-soft transition-colors hover:text-stamp"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-desk-border bg-desk px-6 py-3 sm:px-10">
      <form onSubmit={handleSubmit} className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className="min-w-0 flex-1 border border-desk-border bg-desk-raised px-3 py-1.5 font-mono text-xs text-pad placeholder:text-pad-muted-2 focus:outline-none focus:ring-1 focus:ring-stamp-soft"
        />
        <input
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          className="min-w-0 flex-1 border border-desk-border bg-desk-raised px-3 py-1.5 font-mono text-xs text-pad placeholder:text-pad-muted-2 focus:outline-none focus:ring-1 focus:ring-stamp-soft"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="whitespace-nowrap bg-stamp px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-paper transition-colors hover:bg-stamp-soft disabled:cursor-wait disabled:opacity-60"
        >
          {isSubmitting ? "…" : mode === "signup" ? "Sign up" : "Sign in"}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode((current) => (current === "signup" ? "signin" : "signup"));
            setError(null);
          }}
          className="whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.14em] text-pad-muted-2 transition-colors hover:text-pad"
        >
          {mode === "signup" ? "Have an account? Sign in" : "New here? Sign up"}
        </button>
        {error && <p className="w-full font-mono text-[11px] text-blank-text">{error}</p>}
      </form>
    </div>
  );
}
