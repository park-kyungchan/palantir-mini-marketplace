---
ruleId: 20
slug: swarm-orchestration-mode
scope: global
version: 1.0.0
invariant: "Lead selects the lowest-overhead mode that satisfies the task's risk and scope: Lead-direct < Quick Sprint < Full Sprint < Agent Teams; explicit harness species selection is reserved for cross-species orchestration."
supersededBy: null
supersedes: []
crossRefs: [12, 16, 24]
hookCitations: []
bodyLocCeiling: 50
---

# Rule 20 — Swarm Orchestration Mode

palantir-mini Brain dispatches across 5 harness species (rule 16 v4.0.0 §0). Within the Claude Code CLI species, Lead selects an orchestration mode per task. Picking an oversized mode wastes tokens and adds gate friction; underpicking skips safety checks on risky work.

## §Mode ladder (ascending overhead)

| Mode | When to use | Contract required | Dry-run check |
|------|------------|-------------------|---------------|
| **Lead-direct** | Read-only, single-file, trivial edit, docs | Quick Sprint (auto-bootstrapped) | No |
| **Quick Sprint** | Hot-fix, single feature, ≤1 iteration expected | Yes (1-iter, mode=quick) | No |
| **Full Sprint** | Multi-file feature, risky semantic change, ≥2 iters expected | Yes (mode=full) | Yes |
| **Agent Teams** | Parallel fan-out, disjoint file ownership, explicit user request | Yes per team member | Yes |
| **Explicit species** | Cross-species orchestration (e.g. Agent SDK harness species) | Species-native contract | Species-native |

## §Selection rules

- Default to Lead-direct; B2 auto-bootstraps a Quick Sprint gate so the substrate is always present.
- Escalate to Full Sprint when: multi-file edits, semantic schema changes, or dry-run grade is needed.
- Agent Teams only when user explicitly requests parallel execution OR task set has provably disjoint ownership (rule 12 §Team default + Lazy-spawn).
- Explicit species selection (non-Claude Code CLI) is Lead-only; document rationale in `lead-guidance.md`.

## §Cross-ref to dispatch router

- Rule 24 (lead-dispatch-router) provides the canonical flowchart for Brain-of-Swarms dispatch decisions.
- Rule 12 §Model policy governs model assignments within any mode.
- Rule 16 §Default-On Policy defines B2 gate mechanics that apply to Quick Sprint and above.

## §Anti-patterns

- Defaulting to Full Sprint for every task (gate overhead exceeds task cost).
- Spawning Agent Teams when single-file Lead-direct suffices.
- Using explicit harness species selection without documenting why the CLI species is insufficient.
