export type ProcResult = {
  code: number;
  stdout: string;
  stderr: string;
};

export async function runProc(argv: string[], input?: string): Promise<ProcResult> {
  let proc: ReturnType<typeof Bun.spawn>;
  try {
    proc = Bun.spawn(argv, {
      stdin: input !== undefined ? "pipe" : "ignore",
      stdout: "pipe",
      stderr: "pipe",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { code: 127, stdout: "", stderr: msg };
  }

  if (input !== undefined) {
    const sink = proc.stdin;
    if (!sink || typeof sink === "number") throw new Error("Internal error: expected stdin pipe");
    sink.write(input);
    sink.end();
  }

  const out = proc.stdout;
  const err = proc.stderr;
  if (!out || typeof out === "number") throw new Error("Internal error: expected stdout pipe");
  if (!err || typeof err === "number") throw new Error("Internal error: expected stderr pipe");

  const [stdout, stderr, code] = await Promise.all([
    new Response(out).text(),
    new Response(err).text(),
    proc.exited,
  ]);

  return { code, stdout, stderr };
}
