# Runtime Support — Adapters Built, Not Wired to Run

Status: adapter-generation code and bindings for all three runtimes ARE
built and parity-tested (Wave 6 complete; 3-adapter semantic parity verified
in Wave-9 acceptance) — this is not a placeholder. But: (a) only Claude has
a native install manifest (`.claude-plugin/plugin.json`); `.codex-plugin/
plugin.json` is absent (**Gap A**) and Gemini is by-design a neutral
fallback; (b) the plugin now declares an `mcpServers` entry and ships
`bridge/mcp-server.ts`, so the Claude adapter IS wired to a running stdio
surface — but that surface is currently the 8 generated `queryCapability_*`
tools only, which are runtime-capability introspection, **not** Ontology
reads or Actions (**Gap B: transport closed, semantic surface still open**).
The Ontology read/act surface in `src/altitude2/` remains unreachable from
any tool call. Both plugins also remain disabled. For
the evidence behind this status, read
`harness-upstream/_workspace/2026-07-17-palantir-ontology-successor/decisions/final-completion-report.md`
directly rather than a restated summary here — current per-runtime
capability facts are refresh-first and volatile; this document points at
the sourced-and-dated matrix rather than duplicating specific version
numbers or feature claims that will drift.

## Install-level packaging status (Gap A)

Three runtimes, two native manifests, one **deliberate** neutral fallback:

| runtime | native install manifest | transport |
|---|---|---|
| Claude | `.claude-plugin/plugin.json` — inline `mcpServers` object | stdio, `bridge/mcp-server.ts` |
| Codex | `.codex-plugin/plugin.json` — `mcpServers` as a **path string** to `./.mcp.json` | stdio, `bridge/mcp-server.ts` |
| Gemini | **none, by design** — see below | neutral MCP/CLI via `.mcp.json` |

**Gemini's absent manifest is a decision, not a gap.** `src/adapters/gemini/`
exports `NATIVE_PACKAGING_STATUS = {supported: false, transportMode:
"neutral-mcp-cli"}` — a deliberately hand-authored constant, not a
registry-derived one, asserted by `tests/.../generator.test.ts`. Gemini ships no
`gemini-extension.json` / `.gemini-plugin/` packaging convention, so per campaign
decision A640 the successor provides a neutral MCP/CLI transport and **marks
native packaging unsupported rather than fabricating native support**
(`context/execution-plan.md`: *"If no native package exists, provide a neutral
MCP/CLI transport, mark native packaging unsupported, and test that claim."*).
`decisions/i1110-codex-manifest-gap.md` records the same conclusion: Gemini's
missing manifest is *"by-design … not a gap"*, whereas the Codex manifest *"was
never created and is not a generated artifact"* — hence it is hand-authored here.

Both manifests are **hand-written, not generated**: `CodexManifestSkeleton` in
`src/adapters/codex/types.ts` carries capability *facts* (`runtimeId`,
`transports`, `configPaths`, …), not packaging fields, and no generator emits a
`plugin.json`. Do not "regenerate" these.

**Declared capability is `Read` only** — deliberately narrower than
palantir-mini's `["Read","Write"]`. The exposed MCP surface is the 8 generated
`queryCapability_*` read-only tools; declaring `Write` would overstate what this
plugin can do and contradict the consumer-surface boundary.

## What lives here

The compatibility matrix for `src/adapters/{shared,codex,claude,gemini}/`:
which generated-adapter surface exists per runtime, current known-unsupported
features per runtime, and current `UNKNOWN` (refresh-required) capability
cells. Manifest paths for each runtime's own packaging format must follow
current official runtime documentation, refreshed at build time — never
copied from a prior snapshot without re-verification.

## Current runtime-capability evidence

`outputs/r210-runtime-capability-matrix.md` (harness-upstream workspace
`_workspace/2026-07-17-palantir-ontology-successor/`) is the sourced,
dated, 3-runtime (Codex / Claude Code / Gemini CLI) x 8-area capability
matrix this plugin's generated adapters must be built against. It carries
its own `UNKNOWN` list (`UNKNOWN-is-not-PASS` — those cells block any
Wave-11 install claim until refreshed) — read it directly rather than a
restated summary here.

## Generated-adapter ADR

`docs/architecture.md` ADR-007 (Generated runtime adapters) is the binding
decision for how `src/adapters/**` is generated from the semantic core and
what "generated" means for this plugin (mandatory header, drift check via
`bun run generated:check` once `P340` scaffolds it). Codex public MCP input
schemas must remain flat and must not use `anyOf`, `oneOf`, `allOf`, or
`not` (execution-plan.md section 6.2).
