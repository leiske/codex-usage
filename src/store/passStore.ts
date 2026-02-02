import type { AuthBlob } from "../auth/AuthBlob";
import { isAuthBlob } from "../auth/AuthBlob";
import type { Store } from "./Store";
import { runProc } from "./proc";

const ENTRY = "codex-usage/default";

export function passStore(): Store {
  return {
    kind: "pass",
    label: "pass",

    async isAvailable(): Promise<boolean> {
      const r = await runProc(["pass", "--version"]);
      return r.code === 0;
    },

    async get(): Promise<AuthBlob | null> {
      const r = await runProc(["pass", "show", ENTRY]);
      if (r.code !== 0) return null;
      const raw = r.stdout.trim();
      if (!raw) return null;
      const parsed = JSON.parse(raw) as unknown;
      if (!isAuthBlob(parsed)) throw new Error("pass entry has unexpected shape");
      return parsed;
    },

    async set(blob: AuthBlob): Promise<void> {
      const json = JSON.stringify(blob);
      const r = await runProc(["pass", "insert", "-m", "-f", ENTRY], json + "\n");
      if (r.code !== 0) throw new Error("pass insert failed");
    },

    async clear(): Promise<void> {
      const r = await runProc(["pass", "rm", "-f", ENTRY]);
      // If it's already missing, treat as success.
      if (r.code !== 0 && !r.stderr.includes("is not in the password store")) {
        throw new Error("pass rm failed");
      }
    },
  };
}
