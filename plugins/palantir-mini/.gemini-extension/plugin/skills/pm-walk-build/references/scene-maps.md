# Scene Maps — 12-Scene Progressive Construction

## Phase 1: Foundation (Scene 1-8)

Each scene adds ONE new concept to a growing Digital Twin.

```
Scene 1  — DATA: First Entity
           Teach: ObjectType, Property, BasePropertyType
           Twin Maturity: 0

Scene 2  — DATA: Second Entity
           Teach: required vs optional, ValueConstraint (regex, range)
           Twin Maturity: 0

Scene 3  — LOGIC: Link (first LOGIC concept — TRANSITION_ZONES)
           Teach: LinkType, cardinality, M:N relationship
           Why LOGIC not DATA: SH-02 deletion test — links enable reasoning
           Twin Maturity: 1 (Snapshot)

Scene 4  — LOGIC: DerivedProperty
           Teach: DerivedProperty, computeFn, DerivedMode
           Twin Maturity: 1

Scene 5  — LOGIC: Interface + Query
           Teach: Interface (ISearchable), Query, toolExposure concept
           DevCon 5: queries auto-surface as DATA tools (HRP-01: OAG)
           Twin Maturity: 2 (Mirror)

Scene 6  — LOGIC: Function
           Teach: Pure function, toolExposure: true, HRP-02 (Logic Tool Handoff)
           DevCon 5: LLMs delegate computation to deterministic functions
           Twin Maturity: 2

Scene 7  — ACTION: Mutation (first ACTION concept)
           Teach: OntologyMutation, reviewLevel (PA-02), submission criteria
           DevCon 5: every mutation should capture Decision Lineage
           Twin Maturity: 3 (Model)

Scene 8  — VERIFY: Schema Audit
           Run: SA audit → expect Twin Maturity Stage 3
           Show: coverage gaps → map to Scenes 9-12
           Twin Maturity: 3
```

## Phase 2: DevCon 5 Extension (Scene 9-12)

```
Scene 9  — LEARN: HookEvent (Decision Lineage 5D)
           Teach: WHEN/ATOP/THROUGH/BY/WITH, 12 properties, internalMutation
           Twin Maturity: 3+

Scene 10 — LEARN: EvaluationRecord (LEARN-02)
           Teach: evaluatorSource, dimensions, feedback loop
           Twin Maturity: 4 (Operator)

Scene 11 — LEARN: LearnInfrastructure Export
           Teach: providerNeutral, typed SA evidence, LLM independence
           Twin Maturity: 4

Scene 12 — VERIFY: Full SA Audit (Stage 4)
           Run: SA audit → expect Twin Maturity Stage 4
           Compare: Scene 8 (Stage 3) → Scene 12 (Stage 4) improvement
           Twin Maturity: 4 (verified)
```

## Structural Constant

```
DATA(2) → LOGIC(4) → ACTION(1) → VERIFY(1) → LEARN(3) → VERIFY(1) = 12 scenes
```

Build entities → reason about them → act on them → verify the foundation →
add learning infrastructure → verify the complete loop.

## Domain Adaptation

The D/L/A progression is the constant; the domain is the variable.
When the user provides a domain, map scene roles to that domain:

| Scene Role | School (default) | Coffee Shop | Library | Hospital |
|-----------|-----------------|------------|---------|----------|
| Scene 1 (DATA) | Course | Drink | Book | Patient |
| Scene 2 (DATA) | Student | Customer | Member | Doctor |
| Scene 3 (LOGIC: Link) | Enrollment | customerOrders | borrows | treatedBy |
| Scene 4 (LOGIC: Derived) | GPA | totalPrice | overdueFee | riskScore |
| Scene 5 (LOGIC: Query) | listStudentsByGPA | findDrinksByPrice | searchByAuthor | findByDiagnosis |
| Scene 6 (LOGIC: Function) | calculateGPA | calculateTotal | calculateFine | assessRisk |
| Scene 7 (ACTION: Mutation) | enrollStudent | placeOrder | checkOut | admitPatient |
| Scene 8 (VERIFY) | SA audit Stage 3 | SA audit Stage 3 | SA audit Stage 3 | SA audit Stage 3 |
| Scene 9-12 (LEARN+VERIFY) | HookEvent → EvalRecord → learn export → SA Stage 4 | (same structure, domain-adapted names) |||
