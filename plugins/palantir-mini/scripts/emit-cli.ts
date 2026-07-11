// palantir-mini — scripts/emit-cli.ts (P1 unification S2 cross-tree contract surface)
//
// LOCKED CONTRACT: reads exactly ONE envelope JSON object from stdin, routes it
// through the SAME emit() in scripts/log.ts (which grades via autoGradeEnvelope
// and appends via appendEventAtomic — this CLI does NOT reimplement any of that),
// and reports the result as one JSON line.
//
//   - stdin: exactly one JSON object shaped like LogEnvelope
//     (type, payload, toolName, cwd, plus the optional withWhat/lineage/grade fields).
//   - project root resolution: identical to scripts/log.ts — emit() itself calls
//     resolveEmitRoot(envelope.cwd), which is PALANTIR_MINI_PROJECT env var when
//     set, else findProjectRoot() walked up from envelope.cwd (or process.cwd()
//     when envelope.cwd is absent). No separate resolution logic lives here.
//   - success: {"ok":true,"sequence":<n>} to stdout, exit 0.
//   - failure (malformed JSON / structural validation / append error):
//     {"ok":false,"error":"..."} to stderr, exit nonzero.
//
// Usage: echo '{"type":"...","payload":{...},"toolName":"...","cwd":"..."}' \
//          | bun run scripts/emit-cli.ts

import { emit, type LogEnvelope } from "./log";

/** Read the whole of stdin as text. Injectable for tests (mirrors lib/codex/codex-hook-adapter.ts readPayload). */
async function readStdin(stdinText?: string): Promise<string> {
  return stdinText ?? (await Bun.stdin.text());
}

/**
 * Parse + minimally structurally validate ONE envelope JSON object from raw
 * stdin text. Throws on malformed input (caller reports {"ok":false,"error"}).
 * Deliberately shallow — full 5-dim / grading validation is emit()'s job
 * (via autoGradeEnvelope), not this CLI's; this only guards against a
 * non-object / non-JSON stdin payload.
 */
export function parseEnvelope(raw: string): LogEnvelope {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`stdin is not valid JSON: ${(e as Error).message}`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("stdin must be a single JSON object (LogEnvelope)");
  }
  const o = parsed as Record<string, unknown>;
  if (typeof o.type !== "string" || o.type.trim().length === 0) {
    throw new Error("envelope.type must be a non-empty string");
  }
  if (o.payload === undefined || o.payload === null || typeof o.payload !== "object") {
    throw new Error("envelope.payload must be an object");
  }
  return parsed as LogEnvelope;
}

/** Read stdin, parse it, and emit() the one envelope. Returns the assigned sequence. */
export async function emitFromStdin(stdinText?: string): Promise<number> {
  const raw = await readStdin(stdinText);
  const envelope = parseEnvelope(raw);
  return emit(envelope);
}

if (import.meta.main) {
  emitFromStdin()
    .then((sequence) => {
      process.stdout.write(JSON.stringify({ ok: true, sequence }) + "\n");
      process.exit(0);
    })
    .catch((e: unknown) => {
      process.stderr.write(
        JSON.stringify({ ok: false, error: (e as Error)?.message ?? String(e) }) + "\n",
      );
      process.exit(1);
    });
}
