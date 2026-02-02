import { normalizeHeaderName } from "../auth/allowlist";
import { tokenizeShellLike } from "./tokenize";

export type ParsedCurl = {
  url: string;
  headers: Record<string, string>;
  cookie?: string;
};

function normalizeCurlText(input: string): string {
  // Join backslash-newline continuations like DevTools cURL output.
  return input.replace(/\\\r?\n/g, " ");
}

function parseHeaderLine(value: string): { name: string; value: string } | null {
  const idx = value.indexOf(":");
  if (idx <= 0) return null;
  const name = value.slice(0, idx).trim();
  const v = value.slice(idx + 1).trim();
  if (!name) return null;
  return { name, value: v };
}

export function parseCurl(input: string): ParsedCurl {
  const text = normalizeCurlText(input.trim());
  const tokens = tokenizeShellLike(text);

  let url = "";
  const headers: Record<string, string> = {};
  let cookieFromFlag: string | undefined;
  let cookieFromHeader: string | undefined;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;

    if (t === "curl") continue;
    if (t === "--url") {
      const next = tokens[i + 1];
      if (next) {
        url = next;
        i++;
      }
      continue;
    }

    if (t === "-H" || t === "--header") {
      const next = tokens[i + 1];
      if (!next) continue;
      const parsed = parseHeaderLine(next);
      i++;
      if (!parsed) continue;

      const name = normalizeHeaderName(parsed.name);
      if (name === "cookie") cookieFromHeader = parsed.value;
      else headers[name] = parsed.value;
      continue;
    }

    if (t === "-b" || t === "--cookie") {
      const next = tokens[i + 1];
      if (next) {
        cookieFromFlag = next;
        i++;
      }
      continue;
    }

    // First non-flag token that looks like a URL.
    if (!t.startsWith("-") && url === "" && /^https?:\/\//.test(t)) {
      url = t;
      continue;
    }
  }

  if (!url) {
    throw new Error("Failed to parse cURL: missing URL");
  }

  const cookie = cookieFromFlag ?? cookieFromHeader;
  return {
    url,
    headers,
    cookie: cookie && cookie.trim() !== "" ? cookie : undefined,
  };
}
