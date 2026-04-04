import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { AgentManager } from "@/components/voice/AgentManager";

export const metadata: Metadata = {
  title: "Agents",
  description: "Create, configure, and test your AI voice agents.",
};

export default function AgentsPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
          {/* Page header */}
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-700 dark:text-violet-400 mb-2">
              Helion Voices
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Voice Agents
            </h1>
            <p className="mt-2 text-zinc-500 dark:text-zinc-400 max-w-xl">
              Configure your AI voice receptionists. Set the system prompt,
              choose an ElevenLabs voice, then test them right here in the browser.
            </p>
          </div>

          {/* Getting-started callout — only shown as a hint until they have keys set */}
          <div className="mb-6 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 px-5 py-4 text-sm text-amber-800 dark:text-amber-300">
            <p className="font-medium mb-1">Before you start</p>
            <p className="text-amber-700 dark:text-amber-400">
              Make sure{" "}
              <code className="rounded bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 font-mono text-xs">
                ANTHROPIC_API_KEY
              </code>{" "}
              and{" "}
              <code className="rounded bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 font-mono text-xs">
                ELEVENLABS_API_KEY
              </code>{" "}
              are set in your{" "}
              <code className="rounded bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 font-mono text-xs">
                .env.local
              </code>{" "}
              file, then restart the dev server.
            </p>
          </div>

          {/* Main manager UI */}
          <AgentManager />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
