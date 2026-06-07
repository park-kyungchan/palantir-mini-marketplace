---
ruleId: 8
slug: schema-versioning
scope: global
version: 2.1.0
invariant: "~/.claude/schemas/ is a semver-tracked interface; every edit needs a CHANGELOG entry + semver bump; pm-codegen is sole writer of <project>/src/generated/** with mandatory header (schema version + ontology hash + generator version + timestamp); never hand-edit generated files; pm-verify gates schema-pin + generated-header invariants."
supersededBy: null
supersedes: [11]
crossRefs: [01, 12]
hookCitations: [generated-header-check]
bodyLocCeiling: 35
---

# Rule 08 — Schema + Codegen Authority

Consolidation per harness-base-mode blueprint §12 license (2026-04-29) — absorbs rule 11 (codegen-authority). Both governed the same write/read chain (schema declares → codegen produces → consumer reads); merging clarifies the single chain.

## §Schema as semver-tracked interface

- `~/.claude/schemas/` is a semver-tracked, versioned interface — treat like an internal npm package.
- Consumer projects pin schema version via `peerDependencies` in their `package.json`.
- `pm-verify` (via `verify_schema_pin` handler) blocks when consumer pin is incompatible with the installed schema version.

## §CHANGELOG + version bump discipline

- Every schema edit requires a `CHANGELOG.md` entry + appropriate semver bump (MINOR for additions, MAJOR for breaking, PATCH for docs).
- Breaking changes are rare and gated — prefer additive types + deprecation notes over rename/remove. When a MAJOR bump is unavoidable, follow `~/.claude/schemas/MIGRATION.md` (4-consumer staged order + rollback gates).

## §Codegen authority (absorbs 11)

- Only `pm-codegen` (or an equivalent declared generator) writes files under `<project>/src/generated/`.
- Never edit a generated file by hand — regenerate it. Need an override? Add it to the project's `ontology/` input and regenerate.
- Codegen runs are deterministic: same inputs → byte-identical outputs. Any drift is a bug.

## §Generated header contract (absorbs 11)

- Generated files MUST carry a header with: schema version + ontology hash + generator version + timestamp.
- `generated-header-check` hook (PostToolUse on Edit/Write/MultiEdit matching `**/src/generated/**`) enforces.
- `pm-verify` blocks a commit when a generated file is out of sync with its source ontology/schema hash.

## §pm-verify gates (cross-cutting)

The `pm-verify` skill chains both invariants (schema pin + generated header). Run before `pm-ship` or any ontology-touching commit.

## §Hook-citation validation (absorbed from rule 22)

Every `rule NN` citation in a hook's source must reference an active rule; stale citations are a blocking defect (`rule-citation-validate` hook).
