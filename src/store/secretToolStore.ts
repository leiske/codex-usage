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
      const probe = await runProc([
        "secret-tool",
        "lookup",
        "service",
        "codex-usage-probe",
        "account",
        "probe",
      ]);

      // If the binary is missing, Bun.spawn typically fails with ENOENT -> runProc returns 127.
      if (probe.code === 127) return false;

      // Binary exists, but Secret Service might not be running (common on headless/WSL).
      if (probe.code === 0) return true;
      const e = probe.stderr.trim();
      if (e === "") return true; // "not found" case
      const low = e.toLowerCase();
      if (
        low.includes("no such secret service") ||
        low.includes("couldn't connect") ||
        low.includes("could not connect") ||
        low.includes("cannot autolaunch") ||
        low.includes("dbus")
      ) {
        return false;
      }
      // Unknown error: treat as unavailable to avoid silently selecting it.
      return false;
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
        json + "\n",
      );
      if (r.code !== 0) {
        const msg = (r.stderr || r.stdout).trim();
        throw new Error(msg ? `secret-tool store failed: ${msg}` : "secret-tool store failed");
      }
    },

    async clear(): Promise<void> {
      const r = await runProc(["secret-tool", "clear", "service", SERVICE, "account", ACCOUNT]);
      if (r.code === 0) return;
      const msg = (r.stderr || r.stdout).trim();
      if (msg === "") return;
      const low = msg.toLowerCase();
      // Idempotent logout: missing entry is fine.
      if (low.includes("not found") || low.includes("no such") || low.includes("does not exist")) return;
      throw new Error(msg ? `secret-tool clear failed: ${msg}` : "secret-tool clear failed");
    },
  };
}
