# _SOURCES — live-source pointer index

Every file the guide cites. Paths are relative to the plugin root
`~/palantir-mini-marketplace/plugins/palantir-mini/` unless marked absolute.
**Pointer-not-copy**: grep the anchor, don't trust copied line numbers. **Verify before citing**:
all paths below were `ls`-confirmed at authoring time; if a path moved, the disk wins — fix the
pointer. (global CLAUDE.md §6.)

## Action vocabulary (authoritative)
| Path | grep for | Authoritatively defines |
|------|----------|-------------------------|
| `lib/ontology-engineering-workflow/types.ts` | `OntologyEngineeringWorkflowAction =` (then `"start"`, `"approve_sic"`, `"approve_technology_recommendation"`) | The OE workflow action enum — the only valid `action` values for `pm_ontology_engineering_workflow`. |

## Bridge handlers (the runtime behavior)
| Path | grep for | Authoritatively defines |
|------|----------|-------------------------|
| `bridge/handlers/pm-ontology-engineering-workflow.ts` | `case "start"` / `readSessionByInput` | `start`/`status` handling; the `readSessionByInput` fallback that silently picks the stale `current.json` when `sessionId` is omitted; `approve_sic` / `approve_technology_recommendation` write paths. |
| `bridge/handlers/pm-semantic-intent-gate.ts` | `requiresFDEWorkflowProvenance` / `advanceToApprovedState` / `saveEnvelope` / `OntologyDtcBuildReadiness` / `userApproval` | The FDE-provenance bounce (Stage 01); the prompt-envelope advance to `digital_twin_approved` (Stage 06); the router-only DTC readiness gate + `userApprovalQuote` semantics (Stage 07). |

## Contract mint + the reconstruction trap
| Path | grep for | Authoritatively defines |
|------|----------|-------------------------|
| `lib/semantic-intent/approved-contract.ts` | `status: "approved"` / `approvalRef` / `Mints status:'approved'` | The SIC mint seam — `status:"approved"` + structured `approvalRef`; the model may NOT self-write `approvalRef` (Stage 03). |
| `lib/fde-ontology-engineering/sic-from-session.ts` | `buildAxes` / `axes` | Session→SIC reconstruction that yields **axes but no `fillSequence`** — the trap that triggers the `issues:[{field:"fillSequence"}]` refusal if threaded into `approve_sic` (Stages 02/03). NOTE: lives under `lib/fde-ontology-engineering/`, not `lib/semantic-intent/`. |
| `lib/ontology-engineering-workflow/store.ts` | `resolveProjectMintedSicSnapshot` | The cross-session BY-REF resolver: scans the projectRoot workflow store for a minted `approvedSemanticIntentContractSnapshot`, prefers a `preferContractId` match, fail-closed on ≥2 distinct minted SICs (Stage 08, bd-011 / P0-2). Caller: `bridge/handlers/pm-ontology-engineering-workflow.ts` grep `readPreviousWorkflowState`. |

## Fill sequences (turn order)
| Path | grep for | Authoritatively defines |
|------|----------|-------------------------|
| `lib/semantic-intent/nine-axis-sic-fill-sequence.ts` | `targetField` / `"memoryPrior"` | The 9-axis turn order (T0 rawIntent → T9 memoryPrior) for the default `nine-axis-sic` fill policy (Stage 02). |
| `lib/semantic-intent/ontology-dtc-build-sequence.ts` | `ObjectType` / `readinessVerdict` / `autoFillStrategy` | The DTC build turn order (ObjectType+security → … → readiness) + per-turn auto-fill pre-seed from the approved SIC (Stage 05). |

## SKILL.md turn tables (operator-facing procedure)
| Path | grep for | Authoritatively defines |
|------|----------|-------------------------|
| `skills/pm-understand/SKILL.md` | the understand-phase turn table | Operator framing for the understand phase that feeds the 9-axis fill (Stage 02). |
| `skills/pm-semantic-intent-gate/SKILL.md` | the gate turn table | Operator procedure for `pm_semantic_intent_gate` turns + approval (Stages 02/03/06). |
| `skills/pm-dtc-fill/SKILL.md` | the DTC turn table | Operator procedure for the DTC turn-by-turn build (Stage 05). |

## WHY (design authority)
| Path | grep for | Authoritatively defines |
|------|----------|-------------------------|
| `~/harness-upstream/ssot/palantir/` (absolute; browse `BROWSE.md` → `INDEX.md` → slice) | `ontology` / `ai-fde` | The Palantir design-authority WHY behind SIC/DTC/FDE — the grounds for the flow this crib operates. Browse-then-slice; inject only the slice (CORE.md ssot/palantir design-authority). |
