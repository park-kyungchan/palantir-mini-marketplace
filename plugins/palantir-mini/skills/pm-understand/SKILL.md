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

**Design grounding (the 9-axis WHY):** before running the axes, SCAN
`~/harness-upstream/ssot/README.md` → `ssot/palantir/BROWSE.md` → `INDEX.md` →
smallest slice (e.g. `ssot/palantir/ontology/decision-model.md`) and inject ONLY
the needed slice — the rationale behind 9-axis/DTC/OSDK-binding/lineage
(DESIGN-authority). Design grounds, the engine above governs the protocol; both
are distinct from the raw research firehose
(`~/.claude/research/palantir-official/foundry/`) and from pm's source-authority
(`.ssot-authority.json`).

## When to use
- A request is ambiguous, large, or ontology-affecting and you want to fix its meaning + boundary before building.
- Implicit intent (constraints, non-goals, success criteria) is likely under-specified.
- `/palantir-mini:pm-understand` is invoked, or phrases like "clarify the intent", "scope this first", "understand-phase", "9-axis", "what exactly do you want" appear.

## Protocol — T0 + 9 axes (10 turns), propose → confirm
Run one turn at a time. **Never show a blank field.** For every turn the Lead first writes a **plain-language DRAFT answer** grounded in the user's prompt + the session so far, then asks the user to confirm or correct it. The user is always in the loop — confirming is one tap; correcting is free-text.

For each turn show a **non-developer card**:
1. The KO question (title) + the EN mirror + *why it matters* (one line).
2. The **worked example** for that axis — the `exampleKo` (default) / `exampleEn` fields on each `NINE_AXIS_SIC_SEQUENCE` descriptor (an everyday community-library scenario; illustrative only, never copied into the contract).
3. The Lead's **제안 / Proposed draft** — a plain-language answer the Lead inferred for *this* request (1-2 sentences, no jargon). If the Lead genuinely has nothing to infer for an axis, say so plainly and ask the user to supply it — still never a blank field.
4. The user's reply: **확인 / Confirm** (accept the draft as-is), **수정 / Correct** (free-text — this is the correction path; it replaces the draft), or **해당 없음 / N/A** (see the N/A rule below; the T0 intent turn has no N/A).

Capture the confirmed-or-corrected answer into the axis, then advance.

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
- **Every axis is always asked.** Never skip an axis and never auto-derive one away. Each turn = propose a draft → user confirms or corrects.
- **N/A is the USER's choice only.** The Lead may *propose* a reason an axis might be not-applicable (e.g. "read-only work, so ACTION may not apply — does that sound right?"), but N/A is recorded ONLY after the user explicitly chooses it. The Lead never marks an axis N/A on its own, and never skips a turn to save ceremony. (Engine-enforced: a SIC cannot be approved while any axis fill step lacks the user's confirmation — `source` must be `"user"`.)
- Free-text is always available as the correction path; confirming the proposed draft is the fast path.
- Do NOT build the ontology or mutate anything here. The understand-phase only produces the SIC; the LLM constructs the ontology from it afterward, and any mutation is gated by DTC approval.

## Example exchange (KO) — propose → confirm, and propose → correct
A worked turn (T1 / DATA), showing both outcomes:

> **Lead (T1 · DATA):** 이 일이 다루는 정보나 대상(객체)은 무엇인가요? *(What information or objects does this touch?)*
> 〔예시〕 회원, 책, 대출기록 세 가지를 다룬다. 책에는 제목·바코드·상태가 있다.
> **제안:** 말씀하신 내용으로 보아 이 작업은 **주문(order)** 과 **고객(customer)** 두 가지를 다루는 것 같습니다. 맞을까요?
>
> — 확인하는 경우 —
> **User:** 네, 맞아요.  → DATA 축에 "주문, 고객"이 기록되고 다음 축으로 넘어갑니다.
>
> — 수정하는 경우 —
> **User:** 고객 말고 **상품(product)** 도 같이 다뤄요.  → 제안을 버리고 사용자가 적은 "주문, 상품, 고객"이 DATA 축에 기록됩니다.

T0 (intent) has no N/A. For a later axis, N/A looks like: the Lead says "이 작업은 읽기 전용이라 ACTION(실제 변경)이 없을 수도 있는데, 해당 없음으로 둘까요?" and records N/A **only** if the user replies "네, 해당 없음".

## Output
When all 10 turns are confirmed-or-N/A, present the **reviewable 9-axis SIC**. Lead with a short **plain-language summary** (KO + EN, 2-3 sentences: what we understood / what is still open / what happens next), then the **audit detail**: for each axis, its `summary` + captured `refs` + status (filled / not-applicable). Confirm with the user. This SIC is the approved meaning boundary handed downstream (ontology construction, DTC, routing) — recorded only because every axis carries the user's confirmation.
