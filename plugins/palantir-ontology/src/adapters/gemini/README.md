# Gemini Binding (generated) — source-vs-cache, reload, native-packaging, and mechanism boundary

Ledger row A640, docs/architecture.md ADR-007. This directory is a
**generated** Gemini runtime binding: `binding.generated.ts` is produced by
`generator.ts` from `src/adapters/shared/capability-registry.json` (A610's
neutral capability source) and must never be hand-edited — `drift-check.ts`
+ `generated-check.test.ts` detect a hand-edit and fail. Mirrors
`src/adapters/codex/`'s and `src/adapters/claude/`'s exact structure (the
established Wave-6 pattern): generator + `binding.generated.ts` +
drift-check + flat-schema + `mechanism-classification.ts` + colocated tests,
one module per file, never a shared cross-runtime module folded into
`src/adapters/shared/`.

## Scope note (write-set boundary)

This binding is regenerated with `bun run src/adapters/gemini/generate.ts`,
not the shared `bun run generate:all` / `bun run generated:check`
(`scripts/generators/run-all.ts`, `scripts/generated-check.ts`). Those two
files are outside this row's exact write set — only `A610` holds
`scripts/**` (`decisions/w6-write-set-adjudication.md`), the same scope
note `A620`/`A630` recorded for Codex/Claude. `drift-check.ts` reimplements
the same recompute-and-diff check locally so the "hand-edit is detectable"
guarantee holds without a write outside this row's write set.

## Source vs. installed cache

- **Source of record (this row writes here only)**:
  `/home/palantirkc/palantir-mini-marketplace/plugins/palantir-ontology/src/adapters/gemini/`.
- **Installed Gemini CLI extension cache**: no `~/.gemini/extensions/**`
  entry exists for this plugin at all — this row ships no native package
  (see "Native packaging" below), so there is nothing installed to protect
  beyond the general protected-set discipline (`spawn-prompts/a640.md`).
  This scaffold has no live marketplace registration yet; a later wave adds
  successor entries to the marketplace manifest, and `do not install` is
  explicit through Wave 6.

## Native packaging: unsupported at this marketplace, neutral MCP/CLI transport shipped instead

This row's mission (execution-plan §9 row A640 / docs/architecture.md
ADR-007) is explicit: "If Gemini has no native plugin package compatible
with the marketplace at generation time, provide a neutral MCP/CLI
transport, mark native packaging unsupported, and test that claim — do not
fabricate native support." A read-only scan of this marketplace at
generation time found `.codex-plugin/` and `.claude-plugin/` packaging
conventions (used by the legacy `palantir-mini` plugin and this successor's
own `.claude-plugin/marketplace.json`) but **no** `gemini-extension.json` /
`.gemini-plugin/` convention anywhere in this marketplace. `generator.ts`'s
`NATIVE_PACKAGING_STATUS` constant therefore records
`{ supported: false, transportMode: "neutral-mcp-cli" }`, carried into
every generated `GEMINI_BINDING.manifest.nativePackaging` — and this
binding's 8 flat `queryCapability_<area>` MCP tools (below) ARE that
neutral transport, not a placeholder.

This is a **marketplace-packaging** determination, not a downgrade of R210's
own official-source fact about Gemini CLI itself: R210 records Gemini CLI's
`packagingManifest` verdict as `supported` (Gemini CLI's own documentation
does support `gemini-extension.json` extensions in the abstract,
`src/adapters/shared/capability-registry.json`,
`profiles.gemini.capabilities.packagingManifest`) — that fact is carried
forward verbatim, unmodified, in `GEMINI_BINDING.manifest.capabilities`.
The two claims answer different questions and both are recorded, side by
side, never conflated: "does Gemini CLI support this abstractly" (yes, per
R210) vs. "has this marketplace built that packaging surface for this
plugin yet" (no, per this row's read-only scan) — `generator.test.ts`'s
"native packaging" describe block proves both, including a live repository
scan (not a prose assertion) that no such convention exists.

## Reload (Gemini CLI, refresh-first)

Gemini CLI's own reload/install mechanics are refresh-first, not a fact
this plugin restates from memory: cite
`context/official-runtime-refresh.md` (R210 evidence, harness-upstream
workspace `_workspace/2026-07-17-palantir-ontology-successor/`) rather than
a copied version-specific claim. At the time R210 was recorded, the
`reloadInstall` verdict was `supported`, mechanism "interactive
`/extensions reload`, `/skills reload`, `/agents reload`, `/commands
reload`, `/mcp reload`; terminal-performed management applies on next CLI
session unless reloaded interactively"
(`src/adapters/shared/capability-registry.json`,
`profiles.gemini.capabilities.reloadInstall`) — read that field directly
(`GEMINI_BINDING.manifest.capabilities`) rather than a restated summary
here, since it is carried forward verbatim from R210 and will only change
on a fresh refresh.

## Flat MCP schema policy

Every `GEMINI_BINDING.tools[].inputSchema` is flat: `type`, `properties`,
`required`, `additionalProperties` only, never `anyOf`/`oneOf`/`allOf`/
`not` (execution-plan.md §6.2). R210 records Gemini CLI's own
`schemaFlatLimits.primary` verdict as `supported` — Gemini CLI's own
discovery pipeline already sanitizes discovered tool declarations (strips
`$schema`/`additionalProperties`, strips `anyOf` defaults, restricts tool
names) — but this campaign applies the same conservative, flat-schema
generation policy uniformly across all 3 runtimes regardless of each
runtime's own verdict (docs/architecture.md ADR-007 "Grounded evidence"),
the same posture A620/A630 recorded for Codex/Claude's own (there,
`unknown`) verdicts on this area. `flat-schema.ts`'s `isFlatMcpInputSchema`
enforces this mechanically against every schema this directory ships
(`flat-schema.test.ts`).

## Mutation-authority / ControlPlaneNodeKind boundary (mission requirement)

This row's mission mirrors A630's Claude wording verbatim: do NOT reuse
Gemini mechanisms (hooks, skills, subagents) as semantic authority — they
are `ControlPlaneNodeKind` runtime metadata, never a source of
mutation-authority or product-primitive meaning (ADR-001/ADR-003/ADR-007).
`mechanism-classification.ts` names the concrete mapping — Gemini's
`hooks`/`skillsCommands`/`subagents` capability areas classify as the
`hook`/`skill`/`agent` `ControlPlaneNodeKind` values respectively (never as
a product `ObjectType`/`ActionType`/`Function`/`Interface`, never as
`mutation-authority`) — and `mechanism-classification.test.ts` proves both
directions mechanically: each mapped kind is a registered
`ControlPlaneNodeKind`, each is disjoint from the product-primitive
`PrimitiveKind` vocabulary (`src/altitude1/staged-construction.ts`), that
`GEMINI_BINDING`'s own JSON text carries none of
`src/adapters/shared/types.ts`'s `FORBIDDEN_SEMANTIC_FIELD_TERMS` (e.g.
`mutationAuthority`, `semanticIntent`, `digitalTwinChange`), and that the
`subagents` mapping holds even though R210 records Gemini extension
subagents as documented `preview` — maturity never changes the
classification. This directory also carries no `math-KG` or other
consumer-domain content (consumer-domain-ownership, AGENT-CONTRACT.md §4).

## Manifest shape note: one field beyond the Codex/Claude precedent

`GeminiManifestSkeleton` carries every field `CodexManifestSkeleton`/
`ClaudeManifestSkeleton` carry, plus one addition —
`nativePackaging: GeminiNativePackagingStatus` — required by this row's own
mission (the native-packaging-unsupported record above). Per ADR-007's own
DoD item 9, "packaging differences are adapter metadata only" — this is
exactly that: Gemini-specific packaging metadata, not a semantic-decision
field, and not a claim that Codex/Claude need an equivalent field (neither
of their marketplace packaging conventions is unsupported). Filed as a
scope note for `A650`'s cross-runtime parity-fixture design, which should
treat this as an allowed, documented per-runtime metadata difference rather
than a shape mismatch to eliminate.
