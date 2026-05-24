---
title: TypeScript Type Safety as Anti-Hallucination Mechanism
slug: type-safety-as-grounding
fileClass: vision-typescript
provenanceMarkers: [Vision, Synthesis]
primaryCitations:
  - { source: "palantir.com/docs/foundry/ontology/core-concepts/", fetched: 2026-05-01, verbatimAvailableAt: null }
adapterTargets: []
lastVerified: 2026-05-01
harnessSpeciesMentioned: []
ssotTier: T3
---

# TypeScript Type Safety as Anti-Hallucination Mechanism

> **Layer:** CROSS (spans DATA + LOGIC + ACTION via OSDK codegen)
> **SSoT for:** OSDK type generation pipeline, compile-time hallucination prevention, typed schema ↔ LLM grounding relationship
> **Provenance:** Mixed — OSDK type generation from Ontology is [Official]; compile-time enforcement is [Fundamental TypeScript]; "type system as anti-hallucination" framing is [Inference from mechanism chain, not an explicit Palantir claim]
> **Schema anchors:** N/A (new research area)
> **Markers:** `[§TS.ABBREV-NN]` format, abbreviation: `.TSG` (TypeScript Grounding)

---

## [§TS.TSG-01] The Claim Under Investigation

> "TypeScript의 타입 시스템 자체가 anti-hallucination 메커니즘이다 — 이것은 인위적 연결이 아니라, Palantir 스키마가 의도적으로 TS 타입 시스템을 hallucination 방지 장치로 설계한 것."

**Verdict: Mechanistically TRUE, but not an explicit official Palantir claim.**

The mechanism chain is real and officially documented at each link. Palantir never uses the phrase "TypeScript types prevent hallucination" — but the architecture they built produces exactly this effect. The connection is not artificial; it is an emergent property of a well-documented design.

---

## [§TS.TSG-02] The Mechanism Chain (4 links, each with provenance)

```
Link 1: Ontology → Typed Schema Definitions [Official]
Link 2: OSDK Codegen → TypeScript Types [Official]
Link 3: TypeScript Compiler → Compile-Time Rejection [Fundamental TS]
Link 4: Compile-Time Rejection → Hallucination Prevention [Inference]
```

### [§TS.TSG-03] Link 1: Ontology as Typed Schema (Official)

Every Palantir Ontology concept is a **typed schema definition**:

| Concept | Official Definition | Type Implication |
|---------|-------------------|------------------|
| Object Type | "The schema definition of a real-world entity" | Typed interface with named properties |
| Property | "The schema definition of a characteristic" | Typed field with one of 19 BasePropertyTypes |
| Link Type | "The schema definition of a relationship between two object types" | Typed reference with cardinality |
| Action Type | "The schema definition of a set of changes or edits" | Typed mutation with submission criteria |
| Function | "A piece of code-based logic that takes in input parameters and returns an output" | Typed function signature |

Source: palantir.com/docs/foundry/ontology/core-concepts/ (scraped 2026-03-19)

The Ontology is not a free-form description — it is a **formal typed specification**. Every concept has a schema definition that constrains what values, relationships, and operations are valid.

### [§TS.TSG-04] Link 2: OSDK Codegen → TypeScript Types (Official)

Palantir's OSDK generates language-specific types directly from the Ontology:

> "**Strong type-safety:** The functions and types generated for the OSDK are based on just the subset of the Ontology relevant to you. Types and functions are generated from your Ontology, allowing you to query and explore your Ontology directly in your editor."
> — palantir.com/docs/foundry/ontology-sdk/overview/

> "The generated code uses metadata about your Ontology, including property names and descriptions. You can view this metadata directly in your editor."
> — same source

**What OSDK generates (from TypeScript OSDK docs):**

```typescript
// Generated type — every property name comes from the Ontology
const result: Osdk.Instance<Restaurant> = await client(Restaurant).fetchOne("primaryKey");
// result.restaurantName   ← valid (exists in Ontology)
// result.hallucinated     ← TypeScript ERROR (does not exist in Ontology)

// Generated filter types — only valid operators per property type
const page = await client(Restaurant)
  .where({ restaurantName: { $startsWith: "foo" } })
  .fetchPage({ $pageSize: 30 });
// { restaurantName: { $sqrt: 5 } }  ← TypeScript ERROR ($sqrt not a valid operator)

// Generated action types — typed parameters with validation
const result = await client(addReview).applyAction({
  restaurantId: "id1",
  reviewRating: 5,
  reviewSummary: "Great!",
});
// applyAction({ nonExistentParam: "x" })  ← TypeScript ERROR
```

Source: palantir.com/docs/foundry/ontology-sdk/typescript-osdk/ (scraped 2026-03-19)

The codegen step is the critical bridge: it transforms **semantic definitions** (Ontology) into **compile-time constraints** (TypeScript types). A property that doesn't exist in the Ontology cannot be referenced in TypeScript code — the compiler rejects it.

### [§TS.TSG-05] Link 3: TypeScript Compiler as Constraint Enforcer (Fundamental TS)

TypeScript's type system provides several hallucination-relevant guarantees:

| TS Feature | Anti-Hallucination Effect |
|-----------|--------------------------|
| **Structural typing** | Only properties defined in the Ontology-generated interface are accessible |
| **Strict null checks** | Optional vs required properties enforced — can't assume a property exists if it's optional |
| **Exhaustive switch** | Discriminated unions (e.g., action types) must handle every case — no invented cases |
| **No implicit any** | Every variable must have a known type — no "anything goes" escape hatches |
| **Excess property checking** | Object literals can't include extra properties — prevents inventing fields |

This is not Palantir-specific — it's fundamental TypeScript compiler behavior. But the combination of OSDK codegen + TS compiler creates a hallucination-proof pipeline:

```
Ontology defines: { restaurantId, restaurantName, address, ... }
OSDK generates: interface Restaurant { restaurantId: string; restaurantName: string; address: string; ... }
Developer writes: result.nonExistentField
Compiler says: TS2339: Property 'nonExistentField' does not exist on type 'Restaurant'
```

**The compiler cannot be hallucinated past.** An LLM generating OSDK code will have its output rejected by `tsc` if it invents properties, actions, or relationships that don't exist in the Ontology.

### [§TS.TSG-06] Link 4: Compile-Time Rejection as Hallucination Prevention (Inference)

This is the inferential link — connecting TS compilation to LLM grounding:

1. LLMs hallucinate when they can **invent structure** (field names, types, relationships)
2. OSDK-generated TypeScript types **close the invention space** — only Ontology-defined concepts compile
3. Therefore, any LLM-generated code that references non-existent concepts fails at compile time
4. The feedback loop (compile error → correction) prevents hallucinated structure from reaching production

**This is mechanistically identical to §PHIL.LG-03 (Semantic Integrity):**
- §PHIL.LG-03: "Every definition is internally complete — no gaps for LLM sessions to fill differently"
- TS.TSG: Every OSDK type is complete — no properties for LLMs to invent

**And to §PHIL.LG-04 (Semantic Consistency):**
- §PHIL.LG-04: "No two definitions contradict"
- TS.TSG: The compiler rejects contradictory type assignments

---

## [§TS.TSG-07] Official Palantir Statements That Support This Inference

While Palantir never says "TypeScript prevents hallucination," several official statements establish the intent:

### Statement 1: Deterministic tools complement non-deterministic LLMs
> "Deterministic functions, algorithms, and conventional statistical processes must be surfaced as 'tools' which complement the non-deterministic reasoning of large language models."
> — Chief Architect Akshay Krishnaswamy, blog.palantir.com, Jan 2024

**Implication:** The typed function signatures (from OSDK codegen) ARE the deterministic constraint on LLM behavior. The LLM can invoke tools — but only tools that exist in the typed Ontology.

### Statement 2: AI tools are auto-surfaced from typed Ontology definitions
> "The Ontology securely surfaces all of these logic assets as AI-ready tools."
> — same blog post

**Implication:** Tool schemas are generated from Ontology types. AI agents can only call tools that have typed definitions. This is type-system-mediated hallucination prevention — the AI cannot call a tool that doesn't exist in the generated types.

### Statement 3: OSDK type generation is the access layer
> "By treating Foundry as your backend, you can leverage the Ontology's robust ability to perform high-scale queries and Foundry writeback alongside granular governance controls."
> — palantir.com/docs/foundry/ontology-sdk/overview/

**Implication:** All Ontology access goes through the typed SDK layer. There is no "raw" untyped access path. The type system is the mandatory gateway.

### Statement 4: Action validation is typed
> Action execution returns typed validation: `"result": "VALID"` with per-parameter validation states.
> — palantir.com/docs/foundry/ontology-sdk/typescript-osdk/ (action examples)

**Implication:** Even at runtime, the type system enforces constraints. An LLM-generated action that passes compile-time type checking STILL gets runtime validation via submission criteria.

---

## [§TS.TSG-08] The Grounding Pipeline (Compile-Time + Runtime)

```
                    COMPILE-TIME (TypeScript)              RUNTIME (Foundry)
                    ─────────────────────────              ─────────────────
Ontology            │                                      │
  ↓ codegen         │                                      │
OSDK Types          │                                      │
  ↓                 │                                      │
LLM generates code  │                                      │
  ↓                 │                                      │
tsc --noEmit ───────┤← GATE 1: Reject invented fields     │
  ↓ (passes)        │                                      │
Code executes ──────┤                                      │
  ↓                 │                                      │
Ontology API call ──┤──────────────────────────────────────┤← GATE 2: Submission criteria
  ↓                 │                                      │← GATE 3: RBAC + markings
  ↓                 │                                      │← GATE 4: StaleObject detection
Result ─────────────┤                                      │
```

There are **4 gates**, and the TypeScript type system is Gate 1 — the earliest and cheapest. It catches hallucinated structure before any API call is made.

---

## [§TS.TSG-09] Comparison: With and Without Type-Mediated Grounding

| Scenario | Without OSDK Types | With OSDK Types |
|----------|-------------------|-----------------|
| LLM references `patient.bloodType` | Compiles (untyped access), runtime error or silent null | Compile error: `bloodType` not in `Patient` schema |
| LLM invents action `deleteAllRecords` | Compiles (string-based API), runtime auth check | Compile error: `deleteAllRecords` not a generated action type |
| LLM creates link `Patient → WeatherStation` | Compiles (dynamic API), runtime graph error | Compile error: no link type between `Patient` and `WeatherStation` |
| LLM uses wrong property type | Compiles (any), runtime data corruption | Compile error: `string` not assignable to `number` |

The key insight: **type-mediated grounding catches hallucinations at the cheapest possible point** (compile time, 0 API calls, 0 latency). Runtime gates (submission criteria, RBAC) are backup layers for hallucinations that survive type checking — but typed OSDK eliminates an entire class of structural hallucinations before they reach runtime.

---

## [§TS.TSG-10] Our Schema System as Type-Mediated Grounding

Our `schemas/ontology/*.ts` files implement the same pattern at the meta-level:

| Palantir OSDK | Our Schema System |
|--------------|-------------------|
| Ontology defines object types | `semantics.ts` defines `DecisionHeuristic`, `HardConstraint`, etc. |
| OSDK codegen generates TS types | Schema files export typed constants (`as const`) |
| `tsc --noEmit` rejects invalid code | `bun test` over the shared meta-suite rejects invalid schemas, and project-local ontology tests add domain-specific coverage |
| LLM can only reference existing types | LLM sessions can only reference existing DH/HC/CI constants |

The difference: Palantir uses OSDK codegen (automatic), we use hand-authored TypeScript constants with test suites (manual but equivalent). The anti-hallucination mechanism is the same — **typed constants close the invention space**.

---

## [§TS.TSG-11] Provenance Classification

| Claim Component | Provenance | Source |
|----------------|------------|--------|
| Ontology = typed schema definitions | **Official** | palantir.com/docs/foundry/ontology/core-concepts/ |
| OSDK generates TypeScript types from Ontology | **Official** | palantir.com/docs/foundry/ontology-sdk/overview/ |
| Generated types enforce valid-only access | **Official** | palantir.com/docs/foundry/ontology-sdk/typescript-osdk/ |
| Deterministic tools complement LLMs | **Official** | blog.palantir.com Chief Architect blog |
| TypeScript compilation rejects invented fields | **Fundamental TS** | TypeScript language specification |
| "Type system IS anti-hallucination mechanism" | **Inference** | Our analytical framework connecting links 1-4 |
| Palantir designed OSDK with hallucination prevention in mind | **Inference** | Not explicitly stated; inferred from architecture |

**Bottom line:** Each link in the chain is officially documented. The connection between them — that the type system as a whole constitutes a hallucination prevention mechanism — is our inference. It is **mechanistically sound** but **not an official Palantir marketing claim**.

---

## [§TS.TSG-12] Connection to Other Research Files

- [§PHIL.LG-03](../philosophy/llm-grounding.md) — Semantic Integrity: typed definitions leave no gaps for LLMs to fill differently
- [§PHIL.LG-04](../philosophy/llm-grounding.md) — Semantic Consistency: no contradictions for LLMs to resolve differently
- [§PHIL.LG-07](../philosophy/llm-grounding.md) — Pattern 1 (OAG): typed queries prevent hallucinated field access
- [§PHIL.LG-08](../philosophy/llm-grounding.md) — Pattern 2 (Logic Tools): typed function signatures prevent hallucinated computation
- [§PHIL.LG-13](../philosophy/llm-grounding.md) — Session Independence: typed constants ensure identical behavior across sessions

---

## [§TS.TSG-13] Sources

- https://www.palantir.com/docs/foundry/ontology/core-concepts/ — Ontology core concepts (typed definitions)
- https://www.palantir.com/docs/foundry/ontology-sdk/overview/ — OSDK overview (type-safety benefit)
- https://www.palantir.com/docs/foundry/ontology-sdk/typescript-osdk/ — TypeScript OSDK API reference
- https://blog.palantir.com/connecting-ai-to-decisions-with-the-palantir-ontology-c73f7b0a1a72 — Chief Architect on decisions + deterministic tools
- https://www.palantir.com/docs/foundry/ontology-sdk-react-applications/overview/ — OSDK React applications
- https://www.palantir.com/docs/foundry/functions/types-reference/ — Functions types reference
