export function displayNameFromUser(
  profileDisplayName: string | null | undefined,
  email: string | null | undefined,
): string {
  const p = profileDisplayName?.trim();
  if (p) return p;
  const e = email?.trim();
  if (e) return e;
  return "Account";
}

export function initialsFromDisplayName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0][0];
    const b = parts[parts.length - 1][0];
    if (a && b) return (a + b).toUpperCase();
  }
  const first = parts[0];
  if (first && first.length >= 2) {
    return first.slice(0, 2).toUpperCase();
  }
  return (first?.[0] ?? "?").toUpperCase();
}
