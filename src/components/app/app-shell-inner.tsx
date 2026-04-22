"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/app/app-sidebar";
import { BrandWordmarkLink } from "@/components/brand/brand-wordmark";
import { MAIN_PAD, PAGE_INSET } from "@/lib/ui/shell";

const APP_HEADER_CLASS =
  "public-header-safe-top shrink-0 border-b border-ui-line bg-white/95 backdrop-blur";

function MenuIcon() {
  return (
    <svg
      className="size-[22px]"
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M4 6h16M4 12h16M4 18h16"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Full layout; loaded with `dynamic(..., { ssr: false })` so it is not hydrated against preview/extension DOM. */
export function AppShellInner({
  displayName,
  initials,
  children,
}: {
  displayName: string;
  initials: string;
  children: React.ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-ui-bg">
      <header className={APP_HEADER_CLASS}>
        <div
          className={`${PAGE_INSET} flex flex-wrap items-center justify-between gap-x-4 gap-y-3 py-3 sm:gap-x-6 sm:py-4`}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4 md:flex-none md:gap-6">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="inline-flex size-11 shrink-0 items-center justify-center text-ui-muted transition-colors hover:bg-ui-surface hover:text-ui-text md:hidden"
              aria-label="Open menu"
            >
              <MenuIcon />
            </button>
            <BrandWordmarkLink href="/dashboard" variant="on-light" />
          </div>
        </div>
      </header>

      <div className="flex min-h-0 min-w-0 flex-1">
        <AppSidebar
          mobileOpen={mobileNavOpen}
          onMobileOpenChange={setMobileNavOpen}
          displayName={displayName}
          initials={initials}
        />
        <main
          className={`relative z-0 flex w-full min-w-0 flex-1 flex-col overflow-auto ${PAGE_INSET} ${MAIN_PAD}`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
