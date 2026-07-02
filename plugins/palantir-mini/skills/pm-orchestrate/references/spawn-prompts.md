# Agent Spawn Prompt Templates

> Note: `model:` param is NEVER passed at Agent spawn — frontmatter `model:` is the single source of truth (Model policy). [Applied — defect #2 internalized in orchestrate skill, removed 2026-04-19]

These templates are used in Phase 5 (EXECUTE) to spawn implementer agents.
Each agent gets exclusive file ownership to prevent conflicts.

## Core Principle

Every spawn prompt MUST include:
1. **Reasoning-effort directive (mandatory first line)** — "[Operate at maximum reasoning effort — be thorough, verify your own work.]"
2. **EXCLUSIVE ownership declaration** — "You are editing {FILE}. No other agent will touch it."
3. **Context from DECIDE phase** — what the user chose to delete/keep/modify
4. **Specific changes** — not vague instructions, but exact entity/function names
5. **Explicit KEEP list** — what NOT to touch (prevents over-eager cleanup)
6. **Verification command** — "After edits, verify with {VALIDATION_CMD}"

---

## Implementer Agent Template (Ontology Layer)

```
Agent({
  subagent_type: "implementer",
  name: "impl-{filename-without-ext}",
  run_in_background: true,
  prompt: `[Operate at maximum reasoning effort — be thorough, verify your own work.]

You are editing {ABSOLUTE_FILE_PATH}. You have EXCLUSIVE ownership
of this file — no other agent will touch it.

## Context
{SUMMARY_OF_USER_DECISIONS_FROM_DECIDE_PHASE}

## TASK

### DELETE:
{LIST_OF_ITEMS_TO_DELETE_WITH_NAMES}

### ADD/MODIFY:
{LIST_OF_CHANGES_WITH_SPECIFICATIONS}

### KEEP (Do NOT touch):
{EXPLICIT_LIST_OF_ITEMS_TO_PRESERVE}

## IMPORTANT
- Read the file first before editing.
- Keep {SPECIFIC_PATTERN} syntax intact (e.g., "satisfies", ".map(normalizer)").
- After edits, verify with \`bunx tsc --noEmit\`.
- If the file uses empty arrays after deletion, keep the normalizer pattern:
  e.g., \`[].map(normalizeX)\` not just \`[]\``
})
```

---

## Implementer Agent Template (Backend Layer)

```
Agent({
  subagent_type: "implementer",
  name: "impl-{layer}-{filename}",
  run_in_background: true,
  prompt: `[Operate at maximum reasoning effort — be thorough, verify your own work.]

You are editing {ABSOLUTE_FILE_PATH}. You have EXCLUSIVE ownership.

## Context
The ontology layer has been cleaned. These entities/mutations/queries no longer
exist in ontology: {LIST_OF_DELETED_ONTOLOGY_ITEMS}

## TASK

### DELETE exports:
{LIST_OF_FUNCTIONS_TO_DELETE}

### FIX:
{SPECIFIC_FIXES_WITH_CODE_SNIPPETS}

### KEEP:
{EXPLICIT_KEEP_LIST}

## IMPORTANT
- Read the file first.
- If deleting a function that other functions reference (e.g., scheduler calls),
  also clean up those references.
- Keep all other exports unchanged.
- After edits, verify with \`bunx tsc --noEmit\`.`
})
```

---

## Implementer Agent Template (Frontend Layer)

```
Agent({
  subagent_type: "implementer",
  name: "impl-src-cleanup",
  run_in_background: true,
  prompt: `[Operate at maximum reasoning effort — be thorough, verify your own work.]

You are cleaning up {SRC_DIRECTORY}/ to remove all references to
deleted features. The ontology and backend layers have already been cleaned.

## What Was Deleted
{COMPREHENSIVE_LIST_OF_DELETED_ITEMS}

## What Is KEPT (Do NOT touch)
{COMPREHENSIVE_LIST_OF_KEPT_ITEMS}

## TASK
### Step 1: Search for all references
Run grep commands to find all files referencing deleted items.

### Step 2: For each file found
- Entire file is deleted-feature-only → DELETE the file
- Reference is an import line → remove just that import
- Reference is a mutation/query call → remove the call and dependent UI
- Reference is in a type → remove just that member

### Step 3: Verify
Run \`bunx tsc --noEmit\` after all changes.

## IMPORTANT
- Do NOT delete core view components (they still render, just without DB writes)
- Do NOT remove references to KEPT items
- Be careful with generated types — only remove references to deleted items`
})
```

---

## Explore Agent Template (Phase 2 Audit)

```
Agent({
  subagent_type: "Explore",
  name: "{domain}-domain-audit",
  run_in_background: true,
  prompt: <use templates from audit-prompts.md>
})
```

Note: Explore agents are read-only. They cannot edit files.

---

## Phase Gate Pattern

After ALL agents in a phase complete:

```
// 1. Mark tasks completed
TaskUpdate({ taskId: "N", status: "completed" })

// 2. Run phase gate
Bash({ command: "bunx tsc --noEmit 2>&1 | head -20" })

// 3. If errors from cross-cutting references, Lead fixes directly
Edit({ file_path: "...", old_string: "...", new_string: "..." })

// 4. If clean, spawn next phase
// (repeat spawn pattern for Phase B/C/D)
```

---

## Parallel Spawn Pattern

Always spawn ALL agents for a phase in a SINGLE message:

```
// GOOD: Single message with multiple Agent calls → true parallel
Agent({ name: "impl-data", ... })     // ← all in one message
Agent({ name: "impl-logic", ... })
Agent({ name: "impl-action", ... })

// BAD: Separate messages → sequential, slow
Agent({ name: "impl-data", ... })     // message 1
// wait for response
Agent({ name: "impl-logic", ... })    // message 2 — NOT parallel
```
