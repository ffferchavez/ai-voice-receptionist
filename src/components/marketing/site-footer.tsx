import { BRAND } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="border-t border-ui-line bg-ui-bg py-8">
      <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
        <p className="text-[10px] uppercase tracking-[0.22em] text-ui-muted-dim">
          {BRAND.studioName} · {BRAND.footerAttribution}
        </p>
      </div>
    </footer>
  );
}
