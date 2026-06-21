# Stage 02 — Nine-axis SIC fill (the user-sourced fillSequence)

**Goal.** Produce a `fillSequence` whose EVERY step is `source:"user"` — the only thing
that satisfies the Q2 hard gate at Stage 03. This is where tokens get burned if done wrong.

**Call.** `pm_semantic_intent_gate`, ONE call per turn `0..9`. Omit `fillPolicy` to use the
default nine-axis SIC policy (`NINE_AXIS_SIC_POLICY = "nine-axis-sic"`); the result lands in
`fillResult` (not `fdeFillResult`/`dtcFillResult`).

**Key params.**
- `project` — project root.
- `rawIntent` — the intent under contract (**from the prompt-front-door envelope**).
- `turn` — `0`–`9`, one per call.
- `turnUserInput` — the user's confirmation/answer for this turn; this is what records the
  step as `source:"user"`. **From the prompt-front-door envelope / the owner's reply.**
- `turnNotApplicable: true` — alternative to `turnUserInput`; stamps the axis
  `status:"not-applicable"` as the USER's choice (still user-sourced, still passes Q2).
- `semanticIntentContract` — the PRIOR turn's `fillResult.contract`. **THREAD IT BACK every
  turn** or the fill never accumulates.
- `proposedAxisDraft` — optional AI proposal for the current turn; renders a
  "confirm this proposal" choice in `fillResult.turnCard`. A proposal alone does NOT make
  the axis user-sourced — the owner must still confirm via `turnUserInput`.

**Turn order (T0 intent + one per axis, 10 turns).** T0 `rawIntent` → T1 `data` →
T2 `logic` → T3 `action` → T4 `governance` → T5 `context` → T6 `successEval` →
T7 `constraintsNonGoals` → T8 `actors` → T9 `memoryPrior`.

**Returns.** `fillResult = { appliedTurn, question, contract (← THREAD BACK next turn),
fillComplete, nextQuestion, turnCard, nextTurnCard }`.
- **Threads to Stage 03:** the T9 `fillResult.contract` (the filled SIC carrying the
  user-sourced `fillSequence`) is the exact object `approve_sic` consumes.
- `fillComplete` is `true` only after T9.

**Common failure → fix.**
- `fillSequence` never grows → you did NOT thread `fillResult.contract` back as
  `semanticIntentContract`; each call re-drafts an empty contract.
- Axes recorded AI-sourced → Q2 refuses at Stage 03 with `unconfirmedAxes`. Every axis needs
  `turnUserInput` OR `turnNotApplicable:true`.
- EFFICIENCY: batch all nine `proposedAxisDraft`s into ONE prose turn-card so the owner
  confirms in ~1–2 messages, not 10 round-trips.

**Source.** `lib/semantic-intent/nine-axis-sic-fill-sequence.ts` (grep
`NINE_AXIS_SIC_POLICY`, `targetAxis`, `turnIndex` for the order) + `skills/pm-understand/`
+ `skills/pm-semantic-intent-gate/` SKILL.md (the turn tables). `fillResult` shape:
`bridge/handlers/pm-semantic-intent-gate.ts` (grep `SemanticIntentFillResult`).

next: Stage 03
