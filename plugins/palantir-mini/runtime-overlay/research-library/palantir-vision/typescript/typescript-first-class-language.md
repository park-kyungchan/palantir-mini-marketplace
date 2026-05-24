---
title: TypeScript as Palantir's First-Class Language
slug: typescript-first-class-language
fileClass: vision-typescript
provenanceMarkers: [Vision, Synthesis]
primaryCitations:
  - { source: "palantir.com/docs/foundry/ontology-sdk/overview/", fetched: 2026-05-01, verbatimAvailableAt: null }
adapterTargets: []
lastVerified: 2026-05-01
harnessSpeciesMentioned: []
ssotTier: T3
---

# TypeScript as Palantir's First-Class Language

> **Layer:** CROSS (spans ALL domains via OSDK codegen + Functions + MCP)
> **SSoT for:** Why TypeScript is the primary external development language in Palantir's ecosystem
> **Provenance:** [Official] — all evidence from official Palantir docs, OSDK GitHub, OOSD blog post
> **Date:** 2026-03-19
> **Markers:** `[§TS.FCL-NN]` format (First-Class Language)

---

## [§TS.FCL-01] Executive Summary

TypeScript is Palantir's first-class external development language. This is not a marketing choice — it is an architectural necessity. The Ontology's type system (ObjectTypes, Properties, LinkTypes, ActionTypes, Functions) maps directly to TypeScript's structural type system, making TS the natural language for compile-time enforcement of ontology contracts.

**Evidence density:** 7 independent official surfaces where TypeScript has privileged status:
1. OSDK (primary SDK language, most feature-complete)
2. Functions (TypeScript v1 + v2, first language supported)
3. Ontology MCP (TypeScript-first MCP server)
4. Developer Console (TypeScript bootstrapping is the default)
5. OSDK React Applications (dedicated documentation section)
6. Subscriptions (TypeScript-only real-time feature)
7. osdk-ts (open-source GitHub monorepo, actively maintained)

---

## [§TS.FCL-02] Evidence 1: OSDK — TypeScript as Primary SDK

### [§TS.FCL-03] Official SDK Hierarchy

From `palantir.com/docs/foundry/ontology-sdk/overview/` (scraped 2026-03-19):

> "The OSDK supports NPM (Node Package Manager) for TypeScript, Pip or Conda for Python, Maven for Java, and OpenAPI spec for any other language."

TypeScript is listed FIRST. More importantly:

> "Additionally, **TypeScript bindings for frontend development** provide a convenient way for developers to quickly build React applications on top of Foundry."

No equivalent statement exists for Python or Java frontend bindings.

### [§TS.FCL-04] Feature Exclusivity

TypeScript-ONLY features (not available in Python or Java OSDK):
- **Real-time subscriptions**: `Subscribe to Ontology changes with the TypeScript OSDK` — dedicated docs page, no Python/Java equivalent
- **WebSocket subscriptions**: Available via TypeScript OSDK
- **React application framework**: `OSDK React Applications` — entire documentation section
- **Marketplace deployment**: TypeScript-first deployment workflow

### [§TS.FCL-05] Type Safety as Core Benefit

From OSDK Overview (official):

> "**Strong type-safety:** The functions and types generated for the OSDK are based on just the subset of the Ontology relevant to you. Types and functions are generated from your Ontology, allowing you to query and explore your Ontology directly in your editor."

This benefit is architecturally tied to TypeScript's structural type system. Python type hints and Java generics provide weaker guarantees.

### [§TS.FCL-06] Codegen Pipeline

The OSDK generates TypeScript types directly from the Ontology:

```typescript
// Generated from Ontology — every property name comes from the schema
const result: Osdk.Instance<Restaurant> = await client(Restaurant).fetchOne("pk");
result.restaurantName;   // ← valid (exists in Ontology)
result.hallucinated;     // ← TypeScript ERROR (does not exist in Ontology)
```

This is Gate 1 of the 4-gate hallucination prevention pipeline (see §TS.TSG-08 in type-safety-as-grounding.md).

---

## [§TS.FCL-07] Evidence 2: Functions — TypeScript is the Original and Primary Language

From `palantir.com/docs/foundry/functions/overview/` (scraped 2026-03-19):

> "The languages supported by functions are TypeScript and Python."

Note: Java is NOT supported for Functions. TypeScript is the only language with TWO versions:
- **TypeScript v1**: Original, decorator-based (`@Function()`)
- **TypeScript v2**: Modern, improved ontology edits and transactions

Python Functions were added later as a secondary language.

### [§TS.FCL-08] Functions Feature Matrix (TypeScript vs Python)

| Feature | TypeScript v1 | TypeScript v2 | Python |
|---------|:---:|:---:|:---:|
| Basic Functions | Yes | Yes | Yes |
| Ontology Edits | Yes | Yes | Yes |
| Ontology Transactions | - | **Yes** | - |
| NPM Dependencies | Yes | Yes | - |
| Decorators | Yes | - | - |
| Unit Testing | Yes | Yes | Yes |
| Workshop integration | Yes | Yes | Yes |
| Pipeline Builder | - | - | Yes |
| Function interfaces | Yes | Yes | - |

TypeScript v2 has **Ontology Transactions** — not available in Python. This is a privileged feature for complex multi-object edits.

### [§TS.FCL-09] Functions Are the LOGIC Layer

Functions are the mechanism by which the LOGIC domain (§PHIL.DT-05) is implemented. They encode:
- Link traversal logic
- Derived property computation
- Impact propagation (explicit, not automatic)
- Edit functions returning `Edits[]` (plan, not execution)

Since Functions are TypeScript-first, the LOGIC domain's implementation language is TypeScript.

---

## [§TS.FCL-10] Evidence 3: osdk-ts — Open Source Monorepo

From `github.com/palantir/osdk-ts` (scraped 2026-03-19):

- **Repository**: `palantir/osdk-ts` (public)
- **Stars**: 48, **Forks**: 46
- **Open Issues**: 83, **Open PRs**: 129 (actively maintained)

The fact that Palantir maintains a dedicated TypeScript OSDK as open source (not Python or Java) signals TypeScript's privileged position. There is no `palantir/osdk-py` or `palantir/osdk-java` public repository.

---

## [§TS.FCL-11] Evidence 4: Ontology MCP — TypeScript-First

From `palantir.com/docs/foundry/ontology-mcp/overview/` (scraped 2026-03-19):

> "Ontology MCP is a Developer Console feature that exposes your application's ontology resources as Model Context Protocol (MCP) tools."

Ontology MCP builds on the OSDK's TypeScript infrastructure. The MCP tools surface ontology resources (object types, action types, query functions) — all typed via the TypeScript OSDK codegen pipeline.

Additionally, **Palantir MCP** (70+ tools for ontology building) is also implemented on top of the TypeScript toolchain.

---

## [§TS.FCL-12] Evidence 5: OOSD Blog — TypeScript Code Examples

From Peter Wilczynski's "Ontology-Oriented Software Development" (official Palantir Blog, Jan 2024):

The OOSD blog post's central code comparison uses **TypeScript** for both the "before" (fragmented) and "after" (ontology-oriented) examples:

**Before (fragmented):**
```javascript
const mysql = require('mysql');
const nodemailer = require('nodemailer');
// ... 80+ lines of component-centric code
```

**After (OSDK):**
```typescript
async function schedulePreventativeMaintenance(
  aircraft: Aircraft, parts: AircraftComponent[]
) {
  const schedule: FlightSchedule = await aircraft.getSchedule();
  const flightToSwap: ScheduledFlight = await schedule.getNextFlight();
  // ... 20 lines of business-language code
}
```

Key quote:

> "The OSDK isn't providing a generic API for our product — it's providing a **toolkit for building APIs for your business, in the language of your business**."

And:

> "The programmer interacts with these business concepts using the OSDK and writes code in the language of the business — not in terms of rows and columns, but in terms of **Airplanes, Flight Schedules, and Airports**."

The OSDK's primary expression language is TypeScript. When Palantir demonstrates OOSD, they use TypeScript.

---

## [§TS.FCL-13] Evidence 6: Developer Console — TypeScript Default

From Developer Console how-to guides:

| Bootstrap Guide | Language | Priority |
|----------------|----------|----------|
| Bootstrap a TypeScript application | TypeScript | **Listed first** |
| Bootstrap a Python application | Python | Second |
| Bootstrap a Java application | Java | Third |
| Bootstrap a **back-end** TypeScript application | TypeScript | **Extra guide for server-side** |

TypeScript is the only language with TWO bootstrap guides (frontend + backend). Python and Java have one each.

---

## [§TS.FCL-14] Evidence 7: Branded Types — TypeScript-Native Feature

From OSDK type system:

| OSDK Branded Type | TypeScript Implementation |
|------------------|--------------------------|
| `DateISOString` | `string & { __dateBrand }` |
| `Double` | `number & { __doubleBrand }` |
| `Float` | `number & { __floatBrand }` |
| `Integer` | `number & { __integerBrand }` |
| `Long` | `string & { __longBrand }` |
| `TimestampISOString` | `string & { __timestampBrand }` |

Branded types are a TypeScript-specific pattern using intersection types (`&`) with phantom properties. This pattern has no direct equivalent in Python or Java. The OSDK's 6 branded types demonstrate that TypeScript's type system is integral to the Ontology's type safety model.

---

## [§TS.FCL-15] WHY TypeScript — The Architectural Reasons

### Reason 1: Structural Typing Matches Ontology Semantics

TypeScript uses structural typing — objects are compatible if their shapes match, not their class names. This aligns perfectly with the Ontology's concept model:
- An ObjectType IS a structural type (named properties with specific types)
- An Interface IS a structural contract (shape compatibility)
- A LinkType IS a typed reference between structures

### Reason 2: Compile-Time as Gate 1

The 4-gate hallucination prevention pipeline (§TS.TSG-08):
```
Gate 1: tsc --noEmit (TypeScript compiler — cheapest, earliest)
Gate 2: Submission criteria (Foundry runtime)
Gate 3: RBAC + markings (Foundry runtime)
Gate 4: StaleObject detection (Foundry runtime)
```

Gate 1 only works with a language that has a compile step with strong type checking. Python and Java have type checking, but TypeScript's structural typing provides the closest match to Ontology semantics.

### Reason 3: Full-Stack Language

TypeScript runs in:
- **Frontend** (React applications via OSDK React)
- **Backend** (Functions v1/v2 in Foundry's server-side execution)
- **External applications** (OSDK for custom apps)
- **MCP servers** (Ontology MCP + Palantir MCP)
- **Edge** (future NVIDIA partnership — JS/TS runs on edge devices)

No other language covers all these surfaces in Palantir's ecosystem.

### Reason 4: OSDK 2.0 Design

OSDK 2.0 patterns are TypeScript-idiomatic:
- `client(TypeDef)` — generic function call
- `Osdk.Instance<T>` — generic wrapper type
- `$link.linkName.fetchPage()` — namespace traversal
- `$as(InterfaceDef)` — interface adaptation
- `$validateOnly: true` / `$returnEdits: true` — options pattern

These patterns leverage TypeScript's generics, namespaces, and union types in ways that don't translate naturally to Python or Java.

---

## [§TS.FCL-16] Implications for palantir-learn

Learning TypeScript IS learning the Palantir development paradigm:

| TS Concept | Palantir Application |
|-----------|---------------------|
| `interface` | ObjectType schema definition |
| `type` union | Domain classification (DATA/LOGIC/ACTION) |
| `as const satisfies` | DecisionHeuristic constant patterns |
| Generics `<T>` | `Osdk.Instance<T>`, typed function signatures |
| Branded types `string & {}` | OSDK value types (DateISOString, etc.) |
| Structural typing | Interface polymorphism, shape contracts |
| `Record<K, V>` | Domain mapping tables |
| Discriminated unions | ConceptType classification |
| Type narrowing | Semantic heuristic application |

Teaching TS through Palantir schema code is not an artificial connection — it is the SAME skill expressed in two registers.

---

## [§TS.FCL-17] Sources

### Official Palantir Documentation (scraped 2026-03-19)
- https://www.palantir.com/docs/foundry/ontology-sdk/overview/ — OSDK overview
- https://www.palantir.com/docs/foundry/ontology-sdk/typescript-osdk/ — TypeScript OSDK reference
- https://www.palantir.com/docs/foundry/functions/overview/ — Functions overview (TS + Python only)
- https://www.palantir.com/docs/foundry/ontology-mcp/overview/ — Ontology MCP
- https://www.palantir.com/docs/foundry/developer-console/how-to-bootstrapping-typescript/ — TS bootstrap

### Official Palantir Blog
- https://blog.palantir.com/ontology-oriented-software-development-68d7353fdb12 — OOSD (Peter Wilczynski, Jan 2024)

### Open Source
- https://github.com/palantir/osdk-ts — TypeScript OSDK monorepo (public, 48 stars)

### Internal Research Cross-References
- `typescript/type-safety-as-grounding.md` — §TS.TSG-02 (4-link mechanism chain)
- `philosophy/llm-grounding.md` — §PHIL.LG-03/04 (semantic integrity/consistency)
- `architecture/ontology-model.md` — §ARCH-36 (OSDK 2.0 patterns)
