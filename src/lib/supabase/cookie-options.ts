function normalizeCookieDomain(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.startsWith(".") ? trimmed : `.${trimmed}`;
}

function deriveDomainFromSiteUrl(siteUrl: string | undefined): string | undefined {
  if (!siteUrl) return undefined;
  try {
    const normalized = /^https?:\/\//i.test(siteUrl) ? siteUrl : `https://${siteUrl}`;
    const { hostname } = new URL(normalized);
    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)
    ) {
      return undefined;
    }
    const labels = hostname.split(".").filter(Boolean);
    if (labels.length < 2) return undefined;
    return `.${labels.slice(-2).join(".")}`;
  } catch {
    return undefined;
  }
}

export function getSharedAuthCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  const explicit = normalizeCookieDomain(process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN ?? "");
  const domain = isProduction
    ? explicit || deriveDomainFromSiteUrl(process.env.NEXT_PUBLIC_SITE_URL?.trim()) || undefined
    : undefined;

  return {
    domain,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}
