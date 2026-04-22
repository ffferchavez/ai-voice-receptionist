import type { Metadata } from "next";
import { AgentManager } from "@/components/voice/AgentManager";

export const metadata: Metadata = {
  title: "Agents",
  description: "Create, configure, and test your AI voice agents.",
};

export default function AgentsPage() {
  return (
    <>
      <section className="border-b border-neutral-300 pb-8">
        <p className="studio-kicker">Create</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-neutral-950 sm:text-5xl">
          Configure your AI voice agents
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-neutral-600">
          Build and refine voice agents for sales, support, intake, booking, or
          any conversation workflow you want to showcase.
        </p>
      </section>

      <section className="mt-8 border border-neutral-300 bg-white px-5 py-4 text-sm text-neutral-800">
        <p className="font-medium">Demo note</p>
        <p className="mt-1 leading-relaxed text-neutral-600">
          This page demonstrates how an AI voice agent can be configured, tested,
          and presented as part of a product portfolio.
        </p>
      </section>

      <section className="mt-6 border-y border-neutral-300">
        <article className="flex items-center gap-4 border-b border-neutral-200 py-4 text-sm text-neutral-700">
          <span className="font-mono text-[13px] text-neutral-400">01</span>
          Create an agent profile and define conversation goals.
        </article>
        <article className="flex items-center gap-4 border-b border-neutral-200 py-4 text-sm text-neutral-700">
          <span className="font-mono text-[13px] text-neutral-400">02</span>
          Choose voice style and response behavior to match your use case.
        </article>
        <article className="flex items-center gap-4 py-4 text-sm text-neutral-700">
          <span className="font-mono text-[13px] text-neutral-400">03</span>
          Run voice and text tests, then iterate based on conversation quality.
        </article>
      </section>

      <section className="mt-6">
        <AgentManager />
      </section>
    </>
  );
}
