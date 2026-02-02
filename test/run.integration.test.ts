import { describe, expect, test } from "bun:test";

import { runCommandWithErrors } from "../src/commands/run";

describe("runCommandWithErrors", () => {
  test("renders two bars from fetched JSON", async () => {
    const sample = {
      rate_limit: {
        primary_window: { used_percent: 12.3, reset_after_seconds: 620 },
        secondary_window: { used_percent: 98, reset_after_seconds: 90000 },
      },
    };

    const cookie = "secret_cookie_value";
    const authorization = "Bearer secret_token_value";

    const fetchFn = async () => {
      return new Response(JSON.stringify(sample), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    const result = await runCommandWithErrors({
      env: {
        CHATGPT_WHAM_URL: "https://example.test/backend-api/wham/usage",
        CHATGPT_COOKIE: cookie,
        CHATGPT_AUTHORIZATION: authorization,
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

    // Never echo secrets.
    expect(result.stdout).not.toContain(cookie);
    expect(result.stdout).not.toContain(authorization);
  });

  test("works with auth token only (no cookies)", async () => {
    const sample = {
      rate_limit: {
        primary_window: { used_percent: 1, reset_after_seconds: 1 },
        secondary_window: { used_percent: 2, reset_after_seconds: 2 },
      },
    };

    const fetchFn = async (input: any, init?: any) => {
      const headers = init?.headers as Record<string, string> | undefined;
      expect(headers?.authorization).toContain("Bearer");
      expect(headers?.cookie).toBeUndefined();
      return new Response(JSON.stringify(sample), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    const result = await runCommandWithErrors({
      env: {
        CHATGPT_WHAM_URL: "https://example.test/backend-api/wham/usage",
        CHATGPT_AUTHORIZATION: "Bearer token",
      },
      fetchFn: fetchFn as any,
      columns: 50,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("5-hour");
    expect(result.stdout).toContain("Weekly");
  });

  test("prints re-import instruction on 403", async () => {
    const fetchFn = async () => new Response("forbidden", { status: 403 });

    const result = await runCommandWithErrors({
      env: {
        CHATGPT_WHAM_URL: "https://example.test/backend-api/wham/usage",
        CHATGPT_COOKIE: "c",
        CHATGPT_AUTHORIZATION: "Bearer t",
      },
      fetchFn: fetchFn as any,
      debug: true,
    });

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Auth expired");
    expect(result.stderr).toContain("codex-usage import");
    expect(result.stderr).toContain("debug:");
  });

  test("prints actionable error on missing env", async () => {
    const result = await runCommandWithErrors({ env: {} });
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("CHATGPT_AUTHORIZATION");
  });

  test("retries on HTTP 5xx when configured", async () => {
    let calls = 0;
    const fetchFn = async () => {
      calls++;
      if (calls === 1) return new Response("oops", { status: 500 });
      return new Response(
        JSON.stringify({
          rate_limit: {
            primary_window: { used_percent: 0, reset_after_seconds: 1 },
            secondary_window: { used_percent: 0, reset_after_seconds: 1 },
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };

    const result = await runCommandWithErrors({
      env: {
        CHATGPT_WHAM_URL: "https://example.test/backend-api/wham/usage",
        CHATGPT_AUTHORIZATION: "Bearer t",
      },
      fetchFn: fetchFn as any,
      retry: 1,
    });

    expect(calls).toBe(2);
    expect(result.exitCode).toBe(0);
  });

  test("prints clear message on unexpected JSON shape", async () => {
    const fetchFn = async () => {
      return new Response(JSON.stringify({ nope: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    const result = await runCommandWithErrors({
      env: {
        CHATGPT_WHAM_URL: "https://example.test/backend-api/wham/usage",
        CHATGPT_AUTHORIZATION: "Bearer t",
      },
      fetchFn: fetchFn as any,
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Unexpected response shape");
  });
});
