import { AuthExpiredError } from "../errors";
import { fetchUsage, type FetchFn } from "../fetchUsage";
import { renderBars } from "../renderBars";
import { fileStoreGet, type FileStoreOptions } from "../store/fileStore";

export type RunStoredResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

export type RunStoredOptions = {
  fetchFn?: FetchFn;
  barWidth?: number;
  store?: FileStoreOptions;
};

export async function runStoredCommandWithErrors(options: RunStoredOptions = {}): Promise<RunStoredResult> {
  try {
    const blob = await fileStoreGet(options.store);
    if (!blob) {
      return {
        exitCode: 1,
        stdout: "",
        stderr: "No stored auth. Run: codex-usage import < curl.txt\n",
      };
    }

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
    });

    const out = renderBars(json, { width: options.barWidth ?? 24 });
    return { exitCode: 0, stdout: `${out}\n`, stderr: "" };
  } catch (err) {
    if (err instanceof AuthExpiredError) {
      return {
        exitCode: 1,
        stdout: "",
        stderr: "Auth expired. Re-run: codex-usage import\n",
      };
    }

    const msg = err instanceof Error ? err.message : String(err);
    return { exitCode: 1, stdout: "", stderr: `Failed: ${msg}\n` };
  }
}
