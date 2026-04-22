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
    .schema("public")
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const { data: membership } = await supabase
    .schema("public")
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const organizationId = membership?.organization_id ?? null;

  const [{ count: agentCountRaw }, { count: transcriptCountRaw }] =
    organizationId
      ? await Promise.all([
          supabase
            .from("agent_configs")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", organizationId),
          supabase
            .schema("public")
            .from("call_sessions")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", organizationId)
            .not("transcript", "is", null)
            .neq("transcript", ""),
        ])
      : [{ count: 0 }, { count: 0 }];

  const agentCount = agentCountRaw ?? 0;
  const transcriptCount = transcriptCountRaw ?? 0;

  const firstName = displayNameFromUser(
    profile?.display_name,
    user.email,
  ).split(/\s+/)[0];

  return (
    <>
      <section className="border-b border-neutral-300 pb-10">
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-5xl">
          Hi, {firstName}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-neutral-600">
          Explore how AI voice agents can handle conversations for sales, support,
          intake, booking, and other real-world workflows.
        </p>
        <div className="mt-10 grid gap-8 sm:grid-cols-2 sm:gap-12">
          <div className="border-r border-neutral-300 pr-6 sm:pr-12">
            <p className="studio-kicker">Agents</p>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-neutral-950">
              {agentCount}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Example profile summary
            </p>
          </div>
          <div>
            <p className="studio-kicker">Saved transcripts</p>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-neutral-950">
              {transcriptCount}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Conversation highlights preview
            </p>
          </div>
        </div>
      </section>

      <section className="divide-y divide-neutral-300">
        <article className="flex items-center justify-between gap-6 py-8">
          <div>
            <p className="studio-kicker">Setup</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">
              Design your AI voice agent
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-600">
              Configure tone, goals, and conversation rules to support sales,
              support, intake, booking, or any voice workflow you want to demo.
            </p>
          </div>
          <Link
            href="/agents"
            className="inline-flex shrink-0 items-center gap-2 text-[13px] font-medium text-neutral-700 transition hover:text-neutral-950"
          >
            View
            <span aria-hidden>›</span>
          </Link>
        </article>

      </section>

      <section className="border-t border-neutral-300 pt-8">
        <p className="studio-kicker">How it works</p>
        <ol className="mt-4 space-y-2 text-sm text-neutral-700">
          <li className="border-b border-neutral-200 py-3">
            01 Set the receptionist profile and response style.
          </li>
          <li className="border-b border-neutral-200 py-3">
            02 Run sample calls to evaluate tone and clarity.
          </li>
          <li className="py-3">03 Review transcripts and captured lead details.</li>
        </ol>
      </section>
    </>
  );
}
