# Self-Ontology (`self/`) — Query Interface

pm's OWN control surface, modeled AS typed Palantir primitive **instances**
(ObjectType / LinkType / ActionType / Function / Property). This is the
**M-SELF** deliverable: the north star of the harness redesign is pm's own typed
Ontology; the de-Claude neutralization (W3–W5) is the **prerequisite** that makes
each surface clean enough to model here — not the goal.

> **The latency this un-latents:** the primitive *types* ship under `../primitives/`,
> but `*_TYPE_REGISTRY.register` for pm's own surface was **0 hits** across the whole
> snapshot. `self/` is where pm finally turns the vocabulary on itself. Smoke =
> `register`-grep over `self/` > 0.

## Derived-view invariant
The 9 understand-phase axes (DATA/LOGIC/ACTION/GOVERNANCE +
CONTEXT/SUCCESS-EVAL/CONSTRAINTS-NONGOALS/ACTORS/MEMORY-PRIOR) and the registered
ObjectType/ActionType/… instances are the **SSoT**. The DATA/LOGIC/ACTION/GOVERNANCE
4-quadrant lens is a **VIEW generated FROM** these primitives, never a peer of them.

## Routes

| Question | Read |
|----------|------|
| pm's understand-phase meaning contract, as a registered ObjectType | `semantic-intent-contract.objecttype.ts` |
| The embedded record shape each axis Property resolves to | `sic-axis.struct.ts` (Struct → STRUCT_REGISTRY) |
| What's registered + how importing triggers registration | `index.ts` (barrel; importing self-registers every instance) |
| The primitive *types* these instances inhabit | `../primitives/object-type.ts`, `../primitives/struct.ts`, `../primitives/semantic-intent-contract.ts` |

## Registered instances (M-SELF counter)

| Kind | Instance | RID | Source surface |
|------|----------|-----|----------------|
| ObjectType | `SemanticIntentContract` | `pm.self.ontology/object-type/semantic-intent-contract` | understand-phase SIC (prim-learn-25); the 9 axes → `Struct` Properties |
| Struct | `SicAxis` | `pm.self.ontology/struct/sic-axis` | the `{summary, refs, status}` shape every axis Property resolves to |

_Counter is tracked authoritatively in the effort `README.md` §M-SELF (k/N). Each
neutralized wave (W3d/e/f) adds ≥1 instance as a HARD rule-25 §Wave-split DoD gate._

## Roadmap (binary DoD)
- **W3.5 consolidation** — add `self/links.ts` (LinkTypes between self ObjectTypes);
  run the dogfood: `ONTOLOGY_DTC_BUILD_SEQUENCE` ready-for-dtc over the self-model +
  `propagation_audit_forward` with pm as the subject.
- **W3e** — model the executor/sandbox as an ActionType + the MCP tools as an
  `McpTool` ObjectType + per-tool Action/Function.
- **W3f** — first `self/links.ts` LinkTypes.

## Verification
- `bun test tests/ontology/self/` (registration smoke — proves register-grep > 0).
- Per-file typecheck (the snapshot's own broken project tsconfig is not the gate):
  `bunx tsc --noEmit --module esnext --target es2022 --moduleResolution bundler <file>`.
