import { AuthExpiredError, HttpStatusError, TimeoutError, UnexpectedResponseError } from "../errors";
import { fetchUsage, type FetchFn } from "../fetchUsage";
import { renderBars } from "../renderBars";
import { runCommandWithErrors } from "./run";
import type { Store } from "../store/Store";
import { getDefaultStores } from "../store/defaultStores";
import { getFirstAuth } from "../store/selectStore";
import { getStdoutColumns } from "../ui/terminal";

export type RunStoredResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

export type RunStoredOptions = {
  fetchFn?: FetchFn;
  env?: Record<string, string | undefined>;
  retry?: number;
  debug?: boolean;
  verbose?: boolean;
  columns?: number | null;
  stores?: Store[];
};

export async function runStoredCommandWithErrors(options: RunStoredOptions = {}): Promise<RunStoredResult> {
  try {
    const stores = options.stores ?? getDefaultStores();
    const selected = await getFirstAuth(stores);
    if (!selected) {
      // Fallback to env vars (Phase 1 path) so the top-level command is the only one.
      const envRun = await runCommandWithErrors({
        fetchFn: options.fetchFn,
        env: options.env,
        retry: options.retry,
        debug: options.debug,
        verbose: options.verbose,
        columns: options.columns,
      });
      if (envRun.exitCode !== 0 && envRun.stderr.startsWith("Missing env vars.")) {
        return {
          exitCode: 1,
          stdout: "",
          stderr:
            "Missing auth to query usage. Import auth with:\n" +
            "  cat curl.txt | codex-usage import\n",
        };
      }
      return envRun;
    }

    const blob = selected.blob;

    const authorization = blob.headers.authorization;
    if (!authorization) {
      return {
        exitCode: 1,
        stdout: "",
        stderr: "Stored auth missing authorization. Re-run: codex-usage import\n",
      };
    }

    const { authorization: _auth, ...restHeaders } = blob.headers;

    const json = await fetchUsage({
      url: blob.url,
      authorization,
      cookie: blob.cookie,
      headers: restHeaders,
      fetchFn: options.fetchFn,
      retry: options.retry,
    });

    const out = renderBars(json, {
      width: 24,
      columns: options.columns ?? getStdoutColumns(),
      verbose: options.verbose,
    });
    return { exitCode: 0, stdout: `${out}\n`, stderr: "" };
  } catch (err) {
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
    return { exitCode: 1, stdout: "", stderr: `Failed: ${msg}\n` };
  }
}

function formatDebug(prefix: string, err: { url: string; headerNames: string[]; status?: number }, debug: boolean): string {
  if (!debug) return prefix;
  const lines: string[] = [prefix.trimEnd()];
  lines.push(`debug: url=${err.url}`);
  if (typeof err.status === "number") lines.push(`debug: status=${err.status}`);
  if (err.headerNames.length > 0) lines.push(`debug: headers=${err.headerNames.join(",")}`);
  return lines.join("\n") + "\n";
}

function formatAuthExpired(err: AuthExpiredError, debug: boolean): string {
  let out = "Auth expired. Re-run: codex-usage import\n";
  if (!debug) return out;
  const lines: string[] = [out.trimEnd()];
  if (err.url) lines.push(`debug: url=${err.url}`);
  lines.push(`debug: status=${err.status}`);
  if (err.headerNames && err.headerNames.length > 0) {
    lines.push(`debug: headers=${err.headerNames.join(",")}`);
  }
  return lines.join("\n") + "\n";
}
