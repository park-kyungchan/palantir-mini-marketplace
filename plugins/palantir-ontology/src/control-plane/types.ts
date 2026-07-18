// ControlPlaneNodeKind catalog types (ledger row P450, docs/architecture.md
// ADR-003: "ControlPlaneNodeKind catalog").
//
// Fixed 8-value kind enum (ADR-003 "Catalog shape (fixed by this ADR,
// implemented by P450)"): `tool | handler | hook | skill | agent | adapter
// | profile | generated-binding`. Deliberately disjoint from
// `src/altitude1/staged-construction.ts`'s 7-value `PrimitiveKind` enum
// (`ObjectType | Property | SharedPropertyType | Link | Interface | Action
// | Function`) — zero string overlap between the two sets, by construction.
// A `ControlPlaneNodeKind` entry is lifecycle-control metadata
// (consumer-domain-ownership: it never carries a `properties`/`links`/
// `actions` triple, ADR-001/ADR-003), never a Palantir `ObjectType`,
// `Interface`, `ActionType`, `Function`, permission, or consumer Ontology
// entity.
//
// Kind-bucket grounding (ADR-003 "Grounded evidence", P210 §8d/§10):
// - `tool`: a generic, non-MCP CLI/dev-tooling surface (this successor's own
//   section-11.2 checker/generator scripts are the current instances).
// - `handler`: MCP handler and MCP tool surfaces (P210's `mcp-handler` and
//   `mcp-tool` census rows collapse into this one bucket, "handler x2").
// - `hook`, `skill`, `agent`, `adapter`: one bucket each, matching P210's
//   `hook`/`skill`/`agent`/`runtime-adapter` census rows directly.
// - `profile`: P210 §10's `McpToolSurfaceProfile` family (tool-visibility
//   gating data, not a product primitive) plus P210's `monitor` row where
//   its actual runtime role is closer to a profile than a generated
//   artifact.
// - `generated-binding`: any generator-produced artifact (P210's
//   `plugin-manifest`/`managed-settings-fragment` rows fold in here, plus
//   ADR-007's future Codex/Claude/Gemini generated runtime bindings).

export const CONTROL_PLANE_NODE_KINDS = [
  "tool",
  "handler",
  "hook",
  "skill",
  "agent",
  "adapter",
  "profile",
  "generated-binding",
] as const;

export type ControlPlaneNodeKind = (typeof CONTROL_PLANE_NODE_KINDS)[number];

const CONTROL_PLANE_NODE_KIND_SET: ReadonlySet<string> = new Set(CONTROL_PLANE_NODE_KINDS);

/** Runtime guard: is `value` one of the 8 registered ControlPlaneNodeKind values? */
export function isControlPlaneNodeKind(value: unknown): value is ControlPlaneNodeKind {
  return typeof value === "string" && CONTROL_PLANE_NODE_KIND_SET.has(value);
}

/** Which of Codex/Claude/Gemini a node applies to, or `"all"` for runtime-neutral tooling. */
export type RuntimeScope = "codex" | "claude" | "gemini" | "all";

const RUNTIME_SCOPES: readonly RuntimeScope[] = ["codex", "claude", "gemini", "all"];

function isRuntimeScope(value: unknown): value is RuntimeScope {
  return typeof value === "string" && (RUNTIME_SCOPES as readonly string[]).includes(value);
}

/**
 * `"active"`: `sourcePath` currently exists in the tree. `"planned"`: the
 * entry is registered ahead of construction (e.g. ADR-007's Wave-6
 * Codex/Claude/Gemini bindings) — `sourcePath` names the intended future
 * location and is not required to exist yet.
 */
export type ControlPlaneNodeStatus = "active" | "planned";

const NODE_STATUSES: readonly ControlPlaneNodeStatus[] = ["active", "planned"];

function isControlPlaneNodeStatus(value: unknown): value is ControlPlaneNodeStatus {
  return typeof value === "string" && (NODE_STATUSES as readonly string[]).includes(value);
}

/**
 * Pointer back to the P210/N220 census row this entry's disposition
 * originated from, "where applicable" (ADR-003 catalog-shape clause).
 * `source: "self"` marks a successor-native surface with no P210/N220
 * census analog (P210's 9-file census covers `plugins/palantir-mini`'s
 * legacy `self/*.objecttype.ts` surfaces, not this successor's own new
 * scripts/generators/adapters) — `row` then names the ledger row or ADR
 * that authorized building it instead of a census row number.
 */
export interface ProvenancePointer {
  readonly source: "P210" | "N220" | "self";
  readonly row: string;
  readonly note?: string;
}

function isWellFormedProvenancePointer(value: unknown): value is ProvenancePointer {
  if (value === null || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (v.source !== "P210" && v.source !== "N220" && v.source !== "self") return false;
  if (typeof v.row !== "string" || v.row.length === 0) return false;
  if (v.note !== undefined && typeof v.note !== "string") return false;
  return true;
}

/** One catalog entry: a single runtime/control surface, cataloged as lifecycle-control metadata. */
export interface ControlPlaneNode {
  readonly nodeId: string;
  readonly kind: ControlPlaneNodeKind;
  readonly sourcePath: string;
  readonly runtimeScope: RuntimeScope;
  readonly status: ControlPlaneNodeStatus;
  readonly disposition: ProvenancePointer;
}

/**
 * Structural well-formedness guard — deliberately independent of
 * `isControlPlaneNodeKind`'s membership check (a caller may want to know
 * "is this shaped like a node" separately from "is its kind registered").
 */
export function isWellFormedControlPlaneNode(value: unknown): value is ControlPlaneNode {
  if (value === null || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.nodeId !== "string" || v.nodeId.length === 0) return false;
  if (typeof v.kind !== "string") return false;
  if (typeof v.sourcePath !== "string" || v.sourcePath.length === 0) return false;
  if (!isRuntimeScope(v.runtimeScope)) return false;
  if (!isControlPlaneNodeStatus(v.status)) return false;
  if (!isWellFormedProvenancePointer(v.disposition)) return false;
  return true;
}
