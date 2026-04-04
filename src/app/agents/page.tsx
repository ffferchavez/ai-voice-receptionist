import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { AgentManager } from "@/components/voice/AgentManager";

export const metadata: Metadata = {
  title: "Agents",
  description: "Create, configure, and test your AI voice agents.",
};

export default function AgentsPage() {
  return (
    <AppShell displayName="Manuel Fernando" initials="MF">
      <section className="border-b border-neutral-300 pb-8">
        <p className="helion-kicker">Create</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-neutral-950 sm:text-5xl">
          Configure your AI voice agents
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-neutral-600">
          Set behavior, pick voice and model settings, then run live test turns
          before connecting your telephony providers.
        </p>
      </section>

      <section className="mt-8 border border-neutral-300 bg-white px-5 py-4 text-sm text-neutral-800">
        <p className="font-medium">Runtime requirements</p>
        <p className="mt-1 leading-relaxed text-neutral-600">
          Set <code className="font-mono text-xs">GEMINI_API_KEY</code> and{" "}
          <code className="font-mono text-xs">ELEVENLABS_API_KEY</code> in{" "}
          <code className="font-mono text-xs">.env.local</code>, then restart the
          dev server.
        </p>
      </section>

      <section className="mt-6 border-y border-neutral-300">
        <article className="flex items-center gap-4 border-b border-neutral-200 py-4 text-sm text-neutral-700">
          <span className="font-mono text-[13px] text-neutral-400">01</span>
          Create an agent profile and set conversation rules.
        </article>
        <article className="flex items-center gap-4 border-b border-neutral-200 py-4 text-sm text-neutral-700">
          <span className="font-mono text-[13px] text-neutral-400">02</span>
          Pick an ElevenLabs voice and tune speech model settings.
        </article>
        <article className="flex items-center gap-4 py-4 text-sm text-neutral-700">
          <span className="font-mono text-[13px] text-neutral-400">03</span>
          Run voice and text tests before webhook deployment.
        </article>
      </section>

      <section className="mt-6">
        <AgentManager />
      </section>
    </AppShell>
  );
}
