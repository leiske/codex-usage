import { describe, expect, test } from "bun:test";

import { clampPercent, renderBar } from "../src/ui/bar";

describe("clampPercent", () => {
  test("clamps < 0 to 0", () => {
    expect(clampPercent(-1)).toBe(0);
  });

  test("clamps > 100 to 100", () => {
    expect(clampPercent(101)).toBe(100);
  });

  test("passes through in-range values", () => {
    expect(clampPercent(42)).toBe(42);
  });

  test("treats NaN as 0", () => {
    expect(clampPercent(Number.NaN)).toBe(0);
  });
});

describe("renderBar", () => {
  test("renders 0% as empty bar", () => {
    expect(renderBar(0, 10)).toBe("[----------]");
  });

  test("renders 100% as full bar", () => {
    expect(renderBar(100, 10)).toBe("[##########]");
  });

  test("uses correct width math", () => {
    expect(renderBar(50, 10)).toBe("[#####-----]");
  });
});
