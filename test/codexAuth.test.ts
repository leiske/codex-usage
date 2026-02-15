import { describe, expect, test } from "bun:test";

import { getDefaultCodexAuthPath, loadCodexAuth } from "../src/auth/codexAuth";

function tempAuthPath(): string {
  return `/tmp/codex-usage-test-${crypto.randomUUID()}/auth.json`;
}

async function mkdirpFor(path: string): Promise<void> {
  const idx = path.lastIndexOf("/");
  const dir = idx > 0 ? path.slice(0, idx) : "/";
  const proc = Bun.spawn(["mkdir", "-p", dir], { stdout: "ignore", stderr: "ignore" });
  const code = await proc.exited;
  if (code !== 0) throw new Error(`failed to mkdir ${dir}`);
}

describe("codex auth", () => {
  test("uses CODEX_HOME before HOME", () => {
    const path = getDefaultCodexAuthPath({ CODEX_HOME: "/x/.codex", HOME: "/home/ignored" });
    expect(path).toBe("/x/.codex/auth.json");
  });

  test("falls back to ~/.codex/auth.json", () => {
    const path = getDefaultCodexAuthPath({ HOME: "/home/me" });
    expect(path).toBe("/home/me/.codex/auth.json");
  });

  test("loads access_token and returns bearer header", async () => {
    const authPath = tempAuthPath();
    await mkdirpFor(authPath);
    await Bun.write(
      authPath,
      JSON.stringify({
        tokens: {
          access_token: "token-123",
        },
      }),
    );

    const out = await loadCodexAuth({ authPath });
    expect(out.authorization).toBe("Bearer token-123");
    expect(out.authPath).toBe(authPath);
  });

  test("throws when auth file is missing", async () => {
    const authPath = tempAuthPath();
    await expect(loadCodexAuth({ authPath })).rejects.toThrow(authPath);
  });

  test("throws when access_token is missing", async () => {
    const authPath = tempAuthPath();
    await mkdirpFor(authPath);
    await Bun.write(authPath, JSON.stringify({ tokens: {} }));

    await expect(loadCodexAuth({ authPath })).rejects.toThrow("missing tokens.access_token");
  });
});
