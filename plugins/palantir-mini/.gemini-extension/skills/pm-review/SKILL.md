---
name: pm-review
category: core-workflow
description: "Pre-landing PR review. Analyzes diff against the base branch for SQL safety, LLM..."
allowed-tools: Bash Read Write Edit MultiEdit Grep Glob Agent WebSearch mcp__palantir-mini__pm_preamble mcp__palantir-mini__pm_learn_query
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->

# /palantir-mini:pm-review — Pre-Landing PR Review

You are running the `/palantir-mini:pm-review` workflow. Analyze the current branch's diff against the base branch for structural issues that tests don't catch.

## Base branch detection

Detect the base branch dynamically — do not hardcode `main`. Try these in order:

1. `gh pr view --json baseRefName -q .baseRefName` (if a PR exists for this branch).
2. `gh repo view --json defaultBranchRef -q .defaultBranchRef.name` (repo default).
3. Fall back to the first of `main`, `master`, `trunk` that exists on origin.

Store the result and reference it as "the base branch" in prose, or as `<base>` in code examples below. Every `<base>` placeholder in this skill should be substituted with the detected branch name.

---

## Step 1: Check branch

1. Run `git branch --show-current` to get the current branch.
2. If on the base branch, output: **"Nothing to review — you're on the base branch or have no changes against it."** and stop.
3. Run `git fetch origin <base> --quiet && git diff origin/<base> --stat` to check if there's a diff. If no diff, output the same message and stop.

---

## Step 2: Read the checklist

Read `${CLAUDE_PLUGIN_ROOT}/skills/pm-review/checklist.md` (or the project's `.claude/skills/pm-review/checklist.md` if one exists).

**If the file cannot be read, STOP and report the error.** Do not proceed without the checklist. If no checklist exists yet, use the in-line categories below (SQL & Data Safety, Race Conditions & Concurrency, LLM Output Trust Boundary, Shell Injection, Enum & Value Completeness, Async/Sync Mixing, Column/Field Name Safety, LLM Prompt Issues, Type Coercion, View/Frontend, Time Window Safety, Completeness Gaps, Distribution & CI/CD).

---

## Step 3: Get the diff

Fetch the latest base branch to avoid false positives from stale local state:

```bash
git fetch origin <base> --quiet
```

Run `git diff origin/<base>` to get the full diff. This includes both committed and uncommitted changes against the latest base branch.

---

## Step 4: Critical pass (core review)

Apply the CRITICAL categories from the checklist against the diff:
SQL & Data Safety, Race Conditions & Concurrency, LLM Output Trust Boundary, Shell Injection, Enum & Value Completeness.

Also apply the remaining INFORMATIONAL categories (Async/Sync Mixing, Column/Field Name Safety, LLM Prompt Issues, Type Coercion, View/Frontend, Time Window Safety, Completeness Gaps, Distribution & CI/CD).

**Enum & Value Completeness requires reading code OUTSIDE the diff.** When the diff introduces a new enum value, status, tier, or type constant, use Grep to find all files that reference sibling values, then Read those files to check if the new value is handled. This is the one category where within-diff review is insufficient.

**Search-before-recommending:** When recommending a fix pattern (especially for concurrency, caching, auth, or framework-specific behavior):
- Verify the pattern is current best practice for the framework version in use
- Check if a built-in solution exists in newer versions before recommending a workaround
- Verify API signatures against current docs (APIs change between versions)

Takes seconds, prevents recommending outdated patterns. If WebSearch is unavailable, note it and proceed with in-distribution knowledge.

Follow the output format specified in the checklist. Respect the suppressions — do NOT flag items listed in the "DO NOT flag" section.

---

## Step 5: Fix-First Review

**Every finding gets action — not just critical ones.**

### Step 5a: Classify each finding

For each finding, classify as AUTO-FIX or ASK. Critical findings lean toward ASK; informational findings lean toward AUTO-FIX.

**AUTO-FIX** when:
- The fix is a one-line mechanical substitution with no behavioral ambiguity (typo, missing guard clause, dead import).
- The finding is informational severity AND the corrective patch obviously matches intent.
- The finding does not span multiple files or change public API.

**ASK** when:
- Severity is CRITICAL.
- The fix changes observable behavior, API shape, or transaction boundaries.
- Multiple valid fixes exist and the choice depends on intent.
- Any finding that requires generating a test stub (classify as ASK so the user approves the test file).

**Test stub override:** Any finding that has a `test_stub` field is reclassified as ASK regardless of its original classification. When presenting the ASK item, show the proposed test file path and the test code. The user approves or skips the test creation. If approved, write the fix + test file. Derive the test file path from the finding's `path` using project conventions (`spec/` for RSpec, `__tests__/` for Jest/Vitest, `test_` prefix for pytest, `_test.go` suffix for Go). If the test file already exists, append the new test. Output: `[FIXED + TEST] [file:line] Problem -> fix + test at [test_path]`

### Step 5b: Auto-fix all AUTO-FIX items

Apply each fix directly. For each one, output a one-line summary:
`[AUTO-FIXED] [file:line] Problem → what you did`

### Step 5c: Batch-ask about ASK items

If there are ASK items remaining, present them in one WorkflowContract turn-card decision:

- List each item with a number, the severity label, the problem, and a recommended fix
- For each item, provide options: A) Fix as recommended, B) Skip
- Include an overall RECOMMENDATION

Example format:
```
I auto-fixed 5 issues. 2 need your input:

1. [CRITICAL] app/models/post.rb:42 — Race condition in status transition
   Fix: Add `WHERE status = 'draft'` to the UPDATE
   → A) Fix  B) Skip

2. [INFORMATIONAL] app/services/generator.rb:88 — LLM output not type-checked before DB write
   Fix: Add JSON schema validation
   → A) Fix  B) Skip

RECOMMENDATION: Fix both — #1 is a real race condition, #2 prevents silent data corruption.
```

If 3 or fewer ASK items, you may present individual WorkflowContract turn-card decisions instead of batching.

### Step 5d: Apply user-approved fixes

Apply fixes for items where the user chose "Fix." Output what was fixed.

If no ASK items exist (everything was AUTO-FIX), skip the question entirely.

### Verification of claims

Before producing the final review output:
- If you claim "this pattern is safe" → cite the specific line proving safety
- If you claim "this is handled elsewhere" → read and cite the handling code
- If you claim "tests cover this" → name the test file and method
- Never say "likely handled" or "probably tested" — verify or flag as unknown

**Rationalization prevention:** "This looks fine" is not a finding. Either cite evidence it IS fine, or flag it as unverified.

---

## Step 5.5: TODOS cross-reference

Read `TODOS.md` in the repository root (if it exists). Cross-reference the PR against open TODOs:

- **Does this PR close any open TODOs?** If yes, note which items in your output: "This PR addresses TODO: <title>"
- **Does this PR create work that should become a TODO?** If yes, flag it as an informational finding.
- **Are there related TODOs that provide context for this review?** If yes, reference them when discussing related findings.

If TODOS.md doesn't exist, skip this step silently.

---

## Step 5.6: Documentation staleness check

Cross-reference the diff against documentation files. For each `.md` file in the repo root (README.md, ARCHITECTURE.md, CONTRIBUTING.md, CLAUDE.md, etc.):

1. Check if code changes in the diff affect features, components, or workflows described in that doc file.
2. If the doc file was NOT updated in this branch but the code it describes WAS changed, flag it as an INFORMATIONAL finding:
   "Documentation may be stale: [file] describes [feature/component] but code changed in this branch. Consider updating the docs or regenerating any generated artifacts."

This is informational only — never critical.

If no documentation files exist, skip this step silently.

---

## Step 5.8: Emit review event

After all review passes complete, emit an event into the palantir-mini append-only log so `/palantir-mini:pm-ship` and BackwardProp can recognize that Eng Review was run on this branch.

Use the `mcp__palantir-mini__emit_event` tool (preferred) or append a JSONL record with these fields:

- `skill`: `"pm-review"`
- `timestamp`: ISO 8601 datetime
- `status`: `"clean"` if there are no remaining unresolved findings after Fix-First handling, otherwise `"issues_found"`
- `issues_found`: total remaining unresolved findings
- `critical`: remaining unresolved critical findings
- `informational`: remaining unresolved informational findings
- `findings`: array of `{ "fingerprint": "path:line:category", "severity": "CRITICAL|INFORMATIONAL", "action": "auto-fixed|fixed|skipped" }`
- `commit`: output of `git rev-parse --short HEAD`
- 5 Decision Lineage dimensions per `~/.claude/rules/10-events-jsonl.md`: `when`, `atopWhich` (commit SHA), `throughWhich` (`pm-review`), `byWhom` (identity + agent), `withWhat` (reasoning + hypothesis)

If the review exits early before a real review completes (for example, no diff against the base branch), do **not** emit this event.

---

## Important Rules

- **Read the FULL diff before commenting.** Do not flag issues already addressed in the diff.
- **Fix-first, not read-only.** AUTO-FIX items are applied directly. ASK items are only applied after user approval. Never commit, push, or create PRs — that's `/palantir-mini:pm-ship`'s job.
- **Be terse.** One line problem, one line fix. No preamble.
- **Only flag real problems.** Skip anything that's fine.
- **Events are append-only.** Never rewrite or truncate `events.jsonl` (see `~/.claude/rules/10-events-jsonl.md`).
