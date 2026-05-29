---
name: pm-walk-analyze
category: research
description: "Mode B (Project Analysis): Walk real production ontology code (palantir-math,..."
effort: medium
disable-model-invocation: false
---

# Palantir Walk Analyze — Mode B: Project Analysis (Real Code Walk)

Common protocols (Entry Protocol, Navigation, Research Lookup) live in
`../_shared/walk-reference.md` — load that first.

Walk real production ontology code block by block. Each block shows the
actual code, explains WHY it was designed that way, connects to research,
and optionally compares across projects or identifies improvements.

## Registered Projects

| Project | Files | Domain | Twin Maturity |
|---------|-------|--------|---------------|
| `~/projects/palantir-math/` | 7: data, logic, action, security, frontend, runtime, schema | Math problem solving + lecture + LEARN | Stage 5 |
| `~/mathcrew/` | 8: data, logic, action, security, frontend, frontend-semantic-core, frontend-adapter, schema | Adaptive elementary math + 3D + LEARN | Stage 4 |

## Entry: Project Overview

When user says `/palantir-walk-analyze palantir-math` or `/palantir-walk-analyze mathcrew`:

1. Read the project's `ontology/schema.ts` to understand scope
2. Present project summary: entities, links, mutations, Twin Maturity
3. Offer sub-mode selection:

```
palantir-math — 프로젝트 개요

Backend:  DATA(~10 entities) LOGIC(links+derived+functions) ACTION(mutations) SEC LEARN ✅
Frontend: 5 views, 2 agent surfaces, 1 scenario flow
Runtime:  viewBindings + reviewBindings + transactionBindings + auditBindings
Twin Maturity: Stage 5

분석 모드를 선택하세요:
 1. Entity Walk   — data.ts의 엔티티를 하나씩 분석
 2. Domain Walk   — 특정 도메인 파일 전체 (logic, action, security, frontend, runtime)
 3. Compare       — 다른 프로젝트와 같은 개념 비교
 4. Chain         — 특정 엔티티의 authority chain 추적
 5. Improve       — 개선 기회 스캔
 6. Flow Walk    — 특정 선언의 downstream 연결을 D→L→A→LEARN 순으로 추적
```

## Sub-mode B1: Entity Walk

Walk through entities in a project's data.ts one by one.

For each entity:

```
## Block: [EntityName] (DATA)

### Code
[Actual code block from project/ontology/data.ts]

### Why This Design
- SH-01: "[explanation of why this is DATA, not LOGIC or ACTION]"
- DH-DATA-[N]: [specific heuristic applied]
- HC-DATA-[N]: [constraint satisfied]

### Research Connection
- §[marker] in [file]: "[finding]"
  → [how it influenced this design]

### Teaching Moment
[What's notable about this entity — struct vs entity choice, PK strategy,
 baseType selection, constraint usage, LEARN infrastructure, etc.]
```

After each block: `"다음 블록" for next entity, "비교" to compare with other
project, "체인" to trace authority chain.`

## Sub-mode B2: Domain Walk

Walk an entire domain file (logic.ts, action.ts, security.ts, frontend.ts,
runtime.ts) showing each construct sequentially.

**logic.ts walk**: links → interfaces → queries → derived → functions
- Teach TRANSITION_ZONES: "links look DATA but enable LOGIC reasoning"
- Teach SH-03: "functions compute edits (LOGIC), actions commit (ACTION)"
- Show cardinality decisions, function categories, toolExposure

**action.ts walk**: mutations → webhooks → automations
- Teach two-tier: simple-rule vs function-backed
- Show reviewLevel choices (Progressive Autonomy)
- Show LEARN mutations (recordHookEvent, recordEvaluation)

**frontend.ts walk**: views → agent surfaces → scenario flows
- Teach surface kinds (FrontendSurfaceKind)
- Show entity-view bindings (no orphan surfaces)

**runtime.ts walk**: viewBindings → reviewBindings → transactionBindings → auditBindings
- Teach source/write bindings
- Show atomicity decisions
- Show LEARN closure (audit binding → hookEvent → evaluation → outcome)

## Sub-mode B3: Cross-Project Compare

Compare the same concept in palantir-math vs mathcrew.

```
## Compare: [concept] across projects

### palantir-math
[code block]
[design reasoning]

### mathcrew
[code block]
[design reasoning]

### Why Different
| Aspect | palantir-math | mathcrew |
|--------|--------------|---------|
| [aspect] | [impl] | [impl] |

[Domain-driven reasoning for each difference]
```

Good comparison targets:
- LEARN entities (HookEvent, EvaluationRecord, OutcomeRecord)
- Schema root (ProjectOntologyScope assembly)
- Frontend views (surface kinds, bindings)
- Runtime bindings (sourceBindings, writeTargets, auditBindings)

## Sub-mode B4: Authority Chain Walk

Trace one concept through the full authority chain:

```
## Authority Chain: [EntityName]

### 1. Research (WHY)
§[marker] in research/palantir/[file]:
"[key finding that motivates this entity]"

### 2. Schema Type (HOW)
types.ts: [interface name] — [which fields are relevant]
semantics.ts: [DH/HC constants that govern it]

### 3. Project Ontology (WHAT)
[project]/ontology/[file].ts:
[actual declaration code block]

### 4. Runtime Binding (WHERE)
[project]/ontology/runtime.ts:
[viewBinding / sourceBinding / writeTarget that materializes it]

### 5. Frontend Surface (WHO SEES IT)
[project]/ontology/frontend.ts:
[FrontendView that displays it]

### Chain Health
ForwardProp: [✅ connected / ⚠ gap at step N]
BackwardProp: [✅ audit closure / ⚠ no LEARN path]
```

## Sub-mode B5: Improvement Scan

Analyze a project's ontology for gaps and improvements.

Checks (derived from former ontology-verify):
- **Authority**: research ↔ schema ↔ ontology alignment
- **Drift**: declared entities vs implemented
- **Coverage**: missing DH/HC compliance
- **LEARN**: hookEvent closure, evaluation paths
- **Twin Maturity**: current stage vs achievable
- **Dead Code**: unused links, orphan queries, unreferenced entities

Output format:

```
## Improvement Scan: [project]

### Findings
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|---------------|
| 1 | LEARN | High | [gap] | [fix] |
| 2 | Drift | Medium | [gap] | [fix] |

### Summary
- Current Twin Maturity: Stage [N]
- Achievable with fixes: Stage [N+1]
- Critical items: [count]
```

## Sub-mode B6: Flow Walk (Declaration-Driven Data Flow)

Trace structurally declared downstream connections from any ontology construct,
following the D→L→A→LEARN semantic domain order. Unlike B1/B2 (linear file
walk), B6 is **branch-selection**: the user picks which connection to follow.

Read `references/flow-walk-guide.md` for connection taxonomy and axiom bridge.

**Entry:**

```
/palantir-walk-analyze flow MathProblem        → start from entity
/palantir-walk-analyze flow solveProblem       → start from mutation
/palantir-walk-analyze palantir-math flow X    → explicit project
Option 6 from project overview menu
```

**Step 0**: Read BROWSE.md + all project ontology files (data, logic, action,
frontend, runtime). Build downstream connection map by scanning for the
construct's `apiName` in: `sourceEntity`, `targetEntity`, `entityApiName`,
`edits[].target`, `sourceBindings[].entityApiName`, `sideEffects[].target`,
`writeTargets[].entityApiName`. Only structurally declared references count
— never infer connections.

**Per-block output:**

```
## Flow Block N: [ConstructName] ([DOMAIN])

### Declaration
[Actual code block — Read from project, never generate]

### Downstream Connections

| # | Connection | Domain | Declared In | Pattern |
|---|------------|--------|-------------|---------|
| 1 | hasSolution → MathSolution | LOGIC | logic.ts:linkTypes[] | sourceEntity: "MathProblem" |
| 2 | getProblemById | LOGIC | logic.ts:queries[] | entityApiName: "MathProblem" |
| 3 | solveProblem | ACTION | action.ts:mutations[] | entityApiName: "MathProblem" |

Ordered: DATA → LOGIC → ACTION → LEARN → FRONTEND → RUNTIME

### Axiom Bridge
[Which Palantir axiom (A1-A5) explains WHY these connections exist.
 Use axiom bridge table from flow-walk-guide.md. Restructure research
 content — learner never sees raw § marker IDs.]

### Research Connection
[BROWSE.md recipe → Grep specific marker → teaching explanation.
 Format: "Palantir에서는..." or "In Palantir's ontology, ..."]

### Navigate
 [N]     — follow connection N (becomes next flow block)
 지도     — full downstream tree from starting point
 비교     — compare across projects (→ B3)
 체인     — authority chain for this block (→ B4)
 뒤로     — return to previous flow block
```

**Key rules:**
- NO "다음 블록" command. User MUST pick a numbered branch.
- Track breadcrumb stack: `MathProblem → [3] solveProblem → [1] recordRuntimeClosure`
- "뒤로" pops the stack. "지도" shows tree from the STARTING point.
- Cycle detection: if construct was already visited, show `[already visited]`.
- Map command shows depth-2 tree (user expands by selecting branches).

---

## Navigation Commands — Mode B (B1-B5)

- `"다음 블록"` / `"next block"` — next code block
- `"비교"` / `"compare"` — compare current block across projects
- `"체인"` / `"chain"` — authority chain for current entity
- `"개선"` / `"improve"` — improvement opportunities
- `"뒤로"` / `"back"` — previous block
- `"목차"` / `"toc"` — file structure overview

## Navigation Commands — Mode B6 (Flow Walk)

- `[number]` (e.g., `1`, `3`) — follow downstream connection N
- `"지도"` / `"map"` — show full downstream tree from starting point
- `"비교"` / `"compare"` — compare current construct across projects
- `"체인"` / `"chain"` — authority chain for current construct
- `"뒤로"` / `"back"` — return to previous flow block (breadcrumb)

---

## Gotchas — Mode B

- **Mode B reads actual project files.** Always Read the real code — never
  generate from memory. The code IS the teaching material.
- **Cross-project comparison must show actual code from BOTH projects.**
  Do not summarize one side.
- **Flow Walk connections must be structurally declared.** Never infer
  a connection not present as `entityApiName`, `sourceEntity`,
  `targetEntity`, `edits[].target`, `sourceBindings[].entityApiName`,
  or `sideEffects[].target` in the actual ontology files.
- **Flow Walk is branch-selection, not linear.** No "다음 블록" command.
  User must choose a numbered branch. This is the fundamental
  difference from B1/B2.

---

## When to Read More

| Need | Read |
|------|------|
| Project analysis protocol | `references/project-analysis-guide.md` |
| Full philosophy | `~/.claude/research/palantir/philosophy/README.md` |
| Digital Twin loop | `~/.claude/research/palantir/philosophy/digital-twin.md` |
| Flow Walk protocol (B6) | `references/flow-walk-guide.md` |
| DH/HC constants | `~/.claude/schemas/ontology/semantics.ts` |
| Shared protocols | `../_shared/walk-reference.md` |
