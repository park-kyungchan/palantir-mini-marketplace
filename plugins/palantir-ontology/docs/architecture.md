# palantir-ontology — Successor Architecture Decision Records

Status: accepted (Wave 3 / PM-1, ledger row `P310`). Scope: this document is
the binding ADR set for the `palantir-ontology` successor plugin. It grounds
every decision in the adjudicated Wave-2 evidence (`synthesis/w2-fan-in.md`,
F290 PASS) and the merged doctrine (`ssot/palantir/ontology/primitives.md`,
`ssot/ontology-first-program.md`). Citations below use the short form
`<report>§<section>` and point at files under
`_workspace/2026-07-17-palantir-ontology-successor/` in `harness-upstream`
unless otherwise stated.

This document does not implement anything. `P320` scaffolds against these
ADRs; `P345` verifies the scaffold against them; every later Wave-4+ task
that touches construction, mutation authority, storage, or adapters must
cite the ADR it implements rather than re-derive the decision.

## ADR Index

| ADR | Title | Decision area (per `p310.md`) |
| --- | --- | --- |
| [ADR-001](#adr-001-ownership-and-consumer-domain-ownership-boundary) | Ownership and consumer-domain-ownership boundary | (1) |
| [ADR-002](#adr-002-one-way-dependency-direction) | One-way dependency direction | (2) |
| [ADR-003](#adr-003-controlplanenodekind-catalog) | `ControlPlaneNodeKind` catalog | (3) |
| [ADR-004](#adr-004-versioned-fdesicdtc-aggregate-state-machines) | Versioned FDE/SIC/DTC aggregate state machines | (4) |
| [ADR-005](#adr-005-one-commit-gate--typed-mutation-authority-envelope) | ONE commit gate — typed mutation-authority envelope | (5) |
| [ADR-006](#adr-006-storage-authority) | Storage authority | (6) |
| [ADR-007](#adr-007-generated-runtime-adapters) | Generated runtime adapters | (7) |
| [ADR-008](#adr-008-legacy-compatibility) | Legacy compatibility | (8) |

Required-terms usage note: `consumer-domain-ownership` is the organizing
concept of ADR-001 and recurs in ADR-002/003/006; `ControlPlaneNodeKind` is
defined in ADR-003 and referenced by ADR-001/002/006/007; `mutation-authority`
is the organizing concept of ADR-005 and recurs in ADR-004/006;
`UNKNOWN-is-not-PASS` governs every "open question" carried into a later ADR
or Wave (never silently resolved here); `math-KG-excluded` is confirmed in
§Scope proof of `outputs/p310-architecture.md` — no math-KG evidence was read
or cited by any ADR below.

---

## ADR-001: Ownership and consumer-domain-ownership boundary

**Decision.** `plugins/palantir-ontology/` hosts **no consumer domain
content**. It owns the Ontology *lifecycle* (construction, operation,
governance, memory, lineage, migration) as versioned neutral contracts and a
semantic core; it never stores, generalizes, or silently absorbs a specific
consumer's Object Types, Properties, Links, Interfaces, Actions, Functions,
or backing data. A consumer project (e.g. `/home/palantirkc/projects`) binds
to the successor by supplying its own domain Ontology source and receiving
validation, lineage, and migration services in return — the bind is
one-directional (consumer → successor services), never the reverse
(successor → consumer domain meaning).

Concretely: `plugins/palantir-ontology/contracts/ontology-binding.contract.json`
(required layout item, execution-plan §6.2) defines the *shape* a consumer's
domain Ontology must present to bind (identity, version, primitive
inventory, backing-evidence pointers). It never defines what any consumer's
actual Object Types or Properties *are*. `/home/palantirkc/projects` is "the
first non-math consumer and acceptance fixture, not the semantic source for
every future consumer" (execution-plan §1.3) — no successor source file may
hard-code a `projects/`-specific domain name, path, or primitive.

**Grounded evidence.**
- execution-plan §1.3 "Consumer ownership": "The consumer project remains
  authoritative for domain Object Types... The successor stores or
  processes versioned contracts, references, validation results, lineage,
  and migration mappings. It does not absorb a consumer's domain meaning
  into plugin-owned source."
- `ssot/palantir/ontology/primitives.md` "Lane 1 — consumer-owned product
  meaning": "A consumer may define Palantir product primitives for its own
  real-world entities... The successor may validate and bind those
  definitions, but it does not own or silently generalize their domain
  meaning."
- P210 §8c/§8d (`outputs/p210-legacy-surface-census.md`): the legacy
  plugin's `runtime-overlay/schemas-snapshot/ontology/self/` directory is
  explicitly the harness's *own* self-ontology (108 `primitives/` files are
  the semantic core; 37 `self/` files model the harness's own control
  surfaces) — the legacy plugin never embeds a consumer's domain rows in its
  own source tree either; the successor inherits and hardens this
  separation rather than inventing it.
- N220 §1a/§3 (`outputs/n220-nonmath-gap-map.md`): every one of the 8
  confirmed + 2 borderline `ControlPlaneNodeKind` remodel candidates is a
  case of the *consumer's own* registry (`governance/object-type-registry.yaml`)
  misclassifying its own CI/orchestration/agent-routing machinery as a
  domain primitive — proof, from the live consumer, that ownership
  boundaries collapse exactly at the seam ADR-001 draws, and that the
  collapse direction runs consumer-control-plane-into-domain, not
  successor-into-consumer-domain. ADR-001 additionally forbids the
  successor from ever repeating that same collapse from its own side.

**Consequences.**
- `P320`'s scaffold may not create any file under `plugins/palantir-ontology/`
  named after, or containing literal data for, a specific consumer domain
  concept (e.g. no `daily-test.objecttype.ts`-shaped file in the successor).
- Every successor contract that references "the consumer Ontology" must do
  so by identity/version/pointer (per the mutation-authority envelope,
  ADR-005), never by embedding the consumer's schema body.
- Wave-7 consumer remediation (`N710`-`N799`) happens entirely inside the
  consumer repository's own worktree; no Wave-7 output is a required input
  to `plugins/palantir-ontology/` source (only P210/N220 findings, already
  adjudicated by F290, feed ADR-003).

**Alternatives rejected.**
- *Successor embeds a generic "reference" consumer Ontology as a worked
  example inside its own source tree.* Rejected: even a "reference" domain
  model is consumer domain content: the moment `plugins/palantir-ontology/`
  ships an `.objecttype.ts`-shaped file with real property names, a future
  contributor will extend it in place instead of building a real consumer
  binding, reproducing the exact violation execution-plan §5 item 2 and
  `ssot/palantir/ontology/primitives.md` Lane-1/Lane-2 split forbid.
- *Successor "owns" consumer Ontology state directly (single shared store
  across all consumers).* Rejected: contradicts execution-plan §1.3 ("The
  successor... does not absorb a consumer's domain meaning into plugin-owned
  source") and P230's storage census (§2.4 Project ontology index row):
  every current per-project store lives under `<root>/.palantir-mini/`, not
  a plugin-owned central store — the successor's storage authority (ADR-006)
  continues that per-project-owned pattern deliberately.

---

## ADR-002: One-way dependency direction

**Decision.** The successor implements the exact layer graph fixed by
execution-plan §6.1:

```text
consumer domain Ontology source
        v
versioned neutral contracts and references
        v
semantic core: construction, operation, governance, memory, lineage
        v
application services and deterministic validators
        v
generated runtime bindings
        v
   Codex / Claude / Gemini
```

The semantic core (`src/semantic-core/`, `src/altitude1/`, `src/altitude2/`,
`src/governance/`, `src/memory/`, `src/lineage/`) **may not import a runtime
adapter** (`src/adapters/{shared,codex,claude,gemini}/`). Adapters may import
public semantic-core contracts. No semantic-core file may branch on runtime
identity (`if (runtime === "claude")` inside `src/semantic-core/**` is a
boundary violation, not a style issue). Enforcement is deferred to `P340`'s
boundary-check script (`bun run boundary:check`) and re-verified read-only by
`P345`; this ADR fixes the rule the checker enforces, it does not implement
the checker.

**Grounded evidence.**
- execution-plan §6.1 (verbatim layer graph, "The semantic core may not
  import a runtime adapter. Adapters may import public semantic-core
  contracts.") and §6.2 (required `src/` subtree names, `src/adapters/`
  split into `shared/codex/claude/gemini`).
- P210 §5 (`outputs/p210-legacy-surface-census.md`): "hook **business
  logic** is runtime-neutral and hook **registration**
  (`hooks.json`/`codex-hooks.json`: event mapping, timeouts, `failureMode`,
  `permissionDecision`) is the adapter-specific binding layer — exactly the
  target architecture's 'generated runtime bindings'" — direct legacy-plugin
  evidence that the split is achievable, because the legacy plugin already
  demonstrates it informally (one `.ts` logic file, two registries).
- P210 §6 (skills family): the `codex-skills/*` 8 thin delegation stubs
  "are already the correct generated-runtime-binding shape" — a second
  concrete precedent for the one-way direction inside the legacy plugin
  itself, adopted rather than reinvented.
- P210 §8b (`core/contracts/runtime-adapter-contract.ts`, disposition
  `port`): "Typed contract for what a runtime adapter must implement — this
  IS the target architecture's adapter-contract boundary (§6.1); central to
  DoD #9" — names the exact seam ADR-002 fixes as already present, in
  embryonic form, in the legacy plugin's own contract layer.
- R210 "Applicability Notes For The Successor" (`outputs/r210-runtime-capability-matrix.md`):
  "Authority boundary held constant: none of the differences above changes
  `mutation-authority` or `consumer-domain-ownership`... `ControlPlaneNodeKind`
  is the only place runtime-surface variation is expressed; it never
  reclassifies a runtime surface as a product Ontology primitive." — the
  runtime-capability matrix itself confirms cross-runtime variation is
  packaging-only, i.e. confined to the bottom layer of the ADR-002 graph.

**Consequences.**
- `P340`'s boundary-check script must fail the build on any `import` inside
  `src/semantic-core/**` (or its listed siblings) that resolves to a path
  under `src/adapters/**`.
- `A610`-`A670` (Wave 6) generate the three adapter bindings from one neutral
  capability source; they may not hand-fork semantic decisions per runtime
  (this is also ADR-007's subject; ADR-002 fixes the import direction that
  makes hand-forking structurally harder, ADR-007 fixes the generation
  discipline that makes it procedurally impossible).
- Consumer-domain Ontology source (top of the graph) still only ever flows
  *down* through the versioned contracts layer — it is never read directly
  by the semantic core or an adapter; this is the same one-way rule applied
  at the top of the graph and is ADR-001's mechanism.

**Alternatives rejected.**
- *Adapters import semantic-core internals directly (skip the public
  contract layer) for a performance shortcut.* Rejected: reintroduces
  exactly the coupling P220's bypass census documents for the legacy
  plugin's mutation gate (§8.2 `lib/sandbox/executor.ts` imports the raw
  `commitEdits` instead of the gated `commit_edits` handler) — an internal
  shortcut around a public contract is the generic shape of every bypass
  P220/U285 found; ADR-002 forbids the analogous shortcut at the
  adapter/core seam before it can be built once, rather than discovering it
  as a bypass later.
- *One shared "universal" adapter file with runtime `if`-branches instead of
  three generated bindings.* Rejected: violates execution-plan DoD item 9
  ("Claude, Codex, and Gemini consume identical semantic fixtures. Packaging
  differences are adapter metadata only.") and directly reproduces R210's
  named risk of "provider-conditioned semantic output" (execution-plan §12
  release-blocking condition).

---

## ADR-003: `ControlPlaneNodeKind` catalog

**Decision.** The successor's `src/control-plane/` subsystem is a typed
catalog, `ControlPlaneNodeKind`, that inventories runtime/control surfaces —
tools, MCP handlers, hooks, skills, agents, adapters, profiles, generated
bindings — as **lifecycle-control metadata**. A `ControlPlaneNodeKind` entry
is never a Palantir Object Type, Interface, Action Type, Function,
permission, or consumer Ontology entity, and the boundary validator
(`P450`) must reject any attempt to register one as a product primitive.
This directly absorbs P210's `runtime-overlay/schemas-snapshot/ontology/self/`
finding and N220's 8 confirmed + 2 recommended consumer remodels into one
catalog shape used by both the successor's own self-inventory and (via
Wave-7) the consumer's remediated registry.

Catalog shape (fixed by this ADR, implemented by `P450`): every entry
carries `kind` (one of `tool | handler | hook | skill | agent | adapter |
profile | generated-binding`), `sourcePath`, `runtimeScope` (which of
Codex/Claude/Gemini/all it applies to), and `disposition` provenance
(pointer back to the P210/N220 census row it originated from, where
applicable) — never a `properties`/`links`/`actions` triple, which is
reserved for Lane-1 product primitives per doctrine.

**Grounded evidence.**
- `ssot/palantir/ontology/primitives.md` "Lane 2 — successor control-plane
  catalog": "The successor inventories handlers, hooks, MCP surfaces,
  tools, skills, agents, workflows, schemas, caches, adapters, runtime
  state, and provider identities in its local `ControlPlaneNodeKind`
  catalog. This catalog is lifecycle-control metadata. It is not a Palantir
  Object Type, Interface, Action Type, Function, permission, or consumer
  Ontology entity." Also: "Reject: Each non-model control surface = an
  object type."
- P210 §8d (`outputs/p210-legacy-surface-census.md`): 9 named
  `*.objecttype.ts` files (`hook.objecttype.ts`, `mcp-handler.objecttype.ts`,
  `mcp-tool.objecttype.ts`, `runtime-adapter.objecttype.ts`,
  `skill.objecttype.ts`, `agent.objecttype.ts`, `monitor.objecttype.ts`,
  `plugin-manifest.objecttype.ts`, `managed-settings-fragment.objecttype.ts`)
  — "Content re-emerges as **ControlPlaneNodeKind** catalog entries in the
  successor... the ObjectType *shape* is removed per DoD #2; the underlying
  registration data is not lost, it is re-typed." This is the exact 9-entry
  seed list for the successor's own `kind` enum values (`hook`, `handler`
  ×2, `adapter`, `skill`, `agent`, `monitor`, `manifest`, `settings-fragment`
  — collapsed to the 8-value enum above where `monitor`/`manifest`/
  `settings-fragment` fold into `profile`/`generated-binding` per their
  actual runtime role).
- P210 §10 (Profiles family): all 5 `McpToolSurfaceProfile` rows disposition
  `port-as-ControlPlaneNodeKind` — "Tool-visibility gating is runtime/control
  metadata, not a product primitive — the *set of tools per profile* is
  data the successor's runtime-adapter layer needs, but 'profile' itself is
  not an Ontology ObjectType." This fixes `profile` as one of the 8 `kind`
  enum values.
- N220 §1a (`outputs/n220-nonmath-gap-map.md`): 8 confirmed remodel rows
  (`Gate`, `GateExecutionReceipt`, `WorkContract`, `SprintContract`, `Rule`,
  `AgentRouting`, `RoutablePlanDisposition`, `TypedGapDisposition`) each
  currently registered as `domain_id: governance` Object Types in the
  *consumer's own* `governance/object-type-registry.yaml`, each mapped to
  "control-plane (...)" as owning domain — the consumer-side mirror of
  P210's plugin-side finding; both route to this one catalog per
  `synthesis/w2-fan-in.md`'s collision-check paragraph ("one coherent
  doctrine violation family across plugin and consumer; both route to the
  successor's ControlPlaneNodeKind catalog (P450) and consumer remediation
  (Wave 7)").
- N220 §1a borderline rows 9-10 (`IntentRoute`, 298 rows; `ContextPack`, 35
  files): recorded `UNKNOWN` disposition, not silently folded into either
  `remodel-as-control-plane` or `retain-as-product-primitive` — per
  `UNKNOWN-is-not-PASS`, ADR-003 does not resolve these two; they remain
  open pending `N720`'s bounded scope (N220 §Downstream), and the catalog's
  `kind` enum must not be treated as exhaustively populated until they
  resolve.

**Consequences.**
- `P450` implements the catalog and the boundary validator; `X-001`-labeled
  tests (execution-plan §9 Wave-4 row `P450`) assert the absence scan finds
  zero `ControlPlaneNodeKind`-eligible entries registered as product
  primitives anywhere in `plugins/palantir-ontology/`.
- Wave-7 consumer remediation (`N720`) reuses this same `kind` taxonomy when
  it reclassifies the 8 confirmed consumer rows — the vocabulary is shared
  across the successor's self-inventory and the consumer's remediated
  registry so the same validator logic can eventually check both (a
  concrete instance of ADR-001's "successor owns lifecycle, not domain
  meaning": the *taxonomy* is successor-owned, the *consumer's rows* stay
  consumer-owned).
- The two `UNKNOWN` borderline rows (`IntentRoute`, `ContextPack`) block any
  Wave-7 write to those two consumer registry rows until `N720` resolves
  them (N220 §1a note); they do not block `P450`'s implementation of the
  catalog shape itself, since the catalog's `kind` enum is fixed by the 8
  confirmed rows and the profile/tool/hook/handler/skill/agent/adapter
  families already fully enumerated by P210.

**Alternatives rejected.**
- *Model runtime surfaces as a `ControlPlaneObjectType` that reuses the
  Palantir `Object Type` primitive shape (Properties/Links/Actions) with a
  naming-only distinction.* Rejected: doctrine explicitly rejects
  distinguishing by label alone — `ssot/palantir/ontology/primitives.md`
  "Reject: Each non-model control surface = an object type" targets exactly
  this pattern; a same-shaped-but-differently-named type is the shape
  violation, not the name.
- *Leave the 9 `self/*.objecttype.ts`-equivalent files unclassified until
  Wave 4 (`P450`) and let `P320`'s scaffold omit `src/control-plane/`
  entirely.* Rejected: execution-plan §6.2's required layout fixes
  `src/control-plane/` as a top-level subsystem from the first scaffold
  commit; deferring the *directory's existence* (not its full
  implementation, which is legitimately `P450`'s job) would force a
  layout ADR amendment later for no benefit — the decision is fixed now,
  the code lands in Wave 4.

---

## ADR-004: Versioned FDE/SIC/DTC aggregate state machines

**Decision.** The successor implements FDE (Facilitated Discovery Engine),
`SemanticIntentContract` (SIC), and `DigitalTwinChangeContract` (DTC) as
versioned aggregates with explicit, stable-reason-coded state transitions,
matching execution-plan §6.3 exactly:

```text
FDE_OPEN -> SIC_PROPOSED -> SIC_APPROVED -> DTC_PROPOSED -> DTC_APPROVED
  -> CONSTRUCTION_STAGED -> VALIDATED -> MUTATION_AUTHORITY_ISSUED -> COMMITTED
```

Every aggregate carries a `schemaVersion` field and binds to its approved
body by **canonical fingerprint** (a content hash of the exact approved SIC
or DTC body, not a mutable pointer to "the current SIC"). Every
state-advancing transition requires **independently verified user-decision
evidence** — not tool success, not a free-text reference — matching
execution-plan §6.3's "No state may be inferred from tool success or a
free-text reference." Contract *approval* only enables routing to the next
governance step; it never grants commit authority by itself (that authority
is ADR-005's separate envelope).

**Grounded evidence.**
- execution-plan §6.3 (verbatim state-machine text and the binding rule
  "Contract approval only enables routing to the next governance step. It
  never grants commit authority by itself.") and §1.4 ("Approval of a
  contract is not mutation authority. A separate, typed, expiring,
  target-scoped mutation authority envelope is required for every protected
  write.").
- P230 §3.1 (`outputs/p230-state-migration-census.md`): confirms this exact
  shape already exists informally in the legacy plugin — SIC and DTC "share
  the identical status union `draft | approved | superseded`," both "carry
  `schemaVersion:` as a literal-typed constant field," and DTC exports "a
  runtime type-guard function that checks `schemaVersion ===` the constant
  plus the status enum membership before accepting a contract as valid." The
  successor generalizes this pattern into the full 8-state machine rather
  than inventing an unrelated one.
- P230 §3.1: "DTC fill turns are event-visible via `dtc_fill_turn_advanced`
  ... and terminate at `digital_twin_contract_finalized`
  (`verdict: "dtc-filled" | "dtc-rejected" | "dtc-aborted"`) — a genuine
  3-verdict terminal state machine, not a binary pass/fail" — grounds the
  requirement that DTC finalization is stable-reason-coded, not a boolean.
- P230 §3.1: "Mutation-authority gate: `lib/governance/pre-mutation-governance-v2.ts`
  is the single governing surface for whether a tool call touching source is
  `allow | advisory | deny`. Reason codes trace directly back to SIC/DTC
  presence... This matches execution-plan §5.6 'Protected mutation is
  reachable through exactly one verified commit gate.'" — the legacy
  plugin's own architecture already separates contract state (this ADR)
  from commit authority (ADR-005); the successor keeps that separation
  rather than collapsing it.
- P230 §3.2 (envelope revisioning / vocabulary guard): the legacy plugin's
  `envelopeRev` per-row versioning and its compile-time
  `vocabulary-assertions.ts` bidirectional check (event-type union vs.
  canonical name list, asserted not merely observed) is the concrete
  precedent for "versioned aggregate... asserted, not merely observed" that
  this ADR requires of FDE/SIC/DTC's own `schemaVersion` fields.

**Consequences.**
- `P410` (Wave 4) implements the aggregates and their negative tests; every
  transition function must reject an attempt to skip a state (e.g.
  `DTC_PROPOSED -> COMMITTED` directly) with a stable reason code, not a
  generic error.
- "Independently verified user-decision evidence" (execution-plan §6.4) is
  the same evidence class ADR-005's envelope binds by fingerprint — ADR-004
  fixes where that evidence is captured (at each SIC/DTC transition);
  ADR-005 fixes how it is later revalidated at commit time. The two ADRs
  share one evidence object, not two independently-sourced ones.
- Rejected/deferred hypotheses at any FDE turn must be preserved with
  provenance (execution-plan §9 Wave-4 row `P410`), matching P230's finding
  that the legacy plugin already retains `FDEOntologyTurnRecord` history
  beyond the capped "recent" projection window.

**Alternatives rejected.**
- *Collapse SIC and DTC into one contract type with a `kind` discriminator
  instead of two aggregates.* Rejected: P230 §3.1 documents them as
  independently versioned today (`SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION`
  vs. `DIGITAL_TWIN_CHANGE_CONTRACT_SCHEMA_VERSION`) specifically so "a
  gap-report format change does not force a build-session format bump" —
  the same independence argument applies to SIC vs. DTC; merging them would
  force every SIC-only change to also bump DTC's version for no semantic
  reason.
- *Infer state from the presence of downstream artifacts (e.g. "if a commit
  event exists, the DTC must have been approved") instead of an explicit
  state field.* Rejected: execution-plan §6.3 explicitly forbids inference
  from "tool success or a free-text reference" — this is the generic shape
  the rule targets, and P220 §8.4 already documents a concrete failure mode
  of implicit/optional gating (`commit_edits`' submission-criteria check
  "vacuously passes when the caller omits criteria") that explicit,
  mandatory state fields are designed to prevent from recurring at the
  SIC/DTC layer.

---

## ADR-005: ONE commit gate — typed mutation-authority envelope

**Decision.** Every protected write in the successor is reachable through
**exactly one** commit-gate service. That service accepts only a typed
mutation-authority envelope (or an opaque handle the gate itself resolves
and revalidates) carrying, at minimum, the 14 fields execution-plan §6.4
fixes: exact approved SIC body fingerprint; exact approved DTC body
fingerprint; independently verified user-decision evidence; consumer
Ontology identity and version; target primitive or object identities;
allowed action and write scope; permission/security decision references;
submission-criteria result (kept separate from permission); issuing actor
and issuing decision; issuance and expiration time; a one-time or
bounded-use nonce; a dry-run fingerprint; expected prior state or
concurrency token; and stable denial/outcome reason codes. **No handler,
hook, script, adapter, or library may call the underlying writer directly**
— this is a structural constraint the successor's module boundaries must
enforce (the writer primitive itself must not be exported from a public
module path any other successor subsystem can import), not merely a
documented convention.

This ADR is scoped as a **design and closure decision**, not an
implementation: it fixes the envelope shape and the "exactly one gate, one
minting location" invariant that `P430` (Wave 4) must implement, and it
formally closes the five named legacy gaps below as *known-must-fix*, not
as risks the successor is permitted to reproduce.

**Grounded evidence — the adjudicated single minting location (P220+U285).**
- P220 §3.1 (`outputs/p220-mutation-callgraph.md`): "Only ONE file in
  non-test production source literally constructs `type: 'edit_committed'`
  or `type: 'submission_criteria_failed'` envelopes: `lib/actions/commit.ts`"
  — the legacy plugin already has exactly one minting location for its
  reserved commit-provenance types; ADR-005 generalizes this into a formal,
  enforced architectural invariant rather than a currently-true fact of the
  code.
- P220 §7.2: the live PreToolUse gate (`prompt-dtc-enforcement-gate.ts`)
  "requires an approved DTC... and floors the gate mode to blocking for
  ontology-write operations" — the mechanism ADR-004's `MUTATION_AUTHORITY_ISSUED`
  state and ADR-005's envelope replace with a typed, revalidated object
  instead of a hook-time classification string.
- U285 §2 (`outputs/u285-residual-handler-closure.md`): F290-adopted
  callgraph amendments confirm the 2 writer verdicts among the 18 residual
  handlers reach `appendEventAtomic` **only for non-reserved-type advisory
  event appends**, never the commit gate itself — "Neither amendment
  changes P220's own §13 `Result: PASS`... they are additional CALLERS of
  the already-enumerated primitives, not a new primitive or a
  mutation-authority-gate bypass." This is the exact "exactly one
  authorized commit entry" invariant (execution-plan §9 Wave-4 row `P460`)
  ADR-005 fixes as a requirement, confirmed still true at the pinned SHA
  after the deepest available residual-handler audit.

**Grounded evidence — the five named live gaps this ADR closes (per
`synthesis/w2-fan-in.md` "P220+U285" paragraph and P220 §8).**
1. *Warn-only write-set assertion* (P220 §8.3): `assertWriteWithinDeclaredSet`
   "logs a `console.error` and **proceeds** unless
   `PALANTIR_MINI_WRITE_SET_STRICT=1`... no production code path sets it" —
   ADR-005 requires the successor's equivalent assertion to be fail-closed
   by construction, with no environment-variable escape hatch, not
   configurable-but-defaulting-to-warn.
2. *Ad-hoc atomic-write duplicates* (P220 §8.1, §6): 5 writers
   (`hooks/prompt-front-door-capture.ts` plus 4 SecondBrain manifest
   writers) "define their own local tmp+rename write function instead of
   importing `lib/fs-atomic.ts`'s `atomicWriteJson(Sync)`" — ADR-005
   requires the successor to expose exactly one governed atomic-write
   primitive and forbid any local reimplementation (enforced by the same
   module-boundary mechanism that forbids direct writer imports above).
3. *Dormant sandbox-executor direct-commit path* (P220 §8.2):
   `lib/sandbox/executor.ts`'s `runExecutor()` imports the raw `commitEdits`
   function, bypassing both the MCP tool boundary and the PreToolUse hook —
   "the single clearest structural bypass surface in the plugin." ADR-005
   requires the successor's commit primitive to never be importable outside
   the gate service's own module, so an analogous "neutral executor"
   pattern cannot be built against a raw writer in the first place.
4. *CI strict-mode dormancy* (P220 §8.3, same finding as gap 1 from the
   deployment side): zero production code path ever sets the strict-mode
   flag — ADR-005 requires the successor to have no non-strict mode to
   dormantly leave unset; strictness is not a mode, it is the only
   behavior.
5. *Scope-partial RBAC* (P220 §7.4): RBAC L2 gates only the `ship-merge`
   scope of `commit_edits`, and RBAC L2/L3 applicability to `commit_edits`
   generally was recorded `UNKNOWN` by P220 itself (§11) — ADR-005 requires
   the envelope's own `allowed action and write scope` field
   (execution-plan §6.4) to carry scope authority inside the envelope
   itself, so gate correctness does not depend on an external,
   partially-applicable permission-fragment format the successor does not
   control.

**Consequences.**
- `P430` implements the envelope type, the single commit service, and
  negative tests for missing/stale/mismatched authority (execution-plan §9
  Wave-4 row `P430`: "Bypass census becomes zero").
- `P460` (independent verifier) re-runs every known legacy bypass pattern
  found by P220/U285 §8 against the successor and must find "exactly one
  authorized commit entry, zero bypass" (execution-plan §9 row `P460`) —
  this ADR is the standard `P460` verifies against.
- Submission-criteria result is a field on the envelope, kept *separate*
  from the permission decision (execution-plan §6.4) — this directly
  prevents P220 §8.4's vacuous-when-omitted failure mode from recurring:
  the envelope's own field is mandatory, not an optional caller-supplied
  list that silently passes when empty.

**Known residual — accepted, documented threat-model boundary (P460 v3-v5,
`decisions/pm2-gate-threat-model-escalation.md`).** `scripts/boundary-check.ts`
statically bans every LITERAL route to the writer/oracle/gate-factory
primitives (deep import, computed `import()`/`require()` argument, bare
`require`/`import` aliasing/indirect-call/property-access shapes such as
`const req = require; req("literal")`, and — as of v5 — the whole
enumerable CommonJS module-loader-handle family: `module.X`/`module[...]`
(covering `module.require`, `module.createRequire`, and the sixth finding
`module["require"]`), a static/dynamic import of the `module`/`node:module`
built-in, the bare identifier `createRequire`, `require.main`/
`require.cache`, and `process.mainModule`). The irreducible residual after
v5 is GENUINE dynamic-code-execution reflection —
`Function("return require")()`, `eval(...)`, `globalThis[computedName]`,
`Reflect.get`, or any specifier/identifier built only from runtime string
concatenation. No static or AST scanner can resolve a value only known at
runtime, so this is unambiguous arbitrary in-process code execution —
outside the in-process commit gate's threat model by construction (the same
actor could reach `atomic-write.ts` directly the same way, bypassing the
gate entirely, regardless of any oracle/factory hardening; after v5,
`atomic-write.ts` is itself reachable ONLY by that same eval-class
reflection, since every enumerable module-loader-handle route to it is now
statically banned). This limitation is shared by every module in the
marketplace, including the legacy plugin, whose own writer is equally
reflection-reachable. True defense against a genuine-reflection actor
requires process/worker/capability isolation of the writer — recorded as a
Wave-11 runtime-activation / future-architecture item, not a `P460` gap; see
`decisions/pm2-gate-threat-model-escalation.md` "User Ruling and Lead
Selection — Option 1+", "Fifth Finding (aliased require)", and "Sixth
Finding (module[\"require\"]) — Lead Adjudication + v5" for the full
adjudication.

**Alternatives rejected.**
- *Keep the legacy plugin's two-choke reserved-provenance-guard pattern*
  (P220 §3.4/§8.5: the guard runs at `emit-event.ts` and `scripts/log.ts`'s
  `emit()`, "not inside `appendEventAtomic` itself... enforced by
  convention at two of the primitive's ~14 call sites, not by the primitive
  itself"). Rejected: this is convention-based enforcement, exactly the
  shape execution-plan §6.4's "No handler, hook, script, adapter, or
  library may call the underlying writer directly" forbids continuing;
  ADR-005 requires primitive-level enforcement (module-boundary, not
  caller-discipline).
- *Allow a second "trusted internal" commit path for build/CI tooling,
  separate from the runtime gate, for performance.* Rejected: this is
  structurally identical to the dormant sandbox-executor pattern (gap 3
  above) — a second path, however well-intentioned at creation, is the
  exact shape that became a live bypass surface in the legacy plugin the
  moment anything wired to it; ADR-005 fixes "exactly one" as a hard
  invariant with no privileged-caller exception.

---

## ADR-006: Storage authority

**Decision.** The successor takes source authority over the store *shapes*
P230 catalogued (32 distinct store families across event stream,
FDE/SIC/DTC state, memory layers, evidence/retention/issues, and
governance/impact-graph), while preserving the legacy plugin's proven
per-store disciplines: single-writer mutation-authority per store,
append-only event log with rename-only rotation, archive-before-remove
retention, and a versioned upcaster seam on every store whose row shape can
change. Every successor-owned store must declare: its `mutation-authority`
holder (the one code path with the write lock), its reader set, its
retention/archive mechanism, and its upcaster registry (which may be
legitimately empty at v1, matching the legacy plugin's own
`UPCASTER_REGISTRY = {}` precedent — empty-by-design is acceptable, silently
absent is not).

Storage backend choice (e.g. filesystem NDJSON vs. a database) is an
implementation detail *within* a declared store's contract, not a separate
architectural decision this ADR fixes — except where P230 flags a backend
as currently non-functional (Convex), in which case this ADR requires the
successor to record the backend as an explicit open decision rather than
silently inheriting a stub.

**Grounded evidence.**
- P230 §2 (`outputs/p230-state-migration-census.md`), full store inventory:
  32 families (§5 counts table) spanning event stream (7), FDE/SIC/DTC
  construction-lane state (14), second-brain memory layers (6),
  evidence/retention/issues/index (12), and governance/impact-graph (6) —
  adopted verbatim by `synthesis/w2-fan-in.md` ("P230: 32 store families
  adopted as the Wave-5/8 migration baseline").
- P230 §3.2: append-only discipline verified directly in source comments —
  "SOURCE EVENTS ARE NEVER MUTATED" (`compactor.ts`), "NEVER blind-delete
  events" (`quarantine.ts`, `read.ts`) — the successor's event-stream store
  inherits this invariant as a hard requirement, not a convention to
  re-derive.
- P230 §4.1: retention mechanisms all share one shape — "Archive-append
  FIRST... only THEN remove from live... under the shared manifest lock" —
  named explicitly for second-brain fold-marker retention as "NEVER
  SILENTLY DELETES." ADR-006 requires every successor store with a
  retention mechanism to follow this same archive-before-remove ordering
  (execution-plan §1.5: "archive-before-remove" is a named binding
  interpretation, not P230-specific).
- P230 §4.2 item 1: the per-row envelope upcaster
  (`lib/event-log/upcasters/index.ts`) is "on-read, never-in-place,"
  fail-loud on an unregistered rev gap, and currently has a legitimately
  empty registry (`CURRENT_ENVELOPE_REV = 0`, zero historical rows predate
  it) — the successor's upcaster seam (execution-plan §9 Wave-5 row `P540`)
  follows this exact on-read/fail-loud/empty-by-design pattern.
- P230 §4.2 item 3 and §6 UNKNOWN item 4 (Convex backend): the impact-graph
  Convex client is "STUB-ONLY as of sprint W3f-1... all mutations no-op to
  stderr," and P230 explicitly declines to resolve "whether the successor
  keeps Convex, swaps the backend, or restores a real client" from static
  evidence alone. ADR-006 does not choose a backend here — it requires
  `P520`/`P540` (Wave 5) to record the backend choice as an explicit,
  evidenced decision, and forbids the successor from silently inheriting
  the stub as if it were a working backend.
- `synthesis/w2-fan-in.md`: "P230: 32 store families adopted as the
  Wave-5/8 migration baseline; SQLite→Convex stub target and the empty
  upcaster registry are named gaps feeding P540/M820" — confirms this ADR's
  scope boundary: ADR-006 fixes the *authority and discipline* baseline now;
  the backend and upcaster *population* decisions are explicitly deferred
  to the named Wave-5/8 tasks, not silently resolved here.

**Consequences.**
- `P510`-`P550` (Wave 5) implement the typed memory items, provenance,
  retention, upcaster chain, and copy-only migration manifests against this
  ADR's 32-family baseline; `P560` (independent verifier) checks
  archive-before-remove, reader-invoked upcasting, and replay equivalence
  against it.
- The successor's storage authority is per-consumer-project (matching P230
  §2's `<root>/.palantir-mini/` convention and ADR-001's ownership
  boundary) except the small, explicitly `[global]` set P230 §2.2/§2.4/§5
  names (2 stores: registered-projects registry, prompt-front-door global
  session index) — ADR-006 carries this global/per-project split forward
  rather than flattening it, since P230 §5 flags it as a genuine structural
  distinction a future worker must not assume away.
- The Convex-backend open question is not this ADR's to close; `P520`/`P540`
  must record their backend decision with evidence before Wave 5 can be
  marked `PASS`, and `P460`/`P560` must verify no store silently depends on
  a no-op backend in production.

**Alternatives rejected.**
- *Silently restore a real Convex client as part of scaffolding this ADR,
  to avoid carrying an open question forward.* Rejected: P230 itself
  recorded this as `UNKNOWN` requiring live-state evidence this
  read-only-bounded task could not gather (§6 item 4: "whether any project
  currently has un-migrated SQLite impact-graph rows... is not determined
  from source alone") — per `UNKNOWN-is-not-PASS`, deciding a backend
  without that evidence would be guessing, not architecture; the correct
  disposition is an explicit, named, evidenced Wave-5 decision.
- *One single global store for all consumer projects instead of
  per-project `.palantir-mini/`-scoped storage.* Rejected: contradicts
  ADR-001's consumer-domain-ownership boundary directly — a single shared
  store across consumers is the same "successor absorbs consumer state
  into one plugin-owned pool" pattern ADR-001 forbids, and P230's own
  evidence shows the legacy plugin already deliberately scopes state
  per-project except the 2 named global exceptions.

---

## ADR-007: Generated runtime adapters

**Decision.** Per-runtime bindings for Codex, Claude, and Gemini are
**generated** from one neutral capability source (`A610`, Wave 6) — never
hand-derived, hand-forked, or hand-maintained per runtime. The neutral
source encodes only *capability facts* (what each runtime's official
documentation confirms `supported`, `unsupported`, or `unknown`, per R210);
it never encodes semantic decisions. `unsupported` and `unknown` cells in
R210's matrix **never become native-support claims** in a generated
binding: an `unknown` cell blocks the corresponding claim until refreshed
(execution-plan DoD item 10: "do not fabricate support"), and an
`unsupported` cell requires either an explicit documented workaround or an
explicit "unsupported, here is the neutral MCP/CLI fallback" statement, not
silent omission.

**Grounded evidence.**
- execution-plan §6.1 (bottom of the layer graph: "generated runtime
  bindings" branching to Codex/Claude/Gemini) and DoD item 9 ("Claude,
  Codex, and Gemini consume identical semantic fixtures. Packaging
  differences are adapter metadata only.") and DoD item 10 (native
  packaging must be evidenced or explicitly marked unsupported, "do not
  fabricate support").
- R210 §Method/Required Terms (`outputs/r210-runtime-capability-matrix.md`):
  the matrix's own explicit purpose statement — 8 capability areas × 3
  runtimes, each cell `supported`/`unsupported`/`unknown` against an exact
  official-source citation, "no inferred native feature." This is the
  literal "neutral capability source" ADR-007 requires `A610` to consume.
- R210 §"Per-Runtime Unknown List": "blocks Wave-11 install claims until
  refreshed" — e.g. Codex's flat-schema/no-combinator MCP input-schema rule
  is `unknown` ("no current public Codex-specific rule found"), and Claude's
  equivalent restriction is also `unknown`. ADR-007 requires the generator
  to apply the *conservative* posture R210's own "Applicability Notes"
  section already recommends ("keep schemas flat, combinator-free,
  name-restricted, and default-free even though only Gemini's constraint is
  currently officially documented — this is a conservative generation
  choice, not a claim that Codex or Claude officially requires it") rather
  than assuming permissiveness from an `unknown` verdict.
- R210 §Applicability Notes, "Subagents": "`ControlPlaneNodeKind` correctly
  carries this surface, not the product Ontology... the neutral core must
  have no dependency on runtime agents, because Codex plugin-bundled agents
  are `unknown`/undocumented and Gemini extension subagents are documented
  `preview`." — directly ties ADR-007's generation discipline to ADR-003's
  catalog and ADR-002's one-way dependency direction: the semantic core
  cannot assume any runtime-specific capability exists.
- R210 §Applicability Notes, "Authority boundary held constant": "none of
  the differences above changes `mutation-authority` or
  `consumer-domain-ownership`... `ControlPlaneNodeKind` is the only place
  runtime-surface variation is expressed; it never reclassifies a runtime
  surface as a product Ontology primitive." — confirms ADR-007 does not
  reopen ADR-001/003/005; runtime variation is confined to the generated
  bindings layer alone.
- execution-plan §6.2: "Codex public MCP input schemas must remain flat and
  must not use `anyOf`, `oneOf`, `allOf`, or `not`" — a fixed, non-`unknown`
  generation constraint this ADR carries forward regardless of R210's
  `unknown` verdict on whether Codex's *own documentation* states the rule;
  the campaign's local generation policy is stricter than what is currently
  officially confirmed, by design (R210 §7 table: "campaign policy retained
  locally").

**Consequences.**
- `A610` builds the neutral capability registry and generator; `A620`-`A640`
  generate the three bindings from it; `A650` adds parity fixtures that
  assert byte-equivalent semantic decisions, reason codes, mutation
  denials, and generated inventories across all three; `A660` (independent
  verifier) searches specifically for "hand-maintained runtime-support
  forks, provider-conditioned semantics, nested Codex schemas, and
  unsupported native claims" (execution-plan §9 row `A660`) — this ADR is
  the standard that search verifies against.
- If Gemini has no native plugin package compatible with the marketplace at
  generation time, `A640` must "provide a neutral MCP/CLI transport, mark
  native packaging unsupported, and test that claim" (execution-plan §9 row
  `A640`) rather than omit Gemini support silently.
- Every `unknown` cell R210 recorded remains `unknown` in the successor's
  own generated-support inventory until a fresh official-source refresh
  resolves it (`UNKNOWN-is-not-PASS`); `A610`'s capability registry must
  carry R210's verdicts forward verbatim, not round them up to `supported`.

**Alternatives rejected.**
- *Hand-write each runtime's binding independently, using R210 as
  background reading rather than a generation input.* Rejected: this is
  exactly the "hand-maintained runtime-support fork" pattern `A660` is
  explicitly tasked with searching for and rejecting (execution-plan §9 row
  `A660`); it also reopens the risk R210's own matrix was built to close —
  a hand-written Claude binding and a hand-written Codex binding drifting
  apart on an undocumented assumption neither author checked against an
  official source.
- *Treat R210's `unknown` cells as permissively `supported` to unblock
  generation now, and correct later if wrong.* Rejected: violates
  `UNKNOWN-is-not-PASS` directly and DoD item 10's "do not fabricate
  support" — R210 §"Per-Runtime Unknown List" states explicitly these cells
  "block... install claims until refreshed"; the generator honoring that
  block is this ADR's requirement, not an optional caution.

---

## ADR-008: Legacy compatibility

**Decision.** The legacy plugin (`plugins/palantir-mini/`) remains
**completely untouched** by this campaign until the separate `I1195`
adjudication (Wave 11, explicit user gate). The successor may **read** the
legacy plugin as a behavioral/migration baseline (as every Wave-2 census
task already did) but no successor source, contract, or test may modify,
delete, or depend at runtime on any `plugins/palantir-mini/**` path. Where
the successor needs legacy-plugin-produced data (e.g. existing consumer
`.palantir-mini/` state) for compatibility, that data is consumed through
**copy-only importers** — one-directional, non-mutating readers that
translate legacy-shaped state into successor-shaped state without writing
back to, or altering, the legacy store or its schema.

The P210 disposition matrix (port 185 / merge 2 / externalize 8 / deprecate
3 / remove 2 / retain-legacy-only 28, `outputs/p210-legacy-surface-census.md`
§13, adopted by `synthesis/w2-fan-in.md`) is the binding inventory for what
the successor ports, merges, externalizes, or leaves `retain-legacy-only`
inside the legacy plugin's own tree. `retain-legacy-only` items are not
ported at all — they stay legacy-plugin-shaped and legacy-plugin-owned;
the successor builds its own equivalent only where P210 disposed `port` or
`merge`.

**Grounded evidence.**
- execution-plan §1.1: "Do not rename, overwrite, or delete
  `plugins/palantir-mini/`. Treat the current plugin as a read-only
  behavioral and migration baseline. A later user decision may retain both
  identities, retire the legacy identity, or rename the successor after
  cutover proof. This campaign does not make that retirement decision."
- `synthesis/w2-fan-in.md` (Wave 3 authorization paragraph): "the legacy
  plugin remains untouched until I1195 adjudication" — the exact deferred
  decision this ADR names, verbatim, as the closing condition.
- P210 §0 (`outputs/p210-legacy-surface-census.md`), scope proof: "this
  census read `plugins/palantir-mini/**`... compatibility READ only — zero
  writes" and §16: "the legacy plugin itself was read-only throughout, zero
  writes" — the precedent every subsequent Wave-2/3 task (including this
  one) follows; ADR-008 makes that precedent a standing architectural rule
  rather than a per-task habit.
- P210 §13 (grand counts summary): the full 235-item, 6-column disposition
  matrix (port=185, merge=2, externalize=8, deprecate=3, remove=2,
  retain-legacy-only=28) — this is the exact inventory ADR-008 binds as the
  successor's port/merge/externalize/retain scope; `synthesis/w2-fan-in.md`
  confirms "P210: 235 legacy surfaces, dispositions adopted" with the 7
  former UNKNOWNs resolved by U280 folded into `deprecate`/`port`/
  `retain-legacy-only` as stated there.
- execution-plan §1.7 (Removal Policy): "No removal may occur without... an
  exact item or path inventory; a consumer/reference graph; a
  classification of `port, merge, externalize, deprecate, remove, or
  retain-legacy-only`; a replacement or explicit proof that no replacement
  is required; negative tests...; compatibility and migration treatment for
  existing callers or state; rollback instructions; an independent
  verifier result of PASS. UNKNOWN never authorizes removal." — the
  procedural gate every `remove`/`deprecate` item in P210's matrix must
  still pass in a later Wave before it is actually deleted anywhere; ADR-008
  does not itself authorize any deletion, it only fixes that the legacy
  tree is never the target of one.
- P210 §5 UNKNOWN item 1 (`prompt-fde-readiness-advisory.ts`), resolved by
  U280 to `resolved:intentional-deregistration`
  (`outputs/u280-unknown-resolution-audit.md` §1a item 1): a concrete
  worked example of exactly the read-only, evidence-based discipline this
  ADR requires of every future compatibility read — the resolution was
  reached by `git log`/`git show` evidence against the legacy tree, with
  zero writes to it.

**Consequences.**
- `P320`'s scaffold (Wave 3) does not copy any `plugins/palantir-mini/`
  directory wholesale (execution-plan §9 row `P320`: "Do not copy legacy
  directories wholesale"); it builds fresh per P210's `port`/`merge`
  disposition content, not a forked copy of legacy files.
- Any future copy-only importer (Wave 5, `P550` migration manifests) must
  be provably non-mutating against the legacy store: `P560`'s independent
  verification (execution-plan §9 row `P560`) includes "no source-store
  rewriting" as an explicit acceptance criterion, which this ADR extends
  specifically to the legacy plugin's own state as one instance of "source
  store."
- The `I1195` retirement adjudication (Wave 11, explicit user gate,
  execution-plan §9 Wave 11) is the only task in the entire campaign
  authorized to change the legacy plugin's disposition from
  "untouched baseline" to anything else, and only after `S1050` PASS per
  the shared-worker-contract's Wave-11 exception clause.

**Alternatives rejected.**
- *Delete `retain-legacy-only` items from the legacy plugin now, since the
  successor will never port them.* Rejected: `retain-legacy-only`
  explicitly means "stays where it is, legacy-shaped" (P210 §3 rationale
  column, e.g. `pm_rule_query`: "Looks up `~/.claude/rules/**` — a
  Claude-runtime-specific corpus path, not a semantic-core concept") — it
  is a disposition about the *successor's* scope, not a deletion order
  against the legacy plugin; execution-plan §1.1 forbids deleting from the
  legacy plugin under this campaign regardless of any item's successor
  disposition.
- *Let the successor import legacy plugin modules directly at runtime for
  convenience during the transition period (a "temporary" shared
  dependency).* Rejected: this collapses ADR-002's one-way dependency
  direction and ADR-008's own read-only boundary in one step — a runtime
  import is not a "read," it is a live coupling that would make the
  successor's correctness depend on the legacy plugin never changing, the
  opposite of the two independently-testable plugins execution-plan DoD
  item 3 requires.

---

## Requirement trace (execution-plan §5 Definition of Done)

**Naming note.** Execution-plan §5 ("Definition of Done") states 14 numbered
completion conditions; item 4 of that list refers to "48 fixed requirements"
whose atomic enumeration (`A1-*`/`A2-*`/`MEM-*`/`X-*` IDs, per execution-plan
§12) lives in `w7-requirements.md` under the **separate**
`_workspace/2026-07-17-palantir-ontology-field-manual/` run — a file outside
this task's exact read set (`p310.md` names only `context/execution-plan.md`
from this run, not that sibling workspace). Per this task's bounded scope,
the trace below maps every one of execution-plan **§5's own 14 numbered
items** (referenced here as `DoD-1` through `DoD-14`) to the ADR(s) that
bind it. This satisfies the validation contract's "every execution-plan §5
fixed requirement ID maps to at least one ADR" using the exact §5 text this
task actually read; the finer-grained 48-ID `A1-*`/`A2-*`/`MEM-*`/`X-*`
audit against `w7-requirements.md` is `V910`'s job (execution-plan §9 Wave
9), downstream of the full Wave-4/5/6 implementation this ADR set only
authorizes.

| DoD item (§5, verbatim condition) | ADR(s) | How the ADR binds it |
| --- | --- | --- |
| DoD-1: Field Manual merged, validator passes | — (Wave 0/1, `HU-1`/`H040`) | Out of this ADR set's scope; a harness-repo precondition, not a successor-architecture decision. Not traced to an ADR by design. |
| DoD-2: doctrine no longer models runtime adapters/hooks/MCP handlers as Object Types | ADR-003 | The `ControlPlaneNodeKind` catalog is the successor-side implementation of this doctrine rule; ADR-003's evidence section cites P210 §8d's 9-file finding as the exact violation pattern DoD-2 forbids. |
| DoD-3: `plugins/palantir-ontology/` exists as a separately testable successor with one runtime-neutral semantic core | ADR-002 | The one-way dependency graph fixes "one runtime-neutral semantic core" structurally: no semantic-core file may import a runtime adapter, so the core is testable independent of any adapter. |
| DoD-4: all 48 fixed requirements classified `implemented` with deterministic evidence | ADR-004, ADR-005 | Out of this task's direct scope (see naming note above); ADR-004/005 are the two decision areas (state machines, commit gate) the largest share of the 48 IDs (the `A1-*` and `X-*` prefixes) trace back to, per the ID ranges execution-plan §9 cites against `P410`/`P430`. |
| DoD-5: all six structural kill gates `not-triggered` | ADR-005, ADR-008 | ADR-005's "exactly one commit gate" and ADR-008's "legacy untouched, no accidental copy" are the two decision areas most directly responsible for avoiding kill-gate triggers (multiple protected writers; direct commit without authority; changed math-KG content by legacy-boundary violation). |
| DoD-6: protected mutation reachable through exactly one verified commit gate, no alternate bypass | ADR-005 | This is ADR-005's central decision, stated near-verbatim; the five named legacy-gap closures in ADR-005 directly target "no alternate executable bypass." |
| DoD-7: Altitude-2 exposes no construction or authority-minting capability | ADR-004, ADR-005 | ADR-004 keeps construction (FDE/SIC/DTC) as an Altitude-1-only state machine; ADR-005 keeps authority-minting inside the one commit-gate service that Altitude-2 may only call through, never bypass. |
| DoD-8: four typed memory forms, provenance, retention, replay, upcasting, migration, rollback are source-authoritative and tested | ADR-006 | Storage authority is exactly this decision area; ADR-006's archive-before-remove and upcaster-seam requirements are the architectural precondition for `P510`-`P550`'s later implementation. |
| DoD-9: Claude/Codex/Gemini consume identical semantic fixtures; packaging differences are adapter metadata only | ADR-002, ADR-007 | ADR-002 fixes that the semantic core cannot depend on any runtime; ADR-007 fixes that the three bindings are generated from one neutral source rather than hand-forked, which is the mechanism that keeps them identical. |
| DoD-10: current official documentation supports every claimed native packaging path; explicit unsupported record if none exists | ADR-007 | ADR-007's "never becomes a native claim" rule for `unsupported`/`unknown` R210 cells is this condition's direct architectural expression. |
| DoD-11: non-math consumer Ontology passes governance/graph/reference/mutation/successor-binding gates | ADR-001, ADR-003 | ADR-001's consumer-domain-ownership boundary and ADR-003's `ControlPlaneNodeKind` catalog are the two decision areas Wave-7 consumer remediation (`N720` onward) binds against, per N220's finding-to-ADR routing already stated in `synthesis/w2-fan-in.md`. |
| DoD-12: math-KG protected content unchanged | ADR-001, ADR-008 | ADR-001 (successor never absorbs consumer domain content, math included) and ADR-008 (legacy plugin, where no math content lives, stays untouched) jointly bound the two repositories this ADR set can affect; neither authorizes any math-KG-path write, and math-KG was never read by this task (§Scope proof below). |
| DoD-13: every source PR merged, ancestor of `origin/main`, branches/worktrees cleaned, unrelated local changes untouched | — (Lead git-closeout tasks, e.g. `P350`) | Out of this ADR set's scope; a process/Git-discipline condition, not an architecture decision. Not traced to an ADR by design. |
| DoD-14: final install/cutover decision packet exists; no runtime installation or legacy retirement without new explicit user approval | ADR-008 | ADR-008 names `I1195` (Wave 11, explicit user gate) as the only task authorized to change the legacy plugin's disposition — the exact "no legacy retirement without new explicit user approval" condition. |

**Coverage.** 12 of the 14 `DoD` items map to at least one ADR (DoD-2, 4-12,
14); 2 items (DoD-1, DoD-13) are explicitly out of this ADR set's scope by
design (harness-repo precondition and Git-process discipline, respectively,
neither an "architecture" decision the eight named decision areas in
`p310.md` cover) and are recorded above rather than silently omitted, per
`UNKNOWN-is-not-PASS` — they are not `UNKNOWN`, they are scoped-out with a
stated reason.

---

## Doctrine conformance

Every ADR above was checked against `ssot/palantir/ontology/primitives.md`'s
explicit reject list before acceptance:

| Doctrine reject line | Checked against | Result |
| --- | --- | --- |
| "Each non-model control surface = an object type." | ADR-003 | Conforms: `ControlPlaneNodeKind` entries are typed metadata (`kind`/`sourcePath`/`runtimeScope`/`disposition`), never given a Properties/Links/Actions shape reserved for Lane-1 primitives. |
| "Claude and Codex are object types implementing a runtime Interface." | ADR-002, ADR-007 | Conforms: provider identity is adapter/generation metadata (ADR-007); no ADR models a runtime as an Interface-implementing Object Type. |
| "Every callable local verb is an Action Type and every runtime heuristic is a Function." | ADR-003, ADR-005 | Conforms: the mutation-authority envelope (ADR-005) and the control-plane catalog (ADR-003) both explicitly withhold Action Type/Function status from runtime verbs and heuristics; those primitives remain Lane-1, consumer-declared only (`ssot/palantir/ontology/primitives.md` "Product execution and protected successor writes are separate lanes"). |
| "DTC approval grants commit authority for any matching protected write." | ADR-004, ADR-005 | Conforms: ADR-004 states DTC approval "only enables routing to the next governance step... never grants commit authority by itself"; ADR-005 requires a separate, independently-issued envelope for every protected write. |
| "Every consumer must adopt provider and runtime surfaces as shared domain primitives." | ADR-001, ADR-003 | Conforms: ADR-001 forbids the successor from imposing any domain meaning on a consumer; ADR-003's catalog is successor/local metadata, never a required consumer domain adoption. |
| "Every many-to-many Link Type uses a canonical join object." | (not applicable) | No ADR in this set defines a Link Type or cardinality pattern — that is Lane-1 consumer-domain modeling (N220 §1c finding 12's subject), out of this successor-architecture ADR set's scope. Recorded for completeness, not silently skipped. |
| "OAG is the official runtime-neutral retrieval primitive." | (not applicable) | No ADR in this set names OAG as a retrieval primitive or otherwise; out of scope for the eight named decision areas. Recorded for completeness. |

No ADR above grants product semantic authority to a runtime: ADR-002 keeps
the semantic core adapter-blind; ADR-003 keeps runtime surfaces out of the
product-primitive vocabulary entirely; ADR-005 keeps mutation authority in a
typed envelope evaluated by one gate, never by runtime/tool availability
(`ssot/palantir/ontology/primitives.md`: "Tool availability, runtime actor
identity, and provider packaging do not create product permission,
approval, or semantic authority" — the exact sentence ADR-005's envelope
design and ADR-003's catalog jointly implement).

---

Sources consulted (full citations inline above): `synthesis/w2-fan-in.md`;
`outputs/p210-legacy-surface-census.md`; `outputs/p220-mutation-callgraph.md`;
`outputs/p230-state-migration-census.md`; `outputs/n220-nonmath-gap-map.md`;
`outputs/u280-unknown-resolution-audit.md`;
`outputs/u285-residual-handler-closure.md`;
`outputs/r210-runtime-capability-matrix.md`; `ssot/palantir/ontology/primitives.md`;
`ssot/ontology-first-program.md`; `context/execution-plan.md`;
`context/shared-worker-contract.md`. Full scope proof, requirement-trace
coverage count, and rule-06 bottleneck checks are recorded in
`outputs/p310-architecture.md`.

