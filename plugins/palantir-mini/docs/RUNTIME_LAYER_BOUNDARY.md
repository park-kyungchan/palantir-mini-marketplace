# Runtime Layer Boundary

palantir-mini must keep workflow semantics independent from the LLM provider
that invokes it. In this checkout the only active install target is Codex. Claude
and Gemini packaging/install surfaces have been removed locally and can be added
later through their own marketplace paths.

The machine-readable source for this boundary is
`contracts/layer-boundary.contract.json`, validated by
`schemas/layer-boundary.schema.json` and
`scripts/verify-layer-boundary.ts`.

## Source Of Truth

- Runtime-neutral local source checkout: `/home/palantirkc/palantir-mini-marketplace`
- Upstream source: `https://github.com/park-kyungchan/palantir-mini-marketplace`
- Plugin source root: `/home/palantirkc/palantir-mini-marketplace/plugins/palantir-mini/`
- Active local install target: Codex marketplace only
- Release path: branch -> PR -> merge to `main` -> Codex marketplace refresh/install

Any implementation plan for palantir-mini self-improvement must name the source
repo, branch, remote, plugin source root, and Codex install/cache path before
editing.

## LayerBoundaryV1 Roles

`LayerBoundaryV1` separates six roles:

| Role | Authority | Protected mutation authority |
|---|---|---|
| `llm-provider` | metadata-only | none |
| `runtime-adapter` | runtime-owned | none |
| `plugin-source` | source-of-truth | deterministic source authority |
| `project-state` | state evidence | append-only evidence, not approval |
| `runtime-cache` | installed payload | install refresh only |
| `marketplace-root` | repository root | deterministic release authority |

Protected mutation is denied by default unless deterministic evidence is
complete. Free text, advisory review cards, provider identity, runtime cache
presence, and prompt-front-door ref strings without approved bodies are
non-authorizing inputs.

## Native Runtime Consumer

| Runtime | Native install surface | Runtime-owned state | Cache/install payload rule |
|---|---|---|---|
| Codex | local dev: `codex plugin marketplace add /home/palantirkc/palantir-mini-marketplace`; post-merge: `codex plugin marketplace add park-kyungchan/palantir-mini-marketplace --ref main`; then `codex plugin add palantir-mini@palantir-mini-marketplace` | `~/.codex/config.toml`, Codex hooks, MCP exposure, memories, `/plugins`, `/hooks`, `/mcp`, restart/reload state | `~/.codex/plugins/cache/**` is an installed payload; do not edit as semantic authority |

Claude and Gemini runtime install/package paths are intentionally absent from the
current local checkout. Do not keep source-looking Git working copies under
runtime homes such as `~/.claude/plugins/marketplaces/palantir-mini-marketplace`
or `~/.codex/.tmp/marketplaces/palantir-mini-marketplace`. Treat the runtime
home prefix as installation locality, not semantic ownership.

## PR5 Runtime Adapter Contracts

PR5 separates runtime-neutral core contracts from per-runtime adapter contracts.
The per-runtime source contract slots are
`runtime-adapters/claude/contract.json`,
`runtime-adapters/codex/contract.json`, and
`runtime-adapters/gemini/contract.json`, with shared shape in
`core/contracts/runtime-adapter-contract.ts`. Treat those paths as plugin-source
contracts only. They describe how a native runtime may consume the
runtime-neutral core; they do not authorize protected mutation and do not make
an unsupported runtime active.

| Adapter contract slot | Current support claim | Required evidence before active-runtime claim |
|---|---|---|
| `runtime-adapters/codex/contract.json` | Codex is the only active package/install target in this checkout. | Source-complete branch, Codex reinstall/reload/restart, and Codex smoke evidence such as `contracts/runtime-evidence/codex.json` plus targeted tests. |
| `runtime-adapters/claude/contract.json` | Contract-only `runtime_gap` / unsupported surface. | Native Claude package/install surface plus smoke evidence checked into source authority. |
| `runtime-adapters/gemini/contract.json` | Contract-only `runtime_gap` / unsupported surface. | Native Gemini package/install surface plus smoke evidence checked into source authority. |

Provider identity remains metadata. A per-runtime adapter contract can document
protocol shape, reload requirements, and unsupported gaps, but it cannot approve
SemanticIntentContracts, DigitalTwinChangeContracts, WorkContracts, release
gates, or ontology mutations.

## Required Mental Model

```text
LLM/provider metadata
  -> runtime adapter contract (Codex active; Claude/Gemini unsupported gaps)
  -> installed palantir-mini payload
  -> deterministic palantir-mini contracts, handlers, validation, lineage
```

Provider identity may affect available hooks, tool names, approval UX, reload
requirements, and subagent APIs. It must not affect the meaning of a
SemanticIntentContract, DigitalTwinChangeContract, WorkContract, resolver output,
release gate, or ontology primitive.

## Self-Improvement Checklist

Before editing palantir-mini itself, write down:

1. Runtime-neutral local source checkout, GitHub source remote, branch, and plugin root.
2. Codex marketplace registration and cache paths that must not be edited.
3. Inactive runtime surfaces that must stay absent in this checkout: Claude plugin packaging and Gemini extension packaging.
4. Runtime gaps: which hooks, MCP tools, skills, subagents, or reload steps differ natively in Codex.
5. Deterministic plugin-layer invariant: which behavior must remain identical regardless of LLM provider.

If a plan does not separate those items, stop and fix the plan before
implementation.

## Verification

Run the layer-boundary verifier before release:

```bash
bun run scripts/verify-layer-boundary.ts
```

The verifier emits JSON with `valid`, `issues`, `contractPath`, `schemaPath`, and
`checkedRoles`. Blocking reason codes are stable `LAYER_BOUNDARY_*` values and
deny protected mutation when contract, schema, provider, runtime cache, advisory
input, or deterministic evidence checks fail.
