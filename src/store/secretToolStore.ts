import type { AuthBlob } from "../auth/AuthBlob";
import { isAuthBlob } from "../auth/AuthBlob";
import type { Store } from "./Store";
import { runProc } from "./proc";

const SERVICE = "codex-usage";
const ACCOUNT = "default";
const LABEL = "codex-usage auth";

export function secretToolStore(): Store {
  return {
    kind: "secret-tool",
    label: "secret-tool",

    async isAvailable(): Promise<boolean> {
      const r = await runProc(["secret-tool", "--version"]);
      return r.code === 0;
    },

    async get(): Promise<AuthBlob | null> {
      const r = await runProc(["secret-tool", "lookup", "service", SERVICE, "account", ACCOUNT]);
      if (r.code !== 0) return null;
      const raw = r.stdout.trim();
      if (!raw) return null;

      const parsed = JSON.parse(raw) as unknown;
      if (!isAuthBlob(parsed)) throw new Error("Secret-tool value has unexpected shape");
      return parsed;
    },

    async set(blob: AuthBlob): Promise<void> {
      const json = JSON.stringify(blob);
      const r = await runProc(
        [
          "secret-tool",
          "store",
          `--label=${LABEL}`,
          "service",
          SERVICE,
          "account",
          ACCOUNT,
        ],
        json,
      );
      if (r.code !== 0) throw new Error("secret-tool store failed");
    },

    async clear(): Promise<void> {
      const r = await runProc(["secret-tool", "clear", "service", SERVICE, "account", ACCOUNT]);
      if (r.code !== 0) throw new Error("secret-tool clear failed");
    },
  };
}
