"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";

function HomeIcon() {
  return (
    <svg className="size-[18px]" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8.5Z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AgentsIcon() {
  return (
    <svg className="size-[18px]" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19 12a7 7 0 0 1-14 0M12 19v3"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HealthIcon() {
  return (
    <svg className="size-[18px]" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 12h3l2.5-6 4 12 2.5-6H21"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M18 6 6 18M6 6l12 12"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const items = [
  { href: "/dashboard", label: "Home", Icon: HomeIcon },
  { href: "/agents", label: "Agents", Icon: AgentsIcon },
  { href: "/api/health", label: "Health", Icon: HealthIcon },
] as const;

const navLinkFocus =
  "outline-none focus-visible:ring-2 focus-visible:ring-neutral-950/15 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fafafa]";

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard" || pathname === "/";
  }
  if (href === "/api/health") return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNavLinks({
  collapsed,
  isDesktop,
  onNavigate,
}: {
  collapsed: boolean;
  isDesktop: boolean;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const iconOnly = collapsed && isDesktop;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {!iconOnly && (
        <p className="px-3 pb-2 pt-1 text-[10px] font-medium uppercase tracking-[0.22em] text-neutral-400">
          Workspace
        </p>
      )}
      <nav className="flex flex-col gap-1 px-2 pb-3" aria-label="Main">
        {items.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              title={iconOnly ? label : undefined}
              className={[
                navLinkFocus,
                "group relative flex min-h-[44px] items-center gap-3 px-3 py-2.5 text-[13px] font-medium tracking-wide transition-[background-color,color,box-shadow] duration-200",
                iconOnly ? "justify-center px-2" : "",
                active
                  ? "bg-white text-neutral-950 ring-1 ring-neutral-300"
                  : "text-neutral-600 hover:bg-white/70 hover:text-neutral-950",
              ].join(" ")}
            >
              <Icon />
              {!iconOnly && (
                <span className="min-w-0 truncate leading-snug">{label}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function SidebarUserFooter({
  displayName,
  initials,
  collapsed,
  isDesktop,
  mobile,
}: {
  displayName: string;
  initials: string;
  collapsed: boolean;
  isDesktop: boolean;
  mobile?: boolean;
}) {
  const iconOnly = collapsed && isDesktop;
  const shortLabel = displayName.trim() || "Account";
  const safe = (initials || "HV").slice(0, 2).toUpperCase();
  const bottomSafe = mobile
    ? "pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    : "";

  if (iconOnly) {
    return (
      <div
        className={`shrink-0 border-t border-neutral-200/80 bg-[#fafafa]/95 ${bottomSafe}`}
      >
        <div className="flex flex-col items-center gap-2 px-2 py-3">
          <span
            className="inline-flex size-10 items-center justify-center bg-neutral-200 text-[11px] font-semibold text-neutral-800 ring-1 ring-neutral-300/80"
            title={shortLabel}
            aria-label="Account"
          >
            {safe}
          </span>
          <Link
            href="/login"
            className={`${navLinkFocus} inline-flex min-h-10 items-center px-1 text-[12px] font-medium text-neutral-500 transition-colors hover:text-neutral-950`}
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`shrink-0 border-t border-neutral-200/80 bg-[#fafafa]/95 ${bottomSafe}`}
    >
      <div className="p-3">
        <div className="border border-neutral-300 bg-white p-3">
          <div className="flex gap-3">
            <div className="inline-flex size-10 shrink-0 items-center justify-center bg-neutral-200 text-[11px] font-semibold tracking-tight text-neutral-800 ring-1 ring-neutral-300/80">
              {safe}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold leading-tight text-neutral-950">
                {shortLabel}
              </p>
              <div className="mt-3 flex flex-col gap-0.5 border-t border-neutral-100 pt-3">
                <Link
                  href="/login"
                  className={`${navLinkFocus} inline-flex min-h-10 items-center gap-2 px-1 text-[13px] font-medium text-neutral-600 transition-colors hover:text-neutral-950`}
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className={`${navLinkFocus} inline-flex min-h-10 items-center gap-2 px-1 text-[13px] font-medium tracking-wide text-neutral-500 transition-colors hover:text-neutral-950`}
                >
                  Create account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppSidebar({
  mobileOpen,
  onMobileOpenChange,
  displayName,
  initials,
}: {
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  displayName: string;
  initials: string;
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [desktopExpanded, setDesktopExpanded] = useState(false);

  useEffect(() => {
    if (!isDesktop) return;
    onMobileOpenChange(false);
  }, [isDesktop, onMobileOpenChange]);

  const pathname = usePathname();
  useEffect(() => {
    onMobileOpenChange(false);
  }, [pathname, onMobileOpenChange]);

  useEffect(() => {
    if (!mobileOpen || isDesktop) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen, isDesktop]);

  return (
    <>
      <aside
        onMouseEnter={() => setDesktopExpanded(true)}
        onMouseLeave={() => setDesktopExpanded(false)}
        className={[
          "relative hidden h-full min-h-0 shrink-0 flex-col border-r border-neutral-300 bg-[#fafafa] transition-[width] duration-250 ease-in-out md:flex",
          desktopExpanded
            ? "w-[248px]"
            : "w-[76px]",
        ].join(" ")}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable]">
          <SidebarNavLinks
            collapsed={!desktopExpanded}
            isDesktop={isDesktop}
            onNavigate={() => undefined}
          />
        </div>
        <SidebarUserFooter
          displayName={displayName}
          initials={initials}
          collapsed={!desktopExpanded}
          isDesktop={isDesktop}
        />
      </aside>

      <div
        className={`fixed inset-0 z-40 bg-neutral-950/20 backdrop-blur-[2px] transition-opacity duration-300 md:hidden ${
          mobileOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!mobileOpen}
        onClick={() => onMobileOpenChange(false)}
      />
      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-[min(300px,90vw)] max-w-full flex-col border-r border-neutral-300 bg-[#fafafa] shadow-[8px_0_24px_rgba(0,0,0,0.08)] transition-transform duration-300 ease-in-out md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-200/80 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-neutral-400">
              Menu
            </p>
            <p className="mt-0.5 truncate text-[13px] font-semibold text-neutral-900">
              {displayName || "Account"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onMobileOpenChange(false)}
            className={`${navLinkFocus} inline-flex size-11 shrink-0 items-center justify-center text-neutral-500 transition-colors hover:bg-white hover:text-neutral-950`}
            aria-label="Close menu"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable]">
          <SidebarNavLinks
            collapsed={false}
            isDesktop={false}
            onNavigate={() => onMobileOpenChange(false)}
          />
        </div>
        <SidebarUserFooter
          displayName={displayName}
          initials={initials}
          collapsed={false}
          isDesktop={false}
          mobile
        />
      </aside>
    </>
  );
}
