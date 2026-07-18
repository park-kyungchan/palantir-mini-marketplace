# palantir-ontology — Question Router

Router as of ledger row `P450`. Contracts, the reason-code registry,
deterministic generators/checkers, and their tests are real content
(`P330`-`P340`); `src/semantic-core/` and `src/altitude1/` (FDE/SIC/DTC
construction) are now real content too (`P410`); `src/altitude2/` and
`src/governance/` (`P440`/`P430`) and `src/control-plane/` (`P450`) as well.
The remaining `src/` paths below stay directory skeletons awaiting later
waves — this table routes to what exists today and names which wave
populates the rest.

| Question | Go to | Status |
|---|---|---|
| What is this plugin, what layer does it own, how do I build it? | `README.md` | present |
| What may I read/write/import here as a worker or agent? | `AGENT-CONTRACT.md` | present |
| Why does the layout look like this — the 8 binding decisions? | `docs/architecture.md` | present (`P310`) |
| Which legacy `palantir-mini` surfaces are intentionally absent, and why? | `docs/compatibility-matrix.md` | present (`P320`) |
| Where do the versioned neutral contracts live? | `contracts/*.contract.json` | present (`P330`), 8 schemas |
| Where is the stable reason-code registry? | `contracts/reason-code-registry.json` | present (`P330`), 25 codes (see the registry file's own `codes` array for the current exact count) |
| Where do FDE/SIC/DTC positive+negative fixtures and their tests live? | `tests/fixtures/`, `tests/negative/`, `tests/contracts/` (contract-schema level, `P330`); `tests/altitude1/` (aggregate-behavior level, `P410`) | present |
| Where is the canonical-JSON + fingerprint utility and the construction state machine? | `src/semantic-core/{canonical-json,fingerprint,reason-codes,construction-state-machine,user-decision-evidence}.ts` | present (`P410`); tests in `tests/semantic-core/` |
| Where does FDE/SIC/DTC construction logic live? | `src/altitude1/{fde-session,semantic-intent,digital-twin-change,types}.ts` | present through `DTC_APPROVED` (`P410`); staged Object/Property/Link construction (`CONSTRUCTION_STAGED` onward) populated `P420` |
| Where does consumer-facing read/proposal/commit routing live? | `src/altitude2/` | empty; populated `P440` |
| Where is the one commit gate / mutation-authority envelope implemented? | `src/governance/` | empty; populated `P430` |
| Where is the local `ControlPlaneNodeKind` catalog? | `src/control-plane/{types,registry,boundary-validator,index}.ts` | present (`P450`); 15 self-inventory entries: 10 `tool` (7 section-11.2 checkers + 3 generator scripts), 2 `generated-binding` (generated artifacts), 3 `adapter` (planned, Wave 6) — see `registry.ts` for the full list; tests in `tests/control-plane/`; contracts/ still has no ControlPlaneNodeKind schema by design (ADR-003 assigns the catalog to `P450`'s TypeScript types, not a `contracts/*.contract.json` schema) |
| Where do typed memory items live? | `src/memory/` | empty; populated `P510`-`P530` |
| Where does event replay / lineage live? | `src/lineage/` | empty; populated `P540` |
| Where do copy-only migration manifests live? | `src/migration/` | empty; populated `P550` |
| Where are the generated runtime adapters (Codex/Claude/Gemini)? | `src/adapters/{shared,codex,claude,gemini}/` | empty; populated Wave 6 |
| Where are the deterministic generators/checkers and package scripts? | `scripts/` | present (`P340`): `boundary-check.ts`, `parity-check.ts`, `migration-check.ts`, `english-docs-check.ts`, `home-isolation-guard.ts`, `generated-check.ts`, `generators/`; `control-plane-check.ts` added `P450` |
| How is the one-way dependency direction (ADR-002) mechanically enforced? | `bun run boundary:check` (`scripts/boundary-check.ts`) | present (`P340`); regression: `tests/scripts/boundary-check.test.ts`. From `P450` this same command also runs the ADR-003 control-plane/product-primitive boundary, catalog-completeness, and `*.objecttype.ts` absence scans (standalone: `bun run control-plane:check`) |
| How is generated-artifact drift/header enforcement done? | `bun run generated:check` (`scripts/generated-check.ts`) against `scripts/generated/*.generated.ts` | present (`P340`) |
| Where do parity / migration fixtures live (as opposed to contract fixtures)? | `tests/{parity,migration}/` | empty; populated Wave 5-6. Structural parity/migration-direction checks already run today via `bun run parity:check` / `bun run migration:check` |
| How does this plugin relate to the migration/runtime-support story? | `docs/migration.md`, `docs/runtime-support.md` | pointer stubs; real content Wave 5-6 |
| What is the full file index? | `INDEX.md` | present |

Full navigation and provenance for the surrounding campaign:
`_workspace/2026-07-17-palantir-ontology-successor/context/execution-plan.md`
(harness-upstream, read-only from this worktree).
