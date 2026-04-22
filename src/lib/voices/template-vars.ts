type VarMap = Record<string, string>;

export function readTemplateVariables(input: unknown): VarMap {
  if (!input || typeof input !== "object") return {};
  const entries = Object.entries(input as Record<string, unknown>).filter(
    ([key, value]) => typeof key === "string" && typeof value === "string",
  );
  return Object.fromEntries(entries);
}

export function applyTemplateVariables(
  template: string,
  vars: VarMap,
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_all, key: string) => {
    return vars[key] ?? "";
  });
}
