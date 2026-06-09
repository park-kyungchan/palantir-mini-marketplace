# Ontology Schema Changelog

## 1.70.0 — EventEnvelope primitive: canonical 5-dim envelope promoted from runtime (audit G3) — 2026-06-09

### Added

- `ontology/primitives/event-envelope.ts` (NEW) — promotes the canonical 5-dim
  Decision Lineage envelope (rule 10: WHEN / ATOP_WHICH / THROUGH_WHICH / BY_WHOM
  / WITH_WHAT) from the runtime type `palantir-mini/lib/event-log/types.ts`
  (`interface EventEnvelopeBase` + EventId/SessionId/CommitSha brands + ~40
  variant unions) to **schema-level authority**. Audit G3 flagged this as the
  highest-leverage missing primitive — the append-only `events.jsonl` row
  envelope was un-schema'd, modeled only in runtime + the alias-wrapper
  `event.ts` (which covers only EventRid graph-node identity and explicitly
  states the full envelope is NOT modeled there). Declares:
  - `EVENT_ENVELOPE_SCHEMA_VERSION` const.
  - Branded value types `EventId` / `SessionId` / `CommitSha` (+ `eventId` /
    `sessionId` / `commitSha` factories), mirroring the runtime brand convention.
  - `EventEnvelopeBase` — the 5 dims (`when` ISO8601, `atopWhich` CommitSha,
    `throughWhich`, `byWhom`, optional `withWhat`) + `sequence` + optional
    `propagationDepth` (rule 10 §propagationDepth). Sub-shapes
    `EventThroughWhich` / `EventByWhom` (provider-neutral attribution, rule 26
    §Axis D1) / `EventWithWhat`.
  - A REPRESENTATIVE discriminated `EventEnvelope` union by `type` discriminant
    (`edit_proposed` / `edit_committed` / `validation_phase_completed`) with an
    OCP note that new variants extend the union — the full ~40-variant set stays
    in the runtime mirror. `EventType` discriminant alias.
  - `isEventEnvelope` structural type-guard (validates the 5 required dims; payload
    shape is a per-variant concern).
  - `eventEnvelopeFoundryEquivalent` (`claude-extension`) marker.
- **No uphill import from `lib/event-log/`** — schemas-snapshot is the authority;
  the runtime type is the mirror of this declaration, not the reverse.
- Complements `event.ts` (prim-learn-27): that covers the EventRid graph-node
  identity, this covers the full envelope shape. No symbol collision.
- Registered in `ontology/primitives/index.ts` barrel (`export *`) +
  `package.json` exports subpath `./ontology/primitives/event-envelope`.

MINOR (additive primitive; no edits to v1.0–v1.69 primitive bodies; no breaking
change). Schema package version bumped 1.79.0 → 1.80.0.

## 1.69.0 — Self-Ontology: Executor ActionType + McpTool ObjectType (M-SELF #2+#3) — 2026-06-08

### Added

- `ontology/self/executor.actiontype.ts` (NEW) — `Executor`, a Tier-2 Function-Backed
  ActionType modeling pm's neutral Hands-layer sandbox executor. **First registered
  self ActionType**: `ACTION_TYPE_REGISTRY.register`-grep over `self/` goes 0 → 1. Wraps
  an EditFunction (`editFunctionName: "pm.sandbox.executor.applyEditSteps"`, forward-named
  — no lib import uphill) and commits resulting `OntologyEdit[]` atomically via
  `commitEdits`; `approvalPolicy: "policy-approval"` (DTC-gate-strict), `branchPolicy:
  "branch-required"` (worktree isolation), `sideEffects: []`. A LOCAL `EXEC_STEP_KINDS`
  vocabulary guard (`"shell" | "edit"`) mirrors the M-SELF #1 exemplar's two-directional
  `as const satisfies` + `[Canonical] extends [member]` no-drift idiom.
- `ontology/self/mcp-tool.objecttype.ts` (NEW) — ONE `McpTool` ObjectType + **29 tool
  instances** (`MCP_TOOL_INSTANCES`), the snapshot-owned seed of pm's LIVE MCP bridge
  surface (identity-only; descriptor metadata stays the runtime projection at
  `lib/capability-registry/mcp-tool-capability.ts`). Count is LIVE-grounded: bridge has
  **29** tools (27 prior + W3e-1's `grade_outcome_with_rubric` + `pm_grader_dispatch`);
  the bridge's in-file section-header comments (14/8/5) are stale — TOOLS.length is the SSoT.
- `ontology/self/index.ts` barrel exports both + `ontology/self/BROWSE.md` registered-
  instances table updated (M-SELF counter 1 → 3: 2 ObjectType + 1 ActionType + 1 Struct).
- Registration test `tests/ontology/self/executor-registration.test.ts` proves both
  registrations + the Tier-2 contract + 29 unique instances, and carries a **drift guard**
  cross-checking the seed against the live `bridge/mcp-server.ts` TOOLS array.

MINOR (additive instances; no primitive *type* changed, no breaking change). 0 new
regressions (env-clean stash-baseline-diff IDENTICAL fail-set = 8 pre-existing).

## 1.68.0 — Self-Ontology: first registered pm-surface instances (M-SELF #1) — 2026-06-08

### Added

- `ontology/self/` (NEW tree) — pm's own control surface modeled AS typed Palantir
  primitive **instances** (harness-redesign W3d-2a; milestone M-SELF). The primitive
  *types* already shipped under `ontology/primitives/`, but `*_TYPE_REGISTRY.register`
  for pm's own surface was **0** across the snapshot — this tree turns the vocabulary
  on itself.
  - `self/semantic-intent-contract.objecttype.ts` — `SemanticIntentContract`
    (prim-learn-25) as an `ObjectType`; primaryKey `contractId`, title `confirmedIntent`,
    the 9 understand axes as `Struct` Properties. Registers into `OBJECT_TYPE_REGISTRY`.
  - `self/sic-axis.struct.ts` — `SicAxis` `{summary, refs, status}` as a `Struct`,
    registered into `STRUCT_REGISTRY`; the shape each axis Property resolves to.
  - `self/index.ts` (barrel — importing it self-registers every instance) + `self/BROWSE.md`.
- Instances only; **no primitive type changed**. Registration is inert until the barrel
  is imported. Compile-time drift guards keep the model in lockstep with the primitives.

## 1.51.0 — Prompt-to-DTC canonical contract primitives — 2026-05-10

### Added

- `approval-ref.ts` — structured natural-language user approval provenance
  linked to prompt identity and user-visible summary hash.
- `ontology-engineering-ref.ts` — typed ref graph for ObjectType, ActionType,
  Function, ProjectSurface, ProjectLane, ValidationPack, MCPTool, and
  FileSurface surfaces.
- `prompt-envelope.ts` — prompt-front-door identity and contract refs.
- `semantic-intent-contract.ts` — user-approved semantic meaning contract with
  legacy strings plus additive typed ref fields.
- `digital-twin-change-contract.ts` — approved Digital Twin change boundary
  with branch/permission/eval/mutation ref hooks.
- `prompt-contract-record.ts` — prompt-local persistence record for stored
  contracts.

### Compatibility

- Additive only. Runtime palantir-mini fields remain compatible and gate
  defaults are unchanged.

---

## 1.37.0 — AIP/Foundry operational substrate — 2026-05-05

### Added

- `object-view.ts` (DATA/ACTION boundary, prim-data-22) — Object View
  declarations with property bindings, action bindings, surface type,
  delegated permissions, and security markings.
- `ontology-branch-proposal.ts` (LEARN/OPS, prim-learn-19) — branch/proposal
  lifecycle for AI FDE-style review before ontology/app changes reach live
  state.
- `aip-evaluation.ts` (LEARN, prim-learn-20) — AIP Evals suites, test cases,
  runs, and experiments for model/version/tool comparison.
- `aip-agent.ts` (OPS/ACTION, prim-ops-24) — AIP Chatbot / AI FDE agent
  declaration with ontology scope, tool bindings, eval suites, and deployment
  stage.

### Extended

- `object-type.ts` — optional API name, primary key/title properties, object
  views, action RIDs, backing source, branchability, markings.
- `action-type.ts` — optional API name, parameters, approval policy,
  object-set constraints, branch policy, validate-only support, side effects.
- `aip-logic-function.ts` — optional ontology context, tool bindings, eval
  suite IDs, model comparison, observability.

### Authority

- Official anchors: Foundry announcements, AI FDE, AIP Evals, Object Views,
  OSDK TypeScript/React/subscriptions, Ontology MCP, Palantir MCP.
- Local audit: `.palantir-mini/audits/2026-05-05-palantir-aip-foundry-ssot-drift-audit.md`.

---

## 1.35.0 — nifty-mixing-diffie: Valuable Data Operating Standard (rule 26) — 2026-05-03

### Added (5 new primitives backing rule 26)

- **`value-grade.ts`** (DATA, prim-data-21) — `ValueGrade = "T0"|"T1"|"T2"|"T3"|"T4"` 5-tier importance enum + `VALUE_GRADES` const + `isValueGrade()` / `isCircuitGrade()` / `isActiveGrade()` guards. Drives substrate routing: T0 rejected at emit, T1 ops trace, T2 outcome-pairing candidate, T3 BackPropagation circuit input, T4 shared-core promotion candidate. Anchored to Palantir's "Connecting Agents to Decisions" (blog.palantir.com, 2026-04-29) corporate-blog formalization of decision lineage.
- **`agentic-memory-layer.ts`** (LEARN, prim-learn-16) — `AgenticMemoryLayer = "working"|"episodic"|"semantic"|"procedural"` 4-layer taxonomy + const + array guard. Verbatim from A1 2026-04-29: *"continuously refine all forms of agentic memory (working memory, episodic memory, semantic memory, procedural memory)"*. Required on T2+ envelopes via `withWhat.memoryLayers`.
- **`lineage-refs.ts`** (LEARN, prim-learn-17) — `LineageRefs { actionRid?, dryRunRef?, outcomePairId?, evidenceUrls?, playgroundSandboxId? }` typed cross-reference carrier + `isLineageRefs()` + `hasAnyLineageRef()` predicates. Replaces free-form `withWhat.reasoning` pointers. Anchored to A1 verbatim: *"when a given decision was made, atop which version of enterprise data, and through which application"*.
- **`outcome-pairing.ts`** (LOGIC, prim-logic-05) — `OutcomePairingDeclaration` + `OutcomePairingRid` brand + `OutcomeSnapshot` + `OutcomeDeltaMetrics` + `OutcomePairingState` + `OUTCOME_PAIRING_REGISTRY`. Pair lifecycle: open on `*_proposed` event → close on `*_observed`/`*_completed` with same `actionRid`. Drives `pm_outcome_pair_audit` MCP. AI FDE feedback compounding loop (§FDE-08) substrate.
- **`refinement-target.ts`** (LEARN, prim-learn-18) — `RefinementTargetKind` 7-union (primitive-field-add / primitive-field-extend-enum / event-type-add / grading-criterion-threshold / failure-category-add / rule-conformance-policy / other) + `RefinementConfidence` ("high"|"medium"|"low") + `RefinementTarget { kind, filePathOrRid, description, confidenceLevel }` + guards. Required on `validation_phase_completed.passed=false` per rule 26 §R5.

### Extended (3 existing primitives, optional fields — MINOR-safe)

- **`lineage/decision-lineage.ts`** (prim-learn-02) — `DecisionLineage5Dim`:
  - `throughWhich.surface?: string` (UI/system surface tag).
  - `byWhom.{model?, provider?, interfaceFamily?, runtime?}` — provider-neutral fields per rule 26 §Axis D1 (LLMI-02 invariant: Anthropic-Pentagon supply chain risk learning, 2026-03-05).
  - `withWhat.memoryLayers?: AgenticMemoryLayer[]` — Axis E (required at T2+).
  - `withWhat.refinementTarget?: RefinementTarget` — Axis C2 (required on validation_phase_completed.passed=false).
- **`primitives/grading-criterion.ts`** (prim-data-08) — `GradingCriterionDeclaration.memoryLayerApplicability?: AgenticMemoryLayer[]`. Restricts criterion to evaluation contexts where the agent operates in specified memory mode.
- **`primitives/feedback-loop.ts`** (prim-logic-04) — `FeedbackLoopDeclaration.valueGradeSequence?: { iteration, grade, rationale? }[]`. Tracks how loop's output importance tier evolved across iterations.

### Coalesced

- **`sprint-contract.ts`** (prim-action-05) — `SprintContractDeclaration.projectSlug?: string` (originally drafted as v1.34.1 PATCH; coalesced into this v1.35.0 MINOR per CHANGELOG draft note 2026-05-01).

### Updated package.json

- `"version": "1.34.0" → "1.35.0"`
- 5 new sub-path exports for the new primitives (`./ontology/primitives/{value-grade,agentic-memory-layer,lineage-refs,outcome-pairing,refinement-target}`).
- 5 new barrel re-exports in `primitives/index.ts`.

### Compatibility

All new fields optional (additive). Consumers on `>=1.27.0 <2.0.0` compile unchanged. Producers (palantir-mini v3.13.0+) write new fields; v3.12.0 readers skip them. Cross-runtime: codex consumers read events.jsonl with new fields as opaque; no breaking change to event row shape.

### Authority

- Plan: `~/.claude/plans/nifty-mixing-diffie.md` (Phase 0)
- Rule: `~/.claude/rules/26-valuable-data-standard.md` (NEW, Phase 4)
- Anchor blog: https://blog.palantir.com/connecting-agents-to-decisions-277dee8ddb40 (2026-04-29)
- Anchor talk: AIPCon 9 / DevCon 5 (2026-03-12) — DC5-02 + FDE-05/07 + APC9-Q06

---

## 1.34.1 (DRAFT — coalesced into v1.35.0 above) — crystalline-resilient-narwhal P-EXTRA: SprintContract.projectSlug — 2026-05-01

### Added

- **`sprint-contract.ts`** (ACTION, prim-action-05) — `SprintContractDeclaration.projectSlug?: string` (additive, optional). Slug derived from the consumer project's `package.json#name` (basename, scope stripped) or `path.basename(projectPath)`. Used to disambiguate `contractId` across projects in cross-project lineage queries. Plumbed by:
  - `palantir-mini/lib/project/slug.ts` — `deriveProjectSlug(projectPath)` + `composeSlugContractId(slug, sprintNumber, modeSuffix?)` + `isSlugPrefixedContractId(contractId)` helpers.
  - `palantir-mini/bridge/handlers/negotiate-sprint-contract` — accepts optional `projectSlug` arg; stamps onto contract.json + emits in `sprint_contract_bound` event payload.
  - `palantir-mini/hooks/harness-base-mode-advisory` auto-bootstrap — slug-prefixes `contractId` (e.g. `palantirkc-sprint-001-default`).
  - `palantir-mini/skills/pm-quick-sprint` skill template — slug-prefixes `contractId` (e.g. `palantir-math-sprint-019-quick`).
  - `palantir-mini/bridge/handlers/replay-lineage` + `pm-workflow-lineage-query` — accept optional `projectSlug` filter.

### Compatibility

Additive optional field only. Existing contracts (palantir-math sprint-001..019, palantirkc home sprint-002..018) untouched. Legacy contracts without `projectSlug` interpreted as "unspecified-slug" — readers fall back to `deriveProjectSlug(projectPath)` from contract enclosing dir. Existing events.jsonl rows without payload.projectSlug match the slug filter via `__sourceProject` basename derivation. Consumers on `>=1.27.0 <2.0.0` compile unchanged.

### Status

DRAFT entry. Lead coalesces this into a future package.json bump (1.34.1 PATCH or 1.35.0 MINOR alongside other distributed-wishing-manatee Phase 4 schema additions). The schema field + plugin handlers are ALREADY live in tree as of 2026-05-01; only the version-line bump is pending.

### Authority

- Plan: `~/.claude/plans/crystalline-resilient-narwhal.md`
- Briefing: spawned as P-EXTRA parallel track during sprint-018-quick (cosmic-hatching-pizza Phase 2-4) by Lead 2026-05-01.

---

## 1.31.0 — Wave 4 P4: GradingCriterion.RubricDomain + "simulator" — 2026-04-29

### Added

- **`grading-criterion.ts`** (DATA, prim-data-08) — `RubricDomain` enum extended with `"simulator"` (5th AIP Evals canonical evaluator type per `~/.claude/research/palantir-vision/aipcon-devcon/aip-evals.md` lines 41-46). Semantics:
  - `"simulator"` rubric criterion applies edits (from `compute_edits_dry_run` output) to a transient ontology graph copy, runs `impact_query` for affected RIDs, returns impact-radius normalized score (LOWER radius = better).
  - Use `validationExpression` as JSON config: `{dryRunHandlerArgs, impactRadiusScale}`.
  - Plugin v3.9.1 W4.1 ships `bridge/handlers/grade-with-simulator.ts` to consume this domain.
  - Closes blueprint §9 G7 (optional acceptance gate — Decision Space "consequence simulation" 5th pillar).

### Compatibility

Additive enum extension only. Existing rubrics unchanged. Consumers on `>=1.27.0 <2.0.0` compile unchanged. Plugin schema pin (`>=1.27.0 <2.0.0`) covers v1.31.0 with no bump required.

---

## 1.30.0 — Harness default-on: SprintContract.mode field — 2026-04-29

### Added

- **`sprint-contract.ts`** (ACTION, prim-action-05) — `SprintContractDeclaration.mode?: "full" | "quick" | "lite" | "strict" | null`. Harness default-on mode field per harness-base-mode blueprint §4-P0 + rule 16 v3.0.0 §Default-On Policy:
  - `"full"` (or null) — default standard harness sprint.
  - `"quick"` — 1-iteration wrapper for Lead-direct work via `/palantir-mini:pm-quick-sprint`.
  - `"lite"` — 2-role harness opting out of separate-context grader.
  - `"strict"` — Prithvi-faithful enforcement; no Lead-direct edits.
- `commit-edits-precondition` hook (palantir-mini v3.8.0+) reads this field to adjust gate strictness.

### Compatibility

Additive only. No fields removed or renamed. Existing SprintContract instances default to `mode: undefined` which is treated as `"full"`. Consumers on `>=1.29.0 <2.0.0` compile unchanged.

## 1.28.0 (package) / palantir-mini v3.2.0 substrate-integrity bundle — 2026-04-25

### Added — 2 new event types (additive MINOR)

- **`snapshot_written`** — emitted by palantir-mini `pre-compact-state` hook after the raw NDJSON snapshot is written to `.palantir-mini/session/snapshots/events-<ISO>.jsonl`. Closes rule 10 §PreCompact gate guarantee that was unimplemented before v3.2.0 (palantir-mini v3.1.0 handoff §7.1 D2). Payload: `{ path, sizeBytes, atSequence }`. PrimaryDomain `data`.
- **`event_log_rotated`** — emitted by `events_log_rotate` MCP handler immediately into the FRESH events.jsonl after renaming the breached log to `<sessionDir>/archive/events-rotated-<ISO>.jsonl`. Threshold default 10 MB OR 10K lines (either triggers). Payload: `{ archivedPath, sizeBytes, lineCount, thresholdBytes, thresholdLines }`. PrimaryDomain `data`. Closes palantir-mini v3.1.0 handoff §7.2 G3.

### Compatibility

- **Backwards compatible** — additive only. Consumers pinned to `>=1.27.0 <2.0.0` continue to compile (palantir-mini plugin v3.2.0 keeps `compatibleSchemaVersions` unchanged).
- `EVENT_TYPE_NAMES` const tuple length grew from 51 → 53. `EventTypeName` literal union widened.
- `EVENT_TYPE_REGISTRY` Object.freeze() entries map widened with the 2 new descriptions.
- No removals. No renames. No other primitive changes.

### Authority

- Plan: `~/.claude/plans/humble-hatching-blanket.md` (palantir-mini v3.2.0 substrate-integrity bundle)
- Predecessor: 1.27.0 / Phase 2d schema primitives — 2026-04-25

---

## 1.27.0 (package) / Phase 2d schema primitives — 2026-04-25

### Added — 2 new ontology primitives + 2 seed files

- **`primitives/agent-definition.ts`** **NEW** — `AgentDefinitionRid` brand + `AgentDefinitionDeclaration` interface (16 fields: agentId, slug, description, scope, model, maxTurns, tools, disallowedTools, memory, isolation, filePath, deprecatedBy, supersededBy) + `AgentDefinitionRegistry` class with register/get/findBySlug/findByScope/list/listSlugs methods + `AGENT_DEFINITION_REGISTRY` singleton. Replaces filesystem-only convention with typed primitive; enables compile-time `Agent(...)` spawn type checks and runtime advisory cross-check via `pm_plugin_self_check`.
- **`primitives/skill-definition.ts`** **NEW** — `SkillDefinitionRid` brand + `SkillDefinitionDeclaration` interface (~14 fields including frontmatter mirror: skillId, slug, description, scope, allowedTools, model, disableModelInvocation, userInvocable, argumentHint, argumentsList, context, agent (cross-ref AgentDefinitionRid), paths, filePath, deprecatedBy, supersededBy) + `SkillDefinitionRegistry` class + `SKILL_DEFINITION_REGISTRY` singleton.
- **`seeds/agent-definitions.ts`** **NEW** — minimal seed instances for 18 plugin agents + 14 user-scope agents = 32 entries total. Lightweight (slug + scope + filePath + description); rich frontmatter hydration via `pm-codegen` automation deferred to v1.28.0+. Banner-flagged 9 deprecated user-scope agents (`deprecatedBy: plugin:palantir-mini:<slug>`).
- **`seeds/skill-definitions.ts`** **NEW** — minimal seed instances for 38 plugin skills + 4 user-scope skills = 42 entries total.

### Changed — additive extension of existing primitive

- **`primitives/plugin-manifest.ts`** — `PluginManifestDeclaration` extended with two optional fields: `declaredAgents?: ReadonlyArray<AgentDefinitionRid>` + `declaredSkills?: ReadonlyArray<SkillDefinitionRid>`. Cross-checked advisory-only by `pm_plugin_self_check` v2.27.0+. Existing fields + `PluginManifestRegistry.loadFromDisk`/`validate` unchanged.
- **`primitives/index.ts`** — barrel re-exports for the 2 new primitives.
- **`package.json`** — sub-path exports for the 2 new primitives + 2 seed files.

### Why MINOR (rule 08)

Purely additive: 2 new primitive files + 2 new seed files + 2 optional fields on existing primitive. No removal or rename. Existing consumers (palantir-math peerDep `>=1.15.0 <2.0.0`) continue to work without changes; mathcrew + kosmos vestigial git pins (v1.0.0 / v0.2.1 respectively) are not consumed at runtime so they are unaffected.

### Why filesystem-authoritative this version

Risk balance: v1.27.0 establishes the type substrate + initial seeds, but `pm_plugin_self_check` continues to walk the filesystem as the authoritative source. Primitive seeds surface advisories when filesystem disagrees (e.g., a new agent .md was added without a matching seed entry). v1.28.0+ adds `pm-codegen agent-registry` automation that regenerates seeds from .md frontmatter, then a later patch flips authority to primitives.

### Consumer

palantir-mini v2.27.0 — peerDep range `>=1.15.0 <2.0.0` already accommodates v1.27.0 (additive MINOR; no peerDep bump needed). `pm_plugin_self_check` upgraded to consult primitive seeds for advisory cross-check.

### References

- Plan: `~/.claude/plans/immutable-forging-summit.md` §4
- Architecture authority: `~/.claude/plans/2026-04-25-harness/06-plugin-only-architecture.md §10`
- Decision approval: `~/.claude/plans/2026-04-25-harness/00-master-synthesis.md §10 D7` (2026-04-25)

---

## 1.26.0 (package) / W5 Component audit — 2026-04-25

### Added — HarnessComponent primitive + audit event

- `primitives/harness-component.ts` **NEW** — `HarnessComponentDeclaration` (componentId, assumptionEncoded, simpleVariant, canaryRubricRid, lastAuditedAt, lastAuditResult, lastAuditRationale) + `ComponentAuditResult` union (load-bearing | remove-candidate | needs-rework | never-audited) + `HARNESS_COMPONENT_SEED_IDS` (7 seed ids) + `HarnessComponentRegistry`.
- `lineage/event-types.ts` — new `harness_component_audit_emitted` event (primaryDomain: learn).

### Consumer
palantir-mini v2.21.0 — peerDep bump `"@palantirKC/claude-schemas": "^1.26.0"`. Additive primitive + event; no existing consumer affected.

### Why it matters (Rajasekaran §1 — "every component encodes an assumption")
This is the last of the original five gaps from `cheeky-wandering-yeti.md`. The primitive records WHY each harness component exists (what model-capability assumption it encodes) and HOW the same outcome would be pursued without it. `pm_harness_component_audit` runs a canary comparison on a fixed rubric; when the simpleVariant matches or outperforms, the component becomes a `remove-candidate` for the next MAJOR bump. Keeps the self-designed harness from accumulating 4.5-era workarounds indefinitely.

---

## 1.25.0 (package) / W4 context-reset optional (field only) — 2026-04-25

### Added — declaration-only (no runtime impl this release)

- `primitives/sprint-contract.ts` — `SprintContract.iterationResetPolicy?: "auto" | "manual" | "disabled"` (default effectively "disabled" when omitted). `resetHandoffManifest?: { includeFiles, maxTokens }` optional seed payload.
- `lineage/event-types.ts` — `context_reset_handoff_emitted` event (primaryDomain: learn). Will be emitted by `pm-harness-sprint` when policy="auto" triggers a fresh Generator spawn at an iteration boundary.

### Consumer
palantir-mini v2.20.0 — peerDep bump `"@palantirKC/claude-schemas": "^1.25.0"`. Additive field + event declaration only. No runtime change.

### Why it matters (Rajasekaran scope-limit)
Prithvi Rajasekaran's blog establishes Opus 4.5+ largely removed context anxiety, so context reset — which was essential for Sonnet 4.5 era harnesses — may remain unused in practice. This release ships the **substrate only** so W5 component audit can measure whether the simpleVariant (continuous session + auto compaction) outperforms reset-enabled runs. Implementation branch will land only if audit produces evidence. Closes Part 2 Gap 2 at minimum-viable scope.

---

## 1.24.0 (package) / W3 dissent record — 2026-04-25

### Added — Dissent record primitive + event

- `primitives/sprint-contract.ts` — new `NegotiationHistoryRound` interface (`round`, `proposer`, `targetField`, `delta`, `rationale`, `acceptedInFinal`, `at`). `SprintContractDeclaration` gains optional `negotiationHistory?: readonly NegotiationHistoryRound[]` (backward-compatible — pre-v1.24 contracts omit it).
- `lineage/event-types.ts` — new `sprint_contract_dissent_preserved` event (primaryDomain: learn). Emitted when `negotiationHistory` contains at least one `acceptedInFinal=false` entry at bind time. Closes Part 2 Gap 5 (dissent audit trail).

### Consumer
palantir-mini v2.19.0 — peerDep bump `"@palantirKC/claude-schemas": "^1.24.0"`. Additive event + optional field; no existing callers broken.

### Why it matters
Prior `disagreementResolution` policy (lead-arbitrated / priority-criterion / abort-on-disagreement) existed but left zero audit trail. harness-analyzer post-sprint cannot correlate Evaluator score deltas with the rubric edits that were rejected during negotiation. This event + field fixes the Decision Lineage gap.

---

## 1.23.0 (package) / W1 + W2 harness meta-events — 2026-04-25

### Added — 2 new event types (palantir-mini v2.18.0 bundle)

- `planner_output_graded` (primaryDomain: learn) — harness-planner output scored by `grade_planner_output` handler against 3-axis meta-rubric (featureCount, designSpecificity, antiPatternCount). Verdict pass|warn|block. Closes Part 2 Gap 4.
- `evaluator_strictness_probe` (primaryDomain: learn) — per-criterion probe from `grade_outcome_with_rubric` capturing score trend + evidence citations + failure class counts. `pm_harness_strictness_audit` MCP detects drift. Closes Part 2 Gap 3.

### Consumer
palantir-mini v2.18.0 — requires peerDep bump `"@palantirKC/claude-schemas": "^1.23.0"`. Additive event types only; no existing registry entry mutated. No shared-core re-export change needed (events registry is consumed directly from `@palantirKC/claude-schemas/ontology/lineage/event-types`).

### Why it matters
Without these two events, Opus-4-7 self-designed harness had no mechanism to measure Planner spec quality or Evaluator strictness drift over iterations. Closes the first two of five `cheeky-wandering-yeti.md` Anthropic-best-practice gaps (Gap 3 + Gap 4) in a single paired bundle.

---

## 1.22.1 (package) / grading-criterion alias doc — 2026-04-25

### Documented (PATCH — JSDoc only, no contract change)

- `primitives/grading-criterion.ts::GradingCriterion.subCriteriaRids` — JSDoc now calls out the plugin-side compatibility alias `subCriteria` accepted by `palantir-mini` v2.13.2+ `grade_outcome_with_rubric`. Canonical field unchanged; new rubrics should prefer `subCriteriaRids`. Alias exists because Planner-authored rubrics observed in the wild (harness-h4 W0 canary, 2026-04-24) used the shorter form, causing `gradeHybrid` to report `over 0 subs` (score 0.00).

Co-consumer: palantir-mini `bridge/handlers/grade-outcome-with-rubric.ts::resolveSubCriteriaRids()` reads either field name.

No consumer pin bump required — additive JSDoc; existing `subCriteriaRids` callers unaffected.

---

## 1.22.0 (package) / research-authority surface — 2026-04-23

### Added — schema-local research crosswalk + authority drift test

2 new ontology-axis files:

- `research-source-map.ts` — maps legacy schema citations under `research/palantir/*` into the active split authority stack (`palantir-developers` / `palantir-foundry` / `palantir-vision` / `_archive` bridge). Exposes machine-readable `library`, `authorityClass`, `canonicalRefs`, `legacyBridge`, and `agentDirective`.
- `research-authority.test.ts` — guards the new contract: schema entry surfaces may not claim bare legacy authority, and domain `source:` strings must resolve through the crosswalk.

### Changed

- `primitives/research-document.ts` — upgraded from path/topic-only metadata to split-research provenance (`library`, `authorityClass`, `archived`, `supersededBy`, `canonicalRefs`, `migrationNote`, `agentDirective`).
- `BROWSE.md`, `INDEX.md`, `semantics.ts`, `data/schema.ts`, `logic/schema.ts`, `action/schema.ts`, `security/schema.ts` — authority headers now explicitly state that schemas consume the split research SSoT and that legacy citations must be interpreted via `research-source-map.ts`.

### Why it matters

This does not delete legacy strings from domain bodies. It makes them honest.
Agents can now distinguish:

- active official fact
- active synthesis
- builder-entry routing
- archive-only bridge semantics

That closes the "false authority" gap without pretending official coverage is complete where `palantir-foundry/ontology/` still has known fetch boundaries.

## 1.18.0 (package) / primitives surface — 2026-04-22

### Added — Rule primitive (rules-redesign R2a, prim-ops-19)

1 new primitive file under `ontology/primitives/`:

- `rule.ts` (OPS, `prim-ops-19`) — Declares `RuleDeclaration` + `RuleRegistry` + `RuleRid` branded type + `RuleAuditFinding` shape + supersession/scope-migration helpers (`isRuleRetired`, `isRuleScopeMigrated`) + `ruleRidFromId` constructor. Backs `~/.claude/rules/NN-*.md` frontmatter per `rules/CONTEXT.md §5`. Consumed by R2b MCP handlers (`pm_rule_get` / `pm_rule_list` / `pm_rule_search` / `pm_rule_audit`) + R2b codegen target `src/generated/rule-registry.ts`.

Frontmatter contract (every `rules/NN-*.md` file carries these):

- `ruleId: RuleId` — stable numeric ID, primary key (01-18 current + 0 reserved for CONTEXT; never recycled).
- `slug: RuleSlug` — kebab-case alias (rename requires rule-level MAJOR bump).
- `scope: RuleScopeId` — `"global"` | `"plugin:<id>"` | `"project:<id>"`.
- `version: string` — rule-level semver (independent from schemas/).
- `invariant: string` — 1-sentence distillation (CORE.md inlines).
- `supersededBy: RuleId | null` — if retired + replaced.
- `scopeMigratedTo?: RuleScopeId | null` — if scope-migrated (one-way).
- `crossRefs: readonly RuleId[]` — neighbor fetch for `pm_rule_get --with-context`.
- `hookCitations: readonly HookCitation[]` — hooks that cite this rule.
- `bodyPath: string` — path to the T2 .md body.

Stability contract (per `rules/CONTEXT.md §4`): ruleId is a stable API, never renamed, never recycled; rule 04 is a permanent historical gap.

This is a MINOR bump. No existing primitive is modified. Consumer pins `peerDependencies: "@palantirKC/claude-schemas": "^1.17.0"` continue to resolve. `~/ontology/shared-core/` re-export pin bumped `1.4.0 → 1.5.0`.

### Related

- Blueprint: `~/.claude/plans/2026-04-22-rules-redesign-blueprint.md` (PR #123 merged).
- Meta-rule authoring spec: `~/.claude/rules/CONTEXT.md` §5 (PR #124 merged).
- Structure phase: PR #126 (R1) — 17 rules slimmed + frontmatter added + scope migrations.
- This commit: R2a (primitive declaration only). R2b follows with MCP handlers + codegen + plugin v2.2.0 bump.

## 1.15.0 (package) / primitives surface — 2026-04-20

### Added — PedagogyContract primitive + feedback_loop_closed event split

2 new primitive files under `ontology/primitives/`:
- `pedagogy-contract.ts` (LEARN, `prim-learn-12`) — Composable pedagogy plug-in framework. Declares `PedagogyContract` + `PedagogyApplication` + `PedagogyParams` discriminated union (cpa / productive-failure / constructionism / variation-theory) + `CognitiveLoadConstraint` meta-audit shape + `PEDAGOGY_CONTRACT_REGISTRY`. Promoted from mathcrew project-local `ontology/pedagogy.ts`; mathcrew's project-local becomes a thin re-export in Sprint 2 P1.
- `feedback-loop-closed.ts` (DATA, `prim-data-09`) — Declares `FeedbackLoopClosedPayload` for the terminal-state transition event. Self-contained schema (inlines TerminationCondition shape) so consumers outside the plugin can import payload type without cross-file dependencies.

EVENT_TYPE_REGISTRY expanded 35 → 36:
- `feedback_loop_closed` (LOGIC) — replaces the v1.14 overloaded `feedback_loop_opened` with `payload.transition: "close"` pattern identified as ontology smell in H3 D4.

Deprecation: `FeedbackLoopOpenedEnvelope.payload.transition | verdict | terminationCondition` optional fields retained for one MINOR cycle (removed in v1.16). During v1.15, consumers accept BOTH variants.

Authority: research/palantir-vision/synthesis/2026-04-20-mathcrew-redesign-research.md §Topic 2 + research/claude-code/harness-h3-retrospective.md §D4.

### Per-Axis Version Matrix (v1.15.0)
| Axis | Version | Source |
|------|---------|--------|
| ontology/types.ts | 1.12.0 (unchanged) | primitives surface extended separately |
| ontology/primitives/ | 28 files (+2) | pedagogy-contract + feedback-loop-closed added |
| ontology/lineage/event-types | 36 events (+1) | feedback_loop_closed |
| interaction | 0.1.2 | unchanged |
| meta | 0.1.0 | unchanged |
| rendering | 0.1.0 | unchanged |
| **root package** | **1.15.0** | **MINOR bump (additive)** |

---

## 1.14.0 (package) / primitives surface — 2026-04-20

### Added — 5 harness primitives + 6 lifecycle events
5 new primitive files under `ontology/primitives/`:
- `harness-agent.ts` (LEARN, `prim-learn-11`) — 8-role taxonomy (planner/generator/evaluator/orchestrator + 4 grader specializations) with phase binding, model anchor, tools allowlist, output contract, maxTurns. Binds agent .md semantics to typed primitive.
- `sprint-contract.ts` (ACTION, `prim-action-05`) — File-based Generator↔Evaluator agreement; status state machine (drafting/negotiating/bound/aborted); hard-threshold policy (per-criterion floors + overall ceiling); disagreement resolution enum.
- `feedback-loop.ts` (LOGIC, `prim-logic-04`) — 7-state iteration tracker (negotiating→generating→evaluating→feedback→passed/failed/aborted) binding a Generator+Evaluator pair to a SprintContract. Monotonic feedback artifact paths.
- `grading-criterion.ts` (DATA, `prim-data-08`) — AIP Evals 5-evaluator taxonomy (code/rule/model/human/hybrid), 9-domain applicability scope, pass/fail logic with 4 combinator types, hybrid sub-criteria composition. Rubric = ordered Set<Criterion> with sum(weight)=1.0.
- `playwright-scenario.ts` (LEARN, `prim-learn-04`) — 17-kind browser step taxonomy, evidence capture spec (screenshots/network/console/video/a11y/DOM), MCP binding enum (Playwright | Claude-in-Chrome).

EVENT_TYPE_REGISTRY expanded 29→35:
- `harness_agent_spawned`, `sprint_contract_negotiated`, `sprint_contract_bound`, `feedback_loop_opened`, `playwright_scenario_executed`, `grading_completed`

Authority: Prithvi Rajasekaran's Anthropic Labs harness + Palantir AIP Evals 5-evaluator + Claude Code Lead Protocol v2.

### Per-Axis Version Matrix (v1.14.0)
| Axis | Version | Source |
|------|---------|--------|
| ontology/types.ts | 1.12.0 (unchanged) | primitives surface extended separately |
| ontology/primitives/ | 26 files (+5) | harness primitives added |
| ontology/lineage/event-types | 35 events (+6) | harness lifecycle |
| interaction | 0.1.2 | unchanged |
| meta | 0.1.0 | unchanged |
| rendering | 0.1.0 | unchanged |
| **root package** | **1.14.0** | **MINOR bump (additive)** |

---

## 1.0.0 (package) / primitives surface — 2026-04-17

### Breaking Change Signal
Major package version bump (0.2.1 → 1.0.0) signals a new canonical primitive surface.
Zero actual breaking changes: all existing types.ts and semantics.ts interfaces are
preserved for backward compatibility. Consumer projects may continue importing from
existing subpaths without modification.

### Added (9 new primitive files under primitives/)
- **`primitives/struct.ts`** (prim-data-05) — StructRid + StructDeclaration + StructRegistry singleton. Reusable named record type (Palantir Struct analog) embedded inside ObjectType properties.
- **`primitives/value-type.ts`** (prim-data-06) — ValueTypeRid + ValueTypeDeclaration + ValueTypeRegistry + BaseScalarType union (`string`|`number`|`integer`|`boolean`|`date`). Scalar constraint type wrapping base primitives with semantic validation.
- **`primitives/shared-property-type.ts`** (prim-data-07) — SharedPropertyTypeRid + SharedPropertyTypeDeclaration + SharedPropertyTypeRegistry. Promoted from inline interface in types.ts; enables cross-object property group reuse (e.g. AuditFields).
- **`primitives/capability-token.ts`** (prim-security-02) — CapabilityTokenRid + CapabilityTokenDeclaration + CapabilityTokenRegistry. L2 RBAC token with holder, scope, issuedAt, expiresAt, signature.
- **`primitives/marking-declaration.ts`** (prim-security-03) — MarkingRid + MarkingDeclaration + MarkingDeclarationRegistry. Cell/column classification with SensitivityLevel (`public`|`internal`|`confidential`|`restricted`) and applicableFieldPaths.
- **`primitives/automation-declaration.ts`** (prim-action-03) — AutomationRid + AutomationDeclaration + AutomationDeclarationRegistry. Cron/trigger scheduled action metadata (schedule, actionTypeRid, enabled).
- **`primitives/webhook-declaration.ts`** (prim-action-04) — WebhookRid + WebhookDeclaration + WebhookDeclarationRegistry. External ingress event descriptor (endpoint, authHeader, payloadSchema, eventTypeFilter).
- **`primitives/scenario-sandbox.ts`** (prim-learn-03) — ScenarioRid + ScenarioSandboxDeclaration + ScenarioSandboxRegistry. Isolated what-if analysis context (scenarioId, parentSessionId, isolation: full|shared-read, createdAt, metadata).
- **`primitives/aip-logic-function.ts`** (prim-logic-03) — AIPLogicFunctionRid + AIPLogicFunctionDeclaration + AIPLogicFunctionRegistry. LLM-backed function (modelRef, promptTemplate, outputSchema, deterministic: false).

### Added (event registry expansion)
- **`lineage/event-types.ts`** — EVENT_TYPE_REGISTRY expanded from 10 to 16 variants. New events: `ontology_registered`, `capability_token_issued`, `schema_locked`, `scenario_created`, `pr_body_generated`, `session_complete`.

### Deprecation Notes
The following inline interfaces in `types.ts` are superseded by the new primitive files and should be migrated in W3+:
- `SharedPropertyType` → `primitives/shared-property-type.ts:SharedPropertyTypeDeclaration`
- `StructType` → `primitives/struct.ts:StructDeclaration`

Types.ts interfaces are preserved read-only (managed-settings deny rules lock them) and will remain for backcompat through at least v1.x.

### Per-Axis Version Matrix (v1.0.0)
| Axis | Version | Source |
|------|---------|--------|
| ontology | 1.12.0 | ontology/CHANGELOG.md (no bump — additive primitives live outside types.ts) |
| interaction | 0.1.2 | interaction/types.ts |
| meta | 0.1.0 | meta/types.ts |
| rendering | 0.1.0 | rendering/types.ts |
| **root package** | **1.0.0** | **package.json + CHANGELOG.md** |

---

## 1.12.0 — 2026-04-10

### Added (typed BackPropagation / Workflow Lineage upgrade)
- **`feedbackEntityRef` / `feedbackMutationRefs`** (`types.ts`) — typed LEARN-02 declaration for human/operator feedback surfaces
- **`evaluationEntityRef` / `evaluationMutationRefs` / `evaluationFunctionRefs`** (`types.ts`) — typed evaluator/rubric declaration so semantic audit no longer depends on naming heuristics alone
- **`outcomeEntityRef` / `outcomeMutationRefs`** (`types.ts`) — typed LEARN-03 / REF-01 outcome tracking declaration
- **`accuracyEntityRef` / `refinementSignalEntityRef` / `graduationMutationRefs`** (`types.ts`) — typed REF-02..05 BackPropagation declaration
- **`workflowLineageEntityRefs`** (`types.ts`) — typed Workflow Lineage declaration for trace entities
- **`schemas/ontology/BROWSE.md` + `schemas/ontology/INDEX.md`** — question-first retrieval and structure map for schema work

### Updated
- **`semantic-audit.ts`** now prefers typed LEARN / REF / WL refs before inferential heuristics for SA-11, SA-12, SA-21, SA-22, and Stage 5 maturity calculation
- **`project-validator.ts`** validates typed LEARN refs against real entities, mutations, and functions and emits warnings when boolean-only LEARN declarations are underspecified
- **`project-test.test.ts`** now preserves `runtime` when flattening `ProjectOntologyScope`, so runtime audit/backprop declarations are not dropped during validation
- **`CLAUDE.md` + `rules/03-forward-backward-propagation.md` + `rules/05-lineage-governance-learn.md`** aligned to the typed BackPropagation contract
- **`research/BROWSE.md` + `research/INDEX.md`** gained explicit BackPropagation / Workflow Lineage retrieval paths
- **`semantics.ts`** schema version bumped to `1.12.0`

### Verified
- `cd ~/.claude/schemas/ontology && bun test`
- `bunx tsc --noEmit --module esnext --target es2022 --moduleResolution bundler ~/.claude/schemas/ontology/types.ts ~/.claude/schemas/ontology/semantics.ts ~/.claude/schemas/ontology/semantic-audit.ts ~/.claude/schemas/ontology/project-validator.ts ~/.claude/schemas/ontology/project-test.test.ts`

## 1.11.0 — 2026-04-03

### Added (external-agent + local-first + structural governance alignment)
- **`agentToolDescription`** (`types.ts`) — optional action-level guidance mirroring Ontology MCP's official Agent tool description field for externally callable actions
- **`permissionModel`** (`types.ts`) — optional per-project declaration for `ontologyRoles` vs `projectBased` permission surfaces
- **`embeddedOntologyApp` + offline sync fields** (`types.ts`) — frontend scope can now declare offline-capable embedded ontology views via `supportsOffline` and `syncEntityApiNames`
- **`embeddedOntology` runtime support kind** (`types.ts`) — runtime support bindings can now declare the local embedded ontology support surface explicitly
- **`EMBEDDED_ONTOLOGY_APP_SURFACES`** (`semantics.ts`) — EO-01..05 constants promoting Foundry's embedded ontology/offline app path into typed schema authority
- **`STRUCTURAL_CHANGE_GOVERNANCE_SURFACES`** (`semantics.ts`) — SCG-01..05 constants capturing branches, proposals, delegated ownership, and approval/protection boundaries for structural change

### Updated
- **`ONTOLOGY_MCP`** (`semantics.ts`) now reflects official query/function/action guidance boundaries instead of treating MCP purely as `toolExposure` inference
- **`semantic-audit.ts`** adds richer `SA-23` evidence using `agentToolDescription` and a new `SA-32` check for embedded ontology / offline-capable frontend surfaces
- **`project-validator.ts`** validates offline sync entity refs, allowed offline surfaces, and the required runtime `embeddedOntology` support binding when offline views are declared
- **`semantics.ts`** schema version bumped to `1.11.0`

### Verified
- `cd ~/.claude/schemas/ontology && bun test`
- `bunx tsc --noEmit --module esnext --target es2022 --moduleResolution bundler ~/.claude/schemas/ontology/types.ts ~/.claude/schemas/ontology/semantics.ts ~/.claude/schemas/ontology/semantic-audit.ts ~/.claude/schemas/ontology/project-validator.ts`

## 1.10.0 — 2026-03-25

### Added (Project-scope backend/frontend contract)
- **`BackendOntology`** (`types.ts`) — explicit alias for the semantic core (`data`, `logic`, `action`, `security`, `learn`) so backend ontology can be referenced independently from broader project scope
- **`FrontendOntology`** (`types.ts`) — typed frontend contract for route/view declarations, agent surfaces, scenario flows, and optional interaction/rendering exports
- **`ProjectOntologyScope`** (`types.ts`) — `{ backend, frontend? }` export shape for projects that want AI agents to scaffold full-stack ontology scope instead of backend declarations only
- **`HUMAN_AGENT_LEVERAGE_CRITERIA`** (`semantics.ts`) — typed promotion of DevCon 5's 3 leverage conditions: shared mutable context, clear validation criteria, feedback-driven optimization
- **`PROJECT_SCOPE_ONTOLOGY_SURFACES`** (`semantics.ts`) — typed authority for backend semantic core, frontend application surface, agent surface, and sandbox/review surface
- **`ONTOLOGY_DESIGN_PRINCIPLES`** (`semantics.ts`) — DevCon 5's 4 ontology design principles promoted into schema authority (`ODP-01..04`)

### Updated
- **`OntologyExports`** (`types.ts`) now supports optional `frontend` while remaining backward-compatible with existing flat backend-only exports
- **`project-validator.ts`** adds `PV-07` frontend ontology validation: backend↔frontend reference integrity for views, agent surfaces, scenario flows, interaction bindings, and 3D rendering declarations
- **`project-test.test.ts`** loader now accepts both flat `OntologyExports` and scoped `{ backend, frontend? }` project exports
- **`semantics.ts`** schema version bumped to `1.10.0`

### Verified
- `bun test /home/palantirkc/.claude/schemas/ontology/project-test.test.ts`
- `bunx tsc --noEmit --module esnext --target es2022 --moduleResolution bundler /home/palantirkc/.claude/schemas/ontology/types.ts /home/palantirkc/.claude/schemas/ontology/semantics.ts /home/palantirkc/.claude/schemas/interaction/types.ts /home/palantirkc/.claude/schemas/rendering/types.ts`
- Known environment limitation: direct `bunx tsc` on `project-validator.ts` fails without Bun test typings (`bun:test`) in this standalone schema directory

## 1.9.1 — 2026-03-18

### Fixed (Research-driven source reference audit)
- **32 stale source references** across `semantics.ts`, `data/schema.ts`, `logic/schema.ts`, `action/schema.ts` — 4 deleted research files (`ontology-architecture.md`, `ssot-full-audit-2026-03-17.md`, `_latest-devcon5-aipcon9-research.md`, `devcon-aipcon.md`) replaced with correct paths after 2026-03-18 research library restructure
- **HC-SEC-01** rule text corrected: "All three security layers" → "All four security layers" — model has had 4 layers (RBAC, Markings, Object Security, Cell-Level) since v1.3.0
- **HC-SEC-09** source field updated to include both `object-security.md` and `markings.md` (rule covers both RLS and marking aspects of SearchAround traversal)
- **`AutomationConditionType`** (`action/schema.ts`): added `"timeBased"` member — research documents 7 condition types (1 time-based + 6 object set), schema previously had only 6. Also added to `AUTOMATION_CONDITION_TYPES` array and `CONDITION_TYPE_TO_TRIGGER_MODEL` mapping table
- **HC comment ranges** corrected: `logic/schema.ts` "05..34"→"05..37", `action/schema.ts` "06..28"→"06..37", `data/schema.ts` "06..36"→"06..40"
- **HC-DATA-33 comment** clarified: "removed" → "reassigned" (was reassigned from "required array min 1 item" to "Edit-only properties" in v1.4.0)
- **HC-DATA-26** source field updated from deleted `ontology-architecture.md` to `data/entities.md §DATA.EN-11, §DATA.EN-19`
- **Source path prefixes**: added `.claude/` prefix to HC-LOGIC-35..37 and HC-ACTION-34..35 source fields for consistency
- **`data/schema.ts`**: added missing `StructuralRule` import from `../types` (pre-existing issue)
- **`data/schema.ts` header**: "13 research files" → "15 research files"

### Verified
- 1,044 tests, 0 fail, 6,953 assertions (+2 from `timeBased` mapping table expansion)
- Zero stale source references remaining (verified via grep across all schema files)
- Reference documents updated: MEMORY.md, INDEX.md, ontology-model.md, llm-grounding.md, validation/README.md

## 1.9.0 — 2026-03-17

### Added (Adapter taxonomy + experiment semantics)
- **`EVALUATION_EXPERIMENT_CAPABILITIES`** (`semantics.ts`) — official experiment-level AIP Evals capabilities promoted into typed authority (`EEXP-01..05`)
- **`LOCAL_WORKFLOW_RESOURCE_TAXONOMY`** (`semantics.ts`) — explicit adapter-level 24-resource / 24-edge workflow graph taxonomy promoted from `frontend-dashboard/convex/schema.ts`
- **DS-32** (`semantics.test.ts`) — runtime graph taxonomy integrity checks

### Updated
- `semantics.ts` schema version bumped to `1.9.0`
- `frontend-dashboard/ontology/schema.ts` tracked schema version updated to `1.9.0`

### Verified
- `bun test semantics.test.ts`
- `bunx tsc --noEmit` (frontend-dashboard)
- `bun run test:e2e:local` (frontend-dashboard)

## 1.8.0 — 2026-03-17

### Added (Canonical taxonomy sync)
- **`PALANTIR_MCP_TOOL_CATEGORIES`** (`semantics.ts`) — official 13-category, 65-tool Palantir MCP taxonomy promoted into typed authority
- **`WORKFLOW_LINEAGE_GRAPH_MODEL`** (`semantics.ts`) — official Workflow Lineage graph surface promoted with 10 node types, hidden edge defaults, color legend groups, refactoring capabilities, and AIP usage metrics
- **DS-30 / DS-31** (`semantics.test.ts`) — integrity tests for MCP taxonomy and Workflow Lineage graph model

### Updated
- `semantics.ts` schema version bumped to `1.8.0`
- `frontend-dashboard/ontology/schema.ts` tracked schema version updated to `1.8.0`
- `FOUNDRY_ORCHESTRATION_MAP` builder surface updated from stale `Pilot` wording to active `Agent Studio`

### Verified
- `bun test semantics.test.ts`
- `bunx tsc --noEmit` (frontend-dashboard)

## 1.7.0 — 2026-03-17

### Added (Whole-codebase direction alignment)
- **`FOUNDRY_ORCHESTRATION_MAP`** (`semantics.ts`) — 6-layer directional map (`ORCH-01..06`) binding builder surfaces, ontology core, runtime twin, governance/lineage, LEARN/backprop, and integration surfaces into one explicit architecture
- **`orchestration-map.md`** (`research/palantir/`) — whole-codebase SSoT explaining how the repo should evolve as a Palantir-style digital twin and self-improving decision system
- **DS-29** (`semantics.test.ts`) — orchestration map integrity checks

### Updated
- `semantics.ts` schema version bumped to `1.7.0`
- `frontend-dashboard/ontology/schema.ts` tracked schema version updated and ontology-side orchestration constants added
- `frontend-dashboard/CLAUDE.md` architecture/orchestration sections updated for current route/eval surface counts

### Verified
- 1,021 tests, 0 fail, 6,818 assertions
- frontend-dashboard TypeScript passes
- convex TypeScript passes

## 1.6.0 — 2026-03-17

### Added (DevCon5 / AIPCon9 / AIP Evals alignment)
- **`LEARN_EVALUATION_SURFACES`** (`semantics.ts`) — 5 typed official evaluation surfaces (`LES-01..05`: deterministic, heuristic, rubric grader, custom function, ontology edit simulator) derived from verified AIP Evals docs
- **`PLATFORM_OPEN_SOURCE_BOUNDARY`** (`semantics.ts`) — 3-entry boundary table clarifying what is platform-native vs protocol surface vs official public repo
- **`MCP_PRODUCT_SPLIT`** (`semantics.ts`) — explicit builder-vs-consumer split between `Palantir MCP` and `Ontology MCP`
- **DS-27 / DS-28** (`semantics.test.ts`) — new tests covering LEARN evaluation surfaces, OSS boundary, and MCP split
- **`semantic-audit.ts` SA-11 upgrade** — LEARN-02 now distinguishes simple human feedback from explicit rubric/evaluator support; audit can scaffold `EvaluationRecord` + `recordEvaluation`
- **Audit UI rubric visibility** (`frontend-dashboard/src/components/audit/AuditPanel.tsx`) — latest rubric evaluations and rubric KPIs surfaced in the dashboard

### Updated (Research SSoT alignment)
- **`research/INDEX.md`** — platform file count, schema stats, and latest verified memo injection updated
- **`research/palantir/platform/announcements.md`** — `AIP Evals` added as official LEARN surface with OSS boundary note
- **`philosophy/digital-twin.md`** and **`philosophy/tribal-knowledge.md`** — LEARN-02 now explicitly references rubric/evaluator surfaces from official AIP Evals docs
- **`architecture/ontology-model.md`** status line updated to current test/assertion totals and schema version

### Verified
- 1,016 tests, 0 fail, 6,808 assertions
- `bunx tsc --noEmit -p tsconfig.json` (frontend-dashboard) passes
- `bunx tsc --noEmit -p convex/tsconfig.json` passes

## 1.3.0 — 2026-03-14

### Added (Enforcement Absorption — enforcement/ → philosophy/ + semantics.ts)
- **`OPERATIONAL_CONTEXT_EXAMPLES`** (`semantics.ts`) — 5 real-world AIPCon deployments (GE Aerospace, ShipOS, Centrus, World View, Freedom Mortgage) decomposed into DATA/LOGIC/ACTION/LEARN in operational context. Anchored in developer statement: "The semantics HAVE to be more than just data, and they have to be modeled how the real world is actually working."
- **`LEARN_MECHANISMS`** (`semantics.ts`) — 3 typed mechanisms (LEARN-01 Write-Back, LEARN-02 Evaluation Feedback, LEARN-03 Decision Outcome Tracking) defining HOW the LEARN stage feeds outcomes back into the twin
- **`ACTION_GOVERNANCE`** (`semantics.ts`) — 5 governance dimensions (AG-01..05: who/conditions/review/changes/trace) with cross-references to existing enforcement constants (SECURITY_OVERLAY, HC-ACTION-05, PROGRESSIVE_AUTONOMY_LEVELS, DECISION_LINEAGE)
- **`TWIN_FIDELITY_DIMENSIONS`** (`semantics.ts`) — 5 dimensions (TF-01..05: Entity Correspondence, Relationship Faithfulness, Interpretation Consistency, Action Determinism, Temporal Coherence) showing without/with semantic modeling contrast
- **`TWIN_MATURITY_STAGES`** (`semantics.ts`) — 5-stage twin progression (Snapshot→Mirror→Model→Operator→Living System) with cumulative semantic requirements per stage
- **DS-13..DS-16 test groups** (`semantics.test.ts`) — 4 new test groups with ~50 tests covering all new constants + cross-constant connection integrity
- **`digital-twin.md`** — expanded LEARN section (3 mechanisms), Twin Fidelity table, Twin Maturity progression, Governance-Enables-Autonomy, Graduation Pattern, AIPCon additions (GE 26%, Centrus nuclear)
- **`llm-grounding.md`** — Ontology-Grounded Agents section (tool surfacing, agent composition patterns, Agent Studio)
- **`ontology-ultimate-vision.md`** — §4.5 Enforcement Mechanisms (Workflow Lineage, Scenarios/COA, Action Governance), §8 Operational Context Modeling, AIPCon 9 additions (GE BOM, Centrus nuclear, US CDAO COA)
- **`tribal-knowledge.md`** — Stage 4 gap expanded with 3 LEARN mechanisms, LEARN-02/03 cross-references in feedback loop
- **`README.md`** — Developer's Core Statement, Typed Constants table (12 philosophy→code mappings)

### Removed (Enforcement Directory — redundant with philosophy/ + cc-runtime-constraints.md)
- **`research/palantir/enforcement/`** (6 files, ~540 lines) — aip-automate.md, decision-lineage.md, agent-architecture.md, digital-twin-feedback.md, action-governance.md, README.md. All unique content absorbed into philosophy/ files and semantics.ts typed constants.
- **Rationale:** enforcement/ was a redundant intermediate layer between philosophy/ (WHY) and cc-runtime-constraints.md (adapter gaps). 80-90% overlap with existing content. Unique content (AIPCon quotes, LEARN mechanisms, governance model) now lives as typed constants in semantics.ts with test coverage.

### Removed (Architecture Cleanup — schemas/ = ontology/ only)
- **`schemas/types.ts`** (198 lines) — adapter bridge; ontology/ never imported it
- **`schemas/convex/`** (~6,000 lines, ~35 files) — translation tables + DH-SEC ID collision with ontology/security/
- **`schemas/frontend/`** (~2,620 lines, ~10 files) — tech-stack UI mapping tables
- **`schemas/cross-pipeline/`** (464 lines, 3 files) — adapter consistency tests
- **`schemas/frontend-ontology-check/`** (1,326 lines, 7 files) — project-level validation tool
- **`schemas/lsp-audit/`** (1,578 lines, 15 files) — skill internal infrastructure
- **`schemas/polish/`** (3,590 lines, 16 files) — QA skill internal infrastructure
- **Total removed: ~15,776 lines across ~87 files**
- **Rationale:** These were adapter translation tables, code generation templates, and operational tools masquerading as semantic definitions. Ontology defines WHAT things mean; adapters compile at skill execution time. Tools belong in skills/, not schemas/.
- **SEMANTIC_COMPILATION_PIPELINE Stage 3** updated: removed bridge reference, now reads "schemas/ontology/ (semantic SSoT) → skill-time compilation → convex/schema.ts + src/"
- **Key finding:** convex/security.ts had DH-SEC-01..08 with DIFFERENT questions from ontology/security/schema.ts — same IDs, different content = K-LLM consistency violation. Resolved by deletion.

### Verified
- 716 tests, 0 fail, 4764 assertions — identical to pre-cleanup baseline

## 1.2.1 — 2026-03-14

### Fixed (Upstream Documentation Staleness)
- **`tribal-knowledge.md`** — DH count updated from 34→36 (LOGIC 12→13, ACTION 12→13), HC count updated from 76+→92 (added HC-SEC-01..12 to tally). DH-LOGIC-13 (toolExposure) and DH-ACTION-13 (progressive autonomy) were added in v1.2.0 but upstream philosophy doc was not synced.
- **`semantics.ts` SEMANTIC_COMPILATION_PIPELINE** — Stage 3 `ourMapping` updated to include `schemas/types.ts` bridge layer in the dataflow path: `schemas/ontology/ → schemas/types.ts (type bridge) → schemas/{convex,frontend}/ → convex/schema.ts`

### Verified (Full Deep Dive Audit)
- 752 tests, 0 failures, 4962 assertions across 8 schema test files
- All 13 philosophy-derived requirements (REQ-01..REQ-13) verified against code
- Cross-domain CI-01..CI-09 invariants: all hold
- DH counts confirmed: DATA=10, LOGIC=13, ACTION=13, SECURITY=8 (total 44 including security)
- HC counts confirmed: DATA=23, LOGIC=29, ACTION=28, SECURITY=12 (total 92)
- Type bridge: 19 BasePropertyType → 24 OntologyPropertyType mapping verified bidirectional
- Dataflow: research/palantir/ → schemas/ontology/ → schemas/types.ts → schemas/{convex,frontend}/ → schemas/cross-pipeline/ verified intact

## 1.2.0 — 2026-03-14

### Reverted (OOSD-02 Compliance — v1.3.0 contamination removed)
- **`RuntimeViability` type** removed from `semantics.ts` — execution-environment concern (WHERE things run) does not belong in semantic definitions (WHAT things mean)
- **`HardConstraint.runtimeViability?`** optional field removed — HardConstraints define platform rules, not adapter capability
- **`HallucinationReductionPattern.runtimeViability`** field and values (HRP-01..03) removed
- **`ProgressiveAutonomyLevel.runtimeViability`** field and values (PA-01..05) removed
- **Section 11** (`CCRuntimeConstraint` interface + `CC_RUNTIME_CONSTRAINTS` array, ~64 lines) deleted entirely
- **`security/schema.ts`** — `runtimeViability` removed from all 12 HC-SEC constraints
- **SCHEMA_VERSION** held at `"1.2.0"` in all 5 schema files (v1.3.0 was never released)
- **Governance reframe**: `rules/cc-runtime-constraints.md` rewritten from "Declaration vs Enforcement" to "Schema = Semantics, Adapter = Implementation" — zero viability annotations
- **Research reframe**: `research/claude-code/runtime-constraints.md` reframed from "Conflict Matrix" (CCR-*) to "Adapter Gap Matrix" (AGM-*) with 2-step decision tree (semantic classification → adapter assessment)

### Added (DATA Domain Deep Dive)
- **`PLATFORM_EXTENDED_BASE_TYPES`** (`data/schema.ts`) — `byte`, `decimal`, `short` — Palantir platform types excluded from core 19 `BasePropertyType` because they map to existing Convex primitives with no semantic distinction
- **`UNIVERSAL_FILTER_OPS`** (`data/schema.ts`) — `hasProperty` null check available on ALL property types
- **`OSDK_FILTER_OPERATORS`** (`data/schema.ts`) — 13 declarative where-clause operators (`$eq`, `$gt`, `$isNull`, `$or`, etc.) for OSDK 2.0 filter syntax
- **`TIMESERIES_STREAM_AGGREGATION_METHODS`** (`data/schema.ts`) — 11 server-side aggregation methods (SUM, MEAN, STANDARD_DEVIATION, etc.)
- **`TIMESERIES_STREAM_STRATEGIES`** (`data/schema.ts`) — 3 strategies (CUMULATIVE, ROLLING, PERIODIC)
- **`TIMESERIES_RESPONSE_FORMATS`** (`data/schema.ts`) — JSON, ARROW
- **`OSDK_TYPE_SUPPORT`** (`data/schema.ts`) — Consolidated OSDK language support matrix for 9 special types (cipher, vector, struct, timeseries, etc.) — previously scattered across 5+ research files
- **`OSV_FEATURE_COMPARISON`** (`data/schema.ts`) — Object Storage V1 vs V2 capability matrix (6 features)
- **`STRUCT_CONSTRAINTS`** (`data/schema.ts`) — Explicit typed constants: NON_FILTERABLE, MAX_NESTING_DEPTH, PARTIAL_UPDATE_SUPPORTED, INDIVIDUAL_FIELD_REQUIRED, RID_INHERITANCE
- **`text-embedding-3-large`** added to `EMBEDDING_MODELS` with note about exceeding 2048 platform limit
- **3 new test groups** (`data/schema.test.ts`) — DD-10 (Platform Extended Types), DD-11 (OSDK Support Matrix), DD-12 (TimeSeries/OSv Constants)

### Added (Progressive Autonomy — `semantics.ts`)
- **`PROGRESSIVE_AUTONOMY_LEVELS`** — 5-level typed constant (Monitor→Recommend→Approve-then-act→Act-then-inform→Full autonomy) with descriptions, examples, and primaryDomain mapping. Closes the last philosophy→domain gap: `digital-twin.md §Progressive Autonomy` → `semantics.ts` → `action/schema.ts AUTONOMY_LEVELS`

### Added (Philosophy Meta-Layer — `semantics.ts`)
- **`DECISION_LINEAGE`** — 5 dimensions (WHEN/ATOP/THROUGH/BY/WITH) of the LEARN feedback mechanism
- **`HALLUCINATION_REDUCTION_PATTERNS`** — 3 official Palantir patterns (OAG→DATA, Logic Tools→LOGIC, Action Review→ACTION), each with domain mapping and system implications
- **`TRIBAL_KNOWLEDGE_PROGRESSION`** — 5-stage maturity model (Tribal Knowledge→DecisionHeuristic→LLM Tools→Institutional Memory→Autonomous Reasoning) with `ourSystemState` markers
- **`SEMANTIC_COMPILATION_PIPELINE`** — 4-stage pipeline (Business Language→Domain Modeling→Schema Compilation→Logic Binding) with `ourMapping` to project structure
- **`K_LLM`** — Multi-model consensus definition (mechanism, our implementation, principle)
- **`OOSD_PRINCIPLES`** — 4 principles (Code in Business Language, Abstraction, Marginal Cost→Zero, Defragmented Enterprise)
- **DS-10 test groups** (`semantics.test.ts`) — 6 sub-groups covering all philosophy constants (21 new tests)

### Added (LOGIC Domain Deep Dive)
- **`FUNCTION_RUNTIME_FEATURES`** (`logic/schema.ts`) — 11-entry v1 vs v2 feature support matrix (EditBatch, interface params, OSDK integration, deployed execution, class-based functions, BYOM, etc.)
- **`EDIT_COLLAPSE_RULES`** (`logic/schema.ts`) — 5 typed rules for edit merging semantics (property collapse, link order preservation, create→update collapse, modify→delete, create→delete no-op) with Freudenthal paradigmatic example in JSDoc
- **DL-10 test groups** (`logic/schema.test.ts`) — 12 new tests for runtime features and collapse rules

### Added (ACTION Domain Deep Dive)
- **`SIMPLE_RULE_COMPOSITION`** (`action/schema.ts`) — 8 typed rules for declarative rule interaction (collapse, ordering, FK vs M:N link rule selection, function exclusivity) with Freudenthal paradigmatic example in JSDoc
- **`WRITEBACK_OUTPUT_FLOW`** (`action/schema.ts`) — 5 typed constants for the writeback webhook output parameter architecture (external system response → subsequent ontology rule input)
- **`INLINE_EDIT_CONSTRAINTS`** (`action/schema.ts`) — 7 typed constraints for inline edit mode (single object, no join links, no side effects, self-only criteria)
- **DA-10 test groups** (`action/schema.test.ts`) — 19 new tests for rule composition, writeback flow, inline constraints

### Changed
- **`SCHEMA_VERSION`** → `"1.2.0"` in `data/schema.ts`, `semantics.ts`, `logic/schema.ts`, and `action/schema.ts`
- **EMBEDDING_MODELS count** — 4 → 5 entries

### Added (Cross-Domain Connection Integrity — `semantics.test.ts`)
- **DS-11 test group** — 6 sub-groups verifying philosophy→domain linkage:
  - HRP→Domain Heuristic Connection (6 tests) — each `HALLUCINATION_REDUCTION_PATTERNS[].primaryDomain` has corresponding `*_HEURISTICS` with entries
  - Tribal Knowledge Stage→System State Reality (9 tests) — stages 1-3 "achieved" backed by real DH/HC constants; stages 4-5 "future" reference existing constants
  - Semantic Compilation Pipeline→File Path Validity (5 tests) — each stage's `ourMapping` references valid project paths
  - Philosophy Constant Counts (6 tests) — OOSD=4, DECISION_LINEAGE=5, HRP=3, TKP=5, SCP=4, K_LLM=3 fields
  - Schema Version Alignment (3 tests) — all schema files at 1.2.0
  - Cross-Domain HC Consistency (6 tests) — HC-{DOMAIN}-NN pattern, no duplicate IDs, all severity=error, HC-LOGIC-15 PK immutability cross-ref
  - Progressive Autonomy → Domain Connection (7 tests) — PA-01..05 levels match action/schema.ts AUTONOMY_LEVELS, domain progression data→logic→action

### Changed (Security Version Alignment)
- **`SCHEMA_VERSION`** → `"1.2.0"` in `security/schema.ts` — no structural changes, aligned for consistency across all 5 schema files

### Test Results
- 716 pass / 0 fail across ontology (7 files) — 4,764 assertions

## 1.1.1 — 2026-03-14

### Changed
- **Type Bridge Consolidation** — `schemas/types.ts` now imports `BasePropertyType` from `ontology/types.ts` and exports canonical `ALL_ONTOLOGY_PROPERTY_TYPES`, `CASING_NORMALIZATION`, `TYPE_MODIFIERS`, `normalizeBaseType()`, `toBaseType()`
- **SSoT deduplication** — `cross-pipeline/types.ts` and `convex/types.ts` now re-export from bridge instead of hardcoding constants
- **Test infra dedup** — `convex/types.ts` imports `TestResult`, `DomainGateResult`, `TestSeverity` from `ontology/types.ts` instead of redefining
- **Helper dedup** — `convex/helpers.ts` re-exports `isPascalCase`, `isCamelCase`, `isValidPlural` from `ontology/helpers.ts` instead of duplicating
- **JSDoc clarification** — both `StructuralRule` interfaces (ontology naming vs adapter codegen) now have clear JSDoc distinguishing their purposes

### Test Results
- 722 pass / 0 fail across ontology (594), frontend (92), cross-pipeline (36) — 5,003 assertions

## 1.1.0 — 2026-03-14

### Added
- **Philosophy meta-layer** (`research/palantir/philosophy/`) — README.md, tribal-knowledge.md, llm-grounding.md, digital-twin.md
- **Security governance overlay** (`semantics.ts`) — `GovernanceOverlaySemantics` interface + `SECURITY_OVERLAY` constant; security is a typed governance overlay, not a 4th domain
- **6 new adapter constraints** (`convex/security.ts`) — AC-SEC-07..12 covering RLS index requirement, CLS return types, marking deny-on-unknown, action auth propagation, scheduled function auth, env var secrets
- **3 new decision heuristics** (`convex/security.ts`) — DH-SEC-06 (role count strategy), DH-SEC-07 (union semantics), DH-SEC-08 (interface permissions)
- **DH/HC backport** to research SSoT — all 34 DH and 76+ HC now documented in upstream research topic files
- **Worked examples** in entry/ domain — SaveTicker requirements capture and decomposition
- **Cross-domain contracts** (`validation/cross-domain-contracts.md`) — contract triangle enforcement patterns

### Fixed
- **Stale reference** (`semantics.ts:17`) — `vision.md` → `architecture/ontology-model.md`
- **Heuristic IDs** (`convex/security.ts`) — informal IDs mapped to DH-SEC-01..05 format
- **Domain README cross-refs** — all 5 domain READMEs updated to reference `architecture/ontology-model.md` instead of archived `vision.md`/`adaptation.md`

### Changed
- **`SCHEMA_VERSION`** → `"1.1.0"` in all 5 schema files

## 1.0.0 — 2026-03-13

Initial versioned release. Baseline established from Ontology Schema Audit (score 8.4/10, 368 tests).

### Added
- **Security governance overlay** (`security/schema.ts`) — 8-section schema with 12 hard constraints, 8 heuristics, 6 mapping tables, 4 structural rules, 6 thresholds
- **Centralized `StructuralRule`** in `types.ts` — removed 3 duplicate definitions from data/logic/action schemas
- **Unified heuristic quality bar** — all domains enforce >=600 chars + COUNTER-EXAMPLE in `realWorldExample`
- **Expanded `visual.html`** — 88 hard constraints (was 14) with SECURITY domain and filter toggles
- **Helper functions** (`helpers.ts`) — `validateApiName`, `validateBilingualDesc`, `validateHardConstraintId`, `validateHeuristicId`, `generateSchemaStats`
- **`SCHEMA_VERSION = "1.0.0"`** in all schema files (`semantics.ts`, `data/schema.ts`, `logic/schema.ts`, `action/schema.ts`, `security/schema.ts`)

### Test coverage
- 84 security tests (DS-0..DS-8)
- 34 helper tests (HLP-0..HLP-5)
- Semver format tests in all 5 schema test files
