// palantir-mini v3.7.0 — lib/semantic-graph/semantic-query/read-plan.ts
// SP-3 read-plan: walk affectedDocs, resolve refs, sort by authority class.
// Extracted from semantic-query.ts during A.2 decomposition (v2.13.0 SP-3).

import * as fs from "fs";
import { resolveResearchRef, extractResearchRefs, type ResearchSourceResolution } from "../../research/resolve-ref";
import type { AuthorityNote, SemanticRid, SemanticNode } from "../types";

export interface ReadPlanResult {
  requiredResearchRefs: string[];
  recommendedReadOrder: string[];
  authorityNotes:       AuthorityNote[];
  archiveBridgeRefs:    string[];
}

const CLASS_ORDER: Record<string, number> = {
  builder: 0, fact: 1, synthesis: 2, capability: 3, archive: 4,
};

/**
 * Walks affectedDocs nodes, extracts research refs from their content,
 * resolves each ref, and produces a sorted read-plan.
 */
export function buildReadPlan(
  affectedDocs: ReadonlyArray<SemanticRid>,
  mergedNodes: ReadonlyArray<SemanticNode>,
  projectRoot: string,
): ReadPlanResult {
  const resolutionByPrimaryRef = new Map<string, ResearchSourceResolution>();
  for (const docRid of affectedDocs) {
    const node = mergedNodes.find((n) => n.decl.rid === docRid);
    if (!node) continue;
    const relPath = node.decl.value;
    if (!relPath || typeof relPath !== "string") continue;
    const absPath = relPath.startsWith("/") ? relPath : `${projectRoot}/${relPath}`;
    let content: string;
    try {
      if (!fs.existsSync(absPath)) continue;
      content = fs.readFileSync(absPath, "utf8");
    } catch {
      continue;
    }
    const rawRefs = extractResearchRefs(content);
    for (const raw of rawRefs) {
      const resolution = resolveResearchRef(raw);
      if (!resolutionByPrimaryRef.has(resolution.primaryRef)) {
        resolutionByPrimaryRef.set(resolution.primaryRef, resolution);
      }
    }
  }
  const resolutions = Array.from(resolutionByPrimaryRef.values());

  const sortedResolutions = [...resolutions].sort((a, b) => {
    const ao = CLASS_ORDER[a.authorityClass] ?? 99;
    const bo = CLASS_ORDER[b.authorityClass] ?? 99;
    if (ao !== bo) return ao - bo;
    return a.primaryRef.localeCompare(b.primaryRef);
  });

  return {
    requiredResearchRefs: resolutions.filter((r) => r.exists).map((r) => r.primaryRef),
    recommendedReadOrder: sortedResolutions.map((r) => r.primaryRef),
    authorityNotes: sortedResolutions.map((r) => ({
      ref: r.primaryRef,
      authorityClass: r.authorityClass,
      note: r.agentDirective,
    })),
    archiveBridgeRefs: resolutions
      .filter((r) => r.archived || r.authorityClass === "archive")
      .map((r) => r.primaryRef),
  };
}
