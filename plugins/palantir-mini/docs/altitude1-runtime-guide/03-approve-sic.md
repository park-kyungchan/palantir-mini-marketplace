# Stage 03 — Approve the SIC (mint approvalRef)

**Goal.** Mint `status:"approved"` + a structured `approvalRef` on the FILLED SIC. The model
is PROHIBITED from self-writing `approvalRef`; this seam mints it (and persists the minted
object), so nothing downstream has to trust a caller-stamped `status`.

**Call.** `pm_ontology_engineering_workflow` action `"approve_sic"`.

**Key params.**
- `projectRoot` — absolute root (required; empty throws).
- `sessionId` (or `fdeSessionRef`) — the session from Stage 00. **Thread it.**
- `semanticIntentContract` — the T9 `fillResult.contract` from Stage 02 (MUST carry the
  user-sourced `fillSequence`). If omitted, the handler reconstructs a draft from the
  session — which has NO `fillSequence` and is refused (the b1 trap below).
- `recordedDecisionNote` — optional approver note.
- `semanticIntentContractRef` / `affectedSurfaces` — only used by the session-reconstruct
  fallback path; not needed when you thread the real filled contract.

**Returns.**
- On success: `sicApproval: { approved: true, message }`, and the minted approved contract
  is persisted on state as **`state.approvedSemanticIntentContractSnapshot`** (status
  `approved` + minted `approvalRef` + `contractId`). **CAPTURE that snapshot object** — the
  later stages (DTC build) + the gate re-verify it via `isApprovedSemanticIntentContract`,
  not via `status==="approved"`.
- On refusal: `sicApproval: { approved: false, message, issues, unconfirmedAxes }`.

**Common failure → fix.**
- `issues: [{ field: "fillSequence", ... }]` → you passed a session-reconstructed
  axes-but-no-`fillSequence` SIC; the b1 hard gate refuses any nine-axis SIC with an
  empty/absent `fillSequence`, even one force-stamped `status:"approved"`. Thread the REAL
  Stage-02 `fillResult.contract`.
- `unconfirmedAxes: [...]` non-empty → those axes were not user-confirmed; re-run that turn
  in Stage 02 with `turnUserInput` (or `turnNotApplicable:true`).
- `issues: [{ field: "contractId" }]` → set a `contractId` on the contract.
- DO NOT retry blind — go back to Stage 02 and fix the fill.

**Source.** `bridge/handlers/pm-ontology-engineering-workflow.ts` (grep `handleApproveSic`,
`approvedSemanticIntentContractSnapshot`) + `lib/semantic-intent/approved-contract.ts` (grep
`approveSemanticIntentContract` — the mint + the b1 empty-`fillSequence` refusal) +
`lib/fde-ontology-engineering/sic-from-session.ts` (the session-reconstruction trap).

next: Stage 04
