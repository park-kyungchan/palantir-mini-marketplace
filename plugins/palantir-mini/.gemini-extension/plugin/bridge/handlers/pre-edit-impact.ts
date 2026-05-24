// palantir-mini v1.4 — MCP tool handler: pre_edit_impact
// Domain: LEARN (ImpactEdge prim-learn-12 — PreToolUse substrate)
//
// Phase A-4 Day 3: SQLite-backed via registry-loader.
// Falls back to in-memory IMPACT_EDGE_REGISTRY when SQLite is not populated.
//
// Called by hooks/pre-edit-impact-check.ts on every Edit|Write|MultiEdit.
// Resolves proposed files → RIDs → impact graph → actionable context.
// Authority chain: rules/03-forward-backward-propagation.md → impact-edge.ts → this handler

import * as path from "path";
import {
  IMPACT_EDGE_REGISTRY,
} from "#schemas/ontology/primitives/impact-edge";
import {
  DEAD_CODE_MARKER_REGISTRY,
} from "#schemas/ontology/primitives/dead-code-marker";
import {
  LINEAGE_CONFORMANCE_POLICY_REGISTRY,
} from "#schemas/ontology/primitives/lineage-conformance-policy";
import {
  getCacheForProject,
} from "../../lib/impact-graph/registry-loader";
import {
  evaluateProjectScopeConformance,
  projectScopePolicyForFiles,
} from "../../lib/lead-intent/project-scope-policy";
import type {
  DigitalTwinChangeContract,
  SemanticIntentContract,
} from "../../lib/lead-intent/contracts";
import type {
  ProjectScopeConformanceResult,
  ProjectScopePolicyProjection,
} from "../../lib/lead-intent/project-scope-policy";

interface PreEditImpactArgs {
  proposedFiles:               string[];
  project:                     string;
  semanticIntentContract?:     SemanticIntentContract;
  digitalTwinChangeContract?:  DigitalTwinChangeContract;
}

type EvidenceFileEntry = { file: string; evidenceKind: "ast" };

interface PreEditImpactResult {
  affects:         EvidenceFileEntry[];
  tests:           EvidenceFileEntry[];
  docs:            EvidenceFileEntry[];
  backwardAffects: EvidenceFileEntry[];
  risks:           string[];
  transitiveRids:  string[];
  source:          "sqlite" | "in-memory";
  projectScope:    ProjectScopePolicyProjection & {
    conformance?: ProjectScopeConformanceResult;
  };
}

function fileToRid(filePath: string, projectRoot: string): string {
  if (path.isAbsolute(filePath)) {
    const rel = path.relative(projectRoot, filePath).replace(/\\/g, "/");
    return `file:${rel.startsWith("..") ? filePath : rel}`;
  }
  return `file:${filePath.replace(/\\/g, "/")}`;
}

function classifyRid(rid: string): "test" | "doc" | "file" {
  const lower = rid.toLowerCase();
  if (
    lower.includes(".test.") ||
    lower.includes(".spec.") ||
    lower.includes("/tests/")
  ) {
    return "test";
  }
  if (lower.endsWith(".md") || lower.includes("/docs/")) {
    return "doc";
  }
  return "file";
}

export default async function preEditImpact(
  rawArgs: unknown,
): Promise<PreEditImpactResult> {
  const args = (rawArgs ?? {}) as PreEditImpactArgs;

  if (!args.proposedFiles || !Array.isArray(args.proposedFiles)) {
    throw new Error("pre_edit_impact: `proposedFiles` array is required");
  }
  if (!args.project || typeof args.project !== "string") {
    throw new Error("pre_edit_impact: `project` is required");
  }

  const projectRoot = args.project;
  const affects:         EvidenceFileEntry[] = [];
  const tests:           EvidenceFileEntry[] = [];
  const docs:            EvidenceFileEntry[] = [];
  const backwardAffects: EvidenceFileEntry[] = [];
  const risks:           string[]            = [];
  const transitiveRids = new Set<string>();
  const projectScope = projectScopePolicyForFiles(args.proposedFiles, projectRoot);
  const projectScopeConformance =
    args.semanticIntentContract && args.digitalTwinChangeContract
      ? evaluateProjectScopeConformance({
          proposedFiles: args.proposedFiles,
          projectRoot,
          semanticIntentContract: args.semanticIntentContract,
          digitalTwinChangeContract: args.digitalTwinChangeContract,
        })
      : undefined;

  // Prefer SQLite when available
  const cache = getCacheForProject(projectRoot);
  const source: PreEditImpactResult["source"] = cache ? "sqlite" : "in-memory";

  for (const filePath of args.proposedFiles) {
    const rid = fileToRid(filePath, projectRoot);

    if (cache) {
      // --- Forward walk (SQLite, depth=3) ---
      const fwdEdges = cache.walkTransitiveForward(rid, 3);
      const fwdRids  = new Set<string>(fwdEdges.map((e) => e.toRid));
      for (const toRid of fwdRids) {
        if (toRid === rid) continue;
        transitiveRids.add(toRid);
        const kind     = classifyRid(toRid);
        const nodeFile = toRid.replace(/^file:/, "");
        const entry: EvidenceFileEntry = { file: nodeFile, evidenceKind: "ast" };
        if (kind === "test") {
          if (!tests.some((e) => e.file === nodeFile)) tests.push(entry);
        } else if (kind === "doc") {
          if (!docs.some((e) => e.file === nodeFile)) docs.push(entry);
        } else {
          if (!affects.some((e) => e.file === nodeFile)) affects.push(entry);
        }
      }

      // --- Backward walk (SQLite, depth=3) ---
      const bwdEdges = cache.walkTransitiveBackward(rid, 3);
      const bwdRids  = new Set<string>(bwdEdges.map((e) => e.fromRid));
      for (const fromRid of bwdRids) {
        if (fromRid === rid) continue;
        // Dedupe: nodes already in the forward set stay in their forward bucket only
        if (fwdRids.has(fromRid)) continue;
        transitiveRids.add(fromRid);
        const nodeFile = fromRid.replace(/^file:/, "");
        const entry: EvidenceFileEntry = { file: nodeFile, evidenceKind: "ast" };
        if (!backwardAffects.some((e) => e.file === nodeFile)) {
          backwardAffects.push(entry);
        }
      }
    } else {
      // --- Forward walk (in-memory, depth=3) ---
      const fwdGraph  = IMPACT_EDGE_REGISTRY.walkTransitive(rid, 3);
      const fwdRidSet = new Set<string>(fwdGraph.nodes.map((n) => n.rid));
      for (const node of fwdGraph.nodes) {
        if (node.rid === rid) continue;
        transitiveRids.add(node.rid);
        const kind     = classifyRid(node.rid);
        const nodeFile = node.rid.replace(/^file:/, "");
        const entry: EvidenceFileEntry = { file: nodeFile, evidenceKind: "ast" };
        if (kind === "test") {
          if (!tests.some((e) => e.file === nodeFile)) tests.push(entry);
        } else if (kind === "doc") {
          if (!docs.some((e) => e.file === nodeFile)) docs.push(entry);
        } else {
          if (!affects.some((e) => e.file === nodeFile)) affects.push(entry);
        }
      }

      // --- Backward walk (in-memory, BFS depth=3 via queryBackward) ---
      const bwdVisited   = new Set<string>([rid]);
      const bwdFrontier: Array<{ rid: string; depth: number }> = [{ rid, depth: 0 }];
      while (bwdFrontier.length > 0) {
        const next = bwdFrontier.shift();
        if (!next || next.depth >= 3) continue;
        const inbound = IMPACT_EDGE_REGISTRY.queryBackward(next.rid);
        for (const edge of inbound) {
          if (bwdVisited.has(edge.fromRid)) continue;
          bwdVisited.add(edge.fromRid);
          bwdFrontier.push({ rid: edge.fromRid, depth: next.depth + 1 });
          // Dedupe: nodes already in the forward set stay in their forward bucket only
          if (fwdRidSet.has(edge.fromRid)) continue;
          transitiveRids.add(edge.fromRid);
          const nodeFile = edge.fromRid.replace(/^file:/, "");
          const entry: EvidenceFileEntry = { file: nodeFile, evidenceKind: "ast" };
          if (!backwardAffects.some((e) => e.file === nodeFile)) {
            backwardAffects.push(entry);
          }
        }
      }
    }

    // Risk: dead code overlaps
    const deadMarkers = DEAD_CODE_MARKER_REGISTRY.list().filter(
      (m) =>
        m.symbolPath.startsWith(filePath) ||
        filePath.includes(
          path.basename(m.symbolPath.split("#")[0] ?? ""),
        ),
    );
    for (const marker of deadMarkers) {
      risks.push(
        `Dead code in ${marker.symbolPath} (gated by ${marker.gatedBy.kind}:${marker.gatedBy.value})`,
      );
    }

    // Risk: lineage policy check
    const policies = LINEAGE_CONFORMANCE_POLICY_REGISTRY.list();
    if (policies.length === 0) {
      risks.push(
        `No lineage conformance policies registered — 5D conformance unverified for ${path.basename(filePath)}`,
      );
    }
  }

  return {
    affects,
    tests,
    docs,
    backwardAffects,
    risks,
    transitiveRids: [...transitiveRids],
    source,
    projectScope: {
      ...projectScope,
      ...(projectScopeConformance ? { conformance: projectScopeConformance } : {}),
    },
  };
}
