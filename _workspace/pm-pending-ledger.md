# pm-pending-ledger — the ONE canonical pm pending-work SSoT

> This file is **the ONE canonical pm pending-work SSoT**. Before any pm backlog session read
> **THIS file + memory `pm-current-state`**. Do **NOT** re-sweep `_workspace` dirs (consolidated
> here 2026-06-12 then deleted). Counts/SHAs/versions are **POINTERS** — verify live
> (`plugins/palantir-mini/.claude-plugin/plugin.json`, memory `pm-current-state`, `git`).

---

## STATE (pointer, not pin)

- **plugin version** → `plugins/palantir-mini/.claude-plugin/plugin.json` (was **v7.9.0** @ 2026-06-12)
- **backlog W1–W10** → **COMPLETE** (memory `pm-current-state`, 2026-06-11)
- **suite baseline** → **0-fail** (verify live; `bun test` from plugin root)
- **Codex runtime lane** → **HOLD** ("일단"; user directive 2026-06-10) — twins/tests untouchable
- **understand-heart (9-axis FDE → SIC)** → **SACRED**, never reduce

---

## OPEN  (live, actionable now — Claude + pm lane only; all LOW priority)

| id | title | summary | lane | acceptance | source |
|----|-------|---------|------|------------|--------|
| P1 | twin list-ish fields typed `string` | several self-ontology twins declare list-ish fields as `string`; **dataType normalization** is a twin SOURCE edit. Low priority. | pm-off | twin source fields normalized off `string` for list-ish props; registration test green | pm-current-state §Follow-up (a); tracking-dedup-plan §A-OPEN |
| P2 | doc-deprecation note on legacy forwardProp/backwardProp | once **uq-persist (SQLite lane) is formally killed or built**, add the deprecation note; the SQLite writer is `lib/impact-graph/sqlite-cache.deprecated.ts` (do not import live). | pm-off | deprecation note added; gated on uq-persist kill/build decision | pm-current-state §Follow-up (c); W1 settled-as-option-b |
| P3 | agent seeds declare `model:"sonnet"` vs opus-only policy | `seeds/agent-definitions.ts` seeds `implementer/hook-builder/plugin-maintainer/protocol-designer/project-implementer` as `model:"sonnet"`, but harness policy (MEMORY `subagent-model-policy-opus-only`) is **opus-only**. A policy-vs-seed **drift**, modernize candidate. **Deferred from B10-8** (not a removed-surface; do NOT bundle into a deletion PR). | pm-off | seed model fields aligned to opus-only policy; self-check advisory clean | b10-8 proposal SURFACE 2 / Agents |
| P4 | stale MANIFEST.json hash for `src/generated/rule-registry.ts` | trivial cosmetic — stale generated-manifest hash; ungated. | pm-off | MANIFEST.json hash re-synced for the file | tracking-dedup-plan §A (trivial/cosmetic) |

> NOTE: P1–P4 are all LOW. If the user considers any not-worth-tracking, that row may be
> dropped. Surface at do-time.

---

## GATED  (real work, blocked on a named condition)

| id | title | gate (the blocker) | unblocks-when | source |
|----|-------|--------------------|---------------|--------|
| G-CODEX-TWIN | Codex adapter twin build / parity | §0 **Codex HOLD** (user 2026-06-10) — Codex twins/tests untouchable | user lifts the Codex HOLD | backlog-completion §RESOLVED/DROPPED; altitude2 §4. **NOTE:** the 4 Codex Prompt-to-DTC e2e tests + golden CODEX-PARITY-GAP were **DELETED 2026-06-12** per user, so "un-skip" is no longer tracked. |
| G-B10-8-DELETE | ~13 removed-tool MCP handler `.ts` files + their `self/functions.ts` `FUNCTION_INSTANCES` seed rows + tests (set **B** in b10-8 proposal) | **DELETION_READINESS** — the whole plugin tree is a pm PROTECTED_SURFACE; the gate refuses all physical deletion while Codex runtime evidence is source-only | a **live-runtime** Codex reinstall/reload/restart smoke ref (non `tests/`) is recorded | b10-8 proposal SURFACE 1 / set B |
| G-A5 | `sqlite-cache.deprecated` → convex swap | **BLOCKED** — `convex-client` is stub-only (returns empty) | re-scope: **(a)** keep SQLite + rename off `.deprecated`, OR **(b)** un-stub convex then make registry-loader async + migrate 3 callers | tracking-dedup-plan / W1 SQLite lane |
| G-A6 | 11 orphan removed-tool handler `.ts` | **DELETION_READINESS** (same gate as G-B10-8-DELETE) | same as G-B10-8-DELETE (live-runtime Codex smoke ref) | b10-8 proposal SURFACE 1 |
| G-B10-9 | accumulated-data **CLEANUP** (snapshot trim / quarantine dedup / outcome-pairs filter) | **analysis DONE 2026-06-12** (read-only); substrate is live (written by other sessions) — re-pin before any prune | a **confirmed prune pass** is run under explicit go (see B10-9 block below for the GATED disk targets + BackwardProp candidates) | tracking-dedup-plan / data-cleanup lane; report at artifacts/b10-9-bottleneck-report.md |

---

## B10-9 — accumulated-data analysis (2026-06-12)

Read-only substrate analysis (pm-off lane) is **DONE**. Headline correction: the "49,239
quarantine rejects" was mostly a **re-scan illusion** — 6 distinct poison lines re-scanned
~3,753× each. Real defects = **3 classes only**. Full analysis (pinned):
**harness-upstream/_workspace/2026-06-12-pm-cleanup-campaign/artifacts/b10-9-bottleneck-report.md**
(pin: home events.jsonl **12,181 lines @ seq 181206**, 2026-06-11T15:59:08Z).

### OPEN — BackwardProp fix CANDIDATES (actionable pm-source, pm-off lane; *candidate — verify before fixing*)

| id | candidate fix | why (evidence) |
|----|---------------|----------------|
| D1 | quarantine-and-skip — stop re-scanning the 6 poison lines | re-scan loop re-detects/re-appends same 6 lines ~3,753× each → inflates the 49k count; record once (sourceFile+line+hash) |
| D2 | protect events.jsonl from git + enforce atomic append (rule 27) | git conflict markers found INSIDE events.jsonl (3 lines) + two events glued on one line (non-atomic append) |
| D3 | route codex_lock_probe out of the 5-dim valueGrade gate | infra heartbeats (2 lines) wrongly routed through strict gate; gate fires correctly, routing is wrong |
| D4 | apply rule-05 write-to-file contract to pm_ontology_engineering_workflow | 11/14 overflow dumps from this tool = the rule-05 StructuredOutput-loop signature |
| D5 | gate outcome-pair emission on a real delta | ~99% of 22,709 outcome-pairs are empty zero-delta self-pairs (baseline==refined && score==-1) |
| D6 | fix validation_phase_completed over-emission + wire-or-retire propagationDepth | 74.4% of live log is vpc monitor noise; propagationDepth unused (0/12,181 events) |

### GATED — deferred disk cleanup (substrate is LIVE; re-pin before any prune pass)

| target | reclaim | note |
|--------|---------|------|
| snapshot rotation | ~149M | palantir-math 89M + smartall 60M, no rotation = #1 byte cost |
| quarantine row dedup | ~14M | 22,518 rows collapse to 6 poison lines |
| outcome-pairs value-filter | ~22.5k files | drop empty self-pairs (file-count cost, modest bytes) |
| overflow dumps | ~1.3M | age-out mcp-response-overflow/ dumps |
| T0 emit-gate leaks | — (quality) | hyperframes 11, palantir-math 2 — fix upstream emitter, not a disk item |

---

## DONE-ARCHIVE  (one-line closure pointers — NOT re-openable; detail in git history + rule-29 archive `reference/fable5-workflows/runs/`)

- **W1–W10 backlog** (typed-graph canonical lane, G12 137 Property prims, rule29 1.1.0, hook-coalesce no-op'd by user, W7 peerdep, F7 Korean-imperative lexicon) → DONE @ ~v7.6.0–7.7.0 (#153/#154).
- **Governed Q3 AI-derived-axes user-approval write-path** (confirm-draft) → BUILT @ v7.9.0 (#155/#156/#157).
- **M-SELF self-Ontology buildout** (30 ObjectType/33 LinkType/21 ActionType/76 Function/…) → COMPLETE, DoD **4/4** (#117–#125); FDE 0.844 PASS.
- **Altitude-2 acceptance (I-8)** + PR-I bindings → CLOSED (#145–#152).
- **Legacy-audit D3** (emit_event fan-out) / **D4** (dead-hook removal) → shipped **#144**.
- **Legacy-audit D1** (schema Phase-2) → partly **#143**.
- **Legacy-audit D5** (M-SELF reconcile) → **PR-F** shipped.
- **Legacy-audit D6** (ceremony/1b) → folded into PR-E/E2.
- **D2 (Chatbot Studio rename) → DROPPED ENTIRELY** — direction was BACKWARDS; pm's "Chatbot Studio" naming is already current ("Agent Studio" is the DEPRECATED name). Do NOT re-litigate.
- **2026-06-12 campaign:** Codex prompt-to-DTC deadweight removed; A-#3/#4 done; B10-8 schemas modernized (skill seed re-sync); tracking consolidated into THIS ledger.
- **OE-2 elevate-readiness dead-gate** — `readyForDigitalTwin` structurally always-false (all profiles `allowsDtcDraft:false`) made `register` unreachable; repaired @ **7.17.0** via `sicBackedDigitalTwinReady` (minted approved-SIC + ingested candidates, OR'd, handler-sourced never MCP-input), anti-fabrication preserved, suite green.
- **P5 gate token-bloat reduction (P1+P3+P4)** → MERGED **PR #168** (commits 7771693+489a667, squash 7b66e28; plugin **7.18.0**); per-turn ~12KB→~3KB via additive `responseView:"turn"|"readiness"` (default slim) + overflow→fullPath relocation; criterion-4 rescoped to the gate-projection sites (**Option A**, user decision); rule-04 review found no blockers (semantics/mutationAuthorized/continuity/R5 preserved). Follow-ups F-gate-dedup-B (Option B full dedup) + F-gate-overflow-gc (R2 overflow GC) logged under GATED.
- **F-gate-dedup-B + F-gate-overflow-gc** → MERGED **PR #169** (squash `e7e602a`, plugin **7.19.0**); quality-safe `decisionSpec` dedup (~8KB, turn ~35KB→~27KB, no live substance relocated) + lazy overflow-dir age-out GC. Aggressive ~3KB sparse view rejected on quality grounds (would strip live Altitude-1/2 ontology context).

---

## Per-turn context-decision fixes (from harness-upstream §9 audit) — 2026-06-20

- **STATUS = QUEUED.**
- **BLOCKED-ON** = the in-progress **harness-upstream self-MetaOptimization session** must complete before any pm CODE work starts. Do not open a pm code lane until that session lands.
- **Source (pointer, not copy — bind before do-time; do NOT inline the bodies):**
  - Audit (§6 = the 3 specs): `harness-upstream/_workspace/2026-06-20-pm-frontdoor-design-prior-injection-gap/artifacts/2026-06-20-per-turn-context-decision-audit.md`
  - Case library: `harness-upstream/reference/harness-bottlenecks/cases/` → **bd-001** (design-prior not surfaced), **bd-002** (footer keyed to prompt text), **bd-003** (protected-surface over-block keyed to vocabulary)
  - Handoff: `/home/palantirkc/harness-upstream/_workspace/2026-06-20-pm-frontdoor-design-prior-injection-gap/HANDOFF.md`

> **RUNTIME-DRIFT (re-pin before any fix):** running cache **7.21.0 @ 8a58976**; source HEAD is **AHEAD (cc5ff475)**. Any fix here bumps `plugin.json` + syncs the cache + re-confirms what executes via `installed_plugins.json` / `pm_plugin_self_check` (`runtimeIdentity.version`) — never trust source over the running cache copy.

| id | title | readiness | locus (pointer — verify live before edit) | fix direction |
|----|-------|-----------|--------------------------------------------|---------------|
| CTX-B | required response footer keyed to prompt **TEXT** not **STATE** | **READY** | `lib/ontology-engineering-response-template.ts:271-277` (+ alias `:712-713`); callers `hooks/stop-validate.ts:52`, `bridge/handlers/pm-workflow-response-validate.ts:40-49`, `hooks/prompt-front-door-capture.ts:224-231` | thread front-door **auth STATE** into the predicate; decide on STATE first, treat text markers as a recall hint only |
| CTX-iii | protected-surface **over-block** keyed to command/prompt/content **vocabulary** not **write-target** | **READY** | `hooks/ontology-engineering-workflow-enforcement-gate.ts:207-224,226-229,243-267,492-494` | introduce the sibling **write-target resolver** (`write-scope-runtime-enforce.ts:106-125`); drop `String.includes` over command/prompt/intent/content from the block decision |
| CTX-1 | design-prior **not surfaced** + **single-choice** framing | **NEEDS-DISCOVERY** | fork (a) build per-turn prior-ranking, vs (b) extend `TurnCardDecisionSpec` (`turn-card-decision-spec.ts:31-44`) with relational/cardinality/TYPE-GAP-defer; likely **both** | escalate as a **design decision**. **Schema-versioning rule 08 applies to (b)** (semver bump + CHANGELOG + generated-header gate) |

> CTX-B and CTX-iii are READY (spec-complete, mechanical). CTX-1 is NEEDS-DISCOVERY — do NOT start it as a code edit; resolve the (a)/(b) fork as a design decision first (rule 08 gates path (b)). All three remain BLOCKED-ON the harness-upstream session above.

---

## Altitude-2 drift-fold re-bind (harness-upstream Wave-6 Task 1.2) — 2026-06-21

- **DONE — pm 7.22.2 SHIPPED** (PR **#177**, merge `6e35a6e`, plugin **7.22.2**): the `rebind_registered` capability for the Altitude-2 drift-fold re-bind. **Part A** (`lib/ontology-engineering-workflow/register-accepted.ts` `reElevateAlreadyRegistered` flag → re-emit identical declaration; default byte-identical), **Part B** (`lib/event-log/read/fold-snapshot.ts` dedup-by-FULL-rid latest-wins; provable no-op on dup-free data so grammar counts never inflate), **Part C** (new **direct-caller** action `rebind_registered` + `handleRegisterRebind`; fail-closed `rebindRids ∩ live getOntology snapshot`, distinct invalidReason, reuses commitEditsHandler verbatim + handleRegister's approved&&graded gate). Builds on the merged zero-new-term-rebind gate cascade (7.22.0 #175 / 7.22.1 #176). 11 unit/handler tests + 1 e2e green; 0 NEW tsc errors. **The drift-fold register LOGIC is complete + tested + runtime-live.**
- **DEFERRED — live 13-rid re-bind NOT driven** (user decision 2026-06-21): in a FRESH session, ontology-mutating dispatch hit pm's full per-prompt Altitude-1 governance wall — approved SIC + DTC are persisted, but this session's prompt-envelope→`digital_twin_approved` + `mutationAuthorized` (work-contract + decision-record) were not re-established; the Agent dispatch was hard-blocked. No bypass (forbidden). The 13 harness-upstream primitives stay lineage-stale at `atopWhich=def3d440`.
- **NEW pm follow-up (operability gap) — STATUS QUEUED:** `rebind_registered` is direct-caller (NOT MCP-exposed, like register/ingest/lint) AND has **no streamlined governed trigger**; a fresh session must re-run the full Altitude-1 ceremony to drive it. Proposed: a composed GOVERNED flow (like `elevate`) — e.g. `drift_rebind` — that, given a verified re-bind rid set + the persisted approved SIC/DTC, advances the gate AND drives `rebind_registered` in ONE governed MCP call; or a resume helper that re-binds a persisted approved SIC/DTC to the current prompt envelope. (Operability lesson, NOT a surface-text-vs-state case.)
- **NEW evidence for CTX-iii / bd-003 — broaden the fix scope:** the vocabulary-keyed over-block RECURRED on a **memory-note Write** (outside the project) via the **FDE-provenance / SIC-authoring** gate, not just the `:207-224` protected-surface gate. The CTX-iii write-target-resolver fix must also cover that sibling gate. Evidence line appended to `harness-upstream/reference/harness-bottlenecks/cases/bd-003-protected-surface-overblock-keyed-to-vocabulary.md` (## RECURRENCE).

---

## Bottleneck-improvement follow-ups — 2026-06-21

- **DONE — pm 7.22.3 SHIPPED** (PR #179, merge `fca23f6`): surface-text-vs-state gate bundle. **CTX-B** (response-template footer → STATE-first) and **CTX-iii** (enforcement-gate write-target resolver, incl. resolved-Bash-write-target extraction `03c181d` that closes the protected pm-source Bash-write vector) from the 2026-06-20 CTX queue are now LANDED, plus **cluster A** (tool-classifier denylist-wins). 0 NEW tsc; adversarial + whole-Altitude e2e verified (caught + closed a Bash-write under-block regression mid-flight). Also DONE: **C** version-sync assertion + CI tsc gate + marketplace.json resync (PR #180); **G-leak** `*:Zone.Identifier` ADS deleted (harness-upstream; 1 leaked a claude.ai UUID, never committed).
- **STILL QUEUED** (verified 2026-06-21; evidence: `harness-upstream/_workspace/2026-06-21-bottleneck-cluster-verification/{A..H}-*.md`):
  - **E drift_rebind** — the composed GOVERNED flow to drive the deferred live 13-rid Altitude-2 register (resume persisted approved SIC/DTC → advance prompt-DTC + OE mutationAuthorized → `rebind_registered`, one fail-closed call). Already queued above; **recommended next substantive item**. The 13 stay stale at `atopWhich=def3d440`.
  - **D outcome-pairs degeneracy** (S) — ~96.8% of outcome-pairs are degenerate self-pairs (baseline==refined, score −1, instant-close). Fix: skip emitting a pair when `baseline==refined && score==−1` (or require a populated baseline + real score before close) in the outcome-pairing writer. Do NOT touch existing pairs (append-only). The events.jsonl pollution/size/sqlite sub-claims were REFUTED (log is clean: ~2.3M / ~1257 lines, 5-dim complete).
  - **A-secondary tool-classifier verbs** (S) — widen `lib/hooks/tool-classifier.ts` mutating denylist with pre-existing-gap write verbs NOT yet classified MUTATION: sponge, python/node writer scripts, `curl -o/-O`, wget, `gh api -X POST`/`gh release create`/`gh repo delete`, `git worktree add`/`config`/`update-ref`, `tar xf`, unzip, `kubectl apply`, `docker run`. Pre-existing (NOT a 7.22.3 regression); safe direction.
  - **C-followups** (S–M) — (a) add a **bun-test BLOCKING CI gate**: needs a known-failures-aware wrapper (parse `plugins/palantir-mini/tests/KNOWN_BROAD_SUITE_FAILURES.md`, fail on NEW) + clear the ~29-failure debt; (b) collapse the **3** redundant `marketplace.json` copies to one canonical; (c) plugin **README** `Current release: v6.79.0` line is stale (current 7.22.3) — narrative, deliberately excluded from the version-sync assertion; bump or remove.
  - **H label** (cosmetic) — `hooks/session-start.ts` (~:73) hardcodes a stale `"claude-opus-4-6"` event-label fallback; derive from `p.model` (reference-don't-pin). The 5 seeds `model:"sonnet"` vs opus-only is the existing **P3** (owner-gated; pm-plugin policy may legitimately differ).
  - **CTX-1** (NEEDS-DESIGN; already in the 2026-06-20 CTX queue) — design-prior injection + single-choice framing; resolve the (a) per-turn prior-ranking vs (b) extend `TurnCardDecisionSpec` fork as a design decision first (schema **rule 08** gates fork b). Do NOT patch.
- **Owner-decision (harness-upstream, not pm):** G-content — ~11.78MB committed marketing PNG + personal KakaoTalk screenshots + top-level debug/marketing HTML (commit `698705e` / PR #91) vs the "hosts no project content" invariant.
- **Full handoff:** `harness-upstream/_workspace/2026-06-21-bottleneck-cluster-verification/HANDOFF-remaining-backlog.md`.

---

## Bottleneck-cluster closure — 2026-06-21 (pm 7.22.4 + 7.23.0 shipped; verify live)

> Closure pass for the 2026-06-21 bottleneck track. Versions/SHAs/counts are POINTERS —
> verify live (`plugins/palantir-mini/.claude-plugin/plugin.json`, `git log`, CHANGELOG).

- **DONE — pm 7.22.4 SHIPPED** (PR #182): bottleneck bundle.
  - **D outcome-pairs degeneracy → RESOLVED.** Degenerate-pair skip guard added in **BOTH**
    write paths — `lib/outcome-pairing/track.ts` (the `writeClosedMarker` path) **and**
    `hooks/outcome-pair-tracker.ts` — so a pair is not emitted when `baseline==refined &&
    score==−1`. Existing pairs untouched (append-only).
  - **A-secondary tool-classifier verbs → RESOLVED.** Mutating denylist widened with the
    pre-existing-gap write verbs (sponge / curl -o / wget / gh api-mutate / gh release / gh repo
    / git worktree·config·update-ref / tar -x / unzip / kubectl / docker). **No blanket
    `python|node`** — the anti-over-block posture is preserved.
  - **H-label → RESOLVED.** Session-start now emits `p.model`; the stale `claude-opus-4-6`
    literal is dropped and `SessionStartedEnvelope.payload.model` is made optional
    (reference-don't-pin).
  - **P3 agent seeds → RESOLVED (done).** The 5 agent-definition seeds
    (`implementer`/`hook-builder`/`plugin-maintainer`/`protocol-designer`/`project-implementer`)
    flipped `model:"sonnet"` → `"opus"`, aligning with the opus-only policy. **The OPEN-table P3
    row is now closed by this entry.**
- **DONE — pm 7.23.0 SHIPPED** (PR #183): **E `drift_rebind`** — the composed GOVERNED RESUME
  action is built + merged. It re-binds a persisted **MINTED approved** SIC+DTC to the current
  prompt envelope, which drives the unchanged fail-closed `rebind_registered` (single commit
  boundary; **no** mint, **no** bypass, **no** new rid; emits a `drift_rebind_envelope_advanced`
  audit event). Passed adversarial governance + correctness review; also cleared a pre-existing
  executor-registration fingerprint drift. **→ The `rebind_registered` operability follow-up
  logged in the §"Altitude-2 drift-fold re-bind" section above (the "NEW pm follow-up
  (operability gap) — STATUS QUEUED" bullet) is now RESOLVED via `drift_rebind`.**
- **STILL OPEN after this closure:**
  - **LIVE 13-rid Altitude-2 register** — now a SINGLE `drift_rebind` MCP call once pm 7.23.0 is
    installed + ON. Preconditions verified present in `~/harness-upstream/.palantir-mini`
    (approved SIC `altitude-2-dynamic-drift-re-bind-re-elevate-atop` + approved DTC; the 13 rids
    = `get_ontology` ∩ SIC; `atopWhich` auto-stamped from git HEAD at commit). **Recommended next
    substantive item.**
  - **FULL pm MCP/Skill/Agent/Hook MetaOptimization RE-REVIEW** — user-directed, explicitly
    sequenced to run **AFTER** the live 13-rid register completes (user sequencing this session).
    Carry-forward observation for it: the tool-classifier over-blocks **read**-subcommand forms
    (e.g. `git config --get`, `git worktree list`) consistent with the file's PRE-EXISTING
    convention (`git tag` / `git stash` list forms already over-blocked) — a classifier-precision
    pass candidate, NOT fixed in 7.22.4 (surgical scope: 7.22.4 only widened the MUTATION
    denylist).
  - **C(a) bun-test CI gate → BLOCKED.** `plugins/palantir-mini/tests/KNOWN_BROAD_SUITE_FAILURES.md`
    (last refreshed 2026-05-11) is **doubly stale** at pm 7.23.0: ~14/15 listed entries now PASS,
    and **5** genuinely-failing test files are MISSING from it —
    `tests/docs/reload-per-runtime.test.ts` (doc drift: Codex-only vs Codex+Claude),
    `tests/lib/codex/palantir-mini-activation-policy.test.ts`,
    `tests/ontology/self/hook-registration.test.ts`,
    `tests/ontology/self/plugin-manifest-registration.test.ts` (expects 45 skills, got 44),
    `tests/ontology/self/skill-registration.test.ts`. These 5 are **PRE-EXISTING drift on pm
    main, NOT from this session.** Unblock path: refresh the ledger (drop now-green rows;
    triage/fix the 5 red files), THEN land the validated wrapper (JUnit-reporter based; known-set
    parsed by `tests/` path; NEW = failing − known) + a `package.json` `test:ci` script + a
    blocking step in `.github/workflows/palantir-mini-integrity.yml`.
  - **F giant-file split** — modular split of `pm-semantic-intent-gate.ts` (~3k) +
    `lib/lead-intent/contracts.ts` (~2.4k) deferred (cohesive/test-partitioned; `contracts.ts`
    fan-in ~54 + rule-08 exposure). Do when a relational-card change forces it.
  - **marketplace.json 3-copy collapse** — deferred (low value; root vs plugin copies serve
    different host-read paths; CI version-sync already keeps them consistent).
- **DONE elsewhere this session (cross-repo, recorded for completeness):**
  - **C(c)** marketplace README de-pinned (Current-release line → references `CHANGELOG.md`;
    PR #184).
  - **G-content** harness-upstream orphan removal (5 files) + the CTX-1 design-decision doc
    (harness-upstream PR #97); banners + `index/privacy.html` retained.
  - **KakaoTalk history purge** — 9 `KakaoTalk_20260619_*.jpg` purged from harness-upstream
    history (filter-repo + force-with-lease).
- **Full handoff:** `harness-upstream/_workspace/2026-06-21-bottleneck-cluster-verification/HANDOFF-remaining-backlog.md`.

---

## 2026-07-11 — pm 7.42.0 governance-gate gaps (P1 unification session evidence)

Session evidence: home session 814cfd8c (Lead) + marketplace M1b executor session. All four are pm-source defects in the prompt-front-door / prompt-DTC gate stack; lane pm-off unless noted.

| id | title | summary | acceptance | source |
|----|-------|---------|------------|--------|
| G-ENV-A | per-session/per-project envelope-store isolation | UserPromptSubmit capture writes ONLY the cwd-resolved project store, so (i) dispatched-subagent hook payloads cannot resolve the parent session's approved envelope and (ii) a multi-repo session has NO envelope in the second repo's lane (empirical: home lane captured, marketplace lane "No current prompt-front-door envelope is available" same turn). M1b workaround: SendMessage resume text is captured as a prompt envelope in the agent's cwd lane. Second empirical confirmation same day: a fresh home-session executor's Edit on an /ontology/ path-class test file hard-blocked with no envelope resolvable in the marketplace lane (see G-ENV-B interim unlock). | subagent/second-repo lanes resolve the parent session's envelope (cross-lane pointer or parent-session fallback), covered by a gate test | P1 unification session 2026-07-11; M1b implementer report §Governance store artifacts |
| G-ENV-B | A2 authorized-delivery lane unreachable on Claude-native harness | The documented re-issue lane (tool_input.userApprovalQuote/userApprovalPromptId/userApprovalPromptHash) is rejected by the Claude harness with InputValidationError (Bash schema additionalProperties:false) — extends the known Edit/Write continuity-fallback gap to ALL native tools; the A2 lane is dead code on the Claude runtime. Evidence: re-issued git call rejected pre-gate; bun -e verifyDeliveryApprovalAgainstEnvelope with identical values returned authorized:true (fresh, on-current-turn). Interim unlock: user turn carrying an explicit plugin opt-out marker. | a Claude-native-reachable authorization channel exists (e.g. turn-scoped pre-authorization persisted via a pm CLI/MCP tool that the PreToolUse gate consults) + gate test proving a Bash delivery call passes with it | g12 row de-2026-07-11-p1-h1b-m1b-shipment-deferred-one-turn |
| G-ENV-C | drift_rebind throws on already-approved envelope | drift_rebind throws when the envelope is already digital_twin_approved instead of no-op'ing the advance step (hit twice in M1b; recovered via Stage-06 + workflow turn). | drift_rebind is idempotent on approved envelopes; regression test | M1b implementer report deviation note 3(c) |
| G-CLS-D | delivery-classifier prose false-positive | A Bash command whose quoted ARGUMENT STRINGS contain delivery verbs (푸시/머지/push/merge) is classified as a delivery action even when the executable performs none (empirical: a decisions:emit governance-ledger append was hard-blocked until its prose arguments were neutralized). Related to the known read-subcommand over-blocking precision candidate. | classifier keys on executable/argv semantics, not raw substring scan of quoted argument prose; regression fixture with delivery verbs inside quoted args | home session 814cfd8c, 2026-07-11 |
