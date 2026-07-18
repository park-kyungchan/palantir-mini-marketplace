# Codex Binding (generated) — source-vs-cache and reload

Ledger row A620, docs/architecture.md ADR-007. This directory is a
**generated** Codex runtime binding: `binding.generated.ts` is produced by
`generator.ts` from `src/adapters/shared/capability-registry.json` (A610's
neutral capability source) and must never be hand-edited — `drift-check.ts`
+ `generated-check.test.ts` detect a hand-edit and fail.

## Scope note (write-set boundary)

This binding is regenerated with `bun run src/adapters/codex/generate.ts`,
not the shared `bun run generate:all` / `bun run generated:check`
(`scripts/generators/run-all.ts`, `scripts/generated-check.ts`). Those two
files are outside this row's exact write set — only `A610` holds
`scripts/**` (`decisions/w6-write-set-adjudication.md`). `drift-check.ts`
reimplements the same recompute-and-diff check locally so the "hand-edit is
detectable" guarantee holds without a write outside this row's write set.
Filed as a scope note in `outputs/a610-runtime-adapters.md`'s `## A620`
section for the Lead to fold into the shared runner in a later wave if
desired.

## Source vs. installed cache

- **Source of record (this row writes here only)**:
  `/home/palantirkc/palantir-mini-marketplace/plugins/palantir-ontology/src/adapters/codex/`.
- **Installed Codex cache (never written by this row, or by anything in
  this campaign before the explicit Wave 11 gate)**:
  `~/.codex/plugins/cache/**` — a protected path for every Wave 6 worker.
  This scaffold has no live marketplace registration yet; `A670` adds
  successor entries to the marketplace manifest, and `do not install` is
  explicit through Wave 6.

## Reload (Codex CLI, refresh-first)

Codex's own reload/install mechanics are refresh-first, not a fact this
plugin restates from memory: cite
`context/official-runtime-refresh.md` (R210 evidence,
harness-upstream workspace `_workspace/2026-07-17-palantir-ontology-
successor/`) rather than a copied version-specific claim. At the time R210
was recorded, the reload mechanism verdict was `supported`, mechanism "install
via in-session `/plugins` browser; bundled skills/tools available in a new
chat or CLI session" (`src/adapters/shared/capability-registry.json`,
`profiles.codex.capabilities.reloadInstall`) — read that field directly
(`CODEX_BINDING.manifest.capabilities`) rather than a restated summary here,
since it is carried forward verbatim from R210 and will only change on a
fresh refresh.

## Flat MCP schema policy

Every `CODEX_BINDING.tools[].inputSchema` is flat: `type`, `properties`,
`required`, `additionalProperties` only, never `anyOf`/`oneOf`/`allOf`/
`not` (execution-plan.md §6.2). R210 records Codex's own
`schemaFlatLimits.officialRule` verdict as `unknown` — "no current public
Codex-specific rule found requiring flat schemas" — so this is the
campaign's conservative local generation policy (docs/architecture.md
ADR-007 "Grounded evidence"), not a claim that Codex officially requires
it. `flat-schema.ts`'s `isFlatMcpInputSchema` enforces this mechanically
against every schema this directory ships (`flat-schema.test.ts`).
