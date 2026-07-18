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

  // --- A610 neutral adapter capability source + generator (kind: tool /
  // generated-binding / adapter, Wave 6, ADR-007) ---
  {
    nodeId: "tool-generator-capability-index",
    kind: "tool",
    sourcePath: "scripts/generators/capability-index.ts",
    runtimeScope: "all",
    status: "active",
    disposition: { source: "self", row: "A610", note: "run via npm script generate:all; produces scripts/generated/capability-index.generated.ts from src/adapters/shared/capability-registry.json." },
  },
  {
    nodeId: "generated-binding-capability-index",
    kind: "generated-binding",
    sourcePath: "scripts/generated/capability-index.generated.ts",
    runtimeScope: "all",
    status: "active",
    disposition: { source: "self", row: "A610", note: "derives from src/adapters/shared/capability-registry.json; deterministic, byte-stable, wired into generated:check." },
  },
  {
    nodeId: "adapter-shared",
    kind: "adapter",
    sourcePath: "src/adapters/shared/",
    runtimeScope: "all",
    status: "active",
    disposition: { source: "self", row: "A610", note: "neutral capability registry + shared metadata types (types.ts, capability-registry.json, registry-loader.ts, index.ts); the SOLE authority A620/A630/A640 generate their per-runtime bindings from — directory-level registration, same convention as the 3 'planned' adapter entries below." },
  },

  // --- A620 generated Codex runtime binding (kind: adapter, Wave 6,
  // ADR-007) — directory-level registration, same convention as
  // `adapter-shared` above: `generator.ts`/`generate.ts`/
  // `binding.generated.ts`/`drift-check.ts`/`flat-schema.ts`/`index.ts`/
  // `README.md` plus their colocated `*.test.ts` files all live under this
  // one `src/adapters/codex/` slot (scanControlPlaneCompleteness accepts
  // directory-level registration for src/adapters/**) ---
  {
    nodeId: "adapter-codex",
    kind: "adapter",
    sourcePath: "src/adapters/codex/",
    runtimeScope: "codex",
    status: "active",
    disposition: {
      source: "self",
      row: "A620",
      note: "Generated Codex runtime binding: manifest + flat MCP tool-schema skeleton, generated from A610's src/adapters/shared/capability-registry.json via generator.ts/generate.ts (never hand-derived); drift-check.ts + colocated generated-check.test.ts detect a hand-edit locally (scripts/generated-check.ts is outside A620's write set, per decisions/w6-write-set-adjudication.md).",
    },
  },

  // --- A630 generated Claude runtime binding (kind: adapter, Wave 6,
  // ADR-007) — directory-level registration, same convention as
  // `adapter-shared`/`adapter-codex` above: `generator.ts`/`generate.ts`/
  // `binding.generated.ts`/`drift-check.ts`/`flat-schema.ts`/
  // `mechanism-classification.ts`/`index.ts`/`README.md` plus their
  // colocated `*.test.ts` files all live under this one
  // `src/adapters/claude/` slot (scanControlPlaneCompleteness accepts
  // directory-level registration for src/adapters/**) ---
  {
    nodeId: "adapter-claude",
    kind: "adapter",
    sourcePath: "src/adapters/claude/",
    runtimeScope: "claude",
    status: "active",
    disposition: {
      source: "self",
      row: "A630",
      note: "Generated Claude runtime binding: manifest + flat MCP tool-schema skeleton, generated from A610's src/adapters/shared/capability-registry.json via generator.ts/generate.ts (never hand-derived); drift-check.ts + colocated generated-check.test.ts detect a hand-edit locally (scripts/generated-check.ts is outside A630's write set, per decisions/w6-write-set-adjudication.md). mechanism-classification.ts + its colocated test additionally prove Claude's hooks/skillsCommands/subagents mechanisms classify under ControlPlaneNodeKind (hook/skill/agent), never as mutation-authority or a product primitive.",
    },
  },

  // --- A640 generated Gemini runtime binding (kind: adapter, Wave 6,
  // ADR-007) — directory-level registration, same convention as
  // `adapter-shared`/`adapter-codex`/`adapter-claude` above: `generator.ts`/
  // `generate.ts`/`binding.generated.ts`/`drift-check.ts`/`flat-schema.ts`/
  // `mechanism-classification.ts`/`index.ts`/`README.md` plus their
  // colocated `*.test.ts` files all live under this one
  // `src/adapters/gemini/` slot (scanControlPlaneCompleteness accepts
  // directory-level registration for src/adapters/**) ---
  {
    nodeId: "adapter-gemini",
    kind: "adapter",
    sourcePath: "src/adapters/gemini/",
    runtimeScope: "gemini",
    status: "active",
    disposition: {
      source: "self",
      row: "A640",
      note: "Generated Gemini runtime binding: manifest + flat MCP tool-schema skeleton, generated from A610's src/adapters/shared/capability-registry.json via generator.ts/generate.ts (never hand-derived); drift-check.ts + colocated generated-check.test.ts detect a hand-edit locally (scripts/generated-check.ts is outside A640's write set, per decisions/w6-write-set-adjudication.md). mechanism-classification.ts + its colocated test additionally prove Gemini's hooks/skillsCommands/subagents mechanisms classify under ControlPlaneNodeKind (hook/skill/agent), never as mutation-authority or a product primitive. manifest.nativePackaging records this marketplace's native Gemini extension packaging as unsupported (no gemini-extension.json/.gemini-plugin/ convention exists here at generation time) and this binding ships a neutral MCP/CLI transport instead — never a fabricated native-support claim (execution-plan §9 row A640).",
    },
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
