# 99 — Failure → fix table (one-glance blocker matrix)

You just hit a wall mid-Altitude-1 run. Find the symptom string, read the root
cause, make the corrective call. This is the card `BROWSE.md` points at FIRST.

| Symptom / blocker string | Root cause | Corrective call (tool+action / field to thread) | Slice |
|---|---|---|---|
| `no SemanticIntentContract ref` / `Call pm_semantic_intent_gate before mutating` | Pre-SIC: no contract has been started/filled/approved yet | `pm_ontology_engineering_workflow action:"start"` → fill turns → `action:"approve_sic"`; thread `sessionId` forward | 00 → 02 → 03 |
| `contract_required` + FDE provenance bounce | No FDE session backs the contract (provenance missing) | Start the FDE session first (`pm_ontology_engineering_workflow action:"start"`), then the 9-axis fill | 01 (+ 00 start) |
| `unconfirmedAxes` / axes are AI-sourced | Axes filled by the model, not user-confirmed | Re-run each axis turn with `turnUserInput` (user's own words per axis) | 02 |
| `issues:[{field:"fillSequence"}]` (empty-fillSequence refusal) | A session-reconstructed SIC was passed instead of the live fill chain | Thread `fillResult.contract` back each turn; do NOT pass a session-reconstructed SIC | 02 / 03 |
| `requires approved SIC and DTC workflow state` / `mutationAuthorized=true required` | DTC not built/approved; mutation not authorized | Run the DTC turns (`fillPolicy:"ontology-dtc-build"`, T0–T6), then advance the envelope | 05 → 06 |
| Gate still `no SIC ref` AFTER `approve_sic` succeeded | Approved in WORKFLOW state but the prompt ENVELOPE was not advanced (different store) | ONE `pm_semantic_intent_gate` call passing **both approved contracts inline as OBJECTS** with matching prompt identity | 06 |
| PreToolUse `not digital_twin_approved` | Prompt envelope has not reached `digital_twin_approved` | Advance the envelope: inline approved SIC + DTC (each with `approvalRef`) + captured promptId/promptHash/sessionId/runtime | 06 |
| Operating on a stale `<old-date>` session / unexpected mission | Threading an old/wrong `sessionId` | `pm_ontology_engineering_workflow action:"status"` to inspect, then `action:"start"`; thread the fresh `sessionId` | 00 |
| `no SIC ref` / `contract_required` in a session that did NOT mint the SIC (approve_sic succeeded earlier) | Minted snapshot is keyed to the MINTING session; the active session + `current.json` are snapshot-less | Runtime resolves it BY-REF (single distinct minted SIC). If it still refuses, ≥2 distinct minted SICs on disk (fail-closed) — thread the intended `sessionId` so the active `semanticIntentContractRef` selects its snapshot | 08 |

**Reading note:** rows are ordered by where they bite in the pipeline (pre-SIC →
SIC fill/approve → DTC → envelope → session-identity). A blocker that appears
"after approval" almost always means the **prompt envelope** lags the **workflow
state** — two separate stores (see Stage 06).
