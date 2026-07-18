# palantir-ontology — Question Router

Router as of ledger row `P330`. Contracts, the reason-code registry, and
their tests are now real content; most `src/` paths below remain directory
skeletons awaiting later waves — this table routes to what exists today and
names which wave populates the rest.

| Question | Go to | Status |
|---|---|---|
| What is this plugin, what layer does it own, how do I build it? | `README.md` | present |
| What may I read/write/import here as a worker or agent? | `AGENT-CONTRACT.md` | present |
| Why does the layout look like this — the 8 binding decisions? | `docs/architecture.md` | present (`P310`) |
| Which legacy `palantir-mini` surfaces are intentionally absent, and why? | `docs/compatibility-matrix.md` | present (`P320`) |
| Where do the versioned neutral contracts live? | `contracts/*.contract.json` | present (`P330`), 8 schemas |
| Where is the stable reason-code registry? | `contracts/reason-code-registry.json` | present (`P330`), 20 codes |
| Where do FDE/SIC/DTC positive+negative fixtures and their tests live? | `tests/fixtures/`, `tests/negative/`, `tests/contracts/` | present (`P330`) |
| Where does FDE/SIC/DTC construction logic live? | `src/altitude1/` | empty; populated `P410`-`P420` |
| Where does consumer-facing read/proposal/commit routing live? | `src/altitude2/` | empty; populated `P440` |
| Where is the one commit gate / mutation-authority envelope implemented? | `src/governance/` | empty; populated `P430` |
| Where is the local `ControlPlaneNodeKind` catalog? | `src/control-plane/` | empty; populated `P450` (contracts/ has no ControlPlaneNodeKind schema by design — ADR-003 assigns the catalog to `P450`, not `P330`) |
| Where do typed memory items live? | `src/memory/` | empty; populated `P510`-`P530` |
| Where does event replay / lineage live? | `src/lineage/` | empty; populated `P540` |
| Where do copy-only migration manifests live? | `src/migration/` | empty; populated `P550` |
| Where are the generated runtime adapters (Codex/Claude/Gemini)? | `src/adapters/{shared,codex,claude,gemini}/` | empty; populated Wave 6 |
| Where are the deterministic generators/checkers and package scripts? | `scripts/` | empty; populated `P340` |
| Where do parity / migration fixtures live (as opposed to contract fixtures)? | `tests/{parity,migration}/` | empty; populated Wave 5-6 |
| How does this plugin relate to the migration/runtime-support story? | `docs/migration.md`, `docs/runtime-support.md` | pointer stubs; real content Wave 5-6 |
| What is the full file index? | `INDEX.md` | present |

Full navigation and provenance for the surrounding campaign:
`_workspace/2026-07-17-palantir-ontology-successor/context/execution-plan.md`
(harness-upstream, read-only from this worktree).
