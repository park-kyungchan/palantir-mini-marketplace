---
name: pm-investigate
category: core-workflow
surfaceStatus: public-core
description: "Systematic root-cause debugging. Four phases — investigate, analyze, hypothesize,..."
allowed-tools: Bash Read Write Edit Grep Glob Agent mcp__palantir-mini__pm_substrate_query mcp__palantir-mini__impact_query mcp__palantir-mini__emit_event WebSearch
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->

# /palantir-mini:pm-investigate — Systematic Debugging

## Iron Law

**NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST.**

Fixing symptoms creates whack-a-mole debugging. Every fix that doesn't address root
cause makes the next bug harder to find. Find the root cause, then fix it.

Call `mcp__palantir-mini__pm_substrate_query` (mode `session-opener`) once at session start to load project-specific
debugging context (test commands, known-fragile areas, recent incidents).

---

## Phase 1: Root Cause Investigation

Gather context before forming any hypothesis.

1. **Collect symptoms.** Read the error messages, stack traces, and reproduction
   steps. If the user hasn't provided enough context, ask ONE question at a time
   via.

2. **Read the code.** Trace the code path from the symptom back to potential
   causes. Use Grep to find all references, Read to understand the logic.

3. **Check recent changes.**

   ```bash
   git log --oneline -20 -- <affected-files>
   ```

   Was this working before? What changed? A regression means the root cause is
   in the diff.

4. **Reproduce.** Can you trigger the bug deterministically? If not, gather more
   evidence before proceeding.

5. **Check investigation history.** Search prior learnings for investigations on
   the same files. Call `mcp__palantir-mini__pm_substrate_query` (mode `learn`) with
   `{ mode: "learn", query: "<affected-file or component name>", limit: 20 }` and look for entries
   with `type: "investigation"`. Recurring bugs in the same area are an
   architectural smell — if prior investigations exist, note patterns and check
   if the root cause was structural.

6. **Check BackwardProp trace.** If the bug involves ontology drift, contract
   mismatch, or runtime behavior that used to work, call
   `mcp__palantir-mini__pm_substrate_query` (mode `lineage`) with a 5-dim filter keyed on the affected
   surface (e.g., `throughWhich: "<skill-or-tool>"`) to see what events led to
   the current state. For ontology/schema drift specifically, also suggest
   running `/palantir-mini:pm-verify` to detect invariant violations before
   continuing.

7. **Check impact graph.** If the symptom crosses module boundaries, call
   `mcp__palantir-mini__impact_query` with the affected file path to see what
   upstream/downstream dependencies are wired in. Unexpected dependents are a
   common root-cause signal.

Output: **"Root cause hypothesis: ..."** — a specific, testable claim about what
is wrong and why.

---

## Scope Lock

After forming your root cause hypothesis, lock edits to the affected module to
prevent scope creep.

Identify the narrowest directory containing the affected files, then instruct the
user (or yourself, if the session permits) to run `/palantir-mini:pm-guard` with
that directory. The guard skill will block Edit/Write outside the boundary until
the freeze-dir state file is removed.

Tell the user: "Edits are restricted to `<dir>/` for this debug session. This
prevents changes to unrelated code. Remove the freeze-dir state file to lift
the restriction."

If the bug spans the entire repo or the scope is genuinely unclear, skip the lock
and note why.

---

## Phase 2: Pattern Analysis

Check if this bug matches a known pattern:

| Pattern | Signature | Where to look |
|---------|-----------|---------------|
| Race condition | Intermittent, timing-dependent | Concurrent access to shared state |
| Nil/null propagation | NoMethodError, TypeError | Missing guards on optional values |
| State corruption | Inconsistent data, partial updates | Transactions, callbacks, hooks |
| Integration failure | Timeout, unexpected response | External API calls, service boundaries |
| Configuration drift | Works locally, fails in staging/prod | Env vars, feature flags, DB state |
| Stale cache | Shows old data, fixes on cache clear | Redis, CDN, browser cache, Turbo |
| Ontology drift | Runtime rejects previously-valid input | Schema version bump, missing migration |
| Codegen drift | Generated file out of sync with ontology | `src/generated/*` — regenerate, don't hand-edit |

Also check:

- `TODOS.md` for related known issues.
- `git log` for prior fixes in the same area — **recurring bugs in the same files
  are an architectural smell**, not a coincidence.
- For ontology/schema drift candidates, route to `/palantir-mini:pm-verify` before
  forming a code-level hypothesis. A schema pin mismatch (see
  `~/.claude/rules/08-schema-versioning.md`) looks like a runtime bug but is a
  layer violation.

**External pattern search.** If the bug doesn't match a known pattern above,
WebSearch for:

- `{framework} {generic error type}` — **sanitize first:** strip hostnames, IPs,
  file paths, SQL, customer data. Search the error category, not the raw message.
- `{library} {component} known issues`

If WebSearch is unavailable, skip this search and proceed with hypothesis testing.
If a documented solution or known dependency bug surfaces, present it as a
candidate hypothesis in Phase 3.

---

## Phase 3: Hypothesis Testing

Before writing ANY fix, verify your hypothesis.

1. **Confirm the hypothesis.** Add a temporary log statement, assertion, or debug
   output at the suspected root cause. Run the reproduction. Does the evidence
   match?

2. **If the hypothesis is wrong:** Before forming the next hypothesis, consider
   searching for the error. **Sanitize first** — strip hostnames, IPs, file
   paths, SQL fragments, customer identifiers, and any internal/proprietary data
   from the error message. Search only the generic error type and framework
   context: `{component} {sanitized error type} {framework version}`. If the
   error message is too specific to sanitize safely, skip the search. If
   WebSearch is unavailable, skip and proceed. Then return to Phase 1. Gather
   more evidence. Do not guess.

3. **3-strike rule.** If 3 hypotheses fail, **STOP**. Use:

   ```
   3 hypotheses tested, none match. This may be an architectural issue
   rather than a simple bug.

   A) Continue investigating — I have a new hypothesis: [describe]
   B) Escalate for human review — this needs someone who knows the system
   C) Add logging and wait — instrument the area and catch it next time
   ```

**Red flags** — if you see any of these, slow down:

- "Quick fix for now" — there is no "for now." Fix it right or escalate.
- Proposing a fix before tracing data flow — you're guessing.
- Each fix reveals a new problem elsewhere — wrong layer, not wrong code.
- Patching runtime when the diff shows ontology or schema changes — route to
  `/palantir-mini:pm-verify` instead (see `~/.claude/rules/01-ontology-first-core.md`:
  "do not patch runtime first when the issue is semantic").

---

## Phase 4: Implementation

Once root cause is confirmed:

1. **Fix the root cause, not the symptom.** The smallest change that eliminates
   the actual problem.

2. **Minimal diff.** Fewest files touched, fewest lines changed. Resist the urge
   to refactor adjacent code.

3. **Write a regression test** that:
   - **Fails** without the fix (proves the test is meaningful).
   - **Passes** with the fix (proves the fix works).

4. **Run the full test suite.** Paste the output. No regressions allowed.

5. **If the fix touches generated files:** STOP. Never edit `src/generated/*`
   directly — regenerate via `/palantir-mini:pm-codegen` (see
   `~/.claude/rules/08-schema-versioning.md §Codegen authority`). If regenerating doesn't produce
   the fix, the root cause is upstream in the ontology input.

6. **If the fix touches >5 files:** Use to flag the blast radius:

   ```
   This fix touches N files. That's a large blast radius for a bug fix.
   A) Proceed — the root cause genuinely spans these files
   B) Split — fix the critical path now, defer the rest
   C) Rethink — maybe there's a more targeted approach
   ```

---

## Phase 5: Verification & Report

**Fresh verification.** Reproduce the original bug scenario and confirm it's
fixed. This is not optional.

Run the test suite and paste the output.

Output a structured debug report:

```
DEBUG REPORT
════════════════════════════════════════
Symptom:         [what the user observed]
Root cause:      [what was actually wrong]
Fix:             [what was changed, with file:line references]
Evidence:        [test output, reproduction attempt showing fix works]
Regression test: [file:line of the new test]
Related:         [TODOS.md items, prior bugs in same area, architectural notes]
Status:          DONE | DONE_WITH_CONCERNS | BLOCKED
════════════════════════════════════════
```

---

## Emit investigation event

Log the investigation as a `learning_captured` event for future sessions. Use
`mcp__palantir-mini__emit_event` with payload:

```json
{
  "type": "learning_captured",
  "skill": "pm-investigate",
  "learning": {
    "key": "<ROOT_CAUSE_KEY>",
    "type": "investigation",
    "insight": "<one-sentence root cause summary>",
    "confidence": 9,
    "source": "observed",
    "files": ["<affected/file1>", "<affected/file2>"]
  }
}
```

The event carries the 5 Decision Lineage dimensions automatically (see
`~/.claude/rules/10-events-jsonl.md`). Future `/palantir-mini:pm-investigate`
invocations on the same files will surface this entry via the Phase 1 prior-
investigation check.

---

## Important Rules

- **3+ failed fix attempts → STOP and question the architecture.** Wrong
  architecture, not failed hypothesis.
- **Never apply a fix you cannot verify.** If you can't reproduce and confirm,
  don't ship it.
- **Never say "this should fix it."** Verify and prove it. Run the tests.
- **If fix touches >5 files →** about blast radius before
  proceeding.
- **Never edit generated files.** Regenerate via `/palantir-mini:pm-codegen`
  (`~/.claude/rules/08-schema-versioning.md §Codegen authority`).
- **Route semantic issues up the authority chain.** Ontology/schema drift goes
  through `/palantir-mini:pm-verify` before any runtime patch
  (`~/.claude/rules/01-ontology-first-core.md`).
- **Events are append-only.** The investigation-event emit call appends; it
  never rewrites `events.jsonl` (`~/.claude/rules/10-events-jsonl.md`).
- **Completion status:**
  - **DONE** — root cause found, fix applied, regression test written, all
    tests pass.
  - **DONE_WITH_CONCERNS** — fixed but cannot fully verify (e.g., intermittent
    bug, requires staging).
  - **BLOCKED** — root cause unclear after investigation, escalated.
