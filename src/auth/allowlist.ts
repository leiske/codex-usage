export const ALLOWED_HEADER_NAMES = new Set([
  "authorization",
  "user-agent",
  "accept",
  "referer",
  "oai-device-id",
  "oai-client-version",
  "oai-client-build-number",
]);

export function normalizeHeaderName(name: string): string {
  return name.trim().toLowerCase();
}

export function filterAllowedHeaders(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    const nk = normalizeHeaderName(k);
    if (!ALLOWED_HEADER_NAMES.has(nk)) continue;
    const nv = typeof v === "string" ? v.trim() : "";
    if (nv === "") continue;
    out[nk] = nv;
  }
  return out;
}
