---
ruleId: 25
slug: auto-merge-cleanup-default
scope: global
version: 1.1.0
invariant: "Allowlisted PR auto-merges by default with branch/worktree cleanup + working-tree cleanliness check + Wave-split discipline (each Wave PR-merge-cleanup before next); opt-out via --no-merge or PALANTIR_MINI_AUTOMERGE_BYPASS=1 (audited)."
supersededBy: null
supersedes: []
crossRefs: []
hookCitations: [post-merge-cleanup, pre-pr-dirty-gate, session-end-cleanup]
bodyLocCeiling: 60
---

# Rule 25 — Auto-Merge + Cleanup Default

User directive 2026-05-03: "특정 작업은 내가 별 말이 없으면 항상 merge하고 worktree/branch까지 정리". Sprint-019 retro identified working-tree pollution + 5-stash accumulation + 0 post-merge automation as root cause. Sprint-055 W2 codifies the dirty-free workflow as 3 hooks + 1 skill + N-manifest discipline. This rule is the behavioral overlay.

## §Default-On Policy

- `pm-ship` Step 21 = hard default-on. PR creation auto-merges when 3-gate passes:
  1. **Branch allowlist**: `^(sprint-|fix/|chore/|docs/)` prefix only. WIP/draft/feature branches require explicit merge.
  2. **isDraft=false** (gh pr view --json isDraft).
  3. **mergeable=MERGEABLE** (gh pr view --json mergeable).
- Failed gate → log + exit 0 (no error; user merges manually).

## §Bypass

- Flag: `pm-ship --no-merge` (skill arg).
- Env: `PALANTIR_MINI_AUTOMERGE_BYPASS=1` (audited via `automerge_bypass_invoked` event).
- Read-only paths (Read/Grep/Glob/pm_rule_query) never trigger this rule.

## §Post-merge actions

`gh pr merge --merge --delete-branch` then: `git worktree prune`, `git checkout main && git pull`, `git branch -d <merged>` (best-effort), audit `git stash list` against expected ≤1.

## §Working-tree cleanliness invariant

- Session-end blocking via `stop-guard.ts` was removed after proving too late and bypass-prone for commit/PR ownership; cleanliness enforcement now belongs to pre-PR gates and explicit ship workflow verification.
- Cleanliness violation advisory (dirty>5 OR stash>1) and 4-axis categorical classification (auto-regen / runtime-substrate / user-WIP / ephemeral) live in `lib/dirty-classify`, consumed by the wired `pre-pr-dirty-gate` + `session-end-cleanup` hooks. The unwired SessionStart wrappers (`session-start-cleanliness`, `session-start-dirty-classify`) were removed (HOOK surface minimalism) — the shared lib retains the logic.
- 5-file user-WIP buffer: between sprints, ≤ 5 user-WIP entries are tolerated (sprint-end transition); strict mode `PALANTIR_MINI_DIRTY_GATE_STRICT=1` blocks above this threshold.
- Plugin cache files MUST be in `.gitignore` (sprint-020 W1 + sprint-055 W2.G extended for tracked-project transcripts).

## §Wave-split policy (v1.1.0)

- A multi-Wave sprint MUST PR-merge-cleanup at each Wave boundary BEFORE the next Wave begins. No carry-over dirty between waves.
- Each Wave PR uses a dedicated branch `sprint-NNN-wM-<topic>-YYYY-MM-DD`. Linear (no overlap, no parallel waves on same sprint).
- At Wave-end, working-tree invariant: `git status --porcelain | wc -l ≤ 5` (5-file user-WIP buffer above) AND `git stash list | wc -l ≤ 1` AND `git worktree list | wc -l == 1`.
- Cross-Wave dirt indicates a process failure — invoke `/palantir-mini:pm-dirty-classify --auto-stage` to triage before next Wave.

## §Auto-regen file ownership (v1.1.0)

| File / glob | Regenerator | Auto-stage policy |
|-------------|-------------|--------------------|
| `.claude/chrome/chrome-native-host` | Claude Code installer | session-end-cleanup auto-stages |
| `palantir-mini/.codex-plugin/plugin.json` | plugin-maintainer N-manifest sync | session-end-cleanup auto-stages |
| `palantir-mini/.cursor-plugin/plugin.json` (if present) | plugin-maintainer N-manifest sync | session-end-cleanup auto-stages |
| `**/src/generated/**` | pm-codegen | NEVER auto-stage; commit manually after codegen |

## §Pre-PR dirty-gate (v1.1.0)

- `pre-pr-dirty-gate` hook fires PreToolUse:Bash on `gh pr create` invocations.
- Blocks when user-WIP files lie OUTSIDE the active sprint scope (env `PALANTIR_MINI_SPRINT_SCOPE=path1,path2` declares scope).
- Bypass: `PALANTIR_MINI_DIRTY_GATE_BYPASS=1` (audited via `dirty_gate_bypass_invoked` event).
- Permissive when no scope can be inferred (advisory only).
