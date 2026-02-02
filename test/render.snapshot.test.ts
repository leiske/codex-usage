import { describe, expect, test } from "bun:test";

import { renderBars } from "../src/renderBars";

describe("renderBars formatting", () => {
  test("default formatting snapshot", () => {
    const data = {
      rate_limit: {
        primary_window: { used_percent: 12.3, reset_after_seconds: 620 },
        secondary_window: { used_percent: 98, reset_after_seconds: 90000 },
      },
    };

    const out = renderBars(data, { width: 24, columns: null });
    expect(out).toMatchSnapshot();
  });

  test("narrow terminal reduces bar width", () => {
    const data = {
      rate_limit: {
        primary_window: { used_percent: 50, reset_after_seconds: 3600 },
        secondary_window: { used_percent: 50, reset_after_seconds: 3600 },
      },
    };

    const out = renderBars(data, { width: 24, columns: 50 });
    expect(out).toMatchSnapshot();
  });

  test("verbose includes reset_at", () => {
    const data = {
      rate_limit: {
        primary_window: { used_percent: 1, reset_after_seconds: 60 },
        secondary_window: { used_percent: 2, reset_after_seconds: 120 },
      },
    };

    const out = renderBars(data, { width: 24, columns: null, verbose: true, nowMs: 0 });
    expect(out).toContain("reset at");
    expect(out).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
  });
});
