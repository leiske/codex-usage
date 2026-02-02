export type AuthBlob = {
  url: string;
  headers: Record<string, string>;
  cookie?: string;
  imported_at: number;
};

export function isAuthBlob(value: unknown): value is AuthBlob {
  const v = value as any;
  if (!v || typeof v !== "object") return false;
  if (typeof v.url !== "string" || v.url.length === 0) return false;
  if (!v.headers || typeof v.headers !== "object") return false;
  if (typeof v.imported_at !== "number" || !Number.isFinite(v.imported_at)) return false;
  if ("cookie" in v && typeof v.cookie !== "string") return false;
  for (const [k, val] of Object.entries(v.headers)) {
    if (typeof k !== "string" || k.length === 0) return false;
    if (typeof val !== "string") return false;
  }
  return true;
}
