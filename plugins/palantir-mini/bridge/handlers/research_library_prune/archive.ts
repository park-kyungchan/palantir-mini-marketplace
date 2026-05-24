// palantir-mini v3.4.0 — research_library_prune sibling: archive (mutation + emit)

import * as fs from "fs";
import * as path from "path";
import { emit } from "../../../scripts/log";
import type { PruneCandidate } from "./types";

export interface RunArchiveResult {
  movedCount: number;
  errorCount: number;
}

/**
 * Move flagged candidates to their archive paths. Mutates the `moved` /
 * `moveError` fields on each candidate in-place.
 */
export function runArchiveMoves(candidates: PruneCandidate[]): RunArchiveResult {
  let movedCount = 0;
  let errorCount = 0;

  for (const candidate of candidates) {
    try {
      const archiveSubdir = path.dirname(candidate.archivePath);
      fs.mkdirSync(archiveSubdir, { recursive: true });
      try {
        fs.renameSync(candidate.path, candidate.archivePath);
      } catch {
        // Cross-device move fallback
        const content = fs.readFileSync(candidate.path);
        fs.writeFileSync(candidate.archivePath, content);
        fs.unlinkSync(candidate.path);
      }
      candidate.moved = true;
      movedCount += 1;
    } catch (e) {
      candidate.moveError = (e as Error).message;
      errorCount += 1;
    }
  }

  return { movedCount, errorCount };
}

/**
 * Emit the `research_library_pruned` event (5-dim envelope, rule 10) ONLY when
 * archive moves actually happened (caller guards on dryRun=false).
 */
export async function emitPruneEvent(args: {
  movedCandidates: PruneCandidate[];
  staleAgeDays: number;
  libraryRoot: string;
  movedCount: number;
  agentName?: string;
}): Promise<void> {
  await emit({
    type: "research_library_pruned",
    payload: {
      archived: args.movedCandidates.map((c) => c.relativePath),
      threshold: args.staleAgeDays,
      libraryRoot: args.libraryRoot,
    },
    toolName: "research_library_prune",
    cwd: args.libraryRoot,
    agentName: args.agentName,
    reasoning: `Pruned ${args.movedCount} stale/uncited docs from ${args.libraryRoot} (staleAgeDays=${args.staleAgeDays}).`,
    hypothesis:
      "Removing stale and uncited research docs reduces context noise and keeps the LEARN substrate current.",
  });
}
