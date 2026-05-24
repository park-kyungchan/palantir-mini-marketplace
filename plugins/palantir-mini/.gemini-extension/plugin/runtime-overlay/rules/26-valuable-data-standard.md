---
ruleId: 26
slug: valuable-data-standard
scope: global
version: 1.3.0
invariant: "Every events.jsonl envelope is auto-graded T0-T4 across 5 axes (Contractual / Verifiable / Refining / Shareable / Memory-mapped); T0 rejected at emit, T2+ feeds outcome-pairing, T3+ feeds BackPropagation circuit; T4 reachable via D2-canonical (K≥2 vendors) OR D2-fallback (K=1 single-vendor-attested)."
supersededBy: null
supersedes: []
crossRefs: [10, 12, 16, 22]
hookCitations: [value-grade-assigner, outcome-pair-tracker, memory-layer-validator, briefing-template-validate]
bodyLocCeiling: 52
migrationWindowEndSprint: 62
---

# Rule 26 — Valuable Data Operating Standard
Anchors: Palantir "Connecting Agents to Decisions" blog (2026-04-29) — *"decision lineage ... continuously refine all forms of agentic memory (working / episodic / semantic / procedural)"*; AIPCon 9 / DevCon 5 §DC5-02 (3 conditions for human-agent leverage); AIP Evals 5-evaluator taxonomy; "Securing Agents in Production / Agentic Runtime 1" (2026-01-22 by @PalantirTech) for the 4-memory-categories verbatim source. Local mirror via W1.A SSoT-1 (2026-05-06): `~/.claude/research/palantir-foundry/aip/{blog-securing-agents-agentic-runtime-1-2026-01-22,aip-evals-overview-and-ontology-edits-2026-04-14}.md` + `~/.claude/research/palantir-vision/aipcon-devcon/{blog-connecting-agents-2026-04-29,devcon,aip-evals}.md`. Substrate failure mode (pre-rule, 2026-05-03 audit): 1727 events, 48% non-conformant, T2+ ratio 1.4%, BackPropagation circuit zero-input. Rule 26 closes the circuit.

## §Definition

> Valuable data = an event that closes the BackPropagation circuit: ① expresses a decision, ② pairs with an outcome, ③ refines DH/HC/rubric/spec/skill/agent/hook, ④ maps to ≥1 of 4 agentic memory layers, ⑤ provider-neutral + edge-compatible.

## §5-Axes 14-Criteria

- **A — Contractual** (rule 10): A1 5-dim full / A2 propagationDepth / A3 evidence-cited (reasoning ≥40 chars; optional evidence ref ≥1 file/R-ID/event if claim non-trivial)
- **B — Verifiable** (DC5-02 #2 + AIP Evals): B1 outcome-paired / B2 rubric-measurable / B3 hypothesis-bearing
- **C — Refining** (LEARN_MECHANISMS): C1 LEARN-mapped / C2 refinement target typed / C3 failure-categorizable
- **D — Shareable** (LLMI-02 + A3 Embedded Ontology): D1 provider-neutral / D2 K-LLM consensus (dual-mode; see §D2 below) / D3 edge-compatible
- **E — Memory-mapped** (A1 2026-04-29): E1 working / E2 episodic / E3 semantic / E4 procedural

## §D2 — K-LLM Consensus (dual-mode, v1.1.0)

- **D2-canonical (K≥2)**: ≥2 distinct `byWhom.identity` values emit matching `validation_phase_completed` for the same `lineageRefs.actionRid`. Requires cross-vendor graders (e.g. Codex + Claude). Full T4 confidence.
- **D2-fallback (K=1)**: Single-vendor attestation with `withWhat.kLlmConsensus = "single-vendor-attested"` + `withWhat.confidenceTier = "lower"` on the envelope. Marks as T4-eligible-with-caveat; promotion-review skill applies additional scrutiny before shared-core merge.
- D2-canonical is the target; D2-fallback unblocks T4 on single-Claude-account Max X20 setups until a 2nd vendor grader (Codex/OpenAI) is wired (future Wave).

## §Grading

T0 (A1 미충족 → reject) · T1 (A 전부 + E 1개) · T2 (A + B 1개 + E 1개) · T3 (A + B 1개 + C 1개 + E 1개 → BackProp 입력) · T4 (T3 + D2-canonical OR T3 + D2-fallback → shared-core 승격 후보; D2-fallback carries lower confidence tier).

## §R5 (Reject-at-emit)

`validation_phase_completed.passed=false` 엔벨로프는 `withWhat.refinementTarget`(typed RefinementTarget) 필수. emit-event 핸들러가 검증 — 부재 시 advisory(stderr) + bypass envvar `PALANTIR_MINI_VALUE_GRADE_BYPASS=1`(audited). Hard mode `PALANTIR_MINI_VALUE_GRADE_ENFORCE=1` → throw.

Migration anchor: advisory default flips to hard-block at sprint `migrationWindowEndSprint` (frontmatter: **sprint 062**). `value-grade-assigner` reads `migrationWindowEndSprint` from rule metadata and auto-flips enforcement mode on/after that sprint. Before sprint 062: `PALANTIR_MINI_VALUE_GRADE_ENFORCE=1` opt-in. At sprint 062+: hard-block default, opt-out via `PALANTIR_MINI_VALUE_GRADE_BYPASS=1` (audited).

## §Auto-grade

`value-grade-assigner` hook (PreToolUse on `mcp__plugin_palantir-mini_palantir-mini__emit_event`)이 emit 시점에 axes 계산하여 envelope.valueGrade T0-T4 자동 부여. T0이면 reject.

## §Axis E — sub-identity convention (v1.2.0)

`byWhom.identity` MAY use a sub-suffix `<base>/<memoryLayerSpecialization>` to signal which memory layer the emitting agent is currently refining:

- Examples: `claude-code/episodic-recall`, `claude-code/procedural-skill`, `codex-cli/semantic`.
- Base identity (`claude-code`, `codex-cli`, etc.) is canonical; suffix is advisory attribution metadata.
- `value-grade-assigner` recognizes the suffix and uses it for E-axis diversity scoring (multiple sub-identities emitting in a sprint raise T3+ probability).
- Migration: opt-in for new emitters. Existing bare `claude-code` (no suffix) maps to `all-layers` and is not penalized.

## §Substrate routing

T0 → archive 7d 후 삭제 / T1 → events.jsonl (Workflow Lineage only) / T2 → +outcomes.jsonl pair pending / T3 → +decisions/ subdir (BackProp input) / T4 → +shared-core/promotions/ candidate.

## §Version history

- v1.3.0 (2026-05-09, sprint-060 W2.4): §R5 migration anchor sprint 062 in frontmatter + hard-flip mechanic; A3 reasoning ≥40 chars + evidence-ref constraint; closes R1-F6 + R1-F7.
- v1.2.0 (2026-05-09, sprint-060 W1.11): §Axis E sub-identity convention; closes B3/M5/B.7.
- v1.1.0 (2026-05-08): §D2 dual-mode (D2-canonical K≥2 + D2-fallback K=1 single-vendor-attested); T4 reachable via either path; closes B6/J.1 (`~/.claude/plans/2026-05-07-palantir-mini-architecture-review.md §5.J.1`). Future Wave: Codex as 2nd vendor for D2-canonical.
- v1.0.0 (2026-05-06): initial.
