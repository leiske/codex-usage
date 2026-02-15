export type FetchFn = typeof fetch;

export type FetchUsageOptions = {
  url: string;
  authorization: string;
  fetchFn?: FetchFn;
};

async function getApiErrorCode(res: Response): Promise<string | null> {
  try {
    const body = (await res.json()) as {
      error?: { code?: unknown };
      error_code?: unknown;
      code?: unknown;
      detail?: { code?: unknown };
    };

    const code = body?.error?.code ?? body?.error_code ?? body?.code ?? body?.detail?.code;
    if (typeof code === "string" && code.trim() !== "") return code;
    if (typeof code === "number" && Number.isFinite(code)) return String(code);
  } catch {
    // ignore parse errors for non-JSON bodies
  }
  return null;
}

export async function fetchUsage(options: FetchUsageOptions): Promise<unknown> {
  const fetchFn = options.fetchFn ?? fetch;

  const headers = {
    accept: "application/json",
    authorization: options.authorization,
  };
  const res = await fetchFn(options.url, {
    method: "GET",
    headers,
  });

  if (res.status === 401 || res.status === 403) {
    const apiCode = await getApiErrorCode(res);
    throw new Error(`Auth expired. HTTP ${res.status}${apiCode ? ` API code: ${apiCode}` : ""}.`);
  }
  if (!res.ok) {
    const apiCode = await getApiErrorCode(res);
    throw new Error(`Request failed. HTTP ${res.status}${apiCode ? ` API code: ${apiCode}` : ""}.`);
  }

  return await res.json();
}
