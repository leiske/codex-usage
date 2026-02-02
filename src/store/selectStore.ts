import type { AuthBlob } from "../auth/AuthBlob";
import type { Store } from "./Store";

export type SelectedAuth = {
  store: Store;
  blob: AuthBlob;
};

export async function getFirstAuth(stores: Store[]): Promise<SelectedAuth | null> {
  for (const s of stores) {
    if (!(await s.isAvailable())) continue;
    const blob = await s.get();
    if (blob) return { store: s, blob };
  }
  return null;
}

export type SetResult = {
  store: Store;
  usedFallback: boolean;
  failures: Array<{ kind: Store["kind"]; message: string }>;
};

export async function setWithFallback(stores: Store[], blob: AuthBlob): Promise<SetResult> {
  const available: Store[] = [];
  for (const s of stores) {
    if (await s.isAvailable()) available.push(s);
  }
  if (available.length === 0) throw new Error("No available stores");

  const preferred = available[0]!;
  const failures: Array<{ kind: Store["kind"]; message: string }> = [];
  for (let i = 0; i < available.length; i++) {
    const s = available[i]!;
    try {
      await s.set(blob);
      return { store: s, usedFallback: i !== 0, failures };
    } catch (err) {
      // Try next store.
      const msg = err instanceof Error ? err.message : String(err);
      failures.push({ kind: s.kind, message: msg });
    }
  }

  // If everything failed, throw the preferred error context.
  throw new Error(`Failed to store auth using ${preferred.label}`);
}

export async function clearAllAvailable(stores: Store[]): Promise<{ cleared: Store[]; failed: Store[] }> {
  const cleared: Store[] = [];
  const failed: Store[] = [];
  for (const s of stores) {
    if (!(await s.isAvailable())) continue;
    try {
      await s.clear();
      cleared.push(s);
    } catch {
      failed.push(s);
    }
  }
  return { cleared, failed };
}
