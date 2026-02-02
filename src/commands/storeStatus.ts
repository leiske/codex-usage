import type { Store } from "../store/Store";
import { getDefaultStores } from "../store/defaultStores";
import { getDefaultAuthPath, type FileStoreOptions } from "../store/fileStore";

export type StoreStatusResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

export type StoreStatusOptions = {
  stores?: Store[];
  file?: FileStoreOptions;
};

export async function storeStatusCommandWithErrors(options: StoreStatusOptions = {}): Promise<StoreStatusResult> {
  try {
    const stores = options.stores ?? getDefaultStores(options.file);

    let used: string | null = null;
    const lines: string[] = [];

    for (const s of stores) {
      const available = await s.isAvailable().catch(() => false);
      if (!available) {
        lines.push(`${s.kind}: unavailable`);
        continue;
      }

      let hasAuth = false;
      try {
        hasAuth = (await s.get()) !== null;
      } catch {
        // Treat parse/config errors as "available" but "no auth".
        hasAuth = false;
      }

      lines.push(`${s.kind}: available${hasAuth ? " (has auth)" : ""}`);
      if (used === null && hasAuth) used = s.kind;
    }

    if (used === null) {
      // Pick the first available store as the preferred target.
      for (const s of stores) {
        if (await s.isAvailable().catch(() => false)) {
          used = s.kind;
          break;
        }
      }
    }

    const env = options.file?.env ?? (Bun.env as Record<string, string | undefined>);
    const path = options.file?.authPath ?? getDefaultAuthPath(env);
    lines.push(`file_path: ${path}`);
    lines.push(`active: ${used ?? "none"}`);

    return { exitCode: 0, stdout: lines.join("\n") + "\n", stderr: "" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { exitCode: 1, stdout: "", stderr: `Failed: ${msg}\n` };
  }
}
