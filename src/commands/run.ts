import { AuthExpiredError, HttpStatusError, MissingEnvError, TimeoutError, UnexpectedResponseError } from "../errors";
import { fetchUsage, type FetchFn } from "../fetchUsage";
import { renderBars } from "../renderBars";
import { getStdoutColumns } from "../ui/terminal";

export type RunResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

export type RunOptions = {
  env?: Record<string, string | undefined>;
  fetchFn?: FetchFn;
  retry?: number;
  debug?: boolean;
  verbose?: boolean;
  columns?: number | null;
};

export async function runCommand(options: RunOptions = {}): Promise<RunResult> {
  const env = options.env ?? (Bun.env as Record<string, string | undefined>);
  const url = env.CHATGPT_WHAM_URL ?? "https://chatgpt.com/backend-api/wham/usage";

  const missing: string[] = [];
  const cookie = env.CHATGPT_COOKIE;
  const authorization = env.CHATGPT_AUTHORIZATION;
  if (!authorization) missing.push("CHATGPT_AUTHORIZATION");
  if (missing.length > 0) throw new MissingEnvError(missing);

  const json = await fetchUsage({
    url,
    cookie,
    authorization: authorization!,
    fetchFn: options.fetchFn,
    retry: options.retry,
  });

  const out = renderBars(json, {
    width: 24,
    columns: options.columns ?? getStdoutColumns(),
    verbose: options.verbose,
  });
  return { exitCode: 0, stdout: `${out}\n`, stderr: "" };
}

export async function runCommandWithErrors(options: RunOptions = {}): Promise<RunResult> {
  try {
    return await runCommand(options);
  } catch (err) {
    if (err instanceof MissingEnvError) {
      return {
        exitCode: 1,
        stdout: "",
        stderr:
          "Missing env vars. Either set these from DevTools 'Copy as cURL' or run: codex-usage import\n" +
          `  ${err.missing.join("\n  ")}\n`,
      };
    }

    if (err instanceof AuthExpiredError) {
      return {
        exitCode: 1,
        stdout: "",
        stderr: formatAuthExpired(err, options.debug ?? false),
      };
    }

    if (err instanceof TimeoutError) {
      return {
        exitCode: 1,
        stdout: "",
        stderr: formatDebug("Request timed out.\n", err, options.debug ?? false),
      };
    }

    if (err instanceof HttpStatusError) {
      return {
        exitCode: 1,
        stdout: "",
        stderr: formatDebug(`Request failed (HTTP ${err.status}).\n`, err, options.debug ?? false),
      };
    }

    if (err instanceof UnexpectedResponseError) {
      const base = "Unexpected response shape. Try re-importing auth.\n";
      return {
        exitCode: 1,
        stdout: "",
        stderr: options.debug ? `${base}debug: ${err.message}\n` : base,
      };
    }

    const msg = err instanceof Error ? err.message : String(err);
    return { exitCode: 1, stdout: "", stderr: `Failed to fetch usage: ${msg}\n` };
  }
}

function formatAuthExpired(err: AuthExpiredError, debug: boolean): string {
  let out = "Auth expired. Re-run: codex-usage import\n";
  if (!debug) return out;
  const parts: string[] = [];
  if (err.url) parts.push(`debug: url=${err.url}`);
  parts.push(`debug: status=${err.status}`);
  if (err.headerNames && err.headerNames.length > 0) {
    parts.push(`debug: headers=${err.headerNames.join(",")}`);
  }
  return out + parts.join("\n") + "\n";
}

function formatDebug(prefix: string, err: { url: string; headerNames: string[]; status?: number }, debug: boolean): string {
  if (!debug) return prefix;
  const lines: string[] = [prefix.trimEnd()];
  lines.push(`debug: url=${err.url}`);
  if (typeof err.status === "number") lines.push(`debug: status=${err.status}`);
  if (err.headerNames.length > 0) lines.push(`debug: headers=${err.headerNames.join(",")}`);
  return lines.join("\n") + "\n";
}
