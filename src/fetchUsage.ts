import { AuthExpiredError, HttpStatusError, TimeoutError } from "./errors";

export type FetchFn = typeof fetch;

export type FetchUsageOptions = {
  url: string;
  cookie?: string;
  authorization: string;
  headers?: Record<string, string>;
  fetchFn?: FetchFn;
  timeoutMs?: number;
  retry?: number;
};

function headerNamesFrom(headers: Record<string, string>): string[] {
  return Object.keys(headers)
    .map((h) => h.toLowerCase())
    .sort();
}

async function fetchUsageOnce(options: Omit<FetchUsageOptions, "retry">): Promise<unknown> {
  const fetchFn = options.fetchFn ?? fetch;
  const timeoutMs = options.timeoutMs ?? 8000;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {
      accept: "application/json",
      ...(options.headers ?? {}),
      authorization: options.authorization,
    };
    if (options.cookie && options.cookie.trim() !== "") headers.cookie = options.cookie;

    const headerNames = headerNamesFrom(headers);

    let res: Response;
    try {
      res = await fetchFn(options.url, {
        method: "GET",
        headers,
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new TimeoutError(options.url, headerNames);
      }
      throw err;
    }

    if (res.status === 401 || res.status === 403) {
      throw new AuthExpiredError(res.status, "Auth expired", { url: options.url, headerNames });
    }

    if (!res.ok) {
      throw new HttpStatusError(res.status, options.url, headerNames);
    }

    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

export async function fetchUsage(options: FetchUsageOptions): Promise<unknown> {
  const retries = Math.max(0, Math.min(10, Math.floor(options.retry ?? 0)));
  const attempts = 1 + retries;

  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetchUsageOnce(options);
    } catch (err) {
      lastErr = err;
      const remaining = attempts - i - 1;
      if (remaining <= 0) throw err;
      if (err instanceof HttpStatusError && err.status >= 500 && err.status <= 599) {
        await Bun.sleep(250 * (i + 1));
        continue;
      }
      throw err;
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error("Failed");
}
