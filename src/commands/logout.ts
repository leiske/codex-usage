import type { Store } from "../store/Store";
import { getDefaultStores } from "../store/defaultStores";
import { clearAllAvailable } from "../store/selectStore";
import type { FileStoreOptions } from "../store/fileStore";

export type LogoutResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

export type LogoutOptions = {
  stores?: Store[];
  file?: FileStoreOptions;
};

export async function logoutCommandWithErrors(options: LogoutOptions = {}): Promise<LogoutResult> {
  try {
    const stores = options.stores ?? getDefaultStores(options.file);
    const { cleared, failed } = await clearAllAvailable(stores);

    const clearedKinds = cleared.map((s) => s.kind);
    const failedKinds = failed.map((s) => s.kind);

    const parts: string[] = [];
    parts.push(`Cleared: ${clearedKinds.length > 0 ? clearedKinds.join(", ") : "none"}`);
    if (failedKinds.length > 0) parts.push(`Failed: ${failedKinds.join(", ")}`);
    return { exitCode: failedKinds.length > 0 ? 1 : 0, stdout: parts.join("\n") + "\n", stderr: "" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { exitCode: 1, stdout: "", stderr: `Failed: ${msg}\n` };
  }
}
