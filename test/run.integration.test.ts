import { describe, expect, test } from "bun:test";

import { run } from "../src/cli";

function tempAuthPath(): string {
  const id = crypto.randomUUID();
  const tmp = Bun.env.TMPDIR && Bun.env.TMPDIR.trim() !== "" ? Bun.env.TMPDIR : "/tmp";
  return `${tmp}/codex-usage-test-${id}/auth.json`;
}

async function writeAuthFile(path: string, token = "secret_token_value"): Promise<void> {
  const idx = path.lastIndexOf("/");
  const dir = idx > 0 ? path.slice(0, idx) : "/";
  const proc = Bun.spawn(["mkdir", "-p", dir], { stdout: "ignore", stderr: "ignore" });
  const code = await proc.exited;
  if (code !== 0) throw new Error(`failed to mkdir ${dir}`);

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
  await Bun.write(path, json + "\n");
}

describe("run", () => {
  test("renders two bars from fetched JSON", async () => {
    const sample = {
      rate_limit: {
        primary_window: { used_percent: 12.3, reset_after_seconds: 620 },
        secondary_window: { used_percent: 98, reset_after_seconds: 90000 },
      },
    };

    const authPath = tempAuthPath();
    await writeAuthFile(authPath, "secret_token_value");

    const fetchFn = async (_input: any, init?: any) => {
      const headers = init?.headers as Record<string, string> | undefined;
      expect(headers?.authorization).toBe("Bearer secret_token_value");
      expect(headers?.cookie).toBeUndefined();
      return new Response(JSON.stringify(sample), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    const result = await run({
      argv: [],
      authPath,
      env: {
        CHATGPT_WHAM_URL: "https://example.test/backend-api/wham/usage",
      },
      fetchFn: fetchFn as any,
      columns: 50,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("5-hour");
    expect(result.stdout).toContain("Weekly");
    expect(result.stdout).toContain("12%");
    expect(result.stdout).toContain("98%");
    expect(result.stdout).toContain("10m 20s");
    expect(result.stdout).toContain("1d 1h");
  });

  test("prints auth expired status and API code on 403", async () => {
    const authPath = tempAuthPath();
    await writeAuthFile(authPath, "token");

    const fetchFn = async () =>
      new Response(JSON.stringify({ error: { code: "token_expired" } }), {
        status: 403,
        headers: { "content-type": "application/json" },
      });

    const result = await run({
      argv: [],
      authPath,
      env: {
        CHATGPT_WHAM_URL: "https://example.test/backend-api/wham/usage",
      },
      fetchFn: fetchFn as any,
    });

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Auth expired.");
    expect(result.stderr).toContain("HTTP 403");
    expect(result.stderr).toContain("token_expired");
  });

  test("prints missing auth path when codex auth file is absent", async () => {
    const authPath = tempAuthPath();

    const result = await run({ argv: [], authPath });
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Missing auth to query usage");
    expect(result.stderr).toContain(authPath);
  });
});
