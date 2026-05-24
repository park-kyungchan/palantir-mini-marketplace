---
title: AIP Evals — Evaluation Testing Environment
slug: aip-evals
fileClass: vision-aipcon-devcon
provenanceMarkers: [Synthesis, Adapter]
primaryCitations:
  - { source: "palantir.com/docs/foundry/aip-evals/", fetched: 2026-05-01, verbatimAvailableAt: null }
adapterTargets: []
lastVerified: 2026-05-01
harnessSpeciesMentioned: []
ssotTier: T3
---

# AIP Evals — Evaluation Testing Environment

> **Provenance:** [Official] — palantir.com/docs/foundry/aip-evals/ (verified 2026-04-03)
> **Schema anchors:** `PMC-01..13`, `PB-01..03`, `ORCH-01..06`
> **Markers:** `[§EVAL-nn]`

---

## [§EVAL-01] Overview

AIP Evals is a testing environment to evaluate the performance of AIP Logic functions, AIP Agent functions, or code-authored functions. Designed for non-deterministic LLM outputs.

**10 Documentation Pages:**
1. Overview
2. Evaluation suites for Logic functions
3. Create an evaluation suite
4. Use intermediate parameters to evaluate block output
5. Evaluate Ontology edits
6. Run an evaluation suite
7. Run experiments
8. Write run results to a dataset
9. Analyze run results
10. View results in metrics dashboard

---

## [§EVAL-02] Core Concepts

| Concept | Definition | Marker |
|---------|-----------|--------|
| [§EVAL-C01] Evaluation suite | Collection of test cases, target functions, and evaluation functions | — |
| [§EVAL-C02] Target function | The function being evaluated (multiple per suite) | — |
| [§EVAL-C03] Evaluation function | Method for comparing actual vs expected output | →[§EVAL-03] |
| [§EVAL-C04] Test cases | Input + expected output pairs | — |
| [§EVAL-C05] Metrics | Per-test-case results, comparable across runs | — |

---

## [§EVAL-03] Evaluator Types (5 categories)

1. **[§EVAL-T01] Deterministic** — exact match, threshold, regex
2. **[§EVAL-T02] Heuristic** — fuzzy matching, similarity scoring
3. **[§EVAL-T03] Rubric Grader / LLM-as-Judge** — LLM evaluates output against rubric criteria
4. **[§EVAL-T04] Custom Evaluation Functions** — user-written logic
5. **[§EVAL-T05] Ontology Edits Simulator** — evaluates proposed ontology modifications

---

## [§EVAL-04] Key Capabilities

- **[§EVAL-K01] Multi-target comparison**: Test multiple target functions against same evaluator suite
- **[§EVAL-K02] Intermediate parameters**: Evaluate block output within complex functions
- **[§EVAL-K03] Dataset-backed results**: Write run results to datasets for longitudinal analysis
- **[§EVAL-K04] Metrics dashboard**: Visual performance tracking across runs
- **[§EVAL-K05] Experiments**: Compare different implementations head-to-head

---

## [§EVAL-05] Ontology Relevance — LEARN Surface

AIP Evals is the **clearest official product surface for LEARN mechanisms**:

- Turns human feedback + automated judgment into structured evaluation artifacts
- Enables the SENSE→DECIDE→ACT→**LEARN** loop to be measured and optimized
- Dataset-backed run history provides longitudinal LEARN-03 (Outcome Tracking) data
- Rubric grader pattern validates our `feedbackEvents` table approach

**Important boundary:** These evaluator capabilities are managed Foundry features. No official open-source package exposes the internal LEARN/rubric/lineage engine.

### Mapping to Our System

| AIP Evals | CC Equivalent | Status |
|-----------|--------------|--------|
| Evaluation suite | `skill-eval/eval-trigger.ts` | Implemented |
| Test cases | `trigger-evals.json` per skill | Implemented |
| Metrics dashboard | `frontend-dashboard` Lineage tab | Implemented |
| Dataset-backed results | `feedbackEvents` + `outcomeAnalysis` tables | Implemented |
| Ontology edits evaluator | `project-test.test.ts` shared meta-suite + project-local ontology validation | Partially aligned |

---

## Sources

- https://www.palantir.com/docs/foundry/aip-evals/overview/
- https://www.palantir.com/docs/foundry/aip-evals/getting-started/
- https://www.palantir.com/docs/foundry/aip-evals/create-suite/
- https://www.palantir.com/docs/foundry/aip-evals/ontology-edits/
- https://www.palantir.com/docs/foundry/aip-evals/results-dataset/
