# 05 — DTC turn-by-turn fill

**Goal:** Produce a complete `digital-twin-change/v2` (DTC) from the **approved
SIC** + FDE/ContextEngineeringPlan evidence. The source material is **never the
raw prompt** — a raw-prompt DTC is forbidden.

**Call:** `pm_semantic_intent_gate` `fillPolicy:"ontology-dtc-build"` (generic
boundary fill uses `"dtc-turn-fill"`; for ontology-affecting DTC use
`ontology-dtc-build`). **ONE call per turn, `turn` 0..6.**

**Key params:**
- `turn` — `0`–`6`.
- `turnUserInput` — the user's answer for this turn.
- `digitalTwinChangeContract` — the **PRIOR** turn's returned contract. **THREAD
  IT BACK** each turn; the first turn seeds from the approved SIC's typed refs.

**Turn map** (`ontology-dtc-build`): T0 ObjectType (+ security/permissionBoundary),
T1 LinkType, T2 ActionType, T3 Function, T4 ApplicationState, T5 Replay/Eval/Validation,
T6 finalize. The **finalize turn (T6) triggers DTC grading** and the verdict
transitions toward `dtc-filled`.

**Returns:** `dtcFillResult = { appliedTurn, question, contract, fillComplete,
nextQuestion, policy }`. **Thread `contract` back** into the next turn's
`digitalTwinChangeContract`. `fillComplete` + the grading verdict gate advance.

**Common failure → fix:**
- DTC stays "unready" (empty `changeBoundary` / `permissionBoundary`) → the SIC
  was not approved, or there is no FDE session backing it. **Fix Stages 00/03
  first**, not this turn.
- Grading verdict ≠ pass → **HOLDS at `digital_twin_user_review`** (no
  auto-advance). Revise the flagged turn and re-run that turn.
- Wrong fillPolicy → for anything ontology-affecting, `dtc-turn-fill` is NOT
  approval readiness; use `ontology-dtc-build` (the handler enforces this:
  "ontology-affecting DTC must use fillPolicy=ontology-dtc-build before approval
  or routing").

**Source:** `lib/semantic-intent/ontology-dtc-build-sequence.ts`
(grep `ONTOLOGY_DTC_BUILD_POLICY`, `appliedTurn`); turn map +
render contract in `skills/pm-dtc-fill/SKILL.md`.

**next:** `06-envelope-advance.md`
