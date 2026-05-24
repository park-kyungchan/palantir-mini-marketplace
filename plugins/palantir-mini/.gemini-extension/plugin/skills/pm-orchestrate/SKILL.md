---
name: pm-orchestrate
category: core-workflow
description: "Ontology-Driven work orchestration for complex multi-step tasks. Enforces a 6-phase protocol: Deep Context Injection, Parallel Domain Audit, User Scope Decision, Task DAG..."
argument-hint: "task description"
context: standard
model: opus
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, Agent, TaskCreate, TaskList, TaskUpdate, TaskGet, SendMessage, mcp__palantir-mini__pm_preamble, mcp__palantir-mini__replay_lineage, mcp__palantir-mini__emit_event, mcp__palantir-mini__apply_edit_function, mcp__palantir-mini__commit_edits, mcp__palantir-mini__capability_token_check, mcp__palantir-mini__get_ontology, mcp__palantir-mini__impact_query, mcp__palantir-mini__pre_edit_impact, mcp__palantir-mini__pm_retro_query, mcp__palantir-mini__pm_learn_query, mcp__palantir-mini__detect_doc_drift, mcp__palantir-mini__get_team_health
effort: high
disable-model-invocation: false
---

# Orchestrate — Ontology-Driven 6-Phase Lead Protocol v1.0

> Note: `model:` param is NEVER passed at Agent spawn — frontmatter `model:` is the single source of truth per rule 12 §Model policy. [Applied — defect #2 fix, 2026-04-19]

This skill replaces ad-hoc orchestration with a rigorous, observable protocol
derived from proven Ontology-Driven sessions. The Lead (Opus) never codes directly
unless fixing cross-cutting issues between phases. All execution is delegated to
parallel Sonnet agents with exclusive file ownership.

palantir-mini v1.0 is the substrate — every phase gate emits events, every task
dispatch flows through plugin MCP, and every session is replayable via
`events.jsonl` Decision Lineage.

## Why This Protocol Exists

Traditional orchestration starts coding immediately. This protocol front-loads
understanding — the Lead injects full project context, runs parallel domain audits,
collects user decisions on scope, THEN decomposes and executes. This prevents:
- Whack-a-Mole fixes (patching symptoms, not causes)
- Wasted work on features the user doesn't need
- Agent conflicts from overlapping file edits
- Late-stage failures caught only at the end

## Pre-Protocol: Detect Project Type

Before entering Phase 0, detect the project structure:

```
if ontology/*.ts exists:
  → Ontology-Driven mode (full 6-phase with domain audits)
  → Authority chain: ontology/ → convex/ or backend/ → src/
  → Phase gates: tsc + ontology:drift between layers

if no ontology/ but has structured layers (e.g., api/ + client/):
  → Layer-Driven mode (6-phase with layer audits instead of domain audits)
  → Authority chain: types/ or schema/ → api/ → client/

if flat project:
  → Simplified mode (skip Phase 2 audit, go INJECT → DECIDE → DECOMPOSE → EXECUTE → VALIDATE)
```

---

## Phase 0: CHECK — Prior Session Lookup

**Purpose**: Avoid re-discovering what prior orchestrations already decided.

**Check sequence**:

1. **events.jsonl** — when `.palantir-mini/session/` exists, call:
   ```
   mcp__palantir-mini__replay_lineage({
     project: "<project-root>",
     filter: { types: ["session_start", "phase_completed", "task_created"] }
   })
   ```
   This returns prior session phase completions and task decompositions. If a
   `session_start` event exists with `status: "active"` for the current git SHA,
   the session is resumable.

2. **Scratch session file**: `.orchestrate/session/latest.json` — fallback when
   plugin replay is unavailable. If it exists and matches the current git state,
   the session is resumable.

3. **MEMORY.md**: any `project` or `feedback` memory entries tagged with
   "orchestrate" — durable lessons from prior runs.

4. **Recent commit log**: `git log --oneline -10`.

**Decision tree**:

- **Fresh task, no prior state** → Skip to Phase 1 INJECT.
- **Resumable session found** (events.jsonl has active session at current git SHA,
  user confirms this is the continuation) → Skip to the last incomplete phase.
- **Prior session exists but git state differs** → Treat as reference only. Load
  prior decisions to avoid repeating analysis; run Phase 1 INJECT fresh.
- **Memory captures lessons learned** → Load into Lead's context before Phase 1.

**Event emission** (after decision):
```
mcp__palantir-mini__emit_event({
  project: "<project-root>",
  envelope: {
    eventId: "orch-<uuid>",
    type: "session_start",
    when: "<ISO-timestamp>",
    atopWhich: "<current-git-sha>",
    throughWhich: "/orchestrate Phase 0 CHECK",
    byWhom: "Lead (Opus)",
    withWhat: { decision: "<fresh|resume|reference>", summary: "<one-line>" }
  }
})
```

**Output**: One sentence stating what Phase 0 found. Examples:
- "No prior orchestrate session. Starting fresh."
- "Resumable session (events.jsonl active at SHA abc1234). Jumping to Phase 5."
- "Prior session at abc1234 (git state differs). Loaded 4 decisions. Running Phase 1 fresh."

---

## Phase 1: INJECT — Deep Context Injection

**Purpose**: The Lead must understand the ENTIRE semantic landscape before any work.

**The Lead reads (in order)**:
1. Project CLAUDE.md + .claude/rules/* — already per-turn injected.
   → rules/12-semantic-surface.md is the Digital Twin if present. Already loaded.
2. BROWSE.md — already per-turn injected (@import in CLAUDE.md). Do not re-read.
3. ontology/*.ts — supplement semantic surface with details not captured there.
   Skip full reads of files whose contracts are already in semantic surface.
4. MEMORY.md — prior session context.
5. ontology/BEHAVIOR.md — behavioral deep reference (read when task involves
   user-facing behavior).
6. Key runtime files (types/, generated/, lib/runtimeScope, lib/frontendScope).

**Per-turn injection rule**: Items 1-2 are already in the Lead's baseline context
at session start. Phase 1 reads focus on ON-DEMAND files (items 3-6).

**Event emission** (at phase completion):
```
mcp__palantir-mini__emit_event({
  project: "<project-root>",
  envelope: {
    eventId: "orch-phase1-<uuid>",
    type: "phase_completed",
    when: "<ISO-timestamp>",
    atopWhich: "<git-sha>",
    throughWhich: "/orchestrate Phase 1 INJECT",
    byWhom: "Lead (Opus)",
    withWhat: { phase: 1, name: "INJECT", filesRead: [...], summary: "..." }
  }
})
```

**Completion signal**: Lead outputs "Context injection complete. Ready for
instructions." and waits for the user's task. Do NOT start working until the
user gives a task.

**Key rule**: Semantic surface first, then ontology details. If no semantic
surface exists, read all ontology files in chunks (200 lines each).

---

## Phase 2: AUDIT — Parallel Domain Analysis

**Purpose**: Before changing anything, understand what's right, wrong, drifted, or dead.

### Cache check (run first)

Before spawning Explore agents, check `events.jsonl` for recent audit events at
the current git SHA:

```
mcp__palantir-mini__replay_lineage({
  project: "<project-root>",
  filter: { types: ["phase_completed"], atopWhich: "<current-sha>" }
})
```

If Phase 2 AUDIT events exist for the current SHA with audit findings:
- **Cache hit**: load findings directly, skip spawning Explore agents.
- **Stale / no cache**: fall through to full audit. Emit Phase 2 completion event
  with fresh findings afterward to update the cache.

Also check `.orchestrate/cache/audit-<git-sha>.json` as a fallback:

```json
{
  "gitSha": "abc1234",
  "capturedAt": "<ISO>",
  "filesAnalyzed": ["ontology/data.ts", ...],
  "findings": { "DATA": [...], "LOGIC": [...], "ACTION": [...], "LEARN": [...] }
}
```

### Full audit (on cache miss)

Spawn 4 Explore agents in parallel (read-only, background):

| Agent | Scope | Checks |
|-------|-------|--------|
| DATA | ontology/data.ts ↔ schema ↔ src/types | Entity/struct coverage, field mismatches, dead types |
| LOGIC | ontology/logic.ts ↔ queries | Query semantic drift, unused links/derived/functions |
| ACTION | ontology/action.ts ↔ mutations | Param drift, missing validators, undeclared mutations |
| LEARN+Runtime | schema.ts learn + runtime.ts | Support binding status, audit coverage, dead imports |
| CODEGEN | codegen templates ↔ generated files | readonly field inclusion, mutation type classification, registry sync |
| DOC-INTEGRITY | BROWSE.md refs ↔ disk | Phantom file references, DECLARED-ONLY features now implemented |

Each agent reports findings using severity levels:
- **CRITICAL**: Runtime behavior differs from ontology declaration
- **DRIFT**: Declaration ≠ implementation but runtime works
- **BOTTLENECK**: Declaration exists but feature is unexposed/unimplemented
- **DEAD CODE**: Declaration or implementation exists but never used
- **CLEAN**: Declaration = implementation = actual behavior

Lead synthesizes all reports into a unified findings table.

**Event emission** (after synthesis):
```
mcp__palantir-mini__emit_event({
  project: "<project-root>",
  envelope: {
    eventId: "orch-phase2-<uuid>",
    type: "phase_completed",
    when: "<ISO-timestamp>",
    atopWhich: "<git-sha>",
    throughWhich: "/orchestrate Phase 2 AUDIT",
    byWhom: "Lead (Opus)",
    withWhat: {
      phase: 2, name: "AUDIT",
      findings: { critical: N, drift: N, bottleneck: N, deadCode: N },
      summary: "..."
    }
  }
})
```

See [references/audit-prompts.md](references/audit-prompts.md) for exact prompt templates.

---

## Phase 3: DECIDE — User Scope Collection

**Purpose**: The user decides what to keep, delete, or improve. Never assume.

Render a WorkflowContract turn-card decision with structured options:

1. **"What do you actually use?"** (multiSelect) — list discovered features.
2. **"For unused features: keep for later or delete?"** (multiSelect).
3. **Clarification round** (if needed) — re-explain complex features in plain language.

See [references/ask-templates.md](references/ask-templates.md) for question patterns.

**Key rules**:
- Always explain features in user-friendly language (not internal API names).
- Collect explicit delete/preserve/improve decisions before any code changes.
- The user's conversation language is their preferred language; all code/commits stay English.

**Event emission** (after user decisions collected):
```
mcp__palantir-mini__emit_event({
  project: "<project-root>",
  envelope: {
    eventId: "orch-phase3-<uuid>",
    type: "phase_completed",
    when: "<ISO-timestamp>",
    atopWhich: "<git-sha>",
    throughWhich: "/orchestrate Phase 3 DECIDE",
    byWhom: "Lead (Opus)",
    withWhat: {
      phase: 3, name: "DECIDE",
      decisions: { keep: [...], delete: [...], improve: [...] },
      summary: "..."
    }
  }
})
```

---

## Phase 4: DECOMPOSE — Task DAG with Phase Gates

**Purpose**: Break work into tasks following the authority chain, with dependencies.

### Authority Chain (fixed order)
```
Phase A: ontology/*.ts  (parallel by file — each agent owns exactly 1 file)
  ↓ tsc gate
Phase B: backend/ or convex/  (parallel by file)
  ↓ tsc gate
Phase C: src/  (single agent or parallel by directory)
  ↓ codegen + tsc + drift + test gate
Phase D: Documentation + Validation
```

### Task Creation Pattern

For Tier-1 tasks (≤50 LOC, single file, no cross-file reasoning), dispatch via
the plugin action primitive rather than spawning an implementer agent:

```
mcp__palantir-mini__apply_edit_function({
  project: "<project-root>",
  functionName: "<edit-function-name>",
  params: { ... }
})
```

For Tier-2 tasks (complex, multi-file, requires architectural judgment), use
TaskCreate and spawn an implementer agent:

```
TaskCreate({ subject: "...", description: "File: <exclusive-path> ..." })
mcp__palantir-mini__emit_event({
  project: "<project-root>",
  envelope: {
    eventId: "orch-task-<uuid>",
    type: "task_created",
    when: "<ISO-timestamp>",
    atopWhich: "<git-sha>",
    throughWhich: "/orchestrate Phase 4 DECOMPOSE",
    byWhom: "Lead (Opus)",
    withWhat: {
      taskId: "<id>",
      tier: "Tier-1|Tier-2",
      fileOwnership: "<exclusive-path>",
      blockedBy: [...],
      dagLevel: "A|B|C|D",
      summary: "..."
    }
  }
})
```

Emit one `task_created` event per TaskCreate call. Emit a `phase_completed`
event after the full DAG is described.

### Task Description Requirements
Every TaskCreate description MUST include:
- **File**: Exact path with EXCLUSIVE ownership declaration
- **DELETE**: What to remove (with entity/function names)
- **ADD/MODIFY**: What to change (with field specifications)
- **KEEP**: Explicit list of what NOT to touch
- **VERIFY**: "After edits, verify with `bunx tsc --noEmit`"

### Task Tier Classification

- **Tier-1 (declarative, lightweight)**: ≤50 LOC, single file, no cross-file
  reasoning. Dispatch via `mcp__palantir-mini__apply_edit_function`. Skip heavy
  context reads — give only exact DELETE/ADD/KEEP/VERIFY.

- **Tier-2 (function-backed, full context)**: Complex, multi-file, requires
  architectural judgment. Spawn full implementer agent with semantic surface,
  prior audit findings, and cross-file context.

**Phase 4 event emission**:
```
mcp__palantir-mini__emit_event({
  project: "<project-root>",
  envelope: {
    eventId: "orch-phase4-<uuid>",
    type: "phase_completed",
    when: "<ISO-timestamp>",
    atopWhich: "<git-sha>",
    throughWhich: "/orchestrate Phase 4 DECOMPOSE",
    byWhom: "Lead (Opus)",
    withWhat: {
      phase: 4, name: "DECOMPOSE",
      taskCount: N, tier1Count: N, tier2Count: N,
      dagLevels: ["A", "B", "C", "D"],
      summary: "..."
    }
  }
})
```

---

## Phase 5: EXECUTE — Parallel Agents with Phase Gates

**Purpose**: Spawn Sonnet implementer agents per phase, gate between phases.

### Spawn Pattern
```
Agent({
  subagent_type: "implementer",
  name: "impl-{filename}",
  run_in_background: true,
  prompt: <see references/spawn-prompts.md for template>
})
```

### Phase Gate Protocol
After ALL agents in a phase complete:
1. Lead marks tasks completed.
2. Lead runs `bunx tsc --noEmit` (or project typecheck).
3. If errors: Lead fixes cross-cutting issues directly.
4. If clean: emit phase_completed event, then spawn next phase agents.
5. Update TaskUpdate status for each task.

**Phase gate event emission** (between DAG levels A→B, B→C, C→D):
```
mcp__palantir-mini__emit_event({
  project: "<project-root>",
  envelope: {
    eventId: "orch-gate-<uuid>",
    type: "phase_completed",
    when: "<ISO-timestamp>",
    atopWhich: "<git-sha>",
    throughWhich: "/orchestrate Phase 5 EXECUTE gate A→B",
    byWhom: "Lead (Opus)",
    withWhat: {
      phase: 5, name: "EXECUTE",
      gateFrom: "A", gateTo: "B",
      tscResult: "PASS|FAIL",
      tasksCompleted: [...],
      summary: "..."
    }
  }
})
```

### Lead's Role During Execution
- Monitor agent completion notifications.
- Mark tasks completed immediately (never batch).
- Fix issues OUTSIDE agent scope (cross-file references, imports).
- **Create new files directly** — pre-create empty files before spawning agents
  for new file creation, or handle as Lead-direct work.
- Do NOT duplicate agent work.
- Do NOT re-read files agents just edited (trust their verification).

See [references/spawn-prompts.md](references/spawn-prompts.md) for templates.

---

## Phase 6: VALIDATE — Full Pipeline Verification

**Purpose**: Run the complete validation pipeline and summarize.

### Validation via palantir-mini v1.0

Run `/pm-verify` (6-phase pipeline: Design + Compile + Runtime + Post-Write + Deploy + Merge):

```
/pm-verify
```

`/pm-verify` is the primary validation entry point. It covers:
- **Design** — schemas/ontology/ structural sanity
- **Compile** — `bunx tsc --noEmit`
- **Runtime** — submission criteria pre-flight
- **Post-Write** — drift check (schema_mismatch | stale_codegen | orphan_reference)
- **Deploy** — branch state + CI green verification
- **Merge** — post-merge drift + schema lock + codegen determinism recheck

After `/pm-verify`, run project-specific checks not covered by the pipeline:
```bash
bun run ontology:gen:write     # Regenerate typed registries
bun run ontology:drift         # Verify ontology alignment (if available)
bun test                       # All tests
```

### Final Report
Summarize in a table:
- Total tasks completed
- Items deleted / modified / added
- Validation results (pass/fail counts)
- Pre-existing failures vs new failures (must be 0 new)

### Documentation Sync
If session modified ontology, mutations, surface ownership, data flow, or behavior:
- Update `.claude/rules/12-semantic-surface.md` (Digital Twin)
- Update `ontology/BEHAVIOR.md` (if behavior changed)
- Update `BROWSE.md` domain snapshot and architecture
- Update `MEMORY.md` session summary and runtime state
- Update `ontology/INDEX.md` current status

Or: suggest user run `/ship` for full doc finalization + commit + PR + merge.

**Phase 6 event emission**:
```
mcp__palantir-mini__emit_event({
  project: "<project-root>",
  envelope: {
    eventId: "orch-phase6-<uuid>",
    type: "phase_completed",
    when: "<ISO-timestamp>",
    atopWhich: "<git-sha>",
    throughWhich: "/orchestrate Phase 6 VALIDATE",
    byWhom: "Lead (Opus)",
    withWhat: {
      phase: 6, name: "VALIDATE",
      pmVerifyResult: "PASS|FAIL",
      tscResult: "PASS|FAIL",
      testResult: "PASS|FAIL",
      driftResult: "PASS|FAIL|SKIPPED",
      tasksTotal: N,
      summary: "..."
    }
  }
})
```

### Memory Update (if significant)
If the session produced learnings worth preserving:
- Update relevant memory/ files.
- Update MEMORY.md index.

---

## Execution Mode Selection

Not every task needs all 6 phases. The Lead chooses:

| Task Signal | Mode | Phases Used |
|-------------|------|-------------|
| "Analyze the codebase" | Audit-only | 0 → 1 → 2 → report |
| "Clean up dead code" | Full 6-phase | 0 → 1 → 2 → 3 → 4 → 5 → 6 |
| "Add feature X" | Design + Execute | 0 → 1 → 3 → 4 → 5 → 6 |
| "Fix this bug" | Targeted | 0 → 1 → 4 → 5 → 6 |
| Simple 1-file fix | Lead-Direct | Skip orchestrate entirely |

---

## Principles (why each rule exists)

- **Phase 1 INJECT cannot be skipped, even for "familiar" codebases.** Phase 0
  CHECK minimizes the cost of this discipline via events.jsonl replay — use it,
  do not skip it. Shortcutting creates whack-a-mole fixes.

- **Coding before Phase 3 DECIDE wastes user attention.** If the Lead pre-solves
  for a feature the user plans to delete, the user now must explain why the
  pre-solved work is wrong. Asking is cheap. Re-explaining is expensive.

- **Two agents editing the same file creates non-deterministic merges.** File
  ownership must be disjoint and declared before spawn. Merge two tasks or split
  the file first if they conceptually share a file.

- **Task completions must be marked immediately.** Batched completion creates
  windows where the DAG blocking relationship is wrong. The mark is cheap; the
  confusion from skipping it is expensive.

- **Blind retry of failed agent work almost always fails again.** A failed agent
  is a diagnostic signal — read output, identify root cause, fix at the right
  layer.

- **Some work is faster for the Lead than for an agent.** One-line cross-file
  reference fixes, import path adjustments — if the Lead can describe and verify
  in under 30 seconds of context-free attention, do it directly.

- **Every phase transition must be auditable.** The `phase_completed` event
  emission is not optional ceremony — it is what enables future sessions to
  skip re-discovery via `/pm-replay`. The 5 Decision Lineage dimensions
  (`when`, `atopWhich`, `throughWhich`, `byWhom`, `withWhat`) must be populated
  for every emitted event.

---

## palantir-mini v1.0 Integration

palantir-mini v1.0 provides 10 MCP tools, 15 hooks, 6-phase validation, and
L2/L3 RBAC. The orchestration protocol maps onto these capabilities as follows:

| Phase | palantir-mini v1.0 surface |
|-------|---------------------------|
| Phase 0 CHECK | `mcp__palantir-mini__replay_lineage` — prior session event query |
| Phase 1 INJECT | `mcp__palantir-mini__get_ontology` — canonical ontology snapshot |
| Phase 2 AUDIT | `mcp__palantir-mini__replay_lineage` — cached audit findings at SHA |
| Phase 3 DECIDE | `mcp__palantir-mini__emit_event` — record user decisions |
| Phase 4 DECOMPOSE | `mcp__palantir-mini__apply_edit_function` (Tier-1) + `emit_event` per task |
| Phase 5 EXECUTE | `mcp__palantir-mini__commit_edits` + `capability_token_check` (L2) |
| Phase 6 VALIDATE | `/pm-verify` (6-phase pipeline) + `emit_event` phase_completed |

### Mechanical Enforcement via Hooks (v1.0)

Plugin hooks enforce Principles mechanically:
- **TaskCreated hook** — rejects duplicate file-ownership declarations across tasks
- **TaskCompleted hook** — rejects batched completions
- **PreCompact hook** — blocks mid-phase compaction when ontology invariants unresolved
- **TeammateIdle hook** — throttles deeply-blocked agents (3-tier: silent → warn → stop)
- **SubagentStop hook** — captures agent completion state to events.jsonl

### L2 Capability Token Pre-Flight

For operations that touch `schema-write`, `ontology-register`, or `ship-merge`,
call capability_token_check before proceeding:

```
mcp__palantir-mini__capability_token_check({
  project: "<project-root>",
  operation: "schema-write|ontology-register|ship-merge",
  holder: "Lead (Opus)"
})
```

If the check fails, halt and surface the permission error to the user.
