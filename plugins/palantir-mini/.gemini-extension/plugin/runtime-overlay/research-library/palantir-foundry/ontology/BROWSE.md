# palantir-foundry/ontology/ — Query Router

> **Scope:** Official ontology subset currently fetched into this library: Action Types + FoundryTS. 45 official pages plus routing docs.
> **Provenance:** `[Official]` verbatim.

## Open first by question

| Question | File |
|----------|------|
| What is the official Ontology Engineering surface before local synthesis? | `../architecture/ontology-overview.md` plus `../aip/ai-fde-overview.md`, `../dev-toolchain/palantir-mcp-and-ontology-mcp-2026-03-26.md`, `../aip/aip-evals-ontology-edits.md`, `global-branching-overview-2026-05-05.md` |
| What are Action Types overall? | `action-types-overview.md` |
| How do I create my first action type? | `action-types-getting-started.md` |
| How do action parameters, rules, and permissions work? | `action-types-parameter-overview.md`, `action-types-rules.md`, `action-types-permissions.md` |
| How do side effects, notifications, and webhooks work? | `action-types-side-effects-overview.md`, `action-types-notifications.md`, `action-types-webhooks.md` |
| How do function-backed actions work? | `action-types-function-actions-overview.md`, `action-types-function-actions-getting-started.md` |
| What is FoundryTS overall? | `foundryts.md`, `foundryts-foundryts.md` |
| What ontology facts matter for Lead intent-to-Digital-Twin contracts? | `../architecture/ontology-overview.md`, `action-types-overview.md`, `action-types-permissions.md`, `global-branching-overview-2026-05-05.md` |

## Minimal deep-dive sets

### Action modeling

1. `action-types-overview.md`
2. `action-types-getting-started.md`
3. `action-types-permissions.md`

### Lead intent-to-Digital-Twin contract design

1. `../architecture/ontology-overview.md`
2. `action-types-overview.md`
3. `action-types-permissions.md`
4. `global-branching-overview-2026-05-05.md`
5. `../../palantir-vision/architecture-gap/semantic-intent-gate-for-ontology-engineering.md`

### Action side effects

1. `action-types-side-effects-overview.md`
2. `action-types-notifications.md` or `action-types-webhooks.md`

### FoundryTS

1. `foundryts.md`
2. one exact function page

## Explicit coverage boundary

This fetched subset does **not** currently include the full official docs for:

- Object Types
- Link Types
- Functions
- Object Views

Do not infer those concepts are absent upstream; they are simply outside this fetch batch.

## 2026-05-06 W1.A SSoT-1 mirror refresh batch (1 dated file)

| Date anchor | File | Topic |
|-------------|------|-------|
| 2026-05-05 | `global-branching-overview-2026-05-05.md` | Global Branching (formerly Foundry Branching) — cross-application unified branching, end-to-end test on branch, single-click merge. GA week of 2026-05-18 anchor. Approval policies + branch lifecycle. Cross-ref: rule 25 v1.0.0 (auto-merge gates parallel) + rule 16 v4.0.0 §Loop (propose/commit). |
