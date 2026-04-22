function normalizeSlugBase(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "branch";
}

export function uniqueBranchSlug(
  existing: Set<string>,
  name: string,
): string {
  const base = normalizeSlugBase(name);
  if (!existing.has(base)) return base;
  let n = 2;
  while (existing.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}
