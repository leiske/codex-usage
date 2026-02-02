import type { AuthBlob } from "../auth/AuthBlob";
import { filterAllowedHeaders } from "../auth/allowlist";
import { parseCurl } from "../curl/parseCurl";
import type { Store } from "../store/Store";
import type { FileStoreOptions } from "../store/fileStore";
import { getDefaultStores } from "../store/defaultStores";
import { setWithFallback } from "../store/selectStore";

export type ImportResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

export type ImportOptions = {
  input?: string;
  // For Phase 2 tests: allow overriding file path/env.
  file?: FileStoreOptions;
  // For Phase 3 tests: allow injecting store list.
  stores?: Store[];
};

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export async function importCommandWithErrors(options: ImportOptions = {}): Promise<ImportResult> {
  try {
    const input = options.input ?? (await new Response(Bun.stdin).text());
    if (input.trim() === "") {
      return {
        exitCode: 1,
        stdout: "",
        stderr: "No input. Pipe a DevTools 'Copy as cURL' into stdin.\n",
      };
    }

    const parsed = parseCurl(input);
    const headers = filterAllowedHeaders(parsed.headers);
    if (!headers.authorization) {
      return {
        exitCode: 1,
        stdout: "",
        stderr: "Import failed: missing authorization header in cURL input.\n",
      };
    }

    const blob: AuthBlob = {
      url: parsed.url,
      headers,
      cookie: parsed.cookie,
      imported_at: nowSeconds(),
    };

    const stores = options.stores ?? getDefaultStores(options.file);
    const set = await setWithFallback(stores, blob);

    const note =
      set.store.kind === "file"
        ? "NOTE: using file fallback (unencrypted). Treat it like a password.\n"
        : "";

    return {
      exitCode: 0,
      stdout: "Auth imported. Run `codex-usage` to see the latest usage.\n",
      stderr: note,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { exitCode: 1, stdout: "", stderr: `Import failed: ${msg}\n` };
  }
}
