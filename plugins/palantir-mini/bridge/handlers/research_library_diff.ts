// palantir-mini v3.5.0 — MCP tool handler: research_library_diff (thin orchestrator)
// Domain: LEARN (prim-learn-01 AppendOnlyEventLog — research-library view)
//
// v3.5.0 N1-LARGE wave 3 decomposition (was 201 LOC). Logic extracted to
// ./research_library_diff/{types, scan}.ts. Public API unchanged: named export
// `researchLibraryDiff` (consumed by hooks/session-start.ts) + default handler
// preserved.
//
// Read-only query: computes a structural diff of ~/.claude/research/ by scanning
// _changelog.md files in each research section. NO event emission. NO HTTP.
//
// Authority chain: research/ → schemas/ → project ontology → runtime

import * as fs from "fs";
import * as path from "path";
import {
  countMdFiles,
  listSectionDirs,
  parseChangelogEntries,
  resolveLibraryRoot,
} from "./research_library_diff/scan";
import type {
  ResearchLibraryDiffArgs,
  ResearchLibraryDiffResult,
  ResearchSectionDiff,
} from "./research_library_diff/types";

// Backward-compat re-exports
export type {
  ResearchSectionDiff,
  ChangelogEntry,
  ResearchLibraryDiffResult,
  ResearchLibraryDiffArgs,
} from "./research_library_diff/types";

export async function researchLibraryDiff(
  args: ResearchLibraryDiffArgs,
): Promise<ResearchLibraryDiffResult> {
  const libraryRoot = resolveLibraryRoot(args.libraryRoot);

  // Determine which sections to scan
  const requestedSections =
    Array.isArray(args.sections) && args.sections.length > 0
      ? args.sections
      : listSectionDirs(libraryRoot);

  const sections: ResearchSectionDiff[] = [];

  for (const section of requestedSections) {
    const sectionPath = path.join(libraryRoot, section);
    if (!fs.existsSync(sectionPath)) continue;

    const changelogPath = path.join(sectionPath, "_changelog.md");
    const changelogMissing = !fs.existsSync(changelogPath);
    const changelogEntries = changelogMissing
      ? []
      : parseChangelogEntries(changelogPath);
    const changelogEmpty = !changelogMissing && changelogEntries.length === 0;
    const docCount = countMdFiles(sectionPath);

    sections.push({
      section,
      sectionPath,
      docCount,
      changelogEntries,
      changelogEmpty,
      changelogMissing,
    });
  }

  const totalDocCount = sections.reduce((sum, s) => sum + s.docCount, 0);
  const sectionsWithoutChangelog = sections.filter((s) => s.changelogMissing).length;
  const sectionsWithChangelog = sections.filter((s) => !s.changelogMissing).length;

  return {
    libraryRoot,
    sections,
    totalDocCount,
    sectionsWithoutChangelog,
    sectionsWithChangelog,
  };
}

export default async function researchLibraryDiffHandler(
  rawArgs: unknown,
): Promise<ResearchLibraryDiffResult> {
  const args = (rawArgs ?? {}) as ResearchLibraryDiffArgs;
  return researchLibraryDiff(args);
}
