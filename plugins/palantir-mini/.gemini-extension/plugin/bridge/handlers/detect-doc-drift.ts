// palantir-mini v3.5.0 — MCP tool handler: detect_doc_drift (thin orchestrator)
// Domain: LEARN (MEMORYIndexEntry prim-memory-01 + drift detection)
//
// v3.5.0 N1-LARGE wave 3 decomposition (was 258 LOC). Logic extracted to
// ./detect-doc-drift/{types, scan-memory, scan-xrefs, find-docs}.ts.
// Public API unchanged: default export `detectDocDrift` + named export
// `detectDocDriftFn` (consumed by hooks/doc-edit-drift.ts) preserved.
//
// Authority chain: rules/02-research-retrieval.md §Memory → schemas/ontology/primitives/memory-index-entry.ts
// Wave 2 SP-2: authority-class-aware xref scanning via lib/research/resolve-ref.

import { scanMemory } from "./detect-doc-drift/scan-memory";
import { scanXrefs } from "./detect-doc-drift/scan-xrefs";
import { findDocs } from "./detect-doc-drift/find-docs";
import type {
  DocDriftSignal,
  DetectDocDriftArgs,
  DetectDocDriftResult,
} from "./detect-doc-drift/types";

// Backward-compat re-exports
export type {
  DriftKind,
  DocDriftSignal,
  DetectDocDriftArgs,
  DetectDocDriftResult,
} from "./detect-doc-drift/types";

export async function detectDocDriftFn(
  args: DetectDocDriftArgs,
): Promise<DetectDocDriftResult> {
  if (!args.project || typeof args.project !== "string") {
    throw new Error("detect_doc_drift: `project` is required");
  }

  const scope = args.scope ?? "all";
  const signals: DocDriftSignal[] = [];

  if (scope === "memory" || scope === "all") {
    signals.push(...scanMemory(args.project));
  }

  if (scope === "browse" || scope === "index" || scope === "all") {
    const docNames =
      scope === "browse"
        ? ["BROWSE.md"]
        : scope === "index"
          ? ["INDEX.md"]
          : ["BROWSE.md", "INDEX.md"];

    const docs = findDocs(args.project, docNames);
    for (const doc of docs) {
      signals.push(...scanXrefs(doc));
    }
  }

  return { signals };
}

export default async function detectDocDrift(
  rawArgs: unknown,
): Promise<DetectDocDriftResult> {
  return detectDocDriftFn((rawArgs ?? {}) as DetectDocDriftArgs);
}
