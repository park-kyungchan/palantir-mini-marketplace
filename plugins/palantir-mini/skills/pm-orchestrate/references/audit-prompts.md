# Domain Audit Prompt Templates

These templates are used in Phase 2 (AUDIT) to spawn parallel Explore agents.
Each agent receives one template, customized with project-specific paths.

## Usage

Replace `{ONTOLOGY_PATH}`, `{SCHEMA_PATH}`, `{SRC_PATH}` with actual project paths.
Spawn all 4 agents in a SINGLE message (parallel background execution).

---

## DATA Domain Agent

```
[Operate at maximum reasoning effort — be thorough, verify your own work.]

You are analyzing the DATA domain for drift, dead code, and bottlenecks.

Context: This project uses an ontology-first architecture where `{ONTOLOGY_PATH}/data.ts`
declares all entities and struct types. The backend schema (`{SCHEMA_PATH}`) and
TypeScript types (`{SRC_PATH}/types/`) must match.

Tasks (research only, do NOT edit files):

1. Read `{ONTOLOGY_PATH}/data.ts` and catalog ALL ObjectTypes (entities).
   List each entity apiName.

2. Read `{SCHEMA_PATH}` and check: does every ontology ObjectType have a matching
   table? Are there extra tables not declared in ontology?

3. Read key TypeScript type files in `{SRC_PATH}/types/` — check if runtime
   interfaces match ontology struct field declarations. List field mismatches.

4. Check for dead struct types — grep {SRC_PATH} for usage of each struct type
   name. Report any structs declared in ontology but never referenced in src/.

Report findings as:
- DRIFT: ontology↔runtime mismatches (with file:line references)
- DEAD CODE: unused declarations
- BOTTLENECK: problematic patterns
- CLEAN: confirmed alignments
```

---

## LOGIC Domain Agent

```
[Operate at maximum reasoning effort — be thorough, verify your own work.]

You are analyzing the LOGIC domain for drift, dead code, and bottlenecks.

Context: `{ONTOLOGY_PATH}/logic.ts` declares linkTypes, queries, derivedProperties,
and functions. Backend queries file implements the queries.

Tasks (research only, do NOT edit files):

1. Read `{ONTOLOGY_PATH}/logic.ts`. List ALL declared queries (apiName + queryType).

2. Read backend queries file. List ALL exported query functions.

3. Cross-reference: For each ontology query, is there a matching implementation?
   For each implementation, is it declared in ontology? Report mismatches.

4. Check query SEMANTICS: Does each query's args match its ontology queryType?
   (e.g., "filter" type should accept filter params, not just single ID)

5. Check derivedProperties: grep {SRC_PATH} for any usage. Report unused ones.

6. Check functions: are declared functions actually implemented? Report orphans.

7. Check for expensive query patterns (full table scans, N+1 risks).

Report findings as: DRIFT / DEAD CODE / BOTTLENECK / CLEAN
```

---

## ACTION Domain Agent

```
[Operate at maximum reasoning effort — be thorough, verify your own work.]

You are analyzing the ACTION domain for drift, dead code, and bottlenecks.

Context: `{ONTOLOGY_PATH}/action.ts` declares mutations, webhooks, and automations.
Backend mutations file implements them.

Tasks (research only, do NOT edit files):

1. Read `{ONTOLOGY_PATH}/action.ts`. List ALL declared mutations.

2. Read backend mutations file. List ALL exported mutation functions.

3. Cross-reference: Report undeclared mutations (in backend but not ontology)
   and unimplemented mutations (in ontology but not backend).

4. Check mutation PARAMETERS: For key mutations, compare ontology parameter
   declarations with actual backend argument types. Report parameter drift.

5. Check webhooks/automations: Are they actually wired, or declared-only?

6. Check frontend consumers: grep {SRC_PATH} for mutation calls. Report any
   calls to undeclared mutations.

7. Check validationFns: For each mutation with declared validators, verify
   the validation is actually implemented (not just declared).

Report findings as: DRIFT / DEAD CODE / BOTTLENECK / CLEAN
```

---

## LEARN + Runtime Agent

```
[Operate at maximum reasoning effort — be thorough, verify your own work.]

You are analyzing LEARN infrastructure, Runtime layer, and detecting dead code.

Tasks (research only, do NOT edit files):

## LEARN Domain
1. Check LearnInfrastructure declaration — are hookEvents, evaluations,
   outcomes actually persisted in the backend?
2. Grep for audit event dispatch in {SRC_PATH} — which views emit events?
   Which views are missing instrumentation?

## Runtime Layer
3. Read runtime bindings — list all support bindings with implementation status.
   Report any "partial" or "not-yet-consumed" bindings.
4. Check route declarations match actual frontend routing.
5. Check deployment config is consumed by the application.

## Dead Code Detection
6. Search for imports of deleted/renamed files.
7. Find files never imported by any other file (orphans).
8. Check generated registries — are all exported types consumed?

Report findings as: DRIFT / DEAD CODE / BOTTLENECK / CLEAN
```

---

## CODEGEN Agent

```
[Operate at maximum reasoning effort — be thorough, verify your own work.]

You are analyzing the codegen pipeline for correctness and completeness.

Context: The project uses ontology-driven code generation from
`~/.claude/schemas/ontology/codegen/` to produce backend schema, queries,
mutation stubs, and frontend registry files.

Tasks (research only, do NOT edit files):

## Schema Generation
1. Read `~/.claude/schemas/ontology/codegen/convex-schema-gen.ts`.
   Check: does it include ALL required+readonly fields? (DL 5D fields like
   timestamp, sessionId, byIdentity are required+readonly — must NOT be skipped.)
2. Compare generated `{SCHEMA_PATH}` against ontology entity properties.
   Report fields present in ontology but missing from generated schema.

## Mutation Generation
3. Read `~/.claude/schemas/ontology/codegen/convex-mutations-gen.ts`.
   Check: how does it classify mutation vs internalMutation?
   Verify the classification matches ontology reviewLevel semantics:
   - "monitor" → internalMutation (correct)
   - "recommend" / "full-autonomy" → public mutation (correct)
   - Any name-based heuristic (e.g., startsWith("record")) → flag as fragile

## Registry Generation
4. Read generated registry file (e.g., `{SRC_PATH}/generated/ontology-registry.generated.ts`).
   Check: does it match current ontology event counts, field counts, mode counts?

## Roundtrip Integrity
5. Run `bun run ontology:gen --dry-run` if available. Compare dry-run output
   against existing generated files. Report differences.

Report findings as:
- CRITICAL: codegen produces incorrect output (wrong types, missing fields)
- DRIFT: codegen output is stale but not breaking
- BOTTLENECK: codegen has fragile heuristics that will break on new additions
- CLEAN: codegen accurately reflects ontology
```
