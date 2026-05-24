// palantir-mini v3.5.0 — detect-doc-drift sibling: MEMORY.md scanner
// Authority: rules/02-research-retrieval.md §Memory → schemas/ontology/primitives/memory-index-entry.ts

import * as fs from "fs";
import * as path from "path";
import {
  MEMORYIndexEntryRegistry,
  memoryIndexEntryRid,
  renderMEMORYIndexEntryLine,
} from "#schemas/ontology/primitives/memory-index-entry";
import type { MEMORYIndexEntryDeclaration } from "#schemas/ontology/primitives/memory-index-entry";
import {
  resolveResearchRef,
  type ResearchAuthorityClass,
} from "../../../lib/research/resolve-ref";
import type { DocDriftSignal } from "./types";
import { RESEARCH_HREF_RE } from "./types";

export function scanMemory(projectDir: string): DocDriftSignal[] {
  const signals: DocDriftSignal[] = [];
  const memoryDir = path.join(projectDir, ".claude", "projects");

  const candidates: string[] = [];
  if (fs.existsSync(memoryDir)) {
    for (const sub of fs.readdirSync(memoryDir)) {
      const memFile = path.join(memoryDir, sub, "memory", "MEMORY.md");
      if (fs.existsSync(memFile)) candidates.push(memFile);
    }
  }
  const localMemory = path.join(projectDir, "MEMORY.md");
  if (fs.existsSync(localMemory)) candidates.push(localMemory);

  for (const memoryFile of candidates) {
    const content = fs.readFileSync(memoryFile, "utf8");
    const lines = content.split("\n");
    const registry = new MEMORYIndexEntryRegistry();
    const linkRe = /^-\s+\[([^\]]+)\]\(([^)]+)\)\s+—\s+(.+)$/;

    let entryCount = 0;
    const longLineRids = new Set<string>();

    for (const line of lines) {
      const m = linkRe.exec(line.trim());
      if (!m) continue;
      entryCount++;
      const title = m[1] ?? "";
      const relPath = m[2] ?? "";
      const hookDesc = m[3] ?? "";
      const targetMdPath = path.isAbsolute(relPath)
        ? relPath
        : path.resolve(path.dirname(memoryFile), relPath);

      const rid = memoryIndexEntryRid(`memory-entry:${memoryFile}:${title}`);
      const decl: MEMORYIndexEntryDeclaration = {
        rid,
        filePath: memoryFile,
        title,
        hookDescription: hookDesc,
        targetMdPath,
        maxLineChars: 150,
        lastCheckedAt: new Date().toISOString(),
      };
      registry.register(decl);

      const rendered = renderMEMORYIndexEntryLine(decl);
      if (rendered.length > 150) {
        longLineRids.add(rid);
        signals.push({
          driftKind: "memory_count_mismatch",
          evidencePath: memoryFile,
          expected: `line <= 150 chars`,
          observed: `line is ${rendered.length} chars: "${rendered.slice(0, 60)}..."`,
        });
      }
    }

    // broken_xref fires ONLY for target_missing kind, never as a cascade of a
    // line-length violation (rule O2b false-positive guard).
    const errors = registry.validate({
      fileExists: (p) => fs.existsSync(p),
    });
    for (const err of errors) {
      if (err.kind !== "target_missing") continue;
      if (longLineRids.has(err.rid)) continue;

      const targetPath = err.detail;
      let authorityClass: ResearchAuthorityClass | undefined;
      if (RESEARCH_HREF_RE.test(targetPath)) {
        const resolution = resolveResearchRef(targetPath);
        authorityClass = resolution.authorityClass;
      }

      signals.push({
        driftKind: "broken_xref",
        evidencePath: memoryFile,
        expected: "target file exists",
        observed: err.detail,
        ...(authorityClass !== undefined ? { authorityClass } : {}),
      });
    }

    if (entryCount > 200) {
      signals.push({
        driftKind: "memory_count_mismatch",
        evidencePath: memoryFile,
        expected: "MEMORY.md index <= 200 lines",
        observed: `${entryCount} link entries found`,
      });
    }
  }

  return signals;
}
