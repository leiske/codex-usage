import { describe, expect, test } from "bun:test";

import { parseCurl } from "../src/curl/parseCurl";

describe("parseCurl", () => {
  test("parses single-quoted headers", () => {
    const input =
      "curl 'https://chatgpt.com/backend-api/wham/usage' -H 'accept: */*' -H 'authorization: Bearer token' -H 'user-agent: UA'";
    const out = parseCurl(input);
    expect(out.url).toBe("https://chatgpt.com/backend-api/wham/usage");
    expect(out.headers.accept).toBe("*/*");
    expect(out.headers.authorization).toBe("Bearer token");
    expect(out.headers["user-agent"]).toBe("UA");
  });

  test("parses double-quoted headers and line continuations", () => {
    const input =
      "curl \"https://chatgpt.com/backend-api/wham/usage\" \\\n+        -H \"Authorization: Bearer token\" \\\n+        -H \"OAI-Device-Id: abc\" \\\n+        --compressed";
    const out = parseCurl(input);
    expect(out.url).toBe("https://chatgpt.com/backend-api/wham/usage");
    expect(out.headers.authorization).toBe("Bearer token");
    expect(out.headers["oai-device-id"]).toBe("abc");
  });

  test("prefers -b/--cookie over Cookie header", () => {
    const input =
      "curl 'https://chatgpt.com/backend-api/wham/usage' -H 'cookie: a=b' -b 'c=d' -H 'authorization: Bearer token'";
    const out = parseCurl(input);
    expect(out.cookie).toBe("c=d");
    expect(out.headers.authorization).toBe("Bearer token");
  });

  test("captures cookie from Cookie header when -b is absent", () => {
    const input =
      "curl 'https://chatgpt.com/backend-api/wham/usage' -H 'Cookie: a=b; c=d' -H 'authorization: Bearer token'";
    const out = parseCurl(input);
    expect(out.cookie).toBe("a=b; c=d");
  });
});
