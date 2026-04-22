"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";
import { readPublicDemoLoginCredentials } from "@/lib/brand";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextRaw = searchParams.get("next") ?? "/dashboard";
  const next = nextRaw.startsWith("/") ? nextRaw : "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signIn(loginEmail: string, loginPassword: string) {
    const supabase = createSupabaseBrowserClient();
    const { error: signError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    if (signError) {
      setError(signError.message);
      return false;
    }
    router.push(next);
    router.refresh();
    return true;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
    } finally {
      setLoading(false);
    }
  }

  async function onDemoLogin() {
    setError(null);
    const demo = readPublicDemoLoginCredentials();
    if (!demo) {
      setError(
        "Demo login is not configured. Set NEXT_PUBLIC_DEMO_LOGIN_EMAIL and NEXT_PUBLIC_DEMO_LOGIN_PASSWORD.",
      );
      return;
    }
    setLoading(true);
    try {
      setEmail(demo.email);
      await signIn(demo.email, demo.password);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form className="mt-7 space-y-4" onSubmit={onSubmit}>
        {error && (
          <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-xs font-medium text-neutral-900">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="studio-input"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="text-xs font-medium text-neutral-900"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="studio-input"
          />
        </div>
        <div className="mt-1 grid gap-2 sm:grid-cols-2">
          <button
            type="submit"
            disabled={loading}
            className="studio-btn-primary w-full disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Log in"}
          </button>
          <button
            type="button"
            onClick={onDemoLogin}
            disabled={loading}
            className="studio-btn-soft w-full disabled:opacity-50"
          >
            {loading ? "Opening demo…" : "Demo login"}
          </button>
        </div>
      </form>

      <p className="mt-4 text-center text-xs text-ui-muted-dim">
        Demo uses a sandbox account with non-sensitive sample data.
      </p>
      <p className="mt-8 text-center text-sm text-neutral-500">
        <Link href="/" className="underline underline-offset-2">
          Back to home
        </Link>
      </p>
    </>
  );
}
