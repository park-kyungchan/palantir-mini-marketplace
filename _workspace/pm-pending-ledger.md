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

### Follow-ups from P5 gate-slim (merged #168) — deferred, not OPEN

| id | title | gate (the blocker) | unblocks-when | source |
|----|-------|--------------------|---------------|--------|
| F-gate-dedup-B | full cross-surface decisionSpec dedup (Option B) | needs emit-boundary plumbing + a `fillResult` cross-view byte-identity rescope (not just the gate-projection sites Option A already covered) | project `fillResult.contract.clarificationQuestions` + `draftContracts.semanticIntent.clarificationQuestions` to `{decisionRef}` via emit-boundary shallow copies → turn view ~3KB→~1KB | harness-upstream/_workspace/2026-06-15-pm-frontdoor-gate-improvement edit-spec doc |
| F-gate-overflow-gc | age-out GC for `<project>/.palantir-mini/mcp-response-overflow/` (R2) | P1 writes one overflow file per gate turn with **no cleanup**; needs an age-out GC pass | an age-out GC for the `mcp-response-overflow/` dir is built (aligns with B10-9 GATED "overflow dumps ~1.3M") | this session (P1 overflow→fullPath relocation, #168) |

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
