# Flow Walk Guide — Mode B6 Reference

Trace declaration-driven downstream connections through D→L→A→LEARN.
Read this when user enters Flow Walk mode.

## When to Use

- User asks "what does X influence?" / "이게 뭘 영향을 미쳐?"
- User wants to trace data flow from a specific ontology declaration
- User picks option 6 from project overview menu

## Connection Type Taxonomy

### From Entity (DATA) — scan all ontology files

| # | File | Scan Pattern | Connection Type | Domain |
|---|------|-------------|-----------------|--------|
| 1 | logic.ts | `linkTypes[].sourceEntity === name` | Outbound link (as source) | LOGIC |
| 2 | logic.ts | `linkTypes[].targetEntity === name` | Inbound link (as target) | LOGIC |
| 3 | logic.ts | `queries[].entityApiName === name` | Query surface | LOGIC |
| 4 | logic.ts | `functions[].operatesOn === name` | Function target | LOGIC |
| 5 | logic.ts | `functions[].parameters[].type` contains name | Function parameter | LOGIC |
| 6 | action.ts | `mutations[].entityApiName === name` | Primary mutation target | ACTION |
| 7 | action.ts | `mutations[].edits[].target === name` | Edit target (cascade) | ACTION |
| 8 | frontend.ts | views/surfaces referencing entity | Frontend view | FRONTEND |
| 9 | runtime.ts | `viewBindings[].sourceBindings[].entityApiName === name` | Source binding | RUNTIME |
| 10 | runtime.ts | `writeTargets[].entityApiName === name` | Write target | RUNTIME |

### From Link (LOGIC) — scan downstream

| # | Scan Pattern | Connection Type | Domain |
|---|-------------|-----------------|--------|
| 1 | Queries on link's target entity | Query via traversal | LOGIC |
| 2 | Functions referencing linked entities | Function using link | LOGIC |
| 3 | Mutations whose edits[] touch linked entities | Mutation on linked entity | ACTION |
| 4 | ViewBindings surfacing linked entities | Frontend materialization | RUNTIME |

### From Mutation (ACTION) — scan downstream

| # | Scan Pattern | Connection Type | Domain |
|---|-------------|-----------------|--------|
| 1 | `sideEffects[].target` | Side effect chain | LEARN |
| 2 | `recordRuntimeClosure` in sideEffects | LEARN closure path | LEARN |
| 3 | `validationFns[]` | Validation dependency | ACTION |
| 4 | `auditBindings[]` referencing mutation | Audit binding | RUNTIME |

### From Function (LOGIC) — scan downstream

| # | Scan Pattern | Connection Type | Domain |
|---|-------------|-----------------|--------|
| 1 | Mutations wrapping this function | ACTION wrapper | ACTION |
| 2 | `toolExposure: true` | Agent tool surface | FRONTEND |
| 3 | Views consuming function output | Frontend display | FRONTEND |

## Domain Ordering Rule

Present connections in this order (matches D→L→A→LEARN semantic flow):

```
1. DATA      — struct references, entity-to-entity
2. LOGIC     — links, queries, derived properties, functions
3. ACTION    — mutations, edits, side effects
4. LEARN     — hook events, evaluations, outcomes, audit
5. FRONTEND  — views, agent surfaces, scenario flows
6. RUNTIME   — view bindings, source bindings, write targets
```

Within each group, sort: links → queries → functions (LOGIC); mutations → webhooks → automations (ACTION).

## Axiom Bridge Table

Each domain transition connects to a Palantir axiom and research markers.

| Transition | Axiom | Why | BROWSE.md Recipe | Key Markers |
|-----------|-------|-----|-----------------|-------------|
| DATA→LOGIC (link) | A1: Causation | Links are edges of the Impact Propagation Graph — they declare "when X changes, what is affected?" | "How does Palantir model cause and effect?" | DATA.LK-01, LOGIC.R-02 |
| DATA→LOGIC (query) | A2: Decisions | Queries make entities queryable for decision-making — the ontology exists to serve decisions | "What tools can an AI agent use?" | DATA.QU-01, TE-02, TE-04 |
| DATA→LOGIC (function) | A1+A3: Causation+Explicit | Functions encode tribal knowledge as explicit, auditable logic | "How do I implement a cascading edit?" | LOGIC.FN-04, LOGIC.FN-15 |
| LOGIC→ACTION | A3: Explicit | Functions describe edits (LOGIC); mutations commit them (ACTION). Never auto-cascade. | "Where does LOGIC end and ACTION begin?" | LOGIC.FN-04, ACTION.R-02 |
| ACTION→LEARN | A5: Twin Feedback | Every committed action feeds back into SENSE via LEARN mechanisms | "How does the LEARN loop work?" | PHIL.DT-07, DL-01, DL-08 |
| Any→FRONTEND | A4: Compilation | Business language compiles into domain model → schema → executable → surface | "How should project scope cover backend and frontend?" | DC5-09, PS-01 |
| LEARN→DATA | A5: Twin Feedback | Outcomes become new DATA (OutcomeRecord, AccuracyScore), closing the loop | "What is Twin Maturity?" | PHIL.DT-25, PA-02, PA-06 |

## Per-Block Template

```
## Flow Block N: [ConstructName] ([DOMAIN])

### Declaration
[Actual code block — always Read from project file, never generate]

### Downstream Connections

| # | Connection | Domain | Declared In | Pattern |
|---|------------|--------|-------------|---------|
| 1 | [name] | [LOGIC/ACTION/...] | [file:array] | [field = value] |
| 2 | ... | ... | ... | ... |

Ordered: DATA → LOGIC → ACTION → LEARN → FRONTEND → RUNTIME

### Axiom Bridge
[Which Palantir axiom (A1-A5) explains WHY this connection exists]
[Restructured research content — never show raw § marker IDs]

### Research Connection
[BROWSE.md recipe → Grep marker → teaching explanation]
"Palantir에서는 [concept]을 [explanation]으로 설명합니다..."

### Navigate
 [N]     — follow connection N
 지도     — show full downstream tree
 비교     — compare across projects
 체인     — authority chain for this block
 뒤로     — return to previous block
```

## Map Command Format

When user types "지도" or "map", show depth-2 tree from starting point:

```
MathProblem (DATA)
├─ 1. hasSolution → MathSolution (LOGIC: link 1:M)
│  ├── hasVisualization → MathVisualization (LOGIC: link 1:1)
│  ├── hasReview → MathReview (LOGIC: link 1:1)
│  ├── getSolution (LOGIC: query)
│  └── planReview (LOGIC: function)
├─ 2. getProblemById (LOGIC: query)
├─ 3. listProblems (LOGIC: query)
├─ 4. solveProblem (ACTION: mutation)
│  └── recordRuntimeClosure (LEARN: side effect)
├─ 5. syncProblemRuntime (ACTION: mutation)
│  └── recordRuntimeClosure (LEARN: side effect)
├─ 6. deleteProblem (ACTION: mutation, cascade)
├─ 7. ProblemLibrary (FRONTEND: view)
└─ 8. ProblemLibrary.sourceBindings (RUNTIME: source)
```

Depth limit: 2 levels. User expands branches by selecting a number.

## Breadcrumb State

Track the path user has followed as a breadcrumb stack:

```
MathProblem → [4] solveProblem → [1] recordRuntimeClosure
```

"뒤로" pops the stack. "지도" shows tree from the STARTING point (not current).

## Cycle Detection

If construct was already visited in the current breadcrumb, show:

```
| 3 | MathProblem | DATA | logic.ts:linkTypes[] | [already visited — cycle] |
```

Do not recurse into visited constructs. Self-referencing links (e.g., Concept → Concept
in your-app) show the cycle marker on the first encounter.

## Research Grounding Protocol

For each flow block:

1. Identify domain transition type (DATA→LOGIC, ACTION→LEARN, etc.)
2. Look up axiom in the Axiom Bridge Table above
3. Find BROWSE.md recipe for that transition
4. Grep the specific marker(s) listed (~500 tokens each)
5. Restructure into teaching content — learner never sees raw § IDs
6. Format as: "Palantir에서는..." or "In Palantir's ontology, ..."

## Integration with Other Sub-modes

From any flow block, user can switch to:
- B3 (Compare): `"비교"` — compare current construct across projects
- B4 (Chain): `"체인"` — trace authority chain (vertical, not horizontal)
- B5 (Improve): `"개선"` — scan for improvements at current position
- Return to B6 with `"뒤로"` after switching
