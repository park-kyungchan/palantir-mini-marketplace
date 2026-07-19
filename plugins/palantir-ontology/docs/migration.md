# Migration — Built, Not Yet Wired to the Live Store

Status: the migration machinery is BUILT and verified copy-only-SAFE
(fail-closed, legacy byte-identical) — this is not a placeholder. But it is
NOT yet wired to the real live store: per the campaign's **Gap C**, the
migration `STATE_FAMILY_DEFINITIONS` point at repo-relative paths rather than
the real `~/.palantir-mini` store, and the machinery is verified
copy-only-SAFE (fail-closed) rather than migration-ready. The specific
family-path mappings and reconciliation/bijection results are volatile and
authored where the code lives — see
`harness-upstream/_workspace/2026-07-17-palantir-ontology-successor/decisions/final-completion-report.md`
(Gap C), not duplicated here, per "Durable Docs: Reference, Don't Pin."

## What lives here

Copy-only migration manifests for sessions, SIC/DTC, events, memory,
consumer bindings, retention state, and projections — implemented in
`src/migration/`, schema-shaped by `contracts/migration-manifest.contract.json`.
Required properties per execution-plan.md's Wave 5 row `P550`: ID maps,
hash/count reconciliation, checkpoints, rollback, and **no source-store
rewriting** (copy-only) — all built and verified copy-only-SAFE, subject to
the Gap-C caveat above.

## Current state-migration evidence

The legacy `plugins/palantir-mini` store inventory, state-machine shapes,
retention/archive behavior, upcaster/migration chain versioning, and
rollback seams this plugin's own migration story must account for are
censused in `outputs/p230-state-migration-census.md` (harness-upstream
workspace `_workspace/2026-07-17-palantir-ontology-successor/`) — read that
report directly for current counts and per-store detail rather than a
restated summary here, since those numbers will change as `P550` is built
against the live legacy store, not this document's snapshot of it.

## Storage-authority ADR

`docs/architecture.md` ADR-006 (Storage authority) is the binding decision
for which store the successor treats as authoritative and which are
swappable-backend details (for example, the legacy Convex impact-graph
client's STUB-ONLY status). Read that ADR before designing any migration
manifest.
