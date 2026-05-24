// palantir-mini v3.5.0 — detect-doc-drift sibling: type definitions
// v3.5.0 N1-LARGE wave 3 decomposition (was bridge/handlers/detect-doc-drift.ts 258 LOC).

import type { ResearchAuthorityClass } from "../../../lib/research/resolve-ref";

export type DriftKind =
  | "memory_count_mismatch"
  | "version_rot"
  | "broken_xref"
  | "hook_event_invalid"
  | "legacy_ref_should_migrate";

export interface DocDriftSignal {
  driftKind: DriftKind;
  evidencePath: string;
  expected: string;
  observed: string;
  authorityClass?: ResearchAuthorityClass;
}

export interface DetectDocDriftArgs {
  project: string;
  scope?: "memory" | "browse" | "index" | "all";
}

export interface DetectDocDriftResult {
  signals: DocDriftSignal[];
}

export const RESEARCH_HREF_RE = /(?:~\/)?\.claude\/research\//;
