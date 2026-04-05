"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const navLinkFocus =
  "outline-none focus-visible:ring-2 focus-visible:ring-neutral-950/15 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fafafa]";

export function SignOutButton({
  className = "",
  collapsed,
}: {
  className?: string;
  collapsed?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const supabase = createSupabaseBrowserClient();
          await supabase.auth.signOut();
          router.push("/");
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
      className={[
        navLinkFocus,
        collapsed
          ? "inline-flex min-h-10 items-center px-1 text-[12px] font-medium text-neutral-500 transition-colors hover:text-neutral-950 disabled:opacity-50"
          : "inline-flex min-h-10 items-center gap-2 px-1 text-[13px] font-medium text-neutral-600 transition-colors hover:text-neutral-950 disabled:opacity-50",
        className,
      ].join(" ")}
    >
      {busy ? "Signing out…" : "Log out"}
    </button>
  );
}
