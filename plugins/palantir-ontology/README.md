# palantir-ontology

Successor Ontology-First runtime for the `~/projects` fleet — the governed
semantic + kinetic digital twin (Data+Logic+Action+Security decisions) that
every consumer project BINDS to instead of re-deriving. Replaces
`plugins/palantir-mini` under the PM-1/PM-2/... merge sequence defined in
`context/execution-plan.md` (harness-upstream workspace
`_workspace/2026-07-17-palantir-ontology-successor/`).

Status: **SOURCE/BUILD phase complete, merged, and validated; RUNTIME dormant.**
Every subsystem this README's layer diagram names below — `src/semantic-core`,
`src/altitude1/2`, `src/governance`, `src/control-plane`, `src/memory`,
`src/lineage`, `src/migration`, and the generated-adapter logic — is real,
tested code, not scaffold. But the runtime is NOT activated:
`.claude-plugin/plugin.json` now declares an `mcpServers` entry served by
`bridge/mcp-server.ts`, but that surface exposes only the 8 generated
`queryCapability_*` capability-introspection tools — the Ontology read/act
surface in `src/altitude2/` is not reachable from any tool call, and no
Action can be executed through this plugin. Wave-11 runtime activation
reached the `retain-legacy-with-rationale` terminal (no cutover); legacy
`plugins/palantir-mini` remains the plugin with the substantive runtime
surface (currently disabled, demand-driven). Both plugins are disabled, and
this plugin is **not** `load-bearing`. For the evidence behind this
status (acceptance results, gate outcomes, test counts) read
`harness-upstream/_workspace/2026-07-17-palantir-ontology-successor/decisions/final-completion-report.md`
directly rather than a restated summary here. Nothing under
`plugins/palantir-ontology/` is copied from `plugins/palantir-mini/`; see
`docs/compatibility-matrix.md` for the record of which legacy surfaces
intentionally do not port forward, and why.

## Layers (one-way dependency direction)

```text
consumer domain Ontology source
        |
        v
versioned neutral contracts and references      <- contracts/, schemas/
        |
        v
semantic core: construction, operation,
governance, memory, lineage                      <- src/semantic-core,
                                                      src/altitude1, src/altitude2,
                                                      src/governance, src/control-plane,
                                                      src/memory, src/lineage, src/migration
        |
        v
application services and deterministic
validators                                        <- src/ (validators live beside
                                                      the layer they check)
        |
        v
generated runtime bindings                        <- src/adapters/{shared,codex,claude,gemini}
```

The semantic core may not import a runtime adapter. Adapters may import
public semantic-core contracts only. The consumer may bind to this plugin;
this plugin may not copy consumer domain definitions into its own semantic
core (**consumer-domain-ownership** — execution-plan.md section 1.3).

Runtime/control surfaces that this plugin itself owns — its own hooks,
skills, MCP handlers, adapters, and generated bindings — are inventoried as
metadata in a local **ControlPlaneNodeKind** catalog (`src/control-plane/`,
populated from P450 onward), never as Palantir ObjectTypes, Interfaces,
Action Types, Functions, permissions, or consumer Ontology entities.

## Navigation

- `BROWSE.md` — question router.
- `INDEX.md` — file index.
- `AGENT-CONTRACT.md` — the read/write/mutation-authority contract every
  worker (human or agent) editing this plugin must hold.
- `docs/architecture.md` — the 8 binding ADRs (ownership, dependency
  direction, `ControlPlaneNodeKind`, state machines, mutation authority,
  storage authority, generated adapters, legacy compatibility).
- `docs/compatibility-matrix.md` — manifest of legacy `palantir-mini`
  surfaces that are intentionally absent from this plugin (merge /
  externalize / deprecate / remove / retain-legacy-only / UNKNOWN
  dispositions from `outputs/p210-legacy-surface-census.md`).
- `docs/migration.md`, `docs/runtime-support.md` — pointers, populated as
  Wave 4-6 land (construction/mutation safety, memory/replay/migration,
  generated adapters).

## Build

```bash
bun install
bun run typecheck
bun test
bun run test:contracts   # scoped: contracts/*.contract.json fixtures + reason-code registry + neutrality
```

`math-KG-excluded`: this plugin never reads or references
`curriculum-kg`/`exam-corpus`/`academy-corpus`/`palantir-math-clone` or any
other N210-discovered math-protected content; math consumer Ontology work is
out of scope for this plugin's own source tree.
