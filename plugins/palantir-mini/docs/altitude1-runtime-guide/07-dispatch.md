# 07 — Dispatch the build

**Goal:** Dispatch the build without fighting `OntologyDtcBuildReadinessGate`.
That gate gates `pm_intent_router` **ONLY** — it is **N/A for native subagent
dispatch**. With the envelope at `digital_twin_approved` (Stage 06), the operative
gate is the now-passing PreToolUse `prompt-dtc-enforcement-gate`.

**Call:** native subagent dispatch — **each runtime's own mechanism**, NOT
`pm_intent_router`.

**Key params:** only if you DO route through `pm_intent_router` —
- `userApprovalQuote`
- `userApprovalPromptId`
- `userApprovalPromptHash`

These are re-verified **fail-closed** against the captured envelope.

**Returns:** with the envelope at `digital_twin_approved`, the advisory PreToolUse
gate passes and mutation proceeds.

**Common failure → fix:**
- Do **NOT** over-apply `userApprovalQuote`. It satisfies ONLY the
  `WorkContract` + `RouterBinding` dispatch checks **inside** the readiness gate.
  It does **NOT** substitute for SIC/DTC approval (Stages 03/05/06) and never
  relaxes DTC validity.
- Native dispatch never calls `pm_intent_router`, so `OntologyDtcBuildReadinessGate`
  is N/A there — don't try to "satisfy" it.

**Source:** `bridge/handlers/pm-semantic-intent-gate.ts`
(grep `OntologyDtcBuildReadiness`, `userApprovalQuote`, `userApprovalPromptHash`).

**next:** `99-failure-fix-table.md` (the one-glance blocker matrix)
