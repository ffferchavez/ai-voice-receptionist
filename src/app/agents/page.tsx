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
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
          New voice configuration
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-neutral-600 sm:text-base">
          Choose your agent profile, behavior, voice, and output style, then run
          live test turns. Everything autosaves locally in this browser.
        </p>
      </section>

      <section className="mt-6 border border-neutral-300 bg-white px-5 py-4 text-sm text-neutral-800">
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
          Set agent name, system prompt, and TTS model.
        </article>
        <article className="flex items-center gap-4 border-b border-neutral-200 py-4 text-sm text-neutral-700">
          <span className="font-mono text-[13px] text-neutral-400">02</span>
          Pick an ElevenLabs voice and preview in one tap.
        </article>
        <article className="flex items-center gap-4 py-4 text-sm text-neutral-700">
          <span className="font-mono text-[13px] text-neutral-400">03</span>
          Run voice and text turns before connecting webhooks.
        </article>
      </section>

      <section className="mt-4">
        <AgentManager />
      </section>
    </AppShell>
  );
}
