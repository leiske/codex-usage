export type CliFlags = {
  help: boolean;
  version: boolean;
  debug: boolean;
  verbose: boolean;
  retry: number;
};

export function parseCliFlags(argv: string[]): { flags: CliFlags; positionals: string[] } {
  const flags: CliFlags = { help: false, version: false, debug: false, verbose: false, retry: 0 };
  const positionals: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;

    if (a === "--debug") {
      flags.debug = true;
      continue;
    }
    if (a === "--verbose") {
      flags.verbose = true;
      continue;
    }

    if (a === "--help" || a === "-h") {
      flags.help = true;
      continue;
    }
    if (a === "--version" || a === "-v") {
      flags.version = true;
      continue;
    }

    if (a === "--retry") {
      const next = argv[i + 1];
      if (!next) throw new Error("--retry requires a number");
      const n = Number(next);
      if (!Number.isFinite(n) || n < 0) throw new Error("--retry must be >= 0");
      flags.retry = Math.floor(n);
      i++;
      continue;
    }

    if (a.startsWith("--retry=")) {
      const raw = a.slice("--retry=".length);
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) throw new Error("--retry must be >= 0");
      flags.retry = Math.floor(n);
      continue;
    }

    if (a.startsWith("-")) continue;

    positionals.push(a);
  }

  return { flags, positionals };
}
