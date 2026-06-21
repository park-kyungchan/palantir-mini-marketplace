# Stage 01 — FDE provenance bounce (why the gate says contract_required)

**Goal.** Understand why `pm_semantic_intent_gate` bounces ontology-flavored intents to
`contract_required` — so you run Stage 00 (or thread a session ref) instead of fighting the
bounce with blind retries.

**Call.** Conditioning behavior of `pm_semantic_intent_gate`, applied by
`applyFDEProvenanceFailure` via the `requiresFDEWorkflowProvenance` predicate.

**Key params (gate input).**
- `rawIntent` — scanned for provenance markers.
- `scopePaths` — also scanned (joined with `rawIntent`, lowercased).
- `fdeOntologyEngineeringSessionRef` — **passing it clears the bounce** (it satisfies
  `hasFDEWorkflowProvenance`). Comes from Stage 00 (the started/resumed session).
- `project` — used to read `current.json` as the fallback provenance source.

**Returns (on bounce).**
- `status: "contract_required"`, `allowsRouting: false`.
- `reason`: "FDEOntologyEngineeringSession provenance is required before this Ontology
  Engineering workflow can author SIC/DTC or route execution."
- `requiredContracts: ["SemanticIntentContract", "DigitalTwinChangeContract"]`.
- Next action: run `pm_ontology_engineering_workflow` `start` (Stage 00).

**Common failure → fix.**
- Gate flips to `contract_required` because `requiresFDEWorkflowProvenance` matched —
  `rawIntent`+`scopePaths` contains one of the live markers (`"ontology engineering"`,
  `"fde"`, `"runtime-native question ui"`, `"workflowcontract"`, `"turncarddecisionspec"`,
  `"userdecisionrecord"`, `"pm_ontology_engineering_workflow"`) **and** no FDE session
  exists. Fix: run Stage 00 `start`, OR thread `fdeOntologyEngineeringSessionRef`.
  `hasFDEWorkflowProvenance` then returns true (ref set, or `current.json` readable) and
  the bounce clears automatically — do NOT retry the same un-provenanced call.

**Source.** `bridge/handlers/pm-semantic-intent-gate.ts` — grep
`requiresFDEWorkflowProvenance` (the marker list), `hasFDEWorkflowProvenance` (the clearing
predicate), and `applyFDEProvenanceFailure`.

next: Stage 02
