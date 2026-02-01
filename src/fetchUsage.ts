import { AuthExpiredError } from "./errors";

export type FetchFn = typeof fetch;

export type FetchUsageOptions = {
  url: string;
  cookie?: string;
  authorization: string;
  fetchFn?: FetchFn;
  timeoutMs?: number;
};

export async function fetchUsage(options: FetchUsageOptions): Promise<unknown> {
  const fetchFn = options.fetchFn ?? fetch;
  const timeoutMs = options.timeoutMs ?? 8000;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {
      accept: "application/json",
      authorization: options.authorization,
    };
    if (options.cookie && options.cookie.trim() !== "") headers.cookie = options.cookie;

    const res = await fetchFn(options.url, {
      method: "GET",
      headers,
      signal: controller.signal,
    });

    if (res.status === 401 || res.status === 403) {
      throw new AuthExpiredError(res.status);
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    return await res.json();
  } finally {
    clearTimeout(t);
  }
}
