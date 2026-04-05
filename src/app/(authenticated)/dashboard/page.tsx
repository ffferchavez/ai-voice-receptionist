import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { displayNameFromUser } from "@/lib/user-display";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const firstName = displayNameFromUser(
    profile?.display_name,
    user.email,
  ).split(/\s+/)[0];

  return (
    <>
      <section className="border-b border-neutral-300 pb-10">
        <p className="helion-kicker">Workspace</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-5xl">
          Hi, {firstName}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-neutral-600">
          Set up your receptionist, create conversation flows, and review saved
          transcripts from one workspace.
        </p>
        <div className="mt-10 grid gap-8 sm:grid-cols-2 sm:gap-12">
          <div className="border-r border-neutral-300 pr-6 sm:pr-12">
            <p className="helion-kicker">Agents</p>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-neutral-950">
              —
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Saved in this browser until DB sync ships
            </p>
          </div>
          <div>
            <p className="helion-kicker">Saved transcripts</p>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-neutral-950">
              —
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              After webhooks land, counts show here
            </p>
          </div>
        </div>
      </section>

      <section className="divide-y divide-neutral-300">
        <article className="flex items-center justify-between gap-6 py-8">
          <div>
            <p className="helion-kicker">Setup</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">
              Configure your AI receptionist
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-600">
              Add your business context and fallback answers so callers get
              consistent, on-brand responses.
            </p>
          </div>
          <Link
            href="/agents"
            className="inline-flex shrink-0 items-center gap-2 text-[13px] font-medium text-neutral-700 transition hover:text-neutral-950"
          >
            Open
            <span aria-hidden>›</span>
          </Link>
        </article>

        <article className="flex items-center justify-between gap-6 py-8">
          <div>
            <p className="helion-kicker">Stack</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">
              Gemini + ElevenLabs runtime
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-600">
              Set <code className="font-mono text-xs">GEMINI_API_KEY</code> and{" "}
              <code className="font-mono text-xs">ELEVENLABS_API_KEY</code> in{" "}
              <code className="font-mono text-xs">.env.local</code>, then restart
              your dev server.
            </p>
          </div>
          <Link
            href="/api/health"
            className="inline-flex shrink-0 items-center gap-2 text-[13px] font-medium text-neutral-700 transition hover:text-neutral-950"
          >
            Health
            <span aria-hidden>›</span>
          </Link>
        </article>
      </section>

      <section className="border-t border-neutral-300 pt-8">
        <p className="helion-kicker">How it works</p>
        <ol className="mt-4 space-y-2 text-sm text-neutral-700">
          <li className="border-b border-neutral-200 py-3">
            01 Add business FAQs, handoff rules, and lead fields.
          </li>
          <li className="border-b border-neutral-200 py-3">
            02 Run test calls and fine-tune prompt + voice.
          </li>
          <li className="py-3">03 Save transcripts and capture qualified leads.</li>
        </ol>
      </section>
    </>
  );
}
