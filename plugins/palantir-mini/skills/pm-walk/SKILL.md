---
name: pm-walk
category: research
surfaceStatus: public-core
description: "Ontology teaching — analyze real project code | build entities scene-by-scene modes"
effort: medium
disable-model-invocation: false
---

# pm-walk — Ontology teaching lifecycle (analyze | build)

One skill, two modes selected by the first argument:

| Mode | Trigger | Use when |
|------|---------|----------|
| `analyze` | `/palantir-mini:pm-walk analyze <project>` | Walk real production ontology code block by block (project analysis, compare, chain, improve, flow walk) |
| `build` | `/palantir-mini:pm-walk build` | Build ontology entities step by step via scene-based SENSE → CHALLENGE → REVIEW → LEARN pedagogy |

Common protocols (Entry Protocol, Navigation, Research Lookup) live in
`../_shared/walk-reference.md` — load that first, regardless of mode.

---

## Mode: analyze — Project Analysis (Real Code Walk)

Common protocols (Entry Protocol, Navigation, Research Lookup) live in
`../_shared/walk-reference.md` — load that first.

Walk real production ontology code block by block. Each block shows the
actual code, explains WHY it was designed that way, connects to research,
and optionally compares across projects or identifies improvements.

### Registered Projects

Projects are discovered at runtime from `.palantir-mini/project-scope.json` files under registered roots. The table below shows example entries — actual projects vary by workspace.

| Project | Files | Domain | Twin Maturity |
|---------|-------|--------|---------------|
| `~/projects/your-project/` | 7: data, logic, action, security, frontend, runtime, schema | Example domain + LEARN | Stage 5 |
| `~/your-app/` | 8: data, logic, action, security, frontend, frontend-semantic-core, frontend-adapter, schema | Example app + 3D + LEARN | Stage 4 |

### Entry: Project Overview

When user says `/palantir-walk-analyze your-project` or `/palantir-walk-analyze your-app`:

1. Read the project's `ontology/schema.ts` to understand scope
2. Present project summary: entities, links, mutations, Twin Maturity
3. Offer sub-mode selection:

```
your-project — 프로젝트 개요

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

### Sub-mode B1: Entity Walk

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

### Sub-mode B2: Domain Walk

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

### Sub-mode B3: Cross-Project Compare

Compare the same concept across two registered projects (e.g. `your-project` vs `your-app`).

```
## Compare: [concept] across projects

### your-project
[code block]
[design reasoning]

### your-app
[code block]
[design reasoning]

### Why Different
| Aspect | your-project | your-app |
|--------|--------------|---------|
| [aspect] | [impl] | [impl] |

[Domain-driven reasoning for each difference]
```

Good comparison targets:
- LEARN entities (HookEvent, EvaluationRecord, OutcomeRecord)
- Schema root (ProjectOntologyScope assembly)
- Frontend views (surface kinds, bindings)
- Runtime bindings (sourceBindings, writeTargets, auditBindings)

### Sub-mode B4: Authority Chain Walk

Trace one concept through the full authority chain:

```
## Authority Chain: [EntityName]

### 1. Design-authority (WHY)
§[slice] in `~/harness-upstream/ssot/palantir/[area]/[file].md` (scan `ssot/palantir/BROWSE.md` → smallest slice; legacy `research/palantir/*` markers resolve via the snapshot `research-source-map.ts`):
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

### Sub-mode B5: Improvement Scan

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

### Sub-mode B6: Flow Walk (Declaration-Driven Data Flow)

Trace structurally declared downstream connections from any ontology construct,
following the D→L→A→LEARN semantic domain order. Unlike B1/B2 (linear file
walk), B6 is **branch-selection**: the user picks which connection to follow.

Read `references/flow-walk-guide.md` for connection taxonomy and axiom bridge.

**Entry:**

```
/palantir-walk-analyze flow MathProblem        → start from entity
/palantir-walk-analyze flow solveProblem       → start from mutation
/palantir-walk-analyze your-project flow X    → explicit project
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

### Navigation Commands — Mode B (B1-B5)

- `"다음 블록"` / `"next block"` — next code block
- `"비교"` / `"compare"` — compare current block across projects
- `"체인"` / `"chain"` — authority chain for current entity
- `"개선"` / `"improve"` — improvement opportunities
- `"뒤로"` / `"back"` — previous block
- `"목차"` / `"toc"` — file structure overview

### Navigation Commands — Mode B6 (Flow Walk)

- `[number]` (e.g., `1`, `3`) — follow downstream connection N
- `"지도"` / `"map"` — show full downstream tree from starting point
- `"비교"` / `"compare"` — compare current construct across projects
- `"체인"` / `"chain"` — authority chain for current construct
- `"뒤로"` / `"back"` — return to previous flow block (breadcrumb)

---

### Gotchas — Mode B

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

### When to Read More

| Need | Read |
|------|------|
| Project analysis protocol | `references/project-analysis-guide.md` |
| Full philosophy (WHY, DESIGN-authority) | `~/harness-upstream/ssot/palantir/ontology/decision-model.md` (scan `ssot/palantir/BROWSE.md` → smallest slice) |
| Digital Twin loop | `~/harness-upstream/ssot/palantir/architecture-center/intent-to-build-flow.md` |
| Flow Walk protocol (B6) | `references/flow-walk-guide.md` |
| DH/HC constants | `~/.claude/schemas/ontology/semantics.ts` |
| Shared protocols | `../_shared/walk-reference.md` |

---

## Mode: build — Small Block (Scene-Based Learning)

Common protocols (Entry Protocol, Navigation, Research Lookup) live in
`../_shared/walk-reference.md` — load that first.

Each scene follows the SENSE → CHALLENGE → REVIEW → LEARN loop. The user
learns by DOING, not reading.

### Output Mode Detection

| Signal | Mode | Format |
|--------|------|--------|
| "scene N", entity building | **Scene** | SENSE + CHALLENGE → (wait) → REVIEW + LEARN |
| "review해줘", "작성했어" | **Review** | REVIEW + LEARN for current scene |
| "19개 타입 알려줘", browsing | **Reference Walk** | Categorized list with NL |
| "DH-DATA-01 알려줘", constant | **Block Walk** | Code block + NL + context |
| "왜 LOGIC이야?", question | **Inline Answer** | 3-4 sentences + continue? |

### Phase: SENSE

Present ONE schema interface per scene.

```
## Scene N — "[Story sentence]"

[1-2 sentences: reality framing + SH-01 domain classification]

### Schema
[Code block — ONE relevant interface/type from types.ts]

### NL Translation
[Line-by-line table — only NEW or FIRST-SEEN lines]
```

### Phase: CHALLENGE

Generate a scaffold file at `exercises/scene-{N}-{name}.ts` with:
- Correct `import type` with NL comments
- Property blocks with empty values (`""`, `___`)
- NL comments on every structural line
- Candidate lists as comments
- baseType reference table

Then STOP. Wait for the user. Do NOT fill in the values.

### Phase: REVIEW (triggered by user)

1. Read `exercises/scene-{N}-{name}.ts` (user's code)
2. Read `solutions/scene-{N}-{name}.solution.ts` (reference)
3. Scan for user questions in `//` comments
4. Structural check: interface compliance
5. Semantic check: DH-* heuristics
6. HC violations check
7. Write `reviews/scene-{N}-review.md`
8. Output LEARN feedback

### Comment Q&A Detection

Scan for `?`, `// Q:`, `// 질문:`, `// 왜`, `// TODO:` patterns.
Answer each in context with line number and DH/HC citation.

### Phase: LEARN

```
LEARN (Scene N)
 ├─ [Check]: ✓ [correct]
 ├─ [Check]: ✗ [wrong]
 │   → [HC/DH-ID]: [rule]
 └─ NEXT: [fix] → then "다음"
```

**CONVERGED** → advance. **RETRY** → user fixes.

When CONVERGED: copy to `ontology/`, update `ontology/schema.ts`, show Tracker.

### Scene Maps

Read `references/scene-maps.md` for the 12-scene progression.
Structure: DATA(2) → LOGIC(4) → ACTION(1) → VERIFY(1) → LEARN(3) → VERIFY(1).

### Progressive Narrative

1. **1 entity per scene.** Never 2+ in one turn.
2. **Story-driven.** Narrative beat, not heading.
3. **Incremental.** Only NEW explanations.
4. **~60 lines of prose** per scene (excluding code).
5. **User writes, Claude reviews.** Never generate FOR the user.

### Triple Concept Budget

Every SENSE ends with 3 concepts:

| Track | Rule |
|-------|------|
| **TS** | `satisfies`, branded types, `as const`, discriminated unions |
| **Bun** | `bun test`, ESM import, `Bun.file()` |
| **Ontology** | BROWSE.md → Grep → restructure into teaching content |

### Research Enrichment (internal)

1. Map concept → file via BROWSE.md
2. Grep specific marker (~500 tokens)
3. Restructure into teaching content — learner NEVER sees `§` marker IDs

### Compact Cycle Tracker

```
╔═ {Domain} ════════════════════════════════════╗
║ Scene 3/12: LOGIC — first LinkType             ║
║ DATA: E1 ✅ E2 ✅ | LOGIC: ▶                   ║
║ Twin: Stage 1 (Snapshot)                        ║
╚════════════════════════════════════════════════╝
```

### Difficulty Detection

Perfect first attempt → deepen: "Since you nailed this, add a ValueConstraint
to ensure price > 0? (DH-DATA-07)"

---

### Block Walk — Semantic Context

For constant lookups (DH/HC), not in scene or project mode:

1. **Code block** — constant definition with NL translation
2. **Enforcement chain** — DH → HC → test
3. **Cross-domain connections** — does this affect other domains?
4. **Project impact** — "When building ontology, you'd encounter this when..."
5. **3 connected blocks** — for learning progression

### Reference Walk

For list/browsing: categorized list with NL, no scene structure.

### Inline Answer

Quick concept questions: 3-4 sentences, then "계속 진행할까요?"

---

### Navigation Commands — Mode A

- `"다음"` — next scene (after CONVERGED)
- `"review해줘"` / `"검토해줘"` / `"작성했어"` — trigger REVIEW
- `"검증"` / `"verify"` — jump to verification scene
- `"뒤로"` / `"back"` — previous scene
- `"힌트"` / `"hint"` — directional hint, no solution

---

### Gotchas — Mode A

- **Never write exercise code FOR the user.** The CHALLENGE says "write it",
  then STOP and WAIT.
- **Review against BOTH interface AND DH/HC.** Structural compliance alone
  is not enough.
- **Difficulty detection**: Perfect first attempts get deepened, not
  praised-and-moved-on.

---

### When to Read More

| Need | Read |
|------|------|
| 12-scene progression | `references/scene-maps.md` |
| Full philosophy (WHY, DESIGN-authority) | `~/harness-upstream/ssot/palantir/ontology/decision-model.md` (scan `ssot/palantir/BROWSE.md` → smallest slice) |
| Digital Twin loop | `~/harness-upstream/ssot/palantir/architecture-center/intent-to-build-flow.md` |
| DH/HC constants | `~/.claude/schemas/ontology/semantics.ts` |
| Shared protocols | `../_shared/walk-reference.md` |
