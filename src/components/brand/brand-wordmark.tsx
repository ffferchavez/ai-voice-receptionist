import Link from "next/link";
import { BRAND } from "@/lib/brand";

type BrandWordmarkLinkProps = {
  href: string;
  variant?: "on-light" | "on-dark";
  className?: string;
};

export function BrandWordmarkLink({
  href,
  variant = "on-light",
  className = "",
}: BrandWordmarkLinkProps) {
  const isDark = variant === "on-dark";

  return (
    <Link
      href={href}
      className={`inline-flex min-h-[42px] items-center gap-2 font-sans text-sm uppercase tracking-[0.16em] sm:gap-2 sm:text-[15px] ${className}`}
      aria-label={`${BRAND.metadataTitleSuffix} home`}
    >
      <span className={isDark ? "font-normal text-white" : "font-normal text-ui-text"}>
        {BRAND.shortName}
      </span>
      <span className={isDark ? "font-semibold text-violet-300" : "font-semibold text-ui-accent"}>
        {BRAND.productName}
      </span>
    </Link>
  );
}
