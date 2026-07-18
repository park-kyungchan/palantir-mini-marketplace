// ControlPlaneNodeKind catalog registry (ledger row P450, docs/architecture.md
// ADR-003). Migrates the successor's OWN current inventory into catalog
// entries: its section-11.2 script set / checkers, its generators, and its
// planned adapter surfaces (ADR-007, Wave 6, not yet built) — never a
// consumer's own domain content (consumer-domain-ownership,
// AGENT-CONTRACT.md §4) and never a Palantir product primitive
// (AGENT-CONTRACT.md §2). This is a static literal catalog (the successor's
// own control-plane surfaces are known at authoring time), not a
// dynamically-mutating registry — matching `PRIMITIVE_KINDS`'s own static
// shape in `src/altitude1/staged-construction.ts`.
//
// Catalog completeness (validation-contract item 2) is mechanically
// enforced, not just hand-claimed: `boundary-validator.ts`'s
// `scanControlPlaneCompleteness` walks `scripts/*.ts` (top level),
// `scripts/generators/*.ts`, `scripts/generated/*.generated.ts`, and
// `src/adapters/**` and fails if any discovered file has no matching
// `sourcePath` here, or any `status: "active"` entry's `sourcePath` is
// missing on disk.

import type { ControlPlaneNode } from "./types";

export const CONTROL_PLANE_CATALOG: readonly ControlPlaneNode[] = [
  // --- section-11.2 script set / checkers (kind: tool, P340) ---
  {
    nodeId: "tool-boundary-check",
    kind: "tool",
    sourcePath: "scripts/boundary-check.ts",
    runtimeScope: "all",
    status: "active",
    disposition: {
      source: "self",
      row: "P340",
      note: "npm script boundary:check; enforces ADR-002 one-way dependency direction and, from P450, ADR-003's control-plane/product-primitive boundary.",
    },
  },
  {
    nodeId: "tool-generated-check",
    kind: "tool",
    sourcePath: "scripts/generated-check.ts",
    runtimeScope: "all",
    status: "active",
    disposition: { source: "self", row: "P340", note: "npm script generated:check; ADR-007 generation-discipline enforcement." },
  },
  {
    nodeId: "tool-parity-check",
    kind: "tool",
    sourcePath: "scripts/parity-check.ts",
    runtimeScope: "all",
    status: "active",
    disposition: { source: "self", row: "P340", note: "npm script parity:check." },
  },
  {
    nodeId: "tool-migration-check",
    kind: "tool",
    sourcePath: "scripts/migration-check.ts",
    runtimeScope: "all",
    status: "active",
    disposition: { source: "self", row: "P340", note: "npm script migration:check." },
  },
  {
    nodeId: "tool-home-isolation-guard",
    kind: "tool",
    sourcePath: "scripts/home-isolation-guard.ts",
    runtimeScope: "all",
    status: "active",
    disposition: { source: "self", row: "P340", note: "npm script test:home-isolation-guard." },
  },
  {
    nodeId: "tool-english-docs-check",
    kind: "tool",
    sourcePath: "scripts/english-docs-check.ts",
    runtimeScope: "all",
    status: "active",
    disposition: { source: "self", row: "P340", note: "npm script docs:check-english; AGENT-CONTRACT.md §8 English-only enforcement." },
  },
  {
    nodeId: "tool-control-plane-check",
    kind: "tool",
    sourcePath: "scripts/control-plane-check.ts",
    runtimeScope: "all",
    status: "active",
    disposition: { source: "self", row: "P450", note: "npm script control-plane:check; sibling entry point for this same catalog's own boundary/completeness/absence scans, also wired into boundary:check." },
  },

  // --- generators (kind: tool — a CLI dev-tooling surface, distinct from the
  // generated artifacts they produce; P340) ---
  {
    nodeId: "tool-generator-contract-index",
    kind: "tool",
    sourcePath: "scripts/generators/contract-index.ts",
    runtimeScope: "all",
    status: "active",
    disposition: { source: "self", row: "P340", note: "run via npm script generate:all (scripts/generators/run-all.ts); produces scripts/generated/contract-index.generated.ts." },
  },
  {
    nodeId: "tool-generator-reason-code-index",
    kind: "tool",
    sourcePath: "scripts/generators/reason-code-index.ts",
    runtimeScope: "all",
    status: "active",
    disposition: { source: "self", row: "P340", note: "run via npm script generate:all; produces scripts/generated/reason-code-index.generated.ts." },
  },
  {
    nodeId: "tool-generator-run-all",
    kind: "tool",
    sourcePath: "scripts/generators/run-all.ts",
    runtimeScope: "all",
    status: "active",
    disposition: { source: "self", row: "P340", note: "npm script generate:all; the single entry point that invokes every registered generator." },
  },

  // --- generated output artifacts (kind: generated-binding, P340) ---
  {
    nodeId: "generated-binding-contract-index",
    kind: "generated-binding",
    sourcePath: "scripts/generated/contract-index.generated.ts",
    runtimeScope: "all",
    status: "active",
    disposition: {
      source: "self",
      row: "P340",
      note: "ADR-007 generalizes 'generated-binding' to any generator-produced artifact; this one derives from contracts/*.contract.json. The future Codex/Claude/Gemini runtime bindings (Wave 6, A610-A640) are this same kind's other planned instances (see the 3 'adapter'-kind planned entries below, which name the per-runtime module, not this generic artifact bucket).",
    },
  },
  {
    nodeId: "generated-binding-reason-code-index",
    kind: "generated-binding",
    sourcePath: "scripts/generated/reason-code-index.generated.ts",
    runtimeScope: "all",
    status: "active",
    disposition: { source: "self", row: "P340", note: "derives from contracts/reason-code-registry.json." },
  },

  // --- planned adapter surfaces (kind: adapter, status: planned; ADR-007,
  // Wave 6 rows A610-A640 — src/adapters/ is empty at P450) ---
  {
    nodeId: "adapter-codex-planned",
    kind: "adapter",
    sourcePath: "src/adapters/codex/",
    runtimeScope: "codex",
    status: "planned",
    disposition: {
      source: "self",
      row: "ADR-007 (Wave 6, A620)",
      note: "Generated Codex runtime binding, not yet built; registered ahead of construction so Wave 6 lands into a pre-declared catalog slot.",
    },
  },
  {
    nodeId: "adapter-claude-planned",
    kind: "adapter",
    sourcePath: "src/adapters/claude/",
    runtimeScope: "claude",
    status: "planned",
    disposition: { source: "self", row: "ADR-007 (Wave 6, A630)", note: "Generated Claude runtime binding, not yet built." },
  },
  {
    nodeId: "adapter-gemini-planned",
    kind: "adapter",
    sourcePath: "src/adapters/gemini/",
    runtimeScope: "gemini",
    status: "planned",
    disposition: { source: "self", row: "ADR-007 (Wave 6, A640)", note: "Generated Gemini runtime binding, not yet built; A640 must mark native packaging unsupported and provide a neutral MCP/CLI transport if no native plugin package exists at generation time." },
  },
];

/** Duplicate `nodeId` values, if any (must be empty for a valid catalog). */
export function findDuplicateNodeIds(catalog: readonly ControlPlaneNode[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const entry of catalog) {
    if (seen.has(entry.nodeId)) duplicates.add(entry.nodeId);
    seen.add(entry.nodeId);
  }
  return [...duplicates].sort();
}

/** Duplicate `sourcePath` values, if any (must be empty — one catalog entry per surface). */
export function findDuplicateSourcePaths(catalog: readonly ControlPlaneNode[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const entry of catalog) {
    if (seen.has(entry.sourcePath)) duplicates.add(entry.sourcePath);
    seen.add(entry.sourcePath);
  }
  return [...duplicates].sort();
}

export function findByKind(catalog: readonly ControlPlaneNode[], kind: ControlPlaneNode["kind"]): readonly ControlPlaneNode[] {
  return catalog.filter((entry) => entry.kind === kind);
}

// Belt-and-suspenders self-check (same discipline as
// staged-construction.ts's bottom self-check block): the catalog this
// module ships must never carry a duplicate nodeId or sourcePath.
if (findDuplicateNodeIds(CONTROL_PLANE_CATALOG).length > 0 || findDuplicateSourcePaths(CONTROL_PLANE_CATALOG).length > 0) {
  throw new Error("registry.ts: CONTROL_PLANE_CATALOG contains a duplicate nodeId or sourcePath");
}
