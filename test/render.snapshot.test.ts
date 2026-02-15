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

    const out = renderBars(data, { columns: null });
    expect(out).toMatchSnapshot();
  });

  test("throws on malformed response shape", () => {
    expect(() => renderBars({ nope: true })).toThrow("Unexpected JSON");
  });
});
