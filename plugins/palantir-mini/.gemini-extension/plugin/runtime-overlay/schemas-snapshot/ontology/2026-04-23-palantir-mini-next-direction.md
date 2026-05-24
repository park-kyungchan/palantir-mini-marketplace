# Palantir Mini — Next Direction After Schema Research Realignment

Date: `2026-04-23`
Status: planning-only; Claude implementation surface
Scope: `~/.claude/plugins/palantir-mini/` next development order after schema-side research authority realignment

## Why This Document Exists

`~/.claude/research/` is now the active SSoT and `~/.claude/schemas/ontology/`
has gained a schema-local crosswalk:

- `research-source-map.ts`
- expanded `primitives/research-document.ts`
- agent-facing authority contract in `ontology/BROWSE.md`, `INDEX.md`, and domain headers
- `research-authority.test.ts`

That changes what `palantir-mini` should do next.

The plugin should no longer behave as if schema comments are self-justifying.
It should consume schema contracts that explicitly distinguish:

1. builder-entry guidance
2. official fact
3. synthesis / interpretation
4. legacy archive bridge

The next direction is therefore not "add more semantic graph handlers first".
It is "make the semantic graph provenance-aware and contract-honest first".

## Current State That Still Matters

These files show the current gap:

- `bridge/handlers/semantic-change-plan.ts`
- `lib/semantic-graph/semantic-query.ts`
- `lib/semantic-graph/producer-ontology.ts`
- `bridge/handlers/diff-semantic-impact.ts`
- `bridge/handlers/semantic-drift-audit.ts`
- `bridge/handlers/detect-doc-drift.ts`
- `skills/pm-change-plan/SKILL.md`

Observed issues from current code:

1. `semantic_change_plan` still drops `maxDepth` on the floor.
2. `runSemanticQuery()` still documents empty `targetRids` as `affectedSemanticRids=[]`, while `pm-change-plan` docs still say omitting `targetRids` scans all.
3. `producer-ontology.ts` still hardcodes only 6 ontology barrels and can miss real project ontology files like `capabilities.ts` or `changeContracts.ts`.
4. `affectedEvals`, `affectedDocs`, `affectedMonitoring` are still empty-array placeholders even though Wave 3 handlers now talk about verification surfaces.
5. `detect_doc_drift.ts` is still a generic markdown scanner, not a research-authority-aware consumer of schema provenance.

## Direction Principles

1. Contract honesty before surface expansion.
2. Research authority must be machine-readable, not only comment-readable.
3. Archive is a bridge, never the default answer.
4. Semantic planning should return not only "what files change" but also "what upstream reading is required".
5. Do not add more MCP theater if the base planner still lies about scope or depth.

## Recommended Development Order

### 1. Close Wave 2 contract debt first

Do this before growing more Wave 3 surface.

- Fix `semantic_change_plan` default behavior so omitting `targetRids` means one of:
  - real whole-project semantic seed set, or
  - explicit validation error if the tool now requires seeds.
- Make `maxDepth` real in `semantic-change-plan.ts` + `semantic-query.ts`, or remove it from:
  - MCP schema
  - `pm-change-plan/SKILL.md`
  - user-facing tool descriptions
- Replace the hardcoded ontology barrel list in `producer-ontology.ts` with project-local ontology discovery.

Minimum acceptable end state:

- no silent empty-plan success for whole-project invocation
- no dead public parameter
- no ghost ontology RID generation caused by partial ontology discovery

### 2. Make schema provenance a first-class plugin input

The plugin should import and consume:

- `@palantirKC/claude-schemas/ontology/research-source-map`
- `@palantirKC/claude-schemas/ontology/primitives/research-document`

Needed capabilities:

- resolve legacy schema citations into active `library / authorityClass / canonicalRefs`
- surface whether a citation is:
  - builder
  - fact
  - synthesis
  - archive bridge
- expose `agentDirective` so handlers can tell agents when archive descent is allowed

Recommended implementation slice:

- extend `detect_doc_drift.ts` into authority-aware drift detection
- add a small reusable helper under plugin `lib/research/` that wraps `resolveResearchRef()`
- teach semantic planning tools to attach provenance bundles

### 3. Upgrade `SemanticChangePlan` from impact list to read-plan

Today the plan is mostly:

- affected RID list
- file list
- generated/test lists

Next it should also return:

- `requiredResearchRefs`
- `recommendedReadOrder`
- `authorityNotes`
- `archiveBridgeRefs`

That would let an agent answer:

- open first
- then read
- stop when
- archive only if needed

without re-inventing read order each session.

This is the direct productization of the schema-side authority work.

### 4. Bring verification surfaces into the real graph

Current Wave 3 direction already adds:

- `diff_semantic_impact`
- `semantic_drift_audit`

But the graph is still weak on verification semantics.

Next additions should prioritize:

- real `affectedDocs`
- real `affectedMonitoring`
- real `affectedEvals`
- lineage-aware backward propagation for semantic changes

Specifically:

- `producer-verification.ts` should align with schema authority classes, not just file presence
- `producer-lineage.ts` should help answer whether a semantic area has ever been exercised, evaluated, or repaired before

### 5. Make doc/research maintenance tools crosswalk-aware

Current maintenance tools still assume a flatter research world.

They should learn:

- `research_library_prune` must not archive files referenced by schema `canonicalRefs`
- `research_library_refresh` must understand active builder/fact/synthesis roles
- `detect_doc_drift` should flag:
  - active docs that cite unresolved legacy refs
  - archive refs used without explicit bridge semantics
  - schema comments that skip `research-source-map.ts`

### 6. Only after that: richer planning and automation

Once the above is stable, then add:

- deeper transitive walks (`maxDepth > 1`)
- semantic plan caching with invalidation keyed by ontology/codegen/runtime hashes
- PR-scoped semantic review summaries
- change-plan driven task decomposition
- research-bundle warmup for `pm-blueprint`, `pm-autoplan`, and future planning skills

## Suggested Release Framing

### `v2.6.1`

Contract honesty patch.

- fix empty `targetRids` behavior
- fix `maxDepth` truth
- fix ontology discovery coverage

### `v2.7.0`

Schema provenance integration.

- consume `research-source-map.ts`
- enrich `ResearchDocumentDeclaration` usage
- return research-aware change plans

### `v2.8.0`

Verification + lineage maturation.

- non-empty eval/doc/monitoring surfaces
- provenance-aware drift audit
- semantic replay / backward-prop improvements

## Non-Goals

- Do not add more independent handlers that duplicate `semantic_change_plan`.
- Do not treat `_archive/` as a replacement for missing official coverage.
- Do not keep user-facing skill docs ahead of actual handler behavior.

## Short Version

The next major step for `palantir-mini` is not "more graph".
It is "graph + provenance + honest agent read order".

`schemas/` now tells the plugin how to interpret research authority.
The plugin should consume that directly, then make every planner/drift/review
surface return both:

- what changes
- what must be read, in what order, with what authority class
