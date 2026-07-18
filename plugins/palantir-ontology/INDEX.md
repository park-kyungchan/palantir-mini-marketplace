# palantir-ontology — File Index

Index as of ledger row `P410`. Lists every path that exists on disk.
Question-shaped routing lives in `BROWSE.md`.

## Root

| Path | Content |
|---|---|
| `README.md` | Overview, layer diagram, build commands |
| `AGENT-CONTRACT.md` | Read/write/mutation-authority contract for workers |
| `BROWSE.md` | Question router |
| `INDEX.md` | This file |
| `package.json` | Package definition (`typecheck`, `test`, `contract:check`, `boundary:check`, `control-plane:check`, `generated:check`, `parity:check`, `migration:check`, `test:home-isolation-guard`, `docs:check-english`, `generate:all` scripts) |
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
| `contracts/reason-code-registry.json` | Stable reason-code registry, 25 codes (code/owner/meaning/retryable/category/appliesTo) — see the registry file's own `codes` array for the current exact count | `1.0.0` |

Each schema is deliberately self-contained (no `$ref` across files) so an
independent version bump on one contract never forces a bump on another
(ADR-004's independent-versioning rationale, generalized to all eight).

## `schemas/` — empty; derived/generated JSON Schema exports land in later waves

## `src/` — semantic core, application services, generated adapters (`src/semantic-core/` + `src/altitude1/` real content `P410`; remaining paths empty, see `BROWSE.md` for which wave populates each)

| Path | Owns |
|---|---|
| `src/semantic-core/canonical-json.ts` | Documented canonical JSON serialization (`canonicalize`) |
| `src/semantic-core/fingerprint.ts` | `fingerprintBody` (sha256 of `canonicalize(body)`), `FINGERPRINT_PATTERN`, `isFingerprintShaped` |
| `src/semantic-core/reason-codes.ts` | Reads `contracts/reason-code-registry.json`; `isRegisteredReasonCode`, `reasonCodeAppliesTo`, named-constant code exports |
| `src/semantic-core/construction-state-machine.ts` | `CONSTRUCTION_STATES` (9-tuple), `assertLegalTransition` — the execution-plan.md section 6.3 chain, pure/side-effect-free |
| `src/semantic-core/user-decision-evidence.ts` | `UserDecisionEvidence` type, `isUserDecisionEvidence`, `isIndependentEvidence` |
| `src/altitude1/types.ts` | `Actor`, `AggregateResult<T>`, `ok`/`denied` helpers |
| `src/altitude1/fde-session.ts` | `FdeSession`/`FdeTurn`, `openFdeSession`, `recordTurn` (append-only), `transitionSession` (the one status-advance choke point) |
| `src/altitude1/semantic-intent.ts` | `SicBody`/`SicRecord`, `proposeSic`, `approveSic` |
| `src/altitude1/digital-twin-change.ts` | `DtcBody`/`DtcRecord`, `proposeDtc`, `finalizeDtc` — aggregates stop at `DTC_APPROVED`; no path mints mutation authority |
| `src/altitude2/` | Consumer binding, read/proposal/commit routing |
| `src/governance/` | The one commit gate, mutation-authority enforcement |
| `src/control-plane/types.ts` | `ControlPlaneNodeKind` (8-value enum), `isControlPlaneNodeKind`, `ControlPlaneNode`/`ProvenancePointer` types (`P450`) |
| `src/control-plane/registry.ts` | `CONTROL_PLANE_CATALOG` (15 entries), `findByKind`, `findDuplicateNodeIds`/`findDuplicateSourcePaths` (`P450`) |
| `src/control-plane/boundary-validator.ts` | `scanControlPlaneKindCollisions`, `scanControlPlaneCompleteness`, `scanForObjectTypeShapedFiles` (`P450`) |
| `src/control-plane/index.ts` | Public barrel (`P450`) |
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
| `scripts/control-plane-check.ts` | `control-plane:check` — ADR-003 control-plane/product-primitive boundary, catalog completeness, `*.objecttype.ts` absence scan (`P450`); same scans also run inside `boundary:check` |
| `scripts/generators/contract-index.ts` | Generator: `contracts/*.contract.json` -> `scripts/generated/contract-index.generated.ts` |
| `scripts/generators/reason-code-index.ts` | Generator: `contracts/reason-code-registry.json` -> `scripts/generated/reason-code-index.generated.ts` |
| `scripts/generators/run-all.ts` | `generate:all` — writes both generated artifacts to disk |
| `scripts/generated/contract-index.generated.ts` | Generated (do not hand-edit) |
| `scripts/generated/reason-code-index.generated.ts` | Generated (do not hand-edit) |

## `tests/` — contract fixtures and suites real content `P330`; checker regression tests real content `P340`; aggregate + semantic-core behavior tests real content `P410`; `parity`/`migration` fixtures still empty (Wave 5-6)

| Path | Owns |
|---|---|
| `tests/fixtures/<contract-slug>/` | 2 positive fixtures per contract, `fde-session` has 3 since `P410` (17 total) |
| `tests/negative/<contract-slug>/` | Malformed + missing-load-bearing-field fixtures per contract, `fde-session` gained 2 more since `P410` (19 total) |
| `tests/support/schema-validate.ts` | Test-only minimal JSON Schema (draft 2020-12 subset) validator — reused by `scripts/migration-check.ts`, not the production P430 validator; gained `maxLength` string enforcement `P410` |
| `tests/support/fixture-loader.ts` | Reads a fixtures directory into `{file, data}` pairs |
| `tests/support/contract-suite.ts` | Shared `runContractSuite(slug, schema)` bun:test registrar |
| `tests/contracts/contracts.test.ts` | Positive-accepts / negative-rejects suite for all 8 contracts |
| `tests/contracts/reason-code-registry.test.ts` | Uniqueness + stability + fixture cross-reference test for the reason-code registry |
| `tests/contracts/neutrality.test.ts` | Automated regression for the runtime-neutrality grep proof |
| `tests/scripts/boundary-check.test.ts` | Permanent regression for `boundary-check.ts`'s pure detection logic |
| `tests/scripts/english-docs-check.test.ts` | Permanent regression for `english-docs-check.ts`'s pure detection logic |
| `tests/scripts/migration-check.test.ts` | Permanent regression for `migration-check.ts`'s copy-only direction predicate |
| `tests/control-plane/registry.test.ts` | Structural regression for the catalog (well-formed entries, disjoint kinds, no duplicates) (`P450`) |
| `tests/control-plane/boundary-validator.test.ts` | Kind-collision, completeness, and absence-scan bite-proof regression (`P450`) |
| `tests/control-plane/x-001.test.ts` | X-001 requirement trace: positive + bidirectional negative tests, absence scan (`P450`) |
| `tests/semantic-core/` | Unit tests for canonical JSON, fingerprint, reason codes, construction state machine, user-decision evidence (`P410`) |
| `tests/altitude1/` | FDE/SIC/DTC aggregate behavior tests, positive + negative (`P410`) |
| `tests/parity/` | Cross-runtime decision-parity fixtures (DoD #9); empty, Wave 6 |
| `tests/migration/` | Migration/rollback fixtures; empty, Wave 5 |

## `docs/`

| Path | Content |
|---|---|
| `docs/architecture.md` | 8 ADRs (`P310`) |
| `docs/compatibility-matrix.md` | Intentionally-absent legacy surfaces manifest (`P320`) |
| `docs/migration.md` | Migration-story pointer (real content Wave 5) |
| `docs/runtime-support.md` | Runtime-support pointer (real content Wave 6) |
