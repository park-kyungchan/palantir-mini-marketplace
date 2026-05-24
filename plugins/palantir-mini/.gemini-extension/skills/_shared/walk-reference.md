# Palantir Walk — Shared Reference

Common protocols shared by `palantir-walk-build` and `palantir-walk-analyze`.
Load this first before applying mode-specific logic.

---

## SSoT Chain

```
~/.claude/research/palantir/   (61 research docs — WHY)
         |
~/.claude/schemas/ontology/    (Meta-Level code — HOW)
         |
~/projects/palantir-math/ontology/      (Production example 1 — WHAT)
~/mathcrew/ontology/            (Production example 2 — WHAT)
         |
Mode A: user builds exercises   |  Mode B: user walks real code
```

## Language Rules

- **English is the primary language** for all technical content.
- Code blocks: English only (TypeScript).
- Korean is a TRANSLATION layer — English technical terms have precise meanings.
- When user writes in Korean, respond in Korean for conversational parts but
  keep technical content in English-primary + Korean translation format.

## Research Lookup System

The research library has 81 files, ~1,205 markers.

### Primary: `~/.claude/research/BROWSE.md`
Already loaded in Entry Protocol. Task-based file selection, Concept-to-File
lookup table, Grep cheatsheet.

### Secondary: `~/.claude/research/INDEX.md`
Full directory tree, canonical constraints, platform timeline.

## Entry Protocol

### Step 0 — Read BROWSE.md (mandatory, every invocation)

```
Read(~/.claude/research/BROWSE.md)    <- FIRST tool call of every session
```

### Step 0.5 — Project-Local Context (when Mode B targets a specific project)

Read the project's ontology files as needed for the selected sub-mode.

### With args — auto-detect mode:

```
/palantir-walk-build                  → Mode A: recommend menu
/palantir-walk-build scene 1          → Mode A: Scene 1
/palantir-walk-build scene N          → Mode A: Scene N
/palantir-walk-build 도서관            → Mode A: library domain
/palantir-walk-build DH-DATA-01       → Block Walk (constant lookup)
/palantir-walk-analyze palantir-math  → Mode B: project overview
/palantir-walk-analyze mathcrew data  → Mode B: Entity Walk (data.ts)
/palantir-walk-analyze mathcrew logic → Mode B: Domain Walk (logic.ts)
/palantir-walk-analyze compare Student → Mode B: Cross-Project Compare
/palantir-walk-analyze chain TeachingScene → Mode B: Authority Chain Walk
/palantir-walk-analyze improve mathcrew → Mode B: Improvement Scan
/palantir-walk-analyze flow MathProblem → Mode B: Flow Walk from construct
```

### Review detection (Mode A):

"review해줘", "작성했어", "검토해줘", "wrote it" → REVIEW phase.

### Without args — recommend menu:

| Track | Start | Why |
|-------|-------|-----|
| **Mode A: Small Block** | | |
| Beginner | Scene 1 | Build an entity from scratch — active learning |
| Browse | `types.ts` | OntologyExports — read the contract |
| Intermediate | `data/schema.ts` | DATA domain rules — most concrete |
| Advanced | `semantics.ts` | Full semantic model — deepest layer |
| **Mode B: Project Analysis** | | |
| Entity Walk | `palantir-math data` | Walk entities one by one with design rationale |
| Domain Walk | `mathcrew logic` | Walk an entire domain file |
| Cross-Project | `compare [entity]` | Same concept in two projects |
| Authority Chain | `chain [entity]` | Research → schema → ontology → runtime |
| Improvement | `improve [project]` | Find gaps, drift, missing LEARN |
| Flow Walk | `flow [construct]` | Trace downstream connections D→L→A→LEARN |

---

## Navigation Commands — Shared

- Any question — pauses, enters Q&A mode, then resumes
- `"모드 전환"` / `"switch mode"` — toggle between Mode A and B

---

## Gotchas (Universal)

These rules matter most — violations produce the biggest quality drops:

- **Research = fetch + restructure**, not cite. Learner NEVER sees raw `§`
  marker IDs.
- **BROWSE.md first** for research lookups. Grep marker only — never Read
  entire research files.
- **Session state** lives in conversation + exercise/ontology files.
