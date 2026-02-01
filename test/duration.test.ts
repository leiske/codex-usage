import { describe, expect, test } from "bun:test";

import { formatDuration } from "../src/time/formatDuration";

describe("formatDuration", () => {
  test("formats seconds to mm ss", () => {
    expect(formatDuration(620)).toBe("10m 20s");
  });

  test("formats days and hours", () => {
    expect(formatDuration(90000)).toBe("1d 1h");
  });
});
