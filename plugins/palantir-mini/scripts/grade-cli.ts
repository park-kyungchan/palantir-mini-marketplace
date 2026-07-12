// palantir-mini — scripts/grade-cli.ts (P1 unification S3: HOME-side consult surface for
// the canonical rule-26 5-axis grader)
//
// LOCKED CONTRACT: reads exactly ONE JSON GradeableEnvelope-shaped object from stdin,
// grades it via the SAME autoGradeEnvelope the plugin's own emit path uses (imported
// verbatim from the schemas package — this CLI does NOT reimplement grading), and
// reports the result as one JSON line. GRADING ONLY: no filesystem writes, no
// events.jsonl append, no side effects of any kind — a pure function of stdin.
//
// Consumer: home-side tools/cartography/lib/decision-gate.ts (advisory cross-check of
// the home g12 T0 gate against pm's canonical grading, landing separately). Reached via
// subprocess ONLY — LD1 design (see tools/cartography/lib/mirror-skip.ts's header):
// the home tree never takes a static dependency on the marketplace schemas package,
// so this CLI is the sole cross-tree contract surface for grading, mirroring
// scripts/emit-cli.ts's subprocess pattern for emission.
//
//   - stdin: exactly one JSON object shaped like GradeableEnvelope
//     (when, atopWhich, throughWhich, byWhom, withWhat, lineageRefs, payload — all
//     optional/loose; the grader's job is to inspect presence/absence).
//   - success: {"ok":true,"grade":"<T0..T4>"} to stdout, exit 0.
//   - failure (malformed JSON / non-object stdin): {"ok":false,"error":"..."} to
//     stderr, exit nonzero.
//
// Usage: echo '{"when":"...","atopWhich":"...","throughWhich":{...},"byWhom":{...}}' \
//          | bun run scripts/grade-cli.ts

import { autoGradeEnvelope } from "#schemas/ontology/lineage/value-grade-grading";
import type { GradeableEnvelope } from "#schemas/ontology/lineage/value-grade-grading";

/** Read the whole of stdin as text. Injectable for tests (mirrors scripts/emit-cli.ts). */
async function readStdin(stdinText?: string): Promise<string> {
  return stdinText ?? (await Bun.stdin.text());
}

/**
 * Parse + minimally structurally validate ONE GradeableEnvelope-shaped JSON object
 * from raw stdin text. Throws on malformed input (caller reports {"ok":false,"error"}).
 * Deliberately shallow — GradeableEnvelope's fields are all optional/loose by design
 * (the grader inspects presence/absence), so this only guards against non-JSON /
 * non-object stdin.
 */
export function parseGradeableEnvelope(raw: string): GradeableEnvelope {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`stdin is not valid JSON: ${(e as Error).message}`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("stdin must be a single JSON object (GradeableEnvelope)");
  }
  return parsed as GradeableEnvelope;
}

/** Read stdin, parse it, and grade the one envelope. Pure — no side effects. */
export async function gradeFromStdin(stdinText?: string): Promise<ReturnType<typeof autoGradeEnvelope>> {
  const raw = await readStdin(stdinText);
  const envelope = parseGradeableEnvelope(raw);
  return autoGradeEnvelope(envelope);
}

if (import.meta.main) {
  gradeFromStdin()
    .then((grade) => {
      process.stdout.write(JSON.stringify({ ok: true, grade }) + "\n");
      process.exit(0);
    })
    .catch((e: unknown) => {
      process.stderr.write(
        JSON.stringify({ ok: false, error: (e as Error)?.message ?? String(e) }) + "\n",
      );
      process.exit(1);
    });
}
