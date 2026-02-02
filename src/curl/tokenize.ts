export function tokenizeShellLike(input: string): string[] {
  const tokens: string[] = [];
  let cur = "";
  let mode: "none" | "single" | "double" = "none";

  const push = () => {
    if (cur.length > 0) tokens.push(cur);
    cur = "";
  };

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!;

    if (mode === "none") {
      if (ch === "'") {
        mode = "single";
        continue;
      }
      if (ch === '"') {
        mode = "double";
        continue;
      }

      if (ch === "\\") {
        const next = input[i + 1];
        if (next === "\n") {
          i++;
          continue;
        }
        if (next !== undefined) {
          cur += next;
          i++;
          continue;
        }
      }

      if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
        push();
        continue;
      }

      cur += ch;
      continue;
    }

    if (mode === "single") {
      if (ch === "'") {
        mode = "none";
        continue;
      }
      cur += ch;
      continue;
    }

    // double
    if (ch === '"') {
      mode = "none";
      continue;
    }

    if (ch === "\\") {
      const next = input[i + 1];
      if (next !== undefined) {
        cur += next;
        i++;
        continue;
      }
    }
    cur += ch;
  }

  push();
  return tokens;
}
