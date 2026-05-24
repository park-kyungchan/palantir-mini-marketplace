# Ontology Schema — Query Interface

Use this file when you know the question and want the smallest schema read set.

If you need structure, provenance, or change discipline instead, open `INDEX.md`.

## Role Contract
- `BROWSE.md` chooses the smallest schema read set for a concrete ontology question.
- `INDEX.md` explains structure, provenance, authority flow, and maintenance discipline.
- Project-local semantics stay downstream of this schema package.

## Read Order
1. project-local `BROWSE.md`
2. project-local `INDEX.md`
3. `~/.claude/research/BROWSE.md` when upstream reasoning is needed
4. `~/.claude/schemas/ontology/BROWSE.md`
5. target schema file(s)

## Primary Routes

| Question | Read These Files |
|----------|------------------|
| Where is meta-level semantic authority defined? | `semantics.ts` |
| How should AI agents interpret legacy `research/palantir/*` citations? | `research-source-map.ts`, then `primitives/research-document.ts` |
| Where is the project export contract defined? | `types.ts` |
| Where do LEARN / BackPropagation typed contracts live? | `types.ts`, then `semantic-audit.ts`, then `project-validator.ts` |
| Where do frontend/runtime scope contracts live? | `types.ts`, `project-validator.ts`, `semantic-audit.ts` |
| How does semantic audit infer Twin Maturity? | `semantic-audit.ts` |
| How are typed refs validated? | `project-validator.ts` |
| How should a project consume this package? | `project-test.test.ts` |
| What changed recently? | `CHANGELOG.md` |

## palantir-mini Primitives

Typed executable contracts consumed by the `palantir-mini` plugin
(`~/.claude/plugins/palantir-mini/`).

| Question | Read These Files |
|----------|------------------|
| ObjectType declaration + branded ObjectTypeRid | `primitives/object-type.ts` |
| LinkType / Object-Backed LinkType discriminated union | `primitives/link-type.ts` |
| Tier-1/Tier-2 ActionType union (mutually exclusive per §ACTION.MU-09..11) | `primitives/action-type.ts` |
| 24 branded PropertyType names (String/Vector/Timestamp/...) | `primitives/property-type.ts` |
| InterfaceType (LOGIC not DATA per SH-01 transition-zone) | `primitives/interface-type.ts` |
| EditFunction signature (returns `Edits[]` without commit — §LOGIC.FN-04) | `functions/function-signature.ts` |
| DerivedProperty declaration (computed, not stored) | `functions/derived-property.ts` |
| Reducer<In,Out> PECS primitive (fold events → snapshot) | `functions/reducer.ts` |
| SubmissionCriteria 9 constraint classes (Range/ArraySize/.../Unevaluable) | `policies/submission-criteria.ts` |
| Layer-1 RBAC role templates (ontology-reader/writer, action-executor, ...) | `policies/rbac.ts` |
| ForwardProp + BackwardProp v0 policies (6 steps each) | `policies/propagation.ts` |
| Decision Lineage 5-dim (WHEN / ATOP_WHICH / THROUGH_WHICH / BY_WHOM / WITH_WHAT) | `lineage/decision-lineage.ts` |
| Runtime EventEnvelope type registry | `lineage/event-types.ts` |
| OSDK 2.0 separated client/generated config | `generators/osdk-2.0-config.ts` |
| LazyRef pattern (circular-import avoidance in generated code) | `generators/lazy-loader.ts` |

## Minimal Schema Context Injection

Use palantir-mini `research_context_select` first when available; it returns
the exact schema files to inject. If unavailable, use these slices:

| Task | Inject Only |
|------|-------------|
| Business object modeling | `primitives/object-type.ts`, `primitives/link-type.ts`, `primitives/interface-type.ts` |
| App/workflow/agent exposure | `primitives/object-view.ts`, plus the owning `object-type.ts` |
| Governed mutation | `primitives/action-type.ts`, `policies/submission-criteria.ts`, `policies/rbac.ts` |
| AI FDE branch/proposal review | `primitives/ontology-branch-proposal.ts`, `primitives/lineage-refs.ts`, `primitives/scenario-sandbox.ts` |
| AIP Chatbot / AI FDE agent | `primitives/aip-agent.ts`, `primitives/object-view.ts`, `primitives/action-type.ts` |
| AIP Logic / LLM-backed function | `primitives/aip-logic-function.ts`, `primitives/aip-evaluation.ts` |
| AIP Evals / model comparison | `primitives/aip-evaluation.ts`, `primitives/grading-criterion.ts`, `primitives/outcome-pairing.ts` |

Never inject the whole schema package for implementation work. Schema context
should be just enough to preserve TypeScript contract meaning.

## Agent Use Rules

- If you only need the downstream schema contract, stop at the smallest domain file.
- If a schema comment or `source:` string cites a legacy `research/palantir/*` path, resolve it through `research-source-map.ts` before treating it as authority.
- Do not use `_archive/` as active SSoT. Use it only when `research-source-map.ts` says the official layer is still incomplete for that concept.

## Verification
- `bun test`
- `bunx tsc --noEmit --module esnext --target es2022 --moduleResolution bundler ~/.claude/schemas/ontology/types.ts ~/.claude/schemas/ontology/semantics.ts ~/.claude/schemas/ontology/semantic-audit.ts ~/.claude/schemas/ontology/project-validator.ts ~/.claude/schemas/ontology/project-test.test.ts`
