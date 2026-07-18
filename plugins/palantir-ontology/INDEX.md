# palantir-ontology — File Index

Index as of ledger row `P340`. Lists every path that exists on disk.
Question-shaped routing lives in `BROWSE.md`.

## Root

| Path | Content |
|---|---|
| `README.md` | Overview, layer diagram, build commands |
| `AGENT-CONTRACT.md` | Read/write/mutation-authority contract for workers |
| `BROWSE.md` | Question router |
| `INDEX.md` | This file |
| `package.json` | Package definition (`typecheck`, `test`, `contract:check`, `boundary:check`, `generated:check`, `parity:check`, `migration:check`, `test:home-isolation-guard`, `docs:check-english`, `generate:all` scripts) |
| `tsconfig.json` | TypeScript config (strict, `src/`+`scripts/`+`tests/` included) |

## `contracts/` — versioned neutral contract schemas + reason-code registry (real content `P330`)

| Path | Contract | schemaVersion |
|---|---|---|
| `contracts/fde-session.contract.json` | FDE build-session aggregate | `1.0.0` |
| `contracts/semantic-intent.contract.json` | Semantic Intent Contract (SIC) | `1.0.0` |
| `contracts/digital-twin-change.contract.json` | Digital Twin Change Contract (DTC) | `1.0.0` |
| `contracts/mutation-authority.contract.json` | Mutation-authority envelope (execution-plan.md §6.4, 14 fields + terminal `result`) | `1.0.0` |
| `contracts/ontology-binding.contract.json` | Consumer Ontology binding | `1.0.0` |
| `contracts/memory-item.contract.json` | Typed memory item (working/episodic/semantic/procedural) | `1.0.0` |
| `contracts/event-envelope.contract.json` | 5-dimension event envelope | `1.0.0` |
| `contracts/migration-manifest.contract.json` | Copy-only migration manifest | `1.0.0` |
| `contracts/reason-code-registry.json` | Stable reason-code registry, 20 codes (code/owner/meaning/retryable/category/appliesTo) | `1.0.0` |

Each schema is deliberately self-contained (no `$ref` across files) so an
independent version bump on one contract never forces a bump on another
(ADR-004's independent-versioning rationale, generalized to all eight).

## `schemas/` — empty; derived/generated JSON Schema exports land in later waves

## `src/` — semantic core, application services, generated adapters (all empty; see `BROWSE.md` for which wave populates each)

| Path | Owns |
|---|---|
| `src/semantic-core/` | Shared construction/operation primitives |
| `src/altitude1/` | FDE -> SIC -> DTC build lane |
| `src/altitude2/` | Consumer binding, read/proposal/commit routing |
| `src/governance/` | The one commit gate, mutation-authority enforcement |
| `src/control-plane/` | `ControlPlaneNodeKind` catalog |
| `src/memory/` | Working/episodic/semantic/procedural memory types |
| `src/lineage/` | Event replay, provenance |
| `src/migration/` | Copy-only migration manifests |
| `src/adapters/shared/` | Cross-runtime adapter contracts |
| `src/adapters/codex/` | Codex generated bindings |
| `src/adapters/claude/` | Claude generated bindings |
| `src/adapters/gemini/` | Gemini generated bindings |

## `scripts/` — deterministic generators/checkers, real content `P340`

| Path | Owns |
|---|---|
| `scripts/lib/fs-walk.ts` | Shared recursive file-walk + directory-snapshot/diff helpers |
| `scripts/lib/hash.ts` | Shared SHA-256 helper (`node:crypto`, no new dependency) |
| `scripts/boundary-check.ts` | `boundary:check` — ADR-002 one-way dependency direction + no runtime-identity literals outside `src/adapters/**` |
| `scripts/parity-check.ts` | `parity:check` — ADR-002/007 cross-runtime adapter file-path parity |
| `scripts/migration-check.ts` | `migration:check` — migration-manifest schema conformance + ADR-008 copy-only direction |
| `scripts/english-docs-check.ts` | `docs:check-english` — non-Latin-script scan over every `.md` file in this plugin |
| `scripts/home-isolation-guard.ts` | `test:home-isolation-guard` — snapshots real `~/.palantir-ontology` + `~/.palantir-mini` around a full `bun test` run |
| `scripts/generated-check.ts` | `generated:check` — header + byte-drift check for every registered generated artifact |
| `scripts/generators/contract-index.ts` | Generator: `contracts/*.contract.json` -> `scripts/generated/contract-index.generated.ts` |
| `scripts/generators/reason-code-index.ts` | Generator: `contracts/reason-code-registry.json` -> `scripts/generated/reason-code-index.generated.ts` |
| `scripts/generators/run-all.ts` | `generate:all` — writes both generated artifacts to disk |
| `scripts/generated/contract-index.generated.ts` | Generated (do not hand-edit) |
| `scripts/generated/reason-code-index.generated.ts` | Generated (do not hand-edit) |

## `tests/` — contract fixtures and suites real content `P330`; checker regression tests real content `P340`; `parity`/`migration` fixtures still empty (Wave 5-6)

| Path | Owns |
|---|---|
| `tests/fixtures/<contract-slug>/` | 2 positive fixtures per contract (16 total) |
| `tests/negative/<contract-slug>/` | Malformed + missing-load-bearing-field fixtures per contract (17 total) |
| `tests/support/schema-validate.ts` | Test-only minimal JSON Schema (draft 2020-12 subset) validator — reused by `scripts/migration-check.ts`, not the production P430 validator |
| `tests/support/fixture-loader.ts` | Reads a fixtures directory into `{file, data}` pairs |
| `tests/support/contract-suite.ts` | Shared `runContractSuite(slug, schema)` bun:test registrar |
| `tests/contracts/contracts.test.ts` | Positive-accepts / negative-rejects suite for all 8 contracts |
| `tests/contracts/reason-code-registry.test.ts` | Uniqueness + stability + fixture cross-reference test for the reason-code registry |
| `tests/contracts/neutrality.test.ts` | Automated regression for the runtime-neutrality grep proof |
| `tests/scripts/boundary-check.test.ts` | Permanent regression for `boundary-check.ts`'s pure detection logic |
| `tests/scripts/english-docs-check.test.ts` | Permanent regression for `english-docs-check.ts`'s pure detection logic |
| `tests/scripts/migration-check.test.ts` | Permanent regression for `migration-check.ts`'s copy-only direction predicate |
| `tests/parity/` | Cross-runtime decision-parity fixtures (DoD #9); empty, Wave 6 |
| `tests/migration/` | Migration/rollback fixtures; empty, Wave 5 |

## `docs/`

| Path | Content |
|---|---|
| `docs/architecture.md` | 8 ADRs (`P310`) |
| `docs/compatibility-matrix.md` | Intentionally-absent legacy surfaces manifest (`P320`) |
| `docs/migration.md` | Migration-story pointer (real content Wave 5) |
| `docs/runtime-support.md` | Runtime-support pointer (real content Wave 6) |
