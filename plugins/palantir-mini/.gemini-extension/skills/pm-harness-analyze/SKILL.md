---
name: pm-harness-analyze
category: maintenance
description: "Spawn the harness-analyzer agent for a failed sprint iteration. Reads feedback-NNN.md + generator-state.md + scenario outcomes, writes analysis-NNN.md with structured failure..."
allowed-tools: Agent mcp__plugin_palantir-mini_palantir-mini__emit_event mcp__plugin_palantir-mini_palantir-mini__pm_preamble
argument-hint: "<sprint-number> <iteration-number>   (the failed iteration to analyze)"
effort: medium
disable-model-invocation: false
---

# pm-harness-analyze — Synthesize a failed iteration

## When to use

- An iteration verdict is `fail` (per Evaluator feedback-NNN.md) AND iteration counter < iterationLimit.
- User explicitly says "analyze iteration N" / "synthesize the failure" / "what went wrong with iteration N".
- Auto-dispatched by `/palantir-mini:pm-harness-sprint` Phase 2 step 3.5 between iterations.

## When NOT to use

- Iteration passed (no failure to synthesize).
- Iteration is the final allowed (analyzer's recommendations cannot be acted on; abort is the only path).
- Sprint was aborted by user (`/palantir-mini:pm-harness-abort`).
- Sprint never started (no iterations exist).

## Prerequisites

- Sprint dir exists: `<project>/.palantir-mini/harness/sprints/sprint-<NNN>/`
- Bound contract.json + the failed iteration dir `iterations/iteration-<N>/` with at least `feedback-<N>.md` + `generator-state.md`.
- harness-analyzer agent registered (palantir-mini v3.9.0+ W3.0; current v3.11.0).

## Process

1. **Resolve sprint + iteration** — argument is `<sprintNumber> <iterationNumber>`. Validate the iteration dir exists and `feedback-<N>.md` is present.
2. **Spawn harness-analyzer** with the briefing template (rule 12 §Briefing template):
   - **Speed target**: ≤ 10 min per analysis (single iteration scope; do not page through full sprint history unless prior `analysis-N-1.md` indicates pattern).
   - **Claim order**: read inputs in the order specified in agent body §Inputs (contract → feedback → generator-state → outcome.json → prior analysis).
   - **No idle polling directive**: write `analysis-NNN.md`, emit phase_completed event, self-shutdown immediately. Do NOT idle.
   - **Reply-in-text expectation**: respond to Lead with one line: `analysis-<N>.md written; recommendation=<scope>; confidence=<level>`.
3. **Wait for SubagentStop** — analyzer emits `phase_completed` then exits. State machine in pm-harness-sprint reads the recommendation field from analysis-NNN.md.
4. **Read analysis-NNN.md** and surface it to the user (or to the calling pm-harness-sprint Phase 2).

## Output

```
# pm-harness-analyze sprint <NNN> iteration <N> report

Failure category: <category>
Root-cause: <one-line summary>
Patch form: <spec-patch | rubric-patch | generator-hint>
Recommendation: <continue | patch-spec | patch-rubric | abort>
Confidence: <low | medium | high>

Full analysis: .palantir-mini/harness/sprints/sprint-<NNN>/iterations/iteration-<N>/analysis-<N>.md

Next:
  - If recommendation=continue → /palantir-mini:pm-harness-sprint <NNN+1 OR resume>
  - If recommendation=patch-spec → review + edit spec.md, then re-run sprint
  - If recommendation=patch-rubric → review + edit eval-rubric.md, then re-run sprint
  - If recommendation=abort → /palantir-mini:pm-harness-abort <loopId>
```

## Failure modes

- **analyzer recommends abort but Lead disagrees**: Lead reads analysis-NNN.md, decides to override, applies own patch, re-runs sprint. Analyzer's recommendation is advisory.
- **analyzer's patch fails to move score next iteration**: next call to pm-harness-analyze should detect this via the prior `analysis-N-1.md` check and escalate confidence/recommendation accordingly. Lead may need to abort.
- **analyzer cannot read inputs (missing files)**: returns error; Lead investigates whether iteration dir was corrupted or sprint state is broken.

## Rule citations

- `~/.claude/rules/16-3-agent-harness.md` — file-based IPC (analysis-NNN.md is a file artifact, respects rule 16 invariant).
- `~/.claude/rules/12-lead-protocol-v2.md` §Research-over-codegen — analyzer produces blueprint + guidance, not code.
- `~/.claude/rules/12-lead-protocol-v2.md §Briefing template` — speed target / claim order / no-idle / reply-in-text MUST be in the spawn prompt.
- `~/.claude/research/palantir-vision/aipcon-devcon/ai-fde.md` §FDE-05 step 6 — the loop step this skill closes.
- `~/.claude/plugins/palantir-mini/agents/harness-analyzer.md` — agent body + output contract.
- `~/.claude/plans/imperative-drifting-quilt.md` §Slice 3 — Session 3 plan rationale.
