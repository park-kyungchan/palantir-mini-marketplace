# Project Analysis Guide — Mode B Reference

How to analyze real project ontology code block by block.

## Reading Protocol

### Before Starting Any Walk

1. Read the project's `ontology/schema.ts` — understand ProjectOntologyScope shape
2. Note: BackendOntology present? FrontendOntology? RuntimeOntology?
3. Check Twin Maturity indicators: `learn` field, hookEventsTable, evaluator/outcome records

### Per Code Block

For each entity/link/mutation/binding:

1. **Read the actual code** — always Read the real file, never generate from memory
2. **Classify** — apply SH-01/02/03 to confirm domain placement
3. **Check DH** — which DecisionHeuristics were applied?
4. **Check HC** — any HardConstraint violations?
5. **Find research root** — use BROWSE.md to locate the § marker that motivated the design
6. **Assess** — is this well-designed? What could improve?

## DH/HC Quick Reference Per Domain

### DATA (SH-01: "Does this exist without interpretation or action?")

| DH | Question | Decision |
|----|----------|----------|
| DH-DATA-01 | Independent identity? | Entity (yes) vs Struct (no) |
| DH-DATA-02 | Reusable property set? | SharedPropertyType if 3+ types use it |
| DH-DATA-03 | Primary key strategy? | string (flexible) vs integer (auto) |
| DH-DATA-07 | Value constraints? | enum/range/regex/uuid/arrayUnique |

Key HC: PK must be non-nullable scalar. apiName PascalCase. ≤2000 properties.

### LOGIC (SH-02: "Does this reason about what exists?")

| DH | Question | Decision |
|----|----------|----------|
| DH-LOGIC-01 | How are entities connected? | LinkType cardinality (1:1/M:1/1:M/M:N) |
| DH-LOGIC-02 | Shared behavior across types? | Interface with link constraints |
| DH-LOGIC-03 | Computed from other properties? | DerivedProperty (onRead vs cached) |
| DH-LOGIC-05 | Expose to LLM? | toolExposure: true on OntologyFunction |

Key TRANSITION_ZONES: LinkType, Interface, Query, DerivedProperty — structural
DATA but semantic LOGIC.

### ACTION (SH-03: "Does executing this irreversibly change reality?")

| DH | Question | Decision |
|----|----------|----------|
| DH-ACTION-01 | Simple CRUD or graph traversal? | Simple rule vs function-backed |
| DH-ACTION-02 | External system integration? | Webhook (writeback vs side-effect) |
| DH-ACTION-03 | Automatic trigger? | Automation (7 condition types) |
| DH-ACTION-05 | What autonomy level? | reviewLevel: monitor → full-autonomy |

Key distinction: "Edits[] = describes impact (LOGIC)" vs "commits edits (ACTION)".

### SECURITY (Governance overlay, not 4th domain)

4-layer model: RBAC → Markings → Object Security → Cell-Level.
All layers must permit. PermissionModel: ontologyRoles vs projectBased.

### LEARN (Feedback loop, not separate domain)

Three mechanisms:
- LEARN-01: Write-Back (hookEvents — Decision Lineage 5D)
- LEARN-02: Evaluation (EvaluationRecord)
- LEARN-03: Outcome Tracking (OutcomeRecord — Stage 5)

## Research Connection Protocol

1. Identify the concept being analyzed
2. Look up in BROWSE.md Concept→File table
3. Grep the specific § marker (~500 tokens)
4. Explain how the research finding influenced the design choice
5. Never show raw § marker IDs to the user — restructure into teaching content

## Cross-Project Comparison Rubric

When comparing palantir-math vs mathcrew:

| Dimension | What to Compare |
|-----------|----------------|
| Entity count | How many domain entities vs LEARN entities |
| Property types | Which BasePropertyTypes are used (and why) |
| Struct usage | Does the project use structs? When and why? |
| Link patterns | Cardinality choices, FK strategy |
| Function types | pureLogic vs readHelper vs computedField |
| LEARN depth | hookEventsTable fields, evaluator/outcome coverage |
| Frontend layers | Number of frontend files, surface kinds used |
| Runtime complexity | Number of viewBindings, audit closure depth |
| Twin Maturity | Numeric stage comparison |

Always explain differences as **domain-driven**, not preference-driven.

## Improvement Checklist

### Authority Alignment
- [ ] Every entity in data.ts has a clear SH-01 justification
- [ ] TRANSITION_ZONE concepts are in logic.ts, not data.ts
- [ ] Mutations reference entities that exist in data.ts
- [ ] Frontend views reference backend queries/actions

### Completeness
- [ ] Every entity has PK, titleKey, description (BilingualDesc)
- [ ] Every link has cardinality and FK strategy documented
- [ ] Every mutation has edits[] specifying what changes
- [ ] LEARN entities present (HookEvent at minimum)

### Drift Detection
- [ ] schema.ts re-exports all domain files
- [ ] `satisfies` checks present on all exports
- [ ] No orphan entities (declared but unreferenced)
- [ ] No phantom references (used but undeclared)

### LEARN Closure
- [ ] hookEventsTable has all 5D fields (WHEN, ATOP, THROUGH, BY, WITH)
- [ ] hasEvaluatorResults: true (if Stage 3+)
- [ ] hasOutcomeRecords: true (if Stage 5)
- [ ] providerNeutral: true (no direct provider imports in ontology/)

### ForwardProp Health
- [ ] research → schema type → ontology → runtime: no gaps
- [ ] Every frontend view traces back to ontology entity/query

### BackwardProp Health
- [ ] Mutations have audit closure (hookEvent path)
- [ ] Evaluation path exists for important decisions
- [ ] Outcome tracking for measurable predictions (if applicable)

---

## B6: Flow Walk — Connection Scan Protocol

When user enters Flow Walk, scan ALL ontology files for structural references
to the starting construct's `apiName`:

1. `logic.ts` — `linkTypes[].sourceEntity/targetEntity`, `queries[].entityApiName`,
   `functions[].operatesOn`, `functions[].parameters[].type`
2. `action.ts` — `mutations[].entityApiName`, `mutations[].edits[].target`,
   `mutations[].sideEffects[].target`
3. `frontend.ts` — views/surfaces referencing entity
4. `runtime.ts` — `sourceBindings[].entityApiName`, `writeTargets[].entityApiName`

Order results: DATA → LOGIC → ACTION → LEARN → FRONTEND → RUNTIME.

Each connection block includes: Axiom Bridge (A1-A5), Research Connection
(via BROWSE.md recipe → Grep marker), and numbered navigation.

B6 integrates with other sub-modes: user can switch to B3 (compare), B4 (chain),
or B5 (improve) from any flow block, then return via "뒤로".

See `references/flow-walk-guide.md` for full protocol.
