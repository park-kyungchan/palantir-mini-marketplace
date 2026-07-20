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
