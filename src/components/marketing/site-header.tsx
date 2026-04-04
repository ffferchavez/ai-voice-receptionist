import Link from "next/link";
import { HelionWordmarkLink } from "@/components/brand/helion-wordmark";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function LoginIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M15 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 12h11m0 0-3-3m3 3-3 3"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SignupIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export async function SiteHeader() {
  let isAuthenticated = false;
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    isAuthenticated = Boolean(data.user);
  } catch {
    isAuthenticated = false;
  }

  return (
    <header
      className="public-header-safe-top border-b border-neutral-200/80 bg-white"
      suppressHydrationWarning
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <HelionWordmarkLink href="/" product="Voices" variant="on-light" />
        <nav className="flex items-center gap-2 text-[13px] font-medium">
          {isAuthenticated && (
            <>
              <Link
                href="/dashboard"
                className="helion-btn-soft min-h-9 px-4 text-[12px] font-medium"
              >
                Dashboard
              </Link>
              <Link
                href="/agents"
                className="helion-btn-dark min-h-9 px-4 text-[12px] font-medium"
              >
                Agents
              </Link>
            </>
          )}
          {!isAuthenticated && (
            <>
              <Link
                href="/login"
                className="helion-btn-soft min-h-9 gap-1.5 px-4 text-[12px] font-medium"
              >
                <LoginIcon />
                Log in
              </Link>
              <Link
                href="/signup"
                className="helion-btn-dark min-h-9 gap-1.5 px-4 text-[12px] font-medium"
              >
                <SignupIcon />
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
