import Link from "next/link";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

const features = [
  {
    title: "Webhook-native",
    body: "Ingest call events from Vapi, Twilio, or future providers. Raw payloads stored for debugging.",
  },
  {
    title: "Stable internal model",
    body: "Normalize provider noise into one schema for transcripts, status, and timeline views.",
  },
  {
    title: "Leads & knowledge",
    body: "Structured extraction with OpenAI plus FAQ snippets your receptionist can rely on.",
  },
  {
    title: "Workspace-ready",
    body: "Organizations and roles from day one so you can grow into full SaaS without a rewrite.",
  },
] as const;

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <SiteHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-zinc-200/80 bg-linear-to-b from-violet-50/80 to-zinc-50 dark:border-zinc-800/80 dark:from-violet-950/40 dark:to-zinc-950">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
            <p className="text-sm font-medium uppercase tracking-wider text-violet-700 dark:text-violet-300">
              Helion Voices
            </p>
            <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
              AI Voice Receptionist for every business line
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
              Configure how your brand answers the phone, stream transcripts to your
              workspace, and turn conversations into structured leads — without a
              separate backend in v1.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-full bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-500"
              >
                Start free
              </Link>
              <Link
                href="/login"
                className="text-sm font-semibold text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300"
              >
                Sign in
              </Link>
              <span className="text-sm text-zinc-500 dark:text-zinc-500">
                Built for Helion City teams shipping fast.
              </span>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
            Why this MVP
          </h2>
          <p className="mt-2 max-w-2xl text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Receptionist config, call logs, transcripts, and leads — in one Next.js app.
          </p>
          <ul className="mt-12 grid gap-8 sm:grid-cols-2">
            {features.map((f) => (
              <li
                key={f.title}
                className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/50"
              >
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {f.body}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-t border-zinc-200/80 bg-white py-16 dark:border-zinc-800/80 dark:bg-zinc-900/30">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-col items-start justify-between gap-8 rounded-2xl bg-zinc-900 px-8 py-10 text-zinc-50 dark:bg-violet-950/60 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-medium text-violet-200">Helion Voices</p>
                <p className="mt-2 text-xl font-semibold tracking-tight">
                  Ready when your provider is.
                </p>
                <p className="mt-2 max-w-md text-sm text-zinc-300">
                  Webhooks land in Phase 4; this build is structured so Vapi and Twilio
                  stay isolated in a voice integration module.
                </p>
              </div>
              <Link
                href="/api/health"
                className="inline-flex shrink-0 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100"
              >
                Check API health
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
