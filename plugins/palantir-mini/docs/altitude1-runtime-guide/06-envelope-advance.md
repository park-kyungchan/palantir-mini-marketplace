# 06 — Advance the prompt ENVELOPE to `digital_twin_approved`

**Goal:** Flip the **prompt envelope** to `digital_twin_approved`. This is the
state the PreToolUse hook reads — a **SEPARATE store** from the OE-workflow
`current.json` that `approve_sic` (Stage 03) wrote. Approving in workflow state
does **not** advance the envelope; this stage does.

**Call:** ONE `pm_semantic_intent_gate` call passing **BOTH approved contracts
INLINE** (as full objects, not ref-strings).

**Key params:**
- `project`, `rawIntent`.
- `promptId` / `promptHash` / `sessionId` / `runtime` — the **SAME values
  UserPromptSubmit captured** (promptHash continuity is checked).
- `semanticIntentContract` — approved SIC **with `approvalRef`**, inline OBJECT.
- `digitalTwinChangeContract` — approved DTC **with `approvalRef`**, inline OBJECT.

**Returns:** the envelope walks `captured → … → digital_twin_approved`
(`advanceToApprovedState` → `transitionPromptEnvelope(… "digital_twin_approved")`
→ `saveEnvelope`). The PreToolUse pass condition = envelope `digital_twin_approved`
**AND** approved prompt-local contract refs **AND** promptHash continuity.

**Common failure → fix:**
- Gate still reports "no SemanticIntentContract ref" **AFTER** approval →
  approved in WORKFLOW state but the prompt ENVELOPE was never advanced
  (different store!); OR a contract was passed **without a minted `approvalRef`**,
  as a ref-string, or with a **promptHash mismatch**. **Fix: pass the full
  approved OBJECTS inline with matching prompt identity** (same promptId/promptHash/
  sessionId/runtime as capture).

**Source:** `bridge/handlers/pm-semantic-intent-gate.ts`
(grep `advanceToApprovedState`, `saveEnvelope`, `digital_twin_approved`).

**next:** `07-dispatch.md`
