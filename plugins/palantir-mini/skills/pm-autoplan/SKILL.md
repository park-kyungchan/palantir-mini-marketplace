---
name: pm-autoplan
category: core-workflow
description: "Auto-review pipeline — invokes the CEO, eng, and DX review skills sequentially and auto-decides using 6 encoded decision principles. Surfaces taste decisions (close approaches,..."
allowed-tools: Bash Read Write Edit Grep Glob WebSearch Agent mcp__palantir-mini__pm_preamble mcp__palantir-mini__emit_event
effort: high
disable-model-invocation: false
---

# /palantir-mini:pm-autoplan — Auto-Review Pipeline

One command. Rough plan in, fully reviewed plan out.

`/palantir-mini:pm-autoplan` invokes the CEO, eng, and DX review skills sequentially and follows them at full depth — same rigor, same sections, same methodology as running each skill manually. The only difference: intermediate calls are auto-decided using the 6 principles below. Taste decisions (where reasonable people could disagree) are surfaced at a final approval gate.

Start by calling `mcp__palantir-mini__pm_preamble` to load project context.

## Base branch detection

Detect the base branch dynamically:

1. `gh pr view --json baseRefName -q .baseRefName`
2. `gh repo view --json defaultBranchRef -q .defaultBranchRef.name`
3. Fall back to `main` / `master` / `trunk`.

---

## The 6 Decision Principles

These rules auto-answer every intermediate question:

1. **Choose completeness** — Ship the whole thing. Pick the approach that covers more edge cases.
2. **Boil lakes** — Fix everything in the blast radius (files modified by this plan + direct importers). Auto-approve expansions that are in blast radius AND < 1 day AI-assisted effort (< 5 files, no new infra).
3. **Pragmatic** — If two options fix the same thing, pick the cleaner one. 5 seconds choosing, not 5 minutes.
4. **DRY** — Duplicates existing functionality? Reject. Reuse what exists.
5. **Explicit over clever** — 10-line obvious fix > 200-line abstraction. Pick what a new contributor reads in 30 seconds.
6. **Bias toward action** — Merge > review cycles > stale deliberation. Flag concerns but do not block.

**Conflict resolution (context-dependent tiebreakers):**

- **CEO phase:** P1 (completeness) + P2 (boil lakes) dominate.
- **Eng phase:** P5 (explicit) + P3 (pragmatic) dominate.
- **DX phase:** P1 (completeness) + P5 (explicit) dominate.

---

## Decision Classification

Every auto-decision is classified:

**Mechanical** — one clearly right answer. Auto-decide silently.
Examples: run evals (always yes), reduce scope on a complete plan (always no).

**Taste** — reasonable people could disagree. Auto-decide with recommendation, but surface at the final gate. Three natural sources:

1. **Close approaches** — top two are both viable with different tradeoffs.
2. **Borderline scope** — in blast radius but 3-5 files, or ambiguous radius.
3. **Sub-agent disagreements** — a sub-agent review recommends differently and has a valid point.

**User Challenge** — both Claude and an independent reviewer sub-agent agree the user's stated direction should change. This is qualitatively different from taste decisions. When both recommend merging, splitting, adding, or removing features/skills/workflows that the user specified, this is a User Challenge. It is NEVER auto-decided.

User Challenges go to the final approval gate with richer context than taste decisions:

- **What the user said:** (their original direction)
- **What both reviewers recommend:** (the change)
- **Why:** (the reasoning)
- **What context we might be missing:** (explicit acknowledgment of blind spots)
- **If we are wrong, the cost is:** (what happens if the user's original direction was right and we changed it)

The user's original direction is the default. The reviewers must make the case for change, not the other way around.

**Exception:** If both reviewers flag the change as a security vulnerability or feasibility blocker (not a preference), the framing explicitly warns: "Both reviewers believe this is a security/feasibility risk, not just a preference." The user still decides, but the framing is appropriately urgent.

---

## Sequential Execution — MANDATORY

Phases MUST execute in strict order: CEO → Eng → DX.
Each phase MUST complete fully before the next begins.
NEVER run phases in parallel — each builds on the previous.

Between each phase, emit a phase-transition summary and verify that all required outputs from the prior phase are written before starting the next.

---

## What "Auto-Decide" Means

Auto-decide replaces the USER'S judgment with the 6 principles. It does NOT replace the ANALYSIS. Every section in the invoked skill must still be executed at the same depth as the interactive version. The only thing that changes is who answers the: you do, using the 6 principles, instead of the user.

**Two exceptions — never auto-decided:**

1. Premises (Phase 1) — require human judgment about what problem to solve.
2. User Challenges — when both reviewers agree the user's stated direction should change (merge, split, add, remove features/workflows). The user always has context reviewers lack.

**You MUST still:**

- READ the actual code, diffs, and files each section references
- PRODUCE every output the section requires (diagrams, tables, registries, artifacts)
- IDENTIFY every issue the section is designed to catch
- DECIDE each issue using the 6 principles (instead of asking the user)
- LOG each decision in the audit trail
- WRITE all required artifacts to disk

**You MUST NOT:**

- Compress a review section into a one-liner table row
- Write "no issues found" without showing what you examined
- Skip a section because "it does not apply" without stating what you checked and why
- Produce a summary instead of the required output (e.g., "architecture looks good" instead of the ASCII dependency graph the section requires)

"No issues found" is a valid output for a section — but only after doing the analysis. State what you examined and why nothing was flagged (1-2 sentences minimum). "Skipped" is never valid for a non-skip-listed section.

---

## Phase 0: Intake + Restore Point

### Step 1: Capture restore point

Before doing anything, save the plan file's current state to an external file:

```bash
SLUG=$(basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)")
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null | tr '/' '-')
DATETIME=$(date +%Y%m%d-%H%M%S)
mkdir -p .palantir-mini/autoplan
RESTORE_PATH=".palantir-mini/autoplan/${BRANCH}-restore-${DATETIME}.md"
echo "RESTORE_PATH=$RESTORE_PATH"
```

Write the plan file's full contents to the restore path with this header:

```
# /palantir-mini:pm-autoplan Restore Point
Captured: [timestamp] | Branch: [branch] | Commit: [short hash]

## Re-run Instructions
1. Copy "Original Plan State" below back to your plan file
2. Invoke /palantir-mini:pm-autoplan

## Original Plan State
[verbatim plan file contents]
```

Then prepend a one-line HTML comment to the plan file:
`<!-- /palantir-mini:pm-autoplan restore point: [RESTORE_PATH] -->`

### Step 2: Read context

- Read CLAUDE.md, TODOS.md, `git log -30`, `git diff` against the base branch --stat
- Detect UI scope: grep the plan for view/rendering terms (component, screen, form, button, modal, layout, dashboard, sidebar, nav, dialog). Require 2+ matches. Exclude false positives ("page" alone, "UI" in acronyms).
- Detect DX scope: grep the plan for developer-facing terms (API, endpoint, REST, GraphQL, gRPC, webhook, CLI, command, flag, argument, terminal, shell, SDK, library, package, npm, pip, import, require, SKILL.md, skill template, Claude Code, MCP, agent, OpenClaw, action, developer docs, getting started, onboarding, integration, debug, implement, error message). Require 2+ matches. Also trigger DX scope if the product IS a developer tool or if an AI agent is the primary user.

### Step 3: Identify sub-invocations

The sub-invocations will be:

- `/palantir-mini:pm-plan-ceo-review` (always)
- `/palantir-mini:pm-plan-eng-review` (always)
- `/palantir-mini:pm-plan-devex-review` (only if DX scope detected)

Output: "Here is what I am working with: [plan summary]. UI scope: [yes/no]. DX scope: [yes/no]. Starting full review pipeline with auto-decisions."

---

## Phase 1: CEO Review (Strategy & Scope)

Invoke `/palantir-mini:pm-plan-ceo-review` methodology — all sections, full depth.
Override: every → auto-decide using the 6 principles.

**Override rules:**

- Mode selection: SELECTIVE EXPANSION
- Premises: accept reasonable ones (P6), challenge only clearly wrong ones
- **GATE: Present premises to user for confirmation** — this is the ONE that is NOT auto-decided. Premises require human judgment.
- Alternatives: pick highest completeness (P1). If tied, pick simplest (P5). If top 2 are close → mark TASTE DECISION.
- Scope expansion: in blast radius + <1d AI-assisted → approve (P2). Outside → defer to TODOS.md (P3). Duplicates → reject (P4). Borderline (3-5 files) → mark TASTE DECISION.
- All 10 review sections: run fully, auto-decide each issue, log every decision.
- Dual voices: always run an independent reviewer sub-agent via the Agent tool (P6). Run it in foreground. Claude primary review first, then independent sub-agent, then build consensus.

  **Independent CEO sub-agent** (via Agent tool, general-purpose or researcher):
  "Read the plan file at <plan_path>. You are an independent CEO/strategist reviewing this plan. You have NOT seen any prior review. Evaluate:
  1. Is this the right problem to solve? Could a reframing yield 10x impact?
  2. Are the premises stated or just assumed? Which ones could be wrong?
  3. What is the 6-month regret scenario — what will look foolish?
  4. What alternatives were dismissed without sufficient analysis?
  5. What is the competitive risk — could someone else solve this first/better?
  For each finding: what is wrong, severity (critical/high/medium), and the fix."

  Error handling: if the sub-agent fails → "Independent voice unavailable — continuing with primary review."

- Strategy choices: if sub-agent disagrees with a premise or scope decision with valid strategic reason → TASTE DECISION. If both reviews agree the user's stated structure should change → USER CHALLENGE (never auto-decided).

**Required execution checklist (CEO):**

Step 0 (0A-0F) — run each sub-step and produce:

- 0A: Premise challenge with specific premises named and evaluated
- 0B: Existing code leverage map (sub-problems → existing code)
- 0C: Dream state diagram (CURRENT → THIS PLAN → 12-MONTH IDEAL)
- 0C-bis: Implementation alternatives table (2-3 approaches with effort/risk/pros/cons)
- 0D: Mode-specific analysis with scope decisions logged
- 0E: Temporal interrogation (HOUR 1 → HOUR 6+)
- 0F: Mode selection confirmation

Step 0.5 (Dual Voices): Run primary review, then independent sub-agent. Produce CEO consensus table:

```
CEO DUAL VOICES — CONSENSUS TABLE:
═══════════════════════════════════════════════════════════════
  Dimension                           Primary Sub-agent Consensus
  ──────────────────────────────────── ─────── ───────── ─────────
  1. Premises valid?                   —       —         —
  2. Right problem to solve?           —       —         —
  3. Scope calibration correct?        —       —         —
  4. Alternatives sufficiently explored?—      —         —
  5. Competitive/market risks covered? —       —         —
  6. 6-month trajectory sound?         —       —         —
═══════════════════════════════════════════════════════════════
CONFIRMED = both agree. DISAGREE = reviewers differ (→ taste decision).
```

Sections 1-10 — for EACH section, run the evaluation criteria:

- Sections WITH findings: full analysis, auto-decide each issue, log to audit trail
- Sections with NO findings: 1-2 sentences stating what was examined and why nothing was flagged

**Mandatory outputs from Phase 1:**

- "NOT in scope" section with deferred items and rationale
- "What already exists" section mapping sub-problems to existing code
- Error & Rescue Registry table
- Failure Modes Registry table
- Dream state delta
- Completion Summary (full CEO table)

**PHASE 1 COMPLETE.** Emit phase-transition summary:

> **Phase 1 complete.** Primary: [N issues]. Sub-agent: [N concerns]. Consensus: [X/6 confirmed, Y disagreements → surfaced at gate]. Passing to Phase 2.

Do NOT begin Phase 2 until all Phase 1 outputs are written and the premise gate has been passed.

---

**Pre-Phase 2 checklist (verify before starting):**

- [ ] CEO completion summary written to plan file
- [ ] CEO dual voices ran (primary + sub-agent, or noted unavailable)
- [ ] CEO consensus table produced
- [ ] Premise gate passed (user confirmed)
- [ ] Phase-transition summary emitted

## Phase 2: Eng Review + Dual Voices

Invoke `/palantir-mini:pm-plan-eng-review` methodology — all sections, full depth.
Override: every → auto-decide using the 6 principles.

**Override rules:**

- Scope challenge: never reduce (P2)
- Dual voices: always run an independent eng sub-agent (P6)

  **Independent eng sub-agent** (via Agent tool):
  "Read the plan file at <plan_path>. You are an independent senior engineer reviewing this plan. You have NOT seen any prior review. Evaluate:
  1. Architecture: Is the component structure sound? Coupling concerns?
  2. Edge cases: What breaks under 10x load? What is the nil/empty/error path?
  3. Tests: What is missing from the test plan? What would break at 2am Friday?
  4. Security: New attack surface? Auth boundaries? Input validation?
  5. Hidden complexity: What looks simple but is not?
  For each finding: what is wrong, severity, and the fix."
  NO prior-phase context — sub-agent must be truly independent.

- Architecture choices: explicit over clever (P5). If sub-agent disagrees with valid reason → TASTE DECISION. Scope changes both reviews agree on → USER CHALLENGE.
- Evals: always include all relevant suites (P1)
- Test plan: generate artifact at `.palantir-mini/autoplan/${BRANCH}-test-plan-${DATETIME}.md`
- TODOS.md: collect all deferred scope expansions from Phase 1, auto-write

**Required execution checklist (Eng):**

1. Step 0 (Scope Challenge): Read actual code referenced by the plan. Run impact_query on key files (via pm-plan-eng-review). Run complexity check. Produce concrete findings.

2. Step 0.5 (Dual Voices): Produce eng consensus table:

```
ENG DUAL VOICES — CONSENSUS TABLE:
═══════════════════════════════════════════════════════════════
  Dimension                           Primary Sub-agent Consensus
  ──────────────────────────────────── ─────── ───────── ─────────
  1. Architecture sound?               —       —         —
  2. Test coverage sufficient?         —       —         —
  3. Performance risks addressed?      —       —         —
  4. Security threats covered?         —       —         —
  5. Error paths handled?              —       —         —
  6. Deployment risk manageable?       —       —         —
═══════════════════════════════════════════════════════════════
CONFIRMED = both agree. DISAGREE = reviewers differ (→ taste decision).
```

3. Section 1 (Architecture): Produce ASCII dependency graph. Evaluate coupling, scaling, security.

4. Section 2 (Code Quality): Identify DRY violations, naming issues, complexity.

5. **Section 3 (Test Review) — NEVER SKIP OR COMPRESS.**
   - Read the diff or the plan's affected files
   - Build the test diagram: every NEW UX flow, data flow, codepath, branch
   - For EACH item: test type, exist?, gaps?
   - For LLM/prompt changes: which eval suites must run?
   - Auto-deciding test gaps means: identify the gap → decide whether to add a test or defer (with rationale and principle) → log the decision. It does NOT mean skipping the analysis.
   - Write the test plan artifact to disk

6. Section 4 (Performance): Evaluate N+1 queries, memory, caching, slow paths.

**Mandatory outputs from Phase 2:**

- "NOT in scope" section
- "What already exists" section
- Architecture ASCII diagram
- Test diagram mapping codepaths to coverage
- Test plan artifact written to disk
- Failure modes registry with critical gap flags
- Completion Summary
- TODOS.md updates (collected from all phases)

**PHASE 2 COMPLETE.** Emit phase-transition summary:

> **Phase 2 complete.** Primary: [N issues]. Sub-agent: [N concerns]. Consensus: [X/6 confirmed, Y disagreements → surfaced at gate]. Passing to Phase 3 (DX) or Phase 4 (Final Gate).

---

## Phase 3: DX Review (conditional — skip if no developer-facing scope)

Invoke `/palantir-mini:pm-plan-devex-review` methodology — all 8 DX dimensions, full depth.

**Skip condition:** If DX scope was NOT detected in Phase 0, skip this phase entirely.
Log: "Phase 3 skipped — no developer-facing scope detected."

**Override rules:**

- Mode selection: DX POLISH
- Persona: infer from README/docs, pick the most common developer type (P6)
- Competitive benchmark: run searches if WebSearch available, use reference benchmarks otherwise (P1)
- Magical moment: pick the lowest-effort delivery vehicle that achieves the competitive tier (P5)
- Getting started friction: always optimize toward fewer steps (P5, simpler over clever)
- Error message quality: always require problem + cause + fix (P1, completeness)
- API/CLI naming: consistency wins over cleverness (P5)
- DX taste decisions (opinionated defaults vs flexibility): mark TASTE DECISION
- Dual voices: always run an independent DX sub-agent (P6)

  **Independent DX sub-agent** (via Agent tool):
  "Read the plan file at <plan_path>. You are an independent DX engineer reviewing this plan. You have NOT seen any prior review. Evaluate:
  1. Getting started: how many steps from zero to hello world? What is the TTHW?
  2. API/CLI ergonomics: naming consistency, sensible defaults, progressive disclosure?
  3. Error handling: does every error path specify problem + cause + fix + docs link?
  4. Documentation: copy-paste examples? Information architecture? Interactive elements?
  5. Escape hatches: can developers override every opinionated default?
  For each finding: what is wrong, severity (critical/high/medium), and the fix."
  NO prior-phase context — sub-agent must be truly independent.

- DX choices: if sub-agent disagrees with valid developer empathy reasoning → TASTE DECISION. Scope changes both reviews agree on → USER CHALLENGE.

**Required execution checklist (DX):**

1. Step 0 (DX Scope Assessment): Auto-detect product type. Map the developer journey. Rate initial DX completeness 0-10. Assess TTHW.

2. Step 0.5 (Dual Voices): Produce DX consensus table:

```
DX DUAL VOICES — CONSENSUS TABLE:
═══════════════════════════════════════════════════════════════
  Dimension                           Primary Sub-agent Consensus
  ──────────────────────────────────── ─────── ───────── ─────────
  1. Getting started < 5 min?          —       —         —
  2. API/CLI naming guessable?         —       —         —
  3. Error messages actionable?        —       —         —
  4. Docs findable & complete?         —       —         —
  5. Upgrade path safe?                —       —         —
  6. Dev environment friction-free?    —       —         —
═══════════════════════════════════════════════════════════════
CONFIRMED = both agree. DISAGREE = reviewers differ (→ taste decision).
```

3. Passes 1-8: Run each. Rate 0-10. Auto-decide each issue.

4. DX Scorecard: Produce the full scorecard with all 8 dimensions scored.

**Mandatory outputs from Phase 3:**

- Developer journey map
- Developer empathy narrative
- DX Scorecard with all 8 dimension scores
- DX Implementation Checklist
- TTHW assessment with target

**PHASE 3 COMPLETE.** Emit phase-transition summary:

> **Phase 3 complete.** DX overall: [N]/10. TTHW: [N] min → [target] min. Primary: [N issues]. Sub-agent: [N concerns]. Consensus: [X/6 confirmed, Y disagreements → surfaced at gate]. Passing to Phase 4 (Final Gate).

---

## Decision Audit Trail

After each auto-decision, append a row to the plan file using Edit:

```markdown
<!-- AUTONOMOUS DECISION LOG -->
## Decision Audit Trail

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|----------------|-----------|-----------|----------|
```

Write one row per decision incrementally (via Edit). This keeps the audit on disk, not accumulated in conversation context.

---

## Pre-Gate Verification

Before presenting the Final Approval Gate, verify that required outputs were actually produced. Check the plan file and conversation for each item.

**Phase 1 (CEO) outputs:**

- [ ] Premise challenge with specific premises named
- [ ] All applicable review sections have findings OR explicit "examined X, nothing flagged"
- [ ] Error & Rescue Registry table produced (or noted N/A with reason)
- [ ] Failure Modes Registry table produced (or noted N/A with reason)
- [ ] "NOT in scope" section written
- [ ] "What already exists" section written
- [ ] Dream state delta written
- [ ] Completion Summary produced
- [ ] Dual voices ran (or noted unavailable)
- [ ] CEO consensus table produced

**Phase 2 (Eng) outputs:**

- [ ] Scope challenge with actual code analysis
- [ ] Architecture ASCII diagram produced
- [ ] Test diagram mapping codepaths to test coverage
- [ ] Test plan artifact written to disk at `.palantir-mini/autoplan/`
- [ ] "NOT in scope" section written
- [ ] "What already exists" section written
- [ ] Failure modes registry with critical gap assessment
- [ ] Completion Summary produced
- [ ] Dual voices ran (or noted unavailable)
- [ ] Eng consensus table produced

**Phase 3 (DX) outputs — only if DX scope detected:**

- [ ] All 8 DX dimensions evaluated with scores
- [ ] Developer journey map produced
- [ ] Developer empathy narrative written
- [ ] TTHW assessment with target
- [ ] DX Implementation Checklist produced
- [ ] Dual voices ran (or noted unavailable/skipped with phase)
- [ ] DX consensus table produced

**Cross-phase:**

- [ ] Cross-phase themes section written

**Audit trail:**

- [ ] Decision Audit Trail has at least one row per auto-decision (not empty)

If ANY checkbox above is missing, go back and produce the missing output. Max 2 attempts — if still missing after retrying twice, proceed to the gate with a warning noting which items are incomplete. Do not loop indefinitely.

---

## Phase 4: Final Approval Gate

**STOP here and present the final state to the user.**

Present as a message, then use:

```
## /palantir-mini:pm-autoplan Review Complete

### Plan Summary
[1-3 sentence summary]

### Decisions Made: [N] total ([M] auto-decided, [K] taste choices, [J] user challenges)

### User Challenges (both reviewers disagree with your stated direction)
[For each user challenge:]
**Challenge [N]: [title]** (from [phase])
You said: [user's original direction]
Both reviewers recommend: [the change]
Why: [reasoning]
What we might be missing: [blind spots]
If we are wrong, the cost is: [downside of changing]
[If security/feasibility: "⚠ Both reviewers flag this as a security/feasibility risk, not just a preference."]

Your call — your original direction stands unless you explicitly change it.

### Your Choices (taste decisions)
[For each taste decision:]
**Choice [N]: [title]** (from [phase])
I recommend [X] — [principle]. But [Y] is also viable:
  [1-sentence downstream impact if you pick Y]

### Auto-Decided: [M] decisions [see Decision Audit Trail in plan file]

### Review Scores
- CEO: [summary]
- CEO Voices: Primary [summary], Sub-agent [summary], Consensus [X/6 confirmed]
- Eng: [summary]
- Eng Voices: Primary [summary], Sub-agent [summary], Consensus [X/6 confirmed]
- DX: [summary or "skipped, no developer-facing scope"]
- DX Voices: Primary [summary], Sub-agent [summary], Consensus [X/6 confirmed] (or "skipped")

### Cross-Phase Themes
[For any concern that appeared in 2+ phases' dual voices independently:]
**Theme: [topic]** — flagged in [Phase 1, Phase 2]. High-confidence signal.
[If no themes span phases:] "No cross-phase themes — each phase's concerns were distinct."

### Deferred to TODOS.md
[Items auto-deferred with reasons]
```

**Cognitive load management:**

- 0 user challenges: skip "User Challenges" section
- 0 taste decisions: skip "Your Choices" section
- 1-7 taste decisions: flat list
- 8+: group by phase. Add warning: "This plan had unusually high ambiguity ([N] taste decisions). Review carefully." options:

- A) Approve as-is (accept all recommendations)
- B) Approve with overrides (specify which taste decisions to change)
- B2) Approve with user challenge responses (accept or reject each challenge)
- C) Interrogate (ask about any specific decision)
- D) Revise (the plan itself needs changes)
- E) Reject (start over)

**Option handling:**

- A: mark APPROVED, emit review events, suggest `/palantir-mini:pm-ship`
- B: ask which overrides, apply, re-present gate
- C: answer freeform, re-present gate
- D: make changes, re-run affected phases (scope→Phase 1, test plan→Phase 2, DX→Phase 3). Max 3 cycles.
- E: start over

---

## Completion: Emit Review Events

On approval, call `mcp__palantir-mini__emit_event` with three separate event records so `/palantir-mini:pm-ship`'s dashboard recognizes them.

Event 1 — CEO review:

```json
{
  "type": "plan_ceo_review_completed",
  "skill": "pm-plan-ceo-review",
  "status": "clean|issues_open",
  "mode": "SELECTIVE_EXPANSION",
  "via": "pm-autoplan",
  "unresolved": N,
  "critical_gaps": N,
  "scope_proposed": N,
  "scope_accepted": N,
  "scope_deferred": N,
  "commit": "..."
}
```

Event 2 — Eng review:

```json
{
  "type": "plan_eng_review_completed",
  "skill": "pm-plan-eng-review",
  "status": "clean|issues_open",
  "mode": "FULL_REVIEW",
  "via": "pm-autoplan",
  "unresolved": N,
  "critical_gaps": N,
  "issues_found": N,
  "commit": "..."
}
```

Event 3 — DX review (only if Phase 3 ran):

```json
{
  "type": "plan_devex_review_completed",
  "skill": "pm-plan-devex-review",
  "status": "clean|issues_open",
  "mode": "POLISH",
  "via": "pm-autoplan",
  "initial_score": N,
  "overall_score": N,
  "product_type": "TYPE",
  "tthw_current": "TTHW",
  "tthw_target": "TARGET",
  "unresolved": N,
  "commit": "..."
}
```

Dual voice logs (one per phase that ran):

```json
{
  "type": "autoplan_voices",
  "skill": "pm-autoplan",
  "phase": "ceo|eng|dx",
  "source": "primary+subagent|primary-only|subagent-only|unavailable",
  "consensus_confirmed": N,
  "consensus_disagree": N,
  "commit": "..."
}
```

All events carry the 5 Decision Lineage dimensions per `~/.claude/rules/10-events-jsonl.md`.

**Events are append-only.** Never rewrite or truncate `events.jsonl`.

Suggest next step: `/palantir-mini:pm-ship` when ready to create the PR.

---

## Important Rules

- **Never abort.** The user chose /palantir-mini:pm-autoplan. Respect that choice. Surface all taste decisions, never redirect to interactive review.
- **Two gates.** The non-auto-decided Workflow decision records are: (1) premise confirmation in Phase 1, and (2) User Challenges. Everything else is auto-decided using the 6 principles.
- **Log every decision.** No silent auto-decisions. Every choice gets a row in the audit trail.
- **Full depth means full depth.** Do not compress or skip sections. "Full depth" means: read the code the section asks you to read, produce the outputs the section requires, identify every issue, and decide each one. A one-sentence summary of a section is not "full depth" — it is a skip.
- **Artifacts are deliverables.** Test plan artifact, failure modes registry, error/rescue table, ASCII diagrams — these must exist on disk or in the plan file when the review completes.
- **Sequential order.** CEO → Eng → DX. Each phase builds on the last.
- **Events are append-only.** Never rewrite or truncate `events.jsonl`.
