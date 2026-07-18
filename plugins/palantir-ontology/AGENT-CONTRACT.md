# AGENT-CONTRACT — palantir-ontology

Binding contract for any worker (human or agent, any runtime) that reads or
writes inside `plugins/palantir-ontology/`. This is a narrower, in-plugin
restatement of the campaign's `context/shared-worker-contract.md`
(harness-upstream workspace) — that file remains authoritative on
process/scheduling; this file is authoritative on this plugin's own
structural boundaries.

## 1. Dependency direction (ADR-002, `docs/architecture.md`)

One-way only:

```text
consumer Ontology source -> contracts/ -> src/semantic-core,src/altitude1,
src/altitude2,src/governance,src/control-plane,src/memory,src/lineage,
src/migration -> application-service validators -> src/adapters/*
```

`src/semantic-core/**` (and its sibling construction/operation/governance/
memory/lineage/migration directories) may not import anything from
`src/adapters/**`. `src/adapters/**` may import public contracts under
`contracts/` and public semantic-core exports, never the reverse. A boundary
validator enforcing this import direction is scaffolded by `P340`
(`bun run boundary:check`, execution-plan.md section 11.2) — until then this
rule is enforced by review, not tooling.

## 2. `ControlPlaneNodeKind` is metadata, never a product primitive (ADR-003)

Hooks, MCP handlers/tools, skills, agents, workflows, schemas, caches,
adapters, runtime state, and provider identities that belong to this
plugin's OWN operation are cataloged under `src/control-plane/` as typed
`ControlPlaneNodeKind` metadata. They are never modeled as a Palantir
`ObjectType`, `Interface`, `ActionType`, `Function`, permission, or consumer
Ontology entity — that mistake is the single largest legacy finding this
plugin exists to correct (see `docs/compatibility-matrix.md`, the 9
`self/*.objecttype.ts` files re-typed away from `plugins/palantir-mini`).

## 3. Mutation authority (ADR-005)

No handler, hook, script, adapter, or library may call a protected writer
directly. Every protected writer accepts the typed **mutation-authority**
envelope defined by `contracts/mutation-authority.contract.json` (real schema
as of `P330`: the 14 execution-plan.md §6.4 fields plus an optional terminal
`result`) or an opaque handle the single commit gate resolves and
revalidates. There is exactly one commit gate, implemented in
`src/governance/` from `P430` onward.

## 4. Consumer-domain-ownership

This plugin may bind to a consumer project's Ontology (read/query/propose/
dry-run/commit, per the Altitude-2 operation state machine in
`docs/architecture.md`), but it may never copy a consumer's domain
definitions (Object Types, Properties, Links, Actions, Functions) into its
own `src/semantic-core/` or `contracts/`. Consumer Ontology source stays in
the owning `~/projects/<project>` repository.

## 5. No wholesale legacy copy

`plugins/palantir-mini/**` is read-only reference for `package.json`/
`tsconfig.json` conventions only (never for directory or file content).
Copying a legacy directory wholesale, or landing a file byte-identical to a
legacy source file beyond trivial shared config lines (tsconfig
`compilerOptions` primitives, `package.json` boilerplate keys), is a scope
violation. See `docs/compatibility-matrix.md` for the manifest of legacy
surfaces this plugin intentionally does not carry forward as-is.

## 6. `UNKNOWN-is-not-PASS`

If a worker cannot classify a structural question from in-plugin or cited
upstream evidence alone (P210/P220/P230/R210/N220/architecture.md), it must
record the question as `UNKNOWN` with its grounds — never silently resolve
it as if it were decided, and never treat an `UNKNOWN` as satisfying a
downstream dependency or gate.

## 7. `math-KG-excluded`

This plugin's own source tree never reads, references, or ports content
from any N210-discovered math-protected path (`curriculum-kg`,
`exam-corpus`, `academy-corpus`, `palantir-math-clone`, or equivalent). Math
consumer Ontology remediation is a separate, out-of-scope workstream
(execution-plan.md Wave 7).

## 8. Language and provenance

English only, everywhere in this plugin (docs, code comments, commit
messages this plugin's own tooling produces). Durable facts (versions,
counts, SHAs) reference their source report rather than being hard-coded
into a doc that will drift — see the user's rule "Durable Docs: Reference,
Don't Pin," restated here because it governs every doc this plugin ships.
