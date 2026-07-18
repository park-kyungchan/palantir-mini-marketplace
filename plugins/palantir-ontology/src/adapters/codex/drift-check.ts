// Self-contained drift/hand-edit detector for the Codex binding artifact
// (ledger row A620). Reimplements `scripts/generated-check.ts`'s
// `checkArtifact` recompute-and-diff discipline locally, because
// `scripts/generated-check.ts` is outside this row's exact write set (only
// A610 holds `scripts/**` — decisions/w6-write-set-adjudication.md). This
// is exercised by `generated-check.test.ts` via `bun test` (section-11.2
// "test"), proving the same "a hand-edit is detected and fails" guarantee
// without a write to the shared script. See `outputs/a610-runtime-
// adapters.md`'s `## A620` section for this scope note filed with the
// Lead.

import { readFileSync } from "node:fs";

export interface CodexGeneratedCheckResult {
  readonly headerOk: boolean;
  readonly driftOk: boolean;
  readonly onDiskMissing: boolean;
}

export function checkCodexBindingArtifact(outputPath: string, header: string, regenerate: () => string): CodexGeneratedCheckResult {
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
