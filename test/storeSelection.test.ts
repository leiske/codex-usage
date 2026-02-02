import { describe, expect, test } from "bun:test";

import type { AuthBlob } from "../src/auth/AuthBlob";
import { getFirstAuth, setWithFallback } from "../src/store/selectStore";
import type { Store } from "../src/store/Store";

function blob(): AuthBlob {
  return {
    url: "https://example.test/backend-api/wham/usage",
    headers: { authorization: "Bearer t" },
    imported_at: 1,
  };
}

function fakeStore(kind: Store["kind"], opts: { available: boolean; hasAuth?: boolean; setFails?: boolean }): Store {
  let stored: AuthBlob | null = opts.hasAuth ? blob() : null;
  return {
    kind,
    label: kind,
    async isAvailable() {
      return opts.available;
    },
    async get() {
      return stored;
    },
    async set(b) {
      if (opts.setFails) throw new Error("set failed");
      stored = b;
    },
    async clear() {
      stored = null;
    },
  };
}

describe("store selection", () => {
  test("getFirstAuth returns the first store that has auth", async () => {
    const stores: Store[] = [
      fakeStore("secret-tool", { available: true, hasAuth: false }),
      fakeStore("pass", { available: true, hasAuth: true }),
      fakeStore("file", { available: true, hasAuth: true }),
    ];

    const selected = await getFirstAuth(stores);
    expect(selected?.store.kind).toBe("pass");
  });

  test("setWithFallback falls back when preferred store set fails", async () => {
    const stores: Store[] = [
      fakeStore("secret-tool", { available: true, setFails: true }),
      fakeStore("pass", { available: true }),
      fakeStore("file", { available: true }),
    ];

    const r = await setWithFallback(stores, blob());
    expect(r.store.kind).toBe("pass");
    expect(r.usedFallback).toBe(true);
  });
});
