import Link from "next/link";

type HelionWordmarkLinkProps = {
  href: string;
  product?: string;
  variant?: "on-light" | "on-dark";
  className?: string;
};

export function HelionWordmarkLink({
  href,
  product = "Voices",
  variant = "on-light",
  className = "",
}: HelionWordmarkLinkProps) {
  const isDark = variant === "on-dark";

  return (
    <Link
      href={href}
      className={`inline-flex min-h-[42px] items-center gap-2 font-sans text-sm uppercase tracking-[0.16em] sm:gap-2 sm:text-[15px] ${className}`}
      aria-label={`Helion ${product} home`}
    >
      <span className={isDark ? "font-normal text-white" : "font-normal text-neutral-950"}>
        Helion
      </span>
      <span className={isDark ? "font-semibold text-yellow-400" : "font-semibold text-neutral-950"}>
        {product}
      </span>
    </Link>
  );
}
