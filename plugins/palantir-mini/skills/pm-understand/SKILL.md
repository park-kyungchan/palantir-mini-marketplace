---
name: pm-understand
category: core-workflow
surfaceStatus: public-core
description: "Run the 9-axis understand-phase (the harness heart): surface a request's explicit..."
allowed-tools: Read
effort: medium
disable-model-invocation: false
---

# pm-understand — 9-axis understand-phase (the harness heart)

Surface what the user *means* — explicit and implicit — into a reviewable **9-axis SemanticIntentContract (SIC)** before building anything. Runtime-neutral, non-developer-friendly, turn-by-turn. This skill is the Claude adapter that *renders* the canonical engine; it does not re-decide the protocol.

**Canonical engine (source of truth — read if in doubt):**
- `lib/semantic-intent/nine-axis-sic-fill-sequence.ts` — `NINE_AXIS_SIC_SEQUENCE` (the 10 turns), `advanceNineAxisSicSequence`, `nineAxisSicReadinessIssues`.
- `lib/semantic-intent/nine-axis-understand-session.ts` — `nineAxisTurnCard` (the card), session runner (`startNineAxisSession` / `nextCard` / `answerCard` / `isSessionComplete` / `sessionContract`).
If this skill and the engine ever diverge, the engine wins.

## When to use
- A request is ambiguous, large, or ontology-affecting and you want to fix its meaning + boundary before building.
- Implicit intent (constraints, non-goals, success criteria) is likely under-specified.
- `/palantir-mini:pm-understand` is invoked, or phrases like "clarify the intent", "scope this first", "understand-phase", "9-axis", "what exactly do you want" appear.

## Protocol — T0 + 9 axes (10 turns)
Run one turn at a time. For each, show a **non-developer card**: the KO question (title), the EN mirror, *why it matters*, and two choices — **직접 입력 / Enter** (free-text answer, recommended) or **해당 없음 / N/A** (mark the axis not-applicable; the intent turn has no N/A). Capture the user's answer into the axis, then advance.

| Turn | Axis | 질문 (KO) | Question (EN) |
|---|---|---|---|
| T0 | intent | 한 문장으로, 무엇을 하려는 건가요? 절대 건드리면 안 되는 게 있나요? | In one sentence, what are you trying to do — and is anything off-limits? |
| T1 | DATA | 이 일이 다루는 정보나 대상(객체)은 무엇인가요? | What information or objects does this touch? |
| T2 | LOGIC | 어떤 규칙·계산·판단이 적용되나요? | What rule, computation, or decision applies? |
| T3 | ACTION | 무엇이 실제로 바뀌거나 실행되나요? | What change or execution actually happens? |
| T4 | GOVERNANCE | 누가 해도 되나요? 무엇이 안전하고, 무엇이 승인을 필요로 하나요? | Who may? What is safe, and what needs approval? |
| T5 | CONTEXT | 어떤 자료·문서·출처를 근거로 써야 하나요? | What data, docs, or sources should it rely on? |
| T6 | SUCCESS/EVAL | '다 됐다' 또는 '맞다'는 것을 무엇으로 판단하나요? | How do we judge it is done or correct? |
| T7 | CONSTRAINTS/NON-GOALS | 무엇이 일어나면 안 되나요? 건드리면 안 되는 범위는? | What must NOT happen, and what is out of bounds? |
| T8 | ACTORS | 누가 실행하고, 누구의 권한이 필요한가요? | Who runs it, and whose authority is needed? |
| T9 | MEMORY/PRIOR | 재사용할 만한, 과거의 비슷한 결정이 있나요? | Any prior, similar decision worth reusing? |

Why each axis matters (surface briefly when asking): DATA = wrong objects derail everything; LOGIC = wrong rules → wrong decisions even on right data; ACTION = sets risk/approval scope; GOVERNANCE = permissions before acting; CONTEXT = narrow sources prevent hallucination/context pollution; SUCCESS/EVAL = no 'done' definition → nothing to verify; CONSTRAINTS/NON-GOALS = where implicit intent lives; ACTORS = lineage (byWhom) + accountability; MEMORY/PRIOR = consistency + speed.

## Rules
- One turn at a time; do not batch all 9. Keep it non-developer-friendly — plain language, no jargon dumps.
- Recommended default each turn = free-text answer; accept "N/A" to mark an axis not-applicable.
- Proportional: if the task clearly makes an axis irrelevant (e.g. read-only work → ACTION/GOVERNANCE light), say so and let the user confirm N/A — don't force ceremony.
- Do NOT build the ontology or mutate anything here. The understand-phase only produces the SIC; the LLM constructs the ontology from it afterward, and any mutation is gated by DTC approval.

## Output
When all 10 turns are filled-or-N/A, present the **reviewable 9-axis SIC**: for each axis, its `summary` + captured `refs` + status (filled / not-applicable). Confirm with the user. This SIC is the approved meaning boundary handed downstream (ontology construction, DTC, routing).
