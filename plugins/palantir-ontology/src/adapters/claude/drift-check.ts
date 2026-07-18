// Self-contained drift/hand-edit detector for the Claude binding artifact
// (ledger row A630). Reimplements `scripts/generated-check.ts`'s
// `checkArtifact` recompute-and-diff discipline locally, because
// `scripts/generated-check.ts` is outside this row's exact write set (only
// A610 holds `scripts/**` — decisions/w6-write-set-adjudication.md). This
// is exercised by `generated-check.test.ts` via `bun test` (section-11.2
// "test"), proving the same "a hand-edit is detected and fails" guarantee
// without a write to the shared script — mirroring A620's identical
// `src/adapters/codex/drift-check.ts` (this row's colocated copy, never
// imported cross-adapter). See `outputs/a610-runtime-adapters.md`'s
// `## A630` section for this scope note filed with the Lead.

import { readFileSync } from "node:fs";

export interface ClaudeGeneratedCheckResult {
  readonly headerOk: boolean;
  readonly driftOk: boolean;
  readonly onDiskMissing: boolean;
}

export function checkClaudeBindingArtifact(outputPath: string, header: string, regenerate: () => string): ClaudeGeneratedCheckResult {
  const recomputed = regenerate();
  const headerOk = recomputed.startsWith(header);

  let onDisk: string | null = null;
  let onDiskMissing = false;
  try {
    onDisk = readFileSync(outputPath, "utf8");
  } catch {
    onDiskMissing = true;
  }

  const driftOk = onDisk !== null && onDisk === recomputed;
  return { headerOk, driftOk, onDiskMissing };
}
