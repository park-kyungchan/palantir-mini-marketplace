# Golden Fixtures — ontology_context_query

Sprint-099 PR 3.7 (canonical plan v2 §4 row 3.7; Phase 3 PR 7/7).

## Purpose

These golden fixtures assert the structural shape of `ontology_context_query` output across 5 canonical scenario shapes. They are NOT snapshot tests of exact field values — volatile fields (timestamps, file-system-dependent counts, per-RID impact sequences) are explicitly marked with `<volatile:*>` placeholders and are skipped during comparison.

## Fixture Format

Each scenario is a paired `NN-<name>.input.json` + `NN-<name>.expected.json`:

- **input.json**: valid `OntologyContextQueryInput` object. `"project": "<sandbox>"` is a placeholder replaced at test runtime with a `fs.mkdtempSync` sandbox directory.
- **expected.json**: structural shape expected from the handler. All values are assertions UNLESS they contain a `<volatile:*>` placeholder string, in which case the field is shape-checked only (present + correct type) rather than equality-checked.

### Volatile placeholder convention

| Placeholder | Assertion |
|-------------|-----------|
| `"<volatile:string>"` | field is typeof string |
| `"<volatile:boolean>"` | field is typeof boolean |
| `"<volatile:number>"` | field is typeof number |
| `"<volatile:number_0_to_1>"` | number in [0, 1] |
| `"<volatile:iso8601>"` | string matching ISO 8601 pattern |
| `"<volatile:array>"` | Array.isArray |
| `"<volatile:array_max_50>"` | Array.isArray && length ≤ 50 |
| `"<volatile:array_length_N>"` | Array.isArray && length === N |
| `"<volatile:string|null>"` | string or null |
| `"<volatile:object>"` | non-null object |
| `"<volatile:enum:a|b|c>"` | value ∈ {a, b, c} |
| special `"available": "<volatile:boolean>"` | field is typeof boolean (truthy or falsy — sub-object tested separately) |

### `_shape_only` and `_description`

Top-level `_shape_only: true` marks the expected.json as a shape-only document. `_description` is a human-readable note; both fields are ignored during comparison.

## Scenarios

| # | File prefix | Key invariant |
|---|-------------|---------------|
| 1 | `01-minimal-query` | All 7 sub-contexts present; `requiredContracts` empty (no mutation path); fresh sandbox → `nonGoals`, `userNonGoals` empty |
| 2 | `02-multi-rid-query` | 5 scopePaths + 2 requestedAxes → `axisRids.length == 7`; `contracts/` + `schemas/` path → `requiredContracts` == `["SemanticIntentContract","DigitalTwinChangeContract"]` |
| 3 | `03-empty-graph` | `includeImpact=false` → `impactContext` absent, `graphConfidence == 1.0`, `missingEdges == []`, `recommendedAgentUse == "lead-direct"` |
| 4 | `04-high-risk-intent` | `contracts/` scopePath triggers mutation surface; `riskContext` is composed diagnostic data but ontology_context_query still does NOT auto-create approval gates |
| 5 | `05-low-confidence` | Nonexistent RID path causes impact_query failure → per-RID graphConfidence degrades to 0 → `recommendedAgentUse == "bounded-explorer"` |

## Running Tests

```bash
cd .claude/plugins/palantir-mini
bun test tests/golden/ontology-context-query
```

## Refreshing Expected Outputs

There is currently no `bun run gen:golden` automation — expected.json files are authored by hand to declare shape invariants, not to capture volatile runtime output. If the output schema changes (new field added, discriminant renamed), update the affected expected.json files manually and update this README.

## Claude vs Codex Parity Policy

### Claude in-process MCP

**Covered by these tests.** The golden.test.ts runs `ontology_context_query` directly via the TypeScript import, which is identical to how the Claude in-process MCP handler executes it.

### Codex runtime parity

**NOT YET COVERED — CODEX-PARITY-GAP.**

The `ontology_context_query` handler is exposed over the same `bridge/mcp-server.ts` MCP surface consumed by both Claude and Codex runtimes. Codex reaches it via `config.toml` → MCP bridge (rule 27 §Codex append discoverability). The handler logic is identical, but the IPC path (JSON-RPC over stdio vs in-process module call) differs.

Parity proof requires:
1. Codex runtime available with `~/.claude/plugins/palantir-mini/bridge/mcp-server.ts` registered in `config.toml`.
2. A `bun run test:codex-parity` script that calls the tool over the Codex MCP bridge and compares structural shape against the same expected.json files.

**Reason deferred**: Codex MCP wiring configuration is not available in the current session. The golden.test.ts includes one `it.skip` placeholder per fixture marked `CODEX-PARITY-GAP` so the gap is visible in test output.

**Future PR**: Add `tests/golden/ontology-context-query/codex-parity.test.ts` + `bun run test:codex-parity` npm script once Codex MCP is confirmed wired and reachable.
