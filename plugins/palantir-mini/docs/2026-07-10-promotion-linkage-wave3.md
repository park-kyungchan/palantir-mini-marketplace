# Promotion-linkage wave 3 — emit-site census, `edit_committed` when-ordering design note, incidental-sibling filter

Authority: rule 26 §Substrate routing + rule 10 §append-only invariant; g13 handoff row
`pm-as-default-infra` next-item "pm promotion-linkage wave 3"; memory
`backprop-emit-linkage-next`. Builds on wave 1 (`tests/scripts/replay-promote-grades-linkage-wave1.test.ts`)
and wave 2 (marketplace PR #209 — correlation-rid join + 23-site `lineageRefs` stamping,
pm 7.39.0 → 7.40.0).

This wave does three things: (a) a census of every `validation_phase_completed` emit
call site in the plugin source, classified stamped/unstamped; (b) a design note on
`lib/actions/commit.ts`'s `edit_committed` when-ordering gap; (c) a targeted filter
removing an incidental promotion side effect the wave-2 fix-round-1 commit had
explicitly flagged and accepted as bookkeeping-only.

---

## (a) Emit-site census

### Method

Every source file (excluding `*.test.ts`, `runtime-overlay/research-library/`,
`runtime-overlay/schemas-snapshot/` type-declaration files, and `convex/schema.ts`)
was grepped for the object-literal shape `type: "validation_phase_completed",` — i.e.
an actual `emit()` call site, not a reader/consumer filter (`ev.type === "..."`), a
type-union member, or a Set/array membership check. 97 such sites were found across
49 files. Each site was then checked for a `lineageRefs` field within its enclosing
`emit({...})` call (paren-balance scan) to classify stamped vs. unstamped, with a
manual spot-check for spread operators (`...`) near unstamped sites that could hide a
`lineageRefs` field pulled in from a shared base object — none did; every unstamped
site is a genuine unstamped plain object literal or additive-conditional-spread of
unrelated fields (`refinementTarget`, `identity`/`runtime`).

**Evidence standard (added in the 2026-07-10 re-audit, applies to every row below):**
a row's bucket must be grounded ONLY in identifiers actually reachable inside the
emit call's ENCLOSING FUNCTION — locals, params, or values plumb-able via its direct
callers (named explicitly when the path runs through a caller). Every row below now
names that enclosing function. Two rows in the original pass cited an identifier that
belonged to a DIFFERENT function than the one the emit call actually lives in; see
§Re-audit.

### Reconciliation

| Bucket | Count |
|---|---|
| Wave-2 stamped (PR #209 scope: `bridge/handlers/{pm-semantic-intent-gate,commit-edits,pm-intent-router}.ts`) | 23 |
| Pre-existing stamped, out of wave-1/2 scope (`hooks/t4-canonical-emit-watch.ts:147,167` — T4 D2-canonical/D2-fallback consensus checkpoints; these already carry `lineageRefs: { actionRid }` via a different, unrelated mechanism predating waves 1/2) | 2 |
| Unstamped, classified this wave (§Taxonomy below) | 72 |
| **Total emit sites enumerated** | **97** |

`23 + 2 + 72 = 97` — reconciles exactly against the enumeration.

**Cross-check against the event-type registry**: `validation_phase_completed` is a
registered discriminator in
`runtime-overlay/schemas-snapshot/ontology/lineage/event-types.ts`
(`EVENT_TYPE_NAMES` array + `EVENT_TYPE_REGISTRY` entry, `primaryDomain: "logic"`,
"A validation phase (design/compile/runtime/post_write) finished with a verdict.").
All 97 enumerated sites emit this exact, canonical, registered type — no orphan or
drifted type name was found among them.

### Taxonomy

Four buckets, derived from what identifier (if any) is already in scope at each
unstamped site and what kind of thing the site actually validates:

- **`needs-context-plumbing`** — a contract/action-rid-class identifier (in wave-1's
  sense: a `contractId`/`promptId`/`taskId`/`capsuleId`-style ref, never an `eventId`)
  is already available in the function's local scope, so a correlation-rid stamp
  *could* be added, but doing so would only ever pair this site with something that
  ALSO deliberately carries that exact same non-eventId identifier — i.e. it needs a
  companion emitter threaded through before stamping is useful, exactly the wave-1
  class-A finding repeated at a new site. Deferred, not stamped.
- **`stampable-now-deferred`** — a genuinely strong candidate: either the exact same
  identifier-and-purpose pattern as an already-stamped sibling (but not in one of the
  wave-1/2 audited files, so not "proven identical" under this wave's mechanical-
  stamping cap), or a real `eventId`-class variable (not a contract/prompt ref) that
  would satisfy the ENGINE'S EXACT join predicate today. Flagged for Lead review next
  wave; **not self-executed this wave** (see §Recommendation below).
- **`standalone-advisory`** — the site validates the CURRENT tool call, a periodic
  audit/health-check, or the promotion engine's own lifecycle (not a specific prior
  T1 decision event). There is no natural sibling source event to correlate against
  at all — promotion linkage does not conceptually apply. The large majority of sites
  (57/72, post-re-audit — see §Re-audit) fall here: PreToolUse/PostToolUse hook gates (agent ownership, domain
  classification, write-scope, drift, manifest, semantic-frontmatter, etc.),
  self-contained periodic audits (cross-project-audit, mode-bottleneck,
  propagation-chain-health, propagation-audit-forward, health-audit), and — notably —
  `hooks/t4-promotion-trigger.ts`'s own 3 summary/bypass events, which are
  META-instrumentation about the promotion engine's own run and must NOT be stamped
  (stamping the promotion engine's own meta-events would risk circular/self-
  referential promotion).

| Bucket | Count |
|---|---|
| `needs-context-plumbing` | 13 |
| `stampable-now-deferred` | 2 |
| `standalone-advisory` | 57 |
| **Total unstamped, classified** | **72** |

**Re-audited 2026-07-10** against the enclosing-function evidence standard (§Re-audit
below) — bucket counts above are POST-re-audit. The original wave-3 pass counted
5 / 2 / 65; two `needs-context-plumbing` rows cited an identifier that was not
actually reachable at the cited emit call site (reclassified to
`standalone-advisory`), and ten `standalone-advisory` rows turned out to have a
genuinely reachable contract/prompt/task/capsule-class identifier the original
pass missed (reclassified to `needs-context-plumbing`). See §Re-audit for the
full list and reasoning. The 97-site total and the 23/2/72 top-level
reconciliation are unaffected — only the internal split of the 72 changed.

### Full site table

**Wave-2 stamped (23)** — unchanged this wave:
`bridge/handlers/pm-semantic-intent-gate.ts:933,1947,2138,2249,2417,2453,2551,2576,2627,2729,2848,2877,2950,2984`;
`bridge/handlers/pm-intent-router.ts:1136,1238,1288,1412,1491,1631`;
`bridge/handlers/commit-edits.ts:170,257,296`.

**Pre-existing stamped, unrelated (2)**: `hooks/t4-canonical-emit-watch.ts:147,167`.

**`needs-context-plumbing` (13)** — enclosing function named per the evidence standard;
rows marked "2026-07-10 re-audit" are new this pass (see §Re-audit for why the
original pass missed them):

| Site | Enclosing function | In-scope candidate | Note |
|---|---|---|---|
| `hooks/gates/prompt-dtc-enforcement-gate.impl.ts:1109` | `emitGateAssessment` | `semanticIntentContractRef`, `digitalTwinChangeContractRef` (locals, lines 1104-1106) | literally wave-1's own vocabulary, same finding repeated |
| `lib/context/context-capsule.ts:271` | `archiveContextCapsule` | `capsuleId` (function param) | capsuleId-class |
| `hooks/task-completed-enrichment.ts:137` | `main` | `input.taskId` (referenced line 123) | taskId-class |
| `bridge/handlers/grade-semantic-intent-contract.ts:53` | `gradeSemanticIntentContractHandler` | `sic.contractId` — already IN the payload (line 61) | 2026-07-10 re-audit; contractId-class, same SIC-grading purpose as wave-1/2's `pm-semantic-intent-gate.ts` stamps but a different handler, so not proven-identical (deferred, not stamped) |
| `hooks/pre-edit-impact-mcp-first.ts:461` | `preEditImpactMcpFirst` | `optOutEnvelope.promptId` — already IN the payload (line 466) | 2026-07-10 re-audit; promptId-class, `optOutEnvelope` is declared once (line 457) before all 4 emit sites in this function |
| `hooks/pre-edit-impact-mcp-first.ts:488` | `preEditImpactMcpFirst` | `optOutEnvelope.promptId` (in scope, not yet used at this branch) | 2026-07-10 re-audit; same function/identifier as :461 |
| `hooks/pre-edit-impact-mcp-first.ts:533` | `preEditImpactMcpFirst` | `optOutEnvelope.promptId` (in scope, not yet used at this branch) | 2026-07-10 re-audit; same function/identifier as :461 |
| `hooks/pre-edit-impact-mcp-first.ts:581` | `preEditImpactMcpFirst` | `optOutEnvelope.promptId` (in scope, not yet used at this branch) | 2026-07-10 re-audit; same function/identifier as :461 |
| `hooks/pre-compact-state.ts:128` | `preCompactState` | `frozenCapsule.capsuleId` — already IN the payload (line 133) | 2026-07-10 re-audit; capsuleId-class, `frozenCapsule` from `freezeActiveContextCapsule()` at line 125 |
| `hooks/subagent-start.ts:336` | `subagentStart` | `p.task_id` (function param, used elsewhere in this fn at line 438) | 2026-07-10 re-audit; taskId-class, same function as :429 |
| `hooks/subagent-start.ts:372` | `subagentStart` | `p.task_id` (function param) | 2026-07-10 re-audit; taskId-class, same function as :429 |
| `hooks/subagent-start.ts:429` | `subagentStart` | `p.task_id` — already IN the payload (line 438) | 2026-07-10 re-audit; taskId-class |
| `hooks/gates/prompt-dtc-enforcement-gate.impl.ts:1296` | `promptDtcEnforcementGateImpl` | `fdeSkip.envelope?.promptId` — already IN the payload (line 1305) | 2026-07-10 re-audit; promptId-class |

**`stampable-now-deferred` (2)** — see §Recommendation:

| Site | Enclosing function | Candidate | Why deferred instead of stamped |
|---|---|---|---|
| `lib/actions/commit.ts:185` | `commitEdits` | `req.actionTypeRid` (function param) | Identical value/purpose to `commit-edits.ts`'s 3 already-stamped sibling checkpoints (self-correlation bookkeeping only — this specific event is the F4 fail-closed refusal, which by definition has no `edit_committed` sibling since the commit never happens), but it is a DIFFERENT function outside the wave-1/2 audited 3 files, so not "proven identical" under this wave's cap. Also directly relevant to §(b) below. |
| `bridge/handlers/propagation-audit-backward.ts:303` | `propagationAuditBackward` (default export) | `args.seedEventId` (a real `eventId`, not a contract/prompt ref; function param) | This is the FIRST unstamped site found where the in-scope candidate is the CORRECT identifier class for the engine's exact-match eventId join, not merely another contract/prompt ref. High confidence, but it is a new pattern (not a proven-identical sibling of an existing stamp) and touches a component (`propagationAuditBackward`) not audited in waves 1/2 — held for explicit Lead sign-off rather than silently expanding scope. |

**`standalone-advisory` (57, post-re-audit)** — full path:line list (grouped by
file). Two sites (marked `[+]`) moved IN from `needs-context-plumbing` this pass;
see §Re-audit:

```
scripts/cross-project-audit.ts:327
hooks/agent-ownership-validate.ts:185,248,279,312,360
hooks/rule-audit/mode-bottleneck.ts:23
hooks/ontology-domain-classification-validate.ts:167,269
hooks/lead-ontology-discovery-completeness.ts:317,398
hooks/gates/ontology-engineering-workflow-enforcement-gate.impl.ts:463[+],622
bridge/handlers/propagation-audit-forward.ts:214
hooks/manifest-validate.ts:92,108
hooks/ontology-import-guard.ts:149
hooks/value-grade-assigner.ts:202,466,521,584,765
bridge/handlers/pm-rule-query/resolve.ts:106
hooks/write-scope-runtime-enforce.ts:246,344,444
hooks/impact-graph-session-end-flush.ts:142
scripts/archive-t0-events.ts:173
hooks/post-merge-cleanup.ts:116
hooks/researcher-citation-precision.ts:187
hooks/semantic-frontmatter-validate.ts:67
hooks/prompt-front-door-capture.ts:305
hooks/impact-graph-bulk-refresh.ts:150
hooks/ontology-drift-fold.ts:78,103
hooks/bypass-budget-monitor.ts:125
lib/codex/codex-hook-adapter.ts:653,689
hooks/impact-graph-cascade-delete.ts:149
hooks/t3-circuit-feeder.ts:207
bridge/mcp-server.ts:944
bridge/handlers/pm-health-audit.ts:140
hooks/t4-promotion-trigger.ts:82,116,149   (promotion-engine's own meta-events — must not be stamped)
hooks/generated-header-check.ts:69
hooks/prompt-fde-readiness-advisory.ts:56
bridge/handlers/pm-research-citation-validate.ts:403
hooks/impact-graph-maintain.ts:166
hooks/events-5d-gate.ts:107
bridge/handlers/validate-substrate-firing.ts:199
bridge/handlers/pm-handler-usage-audit.ts:250
hooks/gates/prompt-dtc-enforcement-gate.impl.ts:1193[+]
bridge/handlers/propagation-chain-health.ts:377
hooks/second-brain-fold.ts:178
bridge/handlers/pm-plugin-self-check/check-hooks.ts:191
lib/runtime-overlay/schema-resolve.ts:156
```

Sites carrying a self-referential `eventId`/envelope-id field that is NOT a
genuine sibling-correlation candidate (worth flagging explicitly since they read
similarly to the `stampable-now-deferred` `seedEventId` case but are NOT the same
shape): `hooks/value-grade-assigner.ts:466,521,584` (`originalEnvelopeId`/`envelopeId`
= the id of the SAME envelope currently being value-graded — meta-instrumentation
about this gate's own decision on the current tool call, not a reference to a
distinct prior source event; stamping it would risk the same circular/
self-referential promotion the doc already calls out for
`hooks/t4-promotion-trigger.ts`), `hooks/t3-circuit-feeder.ts:207` (`eventId` = the
T3 envelope being routed, and the payload shape is deliberately constrained to
`{ phase, passed, errorClass? }` per its own rule-10 §5-dim comment), and
`bridge/handlers/propagation-chain-health.ts:377` /
`bridge/handlers/propagation-audit-forward.ts:214` (`auditId`/loop-scoped
`seedEventId` — self-generated ids for the CURRENT audit run's own output, out of
scope by the time the summary emit fires; both are named examples of the
"self-contained periodic audit" class in §Taxonomy above).

### Re-audit (2026-07-10, Lead rulings RP1-RP2)

A verifier pass sampled 8 of the 97 rows and found 2 wrong: both cited an
identifier that belongs to a DIFFERENT function than the one the emit call
actually lives in. That 2/8 error rate invalidated trust in the whole table, so
all 72 unstamped rows were re-derived against the evidence standard in §Method
above (name the enclosing function; ground the category only in what that
function — or a named plumbing path through its callers — actually has in
scope). Method: automated enclosing-function detection + payload-scoped
identifier extraction for every row, with manual read-through of every row that
produced a hit, plus manual read-through of the two originally-flagged sites and
every row bordering an ambiguous case (self-referential eventId fields). Result:
12 of the 72 rows changed bucket; the other 60 were confirmed accurate as-is
(three of those — `prompt-dtc-enforcement-gate.impl.ts:1109`,
`context-capsule.ts:271`, `task-completed-enrichment.ts:137` — already had a
correct evidence claim in the original pass, now with the enclosing function name
added per the standard).

**The 2 confirmed-wrong sites (reclassified `needs-context-plumbing` →
`standalone-advisory`):**

- `hooks/gates/ontology-engineering-workflow-enforcement-gate.impl.ts:463` — the
  emit lives in `deny(reason, additionalContext, errorClass, payload)`.
  `approvedAtPromptId` belongs to `computeSourceMutationFastPath` (a different,
  earlier-in-file async function) and is never passed to `deny()`. `deny()` has
  two call sites, both inside `assessOntologyEngineeringWorkflowHook` (lines 573,
  657); neither call happens after a source-mutation approval was found (the
  branch at 657 fires specifically when `sourceMutationFastPath?.authorized` is
  NOT `true`), so there is no plumbing path from either caller either — the
  approval-record's promptId only exists on the SUCCESS path, which never reaches
  `deny()`. `deny()`'s own DENY event validates the CURRENT tool call being
  blocked (a PreToolUse `decision: "block"` verdict) — matches
  `standalone-advisory`.
- `hooks/gates/prompt-dtc-enforcement-gate.impl.ts:1193` — the emit lives in
  `emitOffBypass(payload, projectRoot, mutating)`. `assessment.governanceDecision.decisionId`
  belongs to `emitGateAssessment` (a sibling function) and is never passed to
  `emitOffBypass()`. `emitOffBypass()`'s three call sites (lines 1275, 1283, 1288,
  all inside `promptDtcEnforcementGateImpl`) all fire BEFORE any envelope/
  assessment is read (mode="off", bypass env var, or mode="off" again) — no
  caller in scope at any of the three call sites holds a decisionId, promptId, or
  contractId. This event records that the gate was bypassed for the CURRENT tool
  call before any assessment ran — matches `standalone-advisory`.

**The 10 sites reclassified `standalone-advisory` → `needs-context-plumbing`**
(each has a contract/prompt/task/capsule-class identifier genuinely reachable in
its own enclosing function — several already appear in that same emit's payload,
just not as `lineageRefs`): `bridge/handlers/grade-semantic-intent-contract.ts:53`,
`hooks/pre-edit-impact-mcp-first.ts:461,488,533,581`, `hooks/pre-compact-state.ts:128`,
`hooks/subagent-start.ts:336,372,429`, `hooks/gates/prompt-dtc-enforcement-gate.impl.ts:1296`.
Full evidence for each is in the `needs-context-plumbing` table above. None of
these is stamped this pass — RP3 scopes this re-audit to the census doc only; a
mechanical stamping pass (like the 2 `stampable-now-deferred` sites) is wave-4
scope.

**Sites checked and confirmed to have NO reachable candidate despite a
surface-level eventId-shaped field** (stayed `standalone-advisory`; reasoning
inlined at the end of the `standalone-advisory` list above):
`hooks/value-grade-assigner.ts:466,521,584`, `hooks/t3-circuit-feeder.ts:207`,
`bridge/handlers/propagation-chain-health.ts:377`,
`bridge/handlers/propagation-audit-forward.ts:214`,
`scripts/archive-t0-events.ts:173` (loop-scoped `eventId`, out of scope by the
emit call after the loop), `bridge/mcp-server.ts:944` (`hostSessionId()` is the
envelope's own 5-dim `sessionId` field, not a payload-embedded correlation
candidate).

### Recommendation on the 2 `stampable-now-deferred` sites

Neither was stamped this wave. Per this wave's LOCKED scope, mechanical stamping is
capped at sites "trivially identical to an already-stamped sibling pattern (same
function, same available rid context)" — a bar neither site clears with full
confidence (see table above). Both are strong, well-reasoned candidates for a wave-4
mechanical pass; flagging here rather than guessing keeps this wave's diff footprint
to the proven, reviewed fix in §(c).

---

## (b) Design note — `lib/actions/commit.ts`'s `edit_committed` when-ordering gap

### The problem (confirmed, not new — restates wave-2 fix-round-1's finding with the
### commit.ts side now examined directly)

`bridge/handlers/commit-edits.ts`'s three pre-flight checkpoints
(`contract_self_attested` / `dry_run_auto_computed` / `dry_run_auto_skip`) all fire
**before** `commitEdits()` is called (they gate whether to even attempt the commit).
`lib/actions/commit.ts`'s `baseLineage()` stamps no `lineageRefs` at all on the
`edit_committed` envelope it appends on success. Two independent facts combine to make
the correlation-rid join structurally impossible for this pair as things stand:

1. **No stamp on the source.** `edit_committed` carries no `lineageRefs.actionRid`, so
   `ridJoins()`'s `if (!sourceRid || !validationRid) return false` short-circuits
   immediately even before ordering is considered.
2. **Wrong ordering even if stamped.** The engine's join requires
   `source.when <= validation.when` — the SOURCE must precede the VALIDATION. The three
   checkpoints' `when` values are, by construction, always earlier than `edit_committed`'s
   `when` (they run first, in the SAME `commit_edits` invocation, before the commit
   itself happens). If `edit_committed` were naively stamped with
   `lineageRefs.actionRid = actionTypeRid` (matching the checkpoints' existing stamp),
   the checkpoints would need to be treated as SOURCE and `edit_committed` as VALIDATION
   for the ordering to work — but semantically it is `edit_committed` that represents the
   T1 "decision" and the checkpoints that represent "evidence", the reverse of what the
   `when` values allow.

### Option 1 — Deferred/post-commit checkpoint (RECOMMENDED)

Stamp `lineageRefs.actionRid = actionTypeRid` on `edit_committed` in
`lib/actions/commit.ts`'s `baseLineage()`-derived envelope (purely additive, mirrors
the already-accepted `commit-edits.ts` pattern — same rid, same field, zero new event
types). Then add exactly ONE new post-commit checkpoint, emitted by
`bridge/handlers/commit-edits.ts` immediately AFTER `commitEdits()` returns
`committed: true` (e.g. `errorClass: "commit_confirmed"`, `passed: true`), carrying the
SAME `lineageRefs.actionRid = actionTypeRid`. Because this new checkpoint's `when` is
necessarily later than `edit_committed`'s `when` (it can only run after `commitEdits()`
returns), the ordering requirement is satisfied for free, and the correlation-rid join
fires: `edit_committed` (source, T1) ↔ `commit_confirmed` (validation, evidence) → T1→T2.

- **Tradeoff**: +1 emit call per successful commit (event-volume cost, but consistent
  with the existing 3-checkpoint budget for pre-flight); the new checkpoint needs the
  wave-3 §(c) incidental-sibling filter's `INCIDENTAL_SIBLING_ERROR_CLASSES` set
  EXTENDED with `"commit_confirmed"` (or a semantically distinct name kept OUT of that
  set, deliberately, since — unlike the 3 pre-flight siblings — this one closes a real
  T1→T2 gap and SHOULD count as evidence).
- Requires no change to `ridJoins()`'s ordering rule or any other join semantics — the
  fix is purely additive data (a new, correctly-time-ordered event), not a rule change.

### Option 2 — Re-target the existing checkpoints at the upstream decision

Instead of trying to pair the 3 pre-flight checkpoints with `edit_committed` at all,
re-stamp them with the rid of whatever UPSTREAM decision authorized the commit (e.g.
the SIC/DTC `contractId` from `pm_semantic_intent_gate`, which chronologically
precedes `commit_edits`), rather than `actionTypeRid`. This would let the checkpoints
serve as evidence for an EARLIER T1 event that already has correct time-ordering.

- **Tradeoff**: does not solve `edit_committed`'s own promotion gap at all — only helps
  the checkpoints themselves reach T2. Also re-purposes the `actionTypeRid` stamp,
  contradicting its currently-documented, already-accepted "correlates these three
  checkpoints with each other" meaning (bookkeeping semantics change, would need a
  fresh round of review of the wave-2 comments). Weaker fix for more churn.

### Option 3 — Relax the join's when-ordering for this flow

Keep the checkpoints exactly as-is (unable to forward-reference a not-yet-existing
future event) and instead loosen `ridJoins()`'s `source.when <= validation.when`
requirement with a bounded grace window, so a validation event emitted moments BEFORE
its source can still count.

- **Tradeoff**: this is a change to the ENGINE'S join semantics, not additive data —
  it would apply to every correlation-rid join in the system, not just this flow,
  and reopens exactly the kind of spurious-pairing risk the strict ordering rule
  exists to prevent (an unrelated validation authored minutes earlier that happens to
  later share a rid with a genuine source). **Not recommended** — this is the kind of
  "changes what counts as a legitimate promotion" semantic change wave 3's scope
  explicitly says to avoid.

### Recommendation

**Option 1** (deferred/post-commit checkpoint). It is purely additive (new stamp +
new event, matching the existing accepted pattern), does not touch join semantics,
and directly closes the exact gap wave-2's fix-round-1 commit message named as
"a deferred design decision (new post-commit checkpoint + commit.ts stamp), not
addressed here." No code change is made in this wave — this is a design note only,
per this wave's LOCKED scope.

---

## (c) Incidental self-attest / dry-run sibling promotion filter

Implemented in `scripts/replay-promote-grades.ts` (see CHANGELOG 7.41.0 entry) and
locked by `tests/scripts/replay-promote-grades-linkage-wave3.test.ts` (5 tests). Summary:
`ridJoins()` now refuses to treat a VALIDATION-side event as evidence when its
`payload.errorClass` is one of `contract_self_attested` / `dry_run_auto_computed` /
`dry_run_auto_skip` (the three `commit-edits.ts` pre-flight sibling checkpoints) —
these rows were explicitly documented in wave 2 as "accepted audit-trail bookkeeping
among pre-flight checks — not a stand-in for edit_committed's own promotion," but
before this fix they COULD still incidentally function as promotion evidence via the
correlation-rid join because they legitimately share `lineageRefs.actionRid` with each
other. The filter checks only the validation side, so a sibling checkpoint used as the
SOURCE side is unaffected and can still be legitimately promoted by a genuine,
non-sibling validation elsewhere — this is a behavior-preserving suppression of a
proven-spurious evidence path, not a redefinition of what counts as a legitimate
promotion.
