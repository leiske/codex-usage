import { describe, expect, test } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

import { run } from "../src/cli";

function tempHome(): string {
  const id = crypto.randomUUID();
  const tmp = Bun.env.TMPDIR && Bun.env.TMPDIR.trim() !== "" ? Bun.env.TMPDIR : "/tmp";
  return `${tmp}/codex-usage-test-${id}`;
}

async function writeAuthFile(home: string, token = "secret_token_value"): Promise<string> {
  const authPath = home;
  const idx = authPath.lastIndexOf("/");
  const authDir = idx > 0 ? authPath.slice(0, idx) : "/";
  await mkdir(authDir, { recursive: true });

  const json = JSON.stringify(
    {
      OPENAI_API_KEY: null,
      tokens: {
        access_token: token,
      },
      last_refresh: "2026-01-01T00:00:00.000Z",
    },
    null,
    2,
  );
  await Bun.write(authPath, json + "\n");
  return authPath;
}

function setAuthEnv(home: string | null, codexHome: string | null): () => void {
  const previous = Bun.env.HOME;
  const previousCodexHome = Bun.env.CODEX_HOME;

  if (home === null) {
    delete Bun.env.HOME;
  } else {
    Bun.env.HOME = home;
  }

  if (codexHome === null) {
    delete Bun.env.CODEX_HOME;
  } else {
    Bun.env.CODEX_HOME = codexHome;
  }

  return () => {
    if (previous === undefined) {
      delete Bun.env.HOME;
    } else {
      Bun.env.HOME = previous;
    }

    if (previousCodexHome === undefined) {
      delete Bun.env.CODEX_HOME;
    } else {
      Bun.env.CODEX_HOME = previousCodexHome;
    }
  };
}

describe("run", () => {
  test("renders two bars from fetched JSON", async () => {
    const sample = {
      rate_limit: {
        primary_window: { used_percent: 12.3, reset_after_seconds: 620 },
        secondary_window: { used_percent: 98, reset_after_seconds: 90000 },
      },
    };

    const home = tempHome();
    await writeAuthFile(join(home, ".codex", "auth.json"), "secret_token_value");
    const restoreHome = setAuthEnv(home, null);

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (_input: unknown, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      expect(headers.get("authorization")).toBe("Bearer secret_token_value");
      expect(headers.get("cookie")).toBeNull();
      return new Response(JSON.stringify(sample), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as unknown as typeof fetch;

    try {
      const result = await run([]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe("");
      expect(result.stdout).toContain("5-hour");
      expect(result.stdout).toContain("Weekly");
      expect(result.stdout).toContain("12%");
      expect(result.stdout).toContain("98%");
      expect(result.stdout).toContain("10m 20s");
      expect(result.stdout).toContain("1d 1h");
    } finally {
      globalThis.fetch = originalFetch;
      restoreHome();
      await rm(home, { recursive: true, force: true });
    }
  });

  test("prints request failure on non-2xx", async () => {
    const home = tempHome();
    await writeAuthFile(join(home, ".codex", "auth.json"), "token");
    const restoreHome = setAuthEnv(home, null);

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response("forbidden", {
        status: 403,
        headers: { "content-type": "text/plain" },
      })) as unknown as typeof fetch;

    try {
      const result = await run([]);

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toBe("");
      expect(result.stderr).toContain("Request failed. HTTP 403");
      expect(result.stderr).toContain("forbidden");
    } finally {
      globalThis.fetch = originalFetch;
      restoreHome();
      await rm(home, { recursive: true, force: true });
    }
  });

  test("prints missing auth path when codex auth file is absent", async () => {
    const home = tempHome();
    const restoreHome = setAuthEnv(home, null);

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      throw new Error("fetch should not run without auth");
    }) as unknown as typeof fetch;

    try {
      const result = await run([]);
      expect(result.exitCode).toBe(1);
      expect(result.stdout).toBe("");
      expect(result.stderr).toContain("Missing auth to query usage");
      expect(result.stderr).toContain(`${home}/.codex/auth.json`);
    } finally {
      globalThis.fetch = originalFetch;
      restoreHome();
      await rm(home, { recursive: true, force: true });
    }
  });

  test("uses CODEX_HOME/auth.json when set", async () => {
    const home = tempHome();
    const codexHome = tempHome();
    await writeAuthFile(join(codexHome, "auth.json"), "codex-home-token");
    const restoreHome = setAuthEnv(home, codexHome);

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (_input: unknown, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      expect(headers.get("authorization")).toBe("Bearer codex-home-token");
      return new Response(
        JSON.stringify({
          rate_limit: {
            primary_window: { used_percent: 1, reset_after_seconds: 60 },
            secondary_window: { used_percent: 2, reset_after_seconds: 120 },
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    }) as unknown as typeof fetch;

    try {
      const result = await run([]);
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe("");
      expect(result.stdout).toContain("5-hour");
      expect(result.stdout).toContain("Weekly");
    } finally {
      globalThis.fetch = originalFetch;
      restoreHome();
      await rm(home, { recursive: true, force: true });
      await rm(codexHome, { recursive: true, force: true });
    }
  });

  test("prints help text", async () => {
    const result = await run(["--help"]);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Usage:");
    expect(result.stdout).toContain("codex-usage --help");
  });
});
