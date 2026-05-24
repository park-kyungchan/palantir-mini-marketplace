# Context Engineering — Ontology-Grade Impact Graph

> Scope: Architecture and philosophy of the Palantir-style ontology impact graph inside the palantir-mini plugin.
> Provenance: `[Synthesis]` architecture rationale; `[Applied]` phase-a3 evidence; `[Official]` ImpactEdge primitive from `~/.claude/schemas/ontology/primitives/impact-edge.ts`.
> Last verified: 2026-04-19.

---

## Why Ontology-First?

Large codebases resist grep-based impact inference. When an engineer asks "what breaks if I change `EntityType.Problem`?", grep returns every file that mentions the string `Problem`. This is not the same question. The real question is: which files, types, tests, generated artifacts, and runtime consumers have a typed dependency on `EntityType.Problem` that would propagate a semantic change?

Grep does not distinguish:
- an import of a type from a string in a comment
- a direct structural dependency from a transitive one
- a compile-time edge from a runtime one

In the palantir-math + mathcrew stack at ~3,000 TypeScript files, a naive grep for a core entity type returns 60-90 matches. A developer (or an agent) reviewing those matches must manually determine which are load-bearing. This requires reading each file, reconstructing the import chain, and reasoning about generated files that may re-export the type. At agent speed, each such analysis costs 5-15 LLM turns and 10-30k tokens.

The Ontology-First answer is: precompute the dependency graph from the AST. Then impact queries become constant-time reads from a SQLite cache. Agent turns drop from 5-15 to 0 (cache hit) or 1 (cache miss triggers incremental walk). This is the central promise of Context Engineering: reduce agent token spend on structural reasoning by making structural relationships first-class, queryable, persistent data.

Phase-a3 evidence: every `pre_edit_impact` call fell back to grep because the `ImpactEdge` registry was empty. Agents still answered correctly but at 10-15x the token cost. [Applied]

---

## The ImpactEdge Primitive

The canonical type is in `.claude/schemas/ontology/primitives/impact-edge.ts`:

```typescript
export interface ImpactEdgeDeclaration {
  readonly rid: ImpactEdgeRid;
  readonly fromRid: string;       // source file / symbol / primitive RID
  readonly toRid: string;         // target file / symbol / primitive RID
  readonly edgeKind: ImpactEdgeKind;
  readonly confidence: number;    // 0..1; 1.0 = statically verified import
  readonly evidence?: string;     // grep line, AST ref, etc.
  readonly registeredAt: string;
  readonly verifiedAt?: string;
}

export type ImpactEdgeKind =
  | "forwardProp"    // ontology propagation (research -> schemas -> project)
  | "backwardProp"   // refinement loop (runtime -> ontology)
  | "codegen"        // generated file depends on source entity
  | "import"         // TypeScript import statement
  | "semantic"       // inferred semantic coupling (not a code edge)
  | "test-covers"    // test file exercises the target
  | "doc-references" // documentation references the target;
```

The `ImpactEdgeRegistry` class in the same file provides O(1) forward and backward queries plus transitive graph walks (`walkTransitive(fromRid, maxDepth)`). The registry is the in-memory query layer; SQLite is the persistence layer.

Authority chain for this primitive:

```
~/.claude/research/ (evidence routing + fact/synthesis layers)
  -> ~/.claude/rules/03-forward-backward-propagation.md (principle)
  -> ~/.claude/schemas/ontology/primitives/impact-edge.ts (contract)
  -> ~/.claude/plugins/palantir-mini/lib/impact/graph.ts (runtime)
  -> MCP handlers impact_query + pre_edit_impact
```

Do not add new `ImpactEdgeKind` values without updating the schema and bumping `MINOR` version. The `edgeKind` enum is consumed by downstream query filters.

---

## Architecture: AST Walker + SQLite Cache

### ts-morph source walk

The AST walker uses `ts-morph` (a TypeScript compiler API wrapper) to analyze source files without invoking `tsc`. For each `.ts` file in the project tree:

1. Parse the source file into an AST (`Project.addSourceFileAtPath`).
2. Extract `ImportDeclaration` nodes: each import creates an `import` edge from the importing file RID to the imported module RID.
3. Extract `ExportDeclaration` nodes: re-exports create edges from the re-exporting file to the original source.
4. Extract `TypeReference` nodes within function signatures, interface members, and type aliases: creates `semantic` edges where two files share a structural coupling not expressed as a direct import.
5. Extract `extends` and `implements` clauses on classes and interfaces.

Each extracted edge is assigned a confidence score:
- `1.0` — direct `import` statement (static, compiler-verified)
- `0.9` — `export ... from` re-export (static, nearly certain)
- `0.8` — `extends` / `implements` (static type relationship)
- `0.7` — `TypeReference` in body (probable coupling; may be import-aliased)
- `0.5` — `semantic` inference (heuristic; requires human verification)

The walker produces an array of `ImpactEdgeDeclaration` objects ready for SQLite insertion.

### SQLite schema

Cache lives at `<project>/.palantir-mini/impact-graph.db`. Uses `bun:sqlite` (no external dependency; bundled with Bun runtime).

```sql
CREATE TABLE IF NOT EXISTS impact_edges (
  rid         TEXT PRIMARY KEY,
  from_rid    TEXT NOT NULL,
  to_rid      TEXT NOT NULL,
  edge_kind   TEXT NOT NULL,
  confidence  REAL NOT NULL DEFAULT 1.0,
  evidence    TEXT,
  scanned_at  TEXT NOT NULL,   -- ISO 8601
  file_hash   TEXT             -- SHA-256 of source file at scan time
);

CREATE INDEX IF NOT EXISTS idx_from_rid ON impact_edges (from_rid);
CREATE INDEX IF NOT EXISTS idx_to_rid   ON impact_edges (to_rid);
```

The `file_hash` column enables incremental updates: when `PostToolUse(Edit)` fires, the hook re-scans only files whose `file_hash` differs from the stored value. Unchanged files are skipped entirely.

### Why SQLite beats in-memory

The in-memory `ImpactEdgeRegistry` (in the schema primitive) is correct for short-lived query paths but has three problems at scale:

1. **Cross-session persistence**: a fresh session boot starts with an empty registry. Populating it from scratch on every session requires a full AST walk (~30-60s for a 3,000-file project). SQLite survives session boundaries; on boot the plugin reads the cache and initializes the registry in <1s.
2. **Query performance at 10K+ edges**: `bun:sqlite` with WAL mode serves indexed reads in <1ms. A transitive walk capped at depth 5 across a 10K-edge graph completes in <100ms. In-memory maps match this performance only if the process is warm; cold startup performance is 30-60x worse.
3. **WAL mode concurrency**: multiple palantir-mini instances (one per project) can read the same SQLite file concurrently. WAL (Write-Ahead Logging) mode eliminates reader/writer blocking. The in-memory registry cannot be shared across processes.

Enable WAL mode at connection open:
```typescript
const db = new Database(dbPath);
db.exec("PRAGMA journal_mode=WAL;");
db.exec("PRAGMA synchronous=NORMAL;");
```

---

## Edge Kinds

### `import`

A TypeScript `import` statement creates a direct compile-time dependency. This is the highest-confidence edge (1.0).

```typescript
// palantir-math/src/queries/problems.ts
import { EntityType } from "@palantir/ontology";
// -> impact_edge: problems.ts --[import]--> ontology/primitives/entity-type.ts
```

When `EntityType` is changed, `problems.ts` is a first-order dependent. All files that import `problems.ts` are second-order dependents.

### `export`

A re-export statement (`export { X } from "..."`) creates an `import` edge plus an indirection: any consumer of the re-exporting module has an implicit dependency on the original source.

```typescript
// palantir-math/src/index.ts
export { Problem, ProblemQuery } from "./entities/problem";
// -> two edges: index.ts --[import]--> entities/problem.ts
//               (index.ts becomes a propagation relay for problem.ts changes)
```

### `typeRef`

A `TypeReference` usage in a type position (function parameter, return type, interface member) that is not accompanied by an `import` in the same file. This can happen via global type augmentation, namespace merging, or ambient module declarations.

Confidence: 0.7. Requires human verification before acting on the edge in automated gates.

### `extends`

A class or interface `extends` clause. Changes to the base type propagate to all derived types.

```typescript
interface ProblemQuery extends BaseQuery<Problem> {
  // ...
}
// -> impact_edge: ProblemQuery --[extends]--> BaseQuery
```

### `implements`

A class `implements` clause. The class has a structural contract with the interface; interface changes break the implementing class.

```typescript
class ProblemResolver implements IResolver<Problem, ProblemQuery> {
  // ...
}
// -> impact_edge: ProblemResolver --[implements]--> IResolver
```

---

## Query Patterns

### `impact_query(rid, depth)` — ForwardProp: "what depends on X"

Answers: if I change `X`, what is the full set of files/types/tests/docs that will need to change?

This is a forward traversal: start at `rid`, follow all outbound `import` / `export` / `extends` / `implements` / `codegen` / `test-covers` edges up to `depth` levels.

```typescript
// MCP handler sketch
const graph = registry.walkTransitive(rid, depth ?? 5);
return {
  root: rid,
  affectedCount: graph.nodes.length - 1,  // minus root
  nodes: graph.nodes,
  edges: graph.edges
};
```

In palantir-math, `impact_query("palantir-math/ontology/data.ts#EntityType:Problem", 5)` should return:
- Depth 1: `problems.ts`, `problemQuery.ts`, `problem.generated.ts` (codegen edge)
- Depth 2: `queries/index.ts`, `resolvers/problem.ts`
- Depth 3: `src/index.ts` (re-export relay)
- Depth 4: consumers in `mathcrew/` that import from palantir-math
- Depth 5: tests that exercise those consumers

Without the graph, an agent must reconstruct this chain from grep results across 3,000 files. With the graph, the answer is a single `SELECT` + breadth-first walk in <100ms.

### `pre_edit_impact(rid)` — BackwardProp: "what X depends on"

Answers: before I edit `rid`, what does it depend on that I should understand or freeze?

This is a backward traversal: start at `rid`, follow all inbound edges. Returns the set of files/types that `rid` imports or extends — i.e., the "upstream" that could silently change and break `rid`.

```typescript
const inbound = registry.queryBackward(rid);
// returns: ImpactEdgeDeclaration[] where toRid === rid
```

In mathcrew, `pre_edit_impact("mathcrew/src/runtime/orbit-camera.ts")` returns the set of types `orbit-camera.ts` depends on. If any of those have recent changes (compare `verifiedAt` vs last commit timestamp), the agent should re-read them before editing.

### Transitive walks with depth cap

Unconstrained transitive walks in a large graph can produce arbitrarily large result sets. The depth cap is mandatory. Recommended defaults:

| Use case | Depth cap |
|----------|-----------|
| Pre-edit check (backward) | 3 |
| Direct impact query (forward) | 5 |
| Full propagation audit | 8 |
| Dead-code detection | unlimited (with visited-set cycle guard) |

The `ImpactEdgeRegistry.walkTransitive` implementation in the schema primitive includes a cycle-breaking visited set. Do not remove it: circular imports are valid TypeScript in some module systems and the walker must handle them gracefully.

---

## Foundry Parallel

### Maven dependency tree analog

Maven's `mvn dependency:tree` answers: "given this artifact, what is the full transitive closure of its compile-time dependencies?" The command is cached, deterministic, and sub-second. No engineer manually traces `pom.xml` chains to understand what breaks when a library updates.

The `ImpactEdge` graph is the TypeScript equivalent. `impact_query` is `mvn dependency:tree` for the ontology-first stack. The philosophical parallel is exact: deterministic, queryable, cached — not grep, not intuition.

### Foundry ImpactGraph reference

Palantir's Foundry platform uses an internal impact graph to answer "which datasets/transforms/pipelines depend on this ontology type?" before allowing schema changes. Schema changes that would break downstream consumers are blocked at the platform level until consumers are updated or explicitly acknowledged. The `pre_edit_impact` hook pattern mirrors this: before a file edit, check whether its upstream dependencies have changed in ways that would break the edit's assumptions.

The key Foundry insight is: the graph is a **first-class citizen of the platform**, not a secondary analysis tool. It is built incrementally as code changes (not re-derived on demand), stored durably (not in volatile process memory), and queried via a typed API (not ad-hoc grep). The palantir-mini implementation targets this same property set.

### Why this is not re-solving compile dependency graphs

TypeScript's compiler already tracks import relationships. Why not just run `tsc --listFiles` or parse `tsconfig.json`?

Two reasons:

1. **Ontology awareness**: The `ImpactEdge` graph is not a flat import graph. It understands the authority chain (`research → schemas → project ontology → runtime`). An edge from `palantir-math/ontology/data.ts` to `palantir-math/src/generated/registry.ts` is tagged `codegen` — not just `import`. That tag tells the query system: "this edge crosses the codegen boundary; changes to the source require regeneration, not just recompilation." A flat import graph cannot express this.

2. **Cross-project edges**: `tsc` operates within a single `tsconfig.json` project boundary. The impact graph spans multiple projects (`palantir-math → mathcrew`, `palantir-math → home ontology`). Cross-project edges are first-class in the `ImpactEdge` schema (`fromRid` and `toRid` carry project prefixes). The compiler has no cross-project edge concept.

The impact graph extends, rather than replaces, TypeScript's type system. It adds semantic layer tags (codegen, semantic, doc-references, test-covers) and cross-project traversal on top of the compiler's structural analysis.

---

## Integration Points

### `pm-verify` (`mcp__palantir-mini__pm_verify`)

Before allowing a commit, `pm-verify` checks: (a) generated files are in sync with their source hash; (b) no `codegen` edge source has changed without a corresponding regeneration. The SQLite `file_hash` column is the comparison datum. If `file_hash` in the DB differs from the current file's SHA-256, the edge is stale and `pm-verify` blocks until either the generated file is refreshed or the edge is explicitly acknowledged as intentionally stale.

### `pre_edit_impact` hook (`PreToolUse(Edit|Write)`)

Fires before any `Edit` or `Write` call. Calls `pre_edit_impact` against the target file's RID. If the backward-walk result includes files that have changed since the last `verifiedAt` timestamp, injects a warning as `additionalContext`:

```
Pre-edit impact: orbit-camera.ts depends on AdaptiveTier (changed 2h ago) and CameraConfig (changed 3 days ago). Review both before editing.
```

The warning does not block (Advisory hook). It reduces blind-edit incidents where an agent edits a file without noticing that its dependencies have drifted.

### `populate_impact_graph` MCP (`mcp__palantir-mini__populate_impact_graph`)

Triggers a full AST walk of a specified project path and writes all extracted edges to the SQLite cache. Emits one `impact_edge_registered` event per edge to `events.jsonl`. Expected runtime: 30-60s for a 3,000-file TypeScript project on a modern laptop. After population, the `ImpactEdgeRegistry` is loaded from SQLite on the next session boot and all query tools become sub-100ms.

Parameters:
```typescript
{
  projectPath: string;   // absolute path to project root
  forceRefresh?: boolean; // ignore existing file_hash values; re-scan all
  edgeKinds?: ImpactEdgeKind[]; // filter to specific edge kinds (default: all)
}
```

### `impact-graph-refresh` monitor (`monitors.ts`)

Plugin `monitors` manifest key (v2.1.105) auto-arms this background `Monitor` stream at session start. The monitor performs a full re-walk of each tracked project every 24 hours. Between walks, incremental updates fire via the `PostToolUse(Edit|Write)` hook. The monitor emits `impact_graph_refreshed` events to `events.jsonl` with a count of added/updated/removed edges.

Because `Monitor` invocations consume no LLM tokens (they run shell scripts), this continuous background refresh is effectively free under the Max 20x subscription tier.

---

## Limits + Future

### Non-TypeScript files

The current AST walker targets `.ts` and `.tsx` files only. The palantir-math + mathcrew stacks are TypeScript-only, so this is not an immediate gap. However, the home control plane includes `.json` configuration files, `CLAUDE.md` Markdown files, and shell scripts that also form dependency relationships (hooks reference MCP tools; CLAUDE.md imports from rules/).

Planned extension: a lightweight non-TypeScript edge extractor using:
- **JSON**: `jq`-based path traversal for cross-file references in `managed-settings.d/*.json`, `hooks.json`, `plugin.json`.
- **Markdown**: regex-based extraction of `@import`, `@path`, and explicit file citations in CLAUDE.md files.
- **Go/Python** (future): language server protocol (LSP) `textDocument/definition` calls to extract cross-file references. LSP provides compiler-grade accuracy without bundling language-specific parsers.

The `ImpactEdgeKind` enum has sufficient room for these extensions (`semantic`, `doc-references` already exist).

### Runtime call graphs

The static AST walk captures compile-time relationships. It does not capture:
- Dynamic imports (`import(path)` where `path` is a variable)
- Runtime call chains (function A calls function B only when a condition is true)
- MCP tool invocation patterns (which tools an agent actually calls vs which it is allowed to call)

Future: combine static AST edges with runtime traces (OpenTelemetry spans or `events.jsonl` call sequences) to build a hybrid static/dynamic graph. The `confidence` field in `ImpactEdgeDeclaration` is the integration point: static edges have `confidence: 1.0`; dynamically-observed edges start at `confidence: 0.6` and converge toward 1.0 as more trace evidence accumulates.

This hybrid approach mirrors Palantir's production Foundry graph, which combines static schema analysis with observed pipeline execution traces to assign dependency confidence scores.
