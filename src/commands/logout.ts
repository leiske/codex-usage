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

    const failedKinds = failed.map((s) => s.kind);

    if (failedKinds.length === 0) {
      return { exitCode: 0, stdout: "Logged out.\n", stderr: "" };
    }

    return {
      exitCode: 1,
      stdout: "",
      stderr: `Logout incomplete. Failed to clear: ${failedKinds.join(", ")}\n`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { exitCode: 1, stdout: "", stderr: `Failed: ${msg}\n` };
  }
}
