# Claude Binding (generated) — source-vs-cache, reload, and mechanism boundary

Ledger row A630, docs/architecture.md ADR-007. This directory is a
**generated** Claude runtime binding: `binding.generated.ts` is produced by
`generator.ts` from `src/adapters/shared/capability-registry.json` (A610's
neutral capability source) and must never be hand-edited — `drift-check.ts`
+ `generated-check.test.ts` detect a hand-edit and fail. Mirrors
`src/adapters/codex/`'s exact structure (the established Wave-6 pattern):
generator + `binding.generated.ts` + drift-check + colocated tests, one
module per file, never a shared cross-runtime module folded into
`src/adapters/shared/`.

## Scope note (write-set boundary)

This binding is regenerated with `bun run src/adapters/claude/generate.ts`,
not the shared `bun run generate:all` / `bun run generated:check`
(`scripts/generators/run-all.ts`, `scripts/generated-check.ts`). Those two
files are outside this row's exact write set — only `A610` holds
`scripts/**` (`decisions/w6-write-set-adjudication.md`), the same scope
note `A620` recorded for Codex. `drift-check.ts` reimplements the same
recompute-and-diff check locally so the "hand-edit is detectable" guarantee
holds without a write outside this row's write set.

## Source vs. installed cache

- **Source of record (this row writes here only)**:
  `/home/palantirkc/palantir-mini-marketplace/plugins/palantir-ontology/src/adapters/claude/`.
- **Installed Claude Code plugin cache (never written by this row, or by
  anything in this campaign before the explicit Wave 11 gate)**:
  `~/.claude/plugins/cache/**` — a protected path for every Wave 6 worker
  (spawn-prompts/a630.md's protected set). This scaffold has no live
  marketplace registration yet; a later wave adds successor entries to the
  marketplace manifest, and `do not install` is explicit through Wave 6.

## Reload (Claude Code, refresh-first)

Claude Code's own reload/install mechanics are refresh-first, not a fact
this plugin restates from memory: cite
`context/official-runtime-refresh.md` (R210 evidence, harness-upstream
workspace `_workspace/2026-07-17-palantir-ontology-successor/`) rather than
a copied version-specific claim. At the time R210 was recorded, the
`reloadInstall` verdict was `supported`, mechanism "`/reload-plugins`
reloads active plugins (skills, agents, hooks, MCP, LSP) without restart;
`/reload-skills` rescans standalone skills; MCP-changing reloads may need
`--force` (invalidates prompt cache)"
(`src/adapters/shared/capability-registry.json`,
`profiles.claude.capabilities.reloadInstall`) — read that field directly
(`CLAUDE_BINDING.manifest.capabilities`) rather than a restated summary
here, since it is carried forward verbatim from R210 and will only change
on a fresh refresh.

## Flat MCP schema policy

Every `CLAUDE_BINDING.tools[].inputSchema` is flat: `type`, `properties`,
`required`, `additionalProperties` only, never `anyOf`/`oneOf`/`allOf`/
`not` (execution-plan.md §6.2). R210 records Claude's own
`schemaFlatLimits.officialRule` verdict as `unknown` — "No Claude-specific
flat-schema or combinator restriction found in the targeted official
MCP/plugin pages" — so this is the campaign's conservative local generation
policy (docs/architecture.md ADR-007 "Grounded evidence"), not a claim that
Claude officially requires it, the same posture A620 recorded for Codex's
identical `unknown` verdict on this area. `flat-schema.ts`'s
`isFlatMcpInputSchema` enforces this mechanically against every schema this
directory ships (`flat-schema.test.ts`).

## Mutation-authority / ControlPlaneNodeKind boundary (mission requirement)

This row's mission is explicit: "Do NOT reuse Claude mechanisms (hooks,
skills, agents, memory) as semantic authority — they are
`ControlPlaneNodeKind` runtime metadata, never a source of
mutation-authority or product-primitive meaning (ADR-001/ADR-003/ADR-007)."
`mechanism-classification.ts` names the concrete mapping — Claude's
`hooks`/`skillsCommands`/`subagents` capability areas classify as the
`hook`/`skill`/`agent` `ControlPlaneNodeKind` values respectively (never as
a product `ObjectType`/`ActionType`/`Function`/`Interface`, never as
`mutation-authority`) — and `mechanism-classification.test.ts` proves both
directions mechanically: each mapped kind is a registered
`ControlPlaneNodeKind`, and each is disjoint from the product-primitive
`PrimitiveKind` vocabulary (`src/altitude1/staged-construction.ts`), plus
that `CLAUDE_BINDING`'s own JSON text carries none of
`src/adapters/shared/types.ts`'s `FORBIDDEN_SEMANTIC_FIELD_TERMS` (e.g.
`mutationAuthority`, `semanticIntent`, `digitalTwinChange`). This directory
also carries no `math-KG` or other consumer-domain content
(consumer-domain-ownership, AGENT-CONTRACT.md §4).
