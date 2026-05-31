---
name: pm-walk-build
category: research
surfaceStatus: public-core
description: "Mode A (Small Block): Build ontology entities step by step using scene-based..."
effort: medium
disable-model-invocation: false
---

# Palantir Walk Build — Mode A: Small Block (Scene-Based Learning)

Common protocols (Entry Protocol, Navigation, Research Lookup) live in
`../_shared/walk-reference.md` — load that first.

Each scene follows the SENSE → CHALLENGE → REVIEW → LEARN loop. The user
learns by DOING, not reading.

## Output Mode Detection

| Signal | Mode | Format |
|--------|------|--------|
| "scene N", entity building | **Scene** | SENSE + CHALLENGE → (wait) → REVIEW + LEARN |
| "review해줘", "작성했어" | **Review** | REVIEW + LEARN for current scene |
| "19개 타입 알려줘", browsing | **Reference Walk** | Categorized list with NL |
| "DH-DATA-01 알려줘", constant | **Block Walk** | Code block + NL + context |
| "왜 LOGIC이야?", question | **Inline Answer** | 3-4 sentences + continue? |

## Phase: SENSE

Present ONE schema interface per scene.

```
## Scene N — "[Story sentence]"

[1-2 sentences: reality framing + SH-01 domain classification]

### Schema
[Code block — ONE relevant interface/type from types.ts]

### NL Translation
[Line-by-line table — only NEW or FIRST-SEEN lines]
```

## Phase: CHALLENGE

Generate a scaffold file at `exercises/scene-{N}-{name}.ts` with:
- Correct `import type` with NL comments
- Property blocks with empty values (`""`, `___`)
- NL comments on every structural line
- Candidate lists as comments
- baseType reference table

Then STOP. Wait for the user. Do NOT fill in the values.

## Phase: REVIEW (triggered by user)

1. Read `exercises/scene-{N}-{name}.ts` (user's code)
2. Read `solutions/scene-{N}-{name}.solution.ts` (reference)
3. Scan for user questions in `//` comments
4. Structural check: interface compliance
5. Semantic check: DH-* heuristics
6. HC violations check
7. Write `reviews/scene-{N}-review.md`
8. Output LEARN feedback

## Comment Q&A Detection

Scan for `?`, `// Q:`, `// 질문:`, `// 왜`, `// TODO:` patterns.
Answer each in context with line number and DH/HC citation.

## Phase: LEARN

```
LEARN (Scene N)
 ├─ [Check]: ✓ [correct]
 ├─ [Check]: ✗ [wrong]
 │   → [HC/DH-ID]: [rule]
 └─ NEXT: [fix] → then "다음"
```

**CONVERGED** → advance. **RETRY** → user fixes.

When CONVERGED: copy to `ontology/`, update `ontology/schema.ts`, show Tracker.

## Scene Maps

Read `references/scene-maps.md` for the 12-scene progression.
Structure: DATA(2) → LOGIC(4) → ACTION(1) → VERIFY(1) → LEARN(3) → VERIFY(1).

## Progressive Narrative

1. **1 entity per scene.** Never 2+ in one turn.
2. **Story-driven.** Narrative beat, not heading.
3. **Incremental.** Only NEW explanations.
4. **~60 lines of prose** per scene (excluding code).
5. **User writes, Claude reviews.** Never generate FOR the user.

## Triple Concept Budget

Every SENSE ends with 3 concepts:

| Track | Rule |
|-------|------|
| **TS** | `satisfies`, branded types, `as const`, discriminated unions |
| **Bun** | `bun test`, ESM import, `Bun.file()` |
| **Ontology** | BROWSE.md → Grep → restructure into teaching content |

## Research Enrichment (internal)

1. Map concept → file via BROWSE.md
2. Grep specific marker (~500 tokens)
3. Restructure into teaching content — learner NEVER sees `§` marker IDs

## Compact Cycle Tracker

```
╔═ {Domain} ════════════════════════════════════╗
║ Scene 3/12: LOGIC — first LinkType             ║
║ DATA: E1 ✅ E2 ✅ | LOGIC: ▶                   ║
║ Twin: Stage 1 (Snapshot)                        ║
╚════════════════════════════════════════════════╝
```

## Difficulty Detection

Perfect first attempt → deepen: "Since you nailed this, add a ValueConstraint
to ensure price > 0? (DH-DATA-07)"

---

## Block Walk — Semantic Context

For constant lookups (DH/HC), not in scene or project mode:

1. **Code block** — constant definition with NL translation
2. **Enforcement chain** — DH → HC → test
3. **Cross-domain connections** — does this affect other domains?
4. **Project impact** — "When building ontology, you'd encounter this when..."
5. **3 connected blocks** — for learning progression

## Reference Walk

For list/browsing: categorized list with NL, no scene structure.

## Inline Answer

Quick concept questions: 3-4 sentences, then "계속 진행할까요?"

---

## Navigation Commands — Mode A

- `"다음"` — next scene (after CONVERGED)
- `"review해줘"` / `"검토해줘"` / `"작성했어"` — trigger REVIEW
- `"검증"` / `"verify"` — jump to verification scene
- `"뒤로"` / `"back"` — previous scene
- `"힌트"` / `"hint"` — directional hint, no solution

---

## Gotchas — Mode A

- **Never write exercise code FOR the user.** The CHALLENGE says "write it",
  then STOP and WAIT.
- **Review against BOTH interface AND DH/HC.** Structural compliance alone
  is not enough.
- **Difficulty detection**: Perfect first attempts get deepened, not
  praised-and-moved-on.

---

## When to Read More

| Need | Read |
|------|------|
| 12-scene progression | `references/scene-maps.md` |
| Full philosophy | `~/.claude/research/palantir/philosophy/README.md` |
| Digital Twin loop | `~/.claude/research/palantir/philosophy/digital-twin.md` |
| DH/HC constants | `~/.claude/schemas/ontology/semantics.ts` |
| Shared protocols | `../_shared/walk-reference.md` |
