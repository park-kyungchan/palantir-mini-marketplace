---
name: Authority Audit Skill
description: /authority-audit skill — Digital Twin Fidelity Audit, eval results, iteration history
type: project
---

## /authority-audit — Digital Twin Fidelity Audit

Created 2026-03-18. The "missing link" in the ontology pipeline — validates project code against SSoT authority chain.

### Pipeline Position
```
/ontology-healthcheck (SSoT internal) ←→ /authority-audit (SSoT ↔ project) ←→ /ontology-dataflow (project internal)
```

### Architecture: 7 Phases
- Phase 0: SSoT Context Loading (semantics.ts + 4 domain schemas + digital-twin.md)
- Phase 1: Twin Fidelity (TF-01..05 — 5 dimensions)
- Phase 2: Semantic Classification (SH-01..03 + TRANSITION_ZONES)
- Phase 3: Schema Compliance (210 DH-*/HC-* constants)
- Phase 4: Import Boundary Verification
- Phase 5: Twin Maturity Assessment (Stage 1-5)
- Phase 6: Research Alignment (provenance tracing)

### Files
- `authority-audit/SKILL.md` — main skill (227+ lines)
- `authority-audit/references/check-catalog.md` — 210 constant reference table
- `authority-audit/evals/evals.json` — 3 functional evals, 19 assertions
- `authority-audit-workspace/trigger-evals.json` — 18 trigger queries

### Eval Results (2 iterations)

| Metric | Iter 1 | Iter 2 |
|--------|--------|--------|
| Precision | 100% | 100% |
| Recall | 46% | 58% |
| F1 | 63% | 74% |
| Accuracy | 76% | 81% |

### Functional Eval Results
- E2 (D/L/A classification): 84 concepts, 0 errors, TRANSITION_ZONES all correct
- E4 (no-ontology edge): PASS, graceful early exit
- E5 (Twin Maturity): Stage 4, LEARN mechanism gap analysis complete
- E6 (ambiguous trigger): PASS, correctly differentiated from adjacent skills

### Known Trigger Limitations (recall ceiling)
3 queries consistently fail (0/3 across both iterations):
1. Very specific HC-* constant by name ("HC-DATA-09 만족하는지") — too granular for skill triggering
2. "D/L/A 분류 맞는지" without "audit"/"검증" — competes with /ontology-begin
3. "코드가 스키마에 맞아?" — too generic, model handles directly

**Why:** All affected by Claude's skill triggering heuristic — skills trigger for complex multi-step tasks, not simple lookups. These 3 queries feel like "quick checks" the model thinks it can handle alone. This is a platform-level behavior, not a description issue.

### Philosophical Foundation
The user's insight: `/authority-audit` is **형식 검증 (formal verification)** for Digital Twins.
- schemas/ = axiom system (공리계)
- project code = theorem (정리)
- The audit asks: "Does this theorem follow from these axioms?"
- SEMANTIC layer ensures deterministic classification across LLM sessions
