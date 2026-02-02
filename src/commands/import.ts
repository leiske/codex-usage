import type { AuthBlob } from "../auth/AuthBlob";
import { filterAllowedHeaders } from "../auth/allowlist";
import { parseCurl } from "../curl/parseCurl";
import { fileStoreSet, getDefaultAuthPath, type FileStoreOptions } from "../store/fileStore";

export type ImportResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

export type ImportOptions = {
  input?: string;
  store?: FileStoreOptions;
};

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function describeStored(blob: AuthBlob): string {
  const headerNames = Object.keys(blob.headers).sort();
  const cookie = blob.cookie ? "yes" : "no";
  return `headers=${headerNames.join(",")} cookie=${cookie}`;
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

    await fileStoreSet(blob, options.store);

    const env = options.store?.env ?? (Bun.env as Record<string, string | undefined>);
    const path = options.store?.authPath ?? getDefaultAuthPath(env);

    return {
      exitCode: 0,
      stdout: `Imported auth to ${path} (${describeStored(blob)})\n`,
      stderr:
        "WARNING: auth is stored unencrypted on disk. Treat it like a password.\n",
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { exitCode: 1, stdout: "", stderr: `Import failed: ${msg}\n` };
  }
}
