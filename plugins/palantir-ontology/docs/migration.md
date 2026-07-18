# Migration — Pointer (scaffold stage)

Status: no migration logic exists yet. This is a placeholder naming where
the real content lands, per "Durable Docs: Reference, Don't Pin" — the
actual manifests, mappings, and reconciliation counts are volatile and will
be authored where the code lives, not duplicated into prose here ahead of
time.

## What will live here (from `P550` onward)

Copy-only migration manifests for sessions, SIC/DTC, events, memory,
consumer bindings, retention state, and projections — implemented in
`src/migration/`, schema-shaped by `contracts/migration-manifest.contract.json`
(stub at scaffold time). Required properties per execution-plan.md's Wave 5
row `P550`: ID maps, hash/count reconciliation, checkpoints, rollback, and
**no source-store rewriting** (copy-only).

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
