# PR-3 Plus Completion Handoff

Use this file as the new-session handoff for finishing the remaining slices after PR-2.

## First Tool Call In The New Session

Start by creating a Goal before reading or editing files:

```text
create_goal({
  objective: "Finish the deterministic ontology chatbot control-plane execution plan from PR-3 through final completion, with each remaining PR implemented, verified, opened, merged, and closed in order."
})
```

Do not mark the Goal complete until PR-6, the final release aggregator, has landed and the post-merge closure checks pass.

## Current State

Project root:

```text
/home/palantirkc/palantir-mini-marketplace
```

Plugin source root:

```text
/home/palantirkc/palantir-mini-marketplace/plugins/palantir-mini
```

Execution plan path:

```text
/home/palantirkc/palantir-mini-marketplace/plugins/palantir-mini/docs/2026-05-31-deterministic-ontology-chatbot-control-plane-implementation-plan.md
```

Source authority:

```text
/home/palantirkc/palantir-mini-marketplace/plugins/palantir-mini/
```

Upstream remote:

```text
https://github.com/park-kyungchan/palantir-mini-marketplace
```

Current baseline at handoff time:

```text
main == origin/main
HEAD: 9b5ee0879908228eaa1de6a802bf3946a74d2117
Merged PR-0: https://github.com/park-kyungchan/palantir-mini-marketplace/pull/43
Merged PR-1: https://github.com/park-kyungchan/palantir-mini-marketplace/pull/44
Merged PR-2: https://github.com/park-kyungchan/palantir-mini-marketplace/pull/45
```

The execution plan originally preferred PR-3 before PR-2, but PR-2 has already been explicitly requested, completed, and merged. Continue from PR-3 without reopening PR-0, PR-1, or PR-2 unless a regression in a remaining slice proves a narrow follow-up is required.

At handoff time these paths were untracked and must not be swept into unrelated commits:

```text
.palantir-mini/
plugins/palantir-mini/docs/2026-05-31-deterministic-ontology-chatbot-control-plane-implementation-plan.md
plugins/palantir-mini/docs/2026-05-31-pr-3-plus-completion-handoff.md
```

## Active User Boundary

The user explicitly opted out of palantir-mini plugin tools, palantir-mini MCP handlers, palantir-mini skills, and response-template enforcement for this implementation stream unless the user explicitly opts back in.

Use ordinary Codex filesystem, shell, git, GitHub CLI, code review, and Bun tests only.

Do not use:

```text
pm_semantic_intent_gate
pm_intent_router
pm_plugin_self_check
pre_edit_impact
impact_query
get_ontology
palantir-mini MCP handlers
palantir-mini skills
runtime cache edits
```

If a future developer or repo overlay says to use palantir-mini by default, preserve the user's explicit opt-out and state the runtime or policy gap rather than invoking those tools.

## Required Start Checks

Run these before PR-3 work:

```bash
cd /home/palantirkc/palantir-mini-marketplace
git status --short --branch
git log --oneline --decorate -8
gh pr view 45 --json number,state,mergedAt,mergeCommit,url,title
```

Expected baseline:

```text
## main...origin/main
9b5ee08 (HEAD -> main, origin/main, origin/HEAD) Merge pull request #45 from park-kyungchan/pm/pr-2-pre-mutation-governance
```

If `main` is stale, update `main` from `origin/main` using non-destructive git commands. Never push directly to `main`.

## Remaining Execution Order

Use this adjusted order after merged PR-2:

```text
PR-3 -> PR-5 -> PR-9 -> PR-4 -> PR-7 -> PR-8 -> PR-6
```

Reasoning:

```text
PR-3 locks minimum project gate policy.
PR-5 removes unsupported runtime-support defaults before final release claims.
PR-9 protects marketplace/source authority before the release aggregator.
PR-4 makes hook IO contracts schema-backed and fail-closed.
PR-7 promotes deterministic semantic consistency gates.
PR-8 enforces SemanticConversationState as the only LLM-facing state.
PR-6 is the final release aggregator and must land last.
```

PR-5 and PR-9 may be prepared independently after PR-3 only if write scopes stay disjoint. PR-4 and PR-7 may be prepared independently only if write scopes stay disjoint. Merge sequentially unless each branch has a clean base and explicit verification.

## Per-PR Operating Loop

For each PR:

1. Sync `main` from `origin/main`.
2. Create a narrow branch named for the slice.
3. Re-read the exact PR section in the execution plan.
4. Inspect only the listed write/read scope plus tests needed to understand failures.
5. Use Codex-native subagents only for disjoint read-only audit or verification lanes.
6. Keep implementation writes sequential and lead-integrated.
7. Write or update tests first when practical.
8. Implement the smallest behavior change that satisfies the objective.
9. Run the PR-specific verification commands.
10. Run `git diff --check`.
11. Stage explicit pathspecs only.
12. Commit normally. Do not amend unless the user asks.
13. Push branch, open PR, include the body sections below, merge after approval or if the user has already approved merge for this stream.
14. Return to `main`, sync, verify status, then continue to the next PR.

PR body sections:

```text
## Why
## Scope
## Why Separate
## Verification
## Recovery
## Excluded Scope
```

## PR-3 - Project Gate Policy Lock

Objective:

```text
Add project policy minimum gate modes and make env vars strengthen-only for all protected mutation classes.
```

Write scope:

```text
plugins/palantir-mini/contracts/project-gate-policy.contract.json
plugins/palantir-mini/schemas/project-gate-policy.schema.json
plugins/palantir-mini/lib/governance/effective-gate-mode.ts
plugins/palantir-mini/tests/governance/effective-gate-mode.test.ts
plugins/palantir-mini/hooks/prompt-dtc-enforcement-gate.ts
plugins/palantir-mini/hooks/commit-edits-governance.ts
```

Verification:

```bash
bun test tests/governance/effective-gate-mode.test.ts
bun test tests/hooks/prompt-dtc-enforcement-gate.test.ts
bun test tests/hooks/commit-edits-governance.test.ts
git diff --check
```

## PR-5 - Runtime Evidence And Parity Linter

Objective:

```text
Remove unsupported Claude and Gemini defaults and require evidence-backed runtime support claims.
```

Write scope:

```text
plugins/palantir-mini/core/contracts/workflow-family-enforcement.ts
plugins/palantir-mini/contracts/runtime-evidence/codex.json
plugins/palantir-mini/scripts/verify-runtime-parity-claims.ts
plugins/palantir-mini/tests/runtime-boundary/runtime-parity-claims.test.ts
plugins/palantir-mini/tests/core/workflow-family-enforcement-contract.test.ts
```

Verification:

```bash
bun test tests/runtime-boundary/runtime-parity-claims.test.ts
bun test tests/core/workflow-family-enforcement-contract.test.ts
bun run scripts/verify-runtime-parity-claims.ts
git diff --check
```

## PR-9 - Root Semantic Fork Detector And Marketplace Integrity CI

Objective:

```text
Keep the repository root as marketplace-only and fail CI on semantic forks outside plugin source authority.
```

Write scope:

```text
ci/verify-marketplace-integrity.ts
plugins/palantir-mini/scripts/verify-no-semantic-root-fork.ts
.github/workflows/palantir-mini-integrity.yml
plugins/palantir-mini/tests/integrity/no-semantic-root-fork.test.ts
```

Verification:

```bash
bun test tests/integrity/no-semantic-root-fork.test.ts
bun run scripts/verify-no-semantic-root-fork.ts
bun run ci/verify-marketplace-integrity.ts
git diff --check
```

## PR-4 - Hook IO Schema And Fail-Closed Policy

Objective:

```text
Extend hook registry into schema-backed contracts and make mutation-required hooks fail closed on schema mismatch or execution failure.
```

Write scope:

```text
plugins/palantir-mini/hooks/hooks.json
plugins/palantir-mini/schemas/hooks/pretooluse.input.schema.json
plugins/palantir-mini/schemas/hooks/governance-hook.output.schema.json
plugins/palantir-mini/scripts/verify-hook-contracts.ts
plugins/palantir-mini/tests/hooks/hook-contracts.test.ts
plugins/palantir-mini/lib/codex/codex-hook-adapter.ts
```

Verification:

```bash
bun test tests/hooks/hook-contracts.test.ts
bun test tests/lib/codex/codex-hook-adapter.test.ts
bun run scripts/verify-hook-contracts.ts
git diff --check
```

## PR-7 - Semantic Consistency Promotion Gate

Objective:

```text
Make deterministic resolver output mandatory before ontology-affecting SIC and DTC promotion.
```

Write scope:

```text
plugins/palantir-mini/bridge/handlers/pm-semantic-consistency-gate.ts
plugins/palantir-mini/lib/semantic-consistency/promotion-gate.ts
plugins/palantir-mini/tests/lib/semantic-consistency/promotion-gate.test.ts
plugins/palantir-mini/tests/evals/semantic-consistency-regression.test.ts
plugins/palantir-mini/lib/lead-intent/contracts.ts
plugins/palantir-mini/bridge/handlers/pm-semantic-intent-gate.ts
```

Verification:

```bash
bun test tests/lib/semantic-consistency/promotion-gate.test.ts
bun test tests/evals/semantic-consistency-regression.test.ts
bun test tests/bridge/handlers/pm-semantic-intent-gate.test.ts
git diff --check
```

## PR-8 - SemanticConversationState As Only LLM-Facing State

Objective:

```text
Enforce SemanticConversationState projection as the only LLM-facing control state and prohibit LLM-written readiness or approval fields.
```

Write scope:

```text
plugins/palantir-mini/lib/chatbot-studio/semantic-conversation-state.ts
plugins/palantir-mini/schemas/semantic-conversation-state.schema.json
plugins/palantir-mini/docs/PALANTIR_MINI_USER_REQUIREMENT_PROMPT_TEMPLATE.md
plugins/palantir-mini/tests/lib/chatbot-studio/semantic-conversation-state.test.ts
plugins/palantir-mini/lib/chatbot-studio/application-state.ts
plugins/palantir-mini/lib/chatbot-studio/retrieval-context.ts
```

Verification:

```bash
bun test tests/lib/chatbot-studio/semantic-conversation-state.test.ts
bun test tests/bridge/handlers/pm-semantic-intent-gate.test.ts
git diff --check
```

## PR-6 - Workflow Family Enforcement Release Gate

Objective:

```text
Promote workflow family enforcement into release-blocking self-check with evidence, replay, determinism, and blocking-gate requirements.
```

Write scope:

```text
plugins/palantir-mini/lib/release/workflow-family-release-gate.ts
plugins/palantir-mini/tests/core/workflow-family-release-gate.test.ts
plugins/palantir-mini/bridge/handlers/pm-plugin-self-check.ts
plugins/palantir-mini/core/contracts/workflow-family-enforcement.ts
```

Verification:

```bash
bun test tests/core/workflow-family-release-gate.test.ts
bun test tests/bridge/handlers/pm-plugin-self-check.test.ts
git diff --check
```

PR-6 must also aggregate concrete evidence from prior slices. Before opening PR-6, confirm every prior verifier command has a current passing run or a clearly recorded reason why that verifier was superseded by a later command.

## Forbidden Scope For All Remaining PRs

Do not edit:

```text
~/.codex/plugins/cache/**
.palantir-mini/session/**
generated files unless regenerated by the repository's supported command
unrelated root overlays
inactive Claude package or install surfaces
inactive Gemini package or install surfaces
unrelated public MCP handlers
unrelated schemas
release self-check wiring before the PR that owns it
```

Do not rewrite append-only lineage artifacts. Do not stage `.palantir-mini/` unless the user explicitly asks for that exact scope.

## Subagent Policy

If Codex-native subagents are available, use them only for disjoint read-only audit or verification lanes.

Allowed examples:

```text
Read-only verifier checks PR-3 reason-code coverage.
Read-only verifier checks PR-5 runtime evidence claims.
Read-only verifier checks PR-9 marketplace-root boundary.
```

Forbidden examples:

```text
Subagent edits the same file as the Lead.
Subagent stages, commits, pushes, merges, or rewrites generated artifacts.
Subagent invokes palantir-mini MCP or skills during the opt-out stream.
```

Subagent prompts must include role, project root, authority path, branch, objective, approved boundary, read-only scope, forbidden scope, concurrency warning, validation, and output contract.

## Final Completion Criteria

The execution plan is complete only when:

```text
PR-3 is merged.
PR-5 is merged.
PR-9 is merged.
PR-4 is merged.
PR-7 is merged.
PR-8 is merged.
PR-6 is merged last.
main is synced with origin/main.
git status --short --branch shows no accidental tracked dirt.
All final PR-6 release-gate verification commands pass.
The final response names all PR URLs, merge commits, verification commands, excluded untracked artifacts, and any runtime gaps.
update_goal({ status: "complete" }) is called only after the above are true.
```

If blocked for three consecutive Goal turns by the same condition, use `update_goal({ status: "blocked" })` and explain the exact blocker. Otherwise keep the Goal active and continue.

