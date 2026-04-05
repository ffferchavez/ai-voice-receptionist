"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

const AppShellInner = dynamic(
  () =>
    import("./app-shell-inner").then((mod) => ({
      default: mod.AppShellInner,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-dvh flex-1 flex-col bg-[#fafafa]" aria-busy />
    ),
  },
);

export function AppShell({
  displayName,
  initials,
  children,
}: {
  displayName: string;
  initials: string;
  children: ReactNode;
}) {
  return (
    <AppShellInner displayName={displayName} initials={initials}>
      {children}
    </AppShellInner>
  );
}
