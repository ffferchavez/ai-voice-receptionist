import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

export default function Home() {
  return (
    <div
      className="flex min-h-full flex-1 flex-col bg-ui-bg"
      suppressHydrationWarning
    >
      <SiteHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-ui-line bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <p className="studio-kicker">{BRAND.metadataTitleSuffix}</p>
            <h1 className="mt-4 max-w-4xl text-[56px] font-semibold leading-[0.98] tracking-[-0.02em] text-neutral-950 sm:text-[74px]">
              Never miss a call. Convert every conversation into revenue.
            </h1>
            <p className="mt-8 max-w-3xl text-lg leading-relaxed text-neutral-600 sm:text-xl">
              Configure how your brand answers the phone, stream transcripts to your
              workspace, and turn conversations into structured leads.
            </p>
            <div className="mt-16 grid border-y border-ui-line">
              <Link href="/login" className="studio-row-link sm:px-6">
                Log in or launch demo
                <span aria-hidden>›</span>
              </Link>
            </div>
            <div className="mt-20 border-t border-ui-line pt-12">
              <h2 className="studio-kicker">How it works</h2>
              <ol className="mt-4 max-w-2xl">
                <li className="flex items-center gap-4 border-b border-neutral-200 py-4 text-[17px] text-neutral-700">
                  <span className="font-mono text-[14px] text-neutral-400">01</span>
                  Add your business context and call goals.
                </li>
                <li className="flex items-center gap-4 border-b border-neutral-200 py-4 text-[17px] text-neutral-700">
                  <span className="font-mono text-[14px] text-neutral-400">02</span>
                  Test live conversations and fine-tune your prompt.
                </li>
                <li className="flex items-center gap-4 py-4 text-[17px] text-neutral-700">
                  <span className="font-mono text-[14px] text-neutral-400">03</span>
                  Save transcripts and capture qualified leads.
                </li>
              </ol>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
