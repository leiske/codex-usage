export type FetchFn = typeof fetch;

export type FetchUsageOptions = {
  url: string;
  authorization: string;
  fetchFn?: FetchFn;
};

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
    throw new Error("Auth expired.");
  }
  if (!res.ok) {
    throw new Error(`Request failed (HTTP ${res.status}).`);
  }

  return await res.json();
}
